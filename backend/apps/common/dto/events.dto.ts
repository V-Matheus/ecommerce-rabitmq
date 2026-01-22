// DTOs compartilhados entre os microserviços

// Estados detalhados do pedido para rastreamento em tempo real
export enum OrderStatus {
  PENDING = 'PENDING',                    // Pedido criado, aguardando processamento
  IN_INVENTORY = 'IN_INVENTORY',          // Verificando estoque
  INVENTORY_CONFIRMED = 'INVENTORY_CONFIRMED', // Estoque reservado
  IN_PAYMENT = 'IN_PAYMENT',              // Processando pagamento
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED', // Pagamento aprovado
  IN_SHIPPING = 'IN_SHIPPING',            // Preparando envio
  SHIPPED = 'SHIPPED',                    // Enviado
  COMPLETED = 'COMPLETED',                // Entregue
  CANCELLED = 'CANCELLED',                // Cancelado
}

// Mapeamento de status para mensagens amigáveis
export const OrderStatusMessages: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pedido recebido',
  [OrderStatus.IN_INVENTORY]: 'Verificando estoque...',
  [OrderStatus.INVENTORY_CONFIRMED]: 'Estoque reservado',
  [OrderStatus.IN_PAYMENT]: 'Processando pagamento...',
  [OrderStatus.PAYMENT_CONFIRMED]: 'Pagamento aprovado',
  [OrderStatus.IN_SHIPPING]: 'Preparando envio...',
  [OrderStatus.SHIPPED]: 'Pedido enviado',
  [OrderStatus.COMPLETED]: 'Pedido entregue',
  [OrderStatus.CANCELLED]: 'Pedido cancelado',
};

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
