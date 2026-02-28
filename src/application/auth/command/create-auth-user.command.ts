import { RegisterRequestDto } from '@api/auth/register-request.dto';

export class CreateAuthUserCommand {
  constructor(
    public readonly registerAuthDto: RegisterRequestDto,
    public readonly authId: string,
    public readonly profileId: string,
  ) {}
} 