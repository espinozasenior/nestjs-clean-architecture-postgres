import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthError, AuthErrorMessage } from '@application/shared/errors';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { LoggerService } from './logger.service';
import { MobileOAuthConfigService } from './mobile-oauth-config.service';

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
}

export interface JWKSTokenValidationResult {
  isValid: boolean;
  userInfo?: GoogleUserInfo;
  error?: string;
}

@Injectable()
export class JWKSTokenValidationService {
  private jwks: any;
  private readonly GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
  private readonly GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

  constructor(
    private readonly mobileOAuthConfig: MobileOAuthConfigService,
    private readonly logger: LoggerService,
  ) {
    this.initializeJWKS();
  }

  private async initializeJWKS() {
    try {
      this.jwks = createRemoteJWKSet(new URL(this.GOOGLE_JWKS_URL));
      this.logger.logger('JWKS initialized successfully', {
        module: 'JWKSTokenValidationService',
        method: 'initializeJWKS',
      });
    } catch (error) {
      this.logger.err(`Failed to initialize JWKS: ${error.message}`, {
        module: 'JWKSTokenValidationService',
        method: 'initializeJWKS',
      });
      // Set jwks to null to indicate initialization failure
      this.jwks = null;
    }
  }

  /**
   * Verify Google ID token using JWKS with enhanced security
   */
  async verifyIdToken(
    idToken: string,
    platform: 'ios' | 'android',
    expectedNonce?: string,
  ): Promise<GoogleUserInfo> {
    const context = { module: 'JWKSTokenValidationService', method: 'verifyIdToken' };

    try {
      this.logger.logger(`Verifying ID token for ${platform} platform using JWKS`, context);

      if (!this.jwks) {
        throw new UnauthorizedException({
          code: AuthError.JWKS_NOT_INITIALIZED,
          message: AuthErrorMessage[AuthError.JWKS_NOT_INITIALIZED],
        });
      }

      // Get expected audience for the platform
      const expectedAudience = this.mobileOAuthConfig.getAudience(platform);

      // Verify JWT signature and claims
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.GOOGLE_ISSUERS,
        audience: expectedAudience,
        clockTolerance: '5s', // Allow 5 seconds clock skew
      });

      // Validate required claims
      this.validateRequiredClaims(payload);

      // Validate nonce if provided (important for security)
      if (expectedNonce) {
        if (!payload.nonce) {
          throw new UnauthorizedException({
            code: AuthError.NONCE_MISSING,
            message: AuthErrorMessage[AuthError.NONCE_MISSING],
          });
        }
        if (payload.nonce !== expectedNonce) {
          throw new UnauthorizedException({
            code: AuthError.NONCE_INVALID,
            message: AuthErrorMessage[AuthError.NONCE_INVALID],
          });
        }
      }

      // Extract user information
      const lastName = typeof payload.family_name === 'string'
        ? payload.family_name
        : payload.name
          ? String(payload.name)
            .split(' ')
            .slice(1)
            .join(' ')
          : '';

      const userInfo: GoogleUserInfo = {
        googleId: String(payload.sub),
        email: String(payload.email),
        firstName: String(payload.given_name || payload.name || 'Google User'),
        lastName,
        picture: String(payload.picture || ''),
      };

      this.logger.logger(`ID token verification successful for ${platform} using JWKS`, context);

      return userInfo;
    } catch (error) {
      this.logger.err(`ID token verification failed for ${platform}: ${error.message}`, context);

      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      // Handle JWT verification errors with more specific messages
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException({
          code: AuthError.ID_TOKEN_EXPIRED,
          message: AuthErrorMessage[AuthError.ID_TOKEN_EXPIRED],
        });
      }

      if (error.code === 'ERR_JWT_INVALID') {
        throw new UnauthorizedException({
          code: AuthError.ID_TOKEN_INVALID_FORMAT,
          message: AuthErrorMessage[AuthError.ID_TOKEN_INVALID_FORMAT],
        });
      }

      if (error.code === 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED') {
        throw new UnauthorizedException({
          code: AuthError.ID_TOKEN_SIGNATURE_INVALID,
          message: AuthErrorMessage[AuthError.ID_TOKEN_SIGNATURE_INVALID],
        });
      }

      if (error.code === 'ERR_JWT_AUDIENCE_INVALID') {
        throw new UnauthorizedException({
          code: AuthError.ID_TOKEN_AUDIENCE_INVALID,
          message: AuthErrorMessage[AuthError.ID_TOKEN_AUDIENCE_INVALID],
        });
      }

      if (error.code === 'ERR_JWT_ISSUER_INVALID') {
        throw new UnauthorizedException({
          code: AuthError.ID_TOKEN_ISSUER_INVALID,
          message: AuthErrorMessage[AuthError.ID_TOKEN_ISSUER_INVALID],
        });
      }

      if (error.code === 'ERR_JWKS_NO_MATCHING_KEY') {
        throw new UnauthorizedException({
          code: AuthError.JWKS_NO_MATCHING_KEY,
          message: AuthErrorMessage[AuthError.JWKS_NO_MATCHING_KEY],
        });
      }

      throw new UnauthorizedException({
        code: AuthError.ID_TOKEN_VERIFICATION_FAILED,
        message: AuthErrorMessage[AuthError.ID_TOKEN_VERIFICATION_FAILED],
        details: error.message,
      });
    }
  }

  /**
   * Validate required claims in the JWT payload
   */
  private validateRequiredClaims(payload: JWTPayload): void {
    const requiredClaims = ['sub', 'email'];
    const missingClaims = requiredClaims.filter(claim => !payload[claim]);

    if (missingClaims.length > 0) {
      throw new UnauthorizedException({
        code: AuthError.REQUIRED_CLAIMS_MISSING,
        message: AuthErrorMessage[AuthError.REQUIRED_CLAIMS_MISSING],
        details: { missingClaims },
      });
    }

    // Validate email format
    const email = String(payload.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new UnauthorizedException({
        code: AuthError.ID_TOKEN_EMAIL_INVALID,
        message: AuthErrorMessage[AuthError.ID_TOKEN_EMAIL_INVALID],
      });
    }

    // Validate sub (subject) is not empty
    if (!payload.sub || String(payload.sub).trim() === '') {
      throw new UnauthorizedException({
        code: AuthError.ID_TOKEN_SUBJECT_INVALID,
        message: AuthErrorMessage[AuthError.ID_TOKEN_SUBJECT_INVALID],
      });
    }
  }

  /**
   * Check if JWKS is properly initialized
   */
  isJWKSInitialized(): boolean {
    return !!this.jwks;
  }

  /**
   * Get JWKS status for health checks
   */
  getJWKSStatus(): { initialized: boolean; url: string } {
    return {
      initialized: this.isJWKSInitialized(),
      url: this.GOOGLE_JWKS_URL,
    };
  }

  /**
   * Refresh JWKS if initialization failed or needs update
   */
  async refreshJWKS(): Promise<void> {
    const context = { module: 'JWKSTokenValidationService', method: 'refreshJWKS' };
    this.logger.logger('Refreshing JWKS...', context);
    await this.initializeJWKS();
  }
}
