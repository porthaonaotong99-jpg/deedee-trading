import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationPayload,
  NotificationResponse,
} from './interfaces/notification.interface';
import { Notification } from './entities/notification.entity';

/**
 * Interface for the gateway to avoid circular dependency
 */
interface INotificationsGateway {
  emitNotification(notification: NotificationResponse): void;
}

/**
 * NotificationsService - Database-backed notification management with real-time Socket.IO support
 *
 * This service provides a persistent notification system using PostgreSQL database.
 * All notifications are stored in the 'notifications' table.
 * Real-time notifications are automatically emitted via Socket.IO when created.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private gateway: INotificationsGateway | null = null; // Will be set by NotificationsGateway

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Set the gateway instance (called by NotificationsGateway during initialization)
   * This avoids circular dependency issues
   */
  setGateway(gateway: INotificationsGateway): void {
    this.gateway = gateway;
    this.logger.log('✅ Gateway instance registered with NotificationsService');
  }

  /**
   * MAIN REUSABLE FUNCTION - Creates, stores, and emits a notification via Socket.IO
   *
   * This is the central function that all routes will call to create notifications.
   * It automatically handles:
   * 1. Database persistence
   * 2. Real-time Socket.IO emission
   * 3. Error handling (wrapped in try-catch)
   *
   * @param payload - The notification payload
   * @returns The created notification or null if failed
   */
  async createNotification(
    payload: NotificationPayload,
  ): Promise<NotificationResponse | null> {
    try {
      const notification = this.notificationRepository.create({
        category: payload.category,
        action: payload.action,
        recipientType: payload.recipientType,
        recipientId: payload.recipientId,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata as unknown as Record<string, unknown>,
        isRead: false,
        createdBy: payload.createdBy,
      });

      const savedNotification =
        await this.notificationRepository.save(notification);

      const response = this.mapToResponse(savedNotification);

      this.logger.log(
        `✅ Notification created: ${savedNotification.category}:${savedNotification.action} for ${savedNotification.recipientType}:${savedNotification.recipientId}`,
      );

      // Emit real-time notification via Socket.IO (if gateway is available)
      if (this.gateway) {
        this.logger.log(
          `📡 Attempting to emit notification via Socket.IO to room: ${response.recipientId}`,
        );
        try {
          this.gateway.emitNotification(response);
          this.logger.log('✅ Socket.IO emission completed');
        } catch (emitError) {
          // Don't fail the entire operation if Socket.IO emission fails
          const errorMessage =
            emitError instanceof Error ? emitError.message : 'Unknown error';
          this.logger.error(
            `❌ Failed to emit notification via Socket.IO: ${errorMessage}`,
          );
        }
      } else {
        this.logger.warn(
          '⚠️  Gateway not available, notification not emitted via Socket.IO',
        );
      }

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.warn(
        `Failed to create notification: ${errorMessage}`,
        errorStack,
      );
      return null;
    }
  }

  /**
   * Get all notifications for a specific recipient
   */
  async getNotificationsByRecipient(
    recipientId: string,
  ): Promise<NotificationResponse[]> {
    const notifications = await this.notificationRepository.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
    });

    return notifications.map((n) => this.mapToResponse(n));
  }

  /**
   * Get unread notifications for a specific recipient
   */
  async getUnreadNotifications(
    recipientId: string,
  ): Promise<NotificationResponse[]> {
    const notifications = await this.notificationRepository.find({
      where: { recipientId, isRead: false },
      order: { createdAt: 'DESC' },
    });

    return notifications.map((n) => this.mapToResponse(n));
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(
    recipientId: string,
    notificationId: string,
  ): Promise<boolean> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId },
    });

    if (!notification) {
      return false;
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepository.save(notification);

    return true;
  }

  /**
   * Mark all notifications as read for a recipient
   */
  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { recipientId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return result.affected || 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    recipientId: string,
    notificationId: string,
  ): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      recipientId,
    });

    return (result.affected || 0) > 0;
  }

  /**
   * Clear all notifications for a recipient (useful for testing)
   */
  async clearNotifications(recipientId: string): Promise<void> {
    await this.notificationRepository.delete({ recipientId });
  }

  /**
   * Get notification count for a recipient
   */
  async getNotificationCount(recipientId: string): Promise<{
    total: number;
    unread: number;
  }> {
    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: { recipientId } }),
      this.notificationRepository.count({
        where: { recipientId, isRead: false },
      }),
    ]);

    return { total, unread };
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    return this.mapToResponse(notification);
  }

  /**
   * Map entity to response
   */
  private mapToResponse(notification: Notification): NotificationResponse {
    const metadata = notification.metadata || {};
    return {
      id: notification.id,
      category: notification.category,
      action: notification.action,
      recipientType: notification.recipientType,
      recipientId: notification.recipientId,
      title: notification.title,
      message: notification.message,
      metadata: {
        entityId: (metadata.entityId as string) || '',
        entityType: (metadata.entityType as string) || '',
        customerName: metadata.customerName as string | undefined,
        customerEmail: metadata.customerEmail as string | undefined,
        amount: metadata.amount as number | undefined,
        serviceType: metadata.serviceType as string | undefined,
        status: metadata.status as string | undefined,
        adminName: metadata.adminName as string | undefined,
        reason: metadata.reason as string | undefined,
      },
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      createdBy: notification.createdBy,
    };
  }
}
