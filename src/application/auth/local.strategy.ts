import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '@application/auth/auth.service';
import { AuthError, AuthErrorMessage } from '@application/shared/errors';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException({
        code: AuthError.INVALID_CREDENTIALS,
        message: AuthErrorMessage[AuthError.INVALID_CREDENTIALS],
      });
    }
    return user;
  }
}