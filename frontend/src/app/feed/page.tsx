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
  PenSquare,
  Loader2,
  AlertCircle,
  Inbox,
  Filter,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { ActivityType, Post, FeedResponse, UserActivity } from "@/types";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
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
      const data = await api.get<FeedResponse>(
        `/api/v1/feed?limit=${PAGE_SIZE}&offset=${offset}`
      );

      if (isInitial) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }

      setHasMore(data.pagination.has_more);
      if (data.current_user_activity) {
        setCurrentActivity(data.current_user_activity);
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

  const activeMeta = currentActivity ? ACTIVITIES[currentActivity] : null;
  const ActiveIcon = activeMeta?.icon;

  return (
    <div className="w-full space-y-6 sm:space-y-8 py-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Community Stream</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Feed
          </h1>
          <p className="text-xs text-slate-400">
            Updates tailored to your active intent and connections.
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
      <div className="rounded-xl border border-white/10 bg-sangati-glass p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            {activeMeta && ActiveIcon ? (
              <>
                <div className={`h-7 w-7 rounded-lg border ${activeMeta.badgeBg} flex items-center justify-center shrink-0`}>
                  <ActiveIcon className={`h-3.5 w-3.5 ${activeMeta.accentColor}`} />
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">Prioritizing: </span>
                  <span className="font-semibold text-slate-200">
                    {activeMeta.label}
                  </span>
                  <span className="text-slate-500 text-[11px] block sm:inline sm:ml-2">
                    (matching posts ranked higher)
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center shrink-0">
                  <Compass className="h-3.5 w-3.5" />
                </div>
                <div className="text-xs">
                  <span className="text-slate-400">No active intent set. </span>
                  <span className="text-slate-200 font-medium text-xs">
                    Select what you&apos;re up to to tailor your feed.
                  </span>
                </div>
              </>
            )}
          </div>

          <Link href="/activity" className="shrink-0 self-start sm:self-auto">
            <span className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
              Change intent →
            </span>
          </Link>
        </div>

        {/* Quick inline activity switcher */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Switch intent:
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150 ${
                  isSelected
                    ? "bg-white text-black border-white font-semibold"
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
        <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/20">
          <AlertCircle className="h-4 w-4 text-rose-400" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadFeed(0, true)}
              className="ml-4 h-7 text-xs border-white/15 bg-white/5"
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
            <Card key={i} className="border border-white/10 bg-sangati-glass p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full bg-white/5 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3 bg-white/5" />
                  <Skeleton className="h-3 w-1/4 bg-white/5" />
                </div>
              </div>
              <Skeleton className="h-14 w-full bg-white/5 rounded-lg" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-xl bg-sangati-glass max-w-md mx-auto space-y-4">
          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              Your feed is quiet right now.
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Connect with people or share an update above to kickstart discussions.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link href="/discover">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-white/15 bg-white/5 text-slate-200">
                <Users className="h-3.5 w-3.5" />
                <span>Discover people</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Post Stream */
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onPostUpdated={handlePostUpdated}
              onPostDeleted={handlePostDeleted}
            />
          ))}

          {/* Load More Action */}
          {hasMore && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs px-6 h-8 gap-1.5 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
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

