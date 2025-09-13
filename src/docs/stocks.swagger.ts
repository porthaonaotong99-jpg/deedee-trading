import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const StockBase = {
  id: '11111111-2222-3333-4444-555555555555',
  name: 'Apple Inc.',
  symbol: 'AAPL',
  last_price: 175.34,
  stockCategory: {
    id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
    name: 'Technology',
  },
  created_at: '2025-01-01T10:00:00.000Z',
  updated_at: '2025-01-05T12:00:00.000Z',
};

const ListStocksExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stocks fetched',
  total: 2,
  data: [
    StockBase,
    {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: 'Microsoft Corp.',
      symbol: 'MSFT',
      last_price: 402.11,
      stockCategory: {
        id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
        name: 'Technology',
      },
      created_at: '2025-01-02T10:00:00.000Z',
      updated_at: '2025-01-06T12:00:00.000Z',
    },
  ],
  error: null,
  status_code: 200,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const GetStockExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stock found',
  data: StockBase,
  error: null,
  status_code: 200,
};

const CreateStockExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stock created',
  data: { ...StockBase, id: '99999999-aaaa-bbbb-cccc-dddddddddddd' },
  error: null,
  status_code: 200,
};

const BuyStockExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Successfully bought 10 shares of AAPL',
  data: { success: true, message: 'Successfully bought 10 shares of AAPL' },
  error: null,
  status_code: 200,
};

const SellStockExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Successfully sold 5 shares of AAPL',
  data: { success: true, message: 'Successfully sold 5 shares of AAPL' },
  error: null,
  status_code: 200,
};

export function buildStocksDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Stocks API')
    .setDescription('Stock management and trading endpoints')
    .setVersion('1.0')
    .addTag('stocks')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [],
    deepScanRoutes: true,
  });

  // Inject examples for paths if they exist
  const paths = document.paths;
  // List
  if (paths['/stocks']?.get) {
    paths['/stocks'].get.responses = {
      ...paths['/stocks'].get.responses,
      200: {
        description: 'Paginated list returned',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: ListStocksExample,
          },
        },
      },
    };
  }
  // Get one
  if (paths['/stocks/{id}']?.get) {
    paths['/stocks/{id}'].get.responses = {
      ...paths['/stocks/{id}'].get.responses,
      200: {
        description: 'Stock found',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: GetStockExample,
          },
        },
      },
    };
  }
  // Create
  if (paths['/stocks']?.post) {
    paths['/stocks'].post.responses = {
      ...paths['/stocks'].post.responses,
      200: {
        description: 'Stock created',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: CreateStockExample,
          },
        },
      },
    };
  }
  // Buy
  if (paths['/stocks/buy']?.post) {
    paths['/stocks/buy'].post.responses = {
      ...paths['/stocks/buy'].post.responses,
      200: {
        description: 'Buy executed',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: BuyStockExample,
          },
        },
      },
    };
  }
  // Sell
  if (paths['/stocks/sell']?.post) {
    paths['/stocks/sell'].post.responses = {
      ...paths['/stocks/sell'].post.responses,
      200: {
        description: 'Sell executed',
        content: {
          'application/json': {
            schema: { type: 'object' },
            example: SellStockExample,
          },
        },
      },
    };
  }
  return document;
}
