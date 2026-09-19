"use client";

import { useState } from "react";
import {
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { ActivityType, Post } from "@/types";
import { api, ApiClientError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PostCardProps {
  post: Post;
  currentUserId?: string | null;
  onPostUpdated?: (updatedPost: Post) => void;
  onPostDeleted?: (postId: string) => void;
}

interface ActivityMeta {
  type: ActivityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
}

const ACTIVITY_MAP: Record<ActivityType, ActivityMeta> = {
  BUILD: {
    type: "BUILD",
    label: "Build",
    icon: Hammer,
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  LEARN: {
    type: "LEARN",
    label: "Learn",
    icon: Brain,
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  CONVERSATION: {
    type: "CONVERSATION",
    label: "Conversation",
    icon: MessageSquare,
    badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  EXPLORE: {
    type: "EXPLORE",
    label: "Explore",
    icon: Sparkles,
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
};

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function PostCard({
  post,
  currentUserId,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = currentUserId && post.author_id === currentUserId;
  const activityMeta = ACTIVITY_MAP[post.activity_type] || ACTIVITY_MAP.BUILD;
  const ActivityIcon = activityMeta.icon;

  const initials = post.author.display_name
    ? post.author.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SQ";

  const isEdited =
    post.updated_at &&
    new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 1000;

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === post.content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.put<Post>(`/api/v1/posts/${post.id}`, {
        content: trimmed,
      });
      setIsEditing(false);
      onPostUpdated?.(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to update post.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await api.delete(`/api/v1/posts/${post.id}`);
      setIsConfirmingDelete(false);
      onPostDeleted?.(post.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Failed to delete post.");
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border border-white/10 bg-sangati-glass rounded-xl overflow-hidden shadow-none hover:border-white/20 transition-all duration-200">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Header: Author Info, Activity Badge, Time, and Actions */}
        <div className="flex items-start justify-between gap-3">
          {/* Author info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border border-white/15 shrink-0">
              <AvatarImage src={post.author.avatar_url || undefined} alt={post.author.display_name} />
              <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm truncate leading-snug">
                  {post.author.display_name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium py-0.5 px-2 rounded-md border ${activityMeta.badgeBg}`}
                >
                  <ActivityIcon className="h-3 w-3" />
                  <span>{activityMeta.label}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="truncate">@{post.author.username}</span>
                <span>•</span>
                <span className="flex items-center gap-1 shrink-0 text-slate-400">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(post.created_at)}
                  {isEdited && <span className="italic text-[10px]">(edited)</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Author action buttons */}
          {isAuthor && !isEditing && !isConfirmingDelete && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/5"
                aria-label="Edit post"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-white/5"
                aria-label="Delete post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Post Content or Edit Form */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-sm min-h-[80px] bg-black/40 border-white/15 text-slate-100 focus:border-white/30"
              maxLength={550}
              autoFocus
              aria-label="Edit post content"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-400">
                {editContent.length}/500
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={handleCancelEdit}
                  className="h-7 text-xs px-2.5 text-slate-400 hover:text-white"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving || !editContent.trim() || editContent.length > 500}
                  onClick={handleSaveEdit}
                  className="h-7 text-xs px-3 bg-white text-black hover:bg-slate-200 font-medium"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : isConfirmingDelete ? (
          <div className="p-3.5 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-2.5">
            <p className="text-xs text-rose-300 font-medium">
              Delete this post? This action cannot be undone.
            </p>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDelete}
                className="h-7 text-xs px-3 bg-rose-600 hover:bg-rose-700"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isDeleting}
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setError(null);
                }}
                className="h-7 text-xs px-2.5 text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words font-normal">
            {post.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

