import { Module } from '@nestjs/common';
import { OrdeServiceController } from './orde-service.controller';
import { OrdeServiceService } from './orde-service.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin@rabbitmq:5672'],
          queue: 'order-queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [OrdeServiceController],
  providers: [OrdeServiceService],
})
export class OrdeServiceModule {}
