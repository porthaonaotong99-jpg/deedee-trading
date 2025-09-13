import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const LoginUserExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Login successful',
  data: {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    token_type: 'bearer',
    expires_in: 3600,
    user: {
      id: 'c6c1a9c8-1234-4d7b-9f10-111111111111',
      username: 'admin',
      role: 'admin',
    },
  },
  error: null,
  status_code: 200,
};

const LoginCustomerExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Login successful',
  data: {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    token_type: 'bearer',
    expires_in: 3600,
    customer: {
      id: '9b4e0e04-aaaa-4fa9-bbbb-222222222222',
      username: 'john_doe',
      email: 'john@example.com',
    },
  },
  error: null,
  status_code: 200,
};

export function buildAuthDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Auth API')
    .setDescription('Authentication endpoints for admin/users and customers')
    .setVersion('1.0')
    .addTag('auth')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [],
    extraModels: [],
    deepScanRoutes: true,
  });

  // Attach examples manually (SwaggerModule currently needs manual patch or use decorators; here we mutate doc)
  if (document.paths['/auth/login']?.post) {
    document.paths['/auth/login'].post.responses = {
      ...document.paths['/auth/login'].post.responses,
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: LoginUserExample,
          },
        },
      },
    };
  }
  if (document.paths['/auth/customer/login']?.post) {
    document.paths['/auth/customer/login'].post.responses = {
      ...document.paths['/auth/customer/login'].post.responses,
      200: {
        description: 'Customer login successful',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: LoginCustomerExample,
          },
        },
      },
    };
  }
  return document;
}
