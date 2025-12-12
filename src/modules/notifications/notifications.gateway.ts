import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationResponse } from './interfaces/notification.interface';

/**
 * NotificationsGateway - Real-time WebSocket notification delivery
 *
 * This gateway handles Socket.IO connections and delivers notifications in real-time.
 * - Admin subscribes to 'admin' room to receive all admin notifications
 * - Customers subscribe to their userId room to receive only their notifications
 * - No customer receives another customer's notifications
 */
@WebSocketGateway({
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Track connected clients: Map<socketId, userId>
  private connectedClients: Map<string, string> = new Map();

  constructor(private readonly notificationsService: NotificationsService) {
    // Register this gateway with the service to avoid circular dependency
    this.notificationsService.setGateway(this);
    this.logger.log('🚀 NotificationsGateway constructor initialized');
  }

  /**
   * Called once the WebSocket server is ready
   */
  afterInit(): void {
    this.logger.log(
      '✅ Socket.IO server initialized on namespace: /notifications',
    );
    this.logger.log(`📡 Server instance available: ${!!this.server}`);
  }

  /**
   * Handle new client connections
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnections
   */
  handleDisconnect(client: Socket): void {
    const userId = this.connectedClients.get(client.id);
    if (userId) {
      this.logger.log(`Client disconnected: ${client.id} (user: ${userId})`);
      this.connectedClients.delete(client.id);
    }
  }

  /**
   * Subscribe client to notifications
   * Clients must send their userId and type (admin/customer) to subscribe
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; type: 'admin' | 'customer' },
  ): Promise<{ success: boolean; message: string }> {
    const { userId, type } = data;

    if (!userId || !type) {
      return {
        success: false,
        message: 'userId and type are required',
      };
    }

    // Store client mapping
    this.connectedClients.set(client.id, userId);

    // Join appropriate room
    const room = type === 'admin' ? 'admin' : userId;
    await client.join(room);

    this.logger.log(
      `✅ Client ${client.id} subscribed as ${type} to room: ${room}`,
    );

    // Send existing notifications to the client
    const notifications =
      await this.notificationsService.getNotificationsByRecipient(room);

    this.logger.log(
      `📦 Sending ${notifications.length} existing notifications to client ${client.id}`,
    );

    client.emit('initial-notifications', notifications);

    const response = {
      success: true,
      message: `Subscribed to ${type} notifications in room: ${room}`,
    };

    // Also emit as a separate event for frontend logging
    client.emit('subscribe-response', response);

    return response;
  }

  /**
   * Unsubscribe from notifications
   */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() client: Socket): Promise<{
    success: boolean;
    message: string;
  }> {
    const userId = this.connectedClients.get(client.id);

    if (userId) {
      await client.leave(userId);
      await client.leave('admin');
      this.connectedClients.delete(client.id);

      this.logger.log(`Client ${client.id} unsubscribed`);

      return {
        success: true,
        message: 'Unsubscribed from notifications',
      };
    }

    return {
      success: false,
      message: 'Client not subscribed',
    };
  }

  /**
   * Mark notification as read
   */
  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ): Promise<{ success: boolean; message: string }> {
    const userId = this.connectedClients.get(client.id);

    if (!userId) {
      return {
        success: false,
        message: 'Not subscribed',
      };
    }

    const success = await this.notificationsService.markAsRead(
      userId,
      data.notificationId,
    );

    if (success) {
      // Broadcast to all connections of this user
      this.server.to(userId).emit('notification-read', {
        notificationId: data.notificationId,
      });

      return {
        success: true,
        message: 'Notification marked as read',
      };
    }

    return {
      success: false,
      message: 'Notification not found',
    };
  }

  /**
   * Mark all notifications as read
   */
  @SubscribeMessage('mark-all-as-read')
  async handleMarkAllAsRead(@ConnectedSocket() client: Socket): Promise<{
    success: boolean;
    message: string;
    count: number;
  }> {
    const userId = this.connectedClients.get(client.id);

    if (!userId) {
      return {
        success: false,
        message: 'Not subscribed',
        count: 0,
      };
    }

    const count = await this.notificationsService.markAllAsRead(userId);

    // Broadcast to all connections of this user
    this.server.to(userId).emit('all-notifications-read');

    return {
      success: true,
      message: `${count} notifications marked as read`,
      count,
    };
  }

  /**
   * PUBLIC METHOD: Emit notification to appropriate room
   * This is called by the NotificationsService after creating a notification
   */
  emitNotification(notification: NotificationResponse): void {
    if (!this.server) {
      this.logger.error('❌ Socket.IO server not initialized');
      return;
    }

    const room = notification.recipientId;

    // Safely check clients in this room
    let clientCount = 0;
    try {
      const roomClients = this.server.sockets.adapter?.rooms?.get(room);
      clientCount = roomClients ? roomClients.size : 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`⚠️  Could not check room clients: ${message}`);
    }

    this.logger.log(
      `🔔 Emitting notification to room: ${room} (${notification.category}:${notification.action}) - ${clientCount} client(s) in room`,
    );

    if (clientCount === 0) {
      this.logger.warn(`⚠️  No clients in room: ${room}`);
    }

    // Emit to the specific room (admin or customerId)
    this.server.to(room).emit('new-notification', notification);

    this.logger.log(`✅ Notification emitted successfully to room: ${room}`);
  }

  /**
   * Get notification count for a user
   */
  @SubscribeMessage('get-notification-count')
  async handleGetCount(@ConnectedSocket() client: Socket): Promise<{
    success: boolean;
    count?: { total: number; unread: number };
  }> {
    const userId = this.connectedClients.get(client.id);

    if (!userId) {
      return {
        success: false,
      };
    }

    const count = await this.notificationsService.getNotificationCount(userId);

    return {
      success: true,
      count,
    };
  }
}
