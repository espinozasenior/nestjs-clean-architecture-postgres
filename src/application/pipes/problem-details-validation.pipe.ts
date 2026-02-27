import { HttpStatus, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';

type ProblemDetailsValidationError = {
  field: string;
  message: string;
};

function mapValidationErrors(errors: ValidationError[]): ProblemDetailsValidationError[] {
  return errors.flatMap((error) => {
    const messages = error.constraints ? Object.values(error.constraints) : [];
    const children = error.children ? mapValidationErrors(error.children) : [];
    const current = messages.map((message) => ({
      field: error.property || 'unknown',
      message,
    }));

    return [...current, ...children];
  });
}

export class ProblemDetailsValidationPipe extends ValidationPipe {
  constructor(options: ValidationPipeOptions = {}) {
    super({
      ...options,
      exceptionFactory: (errors: ValidationError[] = []) => {
        const mappedErrors = mapValidationErrors(errors);

        return new ProblemDetailException(HttpStatus.BAD_REQUEST, {
          type: `https://httpstatuses.com/${HttpStatus.BAD_REQUEST}`,
          title: 'Bad Request',
          status: HttpStatus.BAD_REQUEST,
          detail: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: mappedErrors,
        } as any);
      },
    });
  }
}
