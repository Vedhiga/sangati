"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  Phone,
  Video,
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CallModal, CallState, CallType } from "@/components/calling/call-modal";

interface ActivityMeta {
  type: ActivityType;
  label: string;
  badgeBg: string;
  badgeText: string;
}

const ACTIVITY_MAP: Record<ActivityType, ActivityMeta> = {
  BUILD: { type: "BUILD", label: "Build", badgeBg: "bg-white/10 border-white/20", badgeText: "text-white" },
  LEARN: { type: "LEARN", label: "Learn", badgeBg: "bg-white/10 border-white/20", badgeText: "text-white" },
  CONVERSATION: { type: "CONVERSATION", label: "Conversation", badgeBg: "bg-white/10 border-white/20", badgeText: "text-white" },
  EXPLORE: { type: "EXPLORE", label: "Explore", badgeBg: "bg-white/10 border-white/20", badgeText: "text-white" },
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

  // WebRTC Calling State
  const [activeCall, setActiveCall] = useState<{
    callType: CallType;
    callState: CallState;
    remoteUser: { display_name: string; username: string; avatar_url?: string | null };
  } | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Clear unread badge when entering conversation
  const markAsRead = useCallback(async () => {
    try {
      await api.put(`/api/v1/conversations/${conversationId}/read`);
    } catch {
      // Ignore background errors
    }
  }, [conversationId]);

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
          markAsRead();
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
  }, [conversationId, router, scrollToBottom, markAsRead]);

  // WebRTC PeerConnection Setup
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "webrtc_ice_candidate",
          payload: { candidate: event.candidate, senderId: currentUserId },
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [currentUserId]);

  // Cleanup Call Media
  const endCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call_end",
        payload: { senderId: currentUserId },
      });
    }

    setActiveCall(null);
  }, [localStream, currentUserId]);

  // Supabase Realtime Broadcast Signaling Channel
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase.channel(`call:${conversationId}`);

    channel
      .on("broadcast", { event: "call_invite" }, async ({ payload }) => {
        if (payload.senderId !== currentUserId) {
          setActiveCall({
            callType: payload.callType,
            callState: "incoming",
            remoteUser: payload.senderUser,
          });
        }
      })
      .on("broadcast", { event: "call_accept" }, async ({ payload }) => {
        if (payload.senderId !== currentUserId && peerConnectionRef.current) {
          setActiveCall((prev) => (prev ? { ...prev, callState: "active" } : null));
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          channel.send({
            type: "broadcast",
            event: "webrtc_offer",
            payload: { offer, senderId: currentUserId },
          });
        }
      })
      .on("broadcast", { event: "call_reject" }, ({ payload }) => {
        if (payload.senderId !== currentUserId) {
          endCall();
        }
      })
      .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
        if (payload.senderId !== currentUserId && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "webrtc_answer",
            payload: { answer, senderId: currentUserId },
          });
        }
      })
      .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
        if (payload.senderId !== currentUserId && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
        }
      })
      .on("broadcast", { event: "webrtc_ice_candidate" }, async ({ payload }) => {
        if (payload.senderId !== currentUserId && peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error("Error adding ice candidate:", e);
          }
        }
      })
      .on("broadcast", { event: "call_end" }, ({ payload }) => {
        if (payload.senderId !== currentUserId) {
          endCall();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, endCall]);

  // Start Outgoing Call
  const startCall = async (type: CallType) => {
    if (!conversation?.other_user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video",
      });

      setLocalStream(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      setActiveCall({
        callType: type,
        callState: "outgoing",
        remoteUser: {
          display_name: conversation.other_user.display_name,
          username: conversation.other_user.username,
          avatar_url: conversation.other_user.avatar_url,
        },
      });

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "call_invite",
          payload: {
            callType: type,
            senderId: currentUserId,
            senderUser: {
              display_name: conversation.other_user.display_name,
              username: conversation.other_user.username,
              avatar_url: conversation.other_user.avatar_url,
            },
          },
        });
      }
    } catch (err) {
      alert("Microphone or camera permission was denied or device is unavailable.");
      console.error(err);
    }
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    if (!activeCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCall.callType === "video",
      });

      setLocalStream(stream);
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      setActiveCall({ ...activeCall, callState: "active" });

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "call_accept",
          payload: { senderId: currentUserId },
        });
      }
    } catch (err) {
      alert("Microphone or camera permission was denied.");
      console.error(err);
      endCall();
    }
  };

  // Reject Incoming Call
  const rejectCall = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "call_reject",
        payload: { senderId: currentUserId },
      });
    }
    endCall();
  };

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
          return prev;
        });
      } catch {
        // Silently skip
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
    : "S";

  return (
    <div className="w-full flex flex-col h-[calc(100vh-6rem)] animate-fade-in-up">
      {/* WebRTC Active Call Modal Overlay */}
      {activeCall && (
        <CallModal
          callType={activeCall.callType}
          callState={activeCall.callState}
          remoteUser={activeCall.remoteUser}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEndCall={endCall}
        />
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/messages">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-[#8A8A8A] hover:text-white hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {conversation && (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 border border-white/15 shrink-0">
                {!isGroup && otherUser?.avatar_url && (
                  <AvatarImage src={otherUser.avatar_url} alt={title} />
                )}
                <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-xs font-semibold">
                  {isGroup ? <Sparkles className="h-4 w-4" /> : initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#F5F5F3] truncate">
                    {title}
                  </h2>
                  {conversation?.conversation_type === "ACTIVITY" && (
                    <span className="text-[10px] font-medium py-0.5 px-2 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0">
                      🤖 Activity
                    </span>
                  )}
                  {conversation?.status === "ARCHIVED" && (
                    <span className="text-[10px] font-medium py-0.5 px-2 rounded-full border bg-zinc-800 text-zinc-400 border-zinc-700 shrink-0">
                      Ended / Read-Only
                    </span>
                  )}
                  {!isGroup && activityMeta && conversation?.conversation_type !== "ACTIVITY" && (
                    <span
                      className={`text-[10px] font-mono py-0.5 px-2 rounded-full border shrink-0 ${activityMeta.badgeBg}`}
                    >
                      {activityMeta.label}
                    </span>
                  )}
                </div>
                {!isGroup && otherUser && (
                  <p className="text-[11px] text-[#8A8A8A] truncate font-mono">
                    @{otherUser.username}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 📞 Voice & 🎥 Video Calling Buttons (1-to-1 Only) */}
        {!isGroup && otherUser && conversation?.conversation_type !== "ACTIVITY" && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => startCall("voice")}
              className="h-8 gap-1.5 px-3 border-white/15 bg-white/5 text-[#F5F5F3] hover:bg-white hover:text-black text-xs rounded-full transition-all"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voice Call</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startCall("video")}
              className="h-8 gap-1.5 px-3 border-white/15 bg-white/5 text-[#F5F5F3] hover:bg-white hover:text-black text-xs rounded-full transition-all"
            >
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Video Call</span>
            </Button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <p className="text-sm text-[#F5F5F3] font-medium">{error}</p>
            <Link href="/messages">
              <Button size="sm" variant="outline" className="text-xs border-white/15 text-[#F5F5F3] rounded-full">
                Return to messages
              </Button>
            </Link>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#8A8A8A]" />
        </div>
      ) : (
        <>
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Conversation Intro Header */}
            {conversation && (
              <div className="py-6 px-4 text-center space-y-2 border border-white/[0.08] bg-sangati-card rounded-2xl">
                <Avatar className="h-14 w-14 border border-white/15 mx-auto">
                  {!isGroup && otherUser?.avatar_url && (
                    <AvatarImage src={otherUser.avatar_url} />
                  )}
                  <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-base font-semibold">
                    {isGroup || conversation.conversation_type === "ACTIVITY" ? <Sparkles className="h-6 w-6 text-amber-400" /> : initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-semibold text-[#F5F5F3]">
                    {title}
                  </h3>
                  {!isGroup && otherUser && (
                    <p className="text-xs text-[#8A8A8A] font-mono">
                      @{otherUser.username}
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-[#8A8A8A] font-normal pt-1">
                  {conversation.conversation_type === "ACTIVITY"
                    ? "Activity group conversation. Shared by all participants."
                    : "Connected on Sangati. 1-to-1 quiet conversation & WebRTC calls."}
                </p>
              </div>
            )}

            {/* Empty Messages */}
            {messages.length === 0 && (
              <div className="py-8 text-center text-xs text-[#8A8A8A]">
                No notes exchanged yet. Send a quiet note to break the ice!
              </div>
            )}

            {/* Message Bubbles */}
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
                      <span className="text-[10px] uppercase tracking-widest font-mono text-[#8A8A8A] bg-white/[0.02] border border-white/10 px-3 py-0.5 rounded-full">
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
                      className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? "bg-[#F5F5F3] text-[#0A0A0A] font-medium rounded-tr-none"
                          : "bg-white/[0.03] text-[#F5F5F3] border border-white/10 rounded-tl-none"
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-[#8A8A8A] px-1 mt-1 font-mono">
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
          {conversation?.status === "ARCHIVED" ? (
            <div className="pt-3 pb-2 border-t border-white/[0.08] shrink-0 text-center">
              <div className="p-3.5 rounded-2xl border border-white/10 bg-zinc-900/60 text-xs text-zinc-400 font-mono flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>This activity conversation has ended and is read-only.</span>
              </div>
            </div>
          ) : (
            <div className="pt-3 pb-1 border-t border-white/[0.08] shrink-0">
              <div className="relative rounded-2xl border border-white/[0.08] bg-sangati-card p-3 focus-within:border-white/20 transition-all shadow-xl">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a note... (Shift+Enter for newline)"
                  maxLength={2000}
                  rows={2}
                  disabled={isSending}
                  className="w-full resize-none border-0 p-1 text-sm text-[#F5F5F3] bg-transparent focus-visible:ring-0 shadow-none placeholder:text-zinc-600 min-h-[48px]"
                />

                <div className="flex items-center justify-between pt-2 text-[11px] text-[#8A8A8A] border-t border-white/[0.06] px-1">
                  <span className="font-mono">{content.length} / 2000</span>

                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!content.trim() || isSending || content.length > 2000}
                    className="h-8 px-4 text-xs gap-1.5 bg-[#F5F5F3] text-[#0A0A0A] hover:bg-white font-medium rounded-full shadow-lg transition-all"
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Send</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
