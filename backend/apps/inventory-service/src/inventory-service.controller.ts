import { Controller, Get, Logger } from '@nestjs/common';
import { InventoryServiceService } from './inventory-service.service';
import { EventPattern, Payload, MessagePattern } from '@nestjs/microservices';
import { OrderCreatedEvent, OrderCancelledEvent } from '../../common/dto/events.dto';

@Controller()
export class InventoryServiceController {
  private readonly logger = new Logger(InventoryServiceController.name);
  constructor(private readonly inventoryServiceService: InventoryServiceService) {}

  @Get()
  getHello(): string {
    return this.inventoryServiceService.getHello();
  }

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: OrderCreatedEvent) {
    try {
  this.logger.log(`Received order.created event: ${data.orderId}`);
      await this.inventoryServiceService.reserveStock(data);
    } catch (error) {
  this.logger.error('Error processing order.created', error as any);
      // Let Nest/RMQ transport handle ack/nack and reconnection
    }
  }

  @EventPattern('order.cancelled')
  async handleOrderCancelled(@Payload() data: OrderCancelledEvent) {
    try {
  this.logger.log(`Received order.cancelled event: ${data.orderId}`);
      await this.inventoryServiceService.releaseStock(data);
    } catch (error) {
  this.logger.error('Error processing order.cancelled', error as any);
      // Let Nest/RMQ transport handle ack/nack and reconnection
    }
  }

}
