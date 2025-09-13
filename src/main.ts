import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix (versioned)
  app.setGlobalPrefix('api/v1');

  // Global error response wrapper
  app.useGlobalFilters(new HttpExceptionFilter());

  // Shared Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trading Platform API')
    .setDescription(
      'Unified API documentation for the trading backend. Use this single endpoint for all modules.',
    )
    // Version aligned with API prefix (v1). Increment when breaking changes are introduced.
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // 1. Global document (all modules auto-discovered)
  const globalDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    // Optionally could specify include: [AppModule] explicitly; left default to pick all.
  });
  SwaggerModule.setup('api/v1/docs', app, globalDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true, // enables search box that filters operations by text
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000).then(() => {
    const base = `http://localhost:${process.env.PORT ?? 3000}`;
    console.log(`Server running on endpoint: ${base}/api/v1`);
    console.log(`Global API docs: ${base}/api/v1/docs`);
  });
}
void bootstrap();
