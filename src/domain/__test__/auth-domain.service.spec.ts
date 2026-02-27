import { AuthDomainService } from '@domain/services/auth-domain.service';
import { AuthUser } from '@domain/auth';
import { Role } from '@domain/shared/enums/role.enum';

describe('AuthDomainService', () => {
  let service: AuthDomainService;

  beforeEach(() => {
    service = new AuthDomainService();
  });

  function user(overrides: Partial<AuthUser> = {}): AuthUser {
    return {
      id: 'auth-1',
      email: 'user@example.com',
      password: 'Password1',
      role: [Role.USER],
      ...overrides,
    };
  }

  it('returns null for login validation when email or password is missing', () => {
    expect(service.validateUserLogin('', 'Password1', user())).toBeNull();
    expect(service.validateUserLogin('user@example.com', '', user())).toBeNull();
  });

  it('returns null for login validation when user is missing', () => {
    expect(
      service.validateUserLogin('user@example.com', 'Password1', null),
    ).toBeNull();
  });

  it('returns repository user for valid login input', () => {
    const existing = user();
    expect(
      service.validateUserLogin('user@example.com', 'Password1', existing),
    ).toBe(existing);
  });

  it('validates admin and role checks correctly', () => {
    const adminUser = user({ role: [Role.ADMIN] });
    expect(service.canPerformAdminActions(adminUser)).toBe(true);
    expect(service.hasRole(adminUser, Role.ADMIN)).toBe(true);
    expect(service.hasRole(adminUser, Role.USER)).toBe(false);
  });

  it('allows self-delete or admin-delete only', () => {
    const target = user({ id: 'auth-target' });
    expect(service.canDeleteUser(target, 'auth-target', false)).toBe(true);
    expect(service.canDeleteUser(target, 'admin-id', true)).toBe(true);
    expect(service.canDeleteUser(target, 'other-id', false)).toBe(false);
  });

  it('supports user creation only when no existing user exists', () => {
    expect(service.canCreateUser(null)).toBe(true);
    expect(service.canCreateUser(user())).toBe(false);
  });

  it('throws for duplicate external user creation', () => {
    expect(() =>
      service.createExternalUserEntity(
        {
          providerId: 'google-1',
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          provider: 'google',
        },
        user(),
      ),
    ).toThrow('User already exists with this email');
  });

  it('creates external google user entity with generated id and role', () => {
    const created = service.createExternalUserEntity(
      {
        providerId: 'google-1',
        email: 'new@example.com',
        firstName: 'John',
        lastName: 'Doe',
        provider: 'google',
      },
      null,
    );
    expect(created.id).toMatch(/^auth-/);
    expect(created.googleId).toBe('google-1');
    expect(created.role).toEqual([Role.USER]);
  });

  it('validates password and email format rules', () => {
    expect(service.isPasswordValid('Password1')).toBe(true);
    expect(service.isPasswordValid('weak')).toBe(false);
    expect(service.isEmailValid('valid@example.com')).toBe(true);
    expect(service.isEmailValid('invalid-email')).toBe(false);
  });

  it('throws on invalid user creation payload and duplicate users', () => {
    expect(() =>
      service.validateUserCreation({
        email: 'invalid',
        password: 'Password1',
      }),
    ).toThrow('Invalid email format');

    expect(() =>
      service.validateUserCreation({
        email: 'valid@example.com',
        password: 'weak',
      }),
    ).toThrow('Password does not meet requirements');

    expect(() =>
      service.createUserEntity(
        { email: 'user@example.com', password: 'Password1' },
        user(),
      ),
    ).toThrow('User already exists with this email');
  });

  it('creates regular user entity for valid payload', () => {
    const created = service.createUserEntity(
      { email: 'new@example.com', password: 'Password1' },
      null,
    );
    expect(created.id).toMatch(/^auth-/);
    expect(created.email).toBe('new@example.com');
    expect(created.role).toEqual([Role.USER]);
  });

  it('validates mobile OAuth platform and token/code flow constraints', () => {
    expect(service.isPlatformSupported('ios')).toBe(true);
    expect(service.isPlatformSupported('android')).toBe(true);
    expect(service.isPlatformSupported('web')).toBe(false);

    expect(() =>
      service.validateMobileOAuthData({
        platform: 'web' as any,
        idToken: 'id',
      }),
    ).toThrow('Unsupported platform: web');

    expect(() =>
      service.validateMobileOAuthData({
        platform: 'ios',
        idToken: 'id',
        code: 'code',
      }),
    ).toThrow('Cannot provide both idToken and code. Choose one authentication method.');

    expect(() =>
      service.validateMobileOAuthData({
        platform: 'ios',
      }),
    ).toThrow('Either idToken or code must be provided');

    expect(() =>
      service.validateMobileOAuthData({
        platform: 'android',
        code: 'authorization-code',
      }),
    ).toThrow('Code verifier is required when using authorization code flow');
  });

  it('validates token and PKCE input formats', () => {
    expect(() => service.validateIdTokenFormat('')).toThrow('ID token is required');
    expect(() => service.validateAuthorizationCodeFormat('')).toThrow(
      'Authorization code is required',
    );

    expect(() => service.validateCodeVerifierFormat('')).toThrow(
      'Code verifier is required for PKCE flow',
    );
    expect(() => service.validateCodeVerifierFormat('a'.repeat(42))).toThrow(
      'Code verifier must be between 43 and 128 characters',
    );
    expect(() => service.validateCodeVerifierFormat('!'.repeat(43))).toThrow(
      'Code verifier contains invalid characters',
    );
    expect(() =>
      service.validateCodeVerifierFormat('a'.repeat(43)),
    ).not.toThrow();

    expect(() => service.validateIdTokenFormat('   ')).toThrow(
      'ID token is required',
    );
    expect(() => service.validateAuthorizationCodeFormat('   ')).toThrow(
      'Authorization code is required',
    );
    expect(() => service.validateAppleIdTokenFormat('   ')).toThrow(
      'Apple ID token is required',
    );
  });

  it('validates Google and Apple token user data', () => {
    expect(() => service.validateGoogleUserData({ sub: '', email: 'a@b.com' })).toThrow(
      'Invalid user data: missing subject',
    );
    expect(() => service.validateGoogleUserData({ sub: 'sub', email: '' })).toThrow(
      'Invalid user data: missing email',
    );
    expect(() =>
      service.validateGoogleUserData({ sub: 'sub', email: 'invalid' }),
    ).toThrow('Invalid email format in user data');

    expect(() => service.validateAppleUserData({ sub: '', email: 'a@b.com' })).toThrow(
      'Invalid user data: missing subject',
    );
    expect(() => service.validateAppleUserData({ sub: 'sub', email: '' })).toThrow(
      'Invalid user data: missing email',
    );
    expect(() =>
      service.validateAppleUserData({ sub: 'sub', email: 'invalid' }),
    ).toThrow('Invalid email format in user data');

    expect(() =>
      service.validateAppleIdTokenFormat(''),
    ).toThrow('Apple ID token is required');
  });

  it('validates password change business rules', () => {
    expect(() =>
      service.validatePasswordChangeData({
        oldPassword: 'Password1',
        newPassword: 'weak',
      }),
    ).toThrow(
      'Password must include at least one uppercase letter, one lowercase letter, and one number',
    );

    expect(() =>
      service.validatePasswordChangeData({
        oldPassword: 'Password1',
        newPassword: 'Password1',
      }),
    ).toThrow('New password must be different from old password');

    expect(() =>
      service.validatePasswordChangeData({
        oldPassword: 'Password1',
        newPassword: 'NewPassword2',
      }),
    ).not.toThrow();
  });

  it('returns user existence for deletion checks', () => {
    expect(service.userExistsForDeletion(user())).toBe(true);
    expect(service.userExistsForDeletion(null)).toBe(false);
  });
});
