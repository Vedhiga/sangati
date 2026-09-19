"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hammer, Brain, MessageSquare, Sparkles, Check, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { ActivityType, UserActivity } from "@/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ActivityOption {
  type: ActivityType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  borderColor: string;
}

const ACTIVITIES: ActivityOption[] = [
  {
    type: "BUILD",
    title: "Build something",
    description: "Projects, tools, code & creative experiments in progress.",
    icon: Hammer,
    accentColor: "text-orange-400",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    borderColor: "border-orange-500/40",
  },
  {
    type: "LEARN",
    title: "Learn something",
    description: "Research, concepts, papers & new skills being explored.",
    icon: Brain,
    accentColor: "text-blue-400",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    borderColor: "border-blue-500/40",
  },
  {
    type: "CONVERSATION",
    title: "Have a conversation",
    description: "Discuss ideas and exchange perspectives with curious companions.",
    icon: MessageSquare,
    accentColor: "text-violet-400",
    badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    borderColor: "border-violet-500/40",
  },
  {
    type: "EXPLORE",
    title: "Just explore",
    description: "Browse community discoveries without a specific goal.",
    icon: Sparkles,
    accentColor: "text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    borderColor: "border-amber-500/40",
  },
];

export default function ActivityPage() {
  const router = useRouter();
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCurrentActivity() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const activity = await api.get<UserActivity | null>("/api/v1/activity/me");
        if (activity?.activity_type) {
          setSelectedActivity(activity.activity_type);
        }
      } catch (err) {
        console.error("Could not fetch current activity:", err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadCurrentActivity();
  }, [router]);

  const handleSave = async () => {
    if (!selectedActivity) return;

    setError(null);
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await api.put<UserActivity>("/api/v1/activity/me", {
        activity_type: selectedActivity,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        router.push("/discover");
      }, 600);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Could not save your activity. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        <p className="text-xs text-slate-400">Loading activity options...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 py-4">
      {/* Header */}
      <div className="text-center space-y-2 max-w-md mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Select Intent</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          What are you up to today?
        </h1>
        <p className="text-xs text-slate-400">
          Choose what feels right. You can change your active intent at any time.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/20">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Activity Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Activity selection">
        {ACTIVITIES.map((activity) => {
          const Icon = activity.icon;
          const isSelected = selectedActivity === activity.type;

          return (
            <div
              key={activity.type}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => setSelectedActivity(activity.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedActivity(activity.type);
                }
              }}
              className={`relative flex flex-col p-5 rounded-xl border transition-all duration-150 cursor-pointer text-left focus-visible:outline-none select-none ${
                isSelected
                  ? `border-white/30 bg-white/[0.06] ${activity.borderColor}`
                  : "border-white/10 bg-sangati-glass hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              {/* Top row: Icon and check indicator */}
              <div className="flex items-center justify-between mb-4">
                <div className={`h-9 w-9 rounded-lg border ${activity.badgeBg} flex items-center justify-center`}>
                  <Icon className={`h-4.5 w-4.5 ${activity.accentColor}`} />
                </div>

                {/* Selection Check Circle */}
                <div
                  className={`h-4.5 w-4.5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-white text-black font-bold"
                      : "border border-white/20"
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="font-semibold text-sm text-slate-100 mb-1">
                {activity.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activity.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-white hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
            <span>Profile</span>
          </Button>
        </Link>

        <Button
          onClick={handleSave}
          disabled={!selectedActivity || isSaving}
          className="gap-2 px-6 bg-white text-black hover:bg-slate-200 font-medium min-w-[160px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : savedSuccess ? (
            <>
              <Check className="h-4 w-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <span>Discover People</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

