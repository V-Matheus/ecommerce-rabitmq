import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin@rabbitmq:5672'],
        exchange: 'ecommerce.exchange',
        exchangeType: 'topic',
        queue: 'payment-queue',
        routingKey: 'inventory.reserved',
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  await app.listen();
  const logger = new Logger('PaymentBootstrap');
  logger.log('Payment Service is listening on RabbitMQ...');
}

bootstrap();
