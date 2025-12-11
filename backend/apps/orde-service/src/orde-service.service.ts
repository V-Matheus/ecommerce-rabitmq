import { Injectable } from '@nestjs/common';

@Injectable()
export class OrdeServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
