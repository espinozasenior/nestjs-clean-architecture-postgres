import { AuthError, AuthErrorMessage } from '@application/shared/errors';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common';
import { ProblemDetailsFilter } from '@application/filters/problem-details.filter';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';

type MockResponse = {
  status: jest.Mock;
  header: jest.Mock;
  send: jest.Mock;
};

function createHost(url = '/api/v1/test'): {
  host: ArgumentsHost;
  response: MockResponse;
} {
  const response: MockResponse = {
    status: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  return { host, response };
}

describe('ProblemDetailsFilter', () => {
  it('maps HttpException code to enum-based type URL', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/auth/user/123');

    const exception = new NotFoundException({
      code: AuthError.USER_NOT_FOUND,
      message: AuthErrorMessage[AuthError.USER_NOT_FOUND],
    });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.header).toHaveBeenCalledWith(
      'Content-Type',
      'application/problem+json',
    );

    const body = response.send.mock.calls[0][0];
    expect(body.code).toBe(AuthError.USER_NOT_FOUND);
    expect(body.type).toBe('https://api.yourapp.com/errors/auth/user-not-found');
    expect(body.detail).toBe(AuthErrorMessage[AuthError.USER_NOT_FOUND]);
  });

  it('formats bad request validation messages into errors array', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/profile');

    const exception = new BadRequestException({
      message: ['email must be an email', 'age must be an integer'],
    });

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = response.send.mock.calls[0][0];
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.detail).toBe('email must be an email');
    expect(body.errors).toEqual([
      { field: 'email', message: 'email must be an email' },
      { field: 'age', message: 'age must be an integer' },
    ]);
  });

  it('passes through ProblemDetailException untouched', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/problem');

    const exception = new ProblemDetailException(HttpStatus.CONFLICT, {
      type: 'https://api.yourapp.com/errors/custom',
      title: 'Conflict',
      status: HttpStatus.CONFLICT,
      detail: 'Already exists',
      code: 'CUSTOM_CONFLICT',
    } as any);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    const body = response.send.mock.calls[0][0];
    expect(body.type).toBe('https://api.yourapp.com/errors/custom');
    expect(body.code).toBe('CUSTOM_CONFLICT');
  });

  it('falls back to http status type URL when HttpException code is missing', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/denied');

    const exception = new HttpException(
      { message: 'Denied', error: 'Forbidden' },
      HttpStatus.FORBIDDEN,
    );
    filter.catch(exception, host);

    const body = response.send.mock.calls[0][0];
    expect(body.type).toBe('https://httpstatuses.com/403');
    expect(body.title).toBe('Forbidden');
    expect(body.detail).toBe('Denied');
  });

  it('uses first message from message array for HttpException details', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/unprocessable');

    const exception = new HttpException(
      { message: ['first detail', 'second detail'] },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
    filter.catch(exception, host);

    const body = response.send.mock.calls[0][0];
    expect(body.detail).toBe('first detail');
    expect(body.title).toBe('Unprocessable Entity');
  });

  it('uses generic title fallback when status label is unknown', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/custom');

    const exception = new HttpException({ message: '' }, 499);
    filter.catch(exception, host);

    const body = response.send.mock.calls[0][0];
    expect(body.title).toBe('Error');
    expect(body.detail).toBe('');
  });

  it('extracts explicit validation errors and filters malformed entries', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/profile');

    const exception = new BadRequestException({
      code: 'VALIDATION_ERROR',
      errors: [
        { field: 'email', message: 'email invalid' },
        { field: 'age' },
        null,
        { field: 'age', message: 'age invalid' },
      ],
    });
    filter.catch(exception, host);

    const body = response.send.mock.calls[0][0];
    expect(body.errors).toEqual([
      { field: 'email', message: 'email invalid' },
      { field: 'age', message: 'age invalid' },
    ]);
    expect(body.detail).toBe('email invalid');
  });

  it('uses validation fallback detail when bad request message is not an array', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/profile');

    const exception = new BadRequestException({ message: 'invalid payload' });
    filter.catch(exception, host);

    const body = response.send.mock.calls[0][0];
    expect(body.detail).toBe('Validation failed');
    expect(body.errors).toBeUndefined();
  });

  it('does not expose stack trace when disabled', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: false,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/unknown');

    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    const body = response.send.mock.calls[0][0];
    expect(body.detail).toBe('Internal server error');
    expect(body.stack).toBeUndefined();
  });

  it('includes stack trace for raw errors when enabled', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: true,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/unknown');
    const error = new Error('boom');

    filter.catch(error, host);

    const body = response.send.mock.calls[0][0];
    expect(typeof body.stack).toBe('string');
    expect(body.instance).toBe('/api/v1/unknown');
  });

  it('handles non-Error unknown exceptions without stack details', () => {
    const filter = new ProblemDetailsFilter({
      includeStackTrace: true,
      problemTypeBaseUrl: 'https://api.yourapp.com/errors',
    });
    const { host, response } = createHost('/api/v1/unknown');

    filter.catch('boom', host);

    const body = response.send.mock.calls[0][0];
    expect(body.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.detail).toBe('Internal server error');
    expect(body.stack).toBeUndefined();
    expect(body.instance).toBe('/api/v1/unknown');
  });
});
