/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { RealTimePriceService } from '../services/real-time-price.service';

interface StockPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  source?: string;
  provider?: string;
  categoryId?: string | null;
  categoryName?: string | null;
}

interface ClientSubscription {
  userId?: string;
  symbols: Set<string>;
}
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:8080',
    ],
    credentials: true,
  },
})
export class StockPricesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StockPricesGateway.name);
  private readonly clientSubscriptions = new Map<string, ClientSubscription>();

  constructor(
    @Inject(forwardRef(() => RealTimePriceService))
    private readonly realTimePriceService: RealTimePriceService,
  ) {}

  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientSubscriptions.set(client.id, {
      symbols: new Set<string>(),
    });
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientSubscriptions.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { symbols: string[] },
    @ConnectedSocket() client: any,
  ) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (!subscription) return;

    // Validate data format
    if (!data || !Array.isArray(data.symbols)) {
      this.logger.error(
        `Invalid subscription data from client ${client.id}:`,
        data,
      );
      client.emit('error', {
        message: 'Invalid subscription format. Expected { symbols: string[] }',
      });
      return;
    }

    // Add symbols to client's subscription & ensure backend subscription with real fetch
    for (const raw of data.symbols) {
      const symbol = raw.toUpperCase();
      subscription.symbols.add(symbol);
      // Ensure service subscription triggers real fetch (with fallback)
      await this.realTimePriceService.subscribe(symbol);
    }

    // Join socket rooms for each symbol
    data.symbols.forEach((symbol) => {
      client.join(`stock:${symbol.toUpperCase()}`);
    });

    this.logger.log(
      `Client ${client.id} subscribed to: ${data.symbols.join(', ')}`,
    );

    client.emit('subscribed', {
      symbols: data.symbols.map((s) => s.toUpperCase()),
      timestamp: new Date(),
    });

    // Immediately send snapshot prices if available
    for (const raw of data.symbols) {
      const symbol = raw.toUpperCase();
      const price = this.realTimePriceService.getCurrentPrice(symbol);
      if (price) {
        client.emit('priceUpdate', {
          symbol: price.symbol,
          price: price.price,
          change: price.change,
          changePercent: price.changePercent,
          volume: price.volume,
          timestamp: new Date(),
          bidPrice: price.bidPrice,
          askPrice: price.askPrice,
          bidSize: price.bidSize,
          askSize: price.askSize,
          high: price.high,
          low: price.low,
          open: price.open,
          previousClose: price.previousClose,
          source: price.source,
          provider: price.provider,
        });
      }
    }
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { symbols: string[] },
    @ConnectedSocket() client: any,
  ) {
    const subscription = this.clientSubscriptions.get(client.id);
    if (!subscription) return;

    // Remove symbols from client's subscription
    data.symbols.forEach((symbol) => {
      subscription.symbols.delete(symbol.toUpperCase());
      client.leave(`stock:${symbol.toUpperCase()}`);
    });

    this.logger.log(
      `Client ${client.id} unsubscribed from: ${data.symbols.join(', ')}`,
    );

    client.emit('unsubscribed', {
      symbols: data.symbols,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('getSnapshot')
  handleGetSnapshot(
    @MessageBody() data: { symbol: string },
    @ConnectedSocket() client: any,
  ) {
    const symbol = data.symbol.toUpperCase();
    const price = this.realTimePriceService.getCurrentPrice(symbol);
    client.emit('snapshot', {
      symbol,
      price: price?.price ?? null,
      change: price?.change ?? null,
      changePercent: price?.changePercent ?? null,
      volume: price?.volume ?? null,
      bidPrice: price?.bidPrice ?? null,
      askPrice: price?.askPrice ?? null,
      bidSize: price?.bidSize ?? null,
      askSize: price?.askSize ?? null,
      high: price?.high ?? null,
      low: price?.low ?? null,
      open: price?.open ?? null,
      previousClose: price?.previousClose ?? null,
      timestamp: new Date(),
      source: price ? 'cache' : 'none',
    });
  }

  // Method to broadcast price updates to subscribed clients
  async broadcastPriceUpdate(priceUpdate: StockPriceUpdate) {
    // Enrich with category if not already present
    if (
      (priceUpdate.categoryId == null || priceUpdate.categoryName == null) &&
      this.realTimePriceService
    ) {
      try {
        const stock = await this.realTimePriceService.getStockWithCategory(
          priceUpdate.symbol,
        );
        if (stock) {
          priceUpdate.categoryId = stock.categoryId || null;
          priceUpdate.categoryName = stock.categoryName || null;
        }
      } catch (e) {
        this.logger.debug(
          `Category enrichment failed for ${priceUpdate.symbol}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }
    const room = `stock:${priceUpdate.symbol}`;
    this.server.to(room).emit('priceUpdate', priceUpdate);

    this.logger.debug(
      `Broadcasting price update for ${priceUpdate.symbol}: $${priceUpdate.price}`,
    );
  }

  // Method to broadcast multiple price updates
  async broadcastPriceUpdates(priceUpdates: StockPriceUpdate[]) {
    for (const update of priceUpdates) {
      await this.broadcastPriceUpdate(update);
    }
  }

  // Method to get active subscriptions for a symbol
  getActiveSubscriptions(): Map<string, ClientSubscription> {
    return this.clientSubscriptions;
  }

  // Method to get all subscribed symbols across all clients
  getAllSubscribedSymbols(): Set<string> {
    const allSymbols = new Set<string>();
    this.clientSubscriptions.forEach((subscription) => {
      subscription.symbols.forEach((symbol) => allSymbols.add(symbol));
    });
    return allSymbols;
  }
}
