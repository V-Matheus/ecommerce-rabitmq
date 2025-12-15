import { Controller, Get, Logger } from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InventoryReservedEvent } from '../../common/dto/events.dto';

@Controller()
export class PaymentServiceController {
  private readonly logger = new Logger(PaymentServiceController.name);
  constructor(private readonly paymentServiceService: PaymentServiceService) {}

  @Get()
  getHello(): string {
    return this.paymentServiceService.getHello();
  }

  @EventPattern('inventory.reserved')
  async handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
    try {
  this.logger.log(`Received inventory.reserved event: ${data.orderId}`);
      await this.paymentServiceService.processPayment(data);
    } catch (error) {
  this.logger.error('Error processing inventory.reserved', error as any);
    }
  }
}
