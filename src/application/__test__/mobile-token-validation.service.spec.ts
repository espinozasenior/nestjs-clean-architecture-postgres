import { JWKSTokenValidationService } from '@application/services/jwks-token-validation.service';
import { LoggerService } from '@application/services/logger.service';
import { MobileOAuthConfigService } from '@application/services/mobile-oauth-config.service';
import { MobileTokenValidationService } from '@application/services/mobile-token-validation.service';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
  decodeJwt: jest.fn(),
}));

describe('MobileTokenValidationService', () => {
  let service: MobileTokenValidationService;
  let mobileOAuthConfig: jest.Mocked<MobileOAuthConfigService>;
  let authDomainService: jest.Mocked<AuthDomainService>;
  let jwksService: jest.Mocked<JWKSTokenValidationService>;

  beforeEach(() => {
    mobileOAuthConfig = {
      getClientId: jest.fn().mockReturnValue('client-id'),
      getRedirectUri: jest.fn().mockReturnValue('myapp://callback'),
    } as unknown as jest.Mocked<MobileOAuthConfigService>;
    authDomainService = {
      validateIdTokenFormat: jest.fn(),
      validateGoogleUserData: jest.fn(),
      validateAuthorizationCodeFormat: jest.fn(),
      validateCodeVerifierFormat: jest.fn(),
    } as unknown as jest.Mocked<AuthDomainService>;
    jwksService = {
      isJWKSInitialized: jest.fn().mockReturnValue(true),
      refreshJWKS: jest.fn(),
      verifyIdToken: jest.fn(),
    } as unknown as jest.Mocked<JWKSTokenValidationService>;
    const logger = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    service = new MobileTokenValidationService(
      mobileOAuthConfig,
      logger,
      authDomainService,
      jwksService,
    );
    jest.clearAllMocks();
  });

  async function expectExceptionCode(
    action: () => Promise<unknown>,
    code: string,
    exceptionType: any = UnauthorizedException,
  ) {
    try {
      await action();
      fail('Expected exception');
    } catch (error) {
      expect(error).toBeInstanceOf(exceptionType);
      if (error instanceof UnauthorizedException) {
        expect(error.getResponse()).toEqual(expect.objectContaining({ code }));
      }
    }
  }

  it('validates ID token using JWKS and maps user info', async () => {
    jwksService.verifyIdToken.mockResolvedValue({
      googleId: 'google-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      picture: 'https://pic',
    });

    const result = await service.validateIdToken('id-token', 'ios');
    expect(result.googleId).toBe('google-1');
    expect(authDomainService.validateGoogleUserData).toHaveBeenCalledWith({
      sub: 'google-1',
      email: 'user@example.com',
    });
  });

  it('fails when JWKS cannot initialize after refresh attempt', async () => {
    jwksService.isJWKSInitialized
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    await expectExceptionCode(
      () => service.validateIdToken('id-token', 'ios'),
      'AUTH_JWT_VALIDATION_SERVICE_UNAVAILABLE',
    );
  });

  it('converts domain ID token format errors to BadRequestException', async () => {
    authDomainService.validateIdTokenFormat.mockImplementation(() => {
      throw new Error('ID token is required');
    });

    await expectExceptionCode(
      () => service.validateIdToken('', 'ios'),
      '',
      BadRequestException,
    );
  });

  it('exchanges authorization code and validates invalid_grant responses', async () => {
    (axios.post as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: { error: 'invalid_grant' },
      },
      message: 'invalid_grant',
    });

    await expectExceptionCode(
      () => service.validateAuthorizationCode('code', 'a'.repeat(43), 'ios'),
      '',
      BadRequestException,
    );
  });

  it('maps authorization code exchange edge branches', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: {},
    });
    await expectExceptionCode(
      () => service.validateAuthorizationCode('code', 'a'.repeat(43), 'ios'),
      'AUTH_NO_ACCESS_TOKEN_RECEIVED',
    );

    (axios.post as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: { error: 'invalid_request' },
      },
      message: 'invalid request',
    });
    await expectExceptionCode(
      () => service.validateAuthorizationCode('code', 'a'.repeat(43), 'ios'),
      '',
      BadRequestException,
    );

    authDomainService.validateAuthorizationCodeFormat.mockImplementationOnce(() => {
      throw new Error('Authorization code is required');
    });
    await expectExceptionCode(
      () => service.validateAuthorizationCode('', 'a'.repeat(43), 'ios'),
      '',
      BadRequestException,
    );
  });

  it('fetches user info from access token and maps fallback name parsing', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        sub: 'google-sub',
        email: 'user@example.com',
        name: 'Jane Doe',
        picture: 'https://pic',
      },
    });

    const result = await service.getUserInfoFromAccessToken('access-token');
    expect(result).toEqual({
      googleId: 'google-sub',
      email: 'user@example.com',
      firstName: 'Jane Doe',
      lastName: 'Doe',
      picture: 'https://pic',
    });
  });

  it('maps unknown user-info errors to AUTH_USER_INFO_FETCH_FAILED', async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error('boom'));
    await expectExceptionCode(
      () => service.getUserInfoFromAccessToken('access-token'),
      'AUTH_USER_INFO_FETCH_FAILED',
    );
  });

  it('maps invalid user-data errors from domain validation to unauthorized', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        sub: '',
        email: 'invalid',
      },
    });
    authDomainService.validateGoogleUserData.mockImplementation(() => {
      throw new Error('Invalid user data: missing subject');
    });
    await expect(service.getUserInfoFromAccessToken('access-token')).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          message: 'Invalid user data: missing subject',
        }),
      }),
    );
  });
});
