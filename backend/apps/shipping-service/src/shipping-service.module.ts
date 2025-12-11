import { Module } from '@nestjs/common';
import { ShippingServiceController } from './shipping-service.controller';
import { ShippingServiceService } from './shipping-service.service';

@Module({
  imports: [],
  controllers: [ShippingServiceController],
  providers: [ShippingServiceService],
})
export class ShippingServiceModule {}
