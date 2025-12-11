import { NestFactory } from '@nestjs/core';
import { OrdeServiceModule } from './orde-service.module';

async function bootstrap() {
  const app = await NestFactory.create(OrdeServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
