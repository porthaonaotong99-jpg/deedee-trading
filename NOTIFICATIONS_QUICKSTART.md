# Notification System Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Backend (Already Done ✅)

The notification system is fully integrated and ready to use. No additional setup needed!

---

## 📱 Frontend Implementation

### Step 1: Install Socket.IO Client

```bash
# In your frontend project (phajaoinvest-admin)
npm install socket.io-client
# or
pnpm add socket.io-client
```

### Step 2: Create Notification Hook

Create `hooks/use-notifications.ts`:

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface Notification {
  id: string;
  category: string;
  action: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export function useNotifications(userId: string, type: 'admin' | 'customer') {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to Socket.IO
    const newSocket = io('http://localhost:3000/notifications', {
      transports: ['websocket'],
    });

    setSocket(newSocket);

    // Subscribe to notifications
    newSocket.on('connect', () => {
      console.log('✅ Connected to notification server');
      newSocket.emit('subscribe', { userId, type });
    });

    // Receive initial notifications
    newSocket.on('initial-notifications', (data: Notification[]) => {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    });

    // Receive new notifications
    newSocket.on('new-notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Optional: Show toast notification
      // toast.info(notification.title, { description: notification.message });
    });

    // Handle notification read
    newSocket.on('notification-read', (data: { notificationId: string }) => {
      setNotifications(prev =>
        prev.map(n =>
          n.id === data.notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Handle all read
    newSocket.on('all-notifications-read', () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, [userId, type]);

  const markAsRead = (notificationId: string) => {
    if (socket) {
      socket.emit('mark-as-read', { notificationId });
    }
  };

  const markAllAsRead = () => {
    if (socket) {
      socket.emit('mark-all-as-read', {});
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
```

### Step 3: Use in Your Layout/Dashboard

```tsx
// app/dashboard/layout.tsx
'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = 
    useNotifications(
      user.type === 'user' ? 'admin' : user.id,
      user.type === 'user' ? 'admin' : 'customer'
    );

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        {/* Notification Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1">
                  {unreadCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          
          <PopoverContent className="w-96 max-h-96 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No notifications
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-3 rounded cursor-pointer ${
                      notification.isRead
                        ? 'bg-gray-50'
                        : 'bg-blue-50 border-l-4 border-blue-500'
                    }`}
                  >
                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="text-sm text-gray-600">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </header>
      
      <main>{children}</main>
    </div>
  );
}
```

---

## 🧪 Testing

### Test 1: Admin Receives Customer Application

1. **From customer account**, make a POST request:
```bash
curl -X POST http://localhost:3000/customers/services/premium-membership/apply \
  -H "Authorization: Bearer <customer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "package-uuid",
    "payment_slip": {
      "payment_slip_url": "https://example.com/slip.jpg",
      "payment_amount": 299.99,
      "payment_reference": "TEST123"
    }
  }'
```

2. **Admin should receive** notification instantly in the browser

### Test 2: Customer Receives Approval

1. **From admin account**, approve the payment:
```bash
curl -X POST http://localhost:3000/customers/services/admin/payments/<paymentId>/approve \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "admin_notes": "Approved for testing"
  }'
```

2. **Customer should receive** notification instantly in the browser

---

## 🎨 UI Components (Optional)

### Notification Badge Component

```tsx
// components/notification-badge.tsx
export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  
  return (
    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </div>
  );
}
```

### Notification Item Component

```tsx
// components/notification-item.tsx
export function NotificationItem({ notification, onRead }) {
  const categoryIcons = {
    premium_membership: '💎',
    stock_pick_payment: '📈',
    top_up: '💰',
    investment_request: '🏦',
  };

  return (
    <div
      onClick={() => onRead(notification.id)}
      className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
    >
      <div className="notification-icon">
        {categoryIcons[notification.category] || '📬'}
      </div>
      <div className="notification-content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <span className="notification-time">
          {formatTimeAgo(notification.createdAt)}
        </span>
      </div>
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Notifications Not Appearing?

1. **Check backend is running**: `http://localhost:3000`
2. **Check Socket.IO connection**: Open browser console, look for connection logs
3. **Verify subscription**: Check if `subscribe` event was emitted
4. **Check user type**: Ensure correct `type` ('admin' or 'customer')

### CORS Issues?

Update `phajaoinvest-backend/src/modules/notifications/notifications.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
  namespace: '/notifications',
})
```

---

## 📞 Support

For issues or questions:
1. Check `NOTIFICATIONS_README.md` for detailed documentation
2. Review `NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md` for architecture overview
3. Check inline code comments in notification files

---

## ✅ Checklist

- [ ] Socket.IO client installed (`npm install socket.io-client`)
- [ ] `useNotifications` hook created
- [ ] Notification UI component added to layout
- [ ] Tested with customer application
- [ ] Tested with admin approval
- [ ] Verified real-time delivery
- [ ] Added notification badge
- [ ] Styled notification popover

---

**Ready to Go!** 🎉

Your notification system is fully functional. Just add the frontend components and start receiving real-time notifications!
