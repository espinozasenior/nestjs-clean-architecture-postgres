export type JWTPayload = Record<string, unknown> & {
  sub?: string;
  email?: string;
  aud?: string | string[];
};

export const createRemoteJWKSet = () => ({});

export const jwtVerify = async () => ({
  payload: {
    sub: 'apple-test-user',
    email: 'apple-test@example.com',
    aud: 'test-audience',
    iss: 'https://appleid.apple.com',
  } as JWTPayload,
});

export const decodeJwt = () => ({
  aud: 'test-audience',
});
