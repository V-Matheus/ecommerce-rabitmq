import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Criar app HTTP
  const app = await NestFactory.create(GatewayModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:3333',
    credentials: true,
  });

  // Conectar como microservice também para receber eventos
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: ['amqp://admin:admin@rabbitmq:5672'],
      exchange: 'ecommerce.exchange',
      exchangeType: 'topic',
      queue: 'gateway-queue',
      routingKey: '#',
      queueOptions: {
        durable: false,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.port ?? 3000);
  const logger = new Logger('GatewayBootstrap');
  logger.log('Gateway is running on http://localhost:3000');
  logger.log('Gateway is also listening on RabbitMQ for events');
}
void bootstrap();
