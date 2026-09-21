"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { IncomingRequestsResponse, UnreadCountResponse } from "@/types";
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchNavBadges();
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        fetchNavBadges();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const fetchNavBadges = () => {
    api
      .get<IncomingRequestsResponse>("/api/v1/connections/requests")
      .then((res) => {
        setHasPendingRequests(res.total > 0);
      })
      .catch(() => {});

    api
      .get<UnreadCountResponse>("/api/v1/conversations/unread-count")
      .then((res) => {
        setUnreadMessagesCount(res.count);
      })
      .catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <SpotlightNavbar
      isAuthenticated={isAuthenticated}
      hasPendingRequests={hasPendingRequests}
      unreadMessagesCount={unreadMessagesCount}
      onLogout={handleLogout}
    />
  );
}
