import type { EntityType } from './SocialInteractionService';

// Data port for the social graph.
//
// Two adapters implement this contract:
//   DemoSocialDataAdapter -> in-memory seeds, no persistence
//   ApiSocialDataAdapter  -> Aura API (/api/v1/social), persisted per authenticated user
//
// The UI and the SocialRegistry depend only on this contract, so switching
// adapters never changes a screen.

export type SocialDataMode = 'DEMO' | 'REAL';

export type PresenceStatus = 'online' | 'away' | 'offline';
export type ProfileVisibility = 'public' | 'followers';

export interface SocialStoryData {
  id: string;
  caption: string;
  mediaLabel: string;
  createdAt: string;
  status: 'active' | 'expired';
  views: number;
}

export interface SocialPostData {
  id: string;
  caption: string;
  mediaLabel: string;
  createdAt: string;
  visibility: ProfileVisibility;
  likes: number;
  comments: number;
}

export interface SocialProfileData {
  id: string;
  type: EntityType;
  displayName: string;
  handle: string;
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

export interface SocialSnapshot {
  /** The profile the signed-in user acts as. Never provided by the client in REAL mode. */
  currentProfileId: string | null;
  profiles: SocialProfileData[];
}

export interface ProfilePatch {
  displayName?: string;
  headline?: string;
  bio?: string;
  interests?: string[];
}

export interface CreatePostData {
  caption: string;
  mediaLabel: string;
  visibility: ProfileVisibility;
}

export interface CreateStoryData {
  caption: string;
  mediaLabel: string;
}

export interface SocialDataService {
  readonly mode: SocialDataMode;
  loadSnapshot(): Promise<SocialSnapshot>;
  updateProfile(profileId: string, patch: ProfilePatch): Promise<void>;
  setPresence(profileId: string, presence: PresenceStatus): Promise<void>;
  setDiscoverable(profileId: string, discoverable: boolean): Promise<void>;
  setFollowing(profileId: string, following: boolean): Promise<void>;
  createPost(profileId: string, input: CreatePostData): Promise<SocialPostData>;
  removePost(profileId: string, postId: string): Promise<void>;
  createStory(profileId: string, input: CreateStoryData): Promise<SocialStoryData>;
  expireStory(profileId: string, storyId: string): Promise<void>;
}
