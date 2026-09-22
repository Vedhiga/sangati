"use client";

import React from "react";
import { ActivitySession, MeetingPlatform } from "@/lib/activity/types";
import { formatSessionDateTime, getPlatformBadgeColor } from "@/lib/activity/activity-utils";
import { Video, Calendar, Clock, ExternalLink, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ActivitySessionProps {
  upcomingSession?: ActivitySession;
  pastSessions?: ActivitySession[];
  meetingPlatform?: MeetingPlatform;
  meetingUrl?: string;
  isParticipant: boolean;
  isHost: boolean;
  onJoinSession?: () => void;
}

export function ActivitySessionCard({
  upcomingSession,
  pastSessions = [],
  meetingPlatform,
  meetingUrl,
  isParticipant,
  isHost,
  onJoinSession,
}: ActivitySessionProps) {
  const getStatusBadge = (state: ActivitySession["state"]) => {
    switch (state) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            LIVE NOW
          </span>
        );
      case "UPCOMING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C9A84A]/10 text-[#C9A84A] border border-[#C9A84A]/20">
            <Clock className="w-3 h-3" />
            Upcoming
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400">
            <CheckCircle2 className="w-3 h-3 text-neutral-500" />
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Session Section */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9A84A]" />
            <h3 className="text-sm font-semibold tracking-wide text-neutral-200 uppercase">
              Next Session
            </h3>
          </div>
          {upcomingSession && getStatusBadge(upcomingSession.state)}
        </div>

        {upcomingSession ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-neutral-950/50 border border-neutral-800/80">
              <div className="space-y-1">
                <div className="text-base font-medium text-neutral-100">
                  {upcomingSession.title || "Scheduled Session"}
                </div>
                <div className="text-xs text-neutral-400 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  {formatSessionDateTime(upcomingSession.scheduled_at, upcomingSession.duration_minutes)}
                </div>
              </div>

              {meetingPlatform && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border self-start sm:self-center ${getPlatformBadgeColor(meetingPlatform)}`}>
                  <Video className="w-3.5 h-3.5" />
                  {meetingPlatform}
                </span>
              )}
            </div>

            {/* Authorization-Protected Join Session Call To Action */}
            {isParticipant || isHost ? (
              meetingUrl ? (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onJoinSession}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm bg-[#C9A84A] hover:bg-[#b5953f] text-neutral-950 transition-colors shadow-sm"
                >
                  <Video className="w-4 h-4" />
                  Join Session ({meetingPlatform || "External Link"})
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              ) : (
                <div className="text-xs text-neutral-400 flex items-center gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                  <AlertCircle className="w-4 h-4 text-[#C9A84A] shrink-0" />
                  <span>The host has not added a meeting link yet. Check back closer to session time.</span>
                </div>
              )
            ) : (
              <div className="p-3.5 rounded-lg bg-neutral-950/80 border border-neutral-800/60 text-center space-y-1">
                <p className="text-xs text-neutral-400">
                  🔒 Session links are visible to confirmed participants only.
                </p>
                <p className="text-[11px] text-neutral-500">
                  Click <strong className="text-[#C9A84A] font-normal">Join Activity</strong> to unlock meeting credentials and private workspace.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-neutral-500">
            No upcoming session scheduled at this time.
          </div>
        )}
      </div>

      {/* Session History Section */}
      {pastSessions.length > 0 && (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-5">
          <h4 className="text-xs font-semibold tracking-wider text-neutral-400 uppercase mb-3">
            Previous Sessions ({pastSessions.length})
          </h4>
          <div className="space-y-2">
            {pastSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-950/40 border border-neutral-800/50 text-xs text-neutral-300"
              >
                <div>
                  <span className="font-medium text-neutral-200">{session.title}</span>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    {formatSessionDateTime(session.scheduled_at, session.duration_minutes)}
                  </div>
                </div>
                {getStatusBadge(session.state)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivitySessionCard;
