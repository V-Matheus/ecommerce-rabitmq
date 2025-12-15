import { Controller, Get, Logger } from '@nestjs/common';
import { ShippingServiceService } from './shipping-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentApprovedEvent } from '../../common/dto/events.dto';

@Controller()
export class ShippingServiceController {
  private readonly logger = new Logger(ShippingServiceController.name);
  constructor(private readonly shippingServiceService: ShippingServiceService) {}

  @Get()
  getHello(): string {
    return this.shippingServiceService.getHello();
  }

  @EventPattern('payment.approved')
  async handlePaymentApproved(@Payload() data: PaymentApprovedEvent) {
    try {
    this.logger.log(`Received payment.approved event: ${data.orderId}`);
    await this.shippingServiceService.createShipment(data);
    } catch (error) {
  this.logger.error('Error processing payment.approved', error as any);
    }
  }
}
