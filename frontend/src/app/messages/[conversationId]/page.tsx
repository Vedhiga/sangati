"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import {
  ActivityType,
  ConversationDetail,
  Message,
  MessagesListResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivityMeta {
  type: ActivityType;
  label: string;
  badgeBg: string;
  badgeText: string;
}

const ACTIVITY_MAP: Record<ActivityType, ActivityMeta> = {
  BUILD: { type: "BUILD", label: "Build", badgeBg: "bg-amber-500/10 border-amber-300/50", badgeText: "text-amber-800" },
  LEARN: { type: "LEARN", label: "Learn", badgeBg: "bg-indigo-500/10 border-indigo-300/50", badgeText: "text-indigo-800" },
  CONVERSATION: { type: "CONVERSATION", label: "Conversation", badgeBg: "bg-pink-500/10 border-pink-300/50", badgeText: "text-pink-800" },
  EXPLORE: { type: "EXPLORE", label: "Explore", badgeBg: "bg-teal-500/10 border-teal-300/50", badgeText: "text-teal-800" },
};

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) return "Today";
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.conversationId as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      if (isMounted) {
        setCurrentUserId(session.user.id);
      }

      try {
        const [convoData, msgsData] = await Promise.all([
          api.get<ConversationDetail>(`/api/v1/conversations/${conversationId}`),
          api.get<MessagesListResponse>(
            `/api/v1/conversations/${conversationId}/messages?limit=100`
          ),
        ]);

        if (isMounted) {
          setConversation(convoData);
          setMessages(msgsData.messages);
          setIsLoading(false);
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch (err) {
        if (isMounted) {
          if (err instanceof ApiClientError) {
            if (err.status === 401) {
              router.replace("/login");
              return;
            }
            if (err.status === 404) {
              setError("This conversation does not exist or you do not have permission to view it.");
              setIsLoading(false);
              return;
            }
            if (err.status === 403) {
              setError("You are not a participant in this conversation.");
              setIsLoading(false);
              return;
            }
          }
          setError(
            err instanceof Error ? err.message : "Failed to load conversation."
          );
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [conversationId, router, scrollToBottom]);

  // Periodic polling for incoming messages
  useEffect(() => {
    if (isLoading || !conversationId) return;

    const interval = setInterval(async () => {
      try {
        const msgsData = await api.get<MessagesListResponse>(
          `/api/v1/conversations/${conversationId}/messages?limit=100`
        );
        setMessages((prev) => {
          if (msgsData.messages.length !== prev.length) {
            setTimeout(() => scrollToBottom(true), 50);
            return msgsData.messages;
          }
          const prevLast = prev[prev.length - 1];
          const newLast = msgsData.messages[msgsData.messages.length - 1];
          if (prevLast?.id !== newLast?.id) {
            setTimeout(() => scrollToBottom(true), 50);
            return msgsData.messages;
          }
          return prev;
        });
      } catch {
        // Silently skip polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, isLoading, scrollToBottom]);

  const handleSendMessage = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const newMsg = await api.post<Message>(
        `/api/v1/conversations/${conversationId}/messages`,
        { content: trimmed }
      );
      setMessages((prev) => [...prev, newMsg]);
      setContent("");
      setTimeout(() => scrollToBottom(true), 50);
      textareaRef.current?.focus();
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Failed to send message."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isGroup = conversation?.is_group;
  const otherUser = conversation?.other_user;
  const title = conversation?.title || (isGroup
    ? conversation?.participants?.map((p) => p.display_name).join(", ")
    : otherUser?.display_name || "Conversation");

  const activityMeta = otherUser?.activity ? ACTIVITY_MAP[otherUser.activity] : null;

  const initials = title
    ? title
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SG";

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/messages">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              aria-label="Back to Messages"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {conversation && (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className={`h-9 w-9 border shrink-0 ${isGroup ? "border-amber-500/40 ring-2 ring-amber-500/20" : "border-zinc-700/80"}`}>
                {!isGroup && otherUser?.avatar_url && (
                  <AvatarImage src={otherUser.avatar_url} alt={title} />
                )}
                <AvatarFallback className={`text-xs font-extrabold ${isGroup ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-200"}`}>
                  {isGroup ? <Sparkles className="h-4 w-4" /> : initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-zinc-100 truncate">
                    {title}
                  </h2>
                  {isGroup && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium px-2 py-0.5 rounded-full shrink-0">
                      Group ({conversation.participants?.length || 2} members)
                    </span>
                  )}
                  {!isGroup && activityMeta && (
                    <span
                      className={`text-[10px] font-medium py-0.5 px-2 rounded-full border shrink-0 ${activityMeta.badgeBg} ${activityMeta.badgeText}`}
                    >
                      {activityMeta.label}
                    </span>
                  )}
                </div>
                {!isGroup && otherUser && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    @{otherUser.username}
                  </p>
                )}
                {isGroup && conversation.participants && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    With: {conversation.participants.map(p => `@${p.username}`).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <p className="text-sm text-zinc-300 font-medium">{error}</p>
            <Link href="/messages">
              <Button size="sm" variant="outline" className="text-xs border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800">
                Return to messages
              </Button>
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Conversation Intro Header */}
            {conversation && (
              <div className="py-6 px-4 text-center space-y-2 border border-zinc-800/80 mb-4 bg-zinc-900/40 rounded-2xl backdrop-blur-sm">
                <Avatar className="h-14 w-14 border border-zinc-700 mx-auto">
                  {!isGroup && otherUser?.avatar_url && (
                    <AvatarImage src={otherUser.avatar_url} />
                  )}
                  <AvatarFallback className={`text-sm font-bold ${isGroup ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-200"}`}>
                    {isGroup ? <Sparkles className="h-6 w-6" /> : initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-100">
                    {title}
                  </h3>
                  {!isGroup && otherUser && (
                    <p className="text-xs text-zinc-400">
                      @{otherUser.username}
                    </p>
                  )}
                  {isGroup && conversation.participants && (
                    <div className="flex flex-wrap justify-center gap-1 pt-1.5">
                      {conversation.participants.map((p) => (
                        <span key={p.user_id} className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full font-medium">
                          @{p.username}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {!isGroup && otherUser?.bio && (
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto italic">
                    &ldquo;{otherUser.bio}&rdquo;
                  </p>
                )}
                <p className="text-[11px] text-zinc-500 font-medium pt-1">
                  {isGroup ? "Group conversation. Quiet space for real collaboration." : "Connected on Sangati. 1-to-1 private conversation."}
                </p>
              </div>
            )}

            {/* Empty messages state */}
            {messages.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-500">
                No notes exchanged yet. Send a quiet note to break the ice!
              </div>
            )}

            {/* Render message bubbles */}
            {messages.map((msg, index) => {
              const isMine = msg.sender_id === currentUserId;
              const prevMsg = messages[index - 1];
              const showDateHeader =
                !prevMsg ||
                formatMessageDate(prevMsg.created_at) !==
                  formatMessageDate(msg.created_at);

              return (
                <div key={msg.id} className="space-y-3">
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-0.5 rounded-full">
                        {formatMessageDate(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      isMine ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? "bg-zinc-100 text-zinc-950 font-normal rounded-tr-xs"
                          : "bg-zinc-900/90 text-zinc-100 border border-zinc-800 rounded-tl-xs"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-zinc-500 px-1 mt-1 font-mono">
                      {formatMessageTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Send Error Notice */}
          {sendError && (
            <Alert variant="destructive" className="py-2 px-3 text-xs mb-2 bg-rose-950/40 text-rose-300 border-rose-800/40">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}

          {/* Composer */}
          <div className="pt-3 pb-1 border-t border-zinc-800/80 shrink-0">
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2.5 focus-within:border-zinc-700 transition-all shadow-lg">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a note... (Shift+Enter for newline)"
                maxLength={2000}
                rows={2}
                disabled={isSending}
                className="w-full resize-none border-0 p-1 text-sm text-zinc-100 bg-transparent focus-visible:ring-0 shadow-none placeholder:text-zinc-500 min-h-[48px]"
              />

              <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500 border-t border-zinc-800/60 px-1">
                <span className="font-mono">{content.length} / 2000</span>

                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!content.trim() || isSending || content.length > 2000}
                  className="h-7 px-3 text-xs gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold rounded-lg shadow-sm"
                >
                  {isSending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
