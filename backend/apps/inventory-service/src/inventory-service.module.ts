import { Module } from '@nestjs/common';
import { InventoryServiceController } from './inventory-service.controller';
import { InventoryServiceService } from './inventory-service.service';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';

@Module({
  imports: [],
  controllers: [InventoryServiceController],
  providers: [InventoryServiceService, RabbitMQPublisher],
})
export class InventoryServiceModule {}
