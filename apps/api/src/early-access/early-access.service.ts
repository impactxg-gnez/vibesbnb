import { Injectable, ConflictException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateEarlyAccessDto } from './dto/create-early-access.dto';

@Injectable()
export class EarlyAccessService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createEarlyAccessDto: CreateEarlyAccessDto) {
    // Check if email already signed up for this category
    const existing = await this.firebaseService.query(
      'early_access_signups',
      [
        { field: 'email', op: '==', value: createEarlyAccessDto.email },
        { field: 'category', op: '==', value: createEarlyAccessDto.category },
      ],
    );

    if (existing.length > 0) {
      throw new ConflictException(
        'This email is already registered for early access in this category',
      );
    }

    // Create custom document ID: name_phone (sanitized)
    const sanitizedName = createEarlyAccessDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    
    const sanitizedPhone = createEarlyAccessDto.phone
      .replace(/[^0-9]/g, '')
      .substring(0, 15);
    
    const customDocId = `${sanitizedName}_${sanitizedPhone}`;

    // Create signup with custom document ID
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('early_access_signups').doc(customDocId);
    
    await docRef.set({
      ...createEarlyAccessDto,
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Log for admin visibility
    console.log('✅ New Early Access Signup:', {
      id: customDocId,
      email: createEarlyAccessDto.email,
      category: createEarlyAccessDto.category,
      name: createEarlyAccessDto.name,
      phone: createEarlyAccessDto.phone,
    });

    return {
      success: true,
      id: customDocId,
      message: 'Successfully signed up for early access',
    };
  }

  async findAll(category?: string) {
    const filters = category
      ? [{ field: 'category', op: '==', value: category }]
      : [];

    return this.firebaseService.query(
      'early_access_signups',
      filters,
      { field: 'createdAt', direction: 'desc' },
    );
  }

  async getStats() {
    const all = await this.findAll();
    
    const stats = {
      total: all.length,
      byCategory: {
        host: all.filter(s => s.category === 'host').length,
        traveller: all.filter(s => s.category === 'traveller').length,
        service_host: all.filter(s => s.category === 'service_host').length,
        dispensary: all.filter(s => s.category === 'dispensary').length,
      },
      recent: all.slice(0, 10),
    };

    return stats;
  }

  async exportToCSV() {
    const signups = await this.findAll();
    
    const csvHeader = 'Name,Email,Phone,Category,Timestamp,Address,Latitude,Longitude,Services,Service Areas,Pincodes\n';
    const csvRows = signups.map(signup => {
      const location = signup.location || {};
      const serviceHostData = signup.serviceHostData || {};
      
      return [
        `"${signup.name}"`,
        `"${signup.email}"`,
        `"${signup.phone}"`,
        signup.category,
        signup.timestamp,
        `"${location.address || ''}"`,
        location.latitude || '',
        location.longitude || '',
        `"${(serviceHostData.services || []).join('; ')}"`,
        `"${(serviceHostData.serviceAreas || []).join('; ')}"`,
        `"${(serviceHostData.pincodes || []).join('; ')}"`,
      ].join(',');
    });

    return csvHeader + csvRows.join('\n');
  }
}

