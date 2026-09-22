"use client";

import React, { useState, useEffect } from "react";
import { PublicActivity, ActivityIntent } from "@/lib/activity/types";
import { activityService } from "@/lib/activity/mock-service";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { HostActivityForm } from "@/components/activity/HostActivityForm";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { Plus, FlaskConical, Filter } from "lucide-react";

export default function ActivityLabPage() {
  const [activities, setActivities] = useState<PublicActivity[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<ActivityIntent | "ALL">("ALL");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const currentUserId = "user_1"; // Mock current user

  const reloadActivities = () => {
    const list = activityService.getAllActivities(currentUserId);
    setActivities(list);
  };

  useEffect(() => {
    reloadActivities();
  }, []);

  const filteredActivities = activities.filter((act) => {
    if (selectedIntent === "ALL") return true;
    return act.intent === selectedIntent;
  });

  const handleJoinToggle = (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    if (activity.is_participant) {
      activityService.leaveActivity(activityId, currentUserId);
    } else {
      activityService.joinActivity(activityId, currentUserId);
    }
    reloadActivities();
  };

  const intentOptions: (ActivityIntent | "ALL")[] = [
    "ALL",
    "BUILD",
    "LEARN",
    "CONVERSATION",
    "EXPLORE",
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Prototype Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl py-2.5 px-4 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-300">
          <FlaskConical className="w-4 h-4 text-[#C9A84A] shrink-0" />
          <span className="text-[#C9A84A] font-semibold tracking-wide">
            ACTIVITY SYSTEM — ISOLATED PROTOTYPE LAB
          </span>
          <span className="hidden md:inline text-zinc-400 font-normal">
            | Self-contained module using mock state. Phase 1 active.
          </span>
        </div>
      </div>

      {/* Page Title & LiquidMetal Host CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-zinc-800/80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#C9A84A]">
              COMMUNITY ACTIVITIES & SESSIONS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
            Activity Lab
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Explore persistent community spaces built around{" "}
            <strong className="text-[#C9A84A] font-medium">Build</strong>,{" "}
            <strong className="text-[#C9A84A] font-medium">Learn</strong>,{" "}
            <strong className="text-[#C9A84A] font-medium">Conversation</strong>, and{" "}
            <strong className="text-[#C9A84A] font-medium">Explore</strong> intents.
          </p>
        </div>

        {/* Primary LiquidMetal CTA */}
        <div className="shrink-0 self-start sm:self-end">
          <LiquidMetalButton
            onClick={() => setIsHostModalOpen(true)}
            size="md"
            icon={<Plus className="w-4 h-4 text-[#C9A84A]" />}
          >
            + Host Activity
          </LiquidMetalButton>
        </div>
      </div>

      {/* Intent Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs text-zinc-500 flex items-center gap-1.5 mr-2 shrink-0 font-mono">
          <Filter className="w-3.5 h-3.5 text-zinc-400" /> Filter:
        </span>
        {intentOptions.map((intent) => {
          const isActive = selectedIntent === intent;
          return (
            <button
              key={intent}
              onClick={() => setSelectedIntent(intent)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-zinc-900 border border-[#C9A84A]/40 text-[#C9A84A] shadow-sm"
                  : "bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              {intent === "ALL" ? "All Activities" : intent}
            </button>
          );
        })}
      </div>

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredActivities.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
            No activities found for the selected intent filter.
          </div>
        ) : (
          filteredActivities.map((act) => (
            <ActivityCard
              key={act.id}
              activity={act}
              onJoinToggle={() => handleJoinToggle(act.id)}
            />
          ))
        )}
      </div>

      {/* Host Activity Modal Form */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <HostActivityForm
              onClose={() => setIsHostModalOpen(false)}
              onSuccess={() => {
                setIsHostModalOpen(false);
                reloadActivities();
              }}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
