"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Globe,
} from "lucide-react";
import { ActivityType, Post } from "@/types";
import { api, ApiClientError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

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
    accentClass: "text-amber-400",
    activeClass: "bg-white/10 text-white border-white/20",
  },
  {
    type: "LEARN",
    label: "Learn",
    icon: Brain,
    prompt: "What insightful concept or skill did you learn today?",
    accentClass: "text-blue-400",
    activeClass: "bg-white/10 text-white border-white/20",
  },
  {
    type: "CONVERSATION",
    label: "Discussion",
    icon: MessageSquare,
    prompt: "Start an open, thoughtful discussion...",
    accentClass: "text-violet-400",
    activeClass: "bg-white/10 text-white border-white/20",
  },
  {
    type: "EXPLORE",
    label: "Explore",
    icon: Sparkles,
    prompt: "What new tools, topics, or ideas are you exploring?",
    accentClass: "text-[#F5F5F3]",
    activeClass: "bg-white/10 text-white border-white/20",
  },
];

const MAX_CHARS = 500;

export function PostComposer({ defaultActivity, onPostCreated }: PostComposerProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>("BUILD");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attachment states
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [linkAttachment, setLinkAttachment] = useState<{
    url: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
  } | null>(null);

  const [mediaAttachment, setMediaAttachment] = useState<{
    url: string;
    type: "image" | "video";
    previewUrl?: string;
  } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (defaultActivity) {
      setSelectedActivity(defaultActivity);
    }
  }, [defaultActivity]);

  const activeMeta = ACTIVITIES.find((a) => a.type === selectedActivity) || ACTIVITIES[0];
  const ActiveIcon = activeMeta.icon;
  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;
  const isPostDisabled =
    (!content.trim() && !mediaAttachment && !linkAttachment) ||
    isOverLimit ||
    isSubmitting ||
    isUploadingMedia;

  // Handle Link Fetching
  const handleAddLink = async () => {
    if (!linkUrlInput.trim()) return;
    setIsFetchingLink(true);
    setError(null);
    try {
      const res = await api.post<{
        url: string;
        title?: string;
        description?: string;
        image?: string;
      }>("/api/v1/media/link-preview", { url: linkUrlInput.trim() });
      setLinkAttachment(res);
      setShowLinkInput(false);
      setLinkUrlInput("");
    } catch {
      setLinkAttachment({ url: linkUrlInput.trim(), title: linkUrlInput.trim() });
      setShowLinkInput(false);
      setLinkUrlInput("");
    } finally {
      setIsFetchingLink(false);
    }
  };

  // Handle File Upload (Image / Video)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setError("Please select a valid image (JPEG, PNG, GIF, WebP) or video (MP4, WebM) file.");
      return;
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      setError("Image file size exceeds maximum limit of 10MB.");
      return;
    }

    if (isVideo && file.size > 50 * 1024 * 1024) {
      setError("Video file size exceeds maximum limit of 50MB.");
      return;
    }

    setIsUploadingMedia(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Local API upload
      const res = await api.post<{ media_url: string; media_type: string }>("/api/v1/media/upload", formData);

      setMediaAttachment({
        url: res.media_url,
        type: res.media_type as "image" | "video",
        previewUrl: URL.createObjectURL(file),
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPostDisabled) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const newPost = await api.post<Post>("/api/v1/posts", {
        activity_type: selectedActivity,
        content: content.trim(),
        media_url: mediaAttachment?.url || null,
        media_type: mediaAttachment?.type || null,
        link_url: linkAttachment?.url || null,
        link_title: linkAttachment?.title || null,
        link_description: linkAttachment?.description || null,
        link_image: linkAttachment?.image || null,
      });

      // Clear state
      setContent("");
      setMediaAttachment(null);
      setLinkAttachment(null);
      setShowLinkInput(false);
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
    <Card className="border border-white/[0.08] bg-sangati-glass rounded-2xl overflow-hidden shadow-2xl">
      <CardContent className="p-5 space-y-4">
        {/* Composer Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-[#F5F5F3] tracking-tight">
              Share what you&apos;re doing
            </h2>
            <p className="text-xs text-[#8A8A8A]">
              Post your updates, learnings, or open questions to the community.
            </p>
          </div>

          {/* Activity Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup">
            {ACTIVITIES.map((act) => {
              const Icon = act.icon;
              const isSelected = selectedActivity === act.type;
              return (
                <button
                  key={act.type}
                  type="button"
                  onClick={() => setSelectedActivity(act.type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                    isSelected
                      ? act.activeClass
                      : "border-white/10 bg-white/[0.02] text-[#8A8A8A] hover:text-[#F5F5F3] hover:bg-white/[0.06]"
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
          <div className="rounded-xl border border-white/[0.08] bg-[#0A0A0A]/60 focus-within:border-white/20 transition-all overflow-hidden">
            {/* Active context badge */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs select-none">
              <ActiveIcon className={`h-3.5 w-3.5 ${activeMeta.accentClass}`} />
              <span className="font-mono text-[10px] text-[#8A8A8A] uppercase tracking-widest">
                {activeMeta.label}
              </span>
            </div>

            <Textarea
              id="post-composer-textarea"
              placeholder={activeMeta.prompt}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-4 py-2 text-sm text-[#F5F5F3] resize-none min-h-[90px] placeholder:text-zinc-600"
              maxLength={MAX_CHARS + 50}
            />

            {/* PREVIEW ATTACHMENTS AREA */}
            {(linkAttachment || mediaAttachment || showLinkInput) && (
              <div className="px-4 pb-3 space-y-2">
                {/* Link Input Row */}
                {showLinkInput && !linkAttachment && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/10">
                    <Globe className="h-4 w-4 text-[#8A8A8A] shrink-0" />
                    <Input
                      placeholder="https://example.com/project-or-article"
                      value={linkUrlInput}
                      onChange={(e) => setLinkUrlInput(e.target.value)}
                      className="h-8 text-xs bg-transparent border-none focus-visible:ring-0 text-[#F5F5F3]"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLink())}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddLink}
                      disabled={isFetchingLink || !linkUrlInput.trim()}
                      className="h-7 text-xs bg-white text-black hover:bg-slate-200"
                    >
                      {isFetchingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : "Attach"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(false)}
                      className="text-[#8A8A8A] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Attached Link Preview Card */}
                {linkAttachment && (
                  <div className="relative group p-3 rounded-xl bg-white/[0.025] border border-white/10 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white shrink-0">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-medium text-[#F5F5F3] truncate">
                        {linkAttachment.title || linkAttachment.url}
                      </p>
                      {linkAttachment.description && (
                        <p className="text-[11px] text-[#8A8A8A] line-clamp-1">
                          {linkAttachment.description}
                        </p>
                      )}
                      <p className="text-[10px] font-mono text-zinc-500 truncate">
                        {linkAttachment.url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLinkAttachment(null)}
                      className="text-[#8A8A8A] hover:text-white p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Attached Media Preview (Image or Video) */}
                {mediaAttachment && (
                  <div className="relative group rounded-xl overflow-hidden border border-white/10 max-h-56 bg-black">
                    {mediaAttachment.type === "image" ? (
                      <img
                        src={mediaAttachment.previewUrl || mediaAttachment.url}
                        alt="Media upload preview"
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <video
                        src={mediaAttachment.previewUrl || mediaAttachment.url}
                        controls
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaAttachment(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,video/*"
              className="hidden"
            />

            {/* Bottom Bar: Action Controls & Submit */}
            <div className="px-4 py-2.5 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.015]">
              {/* Attachment Toggle Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#F5F5F3] hover:bg-white/5 transition-colors flex items-center gap-1 text-xs"
                  title="Attach link URL"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span className="hidden sm:inline text-[11px]">Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-[#F5F5F3] hover:bg-white/5 transition-colors flex items-center gap-1 text-xs"
                  title="Attach Image or Video"
                >
                  {isUploadingMedia ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4" />
                      <span className="hidden sm:inline text-[11px]">Media</span>
                    </>
                  )}
                </button>
              </div>

              {/* Character Counter & Submit */}
              <div className="flex items-center gap-3">
                <span
                  className={`text-[11px] font-mono transition-colors ${
                    isOverLimit
                      ? "text-rose-400 font-semibold"
                      : charsLeft <= 50
                      ? "text-amber-400"
                      : "text-[#8A8A8A]"
                  }`}
                >
                  {content.length}/{MAX_CHARS}
                </span>

                <LiquidMetalButton
                  type="submit"
                  size="sm"
                  disabled={isPostDisabled}
                  icon={isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                >
                  {isSubmitting ? "Posting..." : "Post"}
                </LiquidMetalButton>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 px-1 font-medium">{error}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
