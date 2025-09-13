# DeeDee Trading Backend

A scalable, production-ready trading platform backend built with NestJS, TypeScript, PostgreSQL, and TypeORM.

## 📁 Project Structure

```
src/
├── common/                     # Shared utilities and interfaces
│   ├── decorators/            # Custom decorators (auth, permissions)
│   ├── enums/                 # Application enums (status, types)
│   ├── filters/               # Exception filters
│   ├── guards/                # Authentication & authorization guards
│   ├── interceptors/          # Audit logging, response transformation
│   └── interfaces/            # Common TypeScript interfaces
├── config/                    # Configuration files
│   ├── database.config.ts     # TypeORM configuration
│   └── jwt.config.ts          # JWT configuration
├── database/                  # Database related files
│   ├── migrations/            # TypeORM migrations
│   └── seeds/                 # Database seed files
├── modules/                   # Feature modules
│   ├── auth/                  # Authentication & authorization
│   │   ├── dto/               # Auth DTOs
│   │   ├── guards/            # JWT & permission guards
│   │   ├── strategies/        # Passport strategies
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/                 # User management (admin users)
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── roles/                 # Role-based access control
│   │   ├── dto/
│   │   ├── entities/
│   │   └── ...
│   ├── permissions/           # Permission management
│   ├── customers/             # Customer management
│   ├── wallets/               # Customer wallet management
│   ├── stocks/                # Stock management & trading
│   │   ├── dto/
│   │   │   └── stock.dto.ts   # BuyStockDto, SellStockDto, etc.
│   │   ├── entities/
│   │   │   └── stock.entity.ts
│   │   ├── stocks.controller.ts # REST endpoints
│   │   ├── stocks.service.ts    # Business logic
│   │   └── stocks.module.ts
│   ├── stock-categories/      # Stock categorization
│   ├── stock-transactions/    # Transaction history
│   ├── customer-stocks/       # Customer stock holdings
│   ├── transfer-history/      # Wallet transfer operations
│   ├── invest-types/          # Investment types
│   ├── bounds/                # Investment bounds
│   ├── audit-logs/            # System audit logging
│   └── interactive-brokers/   # IB API integration
│       ├── dto/
│       ├── interfaces/
│       │   └── ib.interface.ts
│       ├── services/
│       │   └── interactive-brokers.service.ts
│       └── interactive-brokers.module.ts
├── app.module.ts              # Root application module
└── main.ts                    # Application entry point

test/                          # End-to-end tests
├── stocks.e2e-spec.ts        # Stock trading E2E tests
└── app.e2e-spec.ts           # Application E2E tests
```

## 🚀 Features

### ✅ Implemented

- **Modular Architecture**: Clean separation of concerns with feature modules
- **Type Safety**: Strict TypeScript with no `any` usage
- **Database Relations**: Complete TypeORM entity relationships matching your schema
- **Authentication & Authorization**: JWT-based auth with RBAC for users and customers
- **Stock Trading**: Buy/sell stocks with wallet integration
- **Audit Logging**: Comprehensive audit trail for all operations
- **Validation**: Class-validator DTOs with proper transformation
- **API Documentation**: RESTful endpoints with proper HTTP methods
- **Interactive Brokers Integration**: Ready-to-use interfaces and service structure
- **Testing**: Unit tests and E2E test examples

### 🔄 Ready for Extension

- **Real-time Data**: WebSocket integration for live stock prices
- **Market Data Sync**: Automated price updates from Interactive Brokers
- **Advanced Trading**: Order types, stop-loss, limit orders
- **Portfolio Management**: Advanced analytics and reporting
- **Multi-tenant**: Support for multiple brokerages

## 🗄️ Database Schema Support

All entities match your database schema:

- **Users & Roles**: Admin user management with RBAC
- **Customers**: Trading customer management
- **Stocks & Categories**: Stock catalog with categorization
- **Wallets**: Customer balance management
- **Transactions**: Complete trading history
- **Audit Logs**: System activity tracking
- **Investment Types & Bounds**: Investment product configuration

## 🔐 Security Features

- **JWT Authentication**: Separate auth for admin users and customers
- **RBAC**: Role-based permissions with decorators
- **Input Validation**: Comprehensive DTO validation
- **Audit Logging**: All critical operations logged
- **Environment Configuration**: Secure config management

## 📊 Key Endpoints

### Authentication
- `POST /auth/login` - Admin user login
- `POST /auth/customer/login` - Customer login

### Stock Management (Admin)
- `GET /stocks` - List stocks with pagination
- `POST /stocks` - Create new stock (requires permission)
- `GET /stocks/:id` - Get stock details
- `PATCH /stocks/:id` - Update stock (requires permission)
- `DELETE /stocks/:id` - Delete stock (requires permission)

### Trading (Customer)
- `POST /stocks/buy` - Buy stock shares
- `POST /stocks/sell` - Sell stock shares

### Future Endpoints
- `GET /customers/portfolio` - Customer portfolio
- `GET /transfer-history` - Wallet operations
- `GET /audit-logs` - System audit trail (admin)

## 🧪 Testing Strategy

### Unit Tests
- Service layer testing with mocked repositories
- Business logic validation
- Error handling scenarios
- Example: `stocks.service.spec.ts`

### E2E Tests
- Complete API workflow testing
- Authentication flow
- Stock trading operations
- Database integration
- Example: `stocks.e2e-spec.ts`

### Test Coverage Areas
- Authentication & authorization
- Stock CRUD operations
- Buy/sell stock transactions
- Wallet balance updates
- Input validation
- Error scenarios

## 🔌 Interactive Brokers Integration

### Ready-to-Use Structure
```typescript
// Connection management
await ibService.connect();

// Market data
const marketData = await ibService.getMarketData(stock);

// Order placement
const orderId = await ibService.placeOrder(stock, order);

// Portfolio sync
const positions = await ibService.getPositions(accountId);
```

### Integration Points
1. **Real-time Prices**: Sync stock prices from IB to local database
2. **Order Execution**: Route customer orders through IB API
3. **Portfolio Sync**: Keep customer positions in sync
4. **Account Management**: Link IB accounts with customers

## 🛠️ Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL
   createdb trading_db
   ```

4. **Run Application**
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm run start:prod
   ```

5. **Run Tests**
   ```bash
   # Unit tests
   npm run test
   
   # E2E tests
   npm run test:e2e
   
   # Test coverage
   npm run test:cov
   ```

## 📚 API Usage Examples

### Admin Login
```bash
curl -X POST http://localhost:3000/auth/login 
  -H "Content-Type: application/json" 
  -d '{"username": "admin", "password": "password123"}'
```

### Customer Stock Purchase
```bash
curl -X POST http://localhost:3000/stocks/buy 
  -H "Authorization: Bearer <customer_token>" 
  -H "Content-Type: application/json" 
  -d '{
    "stock_id": "uuid",
    "quantity": 10,
    "buy_price": 150.00
  }'
```

### List Stocks
```bash
curl -X GET http://localhost:3000/stocks?page=1&limit=10 
  -H "Authorization: Bearer <token>"
```

## 🚀 Production Readiness

### Implemented Best Practices
- **Clean Architecture**: Modular, maintainable code structure
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive error management
- **Validation**: Input validation and transformation
- **Security**: Authentication, authorization, and audit logging
- **Configuration**: Environment-based configuration
- **Testing**: Unit and integration tests

### Ready for Production
- **Environment Variables**: Secure configuration management
- **Database Migrations**: Version-controlled schema changes
- **Logging**: Structured logging with audit trails
- **Performance**: Optimized queries and relationships
- **Scalability**: Modular architecture for easy scaling

## 🔮 Next Steps for Interactive Brokers Integration

1. **Install IB API Library**
   ```bash
   npm install ib
   ```

2. **Replace Mock Implementation**
   - Update `InteractiveBrokersService` with real IB API calls
   - Implement connection management
   - Add real-time data subscriptions

3. **Add Market Data Sync**
   - Schedule periodic price updates
   - WebSocket integration for real-time updates
   - Handle market hours and data availability

4. **Production Deployment**
   - Configure IB Gateway/TWS connection
   - Set up monitoring and alerting
   - Implement failover and reconnection logic
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ yarn install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
