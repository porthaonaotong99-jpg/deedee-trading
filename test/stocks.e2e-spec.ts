/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getDatabaseConfig } from '../src/config/database.config';

describe('Stocks (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: getDatabaseConfig,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      authToken = response.body.access_token;
    });
  });

  describe('/stocks (GET)', () => {
    it('should return paginated stocks', async () => {
      const response = await request(app.getHttpServer())
        .get('/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/stocks').expect(401);
    });
  });

  describe('/stocks (POST)', () => {
    it('should create a new stock with proper permissions', async () => {
      const newStock = {
        name: 'Test Company',
        symbol: 'TEST',
        last_price: 100.5,
      };

      const response = await request(app.getHttpServer())
        .post('/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStock)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.symbol).toBe('TEST');
      expect(response.body.last_price).toBe(100.5);
    });

    it('should validate stock data', async () => {
      const invalidStock = {
        name: '',
        symbol: '',
        last_price: -10,
      };

      await request(app.getHttpServer())
        .post('/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidStock)
        .expect(400);
    });
  });

  describe('/stocks/:id (GET)', () => {
    let stockId: string;

    beforeAll(async () => {
      // Create a stock for testing
      const newStock = {
        name: 'Get Test Company',
        symbol: 'GETTEST',
        last_price: 75.25,
      };

      const response = await request(app.getHttpServer())
        .post('/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStock);

      stockId = response.body.id;
    });

    it('should return a specific stock', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stocks/${stockId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(stockId);
      expect(response.body.symbol).toBe('GETTEST');
    });

    it('should return 404 for non-existent stock', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/stocks/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/stocks/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Stock Trading', () => {
    let customerAuthToken: string;
    let stockId: string;

    beforeAll(async () => {
      // Create a customer account and get auth token
      const customerLogin = await request(app.getHttpServer())
        .post('/auth/customer/login')
        .send({
          email: 'customer@example.com',
          password: 'password123',
        });

      customerAuthToken = customerLogin.body.access_token;

      // Create a stock for trading
      const newStock = {
        name: 'Trading Test Company',
        symbol: 'TRADE',
        last_price: 50.0,
      };

      const stockResponse = await request(app.getHttpServer())
        .post('/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newStock);

      stockId = stockResponse.body.id;
    });

    describe('/stocks/buy (POST)', () => {
      it('should allow customer to buy stock', async () => {
        const buyOrder = {
          stock_id: stockId,
          quantity: 10,
          buy_price: 50.0,
        };

        const response = await request(app.getHttpServer())
          .post('/stocks/buy')
          .set('Authorization', `Bearer ${customerAuthToken}`)
          .send(buyOrder)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Successfully bought');
      });

      it('should reject buy order with insufficient funds', async () => {
        const expensiveBuyOrder = {
          stock_id: stockId,
          quantity: 1000000, // Unrealistic quantity
          buy_price: 50.0,
        };

        await request(app.getHttpServer())
          .post('/stocks/buy')
          .set('Authorization', `Bearer ${customerAuthToken}`)
          .send(expensiveBuyOrder)
          .expect(400);
      });

      it('should not allow admin users to buy stocks', async () => {
        const buyOrder = {
          stock_id: stockId,
          quantity: 10,
          buy_price: 50.0,
        };

        await request(app.getHttpServer())
          .post('/stocks/buy')
          .set('Authorization', `Bearer ${authToken}`) // Admin token
          .send(buyOrder)
          .expect(500); // Should throw error
      });
    });

    describe('/stocks/sell (POST)', () => {
      it('should allow customer to sell owned stock', async () => {
        const sellOrder = {
          stock_id: stockId,
          quantity: 5,
          sell_price: 55.0,
        };

        const response = await request(app.getHttpServer())
          .post('/stocks/sell')
          .set('Authorization', `Bearer ${customerAuthToken}`)
          .send(sellOrder)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Successfully sold');
      });

      it('should reject sell order for more shares than owned', async () => {
        const oversellOrder = {
          stock_id: stockId,
          quantity: 1000, // More than owned
          sell_price: 55.0,
        };

        await request(app.getHttpServer())
          .post('/stocks/sell')
          .set('Authorization', `Bearer ${customerAuthToken}`)
          .send(oversellOrder)
          .expect(400);
      });
    });
  });
});
