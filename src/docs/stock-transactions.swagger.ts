import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildStockTransactionsDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Stock Transactions API')
    .setDescription('Stock transaction history listing')
    .setVersion('1.0')
    .addTag('stock-transactions')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
