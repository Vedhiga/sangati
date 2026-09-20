export type ActivityType = "BUILD" | "LEARN" | "CONVERSATION" | "EXPLORE";

export interface UserActivity {
  id: string;
  activity_type: ActivityType;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  interests?: string[];
  created_at: string;
  updated_at: string;
}

export interface ProfileCreate {
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  interests?: string[];
}

export interface ProfileUpdate {
  username?: string;
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  interests?: string[];
}

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type PersonConnectionStatus =
  | "NONE"
  | "REQUEST_SENT"
  | "REQUEST_RECEIVED"
  | "CONNECTED";

export interface DiscoveryPerson {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  interests: string[];
  activity?: ActivityType | null;
  match_reason?: string | null;
  connection_status?: PersonConnectionStatus;
  connection_id?: string | null;
}

export interface DiscoveryResponse {
  people: DiscoveryPerson[];
  total: number;
  current_user_activity?: ActivityType | null;
}

export interface ConnectionUserPublic {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  activity?: ActivityType | null;
  interests: string[];
}

export interface ConnectionRequestItem {
  id: string;
  created_at: string;
  requester: ConnectionUserPublic;
}

export interface IncomingRequestsResponse {
  requests: ConnectionRequestItem[];
  total: number;
}

export interface ConnectedPersonItem {
  id: string;
  connected_at: string;
  user: ConnectionUserPublic;
}

export interface ConnectionsListResponse {
  connections: ConnectedPersonItem[];
  total: number;
}

export interface ConnectionResponse {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface ApiResponseError {
  error: ApiErrorDetail;
}

export interface AuthorPublic {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface Post {
  id: string;
  author_id: string;
  activity_type: ActivityType;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
  author: AuthorPublic;
  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  activity_type: ActivityType;
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
}

export interface PostUpdate {
  content: string;
  media_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
}

export interface PostsListResponse {
  posts: Post[];
  total: number;
  limit: number;
  offset: number;
}

export interface FeedPagination {
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface FeedResponse {
  posts: Post[];
  pagination: FeedPagination;
  current_user_activity?: ActivityType | null;
}

// Module 7: Conversations & Messages
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface MessageCreate {
  content: string;
}

export interface MessagesListResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

export interface MessagePreview {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title?: string | null;
  is_group?: boolean;
  other_user?: ConnectionUserPublic | null;
  participants?: ConnectionUserPublic[];
  last_message?: MessagePreview | null;
  created_at: string;
  last_message_at?: string | null;
}

export interface ConversationsListResponse {
  conversations: ConversationItem[];
  total: number;
}

export interface ConversationDetail {
  id: string;
  title?: string | null;
  is_group?: boolean;
  other_user?: ConnectionUserPublic | null;
  participants?: ConnectionUserPublic[];
  created_at: string;
  last_message_at?: string | null;
}

export interface GroupConversationCreate {
  participant_user_ids: string[];
  title?: string;
}

export interface UnreadCountResponse {
  count: number;
}

// Module 8: Notifications
export type NotificationType =
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "NEW_MESSAGE";

export interface NotificationActor {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  actor_id?: string | null;
  actor?: NotificationActor | null;
  type: NotificationType;
  title: string;
  message: string;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  marked_read: number;
}


