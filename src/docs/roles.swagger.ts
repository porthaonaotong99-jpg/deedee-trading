import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildRolesDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Roles API')
    .setDescription('Role management operations')
    .setVersion('1.0')
    .addTag('roles')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
