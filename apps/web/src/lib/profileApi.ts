import type {
  AgeVerificationResult,
  AuthResponse,
  AvatarUploadTarget,
  FullProfile,
  ProfileDetails,
  UserLanguage,
  UserPreferences,
} from '@aura/shared';
import { apiRequest, setAccessToken } from './api';

/** Payload accepted by PATCH /users/me. */
export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  primaryLanguage?: string;
  communicationStyle?: string;
  aiPersonality?: string;
  preferences?: UserPreferences;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
    }, false);
    setAccessToken(res.tokens.accessToken);
    return res;
  },

  async signup(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await apiRequest<AuthResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: { email, password, ...(name ? { name } : {}) },
    });
    setAccessToken(res.tokens.accessToken);
    return res;
  },

  async logout(): Promise<void> {
    await apiRequest<null>('/api/v1/auth/logout', { method: 'POST' }).catch(() => null);
    setAccessToken(null);
  },
};

export const profileApi = {
  getMe(): Promise<FullProfile> {
    return apiRequest<FullProfile>('/api/v1/users/me');
  },

  updateMe(payload: UpdateProfilePayload): Promise<FullProfile> {
    return apiRequest<FullProfile>('/api/v1/users/me', { method: 'PATCH', body: payload });
  },

  verifyAge(dateOfBirth: string): Promise<AgeVerificationResult> {
    return apiRequest<AgeVerificationResult>('/api/v1/users/me/age-verification', {
      method: 'POST',
      body: { dateOfBirth },
    });
  },

  getLanguages(): Promise<{ languages: UserLanguage[] }> {
    return apiRequest<{ languages: UserLanguage[] }>('/api/v1/users/me/languages');
  },

  setLanguages(languages: UserLanguage[]): Promise<{ languages: UserLanguage[] }> {
    return apiRequest<{ languages: UserLanguage[] }>('/api/v1/users/me/languages', {
      method: 'PUT',
      body: { languages },
    });
  },

  getInterests(): Promise<{ interests: string[] }> {
    return apiRequest<{ interests: string[] }>('/api/v1/users/me/interests');
  },

  setInterests(interests: string[]): Promise<{ interests: string[] }> {
    return apiRequest<{ interests: string[] }>('/api/v1/users/me/interests', {
      method: 'PUT',
      body: { interests },
    });
  },

  avatarUploadUrl(contentType: string, sizeBytes: number): Promise<AvatarUploadTarget> {
    return apiRequest<AvatarUploadTarget>('/api/v1/users/me/avatar/upload-url', {
      method: 'POST',
      body: { contentType, sizeBytes },
    });
  },

  commitAvatar(objectKey: string): Promise<ProfileDetails> {
    return apiRequest<ProfileDetails>('/api/v1/users/me/avatar', {
      method: 'PUT',
      body: { objectKey },
    });
  },

  deleteAvatar(): Promise<ProfileDetails> {
    return apiRequest<ProfileDetails>('/api/v1/users/me/avatar', { method: 'DELETE' });
  },
};
