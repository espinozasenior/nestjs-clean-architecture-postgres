import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

// Base response interface
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  timestamp?: string;
  path?: string;
  method?: string;
}

// Success response DTO
@Exclude()
export class SuccessResponseDto<T = any> implements ApiResponse<T> {
  @Expose()
  @ApiProperty({
    description: 'Human-readable message',
    example: 'Operation completed successfully',
  })
  readonly message: string;

  @Expose()
  @ApiProperty({ description: 'Response data' })
  readonly data?: T;

  @Expose()
  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  readonly timestamp?: string;

  @Expose()
  @ApiProperty({ description: 'Request path', example: '/api/v1/profile/123' })
  readonly path?: string;

  @Expose()
  @ApiProperty({ description: 'HTTP method', example: 'GET' })
  readonly method?: string;

  constructor(message: string, data?: T, meta?: any) {
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
    if (meta) {
      this.path = meta.path;
      this.method = meta.method;
    }
  }
}

// Error response DTO
@Exclude()
export class ErrorResponseDto implements ApiResponse {
  @Expose()
  @ApiProperty({
    description: 'Human-readable error message',
    example: 'User not found',
  })
  readonly message: string;

  @Expose()
  @ApiProperty({ description: 'Error details' })
  readonly error: {
    code: string;
    details?: any;
  };

  @Expose()
  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  readonly timestamp?: string;

  @Expose()
  @ApiProperty({ description: 'Request path', example: '/api/v1/profile/123' })
  readonly path?: string;

  @Expose()
  @ApiProperty({ description: 'HTTP method', example: 'GET' })
  readonly method?: string;

  constructor(message: string, code: string, details?: any, meta?: any) {
    this.message = message;
    this.error = { code, details };
    this.timestamp = new Date().toISOString();
    if (meta) {
      this.path = meta.path;
      this.method = meta.method;
    }
  }
}

// Pagination metadata
@Exclude()
export class PaginationMeta {
  @Expose()
  @ApiProperty({ description: 'Current page number', example: 1 })
  readonly page: number;

  @Expose()
  @ApiProperty({ description: 'Number of items per page', example: 10 })
  readonly limit: number;

  @Expose()
  @ApiProperty({ description: 'Total number of items', example: 100 })
  readonly total: number;

  @Expose()
  @ApiProperty({ description: 'Total number of pages', example: 10 })
  readonly totalPages: number;

  @Expose()
  @ApiProperty({ description: 'Whether there is a next page', example: true })
  readonly hasNext: boolean;

  @Expose()
  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  readonly hasPrev: boolean;
}

// Paginated response
@Exclude()
export class PaginatedResponseDto<T = any> extends SuccessResponseDto<T[]> {
  @Expose()
  @ApiProperty({ description: 'Pagination metadata' })
  readonly pagination: PaginationMeta;

  constructor(
    message: string,
    data: T[],
    pagination: PaginationMeta,
    meta?: any,
  ) {
    super(message, data, meta);
    this.pagination = pagination;
  }
}