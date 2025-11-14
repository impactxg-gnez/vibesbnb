export enum UserRole {
  GUEST = 'guest',
  HOST = 'host',
  ADMIN = 'admin',
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMIT = 'resubmit',
}

export interface User {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  phone?: string;
  passwordHash?: string; // Internal field - not exposed via API
  refreshTokenHash?: string | null; // Internal field - not exposed via API
  mfaEnabled: boolean;
  kycStatus: KYCStatus;
  stripeConnectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  avatar?: string;
  bio?: string;
  languages?: string[];
  verifiedEmail: boolean;
  verifiedPhone: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}


