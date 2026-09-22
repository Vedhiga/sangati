import { api } from "@/lib/api";
import {
  PublicActivity,
  ParticipantActivityDetails,
  CreateActivityPayload,
  MockConnection,
  ActivityChatMessage,
} from "./types";

export const activityApiService = {
  // Get all activities (sanitized for public/participant callers on backend)
  async getActivities(intentFilter?: string): Promise<PublicActivity[]> {
    const query = intentFilter && intentFilter !== "ALL" ? `?intent=${intentFilter}` : "";
    return await api.get<PublicActivity[]>(`/api/v1/activities${query}`);
  },

  // Get single activity details (enforces backend authorization boundary)
  async getActivity(id: string): Promise<ParticipantActivityDetails | PublicActivity> {
    return await api.get<ParticipantActivityDetails | PublicActivity>(`/api/v1/activities/${id}`);
  },

  // Get participant details specifically
  async getParticipantDetails(id: string): Promise<ParticipantActivityDetails | null> {
    const res = await api.get<ParticipantActivityDetails | PublicActivity>(`/api/v1/activities/${id}`);
    if (res && "meeting_url" in res) {
      return res as ParticipantActivityDetails;
    }
    return null;
  },

  // Create new activity (persisted to backend & database)
  async createActivity(payload: CreateActivityPayload): Promise<ParticipantActivityDetails> {
    return await api.post<ParticipantActivityDetails>("/api/v1/activities", payload);
  },

  // Join activity (persisted to backend & database)
  async joinActivity(id: string): Promise<ParticipantActivityDetails> {
    return await api.post<ParticipantActivityDetails>(`/api/v1/activities/${id}/join`);
  },

  // Leave activity (persisted to backend & database)
  async leaveActivity(id: string): Promise<PublicActivity> {
    return await api.post<PublicActivity>(`/api/v1/activities/${id}/leave`);
  },

  // Pause activity
  async pauseActivity(id: string): Promise<ParticipantActivityDetails> {
    return await api.post<ParticipantActivityDetails>(`/api/v1/activities/${id}/pause`);
  },

  // Resume activity
  async resumeActivity(id: string): Promise<ParticipantActivityDetails> {
    return await api.post<ParticipantActivityDetails>(`/api/v1/activities/${id}/resume`);
  },

  // End activity
  async endActivity(id: string): Promise<ParticipantActivityDetails> {
    return await api.post<ParticipantActivityDetails>(`/api/v1/activities/${id}/end`);
  },

  // Fetch real accepted connections for invitation modal
  async getAcceptedConnections(): Promise<MockConnection[]> {
    try {
      const res = await api.get<{ connections: any[] }>("/api/v1/connections");
      if (res && res.connections) {
        return res.connections.map((c) => ({
          id: c.user_id || c.id,
          name: c.display_name || c.name || "Connection",
          handle: c.username || c.handle || "user",
          username: c.username,
          avatar: c.avatar_url,
          avatar_url: c.avatar_url,
          invited: false,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  // Send invites to real connections
  async sendInvites(activityId: string, connectionIds: string[]): Promise<void> {
    await api.post(`/api/v1/activities/${activityId}/invites`, {
      connection_ids: connectionIds,
    });
  },

  // Send Chat message placeholder
  async sendChatMessage(activityId: string, text: string): Promise<ActivityChatMessage> {
    return {
      id: String(Date.now()),
      sender_id: "me",
      sender_name: "You",
      text,
      created_at: new Date().toISOString(),
    };
  },
};
