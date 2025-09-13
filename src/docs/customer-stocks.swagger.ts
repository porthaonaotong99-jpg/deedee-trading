import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildCustomerStocksDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Customer Stocks API')
    .setDescription('Customer stock holdings listing operations')
    .setVersion('1.0')
    .addTag('customer-stocks')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
