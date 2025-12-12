import { Controller, Get } from '@nestjs/common';
import { InventoryServiceService } from './inventory-service.service';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { OrderCreatedEvent, OrderCancelledEvent } from '../../common/dto/events.dto';

@Controller()
export class InventoryServiceController {
  constructor(private readonly inventoryServiceService: InventoryServiceService) {}

  @Get()
  getHello(): string {
    return this.inventoryServiceService.getHello();
  }

  @EventPattern('order.created')
  async handleOrderCreated(@Payload() data: OrderCreatedEvent) {
    try {
      console.log('[Inventory Service] Received order.created event:', data);
      await this.inventoryServiceService.reserveStock(data);
    } catch (error) {
      console.error('[Inventory Service] Error processing order.created:', error);
      // Let Nest/RMQ transport handle ack/nack and reconnection
    }
  }

  @EventPattern('order.cancelled')
  async handleOrderCancelled(@Payload() data: OrderCancelledEvent) {
    try {
      console.log('[Inventory Service] Received order.cancelled event:', data);
      await this.inventoryServiceService.releaseStock(data);
    } catch (error) {
      console.error('[Inventory Service] Error processing order.cancelled:', error);
      // Let Nest/RMQ transport handle ack/nack and reconnection
    }
  }
}
