"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Hammer,
  Brain,
  MessageSquare,
  Compass,
  Users,
  Loader2,
  AlertCircle,
  Inbox,
  Filter,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { ActivityType, Post, FeedResponse, UserActivity } from "@/types";
import { PublicActivity } from "@/lib/activity/types";
import { activityApiService } from "@/lib/activity/api-service";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivityMeta {
  type: ActivityType;
  label: string;
  verb: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}

const ACTIVITIES: Record<ActivityType, ActivityMeta> = {
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
    label: "Conversation",
    verb: "discussing ideas",
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

const PAGE_SIZE = 20;

export default function FeedPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<ActivityType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [communityActivities, setCommunityActivities] = useState<PublicActivity[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUpdatingActivity, setIsUpdatingActivity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(session.user.id);
      loadFeed(0, true);
    }

    init();
  }, [router]);

  const loadFeed = async (offset: number = 0, isInitial: boolean = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const [feedData, activitiesData] = await Promise.all([
        api.get<FeedResponse>(`/api/v1/feed?limit=${PAGE_SIZE}&offset=${offset}`),
        activityApiService.getActivities().catch(() => []),
      ]);

      if (isInitial) {
        setPosts(feedData.posts);
      } else {
        setPosts((prev) => [...prev, ...feedData.posts]);
      }

      setCommunityActivities(activitiesData);
      setHasMore(feedData.pagination.has_more);
      if (feedData.current_user_activity) {
        setCurrentActivity(feedData.current_user_activity);
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("We couldn't load your feed. Please try again.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleActivityChange = async (newType: ActivityType) => {
    if (newType === currentActivity || isUpdatingActivity) return;

    setIsUpdatingActivity(true);
    try {
      await api.put<UserActivity>("/api/v1/activity/me", {
        activity_type: newType,
      });
      setCurrentActivity(newType);
      await loadFeed(0, true);
    } catch (err) {
      console.error("Failed to update activity:", err);
    } finally {
      setIsUpdatingActivity(false);
    }
  };

  const handleJoinActivityToggle = async (activityId: string) => {
    const target = communityActivities.find((a) => a.id === activityId);
    if (!target) return;
    try {
      if (target.is_participant) {
        await activityApiService.leaveActivity(activityId);
      } else {
        await activityApiService.joinActivity(activityId);
      }
      const freshActivities = await activityApiService.getActivities();
      setCommunityActivities(freshActivities);
    } catch (err) {
      console.error("Join/leave activity error:", err);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadFeed(posts.length, false);
    }
  };

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const getInterleavedFeed = () => {
    const items: (
      | { type: "post"; data: Post }
      | { type: "activity"; data: PublicActivity }
    )[] = [];
    let actIndex = 0;

    posts.forEach((post, i) => {
      items.push({ type: "post", data: post });
      if ((i + 1) % 2 === 0 && actIndex < communityActivities.length) {
        items.push({ type: "activity", data: communityActivities[actIndex] });
        actIndex++;
      }
    });

    while (actIndex < communityActivities.length) {
      items.push({ type: "activity", data: communityActivities[actIndex] });
      actIndex++;
    }

    return items;
  };

  const activeMeta = currentActivity ? ACTIVITIES[currentActivity] : null;
  const ActiveIcon = activeMeta?.icon;
  const interleavedFeed = getInterleavedFeed();

  return (
    <div className="w-full space-y-6 sm:space-y-8 py-2 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 font-mono font-semibold text-[10px] uppercase tracking-widest">
            <Layers className="h-3.5 w-3.5 text-white" />
            <span>01 // PERSONAL STREAM</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Community Feed
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-normal">
            Real updates & active community spaces ranked by your intent, mutual connections, and shared curiosities.
          </p>
        </div>
      </div>

      {/* Post Composer */}
      {currentUserId && (
        <PostComposer
          defaultActivity={currentActivity}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Activity Context Switcher Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-sangati-glass p-4 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            {activeMeta && ActiveIcon ? (
              <>
                <div className={`h-7 w-7 rounded-xl border ${activeMeta.badgeBg} flex items-center justify-center shrink-0`}>
                  <ActiveIcon className={`h-3.5 w-3.5 ${activeMeta.accentColor}`} />
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Prioritizing: </span>
                  <span className="font-semibold text-slate-200">
                    {activeMeta.label}
                  </span>
                  <span className="text-slate-400 text-[11px] block sm:inline sm:ml-2">
                    (matching posts & activities ranked higher)
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="h-7 w-7 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center shrink-0">
                  <Compass className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">No active intent set. </span>
                  <span className="text-slate-200 font-medium text-xs">
                    Select what you&apos;re up to tailor your feed.
                  </span>
                </div>
              </>
            )}
          </div>

          <Link href="/activity" className="shrink-0 self-start sm:self-auto">
            <span className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-mono">
              Change intent →
            </span>
          </Link>
        </div>

        {/* Quick inline activity switcher */}
        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Switch:
          </span>
          {(Object.keys(ACTIVITIES) as ActivityType[]).map((type) => {
            const meta = ACTIVITIES[type];
            const Icon = meta.icon;
            const isSelected = currentActivity === type;

            return (
              <button
                key={type}
                type="button"
                disabled={isUpdatingActivity}
                onClick={() => handleActivityChange(type)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  isSelected
                    ? "bg-white text-black border-white font-semibold shadow-sm"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/20 rounded-xl">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFeed(0, true)}
              className="ml-4 h-7 text-xs border-white/15 bg-white/5 rounded-lg"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border border-white/[0.08] bg-sangati-glass p-5 space-y-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full bg-white/5 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3 bg-white/5" />
                  <Skeleton className="h-3 w-1/4 bg-white/5" />
                </div>
              </div>
              <Skeleton className="h-14 w-full bg-white/5 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : interleavedFeed.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-2xl bg-sangati-glass max-w-md mx-auto space-y-4 shadow-2xl">
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              Your feed is quiet right now.
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Connect with people, host an activity, or share an update above to kickstart discussions.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link href="/activities">
              <Button size="sm" className="text-xs bg-[#C9A84A] text-black font-semibold rounded-xl hover:bg-[#b89739]">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                <span>Browse Activities</span>
              </Button>
            </Link>
            <Link href="/discover">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-white/15 bg-white/5 text-slate-200 rounded-xl">
                <Users className="h-3.5 w-3.5" />
                <span>Discover people</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Combined Stream: Posts + Activities */
        <div className="space-y-4">
          {interleavedFeed.map((item) => {
            if (item.type === "post") {
              return (
                <PostCard
                  key={`post-${item.data.id}`}
                  post={item.data}
                  currentUserId={currentUserId}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              );
            } else {
              return (
                <div
                  key={`activity-${item.data.id}`}
                  onClick={() => router.push(`/activities/${item.data.id}`)}
                  className="cursor-pointer"
                >
                  <ActivityCard
                    activity={item.data}
                    onJoinToggle={() => handleJoinActivityToggle(item.data.id)}
                  />
                </div>
              );
            }
          })}

          {/* Load More Action */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs px-6 h-8 gap-1.5 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 rounded-xl"
              >
                {isLoadingMore && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>{isLoadingMore ? "Loading..." : "Load more updates"}</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
