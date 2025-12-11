import { Module } from '@nestjs/common';
import { OrdeServiceController } from './orde-service.controller';
import { OrdeServiceService } from './orde-service.service';

@Module({
  imports: [],
  controllers: [OrdeServiceController],
  providers: [OrdeServiceService],
})
export class OrdeServiceModule {}
