# Response Utility Guide - Consistent API Response Handling

## 📋 **Overview**

The response utility provides standardized response formats for all API endpoints, ensuring consistent structure across the entire application.

## 🔧 **Response Types**

### **1. Single Resource Response** (`handleSuccessOne`)
For endpoints returning a single item or simple data.

```typescript
import { handleSuccessOne } from '../../common/utils/response.util';

return handleSuccessOne({
  data: customerData,
  message: 'Customer retrieved successfully',
});
```

**Response Structure**:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "Customer retrieved successfully",
  "data": { /* single object or any data */ },
  "error": null,
  "status_code": 200
}
```

### **2. Multiple Resources Response** (`handleSuccessMany`)
For endpoints returning arrays without pagination metadata.

```typescript
import { handleSuccessMany } from '../../common/utils/response.util';

return handleSuccessMany({
  data: customersArray,
  total: customersArray.length,
  message: 'Customers retrieved successfully',
});
```

**Response Structure**:
```json
{
  "is_error": false,
  "code": "SUCCESS", 
  "message": "Customers retrieved successfully",
  "data": [ /* array of items */ ],
  "total": 25,
  "error": null,
  "status_code": 200
}
```

### **3. Paginated Response** (`handleSuccessPaginated`) ⭐ **NEW**
For endpoints returning paginated data with full pagination metadata.

```typescript
import { handleSuccessPaginated } from '../../common/utils/response.util';

const result = await service.getPaginatedData(paginationOptions);

return handleSuccessPaginated({
  data: result.data,
  total: result.total,
  page: result.page,
  limit: result.limit,
  totalPages: result.totalPages,
  message: 'Data retrieved successfully',
});
```

**Response Structure**:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "Data retrieved successfully", 
  "data": [ /* array of items for current page */ ],
  "total": 150,
  "page": 2,
  "limit": 20,
  "totalPages": 8,
  "error": null,
  "status_code": 200
}
```

## 🎯 **When to Use Each Response Type**

### **Use `handleSuccessOne` for**:
- Single resource endpoints: `GET /customers/:id`
- Creation responses: `POST /customers`
- Update responses: `PATCH /customers/:id`
- Action confirmations: `POST /payments/:id/confirm`
- Status checks: `GET /health`

### **Use `handleSuccessMany` for**:
- Simple list endpoints without pagination
- Small datasets that don't need pagination
- Related data lists: `GET /customers/:id/services`
- Dropdown options: `GET /countries`

### **Use `handleSuccessPaginated` for**:
- Large dataset listings: `GET /customers` (with pagination)
- Admin list views: `GET /admin/kyc` (with pagination)
- Search results: `GET /search/customers` (with pagination)
- **Premium membership pending**: `GET /admin/premium-membership/pending`

## 🔄 **Migration Example**

### **Before (Inconsistent)**:
```typescript
// Some endpoints returned this:
return { success: true, result: data };

// Others returned this:
return { status: 'ok', payload: data, count: total };

// Pagination was handled differently:
return { 
  items: data, 
  pagination: { page, limit, total, pages: totalPages } 
};
```

### **After (Consistent)**:
```typescript
// Single resource
return handleSuccessOne({ 
  data: customer, 
  message: 'Customer retrieved' 
});

// Multiple resources  
return handleSuccessMany({ 
  data: customers, 
  total: customers.length, 
  message: 'Customers listed' 
});

// Paginated data
return handleSuccessPaginated({
  data: result.data,
  total: result.total,
  page: result.page,
  limit: result.limit, 
  totalPages: result.totalPages,
  message: 'Paginated customers retrieved'
});
```

## 📊 **Real-world Implementation**

### **Premium Membership Pending Endpoint**:
```typescript
async getPendingPremiumMemberships(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const result = await this.customersService.getPendingPremiumMemberships({
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });

  return handleSuccessPaginated({
    data: result.data,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    message: 'Pending premium membership applications retrieved',
  });
}
```

**Response Example**:
```json
{
  "is_error": false,
  "code": "SUCCESS",
  "message": "Pending premium membership applications retrieved",
  "data": [
    {
      "service_id": "uuid",
      "customer_info": { "username": "john_doe", "email": "john@example.com" },
      "subscription_duration": 6,
      "subscription_fee": 549.99,
      "payment_info": { "amount": 549.99, "status": "succeeded" }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "error": null,
  "status_code": 200
}
```

## ✅ **Benefits**

### **1. Consistency**:
- Same response structure across all endpoints
- Predictable client-side parsing
- Standardized error handling

### **2. Pagination Support**:
- Complete pagination metadata
- Easy frontend pagination implementation
- Consistent pagination patterns

### **3. Type Safety**:
- TypeScript interfaces for all response types
- Compile-time validation
- IntelliSense support

### **4. Error Handling**:
- Unified error response format
- Proper HTTP status codes
- Detailed error information

## 🚀 **Best Practices**

### **1. Always Use Response Handlers**:
```typescript
// ❌ Don't return raw data
return { data: customers };

// ✅ Use appropriate response handler
return handleSuccessPaginated({ data: result.data, ... });
```

### **2. Include Meaningful Messages**:
```typescript
// ❌ Generic message
return handleSuccessOne({ data, message: 'Success' });

// ✅ Descriptive message
return handleSuccessOne({ 
  data, 
  message: 'Customer profile updated successfully' 
});
```

### **3. Match Response Type to Data Structure**:
```typescript
// ❌ Wrong handler for paginated data
return handleSuccessOne({ data: paginatedResult });

// ✅ Correct handler for paginated data
return handleSuccessPaginated({ 
  data: paginatedResult.data,
  total: paginatedResult.total,
  page: paginatedResult.page,
  limit: paginatedResult.limit,
  totalPages: paginatedResult.totalPages,
  message: 'Data retrieved'
});
```

This standardized approach ensures that all API responses follow the same pattern, making it easier for frontend developers to consume the API and for backend developers to maintain consistency.