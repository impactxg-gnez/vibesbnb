import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ListingsModule } from '../listings/listings.module';
import { BookingsModule } from '../bookings/bookings.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ListingsModule, BookingsModule, UsersModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}


