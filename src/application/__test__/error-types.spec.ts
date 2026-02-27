import {
  AuthError,
  DEFAULT_PROBLEM_TYPE_BASE_URL,
  ErrorType,
  ProfileError,
  buildErrorType,
  getProblemTypeFromCode,
} from '@application/shared/errors';

describe('ErrorType helpers', () => {
  it('returns mapped URI for known enum code', () => {
    const type = getProblemTypeFromCode(AuthError.USER_NOT_FOUND);
    expect(type).toBe(`${DEFAULT_PROBLEM_TYPE_BASE_URL}/auth/user-not-found`);
  });

  it('returns about:blank for unknown code', () => {
    const type = getProblemTypeFromCode('UNKNOWN_ERROR_CODE');
    expect(type).toBe('about:blank');
  });

  it('returns about:blank for non-string code values', () => {
    expect(getProblemTypeFromCode(null)).toBe('about:blank');
    expect(getProblemTypeFromCode(123)).toBe('about:blank');
    expect(getProblemTypeFromCode({ code: AuthError.USER_NOT_FOUND })).toBe(
      'about:blank',
    );
  });

  it('returns about:blank for case-mismatched codes', () => {
    const type = getProblemTypeFromCode('auth_user_not_found');
    expect(type).toBe('about:blank');
  });

  it('builds map using custom base URL and trims trailing slash', () => {
    const map = buildErrorType('https://errors.example.com///');
    expect(map[AuthError.INVALID_CREDENTIALS]).toBe(
      'https://errors.example.com/auth/invalid-credentials',
    );
    expect(map[ProfileError.PROFILE_NOT_FOUND]).toBe(
      'https://errors.example.com/profile/not-found',
    );
  });

  it('supports codes without underscore path separators (fallback branch)', () => {
    jest.resetModules();
    jest.isolateModules(() => {
      jest.doMock('@application/shared/errors/auth.errors', () => ({
        AuthError: { SIMPLE: 'SIMPLE' },
      }));
      jest.doMock('@application/shared/errors/profile.errors', () => ({
        ProfileError: { PLAIN: 'PLAIN' },
      }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const dynamic = require('@application/shared/errors/error-types');
      const map = dynamic.buildErrorType('https://errors.example.com');
      expect(map.SIMPLE).toBe('https://errors.example.com/simple');
      expect(map.PLAIN).toBe('https://errors.example.com/plain');
    });
  });

  it('buildErrorType default uses default base url map', () => {
    const map = buildErrorType();
    expect(map[AuthError.USER_NOT_FOUND]).toBe(
      `${DEFAULT_PROBLEM_TYPE_BASE_URL}/auth/user-not-found`,
    );
    expect(map[AuthError.USER_NOT_FOUND]).toBe(
      ErrorType[AuthError.USER_NOT_FOUND],
    );
  });

  it('uses cached default map branch in getProblemTypeFromCode', () => {
    const type = getProblemTypeFromCode(
      AuthError.INVALID_REFRESH_TOKEN,
      DEFAULT_PROBLEM_TYPE_BASE_URL,
    );
    expect(type).toBe(
      `${DEFAULT_PROBLEM_TYPE_BASE_URL}/auth/invalid-refresh-token`,
    );
  });
});
