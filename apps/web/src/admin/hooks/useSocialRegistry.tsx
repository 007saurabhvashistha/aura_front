import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  apiSocialDataService,
  demoSocialDataService,
  type EntityType,
  type SocialDataMode,
  type SocialDataService,
  type SocialProfileData,
  type SocialSnapshot,
} from '../services/social';

// Social Registry — the single frontend source of truth for WHO exists on Aura.
//
// Aura hosts two participant categories in one ecosystem:
//   AI           -> an AI character, always backed by an agent (agentId)
//   REAL_PERSON  -> a human profile with posts, stories, and calls
//
// They coexist in discovery, but `type` is never hidden: every surface renders
// an explicit AI / Real Person badge. AI is never presented as a human.
// Demo state only — no backend persistence; nothing survives a full reload.

export type PresenceStatus = 'online' | 'away' | 'offline';

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
};

export type ProfileVisibility = 'public' | 'followers';

export type ProfileActivityType =
  | 'profile_created'
  | 'profile_updated'
  | 'presence_changed'
  | 'discovery_changed'
  | 'story_published'
  | 'story_expired'
  | 'story_blocked'
  | 'post_published'
  | 'post_removed'
  | 'post_blocked'
  | 'profile_followed'
  | 'profile_unfollowed'
  | 'conversation_started'
  | 'call_started'
  | 'call_ended';

export interface ProfileActivityEntry {
  id: string;
  type: ProfileActivityType;
  message: string;
  actor: string;
  timestamp: string;
}

export interface StoryItem {
  id: string;
  caption: string;
  mediaLabel: string;
  createdAt: string;
  status: 'active' | 'expired';
  views: number;
}

export interface PostItem {
  id: string;
  caption: string;
  mediaLabel: string;
  createdAt: string;
  visibility: ProfileVisibility;
  likes: number;
  comments: number;
}

export interface SocialProfile {
  id: string;
  type: EntityType;
  displayName: string;
  handle: string;
  headline: string;
  bio: string;
  interests: string[];
  presence: PresenceStatus;
  /** Always set for AI characters, always null for real people. */
  agentId: string | null;
  verified: boolean;
  discoverable: boolean;
  followers: number;
  following: number;
  /** Whether the signed-in Aura user follows this profile. */
  followedByViewer: boolean;
  joinedAt: string;
  stories: StoryItem[];
  posts: PostItem[];
  activity: ProfileActivityEntry[];
}

const ACTOR = 'Aman Ops';

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeActivity(type: ProfileActivityType, message: string): ProfileActivityEntry {
  return { id: uid('pact'), type, message, actor: ACTOR, timestamp: nowStamp() };
}

export interface CreateStoryInput {
  caption: string;
  mediaLabel: string;
}

export interface CreatePostInput {
  caption: string;
  mediaLabel: string;
  visibility: ProfileVisibility;
}

interface SocialRegistryContextValue {
  profiles: SocialProfile[];
  /** Profile the signed-in user acts as. Null while loading or when unauthenticated. */
  currentProfileId: string | null;
  /** REAL = persisted through the Aura API. DEMO = in-memory only. */
  mode: SocialDataMode;
  loading: boolean;
  dataError: string | null;
  refresh: () => Promise<void>;
  getProfileById: (id: string) => SocialProfile | null;
  getProfileByAgentId: (agentId: string) => SocialProfile | null;
  updateProfile: (id: string, patch: Partial<Pick<SocialProfile, 'bio' | 'headline' | 'interests'>>) => void;
  setPresence: (id: string, presence: PresenceStatus) => void;
  setDiscoverable: (id: string, discoverable: boolean) => void;
  /** Stories are a real-person capability. AI characters are blocked by design. */
  createStory: (id: string, input: CreateStoryInput) => StoryItem | null;
  expireStory: (id: string, storyId: string) => void;
  /** Posts are a real-person capability. AI characters are blocked by design. */
  createPost: (id: string, input: CreatePostInput) => PostItem | null;
  removePost: (id: string, postId: string) => void;
  /** Follow / unfollow from the signed-in user's point of view. Returns the new state. */
  toggleFollow: (id: string) => boolean;
  logProfileActivity: (id: string, type: ProfileActivityType, message: string) => void;
}

const SocialRegistryContext = createContext<SocialRegistryContextValue | undefined>(undefined);

/** Snapshot rows carry no activity log; existing local activity is preserved across reloads. */
function mergeSnapshot(previous: SocialProfile[], snapshot: SocialProfileData[]): SocialProfile[] {
  return snapshot.map((row) => {
    const existing = previous.find((profile) => profile.id === row.id);
    return { ...row, activity: existing?.activity ?? [makeActivity('profile_created', 'Profile loaded.')] };
  });
}

export function SocialRegistryProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [mode, setMode] = useState<SocialDataMode>('DEMO');
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const serviceRef = useRef<SocialDataService>(demoSocialDataService);

  const applySnapshot = useCallback((snapshot: SocialSnapshot, service: SocialDataService): void => {
    setProfiles((prev) => mergeSnapshot(prev, snapshot.profiles));
    setCurrentProfileId(snapshot.currentProfileId);
    setMode(service.mode);
    serviceRef.current = service;
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const service = serviceRef.current;
    const snapshot = await service.loadSnapshot();
    applySnapshot(snapshot, service);
  }, [applySnapshot]);

  // Adapter choice follows the session: authenticated users get persisted data.
  useEffect(() => {
    if (status === 'loading') return;
    let active = true;

    (async () => {
      setLoading(true);
      if (status === 'authenticated') {
        try {
          const snapshot = await apiSocialDataService.loadSnapshot();
          if (!active) return;
          applySnapshot(snapshot, apiSocialDataService);
          setDataError(null);
          setLoading(false);
          return;
        } catch (error) {
          if (!active) return;
          setDataError(error instanceof Error ? error.message : 'Could not load social data.');
        }
      }
      const snapshot = await demoSocialDataService.loadSnapshot();
      if (!active) return;
      applySnapshot(snapshot, demoSocialDataService);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [status, applySnapshot]);

  const patchProfile = useCallback((id: string, updater: (profile: SocialProfile) => SocialProfile): void => {
    setProfiles((prev) => prev.map((profile) => (profile.id === id ? updater(profile) : profile)));
  }, []);

  /** Optimistic UI already applied; reconcile with the source of truth or surface the failure. */
  const write = useCallback(
    (action: (service: SocialDataService) => Promise<unknown>): void => {
      const service = serviceRef.current;
      void action(service)
        .then(() => {
          setDataError(null);
          return refresh();
        })
        .catch(async (error: unknown) => {
          setDataError(error instanceof Error ? error.message : 'Action failed.');
          try {
            await refresh();
          } catch {
            /* keep the last known state */
          }
        });
    },
    [refresh],
  );

  const logProfileActivity = useCallback(
    (id: string, type: ProfileActivityType, message: string): void => {
      patchProfile(id, (profile) => ({
        ...profile,
        activity: [makeActivity(type, message), ...profile.activity],
      }));
    },
    [patchProfile],
  );

  const getProfileById = useCallback(
    (id: string): SocialProfile | null => profiles.find((profile) => profile.id === id) ?? null,
    [profiles],
  );

  const getProfileByAgentId = useCallback(
    (agentId: string): SocialProfile | null => profiles.find((profile) => profile.agentId === agentId) ?? null,
    [profiles],
  );

  const updateProfile = useCallback(
    (id: string, patch: Partial<Pick<SocialProfile, 'bio' | 'headline' | 'interests'>>): void => {
      patchProfile(id, (profile) => ({
        ...profile,
        ...patch,
        activity: [makeActivity('profile_updated', 'Profile details updated.'), ...profile.activity],
      }));
      write((service) => service.updateProfile(id, patch));
    },
    [patchProfile, write],
  );

  const setPresence = useCallback(
    (id: string, presence: PresenceStatus): void => {
      patchProfile(id, (profile) => ({
        ...profile,
        presence,
        activity: [
          makeActivity('presence_changed', `Presence set to ${PRESENCE_LABELS[presence].toLowerCase()}.`),
          ...profile.activity,
        ],
      }));
      write((service) => service.setPresence(id, presence));
    },
    [patchProfile, write],
  );

  const setDiscoverable = useCallback(
    (id: string, discoverable: boolean): void => {
      patchProfile(id, (profile) => ({
        ...profile,
        discoverable,
        activity: [
          makeActivity(
            'discovery_changed',
            discoverable ? 'Profile is now visible in discovery.' : 'Profile hidden from discovery.',
          ),
          ...profile.activity,
        ],
      }));
      write((service) => service.setDiscoverable(id, discoverable));
    },
    [patchProfile, write],
  );

  const createStory = useCallback(
    (id: string, input: CreateStoryInput): StoryItem | null => {
      const target = profiles.find((profile) => profile.id === id);
      if (!target) return null;

      if (target.type === 'AI') {
        logProfileActivity(
          id,
          'story_blocked',
          'Story creation blocked: stories are a real-person capability, AI characters cannot post them.',
        );
        return null;
      }

      const story: StoryItem = {
        id: uid('story'),
        caption: input.caption,
        mediaLabel: input.mediaLabel || 'Photo · 1080x1920',
        createdAt: nowStamp(),
        status: 'active',
        views: 0,
      };

      patchProfile(id, (profile) => ({
        ...profile,
        stories: [story, ...profile.stories],
        activity: [makeActivity('story_published', `Story published: "${story.caption}".`), ...profile.activity],
      }));
      write((service) => service.createStory(id, { caption: story.caption, mediaLabel: story.mediaLabel }));

      return story;
    },
    [profiles, patchProfile, logProfileActivity, write],
  );

  const expireStory = useCallback(
    (id: string, storyId: string): void => {
      patchProfile(id, (profile) => ({
        ...profile,
        stories: profile.stories.map((story) =>
          story.id === storyId ? { ...story, status: 'expired' as const } : story,
        ),
        activity: [makeActivity('story_expired', 'Story expired.'), ...profile.activity],
      }));
      write((service) => service.expireStory(id, storyId));
    },
    [patchProfile, write],
  );

  const createPost = useCallback(
    (id: string, input: CreatePostInput): PostItem | null => {
      const target = profiles.find((profile) => profile.id === id);
      if (!target) return null;

      if (target.type === 'AI') {
        logProfileActivity(
          id,
          'post_blocked',
          'Post creation blocked: posts are a real-person capability, AI characters cannot publish them.',
        );
        return null;
      }

      const post: PostItem = {
        id: uid('post'),
        caption: input.caption,
        mediaLabel: input.mediaLabel || 'Photo · 4:5',
        createdAt: nowStamp(),
        visibility: input.visibility,
        likes: 0,
        comments: 0,
      };

      patchProfile(id, (profile) => ({
        ...profile,
        posts: [post, ...profile.posts],
        activity: [makeActivity('post_published', `Post published: "${post.caption}".`), ...profile.activity],
      }));
      write((service) =>
        service.createPost(id, {
          caption: post.caption,
          mediaLabel: post.mediaLabel,
          visibility: post.visibility,
        }),
      );

      return post;
    },
    [profiles, patchProfile, logProfileActivity, write],
  );

  const removePost = useCallback(
    (id: string, postId: string): void => {
      patchProfile(id, (profile) => ({
        ...profile,
        posts: profile.posts.filter((post) => post.id !== postId),
        activity: [makeActivity('post_removed', 'Post removed.'), ...profile.activity],
      }));
      write((service) => service.removePost(id, postId));
    },
    [patchProfile, write],
  );

  const toggleFollow = useCallback(
    (id: string): boolean => {
      const target = profiles.find((profile) => profile.id === id);
      if (!target) return false;
      const next = !target.followedByViewer;

      patchProfile(id, (profile) => ({
        ...profile,
        followedByViewer: next,
        followers: Math.max(0, profile.followers + (next ? 1 : -1)),
        activity: [
          makeActivity(
            next ? 'profile_followed' : 'profile_unfollowed',
            next ? 'Followed by the signed-in user.' : 'Unfollowed by the signed-in user.',
          ),
          ...profile.activity,
        ],
      }));
      write((service) => service.setFollowing(id, next));

      return next;
    },
    [profiles, patchProfile, write],
  );

  const value = useMemo<SocialRegistryContextValue>(
    () => ({
      profiles,
      currentProfileId,
      mode,
      loading,
      dataError,
      refresh,
      getProfileById,
      getProfileByAgentId,
      updateProfile,
      setPresence,
      setDiscoverable,
      createStory,
      expireStory,
      createPost,
      removePost,
      toggleFollow,
      logProfileActivity,
    }),
    [
      profiles,
      currentProfileId,
      mode,
      loading,
      dataError,
      refresh,
      getProfileById,
      getProfileByAgentId,
      updateProfile,
      setPresence,
      setDiscoverable,
      createStory,
      expireStory,
      createPost,
      removePost,
      toggleFollow,
      logProfileActivity,
    ],
  );

  return <SocialRegistryContext.Provider value={value}>{children}</SocialRegistryContext.Provider>;
}

export function useSocialRegistry(): SocialRegistryContextValue {
  const context = useContext(SocialRegistryContext);
  if (!context) {
    throw new Error('useSocialRegistry must be used within a SocialRegistryProvider');
  }
  return context;
}
