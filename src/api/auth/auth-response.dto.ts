import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ProfileResponseDto {
  @Expose()
  @ApiProperty({ example: 'profile-123' })
  readonly id: string;

  @Expose()
  @ApiProperty({ example: 'auth-123', required: false })
  readonly authId?: string;

  @Expose()
  @ApiProperty({ example: 'John Doe' })
  readonly name: string;

  @Expose()
  @ApiProperty({ example: 'Doe', required: false, nullable: true })
  readonly lastname?: string;

  @Expose()
  @ApiProperty({ example: 25, required: false })
  readonly age?: number;
}

@Exclude()
export class TokenRefreshResponseDto {
  @Expose()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly access_token: string;

  @Expose()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly refresh_token: string;
}

@Exclude()
export class AuthResponseDto {
  @Expose()
  @ApiProperty({ example: 'Registration successful - you are now logged in.' })
  readonly message: string;

  @Expose()
  @ApiProperty({ example: 'auth-123', required: false })
  readonly authId?: string;

  @Expose()
  @ApiProperty({ example: 'profile-123', required: false })
  readonly profileId?: string;

  @Expose()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly access_token: string;

  @Expose()
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly refresh_token: string;

  @Expose()
  @ApiProperty({ type: ProfileResponseDto, required: false, nullable: true })
  readonly profile?: ProfileResponseDto | null;
}
