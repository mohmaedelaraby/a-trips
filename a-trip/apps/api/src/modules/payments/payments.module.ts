import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PayPalService } from './paypal.service';
import { PaymentsController } from './payments.controller';
import { HoldSweeperService } from './hold-sweeper.service';
import { PaymentsRepository } from './repositories/payments.repository';

@Module({
  providers: [PaymentsService, PayPalService, HoldSweeperService, PaymentsRepository],
  controllers: [PaymentsController],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
