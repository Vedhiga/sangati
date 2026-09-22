import { ActivityType as IntentType } from "@/types";

export type ActivityIntent = IntentType;
export type ActivityRecurrenceType = "ONE_TIME" | "RECURRING";
export type ActivityFrequency = "WEEKLY" | "EVERY_2_WEEKS" | "CUSTOM";
export type ActivityState = "ACTIVE" | "PAUSED" | "ENDED";
export type ActivityStatus = ActivityState;
export type SessionState = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";
export type MeetingPlatform = "Google Meet" | "Zoom" | "Discord" | "Other";

export interface ActivityHost {
  id: string;
  name: string;
  handle?: string;
  username?: string;
  avatar?: string;
  avatar_url?: string;
  bio?: string;
}

export interface ActivityParticipant {
  id: string;
  name: string;
  handle?: string;
  username?: string;
  avatar?: string;
  avatar_url?: string;
  joined_at?: string;
}

export interface ActivitySessionItem {
  id: string;
  activity_id?: string;
  session_number?: number;
  title?: string;
  scheduled_at: string;
  duration_minutes: number;
  state: SessionState;
}

export type ActivitySession = ActivitySessionItem;

export interface ActivityChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  text: string;
  sent_at?: string;
  created_at?: string;
}

// PUBLIC Activity Representation (Safe to view for anyone)
export interface PublicActivity {
  id: string;
  intent: IntentType;
  title: string;
  description: string;
  activity_type: ActivityRecurrenceType;
  recurrence_type?: ActivityRecurrenceType;
  frequency?: ActivityFrequency;
  day_of_week?: string;
  schedule_day?: string;
  time_of_day?: string;
  schedule_time?: string;
  timezone?: string;
  duration_minutes: number;
  max_participants?: number;
  participant_limit?: number;
  participant_count: number;
  status: ActivityState;
  host: ActivityHost;
  created_at: string;
  public_participants: ActivityParticipant[];
  is_participant?: boolean;
  is_host?: boolean;
}

// PRIVATE Participant Details (ONLY available to joined participants / host)
export interface ParticipantActivityDetails extends PublicActivity {
  is_participant: boolean;
  is_host: boolean;
  meeting_platform: MeetingPlatform;
  meeting_url: string;
  private_notes?: string;
  upcoming_session?: ActivitySessionItem;
  past_sessions?: ActivitySessionItem[];
  chat_messages?: ActivityChatMessage[];
}

export interface CreateActivityPayload {
  intent: IntentType;
  title: string;
  description: string;
  activity_type: ActivityRecurrenceType;
  frequency?: ActivityFrequency;
  day_of_week?: string;
  time_of_day?: string;
  timezone?: string;
  duration_minutes: number;
  max_participants?: number;
  participant_limit?: number;
  meeting_platform: MeetingPlatform;
  meeting_url: string;
  private_notes?: string;
}

export interface MockConnection {
  id: string;
  name: string;
  handle?: string;
  username?: string;
  avatar?: string;
  avatar_url?: string;
  invited?: boolean;
  is_invited?: boolean;
}

