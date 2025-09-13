import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildWalletsDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Wallets API')
    .setDescription('Wallet CRUD operations')
    .setVersion('1.0')
    .addTag('wallets')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
