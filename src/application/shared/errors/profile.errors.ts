export enum ProfileError {
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  PROFILE_ID_REQUIRED = 'PROFILE_ID_REQUIRED',
}

export const ProfileErrorMessage: Record<ProfileError, string> = {
  [ProfileError.PROFILE_NOT_FOUND]: 'Profile not found',
  [ProfileError.PROFILE_ID_REQUIRED]: 'Profile id is required',
};

