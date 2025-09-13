import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildUsersDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Users API')
    .setDescription('Admin user management operations')
    .setVersion('1.0')
    .addTag('users')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
