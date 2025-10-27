import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';

@Module({
  imports: [JwtModule],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}


