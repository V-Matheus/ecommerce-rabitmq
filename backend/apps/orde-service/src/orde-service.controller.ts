import { Controller, Get } from '@nestjs/common';
import { OrdeServiceService } from './orde-service.service';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import {
  InventoryInsufficientEvent,
  PaymentFailedEvent,
  ShippingDeliveredEvent,
} from '../../common/dto/events.dto';

@Controller()
export class OrdeServiceController {
  constructor(private readonly ordeServiceService: OrdeServiceService) {}

  @Get()
  getHello(): string {
    return this.ordeServiceService.getHello();
  }

  @EventPattern('inventory.insufficient')
  async handleInventoryInsufficient(@Payload() data: InventoryInsufficientEvent) {
    try {
      console.log('[Order Service] Received inventory.insufficient event:', data);
      await this.ordeServiceService.cancelOrder(data.orderId, 'Insufficient stock');
    } catch (error) {
      console.error('[Order Service] Error processing inventory.insufficient:', error);
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() data: PaymentFailedEvent) {
    try {
      console.log('[Order Service] Received payment.failed event:', data);
      await this.ordeServiceService.cancelOrder(data.orderId, data.reason);
    } catch (error) {
      console.error('[Order Service] Error processing payment.failed:', error);
    }
  }

  @EventPattern('shipping.delivered')
  async handleShippingDelivered(@Payload() data: ShippingDeliveredEvent) {
    try {
      console.log('[Order Service] Received shipping.delivered event:', data);
      await this.ordeServiceService.completeOrder(data.orderId);
    } catch (error) {
      console.error('[Order Service] Error processing shipping.delivered:', error);
    }
  }
}
