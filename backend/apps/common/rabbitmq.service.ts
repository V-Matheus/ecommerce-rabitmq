import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQPublisher.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchangeName = 'ecommerce.exchange';
  private readonly url = 'amqp://admin:admin@rabbitmq:5672';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      this.logger.log('Connected to RabbitMQ for publishing');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ', error);
      // Retry after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }

  async publish(routingKey: string, message: any): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Channel not ready, attempting to reconnect...');
      await this.connect();
    }

    try {
      // NestJS microservices expect messages wrapped with pattern and data
      const nestMessage = {
        pattern: routingKey,
        data: message,
      };
      const messageBuffer = Buffer.from(JSON.stringify(nestMessage));
      this.channel.publish(this.exchangeName, routingKey, messageBuffer, {
        contentType: 'application/json',
      });
      this.logger.log(`Published message to ${this.exchangeName} with routing key: ${routingKey}`);
    } catch (error) {
      this.logger.error(`Failed to publish message with routing key ${routingKey}`, error);
      throw error;
    }
  }
}
