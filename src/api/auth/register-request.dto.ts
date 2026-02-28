import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ description: "User's first name", example: 'John' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ description: "User's last name", example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  readonly lastname?: string;

  @ApiProperty({ description: "User's age", example: 30, required: false })
  @IsOptional()
  @IsNumber()
  readonly age?: number;

  @ApiProperty({ description: "User's email address", example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty({
    description: 'The password for the user',
    minLength: 8,
    example: 'mySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  readonly password: string;
}
