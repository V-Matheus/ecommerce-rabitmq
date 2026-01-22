import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';
import {
  InventoryReservedEvent,
  PaymentApprovedEvent,
  PaymentFailedEvent,
} from '../../common/dto/events.dto';

interface Payment {
  id: number;
  orderId: number;
  amount: number;
  status: string;
}

@Injectable()
export class PaymentServiceService {
  private readonly logger = new Logger(PaymentServiceService.name);
  private payments: Payment[] = [];
  private paymentIdCounter = 1;

  constructor(private readonly rabbitMQPublisher: RabbitMQPublisher) {}

  getHello(): string {
    return 'Payment Service is running!';
  }

  async processPayment(inventoryEvent: InventoryReservedEvent): Promise<void> {
    this.logger.log(`Processing payment for order: ${inventoryEvent.orderId}`);

    const paymentId = this.paymentIdCounter++;

    // Simular processamento com 10% de chance de falha
    const shouldFail = Math.random() < 0.1;

    if (shouldFail) {
      this.logger.warn(`Payment FAILED for order: ${inventoryEvent.orderId}`);

      const payment: Payment = {
        id: paymentId,
        orderId: inventoryEvent.orderId,
        amount: inventoryEvent.total,
        status: 'FAILED',
      };
      this.payments.push(payment);

      const event: PaymentFailedEvent = {
        orderId: inventoryEvent.orderId,
        paymentId,
        reason: 'Payment processing failed - Insufficient funds or card declined',
      };

      await this.rabbitMQPublisher.publish('payment.failed', event);
      return;
    }

    // Pagamento aprovado
    this.logger.log(`Payment APPROVED for order: ${inventoryEvent.orderId} Amount: ${inventoryEvent.total}`);

    const payment: Payment = {
      id: paymentId,
      orderId: inventoryEvent.orderId,
      amount: inventoryEvent.total,
      status: 'APPROVED',
    };
    this.payments.push(payment);

    const event: PaymentApprovedEvent = {
      orderId: inventoryEvent.orderId,
      paymentId,
      amount: inventoryEvent.total,
    };

    await this.rabbitMQPublisher.publish('payment.approved', event);
  }
}
