import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  PaymentApprovedEvent,
  ShippingCreatedEvent,
  ShippingDeliveredEvent,
} from '../../common/dto/events.dto';

interface Shipment {
  id: number;
  orderId: number;
  trackingCode: string;
  status: string;
}

@Injectable()
export class ShippingServiceService {
  private shipments: Shipment[] = [];
  private shipmentIdCounter = 1;

  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Shipping Service is running!';
  }

  async createShipment(paymentEvent: PaymentApprovedEvent): Promise<void> {
    console.log('[Shipping Service] Creating shipment for order:', paymentEvent.orderId);

    const shipmentId = this.shipmentIdCounter++;
    const trackingCode = `TRK${Date.now()}${shipmentId}`;

    const shipment: Shipment = {
      id: shipmentId,
      orderId: paymentEvent.orderId,
      trackingCode,
      status: 'CREATED',
    };

    this.shipments.push(shipment);

    console.log('[Shipping Service] Shipment created:', trackingCode);

    // Publicar evento de envio criado
    const createdEvent: ShippingCreatedEvent = {
      orderId: paymentEvent.orderId,
      shipmentId,
      trackingCode,
    };

    this.rabbitClient.emit('shipping.created', createdEvent);

    // Simular entrega após 5 segundos
    setTimeout(() => {
      this.deliverShipment(shipment);
    }, 5000);
  }

  private deliverShipment(shipment: Shipment): void {
    console.log('[Shipping Service] Delivering shipment:', shipment.trackingCode);

    shipment.status = 'DELIVERED';

    const deliveredEvent: ShippingDeliveredEvent = {
      orderId: shipment.orderId,
      shipmentId: shipment.id,
      trackingCode: shipment.trackingCode,
      deliveredAt: new Date(),
    };

    this.rabbitClient.emit('shipping.delivered', deliveredEvent);
    console.log('[Shipping Service] Shipment delivered:', shipment.trackingCode);
  }
}
