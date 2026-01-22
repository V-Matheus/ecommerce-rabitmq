import { NestFactory } from '@nestjs/core';
import { InventoryServiceModule } from './inventory-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin@rabbitmq:5672'],
        exchange: 'ecommerce.exchange',
        exchangeType: 'topic',
        queue: 'inventory-queue',
        routingKey: 'order.*',
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  await app.listen();
  const logger = new Logger('InventoryBootstrap');
  logger.log('Inventory Service is listening on RabbitMQ...');
}
bootstrap();
