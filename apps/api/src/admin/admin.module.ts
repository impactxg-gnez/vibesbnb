import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { SeedController } from './seed-endpoint.controller';
import { ListingsModule } from '../listings/listings.module';
import { BookingsModule } from '../bookings/bookings.module';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [ListingsModule, BookingsModule, UsersModule, FirebaseModule],
  providers: [AdminService],
  controllers: [AdminController, SeedController],
})
export class AdminModule {}


