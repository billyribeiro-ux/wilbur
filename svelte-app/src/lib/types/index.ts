/**
 * Wilbur Trading Room - Type Definitions
 * Svelte 5 + Pocketbase + Turso
 * December 2025
 */

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole = 'admin' | 'host' | 'moderator' | 'member';

export interface User {
	id: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	role: UserRole;
	createdAt: string;
	updatedAt: string;
}

export interface UserProfile extends User {
	bio?: string;
	location?: string;
	timezone?: string;
	integrations: UserIntegration[];
	preferences: UserPreferences;
}

export interface UserPreferences {
	notifications: boolean;
	soundAlerts: boolean;
	theme: 'dark' | 'light' | 'system';
	compactMode: boolean;
}

export interface UserIntegration {
	id: string;
	type: 'spotify' | 'x' | 'linkedin';
	accessToken: string;
	refreshToken?: string;
	expiresAt?: string;
	metadata?: Record<string, unknown>;
	isActive: boolean;
}

// ============================================================================
// ROOM TYPES
// ============================================================================

export interface Room {
	id: string;
	name: string;
	title: string;
	description?: string;
	tenantId: string;
	createdBy: string;
	isActive: boolean;
	tags?: string[];
	iconUrl?: string;
	branding?: RoomBranding;
	createdAt: string;
	updatedAt: string;
}

export interface RoomBranding {
	cardBgColor?: string;
	cardBorderColor?: string;
	titleColor?: string;
	descriptionColor?: string;
	buttonBgColor?: string;
	buttonTextColor?: string;
	buttonText?: string;
	iconBgColor?: string;
	iconColor?: string;
}

export interface RoomMembership {
	id: string;
	roomId: string;
	userId: string;
	role: UserRole;
	joinedAt: string;
	location?: MemberLocation;
}

export interface MemberLocation {
	city?: string;
	region?: string;
	country?: string;
	countryCode?: string;
	timezone?: string;
}

export interface RoomWithContext extends Room {
	memberCount: number;
	onlineCount: number;
	lastActivity?: string;
	membership?: RoomMembership;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export type ContentType = 'text' | 'image' | 'file';

export interface ChatMessage {
	id: string;
	roomId: string;
	userId: string;
	content: string;
	contentType: ContentType;
	fileUrl?: string;
	isDeleted: boolean;
	isOffTopic: boolean;
	isPinned: boolean;
	pinnedBy?: string;
	pinnedAt?: string;
	deletedBy?: string;
	deletedAt?: string;
	createdAt: string;
	// Expanded relations
	user?: User;
}

export interface ChatMessageWithUser extends ChatMessage {
	user: User;
}

// ============================================================================
// ALERT TYPES
// ============================================================================

export type AlertType = 'text' | 'url' | 'media';

export interface Alert {
	id: string;
	roomId: string;
	authorId: string;
	title?: string;
	body?: string;
	type?: AlertType;
	isNonTrade: boolean;
	hasLegalDisclosure: boolean;
	legalDisclosureText?: string;
	createdAt: string;
	// Expanded relations
	author?: User;
}

export interface AlertWithAuthor extends Alert {
	author: User;
}

// ============================================================================
// POLL TYPES
// ============================================================================

export interface Poll {
	id: string;
	roomId: string;
	createdBy: string;
	title: string;
	description?: string;
	options: string[];
	isActive: boolean;
	expiresAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PollVote {
	id: string;
	pollId: string;
	userId: string;
	optionIndex: number;
	createdAt: string;
}

export interface PollWithVotes extends Poll {
	votes: PollVote[];
	voteCounts: number[];
	totalVotes: number;
	userVote?: number;
}

// ============================================================================
// MODERATION TYPES
// ============================================================================

export type ModerationAction = 'kick' | 'ban' | 'mute' | 'warn' | 'unban' | 'unmute';

export interface ModerationLog {
	id: string;
	roomId: string;
	moderatorId: string;
	targetUserId: string;
	action: ModerationAction;
	reason?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
}

export interface BannedUser {
	id: string;
	userId: string;
	roomId: string;
	bannedBy: string;
	reason: string;
	bannedAt: string;
	expiresAt?: string;
}

export interface ReportedContent {
	id: string;
	contentType: 'message' | 'alert' | 'user' | 'room';
	contentId: string;
	roomId: string;
	reportedBy: string;
	reason: string;
	status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
	reviewedBy?: string;
	reviewedAt?: string;
	resolutionNotes?: string;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 'mention' | 'reply' | 'broadcast_alert' | 'room_invite' | 'system';

export interface Notification {
	id: string;
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	roomId?: string;
	alertId?: string;
	link?: string;
	metadata?: Record<string, unknown>;
	createdAt: string;
}

// ============================================================================
// PRIVATE MESSAGING TYPES
// ============================================================================

export interface PrivateChat {
	id: string;
	user1Id: string;
	user2Id: string;
	createdAt: string;
	updatedAt: string;
	// Expanded
	otherUser?: User;
	lastMessage?: PrivateMessage;
}

export interface PrivateMessage {
	id: string;
	chatId: string;
	senderId: string;
	content: string;
	createdAt: string;
	// Expanded
	sender?: User;
}

// ============================================================================
// TENANT/BRANDING TYPES
// ============================================================================

export interface Tenant {
	id: string;
	businessName: string;
	logoUrl?: string;
	primaryColor?: string;
	secondaryColor?: string;
	accentColor?: string;
	backgroundColor?: string;
	textColorPrimary?: string;
	textColorSecondary?: string;
	fontFamily?: string;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// FILE TYPES
// ============================================================================

export interface RoomFile {
	id: string;
	roomId: string;
	userId: string;
	filename: string;
	fileUrl: string;
	fileType?: string;
	fileSize: number;
	mimeType: string;
	folderName: string;
	createdAt: string;
	updatedAt: string;
}

export type FileCategory = 'avatars' | 'files' | 'recordings' | 'branding' | 'custom-sounds' | 'alert-media' | 'room-icons';

// ============================================================================
// LIVEKIT TYPES (Placeholder for later integration)
// ============================================================================

export interface LiveKitConfig {
	url: string;
	token: string;
	roomName: string;
}

export interface LiveKitParticipant {
	identity: string;
	name: string;
	isSpeaking: boolean;
	isMuted: boolean;
	isScreenSharing: boolean;
	isLocal: boolean;
}

// ============================================================================
// SPOTIFY TYPES
// ============================================================================

export interface SpotifyTrack {
	id: string;
	name: string;
	artists: { name: string }[];
	album: {
		name: string;
		images: { url: string }[];
	};
	duration_ms: number;
	uri: string;
}

export interface SpotifyPlayer {
	isPlaying: boolean;
	currentTrack?: SpotifyTrack;
	progress: number;
	volume: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: ApiError;
}

export interface ApiError {
	code: string;
	message: string;
	details?: unknown;
}

export interface PaginatedResponse<T> {
	items: T[];
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
}

// ============================================================================
// REALTIME TYPES
// ============================================================================

export type RealtimeEvent = 'create' | 'update' | 'delete';

export interface RealtimePayload<T = unknown> {
	action: RealtimeEvent;
	record: T;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FormErrors {
	[field: string]: string | undefined;
}

export interface LoginForm {
	email: string;
	password: string;
}

export interface RegisterForm {
	email: string;
	password: string;
	passwordConfirm: string;
	displayName: string;
}

export interface CreateRoomForm {
	name: string;
	title: string;
	description?: string;
	tags?: string[];
}

export interface CreateAlertForm {
	title?: string;
	body: string;
	type?: AlertType;
	isNonTrade?: boolean;
	hasLegalDisclosure?: boolean;
	legalDisclosureText?: string;
}
