import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:3333',
    credentials: true,
  });

  await app.listen(process.env.port ?? 3000);
}
void bootstrap();
