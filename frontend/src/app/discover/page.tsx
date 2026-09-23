"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
  Compass,
  Search,
  UserPlus,
  UserCheck,
  Clock,
  Loader2,
  Check,
  X,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { ActivityType, DiscoveryPerson, DiscoveryResponse, ConnectionResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TextAnimation } from "@/components/ui/text-animation";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

interface ActivityMeta {
  type: ActivityType;
  label: string;
  verb: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}

const ACTIVITY_MAP: Record<ActivityType, ActivityMeta> = {
  BUILD: {
    type: "BUILD",
    label: "Build",
    verb: "building something",
    icon: Hammer,
    accentColor: "text-orange-400",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  LEARN: {
    type: "LEARN",
    label: "Learn",
    verb: "learning something",
    icon: Brain,
    accentColor: "text-blue-400",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  CONVERSATION: {
    type: "CONVERSATION",
    label: "Discussion",
    verb: "open to discussion",
    icon: MessageSquare,
    accentColor: "text-violet-400",
    badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  EXPLORE: {
    type: "EXPLORE",
    label: "Explore",
    verb: "exploring",
    icon: Sparkles,
    accentColor: "text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
};

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [people, setPeople] = useState<DiscoveryPerson[]>([]);
  const [currentUserActivity, setCurrentUserActivity] = useState<ActivityType | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connection action states
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => {
      setActionToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [actionToast]);

  useEffect(() => {
    async function checkAuthAndLoadInitial() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      loadPeople("ALL");
    }

    checkAuthAndLoadInitial();
  }, [router]);

  const loadPeople = async (filter: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParam = filter !== "ALL" ? `?activity=${filter}` : "";
      const data = await api.get<DiscoveryResponse>(`/api/v1/discover${filterParam}`);
      setPeople(data.people);
      if (data.current_user_activity) {
        setCurrentUserActivity(data.current_user_activity);
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("Could not load discovery recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    loadPeople(filter);
  };

  const handleSendConnect = async (person: DiscoveryPerson) => {
    setActionInProgressId(person.user_id);
    try {
      const res = await api.post<ConnectionResponse>(`/api/v1/connections/${person.user_id}`);
      setPeople((prev) =>
        prev.map((p) =>
          p.user_id === person.user_id
            ? { ...p, connection_status: "REQUEST_SENT", connection_id: res.id }
            : p
        )
      );
      setActionToast({
        message: `Connection request sent to ${person.display_name}.`,
        type: "success",
      });
    } catch (err) {
      setActionToast({
        message: err instanceof Error ? err.message : "Failed to send request.",
        type: "error",
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleAcceptRequest = async (person: DiscoveryPerson) => {
    if (!person.connection_id) return;
    setActionInProgressId(person.user_id);
    try {
      await api.put(`/api/v1/connections/${person.connection_id}/accept`);
      setPeople((prev) =>
        prev.map((p) =>
          p.user_id === person.user_id
            ? { ...p, connection_status: "CONNECTED" }
            : p
        )
      );
      setActionToast({
        message: `Connected with ${person.display_name}!`,
        type: "success",
      });
    } catch (err) {
      setActionToast({
        message: err instanceof Error ? err.message : "Failed to accept request.",
        type: "error",
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectRequest = async (person: DiscoveryPerson) => {
    if (!person.connection_id) return;
    setActionInProgressId(person.user_id);
    try {
      await api.put(`/api/v1/connections/${person.connection_id}/reject`);
      setPeople((prev) =>
        prev.map((p) =>
          p.user_id === person.user_id
            ? { ...p, connection_status: "NONE", connection_id: undefined }
            : p
        )
      );
      setActionToast({
        message: `Declined request from ${person.display_name}.`,
        type: "success",
      });
    } catch (err) {
      setActionToast({
        message: err instanceof Error ? err.message : "Failed to decline request.",
        type: "error",
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const q = searchQuery.toLowerCase().trim();
    return people.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        (p.bio && p.bio.toLowerCase().includes(q)) ||
        p.interests.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [people, searchQuery]);

  return (
    <div className="w-full space-y-6 sm:space-y-8 py-2">
      {/* Header */}
      <div className="space-y-1 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
          <Compass className="h-3.5 w-3.5 text-amber-400" />
          <span>People Discovery</span>
        </div>
        <TextAnimation as="h1" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          Discover
        </TextAnimation>
        <p className="text-xs text-slate-400">
          Find people who share your active curiosity and interests.
        </p>
      </div>

      {/* Context bar: Current User's Intent */}
      <div className="rounded-xl border border-white/10 bg-sangati-glass p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {currentUserActivity && ACTIVITY_MAP[currentUserActivity] ? (
            <>
              <div className={`h-7 w-7 rounded-lg border ${ACTIVITY_MAP[currentUserActivity].badgeBg} flex items-center justify-center shrink-0`}>
                {(() => {
                  const Icon = ACTIVITY_MAP[currentUserActivity].icon;
                  return <Icon className={`h-3.5 w-3.5 ${ACTIVITY_MAP[currentUserActivity].accentColor}`} />;
                })()}
              </div>
              <div className="text-xs">
                <span className="text-slate-400">Currently </span>
                <span className="font-semibold text-slate-200">
                  {ACTIVITY_MAP[currentUserActivity].verb}
                </span>
                <span className="text-slate-500 text-[11px] block sm:inline sm:ml-2">
                  (prioritizing similar members)
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs">
                <span className="text-slate-400">No intent set yet. </span>
                <span className="text-slate-200 font-medium">
                  Choose an intent to refine matches.
                </span>
              </div>
            </>
          )}
        </div>

        <Link href="/activity">
          <span className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0">
            {currentUserActivity ? "Change intent →" : "Set intent →"}
          </span>
        </Link>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Activity filter">
          <Button
            variant={activeFilter === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterClick("ALL")}
            className={`rounded-md text-xs h-7.5 px-3 font-medium transition-all ${
              activeFilter === "ALL"
                ? "bg-white text-black border-white font-semibold"
                : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
            }`}
          >
            All
          </Button>

          {(Object.keys(ACTIVITY_MAP) as ActivityType[]).map((type) => {
            const meta = ACTIVITY_MAP[type];
            const Icon = meta.icon;
            const isSelected = activeFilter === type;

            return (
              <Button
                key={type}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterClick(type)}
                className={`rounded-md text-xs h-7.5 px-3 font-medium transition-all gap-1.5 ${
                  isSelected
                    ? "bg-white text-black border-white font-semibold"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{meta.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Search Input for Interests */}
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search interests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-white/10 bg-black/40 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-white/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/20">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPeople(activeFilter)}
              className="ml-4 h-7 text-xs border-white/15 bg-white/5"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-white/10 bg-sangati-glass p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              </div>
              <Skeleton className="h-10 w-full bg-white/5 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 bg-white/5 rounded-md" />
                <Skeleton className="h-5 w-20 bg-white/5 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredPeople.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-xl bg-sangati-glass max-w-md mx-auto space-y-4">
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              {searchQuery
                ? "No members match your search"
                : activeFilter !== "ALL"
                ? `No members currently in "${ACTIVITY_MAP[activeFilter as ActivityType]?.label || activeFilter}"`
                : "No members discovered yet"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? "Try searching for another keyword or interest tag."
                : "Check back soon as more people join the community."}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            {searchQuery ? (
              <Button size="sm" variant="outline" onClick={() => setSearchQuery("")} className="text-xs border-white/15 bg-white/5 text-slate-200">
                Clear search
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => handleFilterClick("ALL")} className="text-xs border-white/15 bg-white/5 text-slate-200">
                View all activities
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* People Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing {filteredPeople.length} {filteredPeople.length === 1 ? "person" : "people"}
              {activeFilter !== "ALL" ? ` in ${ACTIVITY_MAP[activeFilter as ActivityType]?.label}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredPeople.map((person) => {
              const initials = person.display_name
                ? person.display_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "SQ";

              const activityMeta = person.activity ? ACTIVITY_MAP[person.activity] : null;
              const ActivityIcon = activityMeta?.icon;

              return (
                <Card
                  key={person.id}
                  className="border border-white/10 bg-sangati-glass hover:border-white/20 transition-all duration-200 flex flex-col justify-between overflow-hidden rounded-xl shadow-none"
                >
                  <CardContent className="p-5 space-y-3.5">
                    {/* Top Row: Avatar, Name, Activity Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 border border-white/15 shrink-0">
                          <AvatarImage src={person.avatar_url || undefined} alt={person.display_name} />
                          <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-100 text-sm truncate leading-tight">
                            {person.display_name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            @{person.username}
                          </p>
                        </div>
                      </div>

                      {activityMeta && ActivityIcon && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium py-0.5 px-2 rounded-md border shrink-0 ${activityMeta.badgeBg}`}
                        >
                          <ActivityIcon className="h-3 w-3" />
                          <span>{activityMeta.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Match reason callout */}
                    {person.match_reason && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 max-w-full truncate">
                        <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                        <span className="truncate">{person.match_reason}</span>
                      </div>
                    )}

                    {/* Bio */}
                    {person.bio ? (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed min-h-[2rem]">
                        {person.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 italic min-h-[2rem]">
                        No bio written yet.
                      </p>
                    )}

                    {/* Interests tags */}
                    {person.interests && person.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {person.interests.slice(0, 4).map((interest, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10"
                          >
                            #{interest}
                          </span>
                        ))}
                        {person.interests.length > 4 && (
                          <span className="text-[10px] text-slate-500 self-center px-1 font-mono">
                            +{person.interests.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>

                  {/* Card Footer: Connect Action */}
                  <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {person.activity ? `Active now` : "Member"}
                    </span>

                    {person.connection_status === "CONNECTED" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Connected</span>
                      </span>
                    ) : person.connection_status === "REQUEST_SENT" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        className="h-7 px-3 text-xs gap-1.5 text-slate-400 bg-white/5 border border-white/10 cursor-default"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Request sent</span>
                      </Button>
                    ) : person.connection_status === "REQUEST_RECEIVED" ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          disabled={actionInProgressId === person.user_id}
                          onClick={() => handleAcceptRequest(person)}
                          className="h-7 px-2.5 text-xs gap-1 bg-white text-black hover:bg-slate-200 font-medium"
                        >
                          {actionInProgressId === person.user_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>Accept</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionInProgressId === person.user_id}
                          onClick={() => handleRejectRequest(person)}
                          className="h-7 px-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-white/5"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <LiquidMetalButton
                        size="sm"
                        disabled={actionInProgressId === person.user_id}
                        onClick={() => handleSendConnect(person)}
                        icon={
                          actionInProgressId === person.user_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )
                        }
                      >
                        Connect
                      </LiquidMetalButton>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Notification Toast */}
      {actionToast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium border shadow-xl ${
            actionToast.type === "success"
              ? "bg-[#12131c] text-slate-100 border-white/15"
              : "bg-rose-950 text-rose-200 border-rose-800"
          }`}
        >
          {actionToast.type === "success" ? (
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <X className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{actionToast.message}</span>
          <button
            onClick={() => setActionToast(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="text-sm text-zinc-400">Loading discovery...</p>
        </div>
      }
    >
      <DiscoverContent />
    </Suspense>
  );
}
