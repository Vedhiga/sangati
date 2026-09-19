"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  UserCheck,
  Users,
  MessageSquare,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import {
  NotificationItem,
  NotificationsListResponse,
  UnreadCountResponse,
  MarkAllReadResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const [listRes, countRes] = await Promise.all([
        api.get<NotificationsListResponse>("/api/v1/notifications?limit=50"),
        api.get<UnreadCountResponse>("/api/v1/notifications/unread-count"),
      ]);
      setNotifications(listRes.notifications);
      setUnreadCount(countRes.count);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Could not load notifications. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllAsRead = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await api.put<MarkAllReadResponse>("/api/v1/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark notifications as read."
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.is_read) {
      api
        .put(`/api/v1/notifications/${n.id}/read`)
        .then(() => {
          setNotifications((prev) =>
            prev.map((item) =>
              item.id === n.id ? { ...item, is_read: true } : item
            )
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        })
        .catch(() => {});
    }

    if (n.type === "CONNECTION_REQUEST" || n.type === "CONNECTION_ACCEPTED") {
      router.push("/connections");
    } else if (n.type === "NEW_MESSAGE" && n.reference_id) {
      router.push(`/messages/${n.reference_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CONNECTION_REQUEST":
        return <Users className="h-3.5 w-3.5 text-amber-400" />;
      case "CONNECTION_ACCEPTED":
        return <UserCheck className="h-3.5 w-3.5 text-emerald-400" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="h-3.5 w-3.5 text-sky-400" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-zinc-400" />;
    }
  };

  const displayedNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <div className="w-full space-y-6 py-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Calm, non-intrusive updates on your connections and conversations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="h-8 text-xs gap-1.5 border-zinc-700/80 text-zinc-200 font-medium hover:bg-zinc-800/80"
            >
              {isMarkingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
              )}
              <span>Mark all read</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={loadNotifications}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            aria-label="Refresh notifications"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs / Filter */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("all")}
          className={`h-7 text-xs px-3 font-semibold rounded-lg ${
            activeTab === "all" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          All ({notifications.length})
        </Button>
        <Button
          variant={activeTab === "unread" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("unread")}
          className={`h-7 text-xs px-3 font-semibold rounded-lg ${
            activeTab === "unread" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Unread ({unreadCount})
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="bg-rose-950/40 text-rose-300 border-rose-800/40">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadNotifications}
              className="h-6 text-[11px] px-2 border-rose-800"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 border-zinc-800/80 bg-zinc-900/40">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0 bg-zinc-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-2/5 bg-zinc-800" />
                  <Skeleton className="h-3 w-4/5 bg-zinc-800" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : displayedNotifications.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-6 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 space-y-4 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-700/60">
            <Bell className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-100">
              You&apos;re all caught up.
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              New connection requests and messages will appear here quietly.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/discover">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium">
                <span>Discover people</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Notification List */
        <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800/80 bg-sangati-glass overflow-hidden shadow-xl">
          {displayedNotifications.map((n) => {
            const initials = n.actor?.display_name
              ? n.actor.display_name.slice(0, 2).toUpperCase()
              : "SG";

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-colors hover:bg-zinc-800/40 focus-visible:bg-zinc-800/40 focus-visible:outline-none group ${
                  !n.is_read ? "bg-zinc-900/60" : ""
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  <Avatar className="h-10 w-10 border border-zinc-700">
                    <AvatarImage src={n.actor?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-zinc-800 text-zinc-200 font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-700">
                    {getNotificationIcon(n.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm leading-snug break-words ${
                        !n.is_read
                          ? "font-bold text-zinc-100"
                          : "text-zinc-300 font-medium"
                      }`}
                    >
                      {n.message}
                    </span>

                    <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                      {formatRelativeTime(n.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400">
                    {n.title}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  {!n.is_read && (
                    <span
                      className="h-2 w-2 rounded-full bg-amber-400 shadow-xs shadow-amber-400/50"
                      aria-label="Unread"
                    />
                  )}
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all ml-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
