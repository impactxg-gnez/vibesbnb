import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { KYCStatus } from '@vibesbnb/shared';
import axios from 'axios';

@Injectable()
export class KycService {
  private kycProvider: string;
  private veriffApiKey: string;
  private jumioApiKey: string;

  constructor(private usersService: UsersService) {
    this.kycProvider = process.env.KYC_PROVIDER || 'veriff';
    this.veriffApiKey = process.env.VERIFF_API_KEY;
    this.jumioApiKey = process.env.JUMIO_API_KEY;
  }

  async initiateKYC(userId: string): Promise<{ verificationUrl: string; sessionId: string }> {
    if (!process.env.ENABLE_KYC || process.env.ENABLE_KYC === 'false') {
      // For dev/testing: auto-approve
      await this.usersService.updateKYCStatus(userId, KYCStatus.APPROVED);
      return {
        verificationUrl: 'http://localhost:3000/kyc/mock',
        sessionId: 'mock-session',
      };
    }

    if (this.kycProvider === 'veriff') {
      return this.initiateVeriff(userId);
    } else if (this.kycProvider === 'jumio') {
      return this.initiateJumio(userId);
    }

    throw new BadRequestException('Invalid KYC provider');
  }

  private async initiateVeriff(userId: string): Promise<{ verificationUrl: string; sessionId: string }> {
    try {
      const response = await axios.post(
        'https://stationapi.veriff.com/v1/sessions',
        {
          verification: {
            person: {
              idNumber: userId,
            },
            callback: `${process.env.API_URL}/api/v1/kyc/webhook/veriff`,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-AUTH-CLIENT': this.veriffApiKey,
          },
        },
      );

      await this.usersService.updateKYCStatus(userId, KYCStatus.PENDING);

      return {
        verificationUrl: response.data.verification.url,
        sessionId: response.data.verification.id,
      };
    } catch (error) {
      console.error('Veriff error:', error);
      throw new BadRequestException('Failed to initiate KYC verification');
    }
  }

  private async initiateJumio(userId: string): Promise<{ verificationUrl: string; sessionId: string }> {
    // Jumio implementation
    console.log('Jumio KYC not fully implemented yet');
    throw new BadRequestException('Jumio provider not configured');
  }

  async handleWebhook(provider: string, data: any): Promise<void> {
    if (provider === 'veriff') {
      await this.handleVeriffWebhook(data);
    } else if (provider === 'jumio') {
      await this.handleJumioWebhook(data);
    }
  }

  private async handleVeriffWebhook(data: any): Promise<void> {
    const userId = data.verification?.person?.idNumber;
    if (!userId) return;

    const status = data.verification?.status;
    
    if (status === 'approved') {
      await this.usersService.updateKYCStatus(userId, KYCStatus.APPROVED);
    } else if (status === 'declined') {
      await this.usersService.updateKYCStatus(userId, KYCStatus.REJECTED);
    } else if (status === 'resubmission_requested') {
      await this.usersService.updateKYCStatus(userId, KYCStatus.RESUBMIT);
    }
  }

  private async handleJumioWebhook(data: any): Promise<void> {
    // Jumio webhook implementation
    console.log('Jumio webhook:', data);
  }

  async getKYCStatus(userId: string): Promise<KYCStatus> {
    const user = await this.usersService.findById(userId);
    return user?.kycStatus || KYCStatus.NOT_STARTED;
  }
}


