import { MobileOAuthConfigService } from '@application/services/mobile-oauth-config.service';
import { JWKSTokenValidationService } from '@application/services/jwks-token-validation.service';
import { LoggerService } from '@application/services/logger.service';
import { UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
}));

describe('JWKSTokenValidationService', () => {
  let service: JWKSTokenValidationService;
  let mobileOAuthConfig: jest.Mocked<MobileOAuthConfigService>;

  beforeEach(() => {
    mobileOAuthConfig = {
      getAudience: jest.fn().mockReturnValue('audience'),
    } as unknown as jest.Mocked<MobileOAuthConfigService>;
    const logger = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
    service = new JWKSTokenValidationService(mobileOAuthConfig, logger);
    (service as any).jwks = {};
    jest.clearAllMocks();
  });

  async function expectUnauthorizedCode(
    action: () => Promise<unknown>,
    code: string,
  ) {
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

  it('verifies a valid token and maps payload fields', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: {
        sub: 'google-sub',
        email: 'user@example.com',
        given_name: 'Jane',
        family_name: 'Doe',
        picture: 'https://picture',
      },
    });

    const result = await service.verifyIdToken('token', 'ios');
    expect(result).toEqual({
      googleId: 'google-sub',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      picture: 'https://picture',
    });
    expect(mobileOAuthConfig.getAudience).toHaveBeenCalledWith('ios');
  });

  it('throws when nonce is expected but missing/invalid', async () => {
    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { sub: 'sub', email: 'user@example.com' },
    });
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios', 'nonce-1'),
      'AUTH_NONCE_MISSING',
    );

    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { sub: 'sub', email: 'user@example.com', nonce: 'other' },
    });
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios', 'nonce-1'),
      'AUTH_NONCE_INVALID',
    );
  });

  it('throws when JWKS is not initialized', async () => {
    (service as any).jwks = null;
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios'),
      'AUTH_JWKS_NOT_INITIALIZED',
    );
  });

  it('maps jose error codes to domain auth error codes', async () => {
    const error = { code: 'ERR_JWT_EXPIRED', message: 'expired' };
    (jwtVerify as jest.Mock).mockRejectedValue(error);
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios'),
      'AUTH_ID_TOKEN_EXPIRED',
    );

    (jwtVerify as jest.Mock).mockRejectedValue({
      code: 'ERR_JWT_AUDIENCE_INVALID',
      message: 'invalid aud',
    });
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios'),
      'AUTH_ID_TOKEN_AUDIENCE_INVALID',
    );
  });

  it('maps additional jose and claim validation errors', async () => {
    (jwtVerify as jest.Mock).mockRejectedValue({
      code: 'ERR_JWT_INVALID',
      message: 'invalid',
    });
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios'),
      'AUTH_ID_TOKEN_INVALID_FORMAT',
    );

    (jwtVerify as jest.Mock).mockRejectedValue({
      code: 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED',
      message: 'bad signature',
    });
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios'),
      'AUTH_ID_TOKEN_SIGNATURE_INVALID',
    );

    (jwtVerify as jest.Mock).mockResolvedValue({
      payload: { email: 'user@example.com' },
    });
    await expectUnauthorizedCode(
      () => service.verifyIdToken('token', 'ios'),
      'AUTH_REQUIRED_CLAIMS_MISSING',
    );
  });

  it('exposes status and refreshes JWKS', async () => {
    expect(service.getJWKSStatus()).toEqual({
      initialized: true,
      url: 'https://www.googleapis.com/oauth2/v3/certs',
    });

    const initializeSpy = jest
      .spyOn(service as any, 'initializeJWKS')
      .mockResolvedValue(undefined);
    await service.refreshJWKS();
    expect(initializeSpy).toHaveBeenCalled();
    expect(service.isJWKSInitialized()).toBe(true);
  });
});
