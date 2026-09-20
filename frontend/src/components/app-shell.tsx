"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  Compass,
  UserCheck,
  MessageSquare,
  Bell,
  User,
  LogOut,
  Hammer,
  Brain,
  Home,
  Plus,
  Loader2,
  Layers,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import {
  ActivityType,
  IncomingRequestsResponse,
  UserActivity,
  DiscoveryPerson,
  DiscoveryResponse,
  UnreadCountResponse,
} from "@/types";
import { NotificationPopover } from "@/components/notification-popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
    verb: "Building something",
    icon: Hammer,
    accentColor: "text-amber-400",
    badgeBg: "bg-white/[0.04] text-[#F5F5F3] border-white/10",
  },
  LEARN: {
    type: "LEARN",
    label: "Learn",
    verb: "Learning something",
    icon: Brain,
    accentColor: "text-blue-400",
    badgeBg: "bg-white/[0.04] text-[#F5F5F3] border-white/10",
  },
  CONVERSATION: {
    type: "CONVERSATION",
    label: "Conversation",
    verb: "Open to discussion",
    icon: MessageSquare,
    accentColor: "text-violet-400",
    badgeBg: "bg-white/[0.04] text-[#F5F5F3] border-white/10",
  },
  EXPLORE: {
    type: "EXPLORE",
    label: "Explore",
    verb: "Just exploring",
    icon: Sparkles,
    accentColor: "text-[#F5F5F3]",
    badgeBg: "bg-white/[0.04] text-[#F5F5F3] border-white/10",
  },
};

const SUGGESTED_INTERESTS = [
  "ai-agents",
  "system-design",
  "indie-hacking",
  "philosophy",
  "music",
  "writing",
  "rust",
  "psychology",
  "open-source",
  "startups",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [profileData, setProfileData] = useState<{
    display_name: string;
    username: string;
    avatar_url?: string | null;
  } | null>(null);

  const [userActivity, setUserActivity] = useState<ActivityType | null>(null);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [sidebarPeople, setSidebarPeople] = useState<DiscoveryPerson[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user || null);
      if (session) {
        fetchSidebarData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
      if (session) {
        fetchSidebarData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Poll unread count periodically when user is logged in
  useEffect(() => {
    if (!sessionUser) return;

    const intervalId = setInterval(() => {
      api.get<UnreadCountResponse>("/api/v1/conversations/unread-count")
        .then((res) => {
          setUnreadMessagesCount(res.count);
        })
        .catch(() => {});
    }, 10000); // 10-second interval

    return () => clearInterval(intervalId);
  }, [sessionUser]);

  const fetchSidebarData = async () => {
    try {
      api.get<any>("/api/v1/profile/me").then((prof) => {
        if (prof) {
          setProfileData({
            display_name: prof.display_name,
            username: prof.username,
            avatar_url: prof.avatar_url,
          });
        }
      }).catch(() => {});

      api.get<UserActivity | null>("/api/v1/activity/me").then((act) => {
        if (act?.activity_type) {
          setUserActivity(act.activity_type);
        }
      }).catch(() => {});

      api.get<IncomingRequestsResponse>("/api/v1/connections/requests").then((res) => {
        setHasPendingRequests(res.total > 0);
      }).catch(() => {});

      api.get<UnreadCountResponse>("/api/v1/conversations/unread-count").then((res) => {
        setUnreadMessagesCount(res.count);
      }).catch(() => {});

      api.get<DiscoveryResponse>("/api/v1/discover").then((res) => {
        setSidebarPeople(res.people.slice(0, 3));
      }).catch(() => {});
    } catch {
      // Ignore background fetch errors
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/feed", label: "Feed", icon: Layers },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/activity", label: "Intent", icon: Sparkles },
    { href: "/connections", label: "Connections", icon: UserCheck, badge: hasPendingRequests },
    { href: "/messages", label: "Messages", icon: MessageSquare, unreadCount: unreadMessagesCount },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const activeMeta = userActivity ? ACTIVITIES[userActivity] : null;
  const ActiveIcon = activeMeta?.icon;

  const initials = profileData?.display_name
    ? profileData.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "S";

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-[#F5F5F3] antialiased bg-sangati-grid relative">
      {/* Mobile Translucent Header (< 768px) */}
      <header className="md:hidden sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0A0A]/90 backdrop-blur-xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
            <span className="font-mono font-bold text-xs tracking-tighter">S</span>
          </div>
          <span className="font-bold text-xs tracking-[0.25em] text-[#F5F5F3] uppercase">
            Sangati
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {sessionUser && <NotificationPopover />}
          {sessionUser ? (
            <Link href="/profile">
              <Avatar className="h-7 w-7 border border-white/20 ring-1 ring-white/10">
                <AvatarImage src={profileData?.avatar_url || undefined} />
                <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-[10px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline" className="h-7 text-xs border-white/15 bg-white/5 text-[#F5F5F3]">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Container Layout: 3 Columns on Desktop */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8 relative z-10">
        {/* LEFT COLUMN: Floating Translucent Sidebar Rail (Desktop 768px+) */}
        <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 sticky top-8 h-[calc(100vh-4rem)] justify-between">
          <div className="space-y-8">
            {/* Elegant Minimal Branding */}
            <div className="px-3">
              <Link href="/" className="group block space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:border-white/40 transition-colors shadow-inner">
                    <span className="font-mono font-bold text-xs">S</span>
                  </div>
                  <span className="text-sm font-extrabold tracking-[0.25em] text-[#F5F5F3] uppercase">
                    Sangati
                  </span>
                </div>
                <p className="text-[11px] text-[#8A8A8A] font-normal pl-0.5 tracking-wide">
                  Where interests meet people.
                </p>
              </Link>
            </div>

            {/* Floating Navigation Links */}
            <nav className="space-y-1.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);

                return (
                  <Link key={link.href} href={link.href}>
                    <div
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-white/10 text-white font-semibold border border-white/20 shadow-lg backdrop-blur-md"
                          : "text-[#8A8A8A] hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 ${
                            isActive ? "text-white" : "text-[#8A8A8A]"
                          }`}
                        />
                        <span className="tracking-wide">{link.label}</span>
                      </div>

                      {link.badge && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-[#0A0A0A] animate-pulse" />
                      )}

                      {!!link.unreadCount && link.unreadCount > 0 && (
                        <span className="h-4 min-w-4 px-1.5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-lg animate-pulse">
                          {link.unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile / Auth Section at Bottom */}
          {sessionUser ? (
            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/10 group"
              >
                <Avatar className="h-8 w-8 border border-white/20 shrink-0">
                  <AvatarImage src={profileData?.avatar_url || undefined} />
                  <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#F5F5F3] truncate group-hover:text-white transition-colors">
                    {profileData?.display_name || "Member"}
                  </p>
                  <p className="text-[11px] text-[#8A8A8A] truncate font-mono">
                    @{profileData?.username || "user"}
                  </p>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full justify-start h-8 text-xs text-[#8A8A8A] hover:text-rose-400 hover:bg-white/[0.04] gap-2 px-2.5 rounded-lg"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span>Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="pt-4 border-t border-white/[0.08] space-y-2">
              <Link href="/signup" className="block">
                <Button size="sm" className="w-full text-xs font-medium bg-[#F5F5F3] text-[#0A0A0A] hover:bg-white rounded-lg shadow-sm">
                  Join Sangati
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button size="sm" variant="outline" className="w-full text-xs border-white/15 bg-white/5 text-[#F5F5F3] rounded-lg">
                  Sign in
                </Button>
              </Link>
            </div>
          )}
        </aside>

        {/* CENTER COLUMN: Main Content Area */}
        <main className="flex-1 min-w-0 max-w-2xl mx-auto w-full space-y-6">
          {children}
        </main>

        {/* RIGHT COLUMN: Contextual Discovery Panel (Desktop 1024px+) */}
        {sessionUser && (
          <aside className="hidden lg:flex flex-col w-72 shrink-0 space-y-6 sticky top-8 h-[calc(100vh-4rem)] overflow-y-auto pr-1">
            {/* Widget 1: Active Intent */}
            <div className="rounded-2xl border border-white/[0.08] bg-sangati-glass p-5 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase">
                  01 / ACTIVE INTENT
                </span>
                <Link href="/activity">
                  <span className="text-[11px] text-[#F5F5F3] hover:underline cursor-pointer font-mono">
                    Change
                  </span>
                </Link>
              </div>

              {activeMeta && ActiveIcon ? (
                <div className={`p-3 rounded-xl border ${activeMeta.badgeBg} space-y-1`}>
                  <div className="flex items-center gap-2">
                    <ActiveIcon className={`h-3.5 w-3.5 ${activeMeta.accentColor}`} />
                    <span className="font-medium text-xs text-[#F5F5F3]">{activeMeta.label}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] leading-relaxed">
                    Feed and suggestions prioritize people {activeMeta.verb.toLowerCase()}.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                  <p className="text-[#8A8A8A] text-[11px] leading-relaxed">
                    No intent selected. Choose what you&apos;re doing to refine discovery.
                  </p>
                  <Link href="/activity">
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs border-white/15 text-[#F5F5F3] bg-white/5 rounded-lg">
                      Select Intent
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Widget 2: People to Vibe With */}
            {sidebarPeople.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-sangati-glass p-5 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase">
                    02 / PEOPLE TO VIBE WITH
                  </span>
                  <Link href="/discover">
                    <span className="text-[11px] text-[#8A8A8A] hover:text-white transition-colors flex items-center gap-0.5">
                      View all <ChevronRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>

                <div className="space-y-2">
                  {sidebarPeople.map((person) => (
                    <div
                      key={person.id}
                      className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] flex items-center justify-between gap-2 hover:bg-white/[0.04] hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 border border-white/15 shrink-0">
                          <AvatarImage src={person.avatar_url || undefined} />
                          <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-[10px] font-semibold">
                            {person.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#F5F5F3] truncate">
                            {person.display_name}
                          </p>
                          <p className="text-[10px] text-[#8A8A8A] truncate font-mono">
                            @{person.username}
                          </p>
                        </div>
                      </div>

                      <Link href="/discover">
                        <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] border-white/15 bg-white/5 text-[#F5F5F3] hover:bg-white hover:text-black shrink-0 rounded-lg">
                          <Plus className="h-3 w-3 mr-0.5" />
                          <span>Connect</span>
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Widget 3: Explore Interests */}
            <div className="rounded-2xl border border-white/[0.08] bg-sangati-glass p-5 space-y-3 shadow-2xl">
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase block">
                03 / EXPLORE INTERESTS
              </span>

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_INTERESTS.map((tag) => (
                  <Link key={tag} href={`/discover?q=${tag}`}>
                    <span className="inline-block text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-[#8A8A8A] border border-white/10 hover:bg-white/10 hover:text-[#F5F5F3] transition-all cursor-pointer">
                      #{tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Widget 4: Ethos Footer */}
            <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.015] space-y-1.5">
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase block">
                SANGATI ETHOS
              </span>
              <p className="text-xs text-[#8A8A8A] leading-relaxed font-normal">
                &ldquo;An elegant space where interesting people find each other.&rdquo;
              </p>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Translucent Bottom Bar (< 768px) */}
      <nav className="md:hidden sticky bottom-0 z-40 w-full border-t border-white/[0.08] bg-[#0A0A0A]/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around">
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/feed", label: "Feed", icon: Layers },
          { href: "/discover", label: "Discover", icon: Compass },
          { href: "/connections", label: "Connections", icon: UserCheck, badge: hasPendingRequests },
          { href: "/messages", label: "Messages", icon: MessageSquare, unreadCount: unreadMessagesCount },
        ].map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          return (
            <Link key={link.href} href={link.href} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors relative ${
                  isActive ? "text-white font-semibold" : "text-[#8A8A8A] hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 mb-0.5 ${isActive ? "text-white" : ""}`} />
                <span>{link.label}</span>
                {link.badge && (
                  <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-[#0A0A0A]" />
                )}
                {!!link.unreadCount && link.unreadCount > 0 && (
                  <span className="absolute top-0.5 right-2 h-3.5 min-w-3.5 px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-lg">
                    {link.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
