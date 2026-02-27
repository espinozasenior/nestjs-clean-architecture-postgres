describe('LoggerMiddleware (production mode)', () => {
  function loadMiddlewareWithNodeEnv(nodeEnv: string) {
    jest.resetModules();
    let LoggerMiddlewareClass: any;
    jest.isolateModules(() => {
      jest.doMock('@constants', () => ({
        NODE_ENV: nodeEnv,
      }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      LoggerMiddlewareClass =
        require('@application/middlewere/logger.middleware').LoggerMiddleware;
    });
    return LoggerMiddlewareClass;
  }

  function createReq(overrides: Record<string, any> = {}) {
    return {
      method: 'POST',
      originalUrl: '/api/v1/profiles?from=test',
      headers: { 'user-agent': 'jest-agent' },
      ip: '',
      socket: { remoteAddress: '10.0.0.10' },
      requestId: undefined,
      user: {},
      body: { password: 'secret', note: 'hello' },
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

  it('does not include request body logging in production', () => {
    const LoggerMiddleware = loadMiddlewareWithNodeEnv('production');
    const loggerService = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    };
    const middleware = new LoggerMiddleware(loggerService);
    const req = createReq();
    const res = createRes(200);
    const next = jest.fn();

    middleware.use(req, res, next);
    res.finish();

    expect(loggerService.logger).toHaveBeenCalledTimes(1);
    const [payload] = loggerService.logger.mock.calls[0];
    expect(payload.body).toBeUndefined();
    expect(payload.url).toBe('/api/v1/profiles');
  });

  it('falls back request metadata fields when headers/requestId are absent', () => {
    const LoggerMiddleware = loadMiddlewareWithNodeEnv('production');
    const loggerService = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    };
    const middleware = new LoggerMiddleware(loggerService);
    const req = createReq({
      headers: {},
      requestId: undefined,
      ip: '',
      socket: { remoteAddress: '172.16.0.5' },
      method: 'GET',
      body: undefined,
    });
    const res = createRes(404);
    const next = jest.fn();

    middleware.use(req, res, next);
    res.finish();

    expect(loggerService.warning).toHaveBeenCalledTimes(1);
    const [payload] = loggerService.warning.mock.calls[0];
    expect(payload.requestId).toBeUndefined();
    expect(payload.clientIp).toBe('172.16.0.5');
    expect(payload.userId).toBeUndefined();
  });
});
