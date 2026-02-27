import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: 'profile-123' })
  readonly id: string;

  @ApiProperty({ example: 'auth-123', required: false })
  readonly authId?: string;

  @ApiProperty({ example: 'John Doe' })
  readonly name: string;

  @ApiProperty({ example: 'Doe', required: false, nullable: true })
  readonly lastname?: string;

  @ApiProperty({ example: 25, required: false })
  readonly age?: number;
}

export class TokenRefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly access_token: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly refresh_token: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Registration successful - you are now logged in.' })
  readonly message: string;

  @ApiProperty({ example: 'auth-123', required: false })
  readonly authId?: string;

  @ApiProperty({ example: 'profile-123', required: false })
  readonly profileId?: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly access_token: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  readonly refresh_token: string;

  @ApiProperty({ type: ProfileResponseDto, required: false, nullable: true })
  readonly profile?: ProfileResponseDto | null;
}
