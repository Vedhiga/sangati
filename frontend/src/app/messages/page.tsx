"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Compass,
  ArrowRight,
  Clock,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import {
  ActivityType,
  ConversationItem,
  ConversationsListResponse,
  ConnectedPersonItem,
  ConnectionsListResponse,
  ConversationDetail,
  GroupConversationCreate,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface ActivityMeta {
  type: ActivityType;
  label: string;
  badgeBg: string;
}

const ACTIVITY_MAP: Record<ActivityType, ActivityMeta> = {
  BUILD: { type: "BUILD", label: "Build", badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  LEARN: { type: "LEARN", label: "Learn", badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  CONVERSATION: { type: "CONVERSATION", label: "Conversation", badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  EXPLORE: { type: "EXPLORE", label: "Explore", badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function MessagesInboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [connections, setConnections] = useState<ConnectedPersonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);

  // Group creation state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const [convosData, connsData] = await Promise.all([
          api.get<ConversationsListResponse>("/api/v1/conversations"),
          api.get<ConnectionsListResponse>("/api/v1/connections"),
        ]);
        setConversations(convosData.conversations);
        setConnections(connsData.connections);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Could not load messages. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleStartConversation = async (targetUserId: string) => {
    setStartingUserId(targetUserId);
    try {
      const convo = await api.post<ConversationDetail>(
        `/api/v1/conversations/${targetUserId}`
      );
      router.push(`/messages/${convo.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open conversation. Make sure you are connected."
      );
      setStartingUserId(null);
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length < 2) {
      setGroupError("Please select at least 2 connected users for a group conversation.");
      return;
    }

    setIsCreatingGroup(true);
    setGroupError(null);

    try {
      const groupData: GroupConversationCreate = {
        participant_user_ids: selectedUserIds,
        title: groupTitle.trim() || undefined,
      };
      const convo = await api.post<ConversationDetail>("/api/v1/conversations/group", groupData);
      setShowGroupModal(false);
      router.push(`/messages/${convo.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setGroupError(err.message);
      } else {
        setGroupError("Failed to create group conversation.");
      }
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const existing1to1UserIds = new Set(
    conversations
      .filter((c) => !c.is_group && c.other_user)
      .map((c) => c.other_user!.user_id)
  );
  const availableConnectionsToMessage = connections.filter(
    (conn) => !existing1to1UserIds.has(conn.user.user_id)
  );

  return (
    <div className="w-full space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
            <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
            <span>Sangati Messaging</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Messages
          </h1>
          <p className="text-xs text-slate-400">
            Private 1-to-1 notes & small group discussions with your network.
          </p>
        </div>

        {connections.length >= 2 && (
          <Button
            size="sm"
            onClick={() => setShowGroupModal(!showGroupModal)}
            className="gap-2 bg-white text-black hover:bg-slate-200 text-xs font-medium shrink-0 self-start sm:self-auto"
          >
            <Users className="h-3.5 w-3.5" />
            <span>New Group Chat</span>
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/20">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Group Creation Panel */}
      {showGroupModal && (
        <Card className="border border-white/10 bg-sangati-glass p-5 rounded-xl space-y-4 shadow-none">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" />
              <span>Create Small Group Conversation</span>
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-white"
              onClick={() => setShowGroupModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            {groupError && (
              <Alert variant="destructive" className="py-2 text-xs bg-rose-500/10 text-rose-300 border-rose-500/20">
                <AlertDescription>{groupError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label htmlFor="groupTitle" className="text-xs font-medium text-slate-300">Group Name (optional)</label>
              <Input
                id="groupTitle"
                placeholder="e.g. Project Group, ML Circle"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="border-white/10 bg-black/40 text-xs text-slate-100 placeholder:text-slate-500 focus:border-white/30"
                disabled={isCreatingGroup}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-300">
                Select Connected Members (at least 2):
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {connections.map((c) => {
                  const isSelected = selectedUserIds.includes(c.user.user_id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelectUser(c.user.user_id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-white/30 bg-white/10 text-slate-100 font-semibold"
                          : "border-white/10 bg-black/30 hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-7 w-7 border border-white/15 shrink-0">
                          <AvatarImage src={c.user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px] bg-slate-800 text-slate-300 font-semibold">
                            {c.user.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{c.user.display_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">@{c.user.username}</p>
                        </div>
                      </div>

                      <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                        isSelected ? "bg-white border-white text-black" : "border-white/20"
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setShowGroupModal(false)}
                disabled={isCreatingGroup}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={selectedUserIds.length < 2 || isCreatingGroup}
                className="bg-white text-black hover:bg-slate-200 text-xs font-medium px-4"
              >
                {isCreatingGroup ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                <span>Create Group ({selectedUserIds.length})</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 border border-white/10 bg-sangati-glass rounded-xl">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3 bg-white/5" />
                  <Skeleton className="h-3 w-2/3 bg-white/5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        /* Empty State */
        <div className="py-14 px-6 text-center border border-dashed border-white/10 rounded-xl bg-sangati-glass space-y-4 max-w-lg mx-auto shadow-none">
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              No active conversations yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Connect with members to start 1-to-1 or group discussions.
            </p>
          </div>

          {connections.length > 0 ? (
            <div className="space-y-3 pt-2 text-left">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                Start a chat with a connection
              </p>
              <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                {connections.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 border border-white/15 shrink-0">
                        <AvatarImage src={c.user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-slate-800 text-slate-300 font-semibold">
                          {c.user.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {c.user.display_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          @{c.user.username}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-white/15 bg-white/5 text-slate-200 hover:bg-white hover:text-black font-medium shrink-0"
                      onClick={() => handleStartConversation(c.user.user_id)}
                      disabled={startingUserId === c.user.user_id}
                    >
                      {startingUserId === c.user.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      <span>Say hello</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <Link href="/discover">
                <Button size="sm" className="gap-2 text-xs bg-white text-black hover:bg-slate-200 font-medium px-5">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Discover people</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Categorized Conversation Lists */
        <div className="space-y-6">
          {/* Helper function / component for single conversation item */}
          {(() => {
            const activityConversations = conversations.filter(
              (c) => c.conversation_type === "ACTIVITY" || !!c.activity_id
            );
            const groupConversations = conversations.filter(
              (c) => (c.conversation_type || (c.is_group ? "GROUP" : "DIRECT")) === "GROUP" && !c.activity_id
            );
            const directConversations = conversations.filter(
              (c) => (c.conversation_type || (c.is_group ? "GROUP" : "DIRECT")) === "DIRECT" && !c.activity_id
            );

            const renderConvoCard = (convo: ConversationItem, isActivitySection = false) => {
              const isGroup = convo.is_group;
              const isActivity = convo.conversation_type === "ACTIVITY" || !!convo.activity_id;
              const isArchived = convo.status === "ARCHIVED";
              const title = convo.title || (isGroup || isActivity
                ? convo.participants?.map((p) => p.display_name).join(", ")
                : convo.other_user?.display_name || "Conversation");

              const other = convo.other_user;
              const initials = title
                ? title
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "SG";

              const activityMeta = other?.activity ? ACTIVITY_MAP[other.activity] : null;
              const timestamp = convo.last_message_at || convo.created_at;

              return (
                <Link
                  key={convo.id}
                  href={`/messages/${convo.id}`}
                  className="block p-4 hover:bg-white/5 transition-colors duration-150 group"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className={`h-10 w-10 border shrink-0 ${
                      isActivity ? "border-amber-400/50" : isGroup ? "border-blue-400/50" : "border-white/15"
                    }`}>
                      {!isGroup && !isActivity && other?.avatar_url && (
                        <AvatarImage src={other.avatar_url} alt={title || ""} />
                      )}
                      <AvatarFallback className={`text-xs font-semibold ${
                        isActivity ? "bg-amber-500/20 text-amber-300" : isGroup ? "bg-blue-500/20 text-blue-300" : "bg-slate-800 text-slate-300"
                      }`}>
                        {isActivity ? "🤖" : isGroup ? <Users className="h-4 w-4" /> : initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-slate-100 text-sm truncate group-hover:text-white transition-colors flex items-center gap-1.5">
                            {title}
                          </span>

                          {isActivity && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                              <span>🤖 Activity</span>
                            </span>
                          )}

                          {isArchived && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium px-2 py-0.5 rounded-md shrink-0">
                              Ended / Archived
                            </span>
                          )}

                          {isGroup && !isActivity && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium px-2 py-0.5 rounded-md shrink-0">
                              Group ({convo.participants?.length || 2})
                            </span>
                          )}

                          {!isGroup && !isActivity && other && (
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">
                              @{other.username}
                            </span>
                          )}

                          {!isGroup && !isActivity && activityMeta && (
                            <span
                              className={`text-[10px] font-medium py-0.5 px-2 rounded-md border shrink-0 ${activityMeta.badgeBg}`}
                            >
                              {activityMeta.label}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(timestamp)}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 truncate leading-relaxed">
                        {convo.last_message ? (
                          convo.last_message.content
                        ) : (
                          <span className="italic text-slate-400">
                            Conversation started.
                          </span>
                        )}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors shrink-0 ml-1" />
                  </div>
                </Link>
              );
            };

            return (
              <div className="space-y-6">
                {/* Activities Section */}
                {activityConversations.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <span>🤖 Activity Chats</span>
                      <span className="text-[10px] text-amber-400/70 font-mono">({activityConversations.length})</span>
                    </h2>
                    <div className="divide-y divide-white/5 rounded-xl border border-amber-500/20 bg-sangati-glass overflow-hidden">
                      {activityConversations.map((c) => renderConvoCard(c, true))}
                    </div>
                  </div>
                )}

                {/* Groups Section */}
                {groupConversations.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span>Group Conversations</span>
                      <span className="text-[10px] text-slate-500 font-mono">({groupConversations.length})</span>
                    </h2>
                    <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-sangati-glass overflow-hidden">
                      {groupConversations.map((c) => renderConvoCard(c))}
                    </div>
                  </div>
                )}

                {/* Direct Messages Section */}
                {directConversations.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                      <span>Direct Messages</span>
                      <span className="text-[10px] text-slate-500 font-mono">({directConversations.length})</span>
                    </h2>
                    <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-sangati-glass overflow-hidden">
                      {directConversations.map((c) => renderConvoCard(c))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Quick-start with other connections */}
          {availableConnectionsToMessage.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Other connections you can message
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableConnectionsToMessage.map((c) => (
                  <Card
                    key={c.id}
                    className="p-3 border border-white/10 bg-sangati-glass flex items-center justify-between gap-2 hover:border-white/20 transition-colors rounded-xl shadow-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 border border-white/15 shrink-0">
                        <AvatarImage src={c.user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-slate-800 text-slate-300 font-semibold">
                          {c.user.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {c.user.display_name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          @{c.user.username}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-white/15 bg-white/5 text-slate-200 hover:bg-white hover:text-black font-medium shrink-0"
                      onClick={() => handleStartConversation(c.user.user_id)}
                      disabled={startingUserId === c.user.user_id}
                    >
                      {startingUserId === c.user.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      <span>Message</span>
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

