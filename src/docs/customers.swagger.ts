import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildCustomersDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Customers API')
    .setDescription('Customer CRUD operations')
    .setVersion('1.0')
    .addTag('customers')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
