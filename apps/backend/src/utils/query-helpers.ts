import { Request } from 'express';
import { z } from 'zod';

/**
 * Standard pagination query parameters
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val: string) => parseInt(val, 10))
    .refine((val: number) => val > 0, { message: 'Page must be greater than 0' }),
  pageSize: z
    .string()
    .optional()
    .default('10')
    .transform((val: string) => parseInt(val, 10))
    .refine((val: number) => val > 0 && val <= 100, {
      message: 'Page size must be between 1 and 100',
    }),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Extract and validate pagination parameters from request
 */
export function getPaginationParams(req: Request): PaginationParams {
  const result = paginationSchema.safeParse(req.query);

  if (!result.success) {
    throw new Error(`Invalid pagination parameters: ${result.error.message}`);
  }

  return result.data;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);

  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Calculate skip and take for database queries
 */
export function getSkipTake(page: number, pageSize: number): { skip: number; take: number } {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Filtering helper
 */
export interface FilterParams {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'contains'
    | 'startsWith'
    | 'endsWith';
  value: unknown;
}

/**
 * Parse filter parameters from query string
 * Format: filter[field][operator]=value
 * Example: filter[name][contains]=john
 */
export function parseFilters(query: Record<string, unknown>): FilterParams[] {
  const filters: FilterParams[] = [];

  const filterValue = query['filter'];
  if (!filterValue || typeof filterValue !== 'object' || filterValue === null) {
    return filters;
  }

  const filterObj = filterValue as Record<string, unknown>;

  Object.keys(filterObj).forEach((field) => {
    // eslint-disable-next-line security/detect-object-injection -- Controlled access to filter field from query parameters
    const fieldFilters = filterObj[field];

    if (fieldFilters && typeof fieldFilters === 'object') {
      const ops = fieldFilters as Record<string, unknown>;

      Object.keys(ops).forEach((operator) => {
        if (isValidOperator(operator)) {
          filters.push({
            field,
            operator: operator as FilterParams['operator'],
            // eslint-disable-next-line security/detect-object-injection -- Controlled access to operator value from validated operators
            value: ops[operator],
          });
        }
      });
    }
  });

  return filters;
}

function isValidOperator(op: string): boolean {
  return [
    'eq',
    'ne',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'contains',
    'startsWith',
    'endsWith',
  ].includes(op);
}

/**
 * Prisma where clause type (must be any for compatibility with all Prisma models)
 * This is intentionally any because Prisma generates different where clause types per model
 */
type PrismaWhereClause = Record<string, unknown>;

/**
 * Convert filters to Prisma where clause
 * Returns a dynamic where clause compatible with any Prisma model
 */
export function filtersToPrismaWhere(filters: FilterParams[]): PrismaWhereClause {
  const where: PrismaWhereClause = {};

  filters.forEach((filter) => {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'eq':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = value;
        break;
      case 'ne':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { not: value };
        break;
      case 'gt':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { gt: value };
        break;
      case 'gte':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { gte: value };
        break;
      case 'lt':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { lt: value };
        break;
      case 'lte':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { lte: value };
        break;
      case 'in':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { in: Array.isArray(value) ? value : [value] };
        break;
      case 'contains':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { contains: value, mode: 'insensitive' };
        break;
      case 'startsWith':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { startsWith: value, mode: 'insensitive' };
        break;
      case 'endsWith':
        // eslint-disable-next-line security/detect-object-injection
        where[field] = { endsWith: value, mode: 'insensitive' };
        break;
    }
  });

  return where;
}

/**
 * Sorting helper
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Parse sort parameters from query string
 * Format: sort=field1:asc,field2:desc
 */
export function parseSorting(sortQuery?: string): SortParams[] {
  if (!sortQuery) {
    return [];
  }

  return sortQuery.split(',').map((sortItem) => {
    const [field, order = 'asc'] = sortItem.split(':');
    return {
      field: field?.trim() || '',
      order: (order.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
    };
  });
}

/**
 * Prisma orderBy clause type (must support dynamic field access for all models)
 */
type PrismaOrderByClause =
  | Record<string, 'asc' | 'desc'>
  | Array<Record<string, 'asc' | 'desc'>>
  | undefined;

/**
 * Convert sort params to Prisma orderBy clause
 * Returns a dynamic orderBy clause compatible with any Prisma model
 */
export function sortToPrismaOrderBy(sorts: SortParams[]): PrismaOrderByClause {
  if (sorts.length === 0) {
    return undefined;
  }

  if (sorts.length === 1 && sorts[0]) {
    return { [sorts[0].field]: sorts[0].order };
  }

  return sorts.map((sort) => ({ [sort.field]: sort.order }));
}
