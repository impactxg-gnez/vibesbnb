import { Module } from '@nestjs/common';
import { EarlyAccessController } from './early-access.controller';
import { EarlyAccessService } from './early-access.service';

@Module({
  controllers: [EarlyAccessController],
  providers: [EarlyAccessService],
  exports: [EarlyAccessService],
})
export class EarlyAccessModule {}

