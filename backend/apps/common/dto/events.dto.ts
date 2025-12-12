// DTOs compartilhados entre os microserviços

export class OrderItemDto {
  productId: number;
  quantity: number;
}

export class OrderCreatedEvent {
  orderId: number;
  customerId: number;
  items: OrderItemDto[];
}

export class OrderCancelledEvent {
  orderId: number;
  reason: string;
  items: OrderItemDto[];
}

export class InventoryReservedEvent {
  orderId: number;
  items: OrderItemDto[];
  total: number;
}

export class InventoryInsufficientEvent {
  orderId: number;
  missingProducts: { productId: number; requested: number; available: number }[];
}

export class PaymentApprovedEvent {
  orderId: number;
  paymentId: number;
  amount: number;
}

export class PaymentFailedEvent {
  orderId: number;
  paymentId: number;
  reason: string;
}

export class ShippingCreatedEvent {
  orderId: number;
  shipmentId: number;
  trackingCode: string;
}

export class ShippingDeliveredEvent {
  orderId: number;
  shipmentId: number;
  trackingCode: string;
  deliveredAt: Date;
}

export class ProductDto {
  id: number;
  name: string;
  price: number;
  stock: number;
}
