"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Compass,
  Sparkles,
  Users,
  UserCheck,
  MessageSquare,
  User,
  Bell,
  LogOut,
  PenSquare,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | boolean;
}

interface SpotlightNavbarProps {
  isAuthenticated: boolean | null;
  hasPendingRequests?: boolean;
  unreadMessagesCount?: number;
  onLogout?: () => void;
  className?: string;
}

export function SpotlightNavbar({
  isAuthenticated,
  hasPendingRequests = false,
  unreadMessagesCount = 0,
  onLogout,
  className,
}: SpotlightNavbarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const authenticatedRoutes: NavItem[] = [
    { label: "Feed", href: "/feed", icon: Sparkles },
    { label: "Posts", href: "/posts", icon: PenSquare },
    { label: "Discover", href: "/discover", icon: Users },
    {
      label: "Connections",
      href: "/connections",
      icon: UserCheck,
      badge: hasPendingRequests,
    },
    {
      label: "Messages",
      href: "/messages",
      icon: MessageSquare,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
    },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <header className={cn("sticky top-0 z-50 w-full px-4 pt-3 pb-2", className)}>
      <div
        ref={navRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative max-w-5xl mx-auto rounded-full bg-[#0D0D0E]/90 backdrop-blur-xl border border-white/10 p-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300"
      >
        {/* Spotlight Mouse Highlight Overlay */}
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 rounded-full"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.08), transparent 60%)`,
          }}
        />

        <div className="relative z-10 flex items-center justify-between px-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-medium tracking-tight text-[#F5F5F3] hover:opacity-90 transition-opacity focus-visible:outline-none rounded-full p-1"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] border border-white/10 text-white shadow-inner">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">Sangati</span>
          </Link>

          {/* Nav Items */}
          <nav className="flex items-center gap-1">
            {isAuthenticated === null ? (
              <div className="h-8 w-32 animate-pulse rounded-full bg-white/[0.05]" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                {authenticatedRoutes.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={cn(
                          "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none",
                          isActive
                            ? "bg-white/15 text-white shadow-sm border border-white/20"
                            : "text-[#8A8A8A] hover:text-[#F5F5F3] hover:bg-white/[0.06]"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-[#8A8A8A]")} />
                        <span className="hidden md:inline">{item.label}</span>
                        {item.badge !== undefined && item.badge !== false && (
                          <span
                            className={cn(
                              "flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                              typeof item.badge === "number"
                                ? "bg-red-500 text-white min-w-[16px] h-[16px]"
                                : "h-2 w-2 bg-emerald-500 rounded-full"
                            )}
                          >
                            {typeof item.badge === "number" ? item.badge : ""}
                          </span>
                        )}
                      </button>
                    </Link>
                  );
                })}

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center justify-center p-2 rounded-full text-[#8A8A8A] hover:text-white hover:bg-white/[0.06] transition-colors ml-1"
                    title="Log out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-medium text-[#8A8A8A] hover:text-white transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-1.5 text-xs font-medium rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition-colors shadow-sm"
                >
                  Create account
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default SpotlightNavbar;
