# Pagination Utility - Reusable Pagination Logic

## 📋 **Overview**

The `PaginationUtil` class provides reusable pagination logic that can be used across all services and controllers in the application. This eliminates code duplication and ensures consistent pagination behavior.

## 🔧 **Utility Methods**

### **1. calculatePagination()**
Calculates pagination parameters with validation.

```typescript
const { page, limit, skip } = PaginationUtil.calculatePagination({
  page: options.page,
  limit: options.limit,
  defaultLimit: 20,
  maxLimit: 100,
});
```

**Returns**: `{ page: number, limit: number, skip: number }`

### **2. paginateArray()**
Applies pagination to an in-memory array (for filtered results).

```typescript
const result = PaginationUtil.paginateArray(dataArray, {
  page: 1,
  limit: 20,
  defaultLimit: 20,
  maxLimit: 100,
});
```

**Returns**: `PaginatedResult<T>`

### **3. createPaginatedResult()**
Creates pagination result from database query results.

```typescript
const [data, total] = await repository.findAndCount({ take: limit, skip });
const result = PaginationUtil.createPaginatedResult(data, total, {
  page,
  limit,
});
```

**Returns**: `PaginatedResult<T>`

### **4. getPaginationMeta()**
Gets pagination metadata only (useful for response headers).

```typescript
const meta = PaginationUtil.getPaginationMeta(totalCount, {
  page: 1,
  limit: 20,
});
```

**Returns**: `{ total, page, limit, totalPages }`

## 🏗️ **Implementation Examples**

### **Database Pagination (Most Common)**
```typescript
async findAllCustomers(options: PaginationOptions) {
  const { page, limit, skip } = PaginationUtil.calculatePagination({
    page: options.page,
    limit: options.limit,
    defaultLimit: 20,
    maxLimit: 100,
  });

  const [data, total] = await this.customerRepo.findAndCount({
    take: limit,
    skip,
    order: { created_at: 'DESC' },
  });

  return PaginationUtil.createPaginatedResult(data, total, {
    page,
    limit,
  });
}
```

### **In-Memory Pagination (For Filtered Data)**
```typescript
async getPendingApplications(options: PaginationOptions) {
  // Get all data first
  const allServices = await this.serviceRepo.find({
    where: { status: 'pending' },
    relations: ['customer'],
  });

  // Apply business logic filtering
  const filteredServices = allServices.filter(service => {
    // Complex filtering logic that can't be done in SQL
    return hasValidPayment(service) && meetsBusinessRules(service);
  });

  // Apply pagination to filtered results
  return PaginationUtil.paginateArray(filteredServices, {
    page: options.page,
    limit: options.limit,
    defaultLimit: 20,
    maxLimit: 100,
  });
}
```

### **Controller Usage**
```typescript
@Get('list')
@ApiQuery({ name: 'page', required: false, type: Number })
@ApiQuery({ name: 'limit', required: false, type: Number })
async list(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const result = await this.service.findAll({
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });

  return handleSuccessOne({
    data: result,
    message: 'Data retrieved successfully',
  });
}
```

## 📊 **Response Format**

All paginated responses follow this consistent structure:

```typescript
interface PaginatedResult<T> {
  data: T[];           // Array of items for current page
  total: number;       // Total count across all pages
  page: number;        // Current page number (1-based)
  limit: number;       // Items per page
  totalPages: number;  // Total number of pages
}
```

## ✅ **Benefits**

### **1. Code Reusability**
- **Single Source of Truth**: All pagination logic in one place
- **Consistent Behavior**: Same pagination rules across all endpoints
- **Easy Maintenance**: Updates to pagination logic affect entire app

### **2. Type Safety**
- **Generic Support**: Works with any data type `T`
- **Interface Consistency**: Same return structure everywhere
- **Compile-time Validation**: Catches pagination errors early

### **3. Flexibility**
- **Database Pagination**: For large datasets with SQL queries
- **In-memory Pagination**: For complex filtered results
- **Custom Limits**: Per-endpoint default and maximum limits
- **Metadata Only**: When you only need pagination info

### **4. Performance**
- **Optimized Queries**: Proper `skip` and `take` usage
- **Memory Efficient**: Only loads requested page data
- **Configurable Limits**: Prevents excessive data loading

## 🔄 **Migration Guide**

### **Before (Duplicated Logic)**:
```typescript
// In Service A
const page = options.page && options.page > 0 ? options.page : 1;
const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 20;
const skip = (page - 1) * limit;
const totalPages = Math.ceil(total / limit) || 1;

// In Service B (same logic repeated)
const page = query.page && query.page > 0 ? query.page : 1;
const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 10;
// ... duplicate logic
```

### **After (Reusable Utility)**:
```typescript
// In Service A
const { page, limit, skip } = PaginationUtil.calculatePagination({
  page: options.page,
  limit: options.limit,
  defaultLimit: 20,
  maxLimit: 100,
});

// In Service B
const { page, limit, skip } = PaginationUtil.calculatePagination({
  page: query.page,
  limit: query.limit,
  defaultLimit: 10,
  maxLimit: 50,
});
```

## 🎯 **Usage in Current Application**

The utility is now used in:

1. **CustomersService.findAll()** - Database pagination for customer listing
2. **CustomersService.listKyc()** - Database pagination for KYC records  
3. **CustomersService.getPendingPremiumMemberships()** - In-memory pagination for filtered results

This pattern should be applied to all future pagination implementations to maintain consistency and reduce code duplication.

## 📈 **Future Enhancements**

Potential improvements to the utility:

1. **Cursor-based Pagination**: For real-time data feeds
2. **Search Integration**: Combined pagination + search utilities
3. **Cache Support**: Pagination with Redis caching
4. **Sort Integration**: Combined pagination + sorting utilities