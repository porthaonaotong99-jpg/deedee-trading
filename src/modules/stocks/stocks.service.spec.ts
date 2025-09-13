import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StocksService } from './stocks.service';
import { Stock } from './entities/stock.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';
import { StockTransaction } from '../stock-transactions/entities/stock-transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { CreateStockDto, BuyStockDto } from './dto/stock.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('StocksService', () => {
  let service: StocksService;
  let stockRepository: Repository<Stock>;
  let customerRepository: Repository<Customer>;
  let customerStockRepository: Repository<CustomerStock>;
  let stockTransactionRepository: Repository<StockTransaction>;
  let walletRepository: Repository<Wallet>;

  const mockStock = {
    id: 'stock-uuid',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    last_price: 150.0,
    stock_categories_id: 'category-uuid',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCustomer = {
    id: 'customer-uuid',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    wallet: {
      id: 'wallet-uuid',
      total_cash: 10000.0,
      total_balance: 5000.0,
      customer_id: 'customer-uuid',
    },
  };

  const mockRepositoryFactory = () => ({
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: getRepositoryToken(Stock),
          useFactory: mockRepositoryFactory,
        },
        {
          provide: getRepositoryToken(Customer),
          useFactory: mockRepositoryFactory,
        },
        {
          provide: getRepositoryToken(CustomerStock),
          useFactory: mockRepositoryFactory,
        },
        {
          provide: getRepositoryToken(StockTransaction),
          useFactory: mockRepositoryFactory,
        },
        {
          provide: getRepositoryToken(Wallet),
          useFactory: mockRepositoryFactory,
        },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
    stockRepository = module.get<Repository<Stock>>(getRepositoryToken(Stock));
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
    customerStockRepository = module.get<Repository<CustomerStock>>(
      getRepositoryToken(CustomerStock),
    );
    stockTransactionRepository = module.get<Repository<StockTransaction>>(
      getRepositoryToken(StockTransaction),
    );
    walletRepository = module.get<Repository<Wallet>>(
      getRepositoryToken(Wallet),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a stock when found', async () => {
      const findOneSpy = jest
        .spyOn(stockRepository, 'findOne')
        .mockResolvedValue(mockStock as Stock);

      const result = await service.findOne('stock-uuid');

      expect(result).toEqual({
        id: mockStock.id,
        name: mockStock.name,
        symbol: mockStock.symbol,
        last_price: mockStock.last_price,
        created_at: mockStock.created_at,
        updated_at: mockStock.updated_at,
        stockCategory: undefined,
      });
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 'stock-uuid' },
        relations: ['stockCategory'],
      });
    });

    it('should throw NotFoundException when stock not found', async () => {
      jest.spyOn(stockRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('nonexistent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new stock', async () => {
      const createStockDto: CreateStockDto = {
        name: 'Test Stock',
        symbol: 'TEST',
        last_price: 100.0,
        stock_categories_id: 'category-uuid',
      };

      const createdStock = { id: 'new-uuid', ...createStockDto };

      const createSpy = jest
        .spyOn(stockRepository, 'create')
        .mockReturnValue(createdStock as Stock);
      jest
        .spyOn(stockRepository, 'save')
        .mockResolvedValue(createdStock as Stock);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: createdStock.id,
        name: createdStock.name,
        symbol: createdStock.symbol,
        last_price: createdStock.last_price,
        stockCategory: undefined,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.create(createStockDto);

      expect(result.symbol).toBe('TEST');
      expect(createSpy).toHaveBeenCalledWith({
        ...createStockDto,
        created_by: 'system',
      });
    });
  });

  describe('buyStock', () => {
    it('should successfully buy stock', async () => {
      const buyStockDto: BuyStockDto = {
        stock_id: 'stock-uuid',
        quantity: 10,
        buy_price: 150.0,
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as Customer);
      jest
        .spyOn(stockRepository, 'findOne')
        .mockResolvedValue(mockStock as Stock);
      jest.spyOn(customerStockRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(customerStockRepository, 'create')
        .mockReturnValue({} as CustomerStock);
      jest
        .spyOn(customerStockRepository, 'save')
        .mockResolvedValue({} as CustomerStock);
      jest
        .spyOn(stockTransactionRepository, 'create')
        .mockReturnValue({} as StockTransaction);
      jest
        .spyOn(stockTransactionRepository, 'save')
        .mockResolvedValue({} as StockTransaction);
      jest.spyOn(walletRepository, 'save').mockResolvedValue({} as Wallet);

      const result = await service.buyStock('customer-uuid', buyStockDto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully bought 10 shares of AAPL');
    });

    it('should throw BadRequestException when insufficient funds', async () => {
      const buyStockDto: BuyStockDto = {
        stock_id: 'stock-uuid',
        quantity: 100, // More than customer can afford
        buy_price: 150.0,
      };

      const poorCustomer = {
        ...mockCustomer,
        wallet: {
          ...mockCustomer.wallet,
          total_cash: 1000.0, // Not enough for 100 shares at $150
        },
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(poorCustomer as Customer);
      jest
        .spyOn(stockRepository, 'findOne')
        .mockResolvedValue(mockStock as Stock);

      await expect(
        service.buyStock('customer-uuid', buyStockDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
