"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import {
  NotificationItem,
  NotificationsListResponse,
  UnreadCountResponse,
  MarkAllReadResponse,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

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

export function NotificationPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const refreshUnreadCount = async () => {
    try {
      const res = await api.get<UnreadCountResponse>(
        "/api/v1/notifications/unread-count"
      );
      setUnreadCount(res.count);
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    refreshUnreadCount();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    api
      .get<NotificationsListResponse>("/api/v1/notifications?limit=8")
      .then((res) => {
        if (isMounted) {
          setNotifications(res.notifications);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      refreshUnreadCount();
    }
  };

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
      console.error("Failed to mark all notifications as read:", err);
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

    setIsOpen(false);

    if (n.type === "CONNECTION_REQUEST" || n.type === "CONNECTION_ACCEPTED") {
      router.push("/connections");
    } else if (n.type === "NEW_MESSAGE" && n.reference_id) {
      router.push(`/messages/${n.reference_id}`);
    } else {
      router.push("/notifications");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CONNECTION_REQUEST":
        return <Users className="h-3 w-3 text-amber-400" />;
      case "CONNECTION_ACCEPTED":
        return <UserCheck className="h-3 w-3 text-emerald-400" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="h-3 w-3 text-violet-400" />;
      default:
        return <Bell className="h-3 w-3 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="relative h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black ring-2 ring-[#090a0f]"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-90 rounded-xl border border-white/10 bg-[#0e0f17] text-slate-100 shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-label="Notifications list"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors disabled:opacity-50"
                title="Mark all as read"
              >
                {isMarkingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                <span>Mark read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-white/5 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-3/4 bg-white/5" />
                      <Skeleton className="h-3 w-1/3 bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-200">
                  You&apos;re all caught up.
                </p>
                <p className="text-[11px] text-slate-400">
                  New connection requests and messages will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const initials = n.actor?.display_name
                  ? n.actor.display_name.slice(0, 2).toUpperCase()
                  : "SQ";

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-white/5 ${
                      !n.is_read ? "bg-white/[0.03]" : ""
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar className="h-7 w-7 border border-white/15">
                        <AvatarImage src={n.actor?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px] bg-slate-800 text-slate-300 font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-[#0e0f17] rounded-full p-0.5 border border-white/10">
                        {getNotificationIcon(n.type)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p
                        className={`text-xs leading-snug break-words ${
                          !n.is_read
                            ? "font-semibold text-slate-100"
                            : "text-slate-400 font-normal"
                        }`}
                      >
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>

                    {!n.is_read && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"
                        aria-label="Unread"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-white/10 bg-white/[0.02] text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-300 hover:text-white font-medium inline-flex items-center gap-1.5 py-1 px-3 rounded-md hover:bg-white/5 transition-colors"
            >
              <span>View all notifications</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

