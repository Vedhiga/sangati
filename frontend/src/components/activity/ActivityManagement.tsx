"use client";

import React, { useState } from "react";
import { PublicActivity, ActivityState } from "@/lib/activity/types";
import { getActivityStatusBadge } from "@/lib/activity/activity-utils";
import { Settings, Pause, Play, StopCircle, UserPlus, Edit3, AlertTriangle, Shield } from "lucide-react";

interface ActivityManagementProps {
  activity: PublicActivity;
  onEdit?: () => void;
  onOpenInvite: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

export function ActivityManagement({
  activity,
  onEdit,
  onOpenInvite,
  onPause,
  onResume,
  onEnd,
}: ActivityManagementProps) {
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  return (
    <div className="rounded-2xl border border-[#C9A84A]/20 bg-neutral-900/80 p-5 backdrop-blur-md space-y-5 relative overflow-hidden">
      {/* Decorative Gold Header Tag */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#C9A84A]" />
          <h3 className="text-xs font-bold tracking-wider text-[#C9A84A] uppercase">
            Host Controls
          </h3>
        </div>
        {getActivityStatusBadge(activity.status)}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="text-neutral-500 text-[11px] mb-0.5">Participants</div>
          <div className="text-sm font-semibold text-neutral-100">
            {activity.participant_count}{" "}
            <span className="text-neutral-500 font-normal">
              / {activity.participant_limit ? activity.participant_limit : "∞"}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
          <div className="text-neutral-500 text-[11px] mb-0.5">Schedule</div>
          <div className="text-sm font-semibold text-neutral-100 truncate">
            {activity.recurrence_type === "RECURRING" ? activity.frequency || "Recurring" : "One-time"}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2">
        {activity.status === "ACTIVE" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenInvite}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#C9A84A]" />
              Invite Connections
            </button>

            <button
              onClick={onEdit}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
              Edit Activity
            </button>
          </div>
        )}

        {/* Status Modifiers */}
        {activity.status === "ACTIVE" && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onPause}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-[#C9A84A]/10 hover:bg-[#C9A84A]/20 text-[#C9A84A] border border-[#C9A84A]/30 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause Activity
            </button>

            <button
              onClick={() => setShowConfirmEnd(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5" />
              End Activity
            </button>
          </div>
        )}

        {activity.status === "PAUSED" && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-[#C9A84A]/10 border border-[#C9A84A]/30 text-xs text-[#C9A84A] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C9A84A] shrink-0 mt-0.5" />
              <span>Activity is currently paused. Upcoming sessions are on hold.</span>
            </div>
            <button
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume Activity
            </button>
          </div>
        )}

        {activity.status === "ENDED" && (
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-center space-y-1">
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              ENDED
            </div>
            <div className="text-[11px] text-neutral-500">
              This activity has permanently ended. No future sessions will be hosted.
            </div>
          </div>
        )}
      </div>

      {/* Confirm End Modal */}
      {showConfirmEnd && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-950/40 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-red-300">Permanently End Activity?</strong>
              This action will end future recurring sessions. Existing participants will retain historical access.
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowConfirmEnd(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowConfirmEnd(false);
                onEnd();
              }}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-500 text-white"
            >
              Yes, End Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityManagement;
