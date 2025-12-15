import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OrderCancelledEvent } from '../../common/dto/events.dto';

interface Order {
  id: number;
  customerId: number;
  items: { productId: number; quantity: number }[];
  status: string;
  total: number;
}

@Injectable()
export class OrdeServiceService {
  private readonly logger = new Logger(OrdeServiceService.name);
  private orders: Map<number, Order> = new Map();

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Order Service is running!';
  }

  async cancelOrder(orderId: number, reason: string): Promise<void> {
    this.logger.log(`Cancelling order ${orderId}. Reason: ${reason}`);
    
    const order = this.orders.get(orderId);
    if (!order) {
      this.logger.error(`Order ${orderId} not found`);
      return;
    }

    order.status = 'CANCELLED';
    this.orders.set(orderId, order);

    // Publicar evento de pedido cancelado para liberar estoque
    const event: OrderCancelledEvent = {
      orderId,
      reason,
      items: order.items,
    };

  this.rabbitClient.emit('order.cancelled', event);
  this.logger.log(`Order ${orderId} cancelled and event published`);
  }

  async completeOrder(orderId: number): Promise<void> {
  this.logger.log(`Completing order ${orderId}`);
    
    const order = this.orders.get(orderId);
    if (!order) {
  this.logger.error(`Order ${orderId} not found`);
      return;
    }

    order.status = 'COMPLETED';
    this.orders.set(orderId, order);
  this.logger.log(`Order ${orderId} completed successfully!`);
  }

  registerOrder(order: Order): void {
  this.orders.set(order.id, order);
  this.logger.log(`Order ${order.id} registered`);
  }

  getOrder(orderId: number): Order | undefined {
    return this.orders.get(orderId);
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }
}
