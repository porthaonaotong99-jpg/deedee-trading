import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildBoundsDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Bounds API')
    .setDescription('Operations for managing bounds')
    .setVersion('1.0')
    .addTag('bounds')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
  return document;
}
