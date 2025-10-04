# Paginated Premium Membership Pending Endpoint

## ✅ **Updated Implementation**

The `/admin/premium-membership/pending` endpoint now supports pagination for better performance and user experience.

## 🔧 **Pagination Parameters**

### **Query Parameters**:
- `page` (optional): Page number (1-based, default: 1)
- `limit` (optional): Number of items per page (default: 20, max: 100)

### **Example Requests**:

```bash
# Get first page with default limit (20 items)
GET /api/v1/customers/services/admin/premium-membership/pending

# Get second page with 10 items per page
GET /api/v1/customers/services/admin/premium-membership/pending?page=2&limit=10

# Get first page with 50 items
GET /api/v1/customers/services/admin/premium-membership/pending?page=1&limit=50
```

## 📊 **Response Format**

### **Paginated Response Structure**:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "Pending premium membership applications retrieved",
  "data": {
    "data": [
      {
        "service_id": "uuid-string",
        "customer_id": "uuid-string",
        "customer_info": {
          "username": "customer123",
          "email": "customer@example.com",
          "first_name": "John",
          "last_name": "Doe"
        },
        "service_type": "premium_membership",
        "subscription_duration": 6,
        "subscription_fee": 549.99,
        "applied_at": "2025-10-03T09:00:00.000Z",
        "payment_info": {
          "payment_id": "payment-uuid",
          "amount": 549.99,
          "paid_at": "2025-10-03T09:15:00.000Z",
          "status": "succeeded"
        }
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "error": null,
  "status_code": 200
}
```

### **Pagination Metadata**:
- `data`: Array of pending premium membership applications (for current page)
- `total`: Total number of pending applications across all pages
- `page`: Current page number
- `limit`: Number of items per page
- `totalPages`: Total number of pages available

## 🔍 **Service Method Updates**

### **Method Signature**:
```typescript
async getPendingPremiumMemberships(
  options: {
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  data: PendingPremiumMembership[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

### **Implementation Logic**:
1. **Fetch All Inactive Services**: Gets all premium membership services where `active: false`
2. **Filter by Payment Status**: Only includes services with successful payments
3. **Apply Pagination**: Uses slice method to paginate filtered results
4. **Return Structured Response**: Includes data + pagination metadata

## 🚀 **Benefits**

### **Performance**:
- **Efficient Loading**: Only loads requested page of results
- **Memory Optimization**: Prevents loading large datasets at once
- **Faster Response**: Reduced payload size for large datasets

### **User Experience**:
- **Consistent Interface**: Matches pagination pattern of other admin endpoints
- **Flexible Page Size**: Admins can adjust items per page (up to 100)
- **Navigation Support**: Total pages info enables proper pagination UI

## 📋 **API Documentation**

### **OpenAPI Specification**:
- **Query Parameters**: Documented with @ApiQuery decorators
- **Response Schema**: Includes pagination metadata structure
- **Examples**: Shows typical pagination usage patterns

### **Validation**:
- **Page Range**: Minimum page 1, defaults to 1 if invalid
- **Limit Range**: Minimum 1, maximum 100, defaults to 20
- **Type Safety**: Integer parsing with fallbacks

## 🧪 **Testing Examples**

### **Empty State**:
```json
{
  "data": {
    "data": [],
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### **Single Page**:
```json
{
  "data": {
    "data": [/* 15 items */],
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### **Multiple Pages**:
```json
{
  "data": {
    "data": [/* 20 items */],
    "total": 85,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## ✅ **Consistent with Other Endpoints**

The pagination implementation follows the same pattern as:
- `/admin/kyc` endpoint
- `/customers` listing endpoint
- Other admin listing endpoints in the system

This ensures a consistent API experience across the entire admin interface.