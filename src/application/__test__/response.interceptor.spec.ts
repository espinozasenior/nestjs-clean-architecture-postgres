import { ResponseInterceptor } from '@application/interceptors/response.interceptor';
import { ResponseService } from '@application/services/response.service';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let responseService: jest.Mocked<ResponseService>;

  beforeEach(() => {
    responseService = {
      success: jest.fn((message: string, data?: unknown) => ({
        message,
        data,
      })),
      withRequest: jest.fn((response: any, request: any) => ({
        ...response,
        path: request.path,
        method: request.method,
      })),
    } as unknown as jest.Mocked<ResponseService>;
    interceptor = new ResponseInterceptor(responseService);
  });

  function createContext() {
    const request = { path: '/api/v1/test', method: 'GET' };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  function createHandler(data: unknown): CallHandler {
    return {
      handle: () => of(data),
    };
  }

  it('returns formatted responses as-is and enriches with request context', (done) => {
    const { context } = createContext();
    const existing = { message: 'already formatted', data: { ok: true } };

    interceptor.intercept(context, createHandler(existing)).subscribe((result) => {
      expect(responseService.success).not.toHaveBeenCalled();
      expect(result.message).toBe('already formatted');
      expect(result.path).toBe('/api/v1/test');
      done();
    });
  });

  it('wraps null responses using default success message', (done) => {
    const { context } = createContext();

    interceptor.intercept(context, createHandler(null)).subscribe((result) => {
      expect(responseService.success).toHaveBeenCalledWith(
        'Operation completed successfully',
      );
      expect(result.method).toBe('GET');
      done();
    });
  });

  it('wraps string responses as success messages', (done) => {
    const { context } = createContext();

    interceptor.intercept(context, createHandler('custom message')).subscribe((result) => {
      expect(responseService.success).toHaveBeenCalledWith('custom message');
      expect(result.message).toBe('custom message');
      done();
    });
  });

  it('formats access_token payloads with authentication message', (done) => {
    const { context } = createContext();
    const tokenPayload = { access_token: 'token', refresh_token: 'refresh' };

    interceptor
      .intercept(context, createHandler(tokenPayload))
      .subscribe((result) => {
        expect(responseService.success).toHaveBeenCalledWith(
          'Authentication successful',
          tokenPayload,
        );
        expect(result.data).toEqual(tokenPayload);
        done();
      });
  });

  it('wraps generic data with default success message and payload', (done) => {
    const { context } = createContext();
    const payload = { id: '1', name: 'profile' };

    interceptor.intercept(context, createHandler(payload)).subscribe((result) => {
      expect(responseService.success).toHaveBeenCalledWith(
        'Operation completed successfully',
        payload,
      );
      expect(result.data).toEqual(payload);
      done();
    });
  });
});
