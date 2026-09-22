import { ActivityType as IntentType } from "@/types";
import { PublicActivity, ActivityState, MeetingPlatform } from "@/lib/activity/types";
import { Hammer, Brain, MessageSquare, Sparkles } from "lucide-react";
import React from "react";

export interface IntentMeta {
  type: IntentType;
  label: string;
  verb: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeClass: string;
}

export const INTENT_META_MAP: Record<IntentType, IntentMeta> = {
  BUILD: {
    type: "BUILD",
    label: "BUILD",
    verb: "Building together",
    icon: Hammer,
    accentColor: "text-[#C9A84A]",
    badgeClass: "bg-[#C9A84A]/10 text-[#C9A84A] border-[#C9A84A]/30",
  },
  LEARN: {
    type: "LEARN",
    label: "LEARN",
    verb: "Learning together",
    icon: Brain,
    accentColor: "text-sky-400",
    badgeClass: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  },
  CONVERSATION: {
    type: "CONVERSATION",
    label: "CONVERSATION",
    verb: "Open discussion",
    icon: MessageSquare,
    accentColor: "text-violet-400",
    badgeClass: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  },
  EXPLORE: {
    type: "EXPLORE",
    label: "EXPLORE",
    verb: "Serendipitous discovery",
    icon: Sparkles,
    accentColor: "text-[#C9A84A]",
    badgeClass: "bg-[#C9A84A]/10 text-[#C9A84A] border-[#C9A84A]/30",
  },
};

export function getIntentBadge(intent: IntentType) {
  const meta = INTENT_META_MAP[intent] || INTENT_META_MAP.BUILD;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${meta.badgeClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

export function getActivityStatusBadge(status: ActivityState) {
  switch (status) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          ACTIVE
        </span>
      );
    case "PAUSED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C9A84A]/10 text-[#C9A84A] border border-[#C9A84A]/30">
          PAUSED
        </span>
      );
    case "ENDED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
          ENDED
        </span>
      );
    default:
      return null;
  }
}

export function formatRecurrenceLabel(
  activityType: "ONE_TIME" | "RECURRING",
  frequency?: string,
  dayOfWeek?: string,
  timeOfDay?: string
): string {
  if (activityType === "ONE_TIME") {
    return `One-time session · ${dayOfWeek || "Upcoming"} ${timeOfDay ? `at ${timeOfDay}` : ""}`;
  }

  const freqText =
    frequency === "WEEKLY"
      ? "Weekly"
      : frequency === "EVERY_2_WEEKS"
      ? "Every 2 weeks"
      : "Recurring";

  return `${freqText} · ${dayOfWeek || "Schedules"} · ${timeOfDay || "TBD"}`;
}

export function formatScheduleText(activity: PublicActivity): string {
  const type = activity.recurrence_type || activity.activity_type || "RECURRING";
  const day = activity.schedule_day || activity.day_of_week || "Saturdays";
  const time = activity.schedule_time || activity.time_of_day || "8:00 PM";
  const freq = activity.frequency === "WEEKLY" ? "Weekly" : activity.frequency === "EVERY_2_WEEKS" ? "Every 2 weeks" : "Recurring";

  if (type === "ONE_TIME") {
    return `One-time session · ${day} at ${time}`;
  }
  return `${freq} · ${day} · ${time}`;
}

export function formatSessionDateTime(scheduledAt: string, durationMinutes: number = 60): string {
  return `${scheduledAt} (${durationMinutes} mins)`;
}

export function getPlatformBadgeColor(platform?: MeetingPlatform): string {
  switch (platform) {
    case "Google Meet":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    case "Zoom":
      return "bg-sky-500/10 text-sky-300 border-sky-500/30";
    case "Discord":
      return "bg-indigo-500/10 text-indigo-300 border-indigo-500/30";
    default:
      return "bg-[#C9A84A]/10 text-[#C9A84A] border-[#C9A84A]/30";
  }
}
