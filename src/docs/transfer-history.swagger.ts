import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildTransferHistoryDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Transfer History API')
    .setDescription('Read-only transfer history endpoints')
    .setVersion('1.0')
    .addTag('transfer-history')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
