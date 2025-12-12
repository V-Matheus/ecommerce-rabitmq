import { Controller, Get } from '@nestjs/common';
import { ShippingServiceService } from './shipping-service.service';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { PaymentApprovedEvent } from '../../common/dto/events.dto';

@Controller()
export class ShippingServiceController {
  constructor(private readonly shippingServiceService: ShippingServiceService) {}

  @Get()
  getHello(): string {
    return this.shippingServiceService.getHello();
  }

  @EventPattern('payment.approved')
  async handlePaymentApproved(@Payload() data: PaymentApprovedEvent) {
    try {
      console.log('[Shipping Service] Received payment.approved event:', data);
      await this.shippingServiceService.createShipment(data);
    } catch (error) {
      console.error('[Shipping Service] Error processing payment.approved:', error);
    }
  }
}
