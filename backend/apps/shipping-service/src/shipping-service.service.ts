import { Injectable } from '@nestjs/common';

@Injectable()
export class ShippingServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
