import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function buildAuditLogsDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Audit Logs API')
    .setDescription('Read-only audit logging endpoints')
    .setVersion('1.0')
    .addTag('audit-logs')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });
}
