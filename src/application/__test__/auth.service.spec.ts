import { AuthService } from '@application/auth/auth.service';
import { AuthError } from '@application/shared/errors';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { ProfileDomainService } from '@domain/services/profile-domain.service';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CommandBus } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import * as crypto from 'crypto';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
  decodeJwt: jest.fn(),
}));
jest.mock('axios');

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: any;
  let profileRepository: any;
  let jwtService: jest.Mocked<JwtService>;
  let commandBus: jest.Mocked<CommandBus>;
  let authDomainService: jest.Mocked<AuthDomainService>;
  let profileDomainService: jest.Mocked<ProfileDomainService>;
  let mobileTokenValidation: any;
  let mobileOAuthConfig: any;
  let appleTokenValidation: any;
  let appleOAuthConfig: any;
  let logger: any;

  beforeEach(() => {
    authRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      removeRefreshToken: jest.fn(),
      findByGoogleId: jest.fn(),
      findByAppleId: jest.fn(),
    };
    profileRepository = {
      findByAuthId: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      verify: jest.fn(),
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;
    logger = {
      logger: jest.fn(),
      warning: jest.fn(),
      err: jest.fn(),
    };
    authDomainService = {
      isEmailValid: jest.fn().mockReturnValue(true),
      validatePasswordChangeData: jest.fn(),
      generateUserId: jest.fn().mockReturnValue('auth-generated'),
      canCreateUser: jest.fn().mockReturnValue(true),
      validateMobileOAuthData: jest.fn(),
      validateAppleIdTokenFormat: jest.fn(),
    } as unknown as jest.Mocked<AuthDomainService>;
    profileDomainService = {
      generateProfileId: jest.fn().mockReturnValue('profile-generated'),
    } as unknown as jest.Mocked<ProfileDomainService>;
    mobileTokenValidation = {
      validateIdToken: jest.fn(),
      validateAuthorizationCode: jest.fn(),
    };
    mobileOAuthConfig = {
      isPlatformConfigured: jest.fn(),
    };
    appleTokenValidation = {
      validateIdToken: jest.fn(),
    };
    appleOAuthConfig = {
      validatePlatformConfiguration: jest.fn(),
    };

    service = new AuthService(
      commandBus,
      authRepository,
      profileRepository,
      jwtService,
      logger as any,
      authDomainService,
      profileDomainService,
      mobileTokenValidation,
      mobileOAuthConfig,
      appleTokenValidation,
      appleOAuthConfig,
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('login rejects invalid email format', async () => {
    authDomainService.isEmailValid.mockReturnValue(false);
    await expect(
      service.login({ email: 'invalid', password: 'Password1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login rejects unknown users', async () => {
    authRepository.findByEmail.mockResolvedValue(null);
    await expect(
      service.login({ email: 'user@example.com', password: 'Password1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('login rejects wrong password', async () => {
    authRepository.findByEmail.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      password: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'user@example.com', password: 'WrongPass1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login succeeds and stores rotated refresh token hash', async () => {
    const authUser = {
      id: 'auth-1',
      email: 'user@example.com',
      password: 'hashed-password',
      role: ['USER'],
    };
    authRepository.findByEmail.mockResolvedValue(authUser);
    profileRepository.findByAuthId.mockResolvedValue({
      id: 'profile-1',
      authId: 'auth-1',
      name: 'Jane',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'user@example.com',
      password: 'Password1',
    });

    expect(result.access_token).toBe('access-token');
    expect(result.refresh_token).toBe('refresh-token');
    expect(authRepository.update).toHaveBeenCalledWith('auth-1', {
      currentHashedRefreshToken: 'hashed-refresh',
    });
  });

  it('refreshToken returns invalid-refresh when stored refresh token is missing', async () => {
    jwtService.verify.mockReturnValue({ sub: 'auth-1' } as any);
    authRepository.findById.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      currentHashedRefreshToken: null,
      role: ['USER'],
    });

    await expect(service.refreshToken('refresh-token')).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          code: AuthError.INVALID_REFRESH_TOKEN,
        }),
      }),
    );
  });

  it('refreshToken rotates tokens on success', async () => {
    jwtService.verify.mockReturnValue({ sub: 'auth-1' } as any);
    authRepository.findById.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      currentHashedRefreshToken: 'stored-hash',
      role: ['USER'],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-stored-hash');
    jwtService.signAsync
      .mockResolvedValueOnce('new-access')
      .mockResolvedValueOnce('new-refresh');

    const result = await service.refreshToken('old-refresh');
    expect(result).toEqual({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
    expect(authRepository.update).toHaveBeenCalledWith('auth-1', {
      currentHashedRefreshToken: 'new-stored-hash',
    });
  });

  it('refreshToken maps user-not-found and invalid-hash branches', async () => {
    jwtService.verify.mockReturnValue({ sub: 'missing-user' } as any);
    authRepository.findById.mockResolvedValueOnce(null);
    await expect(service.refreshToken('refresh-token')).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          code: AuthError.INVALID_REFRESH_TOKEN,
        }),
      }),
    );

    jwtService.verify.mockReturnValue({ sub: 'auth-1' } as any);
    authRepository.findById.mockResolvedValueOnce({
      id: 'auth-1',
      email: 'user@example.com',
      currentHashedRefreshToken: 'stored-hash',
      role: ['USER'],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    await expect(service.refreshToken('wrong-token')).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({
          code: AuthError.INVALID_REFRESH_TOKEN,
        }),
      }),
    );
  });

  it('changePassword rejects unknown users and wrong old password', async () => {
    authRepository.findById.mockResolvedValueOnce(null);
    await expect(
      service.changePassword('auth-1', 'OldPass1', 'NewPass2'),
    ).rejects.toBeInstanceOf(NotFoundException);

    authRepository.findById.mockResolvedValueOnce({
      id: 'auth-1',
      email: 'user@example.com',
      password: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.changePassword('auth-1', 'WrongOld1', 'NewPass2'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changePassword updates password and clears refresh token', async () => {
    authRepository.findById.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      password: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

    const result = await service.changePassword(
      'auth-1',
      'OldPass1',
      'NewPass2',
    );

    expect(result).toEqual({ message: 'Password changed successfully' });
    expect(authRepository.update).toHaveBeenCalledWith('auth-1', {
      password: 'new-password-hash',
      currentHashedRefreshToken: null,
    });
  });

  it('deleteByAuthId validates auth and profile existence before dispatch', async () => {
    authRepository.findById.mockResolvedValueOnce(null);
    await expect(service.deleteByAuthId('auth-404')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    authRepository.findById.mockResolvedValueOnce({
      id: 'auth-1',
      email: 'user@example.com',
    });
    profileRepository.findByAuthId.mockResolvedValueOnce(null);
    await expect(service.deleteByAuthId('auth-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    authRepository.findById.mockResolvedValueOnce({
      id: 'auth-1',
      email: 'user@example.com',
    });
    profileRepository.findByAuthId.mockResolvedValueOnce({
      id: 'profile-1',
      authId: 'auth-1',
    });

    const result = await service.deleteByAuthId('auth-1');
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    expect(result.message).toContain('auth-1');
  });

  it('mobileGoogleAuth maps domain flow errors into bad request', async () => {
    authDomainService.validateMobileOAuthData = jest.fn(() => {
      throw new Error('Either idToken or code must be provided');
    }) as any;

    await expect(
      service.mobileGoogleAuth({
        platform: 'ios',
        idToken: '',
        code: '',
        code_verifier: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('register fails when created auth user is missing', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    authRepository.findById.mockResolvedValue(null);

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'Password1',
        name: 'John',
        lastname: 'Doe',
        age: 30,
      }),
    ).rejects.toThrow('Registration failed - user not found after creation');
  });

  it('register succeeds even when profile read throws', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    authRepository.findById.mockResolvedValue({
      id: 'auth-generated',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId.mockRejectedValue(new Error('saga pending'));
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    const result = await service.register({
      email: 'user@example.com',
      password: 'Password1',
      name: 'John',
      lastname: 'Doe',
      age: 30,
    });

    expect(result.profile).toBeNull();
    expect(authRepository.update).toHaveBeenCalledWith('auth-generated', {
      currentHashedRefreshToken: 'hashed-refresh',
      lastLoginAt: expect.any(Date),
    });
  });

  it('register and login return null profile when repository has no profile', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    authRepository.findById.mockResolvedValue({
      id: 'auth-generated',
      email: 'user@example.com',
      role: ['USER'],
      password: 'hash',
    });
    profileRepository.findByAuthId.mockResolvedValue(null);
    jwtService.signAsync
      .mockResolvedValueOnce('register-access')
      .mockResolvedValueOnce('register-refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    const registered = await service.register({
      email: 'user@example.com',
      password: 'Password1',
      name: 'John',
      lastname: 'Doe',
      age: 30,
    });
    expect(registered.profile).toBeNull();

    authRepository.findByEmail.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      password: 'hashed-password',
      role: ['USER'],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync
      .mockResolvedValueOnce('login-access')
      .mockResolvedValueOnce('login-refresh');
    const logged = await service.login({
      email: 'user@example.com',
      password: 'Password1',
    });
    expect(logged.profile).toBeNull();
  });

  it('validateUser returns null for invalid email or password mismatch', async () => {
    authDomainService.isEmailValid.mockReturnValueOnce(false);
    expect(await service.validateUser('invalid', 'pass')).toBeNull();

    authDomainService.isEmailValid.mockReturnValue(true);
    authRepository.findByEmail.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      password: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    expect(await service.validateUser('user@example.com', 'pass')).toBeNull();
  });

  it('validateUser returns user when credentials are valid', async () => {
    authRepository.findByEmail.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      password: 'hash',
      role: ['USER'],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.validateUser('user@example.com', 'Password1');
    expect(result?.id).toBe('auth-1');
  });

  it('logout removes refresh token and returns success message', async () => {
    authRepository.removeRefreshToken.mockResolvedValue(undefined);
    await expect(service.logout('auth-1')).resolves.toEqual({
      message: 'User logged out successfully.',
    });
  });

  it('findByAuthId returns null for unknown users and object for known users', async () => {
    authRepository.findById.mockResolvedValueOnce(null);
    expect(await service.findByAuthId('missing')).toBeNull();

    authRepository.findById.mockResolvedValueOnce({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    expect((await service.findByAuthId('auth-1'))?.id).toBe('auth-1');
  });

  it('initiateGoogleAuth returns redirect URL and random state', () => {
    jest
      .spyOn(crypto, 'randomBytes')
      .mockImplementation(() => Buffer.from('12345678901234567890') as any);
    const result = service.initiateGoogleAuth();
    expect(result.state).toBeDefined();
    expect(result.redirectUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(result.redirectUrl).toContain(`state=${result.state}`);
  });

  it('handleGoogleRedirect rejects invalid state and maps successful redirect', async () => {
    await expect(
      service.handleGoogleRedirect('code', 'wrong-state', 'stored-state'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    (axios.post as jest.Mock).mockResolvedValue({
      data: { access_token: 'google-access-token' },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        sub: 'google-sub',
        email: 'user@example.com',
        given_name: 'Jane',
        family_name: 'Doe',
        picture: 'https://pic',
      },
    });
    jest.spyOn(service, 'findOrCreateGoogleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    const result = await service.handleGoogleRedirect(
      'code',
      'stored-state',
      'stored-state',
    );
    expect(result.access_token).toBe('access');
  });

  it('handleGoogleRedirect applies default names when provider omits them', async () => {
    (axios.post as jest.Mock).mockResolvedValue({
      data: { access_token: 'google-access-token' },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        sub: 'google-sub',
        email: 'user@example.com',
        picture: 'https://pic',
      },
    });
    const spy = jest.spyOn(service, 'findOrCreateGoogleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    await service.handleGoogleRedirect('code', 'state', 'state');

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Google User',
        lastName: '',
      }),
    );
  });

  it('mobileGoogleAuth handles unconfigured platform and idToken flow success', async () => {
    mobileOAuthConfig.isPlatformConfigured.mockReturnValueOnce(false);
    await expect(
      service.mobileGoogleAuth({
        platform: 'ios',
        idToken: 'id-token',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    mobileOAuthConfig.isPlatformConfigured.mockReturnValue(true);
    mobileTokenValidation.validateIdToken.mockResolvedValue({
      googleId: 'g1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      picture: 'pic',
    });
    jest.spyOn(service, 'findOrCreateGoogleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    const result = await service.mobileGoogleAuth({
      platform: 'ios',
      idToken: 'id-token',
    } as any);
    expect(result.access_token).toBe('access');
    expect(mobileTokenValidation.validateIdToken).toHaveBeenCalled();
  });

  it('mobileGoogleAuth uses default names when mobile payload is missing names', async () => {
    mobileOAuthConfig.isPlatformConfigured.mockReturnValue(true);
    mobileTokenValidation.validateIdToken.mockResolvedValue({
      googleId: 'g1',
      email: 'user@example.com',
      firstName: '',
      lastName: '',
      picture: 'pic',
    });
    const spy = jest.spyOn(service, 'findOrCreateGoogleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    await service.mobileGoogleAuth({
      platform: 'ios',
      idToken: 'id-token',
    } as any);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Google User',
        lastName: '',
      }),
    );
  });

  it('mobileGoogleAuth covers code flow and unknown error fallback', async () => {
    mobileOAuthConfig.isPlatformConfigured.mockReturnValue(true);
    mobileTokenValidation.validateAuthorizationCode.mockResolvedValue({
      googleId: 'g1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      picture: 'pic',
    });
    jest.spyOn(service, 'findOrCreateGoogleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    await service.mobileGoogleAuth({
      platform: 'android',
      code: 'code',
      code_verifier: 'verifier',
    } as any);
    expect(mobileTokenValidation.validateAuthorizationCode).toHaveBeenCalled();

    authDomainService.validateMobileOAuthData.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    await expect(
      service.mobileGoogleAuth({
        platform: 'android',
        code: 'code',
        code_verifier: 'verifier',
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('mobileAppleAuth validates configuration and success path', async () => {
    appleOAuthConfig.validatePlatformConfiguration.mockReturnValue({
      valid: false,
      errors: ['missing config'],
    });
    await expect(
      service.mobileAppleAuth({
        platform: 'ios',
        idToken: 'apple-token',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    appleOAuthConfig.validatePlatformConfiguration.mockReturnValue({
      valid: true,
      errors: [],
    });
    appleTokenValidation.validateIdToken.mockResolvedValue({
      appleId: 'apple-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });
    jest.spyOn(service, 'findOrCreateAppleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    const result = await service.mobileAppleAuth({
      platform: 'ios',
      idToken: 'apple-token',
    } as any);
    expect(result.access_token).toBe('access');
  });

  it('mobileAppleAuth uses default names when provider payload has blanks', async () => {
    appleOAuthConfig.validatePlatformConfiguration.mockReturnValue({
      valid: true,
      errors: [],
    });
    appleTokenValidation.validateIdToken.mockResolvedValue({
      appleId: 'apple-1',
      email: 'user@example.com',
      firstName: '',
      lastName: '',
    });
    const spy = jest.spyOn(service, 'findOrCreateAppleUser').mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      profile: null,
    });

    await service.mobileAppleAuth({
      platform: 'ios',
      idToken: 'apple-token',
    } as any);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Apple User',
        lastName: '',
      }),
    );
  });

  it('mobileAppleAuth maps unknown errors to APPLE_AUTH_FAILED', async () => {
    authDomainService.validateAppleIdTokenFormat.mockImplementationOnce(() => {
      throw new Error('unexpected');
    });
    await expect(
      service.mobileAppleAuth({
        platform: 'ios',
        idToken: 'apple-token',
      } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('findOrCreateGoogleUser handles linked googleId existing user path', async () => {
    authRepository.findByGoogleId.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId.mockResolvedValue({
      id: 'profile-1',
      authId: 'auth-1',
      name: 'Jane',
      lastname: 'Doe',
      age: 30,
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    const result = await service.findOrCreateGoogleUser({
      googleId: 'google-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
    });
    expect(result.access_token).toBe('access');
  });

  it('findOrCreateGoogleUser handles email-link path and duplicate creation rejection', async () => {
    authRepository.findByGoogleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce({ id: 'auth-1', email: 'user@example.com', role: ['USER'] })
      .mockResolvedValueOnce({ id: 'auth-1' });
    authRepository.update.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId.mockResolvedValue(null);
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    await service.findOrCreateGoogleUser({
      googleId: 'google-2',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
    });

    authRepository.findByEmail.mockReset();
    authRepository.findByGoogleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' });
    authDomainService.canCreateUser.mockReturnValue(false);
    await expect(
      service.findOrCreateGoogleUser({
        googleId: 'google-3',
        email: 'dupe@example.com',
        firstName: 'Dupe',
        lastName: 'User',
        age: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findOrCreateGoogleUser covers create-new success and post-create missing user', async () => {
    authRepository.findByGoogleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    authDomainService.canCreateUser.mockReturnValue(true);
    commandBus.execute.mockResolvedValue(undefined);
    authRepository.findById.mockResolvedValueOnce({
      id: 'auth-generated',
      email: 'new@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId.mockResolvedValue(null);
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    const created = await service.findOrCreateGoogleUser({
      googleId: 'google-new',
      email: 'new@example.com',
      firstName: '',
      lastName: '',
      age: undefined as any,
    });
    expect(created.access_token).toBe('access');

    authRepository.findByEmail.mockReset();
    authRepository.findByGoogleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    authDomainService.canCreateUser.mockReturnValue(true);
    authRepository.findById.mockResolvedValueOnce(null);
    await expect(
      service.findOrCreateGoogleUser({
        googleId: 'google-new-2',
        email: 'new2@example.com',
        firstName: 'New',
        lastName: 'User',
        age: 20,
      }),
    ).rejects.toThrow('Google registration failed - user not found after creation');
  });

  it('findOrCreateGoogleUser updates profile fields and tolerates update-profile failure', async () => {
    authRepository.findByGoogleId.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId
      .mockResolvedValueOnce({
        id: 'profile-1',
        authId: 'auth-1',
        name: 'Google User',
        lastname: '',
        age: 0,
      })
      .mockResolvedValueOnce({
        id: 'profile-1',
        authId: 'auth-1',
        name: 'Jane',
        lastname: 'Doe',
        age: 20,
      });
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    await service.findOrCreateGoogleUser({
      googleId: 'google-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 20,
    });
    expect(profileRepository.update).toHaveBeenCalledWith('profile-1', {
      name: 'Jane',
      lastname: 'Doe',
    });

    profileRepository.findByAuthId
      .mockReset()
      .mockRejectedValueOnce(new Error('profile read failed'))
      .mockResolvedValueOnce(null);
    jwtService.signAsync
      .mockResolvedValueOnce('access-2')
      .mockResolvedValueOnce('refresh-2');
    await expect(
      service.findOrCreateGoogleUser({
        googleId: 'google-1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        age: 20,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        access_token: 'access-2',
        profile: null,
      }),
    );
  });

  it('findOrCreateAppleUser covers existing-apple and duplicate-email rejection', async () => {
    authRepository.findByAppleId.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId.mockResolvedValue(null);
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
    await service.findOrCreateAppleUser({
      appleId: 'apple-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
    });

    authRepository.findByAppleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing' });
    authDomainService.canCreateUser.mockReturnValue(false);
    await expect(
      service.findOrCreateAppleUser({
        appleId: 'apple-2',
        email: 'dupe@example.com',
        firstName: 'Dupe',
        lastName: 'User',
        age: 20,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findOrCreateAppleUser covers email-link path and create-missing-user failure', async () => {
    authRepository.findByAppleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce({ id: 'auth-1', email: 'user@example.com', role: ['USER'] })
      .mockResolvedValueOnce({ id: 'auth-1' });
    authRepository.update.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId.mockResolvedValue(null);
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
    await service.findOrCreateAppleUser({
      appleId: 'apple-link',
      email: 'user@example.com',
      firstName: 'Link',
      lastName: 'User',
      age: 20,
    });

    authRepository.findByEmail.mockReset();
    authRepository.findByAppleId.mockResolvedValue(null);
    authRepository.findByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    authDomainService.canCreateUser.mockReturnValue(true);
    authRepository.findById.mockResolvedValueOnce(null);
    await expect(
      service.findOrCreateAppleUser({
        appleId: 'apple-new',
        email: 'new@example.com',
        firstName: '',
        lastName: '',
        age: undefined as any,
      }),
    ).rejects.toThrow('Apple registration failed - user not found after creation');
  });

  it('findOrCreateAppleUser updates profile fields and tolerates update-profile failure', async () => {
    authRepository.findByAppleId.mockResolvedValue({
      id: 'auth-1',
      email: 'user@example.com',
      role: ['USER'],
    });
    profileRepository.findByAuthId
      .mockResolvedValueOnce({
        id: 'profile-1',
        authId: 'auth-1',
        name: 'Apple User',
        lastname: '',
        age: 0,
      })
      .mockResolvedValueOnce({
        id: 'profile-1',
        authId: 'auth-1',
        name: 'Jane',
        lastname: 'Doe',
        age: 20,
      });
    jwtService.signAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    await service.findOrCreateAppleUser({
      appleId: 'apple-1',
      email: 'user@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 20,
    });
    expect(profileRepository.update).toHaveBeenCalledWith('profile-1', {
      name: 'Jane',
      lastname: 'Doe',
    });

    profileRepository.findByAuthId
      .mockReset()
      .mockRejectedValueOnce(new Error('profile read failed'))
      .mockResolvedValueOnce(null);
    jwtService.signAsync
      .mockResolvedValueOnce('access-2')
      .mockResolvedValueOnce('refresh-2');
    await expect(
      service.findOrCreateAppleUser({
        appleId: 'apple-1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        age: 20,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        access_token: 'access-2',
        profile: null,
      }),
    );
  });
});
