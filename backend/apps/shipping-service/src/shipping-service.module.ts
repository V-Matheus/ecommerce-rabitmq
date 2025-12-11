import { Module } from '@nestjs/common';
import { ShippingServiceController } from './shipping-service.controller';
import { ShippingServiceService } from './shipping-service.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'SHIPPING_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin@rabbitmq:5672'],
          queue: 'shipping-queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [ShippingServiceController],
  providers: [ShippingServiceService],
})
export class ShippingServiceModule {}
