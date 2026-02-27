import { getProblemTypeFromCode } from '@application/shared/errors';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ProblemDetailException,
  ProblemDetailFilter,
} from '@sjfrhafe/nest-problem-details';
import type { Request } from 'express';

type ProblemDetailsFilterOptions = {
  includeStackTrace: boolean;
  problemTypeBaseUrl: string;
};

type ValidationErrorItem = {
  field: string;
  message: string;
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly filter: ProblemDetailFilter;

  constructor(private readonly options: ProblemDetailsFilterOptions) {
    this.filter = new ProblemDetailFilter((statusCode) => `https://httpstatuses.com/${statusCode}`);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof ProblemDetailException) {
      return this.filter.catch(exception, host);
    }

    if (exception instanceof BadRequestException) {
      const response = exception.getResponse() as any;
      const errors = this.extractValidationErrors(response);
      const detail = errors[0]?.message || 'Validation failed';
      const problem = new ProblemDetailException(HttpStatus.BAD_REQUEST, {
        type: `https://httpstatuses.com/${HttpStatus.BAD_REQUEST}`,
        title: 'Bad Request',
        status: HttpStatus.BAD_REQUEST,
        detail,
        code: response?.code || 'VALIDATION_ERROR',
        errors: errors.length > 0 ? errors : undefined,
      } as any);

      return this.filter.catch(problem, host);
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      const status = exception.getStatus();
      const code = response?.code;
      const detail = this.resolveDetail(response, exception.message);
      const problem = new ProblemDetailException(status, {
        type: this.resolveProblemType(code, status),
        title: this.resolveTitle(response, status),
        status,
        detail,
        code: typeof code === 'string' ? code : undefined,
      } as any);

      return this.filter.catch(problem, host);
    }

    const request = host.switchToHttp().getRequest<Request>();
    const problem = new ProblemDetailException(HttpStatus.INTERNAL_SERVER_ERROR, {
      type: `https://httpstatuses.com/${HttpStatus.INTERNAL_SERVER_ERROR}`,
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Internal server error',
      instance: request?.url,
      ...(this.options.includeStackTrace &&
      exception instanceof Error &&
      typeof exception.stack === 'string'
        ? { stack: exception.stack }
        : {}),
    } as any);

    return this.filter.catch(problem, host);
  }

  private resolveProblemType(code: unknown, status: number): string {
    if (typeof code === 'string') {
      return getProblemTypeFromCode(code, this.options.problemTypeBaseUrl);
    }

    return `https://httpstatuses.com/${status}`;
  }

  private resolveTitle(response: any, status: number): string {
    if (response && typeof response.error === 'string') {
      return response.error;
    }

    const statusLabel = HttpStatus[status];
    if (typeof statusLabel === 'string') {
      return statusLabel
        .split('_')
        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
        .join(' ');
    }

    return 'Error';
  }

  private resolveDetail(response: any, fallback: string): string {
    if (response && Array.isArray(response.message)) {
      return response.message[0] || fallback;
    }

    if (response && typeof response.message === 'string') {
      return response.message;
    }

    if (typeof fallback === 'string' && fallback.length > 0) {
      return fallback;
    }

    return 'An unexpected error occurred';
  }

  private extractValidationErrors(response: any): ValidationErrorItem[] {
    const errors = response?.errors;
    if (Array.isArray(errors)) {
      return errors.filter((item) => item && typeof item.message === 'string');
    }

    const messages = response?.message;
    if (!Array.isArray(messages)) {
      return [];
    }

    return messages.map((message: string) => ({
      field: this.extractFieldName(message),
      message,
    }));
  }

  private extractFieldName(message: string): string {
    const [field] = message.split(' ');
    return field || 'unknown';
  }
}
