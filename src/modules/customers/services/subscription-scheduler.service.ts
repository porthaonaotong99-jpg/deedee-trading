import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomersService } from '../customers.service';

@Injectable()
export class SubscriptionSchedulerService {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(private readonly customersService: CustomersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredSubscriptions() {
    this.logger.log('Checking for expired subscriptions...');

    try {
      const result = await this.customersService.checkExpiredSubscriptions();

      if (result.expired_count > 0) {
        this.logger.log(
          `Deactivated ${result.expired_count} expired subscriptions: ${result.expired_services.join(', ')}`,
        );
      } else {
        this.logger.log('No expired subscriptions found');
      }
    } catch (error) {
      this.logger.error('Failed to check expired subscriptions:', error);
    }
  }

  @Cron('0 9 * * *') // Daily at 9 AM
  sendExpirationWarnings() {
    this.logger.log('Checking for subscriptions expiring soon...');

    try {
      // This would implement logic to send warning emails to customers
      // whose subscriptions are expiring within the next 7 days
      this.logger.log('Expiration warning check completed');
    } catch (error) {
      this.logger.error('Failed to send expiration warnings:', error);
    }
  }
}
