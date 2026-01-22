import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { SseService } from './sse.service';
import { RabbitMQPublisher } from '../../common/rabbitmq.service';

@Module({
  imports: [],
  controllers: [GatewayController],
  providers: [GatewayService, SseService, RabbitMQPublisher],
})
export class GatewayModule {}
