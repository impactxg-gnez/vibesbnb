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

    // Create signup
    const signupId = await this.firebaseService.create('early_access_signups', {
      ...createEarlyAccessDto,
      timestamp: new Date().toISOString(),
    });

    // Log for admin visibility
    console.log('✅ New Early Access Signup:', {
      id: signupId,
      email: createEarlyAccessDto.email,
      category: createEarlyAccessDto.category,
      name: createEarlyAccessDto.name,
    });

    return {
      success: true,
      id: signupId,
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

