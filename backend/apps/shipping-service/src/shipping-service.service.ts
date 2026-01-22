import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';
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
  private readonly logger = new Logger(ShippingServiceService.name);
  private shipments: Shipment[] = [];
  private shipmentIdCounter = 1;

  constructor(private readonly rabbitMQPublisher: RabbitMQPublisher) {}

  getHello(): string {
    return 'Shipping Service is running!';
  }

  async createShipment(paymentEvent: PaymentApprovedEvent): Promise<void> {
    this.logger.log(`Creating shipment for order: ${paymentEvent.orderId}`);

    const shipmentId = this.shipmentIdCounter++;
    const trackingCode = `TRK${Date.now()}${shipmentId}`;

    const shipment: Shipment = {
      id: shipmentId,
      orderId: paymentEvent.orderId,
      trackingCode,
      status: 'CREATED',
    };

    this.shipments.push(shipment);

    this.logger.log(`Shipment created: ${trackingCode}`);

    // Publicar evento de envio criado
    const createdEvent: ShippingCreatedEvent = {
      orderId: paymentEvent.orderId,
      shipmentId,
      trackingCode,
    };

    await this.rabbitMQPublisher.publish('shipping.created', createdEvent);

    // Simular entrega após 5 segundos
    setTimeout(() => {
      this.deliverShipment(shipment);
    }, 5000);
  }

  private async deliverShipment(shipment: Shipment): Promise<void> {
    this.logger.log(`Delivering shipment: ${shipment.trackingCode}`);

    shipment.status = 'DELIVERED';

    const deliveredEvent: ShippingDeliveredEvent = {
      orderId: shipment.orderId,
      shipmentId: shipment.id,
      trackingCode: shipment.trackingCode,
      deliveredAt: new Date(),
    };

    await this.rabbitMQPublisher.publish('shipping.delivered', deliveredEvent);
    this.logger.log(`Shipment delivered: ${shipment.trackingCode}`);
  }
}
