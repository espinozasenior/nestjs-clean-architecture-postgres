import { MobileOAuthConfigService } from '@application/services/mobile-oauth-config.service';
import { LoggerService } from '@application/services/logger.service';
import { BadRequestException } from '@nestjs/common';

describe('MobileOAuthConfigService', () => {
  const originalEnv = process.env;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    logger = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads configuration and reports platform status', () => {
    process.env.GOOGLE_IOS_CLIENT_ID = 'ios-client';
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client';
    const service = new MobileOAuthConfigService(logger);

    expect(service.isPlatformConfigured('ios')).toBe(true);
    expect(service.isPlatformConfigured('android')).toBe(true);
    expect(service.getConfigurationStatus()).toEqual({
      ios: true,
      android: true,
    });
    expect(service.getSupportedPlatforms()).toEqual(['ios', 'android']);
  });

  it('throws when client ID or audience is missing', () => {
    process.env.GOOGLE_IOS_CLIENT_ID = '';
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client';
    const service = new MobileOAuthConfigService(logger);

    expect(() => service.getClientId('ios')).toThrow(BadRequestException);
    expect(() => service.getAudience('ios')).toThrow(BadRequestException);
  });

  it('resolves redirect URI and validates unsupported/missing values', () => {
    process.env.GOOGLE_IOS_CLIENT_ID = 'ios-client';
    process.env.GOOGLE_ANDROID_CLIENT_ID = 'android-client';
    process.env.GOOGLE_MOBILE_CALLBACK_IOS_URL = 'myapp://ios/callback';
    process.env.GOOGLE_MOBILE_CALLBACK_ANDROID_URL = 'myapp://android/callback';
    const service = new MobileOAuthConfigService(logger);

    expect(service.getRedirectUri('ios')).toBe('myapp://ios/callback');
    expect(service.getRedirectUri('android')).toBe('myapp://android/callback');

    delete process.env.GOOGLE_MOBILE_CALLBACK_IOS_URL;
    const serviceWithoutIosRedirect = new MobileOAuthConfigService(logger);
    expect(() => serviceWithoutIosRedirect.getRedirectUri('ios')).toThrow(
      BadRequestException,
    );
    expect(() =>
      serviceWithoutIosRedirect.getRedirectUri('web' as any),
    ).toThrow(BadRequestException);
  });
});
