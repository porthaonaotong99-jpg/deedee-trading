export interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
  defaultLimit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginationUtil {
  /**
   * Calculate pagination parameters with validation
   */
  static calculatePagination(options: PaginationOptions = {}): {
    page: number;
    limit: number;
    skip: number;
  } {
    const maxLimit = options.maxLimit || 100;
    const defaultLimit = options.defaultLimit || 20;

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit =
      options.limit && options.limit > 0
        ? Math.min(options.limit, maxLimit)
        : defaultLimit;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Apply pagination to an array of data (for in-memory pagination)
   */
  static paginateArray<T>(
    data: T[],
    options: PaginationOptions = {},
  ): PaginatedResult<T> {
    const { page, limit } = this.calculatePagination(options);
    const total = data.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Create pagination result from database query results
   */
  static createPaginatedResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions = {},
  ): PaginatedResult<T> {
    const { page, limit } = this.calculatePagination(options);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get pagination metadata only (useful for API responses)
   */
  static getPaginationMeta(
    total: number,
    options: PaginationOptions = {},
  ): Omit<PaginatedResult<never>, 'data'> {
    const { page, limit } = this.calculatePagination(options);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      total,
      page,
      limit,
      totalPages,
    };
  }
}
