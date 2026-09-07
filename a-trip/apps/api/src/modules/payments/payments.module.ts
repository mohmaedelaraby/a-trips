import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayPalService } from './paypal.service';
import { PaymentsController } from './payments.controller';
import { HoldSweeperService } from './hold-sweeper.service';

@Module({
  providers: [PaymentsService, PayPalService, HoldSweeperService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
