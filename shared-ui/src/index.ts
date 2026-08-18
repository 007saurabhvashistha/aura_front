/**
 * Shared, transport-agnostic API contract types used by both the Aura backend
 * (services/api) and frontend (apps/web).
 */

/** Standard API envelope. Every endpoint returns this shape. */
export interface ApiResponse<TData = unknown> {
  status: 'success' | 'error';
  message: string;
  data: TData | null;
  errors: ApiError[] | null;
  meta: ApiMeta | null;
}

export interface ApiError {
  field?: string;
  code: string;
  message: string;
}

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/** Health check payload returned by GET /health. */
export interface HealthStatus {
  service: string;
  status: 'ok' | 'degraded' | 'down';
  uptimeSeconds: number;
  version: string;
  database: 'connected' | 'disconnected' | 'unknown';
}

/** Public representation of a user (never includes the password hash). */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Access-token payload issued on signup/login/refresh. The refresh token is
 * delivered separately as an httpOnly cookie and is never exposed to JS.
 */
export interface AuthTokens {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

/** Response body for signup, login, and refresh endpoints. */
export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

// ── Sprint 2: User Identity & Personalization ──────────────────────────────

/** Communication style preference (bounded set; user preference only). */
export type CommunicationStyle =
  | 'casual'
  | 'formal'
  | 'playful'
  | 'direct'
  | 'supportive';

/**
 * AI personality preference (bounded set). Intentionally NOT coupled to any
 * future AI-agent configuration — this is purely a user-facing preference.
 */
export type AiPersonality = 'warm' | 'playful' | 'calm' | 'intellectual' | 'empathetic';

/** Proficiency for a spoken language. */
export type LanguageProficiency = 'native' | 'fluent' | 'conversational' | 'learning';

/** Supported primary/spoken languages (ISO-639-1). Extend as the product grows. */
export type SupportedLanguage = 'en' | 'hi' | 'ar' | 'es' | 'fr' | 'de' | 'pt';

/** Evolving, strictly-validated user preferences (persisted as JSONB). */
export interface UserPreferences {
  conversationStyle?: 'casual' | 'balanced' | 'deep';
  responseLength?: 'short' | 'medium' | 'long';
  humor?: boolean;
  deepConversations?: boolean;
}

/**
 * Product profile details. Date of birth is intentionally absent — only the
 * derived eligibility flag is ever exposed.
 */
export interface ProfileDetails {
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  primaryLanguage: SupportedLanguage | null;
  communicationStyle: CommunicationStyle | null;
  aiPersonality: AiPersonality | null;
  isAgeVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

/** A language a user speaks. */
export interface UserLanguage {
  languageCode: SupportedLanguage;
  proficiency: LanguageProficiency;
}

/** Server-computed onboarding progress. The server is authoritative. */
export interface OnboardingState {
  complete: boolean;
  missingRequired: string[];
}

/** Aggregated view returned by GET /api/v1/users/me. */
export interface FullProfile {
  user: UserProfile;
  profile: ProfileDetails;
  languages: UserLanguage[];
  interests: string[];
  onboarding: OnboardingState;
}

/** Result of POST /api/v1/users/me/age-verification. */
export interface AgeVerificationResult {
  isAgeVerified: boolean;
  ageVerifiedAt: string;
}

/** Result of POST /api/v1/users/me/avatar/upload-url. */
export interface AvatarUploadTarget {
  uploadUrl: string;
  objectKey: string;
}

// ── Sprint 3: Conversation Foundation ─────────────────────────────────────

export type ConversationStatus =
  | 'created'
  | 'connecting'
  | 'active'
  | 'ending'
  | 'completed'
  | 'failed';

export type ConversationMessageRole = 'user' | 'assistant' | 'system';

export interface Conversation {
  id: string;
  userId: string;
  agentKey: string;
  livekitRoomName: string;
  status: ConversationStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: ConversationMessageRole;
  content: string;
  sequence: number;
  createdAt: string;
}

export interface AgentConfig {
  key: string;
  name: string;
  systemPrompt: string;
  personality: 'warm' | 'playful' | 'calm' | 'intellectual' | 'empathetic';
  voice: string;
  languageMode: 'mirror_user' | 'single_language';
}

export interface ConversationStartResponse {
  conversation: Pick<Conversation, 'id' | 'status'>;
  livekit: {
    url: string;
    roomName: string;
    token: string;
  };
  agent: {
    key: string;
    name: string;
    personality: AgentConfig['personality'];
    voice: string;
  };
}

export interface ConversationListResponse {
  conversations: Conversation[];
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: ConversationMessage[];
}
