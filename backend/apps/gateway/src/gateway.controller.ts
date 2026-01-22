import { Body, Controller, Get, Post, Param, Logger, Sse, MessageEvent } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { SseService } from './sse.service';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  CreateOrderDto,
  OrderResponseDto,
  ProductDto,
} from './dto/gateway.dto';
import {
  OrderCreatedEvent,
  InventoryReservedEvent,
  InventoryInsufficientEvent,
  PaymentFailedEvent,
  ShippingDeliveredEvent,
  PaymentApprovedEvent,
  ShippingCreatedEvent,
  OrderStatus,
  OrderStatusMessages,
} from '../../common/dto/events.dto';
import { Observable, map } from 'rxjs';

@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);
  private orders: Map<number, OrderResponseDto> = new Map();
  private orderIdCounter = 1;

  // Produtos disponíveis (sincronizado com Inventory Service)
  private products: ProductDto[] = [
    { id: 1, name: 'Notebook', price: 2500, stock: 10 },
    { id: 2, name: 'Mouse', price: 50, stock: 50 },
    { id: 3, name: 'Teclado', price: 150, stock: 30 },
  ];

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly sseService: SseService,
    private readonly rabbitMQPublisher: RabbitMQPublisher,
  ) {}

  @Get()
  getHello(): string {
    return this.gatewayService.getHello();
  }

  // Endpoint SSE para streaming de atualizações em tempo real
  @Sse('orders/events')
  orderEvents(): Observable<MessageEvent> {
    this.logger.log('Client connected to SSE stream');
    return this.sseService.getOrderUpdates().pipe(
      map((event) => ({
        data: JSON.stringify(event),
      } as MessageEvent)),
    );
  }

  @Get('products')
  getProducts(): ProductDto[] {
    this.logger.debug('Getting products list');
    return this.products;
  }

  @Get('orders')
  getOrders(): OrderResponseDto[] {
    return Array.from(this.orders.values());
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string): OrderResponseDto | { error: string } {
    const orderId = parseInt(id, 10);
    const order = this.orders.get(orderId);

    if (!order) {
      this.logger.warn(`Order not found: ${orderId}`);
      return { error: 'Order not found' };
    }

    this.logger.debug(`Getting order: ${orderId}`);
    return order;
  }

  @Post('orders')
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    this.logger.log(`Creating new order for customer ${createOrderDto.customerId}`);

    // Calcular total estimado
    let estimatedTotal = 0;
    for (const item of createOrderDto.items) {
      const product = this.products.find(p => p.id === item.productId);
      if (product) {
        estimatedTotal += product.price * item.quantity;
      }
    }

    const orderId = this.orderIdCounter++;
    const order: OrderResponseDto = {
      id: orderId,
      customerId: createOrderDto.customerId,
      items: createOrderDto.items,
      status: OrderStatus.PENDING,
      total: estimatedTotal,
    };

    this.orders.set(orderId, order);

    // Emitir evento SSE para novo pedido
    this.sseService.emitOrderUpdate({
      orderId,
      status: OrderStatus.PENDING,
      message: OrderStatusMessages[OrderStatus.PENDING],
      timestamp: new Date(),
      service: 'gateway',
    });

    // Publicar evento de pedido criado
    const event: OrderCreatedEvent = {
      orderId,
      customerId: createOrderDto.customerId,
      items: createOrderDto.items,
    };

    // Publish to inventory so it can reserve stock
    try {
      await this.rabbitMQPublisher.publish('order.created', event);
      this.logger.log(`Order created and event published to inventory: ${orderId}`);

      // Atualizar status para IN_INVENTORY
      order.status = OrderStatus.IN_INVENTORY;
      this.orders.set(orderId, order);

      this.sseService.emitOrderUpdate({
        orderId,
        status: OrderStatus.IN_INVENTORY,
        message: OrderStatusMessages[OrderStatus.IN_INVENTORY],
        timestamp: new Date(),
        service: 'inventory-service',
      });
    } catch (error) {
      this.logger.error('Failed to publish order.created event', error as any);
    }

    return order;
  }

  // Event Handlers para atualizar estado local e emitir SSE

  @EventPattern('inventory.reserved')
  handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
    try {
      this.logger.log(`Inventory reserved for order: ${data.orderId}`);

      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.IN_PAYMENT;
        order.total = data.total;
        this.orders.set(data.orderId, order);

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.INVENTORY_CONFIRMED,
          message: OrderStatusMessages[OrderStatus.INVENTORY_CONFIRMED],
          timestamp: new Date(),
          service: 'inventory-service',
        });

        // Logo após, atualizar para IN_PAYMENT
        setTimeout(() => {
          this.sseService.emitOrderUpdate({
            orderId: data.orderId,
            status: OrderStatus.IN_PAYMENT,
            message: OrderStatusMessages[OrderStatus.IN_PAYMENT],
            timestamp: new Date(),
            service: 'payment-service',
          });
        }, 500);
      }

      // Atualizar estoque local
      for (const item of data.items) {
        const product = this.products.find(p => p.id === item.productId);
        if (product) {
          product.stock -= item.quantity;
        }
      }
    } catch (error) {
      this.logger.error('Error handling inventory.reserved', error as any);
    }
  }

  @EventPattern('inventory.insufficient')
  handleInventoryInsufficient(@Payload() data: InventoryInsufficientEvent) {
    try {
      this.logger.warn(`Insufficient inventory for order: ${data.orderId}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.CANCELLED;
        this.orders.set(data.orderId, order);

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.CANCELLED,
          message: 'Estoque insuficiente - ' + OrderStatusMessages[OrderStatus.CANCELLED],
          timestamp: new Date(),
          service: 'inventory-service',
        });
      }
    } catch (error) {
      this.logger.error('Error handling inventory.insufficient', error as any);
    }
  }

  @EventPattern('payment.approved')
  handlePaymentApproved(@Payload() data: PaymentApprovedEvent) {
    try {
      this.logger.log(`Payment approved for order: ${data.orderId}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.IN_SHIPPING;
        this.orders.set(data.orderId, order);

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.PAYMENT_CONFIRMED,
          message: OrderStatusMessages[OrderStatus.PAYMENT_CONFIRMED],
          timestamp: new Date(),
          service: 'payment-service',
        });

        setTimeout(() => {
          this.sseService.emitOrderUpdate({
            orderId: data.orderId,
            status: OrderStatus.IN_SHIPPING,
            message: OrderStatusMessages[OrderStatus.IN_SHIPPING],
            timestamp: new Date(),
            service: 'shipping-service',
          });
        }, 500);
      }
    } catch (error) {
      this.logger.error('Error handling payment.approved', error as any);
    }
  }

  @EventPattern('payment.failed')
  handlePaymentFailed(@Payload() data: PaymentFailedEvent) {
    try {
      this.logger.warn(`Payment failed for order: ${data.orderId}. Reason: ${data.reason ?? 'unknown'}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.CANCELLED;
        this.orders.set(data.orderId, order);

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.CANCELLED,
          message: 'Pagamento falhou - ' + OrderStatusMessages[OrderStatus.CANCELLED],
          timestamp: new Date(),
          service: 'payment-service',
        });
      }
    } catch (error) {
      this.logger.error('Error handling payment.failed', error as any);
    }
  }

  @EventPattern('order.cancelled')
  handleOrderCancelled(@Payload() data: any) {
    try {
      this.logger.log(`Order cancelled: ${data.orderId}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.CANCELLED;
        this.orders.set(data.orderId, order);
        // Devolver estoque
        for (const item of data.items) {
          const product = this.products.find(p => p.id === item.productId);
          if (product) {
            product.stock += item.quantity;
          }
        }

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.CANCELLED,
          message: OrderStatusMessages[OrderStatus.CANCELLED],
          timestamp: new Date(),
          service: 'order-service',
        });
      }
    } catch (error) {
      this.logger.error('Error handling order.cancelled', error as any);
    }
  }

  @EventPattern('shipping.created')
  handleShippingCreated(@Payload() data: ShippingCreatedEvent) {
    try {
      this.logger.log(`Shipping created for order: ${data.orderId}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.SHIPPED;
        this.orders.set(data.orderId, order);

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.SHIPPED,
          message: `${OrderStatusMessages[OrderStatus.SHIPPED]} - Rastreio: ${data.trackingCode}`,
          timestamp: new Date(),
          service: 'shipping-service',
        });
      }
    } catch (error) {
      this.logger.error('Error handling shipping.created', error as any);
    }
  }

  @EventPattern('shipping.delivered')
  handleShippingDelivered(@Payload() data: ShippingDeliveredEvent) {
    try {
      this.logger.log(`Order delivered: ${data.orderId}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = OrderStatus.COMPLETED;
        this.orders.set(data.orderId, order);

        this.sseService.emitOrderUpdate({
          orderId: data.orderId,
          status: OrderStatus.COMPLETED,
          message: OrderStatusMessages[OrderStatus.COMPLETED],
          timestamp: new Date(),
          service: 'shipping-service',
        });
      }
    } catch (error) {
      this.logger.error('Error handling shipping.delivered', error as any);
    }
  }
}
