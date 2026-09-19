"use client";

import { useState, useEffect } from "react";
import { Hammer, Brain, MessageSquare, Sparkles, Send, Loader2 } from "lucide-react";
import { ActivityType, Post } from "@/types";
import { api, ApiClientError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PostComposerProps {
  defaultActivity?: ActivityType | null;
  onPostCreated: (newPost: Post) => void;
}

interface ActivityMeta {
  type: ActivityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  accentClass: string;
  activeClass: string;
}

const ACTIVITIES: ActivityMeta[] = [
  {
    type: "BUILD",
    label: "Build",
    icon: Hammer,
    prompt: "Share what you're building, coding, or designing...",
    accentClass: "text-orange-400",
    activeClass: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  {
    type: "LEARN",
    label: "Learn",
    icon: Brain,
    prompt: "What insightful concept or skill did you learn today?",
    accentClass: "text-blue-400",
    activeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  {
    type: "CONVERSATION",
    label: "Conversation",
    icon: MessageSquare,
    prompt: "Start an open, thoughtful discussion...",
    accentClass: "text-violet-400",
    activeClass: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
  {
    type: "EXPLORE",
    label: "Explore",
    icon: Sparkles,
    prompt: "What new tools, topics, or ideas are you exploring?",
    accentClass: "text-amber-400",
    activeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
];

const MAX_CHARS = 500;

export function PostComposer({ defaultActivity, onPostCreated }: PostComposerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>("BUILD");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultActivity) {
      setSelectedActivity(defaultActivity);
    }
  }, [defaultActivity]);

  const activeMeta = ACTIVITIES.find((a) => a.type === selectedActivity) || ACTIVITIES[0];
  const ActiveIcon = activeMeta.icon;
  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;
  const isPostDisabled = !content.trim() || isOverLimit || isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPostDisabled) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newPost = await api.post<Post>("/api/v1/posts", {
        activity_type: selectedActivity,
        content: content.trim(),
      });
      setContent("");
      onPostCreated(newPost);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to publish post. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-white/10 bg-sangati-glass rounded-xl overflow-hidden shadow-none">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Composer Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Share what you&apos;re doing</span>
            </h2>
            <p className="text-xs text-slate-400">
              Post your updates, learnings, or open questions to the community.
            </p>
          </div>

          {/* Activity selector pills */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="radiogroup"
            aria-label="Select post activity context"
          >
            {ACTIVITIES.map((act) => {
              const Icon = act.icon;
              const isSelected = selectedActivity === act.type;
              return (
                <button
                  key={act.type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedActivity(act.type)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all duration-150 ${
                    isSelected
                      ? act.activeClass
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-black/40 focus-within:border-white/25 transition-all">
            {/* Active context label inside composer */}
            <div className="px-3.5 pt-3 pb-1 flex items-center gap-1.5 text-xs select-none">
              <ActiveIcon className={`h-3.5 w-3.5 ${activeMeta.accentClass}`} />
              <span className="font-medium text-slate-300 text-[11px] tracking-wide uppercase">
                {activeMeta.label}
              </span>
            </div>

            <Textarea
              id="post-composer-textarea"
              placeholder={activeMeta.prompt}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-3.5 py-1 text-sm text-slate-100 resize-none min-h-[90px] placeholder:text-slate-500"
              maxLength={MAX_CHARS + 50}
              aria-label={`Post content for ${activeMeta.label}`}
            />

            {/* Bottom Bar: Character counter & Submit */}
            <div className="px-3.5 py-2 border-t border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono transition-colors ${
                    isOverLimit
                      ? "text-rose-400 font-semibold"
                      : charsLeft <= 50
                      ? "text-amber-400"
                      : "text-slate-500"
                  }`}
                >
                  {content.length}/{MAX_CHARS}
                </span>
                {error && (
                  <span className="text-[11px] text-rose-400 truncate max-w-xs font-medium">
                    {error}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isPostDisabled}
                className="h-7 px-3.5 text-xs font-medium gap-1.5 bg-white text-black hover:bg-slate-200 shadow-none rounded-md"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                <span>Share</span>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

