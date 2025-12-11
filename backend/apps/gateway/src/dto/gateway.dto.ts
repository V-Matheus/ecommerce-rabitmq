export class CreateOrderDto {
  customerId: number;
  items: OrderItemDto[];
}

export class OrderItemDto {
  productId: number;
  quantity: number;
}

export class OrderResponseDto {
  id: number;
  customerId: number;
  items: OrderItemDto[];
  status: string;
  total: number;
}

export class ProductDto {
  id: number;
  name: string;
  price: number;
  stock: number;
}
