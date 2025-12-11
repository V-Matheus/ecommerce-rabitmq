import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateOrderDto,
  OrderResponseDto,
  ProductDto,
} from './dto/gateway.dto';

@Controller()
export class GatewayController {
  private orders: OrderResponseDto[] = [];
  private orderIdCounter = 1;

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
    this.inventoryClient.emit('get_products', {});
    return [
      { id: 1, name: 'Notebook', price: 2500, stock: 10 },
      { id: 2, name: 'Mouse', price: 50, stock: 50 },
      { id: 3, name: 'Teclado', price: 150, stock: 30 },
    ];
  }

  @Get('orders')
  getOrders(): OrderResponseDto[] {
    this.orderClient.emit('get_orders', {});
    return this.orders;
  }

  @Post('orders')
  createOrder(@Body() createOrderDto: CreateOrderDto): OrderResponseDto {
    this.orderClient.emit('order.created', createOrderDto);
    const order: OrderResponseDto = {
      id: this.orderIdCounter++,
      customerId: createOrderDto.customerId,
      items: createOrderDto.items,
      status: 'PENDING',
      total: 0,
    };

    this.orders.push(order);

    return order;
  }
}
