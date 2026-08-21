import { apiRequest } from '../../../lib/api';
import type {
  CreatePostData,
  CreateStoryData,
  PresenceStatus,
  ProfilePatch,
  SocialDataService,
  SocialPostData,
  SocialProfileData,
  SocialSnapshot,
  SocialStoryData,
} from './SocialDataService';
import { seedDemoAiProfiles } from './demoSocialDataAdapter';

// Real adapter: every call is bound to the authenticated user by the API.
// The client never sends its own identity.

const BASE = '/api/v1/social';

interface ApiProfile {
  id: string;
  type: 'AI' | 'REAL_PERSON';
  handle: string;
  displayName: string;
  headline: string;
  bio: string;
  interests: string[];
  presence: PresenceStatus;
  agentId: string | null;
  verified: boolean;
  discoverable: boolean;
  followers: number;
  following: number;
  followedByViewer: boolean;
  joinedAt: string;
  stories: SocialStoryData[];
  posts: SocialPostData[];
}

function toProfile(profile: ApiProfile): SocialProfileData {
  return {
    id: profile.id,
    type: profile.type,
    displayName: profile.displayName,
    handle: profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`,
    headline: profile.headline,
    bio: profile.bio,
    interests: profile.interests ?? [],
    presence: profile.presence,
    agentId: profile.agentId,
    verified: profile.verified,
    discoverable: profile.discoverable,
    followers: profile.followers,
    following: profile.following,
    followedByViewer: profile.followedByViewer,
    joinedAt: profile.joinedAt,
    stories: profile.stories ?? [],
    posts: profile.posts ?? [],
  };
}

/** Writes to other people's profiles have no API today; fail loudly instead of faking success. */
function assertSelf(profileId: string, selfProfileId: string | null): void {
  if (!selfProfileId || profileId !== selfProfileId) {
    throw new Error('This action is only available on your own profile.');
  }
}

export class ApiSocialDataAdapter implements SocialDataService {
  readonly mode = 'REAL' as const;

  private selfProfileId: string | null = null;

  async loadSnapshot(): Promise<SocialSnapshot> {
    const me = await apiRequest<ApiProfile>(`${BASE}/me`);
    this.selfProfileId = me.id;
    const profiles = await apiRequest<ApiProfile[]>(`${BASE}/profiles`);
    const merged = profiles.some((profile) => profile.id === me.id) ? profiles : [me, ...profiles];
    const realProfiles = merged.map(toProfile);
    // AI companions are persisted rows now. Demo companions are a fallback only when the
    // backend has none seeded, so the two never shadow each other.
    const hasPersistedCompanions = realProfiles.some((profile) => profile.type === 'AI');
    const demoAiProfiles = hasPersistedCompanions ? [] : seedDemoAiProfiles();
    return { currentProfileId: me.id, profiles: [...demoAiProfiles, ...realProfiles] };
  }

  async updateProfile(profileId: string, patch: ProfilePatch): Promise<void> {
    assertSelf(profileId, this.selfProfileId);
    await apiRequest<ApiProfile>(`${BASE}/me`, { method: 'PATCH', body: patch });
  }

  async setPresence(profileId: string, presence: PresenceStatus): Promise<void> {
    assertSelf(profileId, this.selfProfileId);
    await apiRequest<ApiProfile>(`${BASE}/me`, { method: 'PATCH', body: { presence } });
  }

  async setDiscoverable(profileId: string, discoverable: boolean): Promise<void> {
    assertSelf(profileId, this.selfProfileId);
    await apiRequest<ApiProfile>(`${BASE}/me`, { method: 'PATCH', body: { discoverable } });
  }

  async setFollowing(profileId: string, following: boolean): Promise<void> {
    await apiRequest<ApiProfile>(`${BASE}/profiles/${profileId}/follow`, {
      method: following ? 'POST' : 'DELETE',
    });
  }

  async createPost(profileId: string, input: CreatePostData): Promise<SocialPostData> {
    assertSelf(profileId, this.selfProfileId);
    return apiRequest<SocialPostData>(`${BASE}/me/posts`, { method: 'POST', body: input });
  }

  async removePost(profileId: string, postId: string): Promise<void> {
    assertSelf(profileId, this.selfProfileId);
    await apiRequest<null>(`${BASE}/me/posts/${postId}`, { method: 'DELETE' });
  }

  async createStory(profileId: string, input: CreateStoryData): Promise<SocialStoryData> {
    assertSelf(profileId, this.selfProfileId);
    return apiRequest<SocialStoryData>(`${BASE}/me/stories`, { method: 'POST', body: input });
  }

  async expireStory(profileId: string, storyId: string): Promise<void> {
    assertSelf(profileId, this.selfProfileId);
    await apiRequest<null>(`${BASE}/me/stories/${storyId}`, { method: 'DELETE' });
  }
}

export const apiSocialDataService: SocialDataService = new ApiSocialDataAdapter();
