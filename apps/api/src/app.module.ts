import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ListingsModule } from './listings/listings.module';
import { BookingsModule } from './bookings/bookings.module';
import { CalendarModule } from './calendar/calendar.module';
import { MessagingModule } from './messaging/messaging.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { KycModule } from './kyc/kyc.module';
import { QueueModule } from './queue/queue.module';
import { ItineraryModule } from './itinerary/itinerary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    FirebaseModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    BookingsModule,
    CalendarModule,
    MessagingModule,
    ReviewsModule,
    PaymentsModule,
    AdminModule,
    StorageModule,
    NotificationsModule,
    KycModule,
    QueueModule,
    ItineraryModule,
  ],
})
export class AppModule {}


