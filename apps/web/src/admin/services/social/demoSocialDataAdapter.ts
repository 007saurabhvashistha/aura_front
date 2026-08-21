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

// In-memory demo graph. Nothing is persisted; a full page reload resets it.
// Kept deliberately separate from the API adapter so demo data can never leak
// into a persisted environment.

const CURRENT_DEMO_PROFILE_ID = 'profile-person-ananya';

function nowStamp(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function seedProfiles(): SocialProfileData[] {
  return [
    {
      id: 'profile-ai-maya',
      type: 'AI',
      displayName: 'Maya',
      handle: '@maya.ai',
      headline: 'Companion · Bengaluru',
      bio: 'Warm, curious AI companion for everyday conversations and check-ins.',
      interests: ['Wellbeing', 'Music', 'Daily check-ins'],
      presence: 'online',
      agentId: 'agent-maya',
      verified: false,
      discoverable: true,
      followers: 1284,
      following: 0,
      followedByViewer: true,
      joinedAt: '2026-05-02 10:00',
      stories: [],
      posts: [],
    },
    {
      id: 'profile-ai-companion',
      type: 'AI',
      displayName: 'Aura Companion',
      handle: '@aura.companion',
      headline: 'Calm daily companion',
      bio: 'The default Aura companion. Calm, supportive, always available.',
      interests: ['Mindfulness', 'Journaling'],
      presence: 'online',
      agentId: 'agent-aura-companion',
      verified: false,
      discoverable: true,
      followers: 3140,
      following: 0,
      followedByViewer: false,
      joinedAt: '2026-04-18 09:30',
      stories: [],
      posts: [],
    },
    {
      id: 'profile-ai-support',
      type: 'AI',
      displayName: 'Support Agent',
      handle: '@aura.support',
      headline: 'Aura Support',
      bio: 'Handles account, billing, and troubleshooting questions.',
      interests: ['Support', 'Troubleshooting'],
      presence: 'away',
      agentId: 'agent-support',
      verified: false,
      discoverable: false,
      followers: 96,
      following: 0,
      followedByViewer: false,
      joinedAt: '2026-06-11 14:05',
      stories: [],
      posts: [],
    },
    {
      id: CURRENT_DEMO_PROFILE_ID,
      type: 'REAL_PERSON',
      displayName: 'Ananya Rao',
      handle: '@ananya',
      headline: 'Product designer · Bengaluru',
      bio: 'Product designer in Bengaluru. Coffee, film photography, long walks.',
      interests: ['Design', 'Photography', 'Travel'],
      presence: 'online',
      agentId: null,
      verified: true,
      discoverable: true,
      followers: 812,
      following: 431,
      followedByViewer: false,
      joinedAt: '2026-06-02 18:40',
      stories: [
        {
          id: 'story-ananya-1',
          caption: 'Morning walk before standup',
          mediaLabel: 'Photo · 1080x1920',
          createdAt: '2026-08-19 08:12',
          status: 'active',
          views: 143,
        },
      ],
      posts: [
        {
          id: 'post-ananya-1',
          caption: 'Shot this on the old film camera. Still learning.',
          mediaLabel: 'Photo · 4:5',
          createdAt: '2026-08-17 20:05',
          visibility: 'public',
          likes: 212,
          comments: 18,
        },
      ],
    },
    {
      id: 'profile-person-rohan',
      type: 'REAL_PERSON',
      displayName: 'Rohan Mehta',
      handle: '@rohan',
      headline: 'Backend engineer · Pune',
      bio: 'Backend engineer. Cricket, synths, and too many side projects.',
      interests: ['Music', 'Cricket', 'Engineering'],
      presence: 'away',
      agentId: null,
      verified: false,
      discoverable: true,
      followers: 264,
      following: 302,
      followedByViewer: false,
      joinedAt: '2026-07-14 11:20',
      stories: [],
      posts: [],
    },
    {
      id: 'profile-person-sara',
      type: 'REAL_PERSON',
      displayName: 'Sara Iqbal',
      handle: '@sara',
      headline: 'Writer · Delhi',
      bio: 'Writer. Mostly essays, sometimes poetry.',
      interests: ['Writing', 'Books'],
      presence: 'offline',
      agentId: null,
      verified: false,
      discoverable: false,
      followers: 58,
      following: 91,
      followedByViewer: false,
      joinedAt: '2026-08-01 16:00',
      stories: [],
      posts: [],
    },
  ];
}

export function seedDemoAiProfiles(): SocialProfileData[] {
  return seedProfiles().filter((profile) => profile.type === 'AI');
}

export class DemoSocialDataAdapter implements SocialDataService {
  readonly mode = 'DEMO' as const;

  private profiles: SocialProfileData[] = seedProfiles();

  private patch(profileId: string, updater: (profile: SocialProfileData) => SocialProfileData): void {
    this.profiles = this.profiles.map((profile) => (profile.id === profileId ? updater(profile) : profile));
  }

  async loadSnapshot(): Promise<SocialSnapshot> {
    return {
      currentProfileId: CURRENT_DEMO_PROFILE_ID,
      profiles: this.profiles.map((profile) => ({ ...profile })),
    };
  }

  async updateProfile(profileId: string, patch: ProfilePatch): Promise<void> {
    this.patch(profileId, (profile) => ({ ...profile, ...patch }));
  }

  async setPresence(profileId: string, presence: PresenceStatus): Promise<void> {
    this.patch(profileId, (profile) => ({ ...profile, presence }));
  }

  async setDiscoverable(profileId: string, discoverable: boolean): Promise<void> {
    this.patch(profileId, (profile) => ({ ...profile, discoverable }));
  }

  async setFollowing(profileId: string, following: boolean): Promise<void> {
    this.patch(profileId, (profile) => ({
      ...profile,
      followedByViewer: following,
      followers: Math.max(0, profile.followers + (following ? 1 : -1)),
    }));
  }

  async createPost(profileId: string, input: CreatePostData): Promise<SocialPostData> {
    const post: SocialPostData = {
      id: uid('post'),
      caption: input.caption,
      mediaLabel: input.mediaLabel,
      createdAt: nowStamp(),
      visibility: input.visibility,
      likes: 0,
      comments: 0,
    };
    this.patch(profileId, (profile) => ({ ...profile, posts: [post, ...profile.posts] }));
    return post;
  }

  async removePost(profileId: string, postId: string): Promise<void> {
    this.patch(profileId, (profile) => ({
      ...profile,
      posts: profile.posts.filter((post) => post.id !== postId),
    }));
  }

  async createStory(profileId: string, input: CreateStoryData): Promise<SocialStoryData> {
    const story: SocialStoryData = {
      id: uid('story'),
      caption: input.caption,
      mediaLabel: input.mediaLabel,
      createdAt: nowStamp(),
      status: 'active',
      views: 0,
    };
    this.patch(profileId, (profile) => ({ ...profile, stories: [story, ...profile.stories] }));
    return story;
  }

  async expireStory(profileId: string, storyId: string): Promise<void> {
    this.patch(profileId, (profile) => ({
      ...profile,
      stories: profile.stories.map((story) =>
        story.id === storyId ? { ...story, status: 'expired' as const } : story,
      ),
    }));
  }
}

export const demoSocialDataService: SocialDataService = new DemoSocialDataAdapter();
