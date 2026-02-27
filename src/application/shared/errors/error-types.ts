import { AuthError } from './auth.errors';
import { ProfileError } from './profile.errors';

const FALLBACK_PROBLEM_TYPE_BASE_URL = 'https://api.yourapp.com/errors';
const PROBLEM_TYPE_FALLBACK = 'about:blank';

type ErrorCode = AuthError | ProfileError;

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function toTypePath(code: string): string {
  const [feature, ...rest] = code.toLowerCase().split('_');
  if (!feature || rest.length === 0) {
    return code.toLowerCase().replace(/_/g, '-');
  }

  return `${feature}/${rest.join('-')}`;
}

function createErrorTypeMap(baseUrl: string): Record<ErrorCode, string> {
  const normalizedBaseUrl = sanitizeBaseUrl(baseUrl);
  const codes = [...Object.values(AuthError), ...Object.values(ProfileError)] as ErrorCode[];

  return codes.reduce((map, code) => {
    map[code] = `${normalizedBaseUrl}/${toTypePath(code)}`;
    return map;
  }, {} as Record<ErrorCode, string>);
}

export const DEFAULT_PROBLEM_TYPE_BASE_URL =
  process.env.PROBLEM_TYPE_BASE_URL || FALLBACK_PROBLEM_TYPE_BASE_URL;

export const ErrorType = createErrorTypeMap(DEFAULT_PROBLEM_TYPE_BASE_URL);

export function buildErrorType(baseUrl = DEFAULT_PROBLEM_TYPE_BASE_URL): Record<ErrorCode, string> {
  return createErrorTypeMap(baseUrl);
}

export function getProblemTypeFromCode(
  code: unknown,
  baseUrl = DEFAULT_PROBLEM_TYPE_BASE_URL,
): string {
  if (typeof code !== 'string') {
    return PROBLEM_TYPE_FALLBACK;
  }

  const map =
    baseUrl === DEFAULT_PROBLEM_TYPE_BASE_URL
      ? (ErrorType as Record<string, string>)
      : (createErrorTypeMap(baseUrl) as Record<string, string>);

  return map[code] ?? PROBLEM_TYPE_FALLBACK;
}
