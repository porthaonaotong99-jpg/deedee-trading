import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildStockCategoriesDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Stock Categories API')
    .setDescription('Operations for managing stock categories')
    .setVersion('1.0')
    .addTag('stock-categories')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
