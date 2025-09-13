import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildPermissionsDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Permissions API')
    .setDescription('Permission management operations')
    .setVersion('1.0')
    .addTag('permissions')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
