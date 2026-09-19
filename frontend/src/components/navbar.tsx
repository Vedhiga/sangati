"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass, User, LogOut, Loader2, Users, UserCheck, PenSquare, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { IncomingRequestsResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { NotificationPopover } from "@/components/notification-popover";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        // Quietly check if there are pending incoming connection requests
        api
          .get<IncomingRequestsResponse>("/api/v1/connections/requests")
          .then((res) => {
            setHasPendingRequests(res.total > 0);
          })
          .catch(() => {});
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        api
          .get<IncomingRequestsResponse>("/api/v1/connections/requests")
          .then((res) => {
            setHasPendingRequests(res.total > 0);
          })
          .catch(() => {});
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-medium tracking-tight text-foreground transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
            <Compass className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">SideQuest</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {isAuthenticated === null ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/60" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Link href="/feed">
                <Button
                  variant={pathname === "/feed" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-sm"
                >
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Feed</span>
                </Button>
              </Link>
              <Link href="/posts">
                <Button
                  variant={pathname === "/posts" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-sm"
                >
                  <PenSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Posts</span>
                </Button>
              </Link>
              <Link href="/discover">
                <Button
                  variant={pathname === "/discover" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-sm"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Discover</span>
                </Button>
              </Link>
              <Link href="/connections">
                <Button
                  variant={pathname === "/connections" ? "secondary" : "ghost"}
                  size="sm"
                  className="relative gap-2 text-sm"
                >
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Connections</span>
                  {hasPendingRequests && (
                    <span
                      className="h-2 w-2 rounded-full bg-emerald-600 ring-2 ring-background"
                      title="Pending connection requests"
                      aria-label="Pending connection requests"
                    />
                  )}
                </Button>
              </Link>
              <Link href="/messages">
                <Button
                  variant={pathname.startsWith("/messages") ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-sm"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Messages</span>
                </Button>
              </Link>
              <Link href="/profile">
                <Button
                  variant={pathname === "/profile" ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-sm"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
              </Link>
              <NotificationPopover />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="text-sm shadow-sm">
                  Create account
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
