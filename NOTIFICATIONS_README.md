# Notification System Documentation

## Overview

This notification system provides **real-time, type-safe notifications** using Socket.IO without requiring any new database tables or fields. All notifications are stored in-memory and delivered instantly to the appropriate recipients (admin or specific customers).

## Key Features

✅ **Fully Type-Safe**: No `any` types - strict TypeScript implementation  
✅ **Real-Time**: Socket.IO-based instant delivery  
✅ **Zero Database Changes**: In-memory storage, no new tables  
✅ **Role-Based**: Admin receives admin notifications, customers receive only their own  
✅ **Reusable**: Single `createNotification()` function for all use cases  
✅ **Comprehensive Coverage**: All 7 notification requirements implemented  

---

## Architecture

### Components

1. **NotificationsService** (`notifications.service.ts`)
   - Core service with reusable `createNotification()` function
   - In-memory storage using Map
   - Methods: `getNotificationsByRecipient()`, `markAsRead()`, etc.

2. **NotificationsGateway** (`notifications.gateway.ts`)
   - Socket.IO WebSocket gateway
   - Handles client connections and subscriptions
   - Emits real-time notifications to appropriate rooms

3. **Notification Builders** (`utils/notification-builders.ts`)
   - Type-safe helper functions for each notification type
   - Ensures consistent message formatting
   - Examples: `buildPremiumMembershipApplicationNotification()`, etc.

4. **Types & DTOs** (`interfaces/`, `dto/`)
   - Strict TypeScript interfaces
   - Validation with class-validator
   - Enums for categories, actions, recipient types

---

## Notification Flow

### Customer → Admin Notifications

1. Customer performs action (apply, submit, topup, etc.)
2. Controller creates notification using builder helper
3. `NotificationsService.createNotification()` stores it
4. `NotificationsGateway.emitNotification()` broadcasts to 'admin' room
5. All connected admin clients receive notification instantly

### Admin → Customer Notifications

1. Admin approves/rejects application
2. Controller creates notification using builder helper
3. `NotificationsService.createNotification()` stores it
4. `NotificationsGateway.emitNotification()` broadcasts to customer's userId room
5. Customer receives notification instantly (only that customer)

---

## Implemented Notifications

### 1. Premium Membership Application

**Route**: `POST /customers/services/premium-membership/apply`  
**Notification**: Customer → Admin  
**Trigger**: Customer applies for premium membership  
**Builder**: `buildPremiumMembershipApplicationNotification()`

**Approval Route**: `POST /customers/services/admin/payments/:paymentId/approve`  
**Notification**: Admin → Customer  
**Builder**: `buildPremiumMembershipApprovalNotification()`

### 2. International Stock Account

**Route**: `POST /customers/services/apply` (with `service_type: INTERNATIONAL_STOCK_ACCOUNT`)  
**Notification**: Customer → Admin  
**Builder**: `buildStockAccountApplicationNotification()`

**Approval Route**: `POST /customers/services/:serviceId/approve`  
**Notification**: Admin → Customer  
**Builder**: `buildStockAccountApprovalNotification()`

**Rejection Route**: `POST /customers/services/:serviceId/reject`  
**Notification**: Admin → Customer  
**Builder**: `buildStockAccountApprovalNotification(approved: false)`

### 3. Guaranteed Returns

**Route**: `POST /customers/services/apply` (with `service_type: GUARANTEED_RETURNS`)  
**Notification**: Customer → Admin  
**Builder**: `buildGuaranteedReturnsApplicationNotification()`

**Approval Route**: `POST /customers/services/:serviceId/approve`  
**Notification**: Admin → Customer  
**Builder**: `buildGuaranteedReturnsApprovalNotification()`

**Rejection Route**: `POST /customers/services/:serviceId/reject`  
**Notification**: Admin → Customer  
**Builder**: `buildGuaranteedReturnsApprovalNotification(approved: false)`

### 4. Stock Pick Payment Slip

**Route**: `POST /stock-picks/selections/:id/payment-slip`  
**Notification**: Customer → Admin  
**Builder**: `buildStockPickPaymentNotification()`

**Approval Route**: `POST /admin/stock-picks/customer-picks/:id/approve`  
**Notification**: Admin → Customer  
**Builder**: `buildStockPickApprovalNotification()`

**Rejection Route**: `POST /admin/stock-picks/customer-picks/:id/reject`  
**Notification**: Admin → Customer  
**Builder**: `buildStockPickApprovalNotification(approved: false)`

### 5. Account Top-Up

**Route**: `POST /customers/services/:serviceId/topup`  
**Notification**: Customer → Admin  
**Builder**: `buildTopUpNotification()`

**Approval Route**: `PUT /admin/transfer-history/:id/approve`  
**Notification**: Admin → Customer  
**Builder**: `buildTopUpApprovalNotification()`

**Rejection Route**: `PUT /admin/transfer-history/:id/reject`  
**Notification**: Admin → Customer  
**Builder**: `buildTopUpApprovalNotification(approved: false)`

### 6. Investment Request

**Route**: `POST /investment-requests`  
**Notification**: Customer → Admin  
**Builder**: `buildInvestmentRequestNotification()`

**Approval Route**: `PUT /investment-requests/admin/:id/approve`  
**Notification**: Admin → Customer (TODO - needs customer fetch)  

**Rejection Route**: `PUT /investment-requests/admin/:id/reject`  
**Notification**: Admin → Customer (TODO - needs customer fetch)

### 7. Investment Return Request

**Route**: `POST /investment-requests/return-request`  
**Notification**: Customer → Admin  
**Builder**: `buildInvestmentReturnNotification()`

**Approval Route**: `PUT /investment-requests/admin/returns/:id/approve`  
**Notification**: Admin → Customer (TODO - needs customer fetch)

**Rejection Route**: `PUT /investment-requests/admin/returns/:id/reject`  
**Notification**: Admin → Customer (TODO - needs customer fetch)

---

## Socket.IO Client Integration

### Connection

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  withCredentials: true,
});
```

### Subscribe (Admin)

```typescript
socket.emit('subscribe', {
  userId: 'admin',
  type: 'admin'
}, (response) => {
  console.log(response); // { success: true, message: "Subscribed to admin notifications" }
});

// Receive initial notifications
socket.on('initial-notifications', (notifications) => {
  console.log('Existing notifications:', notifications);
});

// Listen for new notifications
socket.on('new-notification', (notification) => {
  console.log('New notification:', notification);
  // Show toast, update badge count, etc.
});
```

### Subscribe (Customer)

```typescript
socket.emit('subscribe', {
  userId: user.customerId, // actual customer ID
  type: 'customer'
}, (response) => {
  console.log(response);
});

socket.on('new-notification', (notification) => {
  console.log('New notification:', notification);
});
```

### Mark as Read

```typescript
socket.emit('mark-as-read', {
  notificationId: 'uuid-here'
}, (response) => {
  console.log(response); // { success: true, message: "Notification marked as read" }
});

// Listen for read confirmation
socket.on('notification-read', (data) => {
  console.log('Notification marked as read:', data.notificationId);
});
```

### Mark All as Read

```typescript
socket.emit('mark-all-as-read', {}, (response) => {
  console.log(response); // { success: true, count: 5, message: "5 notifications marked as read" }
});

socket.on('all-notifications-read', () => {
  console.log('All notifications marked as read');
});
```

### Get Notification Count

```typescript
socket.emit('get-notification-count', {}, (response) => {
  console.log(response); 
  // { success: true, count: { total: 10, unread: 3 } }
});
```

---

## REST API Endpoints

### Get My Notifications

```http
GET /notifications
Authorization: Bearer <token>
```

Response:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "Notifications retrieved",
  "data": [
    {
      "id": "uuid",
      "category": "premium_membership",
      "action": "applied",
      "recipientType": "admin",
      "recipientId": "admin",
      "title": "New Premium Membership Application",
      "message": "John Doe applied for premium membership",
      "metadata": {
        "entityId": "payment-uuid",
        "entityType": "payment",
        "customerName": "John Doe",
        "amount": 299.99
      },
      "isRead": false,
      "createdAt": "2025-12-12T10:30:00Z"
    }
  ]
}
```

### Get Unread Notifications

```http
GET /notifications/unread
Authorization: Bearer <token>
```

### Get Notification Count

```http
GET /notifications/count
Authorization: Bearer <token>
```

Response:
```json
{
  "is_error": false,
  "data": {
    "total": 15,
    "unread": 5
  }
}
```

### Mark as Read

```http
POST /notifications/:id/read
Authorization: Bearer <token>
```

### Mark All as Read

```http
POST /notifications/read-all
Authorization: Bearer <token>
```

---

## Type Definitions

### NotificationCategory

```typescript
enum NotificationCategory {
  PREMIUM_MEMBERSHIP = 'premium_membership',
  INTERNATIONAL_STOCK_ACCOUNT = 'international_stock_account',
  GUARANTEED_RETURNS = 'guaranteed_returns',
  STOCK_PICK_PAYMENT = 'stock_pick_payment',
  TOP_UP = 'top_up',
  INVESTMENT_REQUEST = 'investment_request',
  INVESTMENT_RETURN = 'investment_return',
}
```

### NotificationAction

```typescript
enum NotificationAction {
  APPLIED = 'applied',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUBMITTED = 'submitted',
}
```

### NotificationRecipientType

```typescript
enum NotificationRecipientType {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}
```

### NotificationPayload

```typescript
interface NotificationPayload {
  category: NotificationCategory;
  action: NotificationAction;
  recipientType: NotificationRecipientType;
  recipientId: string; // 'admin' or customerId
  title: string;
  message: string;
  metadata: NotificationMetadata;
  createdBy?: string;
}
```

---

## Adding New Notifications

### 1. Create Builder Function

In `utils/notification-builders.ts`:

```typescript
export function buildMyNewNotification(
  customer: CustomerInfo,
  entityId: string,
): NotificationPayload {
  return {
    category: NotificationCategory.MY_NEW_CATEGORY,
    action: NotificationAction.SUBMITTED,
    recipientType: NotificationRecipientType.ADMIN,
    recipientId: 'admin',
    title: 'New Request',
    message: `${customer.customerName || 'Customer'} submitted a new request`,
    metadata: {
      entityId,
      entityType: 'my-entity',
      customerName: customer.customerName,
    },
    createdBy: customer.customerId,
  };
}
```

### 2. Call in Controller

```typescript
// In your controller method
const notificationPayload = buildMyNewNotification(
  { customerId: user.sub, customerName: user.username },
  entityId,
);
const notification = this.notificationsService.createNotification(notificationPayload);
this.notificationsGateway.emitNotification(notification);
```

---

## Security Considerations

1. **Room Isolation**: Customers can only join their own userId room
2. **No Cross-Customer Access**: Socket.IO rooms prevent customers from receiving others' notifications
3. **Admin Access**: Admin receives notifications in 'admin' room only
4. **Token Validation**: REST endpoints use JWT guards
5. **In-Memory Storage**: Data not persisted, disappears on restart (by design)

---

## Frontend Integration Example (React/Next.js)

```typescript
// hooks/useNotifications.ts
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useNotifications(userId: string, type: 'admin' | 'customer') {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    const socket = io('http://localhost:3000/notifications');
    
    socket.emit('subscribe', { userId, type });
    
    socket.on('initial-notifications', (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    });
    
    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.info(notification.title, {
        description: notification.message,
      });
    });
    
    return () => {
      socket.disconnect();
    };
  }, [userId, type]);
  
  return { notifications, unreadCount };
}
```

---

## Testing

### Manual Testing with Socket.IO Client

```bash
npm install -g socket.io-client
```

```javascript
// test-notifications.js
const io = require('socket.io-client');

const socket = io('http://localhost:3000/notifications');

socket.on('connect', () => {
  console.log('Connected');
  
  socket.emit('subscribe', { userId: 'admin', type: 'admin' }, (response) => {
    console.log('Subscribe response:', response);
  });
});

socket.on('new-notification', (notification) => {
  console.log('📬 New notification:', notification);
});

socket.on('initial-notifications', (notifications) => {
  console.log('📦 Initial notifications:', notifications);
});
```

---

## Troubleshooting

### Notifications Not Received

1. Check Socket.IO connection: `socket.connected`
2. Verify subscription: Ensure `subscribe` event was called
3. Check room: Admin should be in 'admin' room, customer in their userId room
4. Backend logs: Look for "Emitting notification to room: ..." messages

### CORS Issues

Update `notifications.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'https://yourdomain.com'],
    credentials: true,
  },
  namespace: '/notifications',
})
```

---

## Future Enhancements

- [ ] Persistent storage (optional Redis/Database integration)
- [ ] Notification templates with i18n
- [ ] Rich notification types (with actions, images)
- [ ] Push notifications (FCM/APNS)
- [ ] Email digest for unread notifications
- [ ] Notification preferences per user
- [ ] Batch notification operations

---

## License

Internal Use Only - Phajaoinvest Trading Platform
