import { Controller, Get } from '@nestjs/common';
import { ShippingServiceService } from './shipping-service.service';

@Controller()
export class ShippingServiceController {
  constructor(private readonly shippingServiceService: ShippingServiceService) {}

  @Get()
  getHello(): string {
    return this.shippingServiceService.getHello();
  }
}
