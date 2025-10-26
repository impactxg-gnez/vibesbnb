import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { User, UserProfile, UserRole, KYCStatus } from '@vibesbnb/shared';

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  async create(data: Partial<User> & { passwordHash: string }): Promise<User> {
    const userId = await this.firebase.create('users', {
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || UserRole.GUEST,
      phone: data.phone,
      mfaEnabled: false,
      kycStatus: KYCStatus.NOT_STARTED,
    });

    // Create user profile
    await this.firebase.create('user_profiles', {
      userId,
      verifiedEmail: false,
      verifiedPhone: false,
    });

    return this.findById(userId);
  }

  async findById(id: string): Promise<User | null> {
    return this.firebase.get('users', id);
  }

  async findByEmail(email: string): Promise<any | null> {
    const users = await this.firebase.query('users', [
      { field: 'email', op: '==', value: email },
    ]);
    return users.length > 0 ? users[0] : null;
  }

  async update(id: string, data: Partial<User>): Promise<void> {
    await this.firebase.update('users', id, data);
  }

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    const profiles = await this.firebase.query('user_profiles', [
      { field: 'userId', op: '==', value: userId },
    ]);
    
    if (profiles.length > 0) {
      await this.firebase.update('user_profiles', profiles[0].id, data);
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const profiles = await this.firebase.query('user_profiles', [
      { field: 'userId', op: '==', value: userId },
    ]);
    return profiles.length > 0 ? profiles[0] : null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    const profiles = await this.firebase.query('user_profiles', [
      { field: 'userId', op: '==', value: userId },
    ]);
    
    if (profiles.length > 0) {
      await this.firebase.update('user_profiles', profiles[0].id, {
        verifiedEmail: true,
      });
    }
  }

  async updateKYCStatus(userId: string, kycStatus: KYCStatus): Promise<void> {
    await this.firebase.update('users', userId, { kycStatus });
  }

  async setStripeConnectId(userId: string, stripeConnectId: string): Promise<void> {
    await this.firebase.update('users', userId, { stripeConnectId });
  }
}


