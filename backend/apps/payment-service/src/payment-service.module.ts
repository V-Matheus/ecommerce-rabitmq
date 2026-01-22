import { Module } from '@nestjs/common';
import { PaymentServiceController } from './payment-service.controller';
import { PaymentServiceService } from './payment-service.service';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';

@Module({
  imports: [],
  controllers: [PaymentServiceController],
  providers: [PaymentServiceService, RabbitMQPublisher],
})
export class PaymentServiceModule {}
