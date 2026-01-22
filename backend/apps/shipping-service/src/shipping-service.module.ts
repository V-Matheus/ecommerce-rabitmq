import { Module } from '@nestjs/common';
import { ShippingServiceController } from './shipping-service.controller';
import { ShippingServiceService } from './shipping-service.service';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';

@Module({
  imports: [],
  controllers: [ShippingServiceController],
  providers: [ShippingServiceService, RabbitMQPublisher],
})
export class ShippingServiceModule {}
