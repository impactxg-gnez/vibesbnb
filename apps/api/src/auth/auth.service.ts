import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthTokens, JWTPayload, UserRole } from '@vibesbnb/shared';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async register(email: string, password: string, name: string, role: UserRole = UserRole.GUEST) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      passwordHash,
      name,
      role,
    });

    return this.generateTokens(user);
  }

  async login(user: any): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  async refreshTokens(userId: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokens(user);
  }

  private async generateTokens(user: any): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    // Store refresh token hash in database (for token revocation)
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(user.id, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.update(userId, { refreshTokenHash: null });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = this.jwtService.sign(
      { userId: user.id, type: 'password_reset' },
      { expiresIn: '1h' },
    );

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid token');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.usersService.update(payload.userId, { passwordHash });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async sendEmailVerification(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const verificationToken = this.jwtService.sign(
      { userId: user.id, type: 'email_verification' },
      { expiresIn: '24h' },
    );

    // TODO: Send verification email
    console.log(`Email verification token for ${user.email}: ${verificationToken}`);
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'email_verification') {
        throw new UnauthorizedException('Invalid token');
      }

      await this.usersService.markEmailVerified(payload.userId);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}


