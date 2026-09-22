"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PublicActivity, ParticipantActivityDetails, MockConnection } from "@/lib/activity/types";
import { activityService } from "@/lib/activity/mock-service";
import { ElasticStack } from "@/components/ui/elastic-stack";
import { getIntentBadge, getActivityStatusBadge, formatScheduleText } from "@/lib/activity/activity-utils";
import { ActivitySessionCard } from "@/components/activity/ActivitySession";
import { ActivityManagement } from "@/components/activity/ActivityManagement";
import { ActivityInviteDialog } from "@/components/activity/ActivityInviteDialog";
import {
  Users,
  Calendar,
  Lock,
  MessageSquare,
  Send,
  UserCheck,
  UserMinus,
  Check,
  FileText,
  Clock,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { activityApiService } from "@/lib/activity/api-service";

import { useRouter } from "next/navigation";
import { JoinActivityChatModal } from "@/components/activity/JoinActivityChatModal";

interface ActivityDetailProps {
  activityId: string;
  currentUserId?: string;
  onBack?: () => void;
}

export function ActivityDetail({
  activityId,
  currentUserId,
  onBack,
}: ActivityDetailProps) {
  const router = useRouter();
  const [publicData, setPublicData] = useState<PublicActivity | null>(null);
  const [privateData, setPrivateData] = useState<ParticipantActivityDetails | null>(null);
  const [connections, setConnections] = useState<MockConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "participants">("overview");

  // Activity Chat modal state
  const [isJoinChatOpen, setIsJoinChatOpen] = useState(false);
  const [isJoiningChat, setIsJoiningChat] = useState(false);

  const loadActivityData = async () => {
    setLoading(true);
    try {
      const pub = await activityApiService.getActivity(activityId);
      setPublicData(pub);

      if (pub && (pub.is_participant || pub.is_host)) {
        const priv = await activityApiService.getParticipantDetails(activityId);
        setPrivateData(priv);
      } else {
        setPrivateData(null);
      }

      const conns = await activityApiService.getAcceptedConnections();
      setConnections(conns);
    } catch (err) {
      console.error("Failed to load activity detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivityData();
  }, [activityId]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center py-20 text-xs text-neutral-500">
        Loading activity workspace...
      </div>
    );
  }

  if (!publicData) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <p className="text-sm font-medium text-neutral-400">Activity not found or has been removed.</p>
        <Link
          href="/activities"
          className="px-4 py-2 rounded-lg text-xs bg-[#C9A84A] text-neutral-950 font-semibold"
        >
          Back to Activities
        </Link>
      </div>
    );
  }

  const handleOpenChat = async () => {
    if (publicData.is_participant || publicData.is_host || publicData.status === "ENDED") {
      try {
        let convoId = publicData.conversation_id;
        if (!convoId) {
          const convo = await activityApiService.getActivityConversation(activityId);
          convoId = convo.id;
        }
        router.push(`/messages/${convoId}`);
      } catch (err) {
        console.error("Failed to fetch activity conversation:", err);
      }
    } else {
      setIsJoinChatOpen(true);
    }
  };

  const handleConfirmJoinChat = async () => {
    setIsJoiningChat(true);
    try {
      const joined = await activityApiService.joinActivity(activityId);
      let convoId = joined.conversation_id;
      if (!convoId) {
        const convo = await activityApiService.getActivityConversation(activityId);
        convoId = convo.id;
      }
      setIsJoinChatOpen(false);
      router.push(`/messages/${convoId}`);
    } catch (err) {
      console.error("Failed to join activity chat:", err);
    } finally {
      setIsJoiningChat(false);
    }
  };

  const handleJoin = async () => {
    await activityApiService.joinActivity(activityId);
    await loadActivityData();
  };

  const handleLeave = async () => {
    await activityApiService.leaveActivity(activityId);
    await loadActivityData();
  };

  const handlePause = async () => {
    await activityApiService.pauseActivity(activityId);
    await loadActivityData();
  };

  const handleResume = async () => {
    await activityApiService.resumeActivity(activityId);
    await loadActivityData();
  };

  const handleEnd = async () => {
    await activityApiService.endActivity(activityId);
    await loadActivityData();
  };

  const handleSendInvites = async (selectedIds: string[]) => {
    await activityApiService.sendInvites(activityId, selectedIds);
    await loadActivityData();
  };

  const elasticItems = publicData.public_participants.map((p) => ({
    id: p.id,
    image: p.avatar,
    name: p.name,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/activities"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Activities
        </Link>
        <div className="flex items-center gap-2">
          {getActivityStatusBadge(publicData.status)}
          {publicData.is_host && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C9A84A]/10 text-[#C9A84A] border border-[#C9A84A]/30">
              Host
            </span>
          )}
        </div>
      </div>

      {/* Main Activity Header Card */}
      <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 md:p-8 backdrop-blur-xl space-y-6 overflow-hidden">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {getIntentBadge(publicData.intent)}
            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C9A84A]" />
              {formatScheduleText(publicData)}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-100">
            {publicData.title}
          </h1>

          <p className="text-sm md:text-base text-neutral-300 leading-relaxed max-w-3xl">
            {publicData.description}
          </p>
        </div>

        {/* Host Info & Participant Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-neutral-300">
              {publicData.host.avatar ? (
                <img src={publicData.host.avatar} alt={publicData.host.name} className="w-full h-full object-cover" />
              ) : (
                publicData.host.name.charAt(0)
              )}
            </div>
            <div>
              <div className="text-xs text-neutral-500">Hosted by</div>
              <div className="text-sm font-semibold text-neutral-200">
                {publicData.host.name}{" "}
                <span className="text-neutral-500 font-normal">@{publicData.host.handle}</span>
              </div>
            </div>
          </div>

          {/* ElasticStack Avatar Stack Integration */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-neutral-200">
                {publicData.participant_count} Participants
              </div>
              {publicData.participant_limit && (
                <div className="text-[11px] text-neutral-500">
                  Cap: {publicData.participant_limit} Max
                </div>
              )}
            </div>
            <ElasticStack items={elasticItems} itemSize={44} overlap={20} pushForce={12} className="py-0" />
          </div>
        </div>

        {/* Primary Participation Action Bar */}
        <div className="pt-4 border-t border-neutral-800/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {publicData.is_participant ? (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="w-4 h-4" />✓ Participating
                </span>
                {!publicData.is_host && (
                  <button
                    onClick={handleLeave}
                    className="text-xs text-neutral-400 hover:text-red-400 underline transition-colors"
                  >
                    Leave Activity
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={handleJoin}
                disabled={publicData.status !== "ACTIVE"}
                className="px-6 py-3 rounded-xl font-bold text-sm bg-[#C9A84A] hover:bg-[#b5953f] text-neutral-950 transition-all shadow-lg shadow-[#C9A84A]/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-neutral-950" />
                Join Activity
              </button>
            )}

            {/* Activity Chat Button */}
            <button
              onClick={handleOpenChat}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-100 transition-all inline-flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>
                {publicData.status === "ENDED"
                  ? "View Activity Chat"
                  : publicData.is_participant
                  ? "Activity Chat"
                  : "Join Activity Chat"}
              </span>
            </button>
          </div>

          {!publicData.is_participant && (
            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Join to unlock external meeting links & private discussion workspace</span>
            </div>
          )}
        </div>
      </div>

      {/* Host Controls Panel (If Host) */}
      {publicData.is_host && (
        <ActivityManagement
          activity={publicData}
          onOpenInvite={() => setIsInviteOpen(true)}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={handleEnd}
        />
      )}

      {/* Main Content Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sessions & Private Details (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs for Joined Participants */}
          {publicData.is_participant && (
            <div className="flex border-b border-neutral-800 gap-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-[#C9A84A] text-[#C9A84A]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Session & Details
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "chat"
                    ? "border-[#C9A84A] text-[#C9A84A]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Activity Chat ({privateData?.chat_messages?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("participants")}
                className={`pb-3 text-xs font-semibold tracking-wide border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "participants"
                    ? "border-[#C9A84A] text-[#C9A84A]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Participants ({publicData.participant_count})
              </button>
            </div>
          )}

          {/* Tab 1: Overview & Session Card */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <ActivitySessionCard
                upcomingSession={
                  privateData?.upcoming_session ||
                  (publicData.status === "ACTIVE"
                    ? {
                        id: "sess_upcoming",
                        title: "Next Scheduled Occurrence",
                        scheduled_at: publicData.schedule_time || "Saturdays · 8:00 PM",
                        duration_minutes: publicData.duration_minutes || 60,
                        state: "UPCOMING",
                      }
                    : undefined)
                }
                pastSessions={privateData?.past_sessions}
                meetingPlatform={privateData?.meeting_platform}
                meetingUrl={privateData?.meeting_url}
                isParticipant={!!publicData.is_participant}
                isHost={!!publicData.is_host}
              />

              {/* Private Notes & Resources (Participant Only) */}
              {publicData.is_participant && privateData?.private_notes && (
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Participant Instructions & Notes
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/60 p-3.5 rounded-lg border border-neutral-800">
                    {privateData.private_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Activity Chat */}
          {activeTab === "chat" && publicData.is_participant && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-neutral-100">
                  Integrated Group Conversation
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Activity Chat is part of the persistent Sangati Messages system. Connect with all participants in real-time.
                </p>
              </div>
              <button
                onClick={handleOpenChat}
                className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-all inline-flex items-center gap-2 shadow-lg shadow-amber-400/10"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Activity Chat in Messages</span>
              </button>
            </div>
          )}

          {/* Tab 3: Detailed Participants Roster */}
          {activeTab === "participants" && publicData.is_participant && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                    Participating Members ({publicData.participant_count})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {publicData.public_participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80"
                  >
                    <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center font-bold text-neutral-300 text-xs">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        p.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-200">{p.name}</div>
                      <div className="text-[11px] text-neutral-500">@{p.handle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Rules & Context */}
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-4">
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Activity Guidelines
            </h4>
            <ul className="text-xs text-neutral-400 space-y-2 list-disc list-inside leading-relaxed">
              <li>Sessions persist on schedule until the host ends the activity.</li>
              <li>Meeting links and private notes are accessible only to joined members.</li>
              <li>Respect community guidelines and participant time slots.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Join Activity Chat Modal */}
      <JoinActivityChatModal
        isOpen={isJoinChatOpen}
        onClose={() => setIsJoinChatOpen(false)}
        onConfirm={handleConfirmJoinChat}
        activityTitle={publicData.title}
        isJoining={isJoiningChat}
      />

      {/* Invitation Dialog Modal */}
      <ActivityInviteDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        connections={connections}
        onSendInvites={handleSendInvites}
        activityTitle={publicData.title}
      />
    </div>
  );
}

export default ActivityDetail;
