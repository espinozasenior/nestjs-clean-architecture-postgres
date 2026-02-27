import { LoggerMiddleware } from '@application/middlewere/logger.middleware';
import { LoggerService } from '@application/services/logger.service';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let loggerService: jest.Mocked<LoggerService>;

  beforeEach(() => {
    loggerService = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
    middleware = new LoggerMiddleware(loggerService);
  });

  function createReq(overrides: Record<string, any> = {}) {
    return {
      method: 'GET',
      originalUrl: '/api/v1/profiles',
      headers: { 'user-agent': 'jest', 'x-request-id': 'rid-1' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      requestId: 'rid-1',
      user: { id: 'user-1' },
      ...overrides,
    };
  }

  function createRes(statusCode = 200) {
    let finishHandler: (() => void) | undefined;
    return {
      statusCode,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') {
          finishHandler = handler;
        }
      }),
      finish: () => {
        if (finishHandler) {
          finishHandler();
        }
      },
    };
  }

  it('skips logging for ignored paths', () => {
    const req = createReq({ originalUrl: '/health' });
    const res = createRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
    expect(loggerService.logger).not.toHaveBeenCalled();
  });

  it('skips logging for ignored HTTP methods', () => {
    const req = createReq({ method: 'OPTIONS' });
    const res = createRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).not.toHaveBeenCalled();
    expect(loggerService.warning).not.toHaveBeenCalled();
  });

  it('logs server errors using err severity', () => {
    const req = createReq();
    const res = createRes(500);
    const next = jest.fn();

    middleware.use(req, res, next);
    res.finish();

    expect(next).toHaveBeenCalled();
    expect(loggerService.err).toHaveBeenCalledTimes(1);
    expect(loggerService.warning).not.toHaveBeenCalled();
  });

  it('logs client errors using warning severity', () => {
    const req = createReq();
    const res = createRes(404);
    const next = jest.fn();

    middleware.use(req, res, next);
    res.finish();

    expect(loggerService.warning).toHaveBeenCalledTimes(1);
    expect(loggerService.err).not.toHaveBeenCalled();
  });

  it('redacts sensitive fields and truncates long body values for mutating methods', () => {
    const longValue = 'x'.repeat(300);
    const req = createReq({
      method: 'POST',
      body: {
        password: 'secret-password',
        accessToken: 'secret-token',
        bio: longValue,
        nickname: 'tester',
      },
    });
    const res = createRes(201);
    const next = jest.fn();

    middleware.use(req, res, next);
    res.finish();

    expect(loggerService.logger).toHaveBeenCalledTimes(1);
    const [payload] = loggerService.logger.mock.calls[0];
    expect(payload.body.password).toBe('***');
    expect(payload.body.accessToken).toBe('***');
    expect(payload.body.bio.length).toBe(257);
    expect(payload.body.nickname).toBe('tester');
  });

  it('routes payload logging severities for mutating methods', () => {
    const next = jest.fn();

    const serverReq = createReq({ method: 'POST', body: { name: 'x' } });
    const serverRes = createRes(500);
    middleware.use(serverReq, serverRes, next);
    serverRes.finish();
    expect(loggerService.err).toHaveBeenCalled();

    const clientReq = createReq({ method: 'PATCH', body: { name: 'x' } });
    const clientRes = createRes(404);
    middleware.use(clientReq, clientRes, next);
    clientRes.finish();
    expect(loggerService.warning).toHaveBeenCalled();
  });

  it('logs normal successful non-mutating requests through base logger', () => {
    const req = createReq({ method: 'GET' });
    const res = createRes(200);
    const next = jest.fn();

    middleware.use(req, res, next);
    res.finish();

    expect(loggerService.logger).toHaveBeenCalled();
  });
});
