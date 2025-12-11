import { Controller, Get } from '@nestjs/common';
import { OrdeServiceService } from './orde-service.service';

@Controller()
export class OrdeServiceController {
  constructor(private readonly ordeServiceService: OrdeServiceService) {}

  @Get()
  getHello(): string {
    return this.ordeServiceService.getHello();
  }
}
