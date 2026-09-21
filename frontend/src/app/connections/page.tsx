"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Clock,
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowRight,
  AlertCircle,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import {
  ActivityType,
  ConnectionRequestItem,
  ConnectedPersonItem,
  IncomingRequestsResponse,
  ConnectionsListResponse,
  ConversationDetail,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ElasticStack, ElasticStackItem } from "@/components/ui/elastic-stack";

interface ActivityMeta {
  type: ActivityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
}

const ACTIVITY_MAP: Record<ActivityType, ActivityMeta> = {
  BUILD: { type: "BUILD", label: "Build", icon: Hammer, badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  LEARN: { type: "LEARN", label: "Learn", icon: Brain, badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  CONVERSATION: { type: "CONVERSATION", label: "Conversation", icon: MessageSquare, badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  EXPLORE: { type: "EXPLORE", label: "Explore", icon: Sparkles, badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
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

export default function ConnectionsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ConnectionRequestItem[]>([]);
  const [connections, setConnections] = useState<ConnectedPersonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [startingConvoUserId, setStartingConvoUserId] = useState<string | null>(null);
  const [showStackView, setShowStackView] = useState(false);

  useEffect(() => {
    async function loadAllConnections() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const [reqsData, connsData] = await Promise.all([
          api.get<IncomingRequestsResponse>("/api/v1/connections/requests"),
          api.get<ConnectionsListResponse>("/api/v1/connections"),
        ]);
        setRequests(reqsData.requests);
        setConnections(connsData.connections);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Could not load connections. Please try refreshing."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadAllConnections();
  }, [router]);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    setActionNotice(null);
    try {
      await api.put(`/api/v1/connections/${requestId}/accept`);
      const acceptedReq = requests.find((r) => r.id === requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));

      if (acceptedReq) {
        setConnections((prev) => [
          {
            id: acceptedReq.id,
            connected_at: new Date().toISOString(),
            user: acceptedReq.requester,
          },
          ...prev,
        ]);
        setActionNotice(`You are now connected with ${acceptedReq.requester.display_name}.`);
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not accept connection. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    setActionNotice(null);
    try {
      await api.put(`/api/v1/connections/${requestId}/reject`);
      const rejectedReq = requests.find((r) => r.id === requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (rejectedReq) {
        setActionNotice(`Declined connection request from ${rejectedReq.requester.display_name}.`);
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not decline request. Please try again."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartMessage = async (targetUserId: string) => {
    setStartingConvoUserId(targetUserId);
    try {
      const convo = await api.post<ConversationDetail>(
        `/api/v1/conversations/${targetUserId}`
      );
      router.push(`/messages/${convo.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start conversation. Please try again."
      );
      setStartingConvoUserId(null);
    }
  };

  // Convert connected items to ElasticStack format
  const stackItems: ElasticStackItem[] = connections.map((c) => ({
    id: c.user.user_id,
    name: c.user.display_name,
    handle: c.user.username,
    avatar_url: c.user.avatar_url,
    headline: c.user.activity ? `Currently ${c.user.activity.toLowerCase()}` : "Connected Member",
    bio: c.user.bio,
  }));

  return (
    <div className="w-full space-y-8 py-2">
      {/* Header */}
      <div className="space-y-1 border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
            <UserCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Your Network</span>
          </div>

          {connections.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStackView(!showStackView)}
              className="h-7 text-xs gap-1.5 border-white/10 bg-white/5 text-[#F5F5F3]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showStackView ? "Grid View" : "Stack View"}</span>
            </Button>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          Connections
        </h1>
        <p className="text-xs text-slate-400">
          Members you share projects, research, and authentic curiosity with.
        </p>
      </div>

      {/* Global Alerts */}
      {actionNotice && (
        <Alert className="border-white/10 bg-white/5 text-slate-200 py-2.5">
          <Check className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-xs font-medium">
            {actionNotice}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/20">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Pending Incoming Requests Section */}
      {requests.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Requests ({requests.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {requests.map((req) => {
              const requester = req.requester;
              const initials = requester.display_name
                ? requester.display_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "SQ";

              const activityMeta = requester.activity ? ACTIVITY_MAP[requester.activity] : null;

              return (
                <Card
                  key={req.id}
                  className="border border-white/10 bg-sangati-glass p-4 space-y-3 rounded-xl shadow-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-white/15 shrink-0">
                        <AvatarImage src={requester.avatar_url || undefined} />
                        <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-100 text-sm truncate">
                          {requester.display_name}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">
                          @{requester.username}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatRelativeTime(req.created_at)}
                    </span>
                  </div>

                  {activityMeta && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border bg-white/5 text-slate-300 border-white/10">
                      <span>Currently {activityMeta.label.toLowerCase()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <Button
                      size="sm"
                      disabled={processingId === req.id}
                      onClick={() => handleAccept(req.id)}
                      className="flex-1 h-7 text-xs font-medium bg-white text-black hover:bg-slate-200 gap-1"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span>Accept</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === req.id}
                      onClick={() => handleReject(req.id)}
                      className="h-7 text-xs px-2.5 text-slate-400 hover:text-rose-400 border-white/15 bg-white/5"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Connected Network Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-amber-400" />
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Connected Members ({connections.length})
            </h2>
          </div>

          <Link href="/discover">
            <span className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
              Discover people →
            </span>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 border border-white/10 bg-sangati-glass space-y-3">
                <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
                <Skeleton className="h-4 w-3/4 bg-white/5" />
                <Skeleton className="h-3 w-1/2 bg-white/5" />
              </Card>
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="py-12 px-4 text-center border border-dashed border-white/10 rounded-xl bg-sangati-glass space-y-3 max-w-md mx-auto">
            <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-200">No connections yet</h3>
              <p className="text-xs text-slate-400">
                Discover members who share your interests and send a connect request.
              </p>
            </div>
            <Link href="/discover" className="inline-block pt-1">
              <Button size="sm" className="h-7 text-xs gap-1.5 bg-white text-black hover:bg-slate-200 font-medium">
                <span>Explore Discover</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        ) : showStackView ? (
          <div className="py-6">
            <ElasticStack
              items={stackItems}
              onSwipe={(item) => handleStartMessage(item.id)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connections.map((item) => {
              const companion = item.user;
              const initials = companion.display_name
                ? companion.display_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "SQ";

              const activityMeta = companion.activity ? ACTIVITY_MAP[companion.activity] : null;

              return (
                <Card
                  key={item.id}
                  className="border border-white/10 bg-sangati-glass hover:border-white/20 transition-all duration-200 flex flex-col justify-between overflow-hidden rounded-xl shadow-none"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-9 w-9 border border-white/15 shrink-0">
                          <AvatarImage src={companion.avatar_url || undefined} alt={companion.display_name} />
                          <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-100 text-sm truncate">
                            {companion.display_name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">
                            @{companion.username}
                          </p>
                        </div>
                      </div>

                      {activityMeta && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium py-0.5 px-2 rounded-md border ${activityMeta.badgeBg}`}
                        >
                          <span>{activityMeta.label}</span>
                        </span>
                      )}
                    </div>

                    {companion.bio && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {companion.bio}
                      </p>
                    )}

                    {companion.interests && companion.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {companion.interests.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <div className="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Connected</span>
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 border-white/15 bg-white/5 text-slate-200 hover:bg-white hover:text-black font-medium"
                      onClick={() => handleStartMessage(companion.user_id)}
                      disabled={startingConvoUserId === companion.user_id}
                    >
                      {startingConvoUserId === companion.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      <span>Message</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
