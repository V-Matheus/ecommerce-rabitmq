import { NestFactory } from '@nestjs/core';
import { OrderServiceModule } from './order-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin@rabbitmq:5672'],
        exchange: 'ecommerce.exchange',
        exchangeType: 'topic',
        queue: 'order-queue',
        routingKey: '#',
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  await app.listen();
  const logger = new Logger('OrderBootstrap');
  logger.log('Order Service is listening on RabbitMQ...');
}
bootstrap();
