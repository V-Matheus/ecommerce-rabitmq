import { Controller, Get } from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { InventoryReservedEvent } from '../../common/dto/events.dto';

@Controller()
export class PaymentServiceController {
  constructor(private readonly paymentServiceService: PaymentServiceService) {}

  @Get()
  getHello(): string {
    return this.paymentServiceService.getHello();
  }

  @EventPattern('inventory.reserved')
  async handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
    try {
      console.log('[Payment Service] Received inventory.reserved event:', data);
      await this.paymentServiceService.processPayment(data);
    } catch (error) {
      console.error('[Payment Service] Error processing inventory.reserved:', error);
    }
  }
}
