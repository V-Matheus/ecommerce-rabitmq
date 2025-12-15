import { Body, Controller, Get, Inject, Post, Param, Logger } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import {
  CreateOrderDto,
  OrderResponseDto,
  ProductDto,
} from './dto/gateway.dto';
import { OrderCreatedEvent, InventoryReservedEvent, InventoryInsufficientEvent, PaymentFailedEvent, ShippingDeliveredEvent } from '../../common/dto/events.dto';

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
    @Inject('ORDER_SERVICE')
    private readonly orderClient: ClientProxy,
  @Inject('INVENTORY_SERVICE')
  private readonly inventoryClient: ClientProxy,
  ) {}

  @Get()
  getHello(): string {
    return this.gatewayService.getHello();
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
  createOrder(@Body() createOrderDto: CreateOrderDto): OrderResponseDto {
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
      status: 'PENDING',
      total: estimatedTotal,
    };

    this.orders.set(orderId, order);

    // Publicar evento de pedido criado
    const event: OrderCreatedEvent = {
      orderId,
      customerId: createOrderDto.customerId,
      items: createOrderDto.items,
    };

    // Publish to inventory so it can reserve stock
    try {
      // use emit for fire-and-forget message
      this.inventoryClient.emit('order.created', event);
      this.logger.log(`Order created and event published to inventory: ${orderId}`);
    } catch (error) {
      this.logger.error('Failed to publish order.created event', error as any);
    }

    return order;
  }

  // Event Handlers para atualizar estado local

  @EventPattern('inventory.reserved')
  handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
    try {
      this.logger.log(`Inventory reserved for order: ${data.orderId}`);

      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = 'PROCESSING';
        order.total = data.total;
        this.orders.set(data.orderId, order);
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
        order.status = 'CANCELLED';
        this.orders.set(data.orderId, order);
      }
    } catch (error) {
      this.logger.error('Error handling inventory.insufficient', error as any);
    }
  }

  @EventPattern('payment.failed')
  handlePaymentFailed(@Payload() data: PaymentFailedEvent) {
    try {
      this.logger.warn(`Payment failed for order: ${data.orderId}. Reason: ${data.reason ?? 'unknown'}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = 'CANCELLED';
        this.orders.set(data.orderId, order);
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
        order.status = 'CANCELLED';
        this.orders.set(data.orderId, order);
        // Devolver estoque
        for (const item of data.items) {
          const product = this.products.find(p => p.id === item.productId);
          if (product) {
            product.stock += item.quantity;
          }
        }
      }
    } catch (error) {
      this.logger.error('Error handling order.cancelled', error as any);
    }
  }

  @EventPattern('shipping.delivered')
  handleShippingDelivered(@Payload() data: ShippingDeliveredEvent) {
    try {
      this.logger.log(`Order delivered: ${data.orderId}`);
      const order = this.orders.get(data.orderId);
      if (order) {
        order.status = 'COMPLETED';
        this.orders.set(data.orderId, order);
      }
    } catch (error) {
      this.logger.error('Error handling shipping.delivered', error as any);
    }
  }
}
