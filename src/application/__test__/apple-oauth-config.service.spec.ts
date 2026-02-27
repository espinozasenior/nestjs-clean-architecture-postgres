import { AppleOAuthConfigService } from '@application/services/apple-oauth-config.service';

describe('AppleOAuthConfigService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('returns platform client ids and unique audiences', async () => {
    process.env = {
      ...originalEnv,
      APPLE_IOS_CLIENT_ID: 'com.example.ios',
      APPLE_ANDROID_CLIENT_ID: 'com.example.android',
      APPLE_IOS_ADDITIONAL_AUDIENCES: 'com.example.alt,com.example.ios',
      APPLE_ANDROID_ADDITIONAL_AUDIENCES: 'com.example.alt.android',
      APPLE_TEAM_ID: 'TEAM123',
      APPLE_KEY_ID: 'KEY123',
      APPLE_PRIVATE_KEY: 'private-key',
    };

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppleOAuthConfigService: Service } = require('@application/services/apple-oauth-config.service');
      const service = new Service() as AppleOAuthConfigService;
      expect(service.getClientId('ios')).toBe('com.example.ios');
      expect(service.getClientId('android')).toBe('com.example.android');
      expect(service.getAudiences('ios')).toEqual([
        'com.example.ios',
        'com.example.alt',
      ]);
      expect(service.getTeamId()).toBe('TEAM123');
      expect(service.getKeyId()).toBe('KEY123');
      expect(service.getPrivateKey()).toBe('private-key');
    });
  });

  it('validates platform configuration and reports errors for placeholders', () => {
    process.env = {
      ...originalEnv,
      APPLE_IOS_CLIENT_ID: '',
      APPLE_ANDROID_CLIENT_ID: '',
      APPLE_TEAM_ID: '',
      APPLE_KEY_ID: '',
      APPLE_PRIVATE_KEY: '',
      APPLE_IOS_ADDITIONAL_AUDIENCES: '',
      APPLE_ANDROID_ADDITIONAL_AUDIENCES: '',
    };

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { AppleOAuthConfigService: Service } = require('@application/services/apple-oauth-config.service');
      const service = new Service() as AppleOAuthConfigService;
      const result = service.validatePlatformConfiguration('ios');
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('client ID not configured properly'),
          'Apple Team ID not configured',
          'Apple Key ID not configured',
          'Apple Private Key not configured',
        ]),
      );
      expect(service.getConfig()).toBeDefined();
    });
  });
});
