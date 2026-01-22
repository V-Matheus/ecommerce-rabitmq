import { Controller, Get, Logger } from '@nestjs/common';
import { OrderServiceService } from './order-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  InventoryInsufficientEvent,
  PaymentFailedEvent,
  ShippingDeliveredEvent,
} from '../../common/dto/events.dto';

@Controller()
export class OrderServiceController {
  private readonly logger = new Logger(OrderServiceController.name);
  constructor(private readonly ordeServiceService: OrderServiceService) {}

  @Get()
  getHello(): string {
    return this.ordeServiceService.getHello();
  }

  @EventPattern('inventory.insufficient')
  async handleInventoryInsufficient(@Payload() data: InventoryInsufficientEvent) {
    try {
  this.logger.log(`Received inventory.insufficient event: ${data.orderId}`);
      await this.ordeServiceService.cancelOrder(data.orderId, 'Insufficient stock');
    } catch (error) {
  this.logger.error('Error processing inventory.insufficient', error as any);
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() data: PaymentFailedEvent) {
    try {
            this.logger.log(`Received payment.failed event: ${data.orderId}`);
            await this.ordeServiceService.cancelOrder(data.orderId, data.reason);
    } catch (error) {
  this.logger.error('Error processing payment.failed', error as any);
    }
  }

  @EventPattern('shipping.delivered')
  async handleShippingDelivered(@Payload() data: ShippingDeliveredEvent) {
    try {
  this.logger.log(`Received shipping.delivered event: ${data.orderId}`);
      await this.ordeServiceService.completeOrder(data.orderId);
    } catch (error) {
  this.logger.error('Error processing shipping.delivered', error as any);
    }
  }
}
