import { Module } from '@nestjs/common';
import { OrderServiceController } from './order-service.controller';
import { OrderServiceService } from './order-service.service';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';

@Module({
  imports: [],
  controllers: [OrderServiceController],
  providers: [OrderServiceService, RabbitMQPublisher],
})
export class OrderServiceModule {}
