import { NestFactory } from '@nestjs/core';
import { ShippingServiceModule } from './shipping-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ShippingServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://admin:admin@rabbitmq:5672'],
        queue: 'shipping-queue',
        queueOptions: {
          durable: false,
        },
      },
    },
  );

  await app.listen();
  const logger = new Logger('ShippingBootstrap');
  logger.log('Shipping Service is listening on RabbitMQ...');
}
bootstrap();
