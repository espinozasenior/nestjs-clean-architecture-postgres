import { CreateAuthUserCommand } from '@application/auth/command/create-auth-user.command';
import { AuthUserCreatedEvent } from '@application/auth/events/auth-user-created.event';
import { AuthError, AuthErrorMessage } from '@application/shared/errors';
import { LoggerService } from '@application/services/logger.service';
import { IAuthRepository } from '@domain/auth';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

@CommandHandler(CreateAuthUserCommand)
export class CreateAuthUserHandler
  implements ICommandHandler<CreateAuthUserCommand>
{
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    private readonly eventBus: EventBus,
    private readonly logger: LoggerService,
    private readonly authDomainService: AuthDomainService,
  ) {}

  async execute(command: CreateAuthUserCommand): Promise<void> {
    const { registerAuthDto, authId, profileId } = command;
    const { email, password, name, lastname, age } = registerAuthDto;
    const context = { module: 'CreateAuthUserHandler', method: 'execute' };

    this.logger.logger(
      `Starting user registration for email: ${email}`,
      context,
    );

    this.authDomainService.validateUserCreation(registerAuthDto);

    const existingUser = await this.authRepository.findByEmail(email);
    const canCreate = this.authDomainService.canCreateUser(existingUser);
    if (!canCreate) {
      this.logger.warning(
        `Registration failed - email already exists: ${email}`,
        context,
      );
      throw new ConflictException({
        code: AuthError.EMAIL_ALREADY_EXISTS,
        message: AuthErrorMessage[AuthError.EMAIL_ALREADY_EXISTS],
      });
    }

    await this.authRepository.create({
      id: authId,
      email,
      password,
    });

    this.logger.logger(
      `Auth user created successfully with ID: ${authId}. Dispatching event.`,
      context,
    );

    await this.eventBus.publish(
      new AuthUserCreatedEvent(authId, profileId, name, lastname, age),
    );
  }
}
