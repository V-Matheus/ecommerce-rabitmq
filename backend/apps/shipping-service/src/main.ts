import { NestFactory } from '@nestjs/core';
import { ShippingServiceModule } from './shipping-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ShippingServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
