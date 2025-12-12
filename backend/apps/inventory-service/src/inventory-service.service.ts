import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  OrderCreatedEvent,
  OrderCancelledEvent,
  InventoryReservedEvent,
  InventoryInsufficientEvent,
  ProductDto,
} from '../../common/dto/events.dto';

@Injectable()
export class InventoryServiceService {
  private products: ProductDto[] = [
    { id: 1, name: 'Notebook', price: 2500, stock: 10 },
    { id: 2, name: 'Mouse', price: 50, stock: 50 },
    { id: 3, name: 'Teclado', price: 150, stock: 30 },
  ];

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Inventory Service is running!';
  }

  async reserveStock(orderEvent: OrderCreatedEvent): Promise<void> {
    console.log('[Inventory Service] Checking stock for order:', orderEvent.orderId);

    const missingProducts: { productId: number; requested: number; available: number }[] = [];

    // Verificar se há estoque suficiente
    for (const item of orderEvent.items) {
      const product = this.products.find(p => p.id === item.productId);
      
      if (!product) {
        missingProducts.push({
          productId: item.productId,
          requested: item.quantity,
          available: 0,
        });
      } else if (product.stock < item.quantity) {
        missingProducts.push({
          productId: item.productId,
          requested: item.quantity,
          available: product.stock,
        });
      }
    }

    // Se não houver estoque suficiente, publicar evento de estoque insuficiente
    if (missingProducts.length > 0) {
      console.log('[Inventory Service] Insufficient stock for order:', orderEvent.orderId);
      
      const event: InventoryInsufficientEvent = {
        orderId: orderEvent.orderId,
        missingProducts,
      };

      this.rabbitClient.emit('inventory.insufficient', event);
      return;
    }

    // Reservar estoque e calcular total
    let total = 0;
    for (const item of orderEvent.items) {
      const product = this.products.find(p => p.id === item.productId);
      if (product) {
        product.stock -= item.quantity;
        total += product.price * item.quantity;
        console.log(`[Inventory Service] Reserved ${item.quantity} units of ${product.name}. Remaining stock: ${product.stock}`);
      }
    }

    console.log('[Inventory Service] Stock reserved for order:', orderEvent.orderId, 'Total:', total);

    // Publicar evento de estoque reservado
    const event: InventoryReservedEvent = {
      orderId: orderEvent.orderId,
      items: orderEvent.items,
      total,
    };

    this.rabbitClient.emit('inventory.reserved', event);
  }

  async releaseStock(orderEvent: OrderCancelledEvent): Promise<void> {
    console.log('[Inventory Service] Releasing stock for cancelled order:', orderEvent.orderId);

    // Devolver o estoque
    for (const item of orderEvent.items) {
      const product = this.products.find(p => p.id === item.productId);
      if (product) {
        product.stock += item.quantity;
        console.log(`[Inventory Service] Released ${item.quantity} units of ${product.name}. Current stock: ${product.stock}`);
      }
    }

    console.log('[Inventory Service] Stock released for order:', orderEvent.orderId);
  }
}
