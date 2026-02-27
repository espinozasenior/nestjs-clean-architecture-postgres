import { CreateAuthUserCommand } from '@application/auth/command/create-auth-user.command';
import { CreateGoogleAuthUserCommand } from '@application/auth/command/create-google-auth-user.command';
import { CreateAppleAuthUserCommand } from '@application/auth/command/create-apple-auth-user.command';

describe('Auth Commands', () => {
  it('creates CreateAuthUserCommand with expected payload', () => {
    const dto = {
      email: 'user@example.com',
      password: 'Password1',
      name: 'John',
      lastname: 'Doe',
      age: 30,
    };
    const command = new CreateAuthUserCommand(dto as any, 'auth-1', 'profile-1');
    expect(command.registerAuthDto).toBe(dto);
    expect(command.authId).toBe('auth-1');
    expect(command.profileId).toBe('profile-1');
  });

  it('creates CreateGoogleAuthUserCommand with expected payload', () => {
    const dto = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      googleId: 'google-1',
    };
    const command = new CreateGoogleAuthUserCommand(dto, 'auth-1', 'profile-1');
    expect(command.payload).toBe(dto);
    expect(command.authId).toBe('auth-1');
    expect(command.profileId).toBe('profile-1');
  });

  it('creates CreateAppleAuthUserCommand with expected payload', () => {
    const dto = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      appleId: 'apple-1',
    };
    const command = new CreateAppleAuthUserCommand(dto, 'auth-1', 'profile-1');
    expect(command.payload).toBe(dto);
    expect(command.authId).toBe('auth-1');
    expect(command.profileId).toBe('profile-1');
  });
});
