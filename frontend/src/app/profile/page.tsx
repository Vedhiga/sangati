"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, LogOut, Loader2, Hammer, Brain, MessageSquare, Sparkles, Compass, Users, Sparkle, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { Profile, UserActivity, ActivityType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ACTIVITY_DETAILS: Record<
  ActivityType,
  { label: string; icon: React.ComponentType<{ className?: string }>; colorClasses: string }
> = {
  BUILD: {
    label: "Building something awesome",
    icon: Hammer,
    colorClasses: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  },
  LEARN: {
    label: "Learning something new",
    icon: Brain,
    colorClasses: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  },
  CONVERSATION: {
    label: "Open for conversation",
    icon: MessageSquare,
    colorClasses: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  },
  EXPLORE: {
    label: "Exploring ideas & tools",
    icon: Sparkles,
    colorClasses: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const [profileData, activityData] = await Promise.all([
          api.get<Profile>("/api/v1/profile/me"),
          api.get<UserActivity | null>("/api/v1/activity/me").catch(() => null),
        ]);
        setProfile(profileData);
        setActivity(activityData);
      } catch (err) {
        if (err instanceof ApiClientError && err.code === "PROFILE_NOT_FOUND") {
          router.replace("/profile/setup");
          return;
        }
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load profile. Please try refreshing."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto py-8">
        <Card className="border-zinc-800 bg-zinc-900/40 p-8 space-y-6 rounded-3xl">
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="h-24 w-24 rounded-full bg-zinc-800" />
            <Skeleton className="h-6 w-36 bg-zinc-800" />
            <Skeleton className="h-4 w-24 bg-zinc-800" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-zinc-800" />
            <Skeleton className="h-4 w-4/5 bg-zinc-800" />
          </div>
          <div className="flex justify-center gap-3 pt-4">
            <Skeleton className="h-10 w-28 rounded-lg bg-zinc-800" />
            <Skeleton className="h-10 w-28 rounded-lg bg-zinc-800" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto py-8 space-y-4 text-center">
        <Alert variant="destructive" className="rounded-2xl bg-rose-950/40 text-rose-300 border-rose-800/40">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Try Again
        </Button>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SG";

  const activityInfo = activity?.activity_type ? ACTIVITY_DETAILS[activity.activity_type] : null;
  const ActivityIcon = activityInfo?.icon;

  return (
    <div className="w-full max-w-xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      <Card className="border-zinc-800/80 bg-sangati-glass shadow-2xl rounded-3xl overflow-hidden">
        {/* Subtle Dark Header Banner */}
        <div className="h-28 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 relative flex items-end justify-center border-b border-zinc-800/60">
          <div className="absolute inset-0 bg-white/[0.02]" />
          <div className="absolute -bottom-10">
            <Avatar className="h-24 w-24 border-4 border-[#090a0f] shadow-2xl ring-1 ring-zinc-700">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} />
              <AvatarFallback className="bg-zinc-800 text-zinc-100 font-extrabold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <CardContent className="pt-14 pb-8 px-6 text-center space-y-6">
          {/* User Name & Handle */}
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">
              {profile.display_name}
            </h1>
            <p className="text-sm font-medium text-zinc-400">
              @{profile.username}
            </p>
          </div>

          {/* Current Activity Intent Badge */}
          <div className="flex justify-center">
            {activityInfo && ActivityIcon ? (
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${activityInfo.colorClasses}`}
              >
                <ActivityIcon className="h-4 w-4" />
                <span>{activityInfo.label}</span>
                <span className="text-zinc-600">•</span>
                <Link
                  href="/activity"
                  className="font-bold underline hover:opacity-80 text-zinc-200"
                >
                  Change
                </Link>
              </div>
            ) : (
              <Link
                href="/activity"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-dashed border-zinc-700 bg-zinc-900/60 text-xs font-medium text-zinc-300 hover:border-zinc-500 transition-all hover:scale-105"
              >
                <Compass className="h-4 w-4 text-amber-400" />
                <span>What are you up to today? Set intent →</span>
              </Link>
            )}
          </div>

          {/* Bio section */}
          {profile.bio ? (
            <div className="bg-zinc-900/60 rounded-2xl p-4 text-sm text-zinc-300 leading-relaxed max-w-md mx-auto whitespace-pre-line border border-zinc-800/80 font-normal">
              {profile.bio}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No bio added yet.</p>
          )}

          {/* Interests Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <Tag className="h-3.5 w-3.5 text-zinc-400" />
              <span>Interests & Passions</span>
            </div>

            {profile.interests && profile.interests.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                {profile.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs font-medium px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition-transform hover:scale-105"
                  >
                    #{interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                Add interests in profile edit so like-minded people can find you!
              </p>
            )}
          </div>

          {/* Actions divider */}
          <div className="border-t border-zinc-800/80 pt-6 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/discover">
                <Button className="gap-2 text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 rounded-xl shadow-md">
                  <Users className="h-4 w-4" />
                  <span>Discover People</span>
                </Button>
              </Link>
              <Link href="/activity">
                <Button variant="outline" className="gap-2 text-xs font-medium rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                  <Compass className="h-4 w-4 text-amber-400" />
                  <span>Set Activity</span>
                </Button>
              </Link>
              <Link href="/profile/edit">
                <Button variant="outline" className="gap-2 text-xs font-medium rounded-xl border-zinc-800 text-zinc-300 hover:bg-zinc-800">
                  <Pencil className="h-4 w-4 text-zinc-400" />
                  <span>Edit Profile</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="gap-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>Log out</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
