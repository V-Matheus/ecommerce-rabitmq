import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

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
      queue: 'gateway-queue',
      queueOptions: {
        durable: false,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.port ?? 3000);
  
  console.log('Gateway is running on http://localhost:3000');
  console.log('Gateway is also listening on RabbitMQ for events');
}
void bootstrap();
