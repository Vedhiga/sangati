"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PenSquare,
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
  Inbox,
  AlertCircle,
  Flame,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { ActivityType, Post, PostsListResponse, UserActivity } from "@/types";
import { PostComposer } from "@/components/posts/post-composer";
import { PostCard } from "@/components/posts/post-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FilterOption {
  type: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  activeClass: string;
}

const FILTER_TABS: FilterOption[] = [
  { 
    type: "ALL", 
    label: "All Activity",
    activeClass: "bg-sangati-gradient text-white shadow-md shadow-indigo-500/20"
  },
  { 
    type: "BUILD", 
    label: "Build", 
    icon: Hammer,
    activeClass: "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
  },
  { 
    type: "LEARN", 
    label: "Learn", 
    icon: Brain,
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
  },
  { 
    type: "CONVERSATION", 
    label: "Discussion", 
    icon: MessageSquare,
    activeClass: "bg-pink-600 text-white shadow-md shadow-pink-500/20" 
  },
  { 
    type: "EXPLORE", 
    label: "Explore", 
    icon: Sparkles,
    activeClass: "bg-teal-600 text-white shadow-md shadow-teal-500/20" 
  },
];

export default function PostsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userActivity, setUserActivity] = useState<ActivityType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication and load initial user intent
  useEffect(() => {
    async function initUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(session.user.id);

      // Fetch user's current activity for composer default
      try {
        const act = await api.get<UserActivity | null>("/api/v1/activity/me");
        if (act && act.activity_type) {
          setUserActivity(act.activity_type);
        }
      } catch {
        // Non-fatal if activity not yet set
      }
    }

    initUser();
  }, [router]);

  const loadPosts = useCallback(async (filter: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const filterParam = filter !== "ALL" ? `?activity=${filter}` : "";
      const res = await api.get<PostsListResponse>(`/api/v1/posts${filterParam}`);
      setPosts(res.posts);
      setTotal(res.total);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError("We couldn't load posts right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (currentUserId) {
      loadPosts(activeFilter);
    }
  }, [currentUserId, activeFilter, loadPosts]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const handlePostCreated = (newPost: Post) => {
    // Prepend new post if matches current filter or if on ALL
    if (activeFilter === "ALL" || activeFilter === newPost.activity_type) {
      setPosts((prev) => [newPost, ...prev]);
    }
    setTotal((prev) => prev + 1);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  const handleFocusComposer = () => {
    const el = document.getElementById("post-composer-textarea");
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-1.5 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
          <Flame className="h-4 w-4" />
          <span>Community Pulse</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          What are you up to?
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time updates from creators building, learning, discussing, and exploring together.
        </p>
      </div>

      {/* Composer Section */}
      <PostComposer
        defaultActivity={userActivity}
        onPostCreated={handlePostCreated}
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter posts by activity"
        >
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeFilter === tab.type;
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => handleFilterChange(tab.type)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  isSelected
                    ? tab.activeClass
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
                role="tab"
                aria-selected={isSelected}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {!isLoading && (
          <span className="text-xs font-medium text-muted-foreground bg-accent/60 px-2.5 py-1 rounded-full shrink-0 hidden sm:inline">
            {total} {total === 1 ? "post" : "posts"}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPosts(activeFilter)}
              className="ml-4 h-7 text-xs rounded-lg"
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
            <Card key={i} className="border-border/70 p-5 space-y-3 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-6 border border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-3xl bg-indigo-50/20 dark:bg-indigo-950/10 max-w-md mx-auto space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-sangati-gradient text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-foreground">
              No posts in this stream yet
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Be the first to share what you&apos;re building, learning, or discovering!
            </p>
          </div>
          <div className="pt-2">
            <Button size="sm" onClick={handleFocusComposer} className="bg-sangati-gradient text-white rounded-xl text-xs font-semibold px-5 shadow-sm">
              Share Something
            </Button>
          </div>
        </div>
      ) : (
        /* Posts Feed */
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
        </div>
      )}
    </div>
  );
}
