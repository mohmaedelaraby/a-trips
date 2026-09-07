import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PayPalService } from './paypal.service';
import { CapturePayPalOrderDto } from './dto/payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { HOLD_MINUTES } from '../availability/availability.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly paypal: PayPalService,
  ) {}

  /**
   * What the checkout page needs to render the PayPal buttons: the public
   * client id and whether payments are wired up at all. The secret never
   * leaves the server.
   */
  @Public()
  @Get('config')
  config() {
    return {
      provider: 'PAYPAL',
      configured: this.paypal.configured,
      clientId: this.paypal.publicClientId,
      currency: this.paypal.currency,
      holdMinutes: HOLD_MINUTES,
    };
  }

  @Post('paypal/orders/:bookingId')
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ) {
    return this.payments.createPayPalOrder(user.id, bookingId);
  }

  @Post('paypal/orders/:bookingId/capture')
  capture(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() dto: CapturePayPalOrderDto,
  ) {
    return this.payments.capturePayPalOrder(user.id, bookingId, dto.orderId);
  }
}
