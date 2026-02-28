import {
  AuthResponseDto,
  ProfileResponseDto,
  TokenRefreshResponseDto,
} from '@api/auth/auth-response.dto';
import { instanceToPlain } from 'class-transformer';

describe('Auth Response DTO serialization', () => {
  it('serializes AuthResponseDto with only exposed fields', () => {
    const profile = Object.assign(new ProfileResponseDto(), {
      id: 'profile-1',
      authId: 'auth-1',
      name: 'John',
      lastname: 'Doe',
      age: 30,
      password: 'secret',
    } as any);

    const authResponse = Object.assign(new AuthResponseDto(), {
      message: 'Authentication successful',
      authId: 'auth-1',
      profileId: 'profile-1',
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      profile,
      password: 'super-secret',
    } as any);

    const plain = instanceToPlain(authResponse) as Record<string, unknown>;
    const serializedProfile = plain.profile as Record<string, unknown>;

    expect(plain.message).toBe('Authentication successful');
    expect(plain.access_token).toBe('access-token');
    expect(plain.refresh_token).toBe('refresh-token');
    expect(plain.password).toBeUndefined();
    expect(serializedProfile.password).toBeUndefined();
  });

  it('serializes TokenRefreshResponseDto with exposed token fields', () => {
    const dto = Object.assign(new TokenRefreshResponseDto(), {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      internal: 'hidden',
    } as any);

    const plain = instanceToPlain(dto) as Record<string, unknown>;

    expect(plain.access_token).toBe('access-token');
    expect(plain.refresh_token).toBe('refresh-token');
    expect(plain.internal).toBeUndefined();
  });
});
