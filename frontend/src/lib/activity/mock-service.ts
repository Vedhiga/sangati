import {
  PublicActivity,
  ParticipantActivityDetails,
  CreateActivityPayload,
  MockConnection,
  ActivityChatMessage,
} from "./types";
import {
  INITIAL_ACTIVITIES_DATA,
  INITIAL_MOCK_CONNECTIONS,
  CURRENT_MOCK_USER,
} from "./mock-data";

// In-memory state store for isolated Phase 1 lab
let activitiesStore: ParticipantActivityDetails[] = [...INITIAL_ACTIVITIES_DATA];
let connectionsStore: MockConnection[] = [...INITIAL_MOCK_CONNECTIONS];

export const activityService = {
  // Get all activities for listing
  getAllActivities(userId: string = CURRENT_MOCK_USER.id): PublicActivity[] {
    return activitiesStore.map((act) => sanitizeForPublicView(act, userId));
  },

  // Get activities filtered by intent
  getActivities(intentFilter?: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity[] {
    let list = activitiesStore;
    if (intentFilter && intentFilter !== "ALL") {
      list = list.filter((a) => a.intent === intentFilter);
    }
    return list.map((act) => sanitizeForPublicView(act, userId));
  },

  // Get single public activity summary
  getActivity(id: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity | null {
    const act = activitiesStore.find((a) => a.id === id);
    if (!act) return null;
    return sanitizeForPublicView(act, userId);
  },

  // Get detailed participant information (Exposes meeting_url, private notes & chat)
  getParticipantDetails(id: string, userId: string = CURRENT_MOCK_USER.id): ParticipantActivityDetails | null {
    const act = activitiesStore.find((a) => a.id === id);
    if (!act) return null;

    const isHost = act.host.id === userId;
    const isParticipant = isHost || act.public_participants.some((p) => p.id === userId);

    if (!isParticipant) {
      // Authorization boundary: Never return private details if user has not joined
      return null;
    }

    return {
      ...act,
      is_participant: true,
      is_host: isHost,
    };
  },

  // Create new activity
  createActivity(payload: CreateActivityPayload, userId: string = CURRENT_MOCK_USER.id): ParticipantActivityDetails {
    const newId = `act-custom-${Date.now()}`;
    const newActivity: ParticipantActivityDetails = {
      id: newId,
      intent: payload.intent,
      title: payload.title,
      description: payload.description,
      activity_type: payload.activity_type,
      recurrence_type: payload.activity_type,
      frequency: payload.frequency,
      day_of_week: payload.day_of_week,
      schedule_day: payload.day_of_week,
      time_of_day: payload.time_of_day,
      schedule_time: payload.time_of_day,
      timezone: payload.timezone || "IST (UTC+5:30)",
      duration_minutes: payload.duration_minutes,
      max_participants: payload.max_participants || 10,
      participant_limit: payload.max_participants || 10,
      participant_count: 1,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      host: {
        id: CURRENT_MOCK_USER.id,
        name: CURRENT_MOCK_USER.name,
        username: CURRENT_MOCK_USER.username,
        avatar_url: CURRENT_MOCK_USER.avatar_url,
      },
      public_participants: [
        {
          id: CURRENT_MOCK_USER.id,
          name: CURRENT_MOCK_USER.name,
          username: CURRENT_MOCK_USER.username,
          avatar_url: CURRENT_MOCK_USER.avatar_url,
          joined_at: new Date().toISOString(),
        },
      ],
      is_participant: true,
      is_host: true,
      meeting_platform: payload.meeting_platform,
      meeting_url: payload.meeting_url,
      private_notes: payload.private_notes,
      upcoming_session: {
        id: `sess-${newId}-1`,
        title: "Session #1",
        scheduled_at: `${payload.day_of_week || "Upcoming"} · ${payload.time_of_day || "Scheduled"}`,
        duration_minutes: payload.duration_minutes,
        state: "UPCOMING",
      },
      past_sessions: [],
      chat_messages: [],
    };

    activitiesStore = [newActivity, ...activitiesStore];
    return newActivity;
  },

  // Join activity -> Adds user to participants
  joinActivity(id: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity {
    const index = activitiesStore.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Activity not found.");

    const act = activitiesStore[index];
    const isAlreadyParticipant = act.public_participants.some((p) => p.id === userId);

    if (!isAlreadyParticipant) {
      const updatedParticipants = [
        ...act.public_participants,
        {
          id: CURRENT_MOCK_USER.id,
          name: CURRENT_MOCK_USER.name,
          username: CURRENT_MOCK_USER.username,
          avatar_url: CURRENT_MOCK_USER.avatar_url,
          joined_at: new Date().toISOString(),
        },
      ];

      activitiesStore[index] = {
        ...act,
        participant_count: updatedParticipants.length,
        public_participants: updatedParticipants,
      };
    }

    return sanitizeForPublicView(activitiesStore[index], userId);
  },

  // Leave activity
  leaveActivity(id: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity {
    const index = activitiesStore.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Activity not found.");

    const act = activitiesStore[index];
    if (act.host.id === userId) {
      throw new Error("Host cannot leave activity. End activity instead.");
    }

    const updatedParticipants = act.public_participants.filter((p) => p.id !== userId);

    activitiesStore[index] = {
      ...act,
      participant_count: updatedParticipants.length,
      public_participants: updatedParticipants,
    };

    return sanitizeForPublicView(activitiesStore[index], userId);
  },

  // Pause activity
  pauseActivity(id: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity {
    const index = activitiesStore.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Activity not found.");

    activitiesStore[index] = {
      ...activitiesStore[index],
      status: "PAUSED",
    };

    return sanitizeForPublicView(activitiesStore[index], userId);
  },

  // Resume activity
  resumeActivity(id: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity {
    const index = activitiesStore.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Activity not found.");

    activitiesStore[index] = {
      ...activitiesStore[index],
      status: "ACTIVE",
    };

    return sanitizeForPublicView(activitiesStore[index], userId);
  },

  // End activity
  endActivity(id: string, userId: string = CURRENT_MOCK_USER.id): PublicActivity {
    const index = activitiesStore.findIndex((a) => a.id === id);
    if (index === -1) throw new Error("Activity not found.");

    activitiesStore[index] = {
      ...activitiesStore[index],
      status: "ENDED",
    };

    return sanitizeForPublicView(activitiesStore[index], userId);
  },

  // Mock connection invitation support
  getMockConnections(): MockConnection[] {
    return connectionsStore;
  },

  sendInvites(activityId: string, connectionIds: string[]): void {
    connectionsStore = connectionsStore.map((c) =>
      connectionIds.includes(c.id) ? { ...c, invited: true, is_invited: true } : c
    );
  },

  // Send Chat message
  sendChatMessage(activityId: string, userId: string, text: string): ActivityChatMessage {
    const index = activitiesStore.findIndex((a) => a.id === activityId);
    if (index === -1) throw new Error("Activity not found.");

    const newMsg: ActivityChatMessage = {
      id: `msg-${Date.now()}`,
      sender_id: userId,
      sender_name: CURRENT_MOCK_USER.name,
      sender_avatar: CURRENT_MOCK_USER.avatar_url,
      text: text.trim(),
      created_at: "Just now",
      sent_at: "Just now",
    };

    activitiesStore[index] = {
      ...activitiesStore[index],
      chat_messages: [...(activitiesStore[index].chat_messages || []), newMsg],
    };

    return newMsg;
  },
};

// Sanitizer function: Strips meeting URL, private notes, and chat for non-participants
function sanitizeForPublicView(act: ParticipantActivityDetails, userId: string): PublicActivity {
  const isHost = act.host.id === userId;
  const isParticipant = isHost || act.public_participants.some((p) => p.id === userId);

  return {
    id: act.id,
    intent: act.intent,
    title: act.title,
    description: act.description,
    activity_type: act.activity_type,
    recurrence_type: act.activity_type,
    frequency: act.frequency,
    day_of_week: act.day_of_week,
    schedule_day: act.day_of_week,
    time_of_day: act.time_of_day,
    schedule_time: act.time_of_day,
    timezone: act.timezone,
    duration_minutes: act.duration_minutes,
    max_participants: act.max_participants,
    participant_limit: act.max_participants,
    participant_count: act.participant_count,
    status: act.status,
    host: act.host,
    created_at: act.created_at,
    public_participants: act.public_participants,
    is_participant: isParticipant,
    is_host: isHost,
  };
}
