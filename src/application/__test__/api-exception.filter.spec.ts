import { ApiExceptionFilter } from '@application/filters/api-exception.filter';
import { ResponseService } from '@application/services/response.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  type ArgumentsHost,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('ApiExceptionFilter', () => {
  let filter: ApiExceptionFilter;
  let responseService: jest.Mocked<ResponseService>;

  beforeEach(() => {
    responseService = {
      error: jest.fn((message, code, details) => ({
        message,
        error: { code, details },
      })),
      withRequest: jest.fn((payload, request) => ({
        ...payload,
        path: request.path,
        method: request.method,
      })),
    } as unknown as jest.Mocked<ResponseService>;

    filter = new ApiExceptionFilter(responseService);
  });

  function createHost(path = '/api/v1/test') {
    const json = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue({ json }),
    };
    const request = { path, method: 'POST' };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    return { host, response, json };
  }

  it('maps bad request array messages to validation error details', () => {
    const { host, response, json } = createHost();
    const exception = new BadRequestException({
      message: ['email invalid', 'name required'],
    });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(responseService.error).toHaveBeenCalledWith(
      'Validation failed',
      'VALIDATION_ERROR',
      ['email invalid', 'name required'],
    );
    expect(json).toHaveBeenCalled();
  });

  it('maps bad request string messages into single-item details array', () => {
    const { host } = createHost();
    const exception = new BadRequestException({ message: 'payload invalid' });

    filter.catch(exception, host);

    expect(responseService.error).toHaveBeenCalledWith(
      'Validation failed',
      'VALIDATION_ERROR',
      ['payload invalid'],
    );
  });

  it('maps generic bad request objects to BAD_REQUEST fallback', () => {
    const { host } = createHost();
    const exception = new BadRequestException({ code: 'X_BAD_REQUEST' });

    filter.catch(exception, host);

    expect(responseService.error).toHaveBeenCalledWith(
      'Bad request',
      'BAD_REQUEST',
      null,
    );
  });

  it('maps unprocessable entity to validation error code', () => {
    const { host, response } = createHost();
    const exception = new UnprocessableEntityException({
      message: ['field invalid'],
    });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    expect(responseService.error).toHaveBeenCalledWith(
      'field invalid',
      'VALIDATION_ERROR',
      ['field invalid'],
    );
  });

  it('maps forbidden exceptions to authorization error code', () => {
    const { host, response } = createHost();
    const exception = new ForbiddenException('Forbidden by role');

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(responseService.error).toHaveBeenCalledWith(
      'Forbidden by role',
      'AUTHORIZATION_ERROR',
      null,
    );
  });

  it('maps unauthorized/not-found/conflict/rate-limit statuses to expected codes', () => {
    const { host } = createHost();

    filter.catch(new UnauthorizedException('Unauthorized'), host);
    expect(responseService.error).toHaveBeenLastCalledWith(
      'Unauthorized',
      'AUTHENTICATION_ERROR',
      null,
    );

    filter.catch(new NotFoundException('Missing'), host);
    expect(responseService.error).toHaveBeenLastCalledWith(
      'Missing',
      'NOT_FOUND',
      null,
    );

    filter.catch(new ConflictException('Conflict'), host);
    expect(responseService.error).toHaveBeenLastCalledWith(
      'Conflict',
      'CONFLICT',
      null,
    );

    filter.catch(
      new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS),
      host,
    );
    expect(responseService.error).toHaveBeenLastCalledWith(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      null,
    );
  });

  it('maps generic Error to application error', () => {
    const { host, response } = createHost();
    filter.catch(new Error('unexpected app failure'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(responseService.error).toHaveBeenCalledWith(
      'unexpected app failure',
      'APPLICATION_ERROR',
      null,
    );
  });

  it('handles unknown non-error exceptions with internal error defaults', () => {
    const { host } = createHost();
    filter.catch('unknown' as any, host);

    expect(responseService.error).toHaveBeenCalledWith(
      'Internal server error',
      'INTERNAL_ERROR',
      null,
    );
  });
});
