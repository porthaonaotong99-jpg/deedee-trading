import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from './entities/stock.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerStock } from '../customer-stocks/entities/customer-stock.entity';
import { StockTransaction } from '../stock-transactions/entities/stock-transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import {
  CreateStockDto,
  UpdateStockDto,
  StockResponseDto,
  BuyStockDto,
  SellStockDto,
} from './dto/stock.dto';
import { StockTransactionType } from '../../common/enums';
import { PaginationOptions, PaginationResult } from '../../common/interfaces';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerStock)
    private readonly customerStockRepository: Repository<CustomerStock>,
    @InjectRepository(StockTransaction)
    private readonly stockTransactionRepository: Repository<StockTransaction>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async findAll(
    options: PaginationOptions = {},
  ): Promise<PaginationResult<StockResponseDto>> {
    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'DESC',
    } = options;
    const skip = (page - 1) * limit;

    const [stocks, total] = await this.stockRepository.findAndCount({
      relations: ['stockCategory'],
      skip,
      take: limit,
      order: { [sort]: order },
    });

    const data = stocks.map((stock) => this.mapToResponseDto(stock));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<StockResponseDto> {
    const stock = await this.stockRepository.findOne({
      where: { id },
      relations: ['stockCategory'],
    });

    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }

    return this.mapToResponseDto(stock);
  }

  async create(createStockDto: CreateStockDto): Promise<StockResponseDto> {
    const stock = this.stockRepository.create({
      ...createStockDto,
      created_by: 'system', // In real app, get from authenticated user
    });

    const savedStock = await this.stockRepository.save(stock);
    return this.findOne(savedStock.id);
  }

  async update(
    id: string,
    updateStockDto: UpdateStockDto,
  ): Promise<StockResponseDto> {
    const stock = await this.stockRepository.findOne({ where: { id } });

    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }

    Object.assign(stock, updateStockDto);
    stock.updated_by = 'system'; // In real app, get from authenticated user

    await this.stockRepository.save(stock);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const stock = await this.stockRepository.findOne({ where: { id } });

    if (!stock) {
      throw new NotFoundException(`Stock with ID ${id} not found`);
    }

    await this.stockRepository.remove(stock);
  }

  async buyStock(
    customerId: string,
    buyStockDto: BuyStockDto,
  ): Promise<{ success: boolean; message: string }> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      relations: ['wallet'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const stock = await this.stockRepository.findOne({
      where: { id: buyStockDto.stock_id },
    });

    if (!stock) {
      throw new NotFoundException('Stock not found');
    }

    const totalCost = buyStockDto.quantity * buyStockDto.buy_price;

    // Check if customer has enough balance
    if (customer.wallet.total_cash < totalCost) {
      throw new BadRequestException('Insufficient funds');
    }

    // Update wallet balance
    customer.wallet.total_cash -= totalCost;
    customer.wallet.total_balance += totalCost; // Add to stock value
    await this.walletRepository.save(customer.wallet);

    // Check if customer already has this stock
    let customerStock = await this.customerStockRepository.findOne({
      where: { customer_id: customerId, stock_id: buyStockDto.stock_id },
    });

    if (customerStock) {
      // Update existing position
      const newTotalShares = customerStock.share + buyStockDto.quantity;
      const newTotalCost = customerStock.total_buying_price + totalCost;
      customerStock.share = newTotalShares;
      customerStock.total_buying_price = newTotalCost;
      customerStock.avg_price = newTotalCost / newTotalShares;
      customerStock.cost_basis = customerStock.avg_price * newTotalShares;
    } else {
      // Create new position
      customerStock = this.customerStockRepository.create({
        customer_id: customerId,
        stock_id: buyStockDto.stock_id,
        buying_price: buyStockDto.buy_price,
        share: buyStockDto.quantity,
        total_buying_price: totalCost,
        avg_price: buyStockDto.buy_price,
        cost_basis: totalCost,
        created_by: customerId,
      });
    }

    await this.customerStockRepository.save(customerStock);

    // Record transaction
    const transaction = this.stockTransactionRepository.create({
      customer_id: customerId,
      stock_id: buyStockDto.stock_id,
      type: StockTransactionType.BUY,
      quantity: buyStockDto.quantity,
      buy_price: buyStockDto.buy_price,
      amount: totalCost,
      created_by: customerId,
    });

    await this.stockTransactionRepository.save(transaction);

    return {
      success: true,
      message: `Successfully bought ${buyStockDto.quantity} shares of ${stock.symbol}`,
    };
  }

  async sellStock(
    customerId: string,
    sellStockDto: SellStockDto,
  ): Promise<{ success: boolean; message: string }> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
      relations: ['wallet'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const stock = await this.stockRepository.findOne({
      where: { id: sellStockDto.stock_id },
    });

    if (!stock) {
      throw new NotFoundException('Stock not found');
    }

    const customerStock = await this.customerStockRepository.findOne({
      where: { customer_id: customerId, stock_id: sellStockDto.stock_id },
    });

    if (!customerStock || customerStock.share < sellStockDto.quantity) {
      throw new BadRequestException('Insufficient stock shares');
    }

    const totalRevenue = sellStockDto.quantity * sellStockDto.sell_price;

    // Update customer stock position
    customerStock.share -= sellStockDto.quantity;
    const soldCostBasis = customerStock.avg_price * sellStockDto.quantity;
    customerStock.total_buying_price -= soldCostBasis;
    customerStock.cost_basis = customerStock.avg_price * customerStock.share;

    if (customerStock.share === 0) {
      await this.customerStockRepository.remove(customerStock);
    } else {
      await this.customerStockRepository.save(customerStock);
    }

    // Update wallet balance
    customer.wallet.total_cash += totalRevenue;
    customer.wallet.total_balance -= soldCostBasis; // Remove from stock value
    await this.walletRepository.save(customer.wallet);

    // Record transaction
    const transaction = this.stockTransactionRepository.create({
      customer_id: customerId,
      stock_id: sellStockDto.stock_id,
      type: StockTransactionType.SELL,
      quantity: sellStockDto.quantity,
      buy_price: sellStockDto.sell_price, // Using buy_price field for sell price
      amount: totalRevenue,
      created_by: customerId,
    });

    await this.stockTransactionRepository.save(transaction);

    return {
      success: true,
      message: `Successfully sold ${sellStockDto.quantity} shares of ${stock.symbol}`,
    };
  }

  private mapToResponseDto(stock: Stock): StockResponseDto {
    const category = stock.stockCategory as
      | { id: string; name: string }
      | undefined
      | null;
    return {
      id: stock.id,
      name: stock.name,
      symbol: stock.symbol,
      last_price: stock.last_price,
      stockCategory: category
        ? {
            id: category.id,
            name: category.name,
          }
        : undefined,
      created_at: stock.created_at,
      updated_at: stock.updated_at,
    };
  }
}
