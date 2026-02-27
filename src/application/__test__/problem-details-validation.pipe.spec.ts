import { ProblemDetailsValidationPipe } from '@application/pipes/problem-details-validation.pipe';
import { ProblemDetailException } from '@sjfrhafe/nest-problem-details';
import { ValidationError } from 'class-validator';
import { IsEmail, IsInt, Min } from 'class-validator';

class CreateUserDto {
  @IsEmail()
  readonly email!: string;

  @IsInt()
  @Min(18)
  readonly age!: number;
}

describe('ProblemDetailsValidationPipe', () => {
  it('throws ProblemDetailException with RFC-shaped validation payload', async () => {
    const pipe = new ProblemDetailsValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    });

    const input = { email: 'invalid-email', age: 10 };

    try {
      await pipe.transform(input, {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      });
      fail('Expected validation to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemDetailException);

      const response = (error as ProblemDetailException).getResponse() as any;
      expect(response.status).toBe(400);
      expect(response.type).toBe('https://httpstatuses.com/400');
      expect(response.title).toBe('Bad Request');
      expect(response.detail).toBe('Validation failed');
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(response.errors)).toBe(true);
      expect(response.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('email'),
          }),
          expect.objectContaining({
            field: 'age',
            message: expect.any(String),
          }),
        ]),
      );
    }
  });

  it('maps nested validation children and unknown property fields', async () => {
    const pipe = new ProblemDetailsValidationPipe();
    const exceptionFactory = (pipe as any).exceptionFactory as (
      errors?: ValidationError[],
    ) => ProblemDetailException;

    const nestedChild = {
      property: '',
      constraints: {
        isNotEmpty: 'value should not be empty',
      },
      children: [],
    } as ValidationError;

    const root = {
      property: 'profile',
      constraints: undefined,
      children: [nestedChild],
    } as ValidationError;

    const problem = exceptionFactory([root]);
    const response = problem.getResponse() as any;

    expect(response.errors).toEqual([
      {
        field: 'unknown',
        message: 'value should not be empty',
      },
    ]);
  });
});
