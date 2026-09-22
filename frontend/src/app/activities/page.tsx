"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PublicActivity, ActivityIntent } from "@/lib/activity/types";
import { activityApiService } from "@/lib/activity/api-service";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { HostActivityForm } from "@/components/activity/HostActivityForm";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { Plus, Sparkles, Filter, Loader2, RefreshCw } from "lucide-react";

import { JoinActivityChatModal } from "@/components/activity/JoinActivityChatModal";

export default function ActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<PublicActivity[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<ActivityIntent | "ALL">("ALL");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activity Chat modal state
  const [selectedActivityForChat, setSelectedActivityForChat] = useState<PublicActivity | null>(null);
  const [isJoiningChat, setIsJoiningChat] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activityApiService.getActivities();
      setActivities(data);
    } catch (err: any) {
      console.error("Error fetching activities:", err);
      setError("Failed to load community activities. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredActivities = activities.filter((act) => {
    if (selectedIntent === "ALL") return true;
    return act.intent === selectedIntent;
  });

  const handleJoinToggle = async (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    try {
      if (activity.is_participant) {
        await activityApiService.leaveActivity(activityId);
      } else {
        await activityApiService.joinActivity(activityId);
      }
      await fetchActivities();
    } catch (err: any) {
      console.error("Join/Leave error:", err);
    }
  };

  const handleOpenActivityChat = async (activity: PublicActivity) => {
    if (activity.is_participant || activity.is_host || activity.status === "ENDED") {
      try {
        if (activity.conversation_id) {
          router.push(`/messages/${activity.conversation_id}`);
        } else {
          const convo = await activityApiService.getActivityConversation(activity.id);
          router.push(`/messages/${convo.id}`);
        }
      } catch (err) {
        console.error("Failed to open activity conversation:", err);
      }
    } else {
      setSelectedActivityForChat(activity);
    }
  };

  const handleConfirmJoinChat = async () => {
    if (!selectedActivityForChat) return;
    setIsJoiningChat(true);
    try {
      const joined = await activityApiService.joinActivity(selectedActivityForChat.id);
      let convoId = joined.conversation_id;
      if (!convoId) {
        const convo = await activityApiService.getActivityConversation(selectedActivityForChat.id);
        convoId = convo.id;
      }
      setSelectedActivityForChat(null);
      router.push(`/messages/${convoId}`);
    } catch (err) {
      console.error("Failed to join activity chat:", err);
    } finally {
      setIsJoiningChat(false);
    }
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
      {/* Page Title & Host CTA Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-zinc-800/80">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#C9A84A]">
              COMMUNITY ACTIVITIES & SESSIONS
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#C9A84A]" />
            Activities
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Host or join live project sessions, study rooms, and collaborative discussions built around real intent.
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

      {/* Intent Filters and Refresh Button */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
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

        <button
          onClick={fetchActivities}
          disabled={loading}
          className="p-2 rounded-xl border border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all shrink-0"
          title="Refresh activities"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content Area */}
      {loading && activities.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A84A]" />
          <p className="text-xs text-zinc-400 font-mono">Loading community activities...</p>
        </div>
      ) : error ? (
        <div className="py-12 px-6 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-3">
          <p className="text-xs text-rose-300">{error}</p>
          <button
            onClick={fetchActivities}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-16 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 space-y-2">
          <p className="font-semibold text-zinc-400">No activities found</p>
          <p className="text-zinc-500">
            {selectedIntent === "ALL"
              ? "Be the first to host an activity for the community!"
              : `No active spaces found under "${selectedIntent}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => router.push(`/activities/${act.id}`)}
              className="cursor-pointer"
            >
              <ActivityCard
                activity={act}
                onJoinToggle={(e) => {
                  e?.stopPropagation?.();
                  handleJoinToggle(act.id);
                }}
                onActivityChat={(a) => handleOpenActivityChat(a)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Join Activity Chat Modal */}
      <JoinActivityChatModal
        isOpen={!!selectedActivityForChat}
        onClose={() => setSelectedActivityForChat(null)}
        onConfirm={handleConfirmJoinChat}
        activityTitle={selectedActivityForChat?.title}
        isJoining={isJoiningChat}
      />

      {/* Host Activity Modal Form */}
      {isHostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <HostActivityForm
              onClose={() => setIsHostModalOpen(false)}
              onSuccess={() => {
                setIsHostModalOpen(false);
                fetchActivities();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
