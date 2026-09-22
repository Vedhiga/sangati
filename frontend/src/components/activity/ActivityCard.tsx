"use client";

import React from "react";
import Link from "next/link";
import { PublicActivity } from "@/lib/activity/types";
import { INTENT_META_MAP, formatRecurrenceLabel } from "@/lib/activity/activity-utils";
import { ElasticStack, ElasticStackItem } from "@/components/ui/elastic-stack";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: PublicActivity;
  isParticipant?: boolean;
  isHost?: boolean;
  onJoin?: (id: string) => void;
  onJoinToggle?: (e?: React.MouseEvent) => void;
  className?: string;
}

export function ActivityCard({
  activity,
  isParticipant = activity.is_participant || false,
  isHost = activity.is_host || false,
  onJoin,
  onJoinToggle,
  className,
}: ActivityCardProps) {
  const intentMeta = INTENT_META_MAP[activity.intent] || INTENT_META_MAP.BUILD;
  const IntentIcon = intentMeta.icon;

  // Map participants to ElasticStack items
  const elasticItems: ElasticStackItem[] = activity.public_participants.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.avatar || p.avatar_url,
  }));

  const handleJoinClick = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (onJoinToggle) {
      onJoinToggle(e);
    } else if (onJoin) {
      onJoin(activity.id);
    }
  };

  const isFull = activity.participant_count >= (activity.participant_limit || activity.max_participants || 10);
  const isInactive = activity.status !== "ACTIVE";

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-sangati-glass p-6 space-y-5 hover:border-white/20 transition-all duration-300 flex flex-col justify-between shadow-2xl relative overflow-hidden group",
        isInactive && "opacity-75 border-dashed",
        className
      )}
    >
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84A]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#C9A84A]/10 transition-colors" />

      <div className="space-y-4 relative z-10">
        {/* Top Header: Intent Badge & Status Badge */}
        <div className="flex items-center justify-between">
          <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide", intentMeta.badgeClass)}>
            <IntentIcon className={cn("w-3.5 h-3.5", intentMeta.accentColor)} />
            <span>{intentMeta.label}</span>
          </div>

          <div className="flex items-center gap-2">
            {activity.status === "PAUSED" ? (
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-[#C9A84A]/10 text-[#C9A84A] border border-[#C9A84A]/20 font-bold">
                PAUSED
              </span>
            ) : activity.status === "ENDED" ? (
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold">
                ENDED
              </span>
            ) : (
              <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <Link href={`/activity-lab/${activity.id}`}>
            <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight line-clamp-1">
              {activity.title}
            </h3>
          </Link>
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 font-normal">
            {activity.description}
          </p>
        </div>

        {/* Schedule & Recurrence */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#C9A84A] bg-white/[0.02] border border-white/5 px-3 py-2 rounded-xl">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-[#C9A84A]" />
          <span className="truncate">
            {formatRecurrenceLabel(
              activity.activity_type,
              activity.frequency,
              activity.day_of_week,
              activity.time_of_day
            )}
          </span>
        </div>

        {/* Participants ElasticStack Section */}
        <div className="pt-2 pb-1 border-y border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px] tracking-wider uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Participants ({activity.participant_count} / {activity.max_participants})</span>
            </span>
            {isHost && (
              <span className="text-[10px] font-mono text-[#C9A84A] px-2 py-0.5 rounded bg-[#C9A84A]/10 border border-[#C9A84A]/20 font-bold">
                YOU ARE HOST
              </span>
            )}
          </div>

          <div className="flex items-center justify-center min-h-[70px]">
            {elasticItems.length > 0 ? (
              <ElasticStack items={elasticItems} itemSize={44} overlap={18} />
            ) : (
              <p className="text-xs text-zinc-500 italic">No participants yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Card Bottom: Host info & Action CTA */}
      <div className="pt-3 flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-7 h-7 border border-white/10 shrink-0">
            <AvatarImage src={activity.host.avatar_url} />
            <AvatarFallback className="bg-zinc-800 text-zinc-300 text-[10px] font-bold">
              {activity.host.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400 truncate">
              Hosted by <span className="text-zinc-200 font-medium">@{activity.host.username}</span>
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {isParticipant ? (
            <Link href={`/activities/${activity.id}`}>
              <LiquidMetalButton size="sm" icon={<Check className="w-3.5 h-3.5 text-emerald-400" />}>
                Participating
              </LiquidMetalButton>
            </Link>
          ) : isInactive ? (
            <Link href={`/activities/${activity.id}`}>
              <LiquidMetalButton size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                View Activity
              </LiquidMetalButton>
            </Link>
          ) : isFull ? (
            <span className="text-xs text-zinc-500 font-mono px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
              Activity Full
            </span>
          ) : (
            <LiquidMetalButton
              size="sm"
              onClick={handleJoinClick}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Join Activity
            </LiquidMetalButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityCard;
