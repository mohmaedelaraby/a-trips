import { IsString, Length } from 'class-validator';

export class CapturePayPalOrderDto {
  /** The PayPal order id returned by the create call and echoed by the client SDK. */
  @IsString()
  @Length(1, 64)
  orderId: string;
}
