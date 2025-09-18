// Stocks Controller request/response examples centralized

export const StocksListResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stocks fetched',
  total: 2,
  data: [
    {
      id: 'uuid1',
      name: 'Apple Inc.',
      symbol: 'AAPL',
      last_price: 175.34,
      stockCategory: { id: 'cat-uuid', name: 'Technology' },
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-05T12:00:00.000Z',
    },
    {
      id: 'uuid2',
      name: 'Microsoft Corp.',
      symbol: 'MSFT',
      last_price: 402.11,
      stockCategory: { id: 'cat-uuid', name: 'Technology' },
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

export const StockGetOneResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stock found',
  data: {
    id: 'uuid1',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    last_price: 175.34,
    stockCategory: { id: 'cat-uuid', name: 'Technology' },
    created_at: '2025-01-01T10:00:00.000Z',
    updated_at: '2025-01-05T12:00:00.000Z',
  },
  error: null,
  status_code: 200,
};

export const StockCreateRequestExample = {
  name: 'Apple Inc.',
  symbol: 'AAPL',
  last_price: 175.34,
  stock_categories_id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
};

export const StockCreateResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stock created',
  data: {
    id: 'new-uuid',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    last_price: 175.34,
    stockCategory: { id: 'cat-uuid', name: 'Technology' },
    created_at: '2025-01-10T10:00:00.000Z',
    updated_at: '2025-01-10T10:00:00.000Z',
  },
  error: null,
  status_code: 200,
};

export const StockUpdateRequestExample = {
  name: 'Apple Inc. (Updated)',
  last_price: 180.0,
};

export const StockUpdateResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stock updated',
  data: {
    id: 'uuid1',
    name: 'Apple Inc. (Updated)',
    symbol: 'AAPL',
    last_price: 180.0,
    stockCategory: { id: 'cat-uuid', name: 'Technology' },
    created_at: '2025-01-01T10:00:00.000Z',
    updated_at: '2025-01-11T12:00:00.000Z',
  },
  error: null,
  status_code: 200,
};

export const StockDeleteResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Stock deleted',
  data: null,
  error: null,
  status_code: 200,
};

export const StockBuyRequestExample = {
  stock_id: '11111111-2222-3333-4444-555555555555',
  quantity: 10,
  buy_price: 175.5,
};

export const StockBuyResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Successfully bought 10 shares of AAPL',
  data: {
    success: true,
    message: 'Successfully bought 10 shares of AAPL',
  },
  error: null,
  status_code: 200,
};

export const StockSellRequestExample = {
  stock_id: '11111111-2222-3333-4444-555555555555',
  quantity: 5,
  sell_price: 180.25,
};

export const StockSellResponseExample = {
  is_error: false,
  code: 'SUCCESS',
  message: 'Successfully sold 5 shares of AAPL',
  data: {
    success: true,
    message: 'Successfully sold 5 shares of AAPL',
  },
  error: null,
  status_code: 200,
};
