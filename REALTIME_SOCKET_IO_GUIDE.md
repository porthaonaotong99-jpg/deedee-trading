# Real-Time Socket.IO Notification System - Complete Guide

## ✅ Implementation Status

Your notification system **NOW HAS FULL REAL-TIME SUPPORT** with Socket.IO! 

All controllers have been updated to:
1. ✅ Create notifications in the database using `await`
2. ✅ Emit real-time notifications via Socket.IO gateway
3. ✅ Support both admin and customer recipients

---

## How Real-Time Notifications Work

### Architecture Flow

```
[Customer Action] 
    ↓
[API Endpoint] 
    ↓
[Create Notification in DB] ← await notificationsService.createNotification()
    ↓
[Emit via Socket.IO] ← notificationsGateway.emitNotification()
    ↓
[Real-time Delivery to Connected Clients]
```

### Example: Customer Applies for Premium Membership

1. **Customer** calls `POST /customers/services/premium-membership/apply`
2. **Backend** saves notification to database
3. **Backend** emits Socket.IO event to `admin` room
4. **Admin** (if connected) receives notification **instantly**
5. **Admin** sees notification in UI without refreshing

---

## Testing Real-Time Notifications

### Step 1: Start the Backend

```bash
cd phajaoinvest-backend
npm run start:dev
```

Backend will be available at `http://localhost:3000`

### Step 2: Connect Socket.IO Client

#### Option A: Browser Console Test

Open your browser's developer console and run:

```javascript
// Load Socket.IO client (if not already loaded)
const script = document.createElement('script');
script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
document.head.appendChild(script);

// Wait 2 seconds for script to load, then connect
setTimeout(() => {
  // Connect to notifications namespace
  const socket = io('http://localhost:3000/notifications', {
    transports: ['websocket'],
  });

  // Handle connection
  socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO:', socket.id);
    
    // Subscribe as admin
    socket.emit('subscribe', { 
      userId: 'admin', 
      type: 'admin' 
    });
  });

  // Listen for new notifications
  socket.on('new-notification', (notification) => {
    console.log('🔔 NEW NOTIFICATION:', notification);
    console.log('Title:', notification.title);
    console.log('Message:', notification.message);
  });

  // Listen for initial notifications
  socket.on('initial-notifications', (notifications) => {
    console.log('📬 Initial notifications:', notifications.length);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('❌ Disconnected from Socket.IO');
  });

  // Store socket globally for testing
  window.testSocket = socket;
}, 2000);
```

#### Option B: Node.js Test Client

Create `test-socket-client.js`:

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/notifications', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
  
  // Subscribe as admin
  socket.emit('subscribe', {
    userId: 'admin',
    type: 'admin',
  });
});

socket.on('initial-notifications', (notifications) => {
  console.log(`📬 Received ${notifications.length} existing notifications`);
  notifications.forEach((n, i) => {
    console.log(`${i + 1}. [${n.isRead ? '✓' : '○'}] ${n.title}`);
  });
});

socket.on('new-notification', (notification) => {
  console.log('\n🔔 NEW NOTIFICATION RECEIVED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Category:', notification.category);
  console.log('Action:', notification.action);
  console.log('Title:', notification.title);
  console.log('Message:', notification.message);
  console.log('Time:', new Date(notification.createdAt).toLocaleString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

console.log('🔌 Connecting to Socket.IO server...');
```

Run:
```bash
npm install socket.io-client
node test-socket-client.js
```

### Step 3: Trigger a Notification

In another terminal, make an API call that creates a notification:

```bash
# Example: Customer applies for premium membership
curl -X POST http://localhost:3000/customers/services/premium-membership/apply \
  -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "your-package-uuid",
    "payment_slip": {
      "payment_slip_url": "https://example.com/slip.jpg",
      "payment_amount": 299.99,
      "payment_reference": "TEST123"
    }
  }'
```

**Expected Result**: Your Socket.IO client immediately logs the new notification!

---

## All Real-Time Notification Scenarios

### 1. Premium Membership Application
**Trigger**: Customer applies for premium membership  
**Recipient**: Admin  
**Test**:
```bash
POST /customers/services/premium-membership/apply
```

### 2. Stock Account Application
**Trigger**: Customer applies for international stock account  
**Recipient**: Admin  
**Test**:
```bash
POST /customers/services/apply
Body: { "service_type": "international_stock_account", ... }
```

### 3. Guaranteed Returns Application
**Trigger**: Customer applies for guaranteed returns  
**Recipient**: Admin  
**Test**:
```bash
POST /customers/services/apply
Body: { "service_type": "guaranteed_returns", ... }
```

### 4. Top-Up Request
**Trigger**: Customer tops up their account  
**Recipient**: Admin  
**Test**:
```bash
POST /customers/services/:serviceId/topup
```

### 5. Service Approval
**Trigger**: Admin approves service application  
**Recipient**: Customer  
**Test**:
```bash
POST /customers/services/:serviceId/approve
```
**Note**: Subscribe as customer to see this:
```javascript
socket.emit('subscribe', { 
  userId: 'customer-uuid', 
  type: 'customer' 
});
```

### 6. Service Rejection
**Trigger**: Admin rejects service application  
**Recipient**: Customer  
**Test**:
```bash
POST /customers/services/:serviceId/reject
```

### 7. Stock Pick Payment
**Trigger**: Customer submits payment slip for stock pick  
**Recipient**: Admin  
**Test**:
```bash
POST /stock-picks/customer-picks/:id/payment-slip
```

### 8. Stock Pick Approval/Rejection
**Trigger**: Admin approves/rejects stock pick  
**Recipient**: Customer  
**Test**:
```bash
POST /stock-picks/customer-picks/:id/approve
POST /stock-picks/customer-picks/:id/reject
```

### 9. Transfer Approval/Rejection
**Trigger**: Admin approves/rejects transfer  
**Recipient**: Customer  
**Test**:
```bash
PUT /transfer-history/admin/:id/approve
PUT /transfer-history/admin/:id/reject
```

### 10. Investment Request
**Trigger**: Customer creates investment request  
**Recipient**: Admin  
**Test**:
```bash
POST /investment-info/request
```

### 11. Investment Return Request
**Trigger**: Customer requests investment return  
**Recipient**: Admin  
**Test**:
```bash
POST /investment-info/return
```

---

## Socket.IO Events Reference

### Client → Server Events

#### `subscribe`
Subscribe to receive notifications
```javascript
socket.emit('subscribe', {
  userId: 'admin',  // or customer UUID
  type: 'admin'     // or 'customer'
});
```

#### `unsubscribe`
Stop receiving notifications
```javascript
socket.emit('unsubscribe');
```

#### `mark-as-read`
Mark a notification as read
```javascript
socket.emit('mark-as-read', {
  notificationId: 'notification-uuid'
});
```

#### `mark-all-as-read`
Mark all notifications as read
```javascript
socket.emit('mark-all-as-read', {});
```

#### `get-notification-count`
Get notification counts
```javascript
socket.emit('get-notification-count');
```

### Server → Client Events

#### `initial-notifications`
Sent after subscription with existing notifications
```javascript
socket.on('initial-notifications', (notifications) => {
  // Array of NotificationResponse objects
});
```

#### `new-notification`
Sent when a new notification is created
```javascript
socket.on('new-notification', (notification) => {
  // NotificationResponse object
  // {
  //   id: 'uuid',
  //   category: 'premium_membership',
  //   action: 'applied',
  //   title: 'New Premium Membership Application',
  //   message: 'Customer john_doe applied...',
  //   isRead: false,
  //   createdAt: '2025-12-12T...',
  //   metadata: { ... }
  // }
});
```

#### `notification-read`
Sent when a notification is marked as read
```javascript
socket.on('notification-read', (data) => {
  // { notificationId: 'uuid' }
});
```

#### `all-notifications-read`
Sent when all notifications are marked as read
```javascript
socket.on('all-notifications-read', () => {
  // Update UI to show all as read
});
```

---

## Frontend Integration Example

### React Hook

```typescript
// hooks/use-notifications.ts
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export function useNotifications(userId: string, type: 'admin' | 'customer') {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const newSocket = io('http://localhost:3000/notifications', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to notifications');
      newSocket.emit('subscribe', { userId, type });
    });

    newSocket.on('initial-notifications', (data) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    });

    newSocket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Optional: Show toast notification
      toast.info(notification.title, {
        description: notification.message,
      });
    });

    newSocket.on('notification-read', ({ notificationId }) => {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, type]);

  const markAsRead = (notificationId: string) => {
    socket?.emit('mark-as-read', { notificationId });
  };

  const markAllAsRead = () => {
    socket?.emit('mark-all-as-read', {});
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected: socket?.connected || false,
  };
}
```

### Use in Component

```tsx
// components/NotificationBell.tsx
import { useNotifications } from '@/hooks/use-notifications';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications(
    'admin',  // or get from user context
    'admin'
  );

  return (
    <Popover>
      <PopoverTrigger>
        <button className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent>
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`p-3 rounded cursor-pointer ${
                notification.isRead ? 'bg-gray-50' : 'bg-blue-50'
              }`}
            >
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Troubleshooting

### Issue: Not receiving notifications

**Check:**
1. Backend is running (`npm run start:dev`)
2. Socket.IO client is connected (`socket.connected === true`)
3. Subscribed with correct `userId` and `type`
4. Check backend logs for "Emitting notification to room..."

### Issue: CORS errors

**Fix in `notifications.gateway.ts`:**
```typescript
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
```

### Issue: Notifications not persisting

**Check:**
1. Database migration ran successfully
2. Check PostgreSQL: `SELECT * FROM notifications;`
3. Service is using `await` for `createNotification()`

### Issue: Multiple duplicate notifications

**Fix:** Ensure you're not subscribing multiple times. Disconnect old socket before creating new one.

---

## Performance Considerations

### Connection Limits
- Each browser tab = 1 Socket.IO connection
- Server can handle thousands of concurrent connections
- Consider scaling with Redis adapter for multiple servers

### Memory Usage
- In-memory: Tracks connected clients in Map
- Database: Stores all notifications permanently
- Recommend: Archive old notifications after 30 days

### Network Traffic
- Real-time notifications: ~1-5 KB per notification
- Initial load: Depends on notification count
- WebSocket: Persistent connection (efficient)

---

## Production Checklist

- [ ] Update CORS origins to your production domain
- [ ] Use environment variables for Socket.IO URL
- [ ] Add authentication to Socket.IO connections
- [ ] Set up database indexes (already done in migration)
- [ ] Configure Redis for multi-server deployments
- [ ] Add rate limiting for notification creation
- [ ] Set up monitoring for Socket.IO connections
- [ ] Test with high load (100+ concurrent users)
- [ ] Add notification retention policy
- [ ] Set up database backups

---

## Summary

**Your notification system is NOW FULLY REAL-TIME! 🎉**

✅ Database persistence (PostgreSQL)  
✅ Real-time delivery (Socket.IO)  
✅ Room-based isolation (admin/customer)  
✅ All 11 notification scenarios implemented  
✅ Type-safe throughout  
✅ Production-ready architecture  

**Next Steps:**
1. Run the database migration
2. Test with the Socket.IO client examples above
3. Integrate into your frontend with the React hook
4. Deploy and enjoy real-time notifications!
