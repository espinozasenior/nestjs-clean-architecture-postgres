describe('constants.ts validation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('throws when EMAIL_ENCRYPTION_KEY is missing', () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EMAIL_ENCRYPTION_KEY: '',
      EMAIL_BLIND_INDEX_SECRET: 'present-secret',
    };

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../constants');
      });
    }).toThrow(
      'FATAL ERROR: EMAIL_ENCRYPTION_KEY is not defined in environment variables.',
    );
  });

  it('throws when EMAIL_BLIND_INDEX_SECRET is missing', () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EMAIL_ENCRYPTION_KEY:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      EMAIL_BLIND_INDEX_SECRET: '',
    };

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../constants');
      });
    }).toThrow(
      'FATAL ERROR: EMAIL_BLIND_INDEX_SECRET is not defined in environment variables.',
    );
  });

  it('uses explicit environment values when provided', () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      APP_NAME: 'my-app',
      PORT: '4100',
      APP_HOST: '127.0.0.1',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      POSTGRES_PORT: '6432',
      JWT_SECRET: 'jwt-secret',
      JWT_REFRESH_SECRET: 'jwt-refresh',
      JWT_EXPIRATION_TIME: '2h',
      JWT_REFRESH_EXPIRATION_TIME: '14d',
      GOOGLE_CLIENT_ID: 'google-client',
      GOOGLE_CLIENT_SECRET: 'google-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost/callback',
      EMAIL_ENCRYPTION_KEY:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      EMAIL_BLIND_INDEX_SECRET: 'blind-secret',
      GRAFANA_USER: 'grafana-user',
      GRAFANA_PASSWORD: 'grafana-password',
      PROMETHEUS_PORT: '9191',
      GRAFANA_PORT: '3333',
    };

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const constants = require('../constants');
      expect(constants.APP_NAME).toBe('my-app');
      expect(constants.APP_PORT).toBe(4100);
      expect(constants.APP_HOST).toBe('127.0.0.1');
      expect(constants.NODE_ENV).toBe('test');
      expect(constants.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/db');
      expect(constants.POSTGRES_PORT).toBe(6432);
      expect(constants.JWT_SECRET).toBe('jwt-secret');
      expect(constants.JWT_REFRESH_SECRET).toBe('jwt-refresh');
      expect(constants.JWT_EXPIRATION_TIME).toBe('2h');
      expect(constants.JWT_REFRESH_EXPIRATION_TIME).toBe('14d');
      expect(constants.GOOGLE_CLIENT_ID).toBe('google-client');
      expect(constants.GOOGLE_CLIENT_SECRET).toBe('google-secret');
      expect(constants.GOOGLE_CALLBACK_URL).toBe('http://localhost/callback');
      expect(constants.EMAIL_ENCRYPTION_KEY).toBe(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      );
      expect(constants.EMAIL_BLIND_INDEX_SECRET).toBe('blind-secret');
      expect(constants.GRAFANA_USER).toBe('grafana-user');
      expect(constants.GRAFANA_PASSWORD).toBe('grafana-password');
      expect(constants.PROMETHEUS_PORT).toBe(9191);
      expect(constants.GRAFANA_PORT).toBe(3333);
    });
  });

  it('falls back to defaults when optional values are missing', () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      APP_NAME: '',
      PORT: '',
      APP_HOST: '',
      NODE_ENV: '',
      DATABASE_URL: '',
      POSTGRES_PORT: '',
      JWT_SECRET: '',
      JWT_REFRESH_SECRET: '',
      GRAFANA_USER: '',
      GRAFANA_PASSWORD: '',
      PROMETHEUS_PORT: '',
      GRAFANA_PORT: '',
      EMAIL_ENCRYPTION_KEY:
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      EMAIL_BLIND_INDEX_SECRET: 'blind-secret',
    };
    delete process.env.JWT_EXPIRATION_TIME;
    delete process.env.JWT_REFRESH_EXPIRATION_TIME;

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const constants = require('../constants');
      expect(constants.APP_NAME).toBe('clean.architecture');
      expect(constants.APP_PORT).toBe(4000);
      expect(constants.APP_HOST).toBe('0.0.0.0');
      expect(constants.NODE_ENV).toBe('development');
      expect(constants.DATABASE_URL).toBe(
        'postgresql://nestjs_user:nestjs_password@localhost:5432/nestjs_postgres',
      );
      expect(constants.POSTGRES_PORT).toBe(5432);
      expect(constants.JWT_SECRET).toBe('your-default-secret');
      expect(constants.JWT_REFRESH_SECRET).toBe('your-default-refresh-secret');
      expect(constants.JWT_EXPIRATION_TIME).toBe('3600s');
      expect(constants.JWT_REFRESH_EXPIRATION_TIME).toBe('7d');
      expect(constants.GRAFANA_USER).toBe('admin');
      expect(constants.GRAFANA_PASSWORD).toBe('admin');
      expect(constants.PROMETHEUS_PORT).toBe(9090);
      expect(constants.GRAFANA_PORT).toBe(3000);
    });
  });
});
