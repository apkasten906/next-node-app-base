/**
 * Common type definitions used across the application
 */

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export enum CacheLevel {
  L1 = 'L1', // In-memory
  L2 = 'L2', // Redis
  L3 = 'L3', // CDN
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}
