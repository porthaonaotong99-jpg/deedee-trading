import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildInteractiveBrokersDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Interactive Brokers API (Mock)')
    .setDescription('Mock endpoints exposing IB integration placeholders')
    .setVersion('1.0')
    .addTag('interactive-brokers')
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
