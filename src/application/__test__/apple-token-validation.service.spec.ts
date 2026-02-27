import { AppleOAuthConfigService } from '@application/services/apple-oauth-config.service';
import { AppleTokenValidationService } from '@application/services/apple-token-validation.service';
import { LoggerService } from '@application/services/logger.service';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { UnauthorizedException } from '@nestjs/common';
import { decodeJwt, jwtVerify } from 'jose';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
  decodeJwt: jest.fn(),
}));

describe('AppleTokenValidationService', () => {
  let service: AppleTokenValidationService;
  let authDomain: jest.Mocked<AuthDomainService>;
  let appleConfig: jest.Mocked<AppleOAuthConfigService>;

  beforeEach(() => {
    authDomain = {
      validateAppleIdTokenFormat: jest.fn(),
      validateAppleUserData: jest.fn(),
    } as unknown as jest.Mocked<AuthDomainService>;
    appleConfig = {
      getAudiences: jest.fn().mockReturnValue(['com.example.ios']),
    } as unknown as jest.Mocked<AppleOAuthConfigService>;
    const logger = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
    service = new AppleTokenValidationService(authDomain, logger, appleConfig);
    (service as any).jwks = {};
    jest.clearAllMocks();
  });

  async function expectUnauthorizedCode(action: () => Promise<unknown>, code: string) {
    try {
      await action();
      fail('Expected UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual(
        expect.objectContaining({ code }),
      );
    }
  }

  it('validates apple id token and returns user info', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: 'apple-sub',
        email: 'user@example.com',
        given_name: 'Jane',
        family_name: 'Doe',
      },
    });

    const result = await service.validateIdToken('id-token', 'ios');
    expect(result).toEqual({
      appleId: 'apple-sub',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(appleConfig.getAudiences).toHaveBeenCalledWith('ios');
  });

  it('throws when JWKS is missing', async () => {
    (service as any).jwks = null;
    await expectUnauthorizedCode(
      () => service.validateIdToken('id-token', 'ios'),
      'AUTH_APPLE_JWKS_NOT_INITIALIZED',
    );
  });

  it('maps audience mismatch errors to apple audience code', async () => {
    (jwtVerify as jest.Mock).mockRejectedValue({
      code: 'ERR_JWT_AUDIENCE_INVALID',
      message: 'unexpected "aud" claim value',
    });
    (decodeJwt as jest.Mock).mockReturnValue({ aud: 'wrong-audience' });

    await expectUnauthorizedCode(
      () => service.validateIdToken('id-token', 'ios'),
      'AUTH_APPLE_ID_TOKEN_AUDIENCE_INVALID',
    );
  });

  it('maps expired tokens to apple expired code', async () => {
    (jwtVerify as jest.Mock).mockRejectedValue({
      code: 'ERR_JWT_EXPIRED',
      message: 'expired',
    });

    await expectUnauthorizedCode(
      () => service.validateIdToken('id-token', 'ios'),
      'AUTH_APPLE_ID_TOKEN_EXPIRED',
    );
  });

  it('refreshes JWKS and reports initialization state', async () => {
    const initSpy = jest
      .spyOn(service as any, 'initializeJWKS')
      .mockResolvedValue(undefined);
    await service.refreshJWKS();
    expect(initSpy).toHaveBeenCalled();
    expect(service.isJWKSInitialized()).toBe(true);
  });
});
