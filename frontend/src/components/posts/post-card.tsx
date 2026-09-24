"use client";

import React, { useState } from "react";
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
  ExternalLink,
  Globe,
  Heart as HeartIcon,
  MessageCircle as MessageCircleIcon,
  Share2 as Share2Icon,
  Send,
} from "lucide-react";
import { ActivityType, Post, Comment, CommentsListResponse } from "@/types";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, ButtonGroup } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


import {
  RedHeartIcon,
  FireIcon,
  EyesIcon,
  RaisingHandsLightSkinToneIcon,
  HandshakeMediumLightSkinToneIcon,
} from "@/components/icons/reaction-icons";

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
    badgeBg: "bg-white/10 text-white border-white/20",
  },
  LEARN: {
    type: "LEARN",
    label: "Learn",
    icon: Brain,
    badgeBg: "bg-white/10 text-white border-white/20",
  },
  CONVERSATION: {
    type: "CONVERSATION",
    label: "Discussion",
    icon: MessageSquare,
    badgeBg: "bg-white/10 text-white border-white/20",
  },
  EXPLORE: {
    type: "EXPLORE",
    label: "Explore",
    icon: Sparkles,
    badgeBg: "bg-white/10 text-white border-white/20",
  },
};

const CUSTOM_REACTIONS: { type: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "LOVE", label: "Love", Icon: RedHeartIcon },
  { type: "INTERESTING", label: "Interesting", Icon: FireIcon },
  { type: "CURIOUS", label: "Curious", Icon: EyesIcon },
  { type: "SUPPORT", label: "Support", Icon: RaisingHandsLightSkinToneIcon },
  { type: "CONNECT", label: "Connect", Icon: HandshakeMediumLightSkinToneIcon },
];


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
  post: initialPost,
  currentUserId,
  onPostUpdated,
  onPostDeleted,
}: PostCardProps) {
  const [post, setPost] = useState<Post>(initialPost);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction State
  const [isLiking, setIsLiking] = useState(false);
  const [isReacting, setIsReacting] = useState<string | null>(null);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Share State
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/feed#post-${post.id}` : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${post.author.username} on Sangati`,
          text: post.content.slice(0, 100),
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard if share dialog was canceled or unsupported
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      } catch (err) {
        console.error("Failed to copy share link:", err);
      }
    }
  };


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
    : "S";

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
      setPost(updated);
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

  // --- LIKE TOGGLE ---
  const handleToggleLike = async () => {
    if (isLiking || !currentUserId) return;
    setIsLiking(true);
    try {
      const updated = await api.post<Post>(`/api/v1/posts/${post.id}/like`);
      setPost(updated);
    } catch (err) {
      console.error("Failed to toggle like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  // --- REACTION TOGGLE ---
  const handleToggleReaction = async (reactionType: string) => {
    if (isReacting || !currentUserId) return;
    setIsReacting(reactionType);
    try {
      const updated = await api.post<Post>(`/api/v1/posts/${post.id}/reactions`, {
        reaction_type: reactionType,
      });
      setPost(updated);
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    } finally {
      setIsReacting(null);
    }
  };

  // --- COMMENTS LOAD & SUBMIT ---
  const toggleCommentsSection = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && comments.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await api.get<CommentsListResponse>(`/api/v1/posts/${post.id}/comments`);
        setComments(res.comments);
        setCommentsCount(res.total);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || isSubmittingComment || !currentUserId) return;

    setIsSubmittingComment(true);
    try {
      const added = await api.post<Comment>(`/api/v1/posts/${post.id}/comments`, {
        content: trimmed,
      });
      setComments((prev) => [...prev, added]);
      setCommentsCount((prev) => prev + 1);
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Comment Editing State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false);

  const handleStartEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditCommentContent(currentContent);
  };

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null);
    setEditCommentContent("");
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    const trimmed = editCommentContent.trim();
    if (!trimmed || isSavingCommentEdit || !currentUserId) return;

    setIsSavingCommentEdit(true);
    try {
      const updated = await api.put<Comment>(`/api/v1/posts/${post.id}/comments/${commentId}`, {
        content: trimmed,
      });
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
      setEditCommentContent("");
    } catch (err) {
      console.error("Failed to update comment:", err);
    } finally {
      setIsSavingCommentEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId || !currentUserId) return;
    setDeletingCommentId(commentId);
    try {
      await api.delete(`/api/v1/posts/${post.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingCommentId(null);
    }
  };


  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <Card className="border border-white/[0.08] bg-sangati-glass rounded-2xl overflow-hidden shadow-2xl hover:border-white/20 transition-all duration-300">
      <CardContent className="p-5 space-y-4">
        {/* Header: Author Info, Activity Badge, Time, Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border border-white/15 shrink-0">
              <AvatarImage src={post.author.avatar_url || undefined} alt={post.author.display_name} />
              <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#F5F5F3] text-sm truncate leading-snug">
                  {post.author.display_name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono py-0.5 px-2 rounded-full border ${activityMeta.badgeBg}`}
                >
                  <ActivityIcon className="h-3 w-3" />
                  <span>{activityMeta.label}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                <span className="truncate font-mono">@{post.author.username}</span>
                <span>•</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(post.created_at)}
                  {isEdited && <span className="italic text-[10px]">(edited)</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Author Actions */}
          {isAuthor && !isEditing && !isConfirmingDelete && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0 text-[#8A8A8A] hover:text-white hover:bg-white/5"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}
                className="h-7 w-7 p-0 text-[#8A8A8A] hover:text-rose-400 hover:bg-white/5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Content or Edit Form */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-sm min-h-[80px] bg-[#0A0A0A] border-white/15 text-[#F5F5F3] focus:border-white/30"
              maxLength={500}
              autoFocus
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-[#8A8A8A]">
                {editContent.length}/500
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={handleCancelEdit}
                  className="h-7 text-xs px-2.5 text-[#8A8A8A] hover:text-white"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving || !editContent.trim() || editContent.length > 500}
                  onClick={handleSaveEdit}
                  className="h-7 text-xs px-3 bg-[#F5F5F3] text-black hover:bg-white font-medium"
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
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2.5">
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
                className="h-7 text-xs px-2.5 text-[#8A8A8A] hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#F5F5F3] leading-relaxed whitespace-pre-wrap break-words font-normal">
              {post.content}
            </p>

            {/* LINK ATTACHMENT CARD */}
            {post.link_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group rounded-xl border border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/20 transition-all overflow-hidden"
              >
                {post.link_image && (
                  <img
                    src={post.link_image}
                    alt={post.link_title || "Link preview"}
                    className="w-full h-40 object-cover border-b border-white/[0.08]"
                  />
                )}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[#8A8A8A] flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {getDomain(post.link_url)}
                    </span>
                    <ExternalLink className="h-3 w-3 text-[#8A8A8A] group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-xs font-semibold text-[#F5F5F3] group-hover:text-white transition-colors line-clamp-1">
                    {post.link_title || post.link_url}
                  </h4>
                  {post.link_description && (
                    <p className="text-[11px] text-[#8A8A8A] line-clamp-2 leading-relaxed">
                      {post.link_description}
                    </p>
                  )}
                </div>
              </a>
            )}

            {/* MEDIA ATTACHMENT */}
            {post.media_url && (
              <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black">
                {post.media_type === "video" ? (
                  <video
                    src={post.media_url}
                    controls
                    preload="metadata"
                    className="w-full max-h-96 object-contain"
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt="Attached post media"
                    className="w-full max-h-96 object-cover"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* INTERACTION BAR: BUTTON GROUP & REACTION PICKER */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <ButtonGroup className="w-full sm:w-auto flex">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleLike}
              disabled={isLiking}
              className={cn(
                "flex-1 sm:flex-initial text-xs gap-1.5 transition-colors border-white/10 bg-zinc-950/40 hover:bg-white/10 hover:text-white",
                post.is_liked_by_user && "text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20"
              )}
            >
              <HeartIcon className={cn("h-4 w-4", post.is_liked_by_user && "fill-rose-400 text-rose-400")} />
              <span>Like</span>
              {(post.likes_count ?? 0) > 0 && (
                <span className="text-[10px] font-mono opacity-70">({post.likes_count})</span>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleCommentsSection}
              className={cn(
                "flex-1 sm:flex-initial text-xs gap-1.5 transition-colors border-white/10 bg-zinc-950/40 hover:bg-white/10 hover:text-white",
                showComments && "bg-white/15 text-white border-white/20"
              )}
            >
              <MessageCircleIcon className="h-4 w-4" />
              <span>Comment</span>
              {commentsCount > 0 && (
                <span className="text-[10px] font-mono opacity-70">({commentsCount})</span>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
              className="flex-1 sm:flex-initial text-xs gap-1.5 transition-colors border-white/10 bg-zinc-950/40 hover:bg-white/10 hover:text-white"
            >
              <Share2Icon className="h-4 w-4" />
              <span>{copiedShare ? "Copied!" : "Share"}</span>
            </Button>
          </ButtonGroup>

          {/* Custom SVG Reaction Buttons */}
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/10 rounded-lg px-1.5 py-1 self-start sm:self-auto">
            {CUSTOM_REACTIONS.map(({ type, label, Icon }) => {
              const count = post.reactions_summary?.[type] || 0;
              const isReacted = post.user_reaction === type || post.user_reactions?.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleToggleReaction(type)}
                  className={cn(
                    "h-7 px-2 rounded-md text-xs flex items-center gap-1.5 transition-all",
                    isReacted
                      ? "bg-white/15 border border-white/30 text-white scale-105 shadow-sm"
                      : "hover:bg-white/10 text-[#8A8A8A]"
                  )}
                  title={label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {count > 0 && <span className="text-[10px] font-mono">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>


        {/* EXPANDABLE COMMENTS SECTION */}
        {showComments && (
          <div className="pt-3 space-y-3 border-t border-white/[0.06] animate-fade-in">
            {/* Comment Form */}
            {currentUserId ? (
              <form onSubmit={handleAddComment} className="flex items-center gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a quiet comment..."
                  className="text-xs min-h-[38px] max-h-[100px] py-2 bg-[#0A0A0A] border-white/15 text-[#F5F5F3] focus:border-white/30 rounded-xl resize-none"
                  maxLength={500}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="h-9 px-3 bg-[#F5F5F3] text-black hover:bg-white shrink-0 rounded-xl"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </form>
            ) : (
              <p className="text-xs text-[#8A8A8A] italic">Log in to comment.</p>
            )}

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="py-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#8A8A8A] mx-auto" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-[#8A8A8A] italic py-2 text-center">No comments yet. Be the first to share a perspective!</p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {comments.map((comment) => {
                  const isCommentAuthor = currentUserId && comment.author_id === currentUserId;
                  const isEditingThisComment = editingCommentId === comment.id;
                  const cInitials = comment.author.display_name
                    ? comment.author.display_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "C";

                  return (
                    <div
                      key={comment.id}
                      className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <Avatar className="h-7 w-7 border border-white/10 shrink-0 mt-0.5">
                          <AvatarImage src={comment.author.avatar_url || undefined} alt={comment.author.display_name} />
                          <AvatarFallback className="bg-zinc-900 text-[#F5F5F3] text-[10px] font-semibold">
                            {cInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#F5F5F3] truncate">
                              {comment.author.display_name}
                            </span>
                            <span className="font-mono text-[#8A8A8A] text-[10px]">
                              @{comment.author.username}
                            </span>
                            <span className="text-[10px] text-[#8A8A8A] font-mono">
                              • {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>

                          {isEditingThisComment ? (
                            <div className="space-y-2 pt-1">
                              <Textarea
                                value={editCommentContent}
                                onChange={(e) => setEditCommentContent(e.target.value)}
                                className="text-xs min-h-[50px] bg-[#0A0A0A] border-white/20 text-[#F5F5F3] rounded-lg"
                                maxLength={500}
                                autoFocus
                              />
                              <div className="flex items-center gap-1.5 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelCommentEdit}
                                  className="h-6 text-[11px] px-2 text-[#8A8A8A] hover:text-white"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSavingCommentEdit || !editCommentContent.trim()}
                                  onClick={() => handleSaveCommentEdit(comment.id)}
                                  className="h-6 text-[11px] px-2.5 bg-[#F5F5F3] text-black hover:bg-white"
                                >
                                  {isSavingCommentEdit ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-1" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[#F5F5F3] leading-relaxed whitespace-pre-wrap break-words font-normal">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Comment author actions */}
                      {isCommentAuthor && !isEditingThisComment && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditComment(comment.id, comment.content)}
                            className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-white hover:bg-white/5"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingCommentId === comment.id}
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-6 w-6 p-0 text-[#8A8A8A] hover:text-rose-400 hover:bg-white/5"
                          >
                            {deletingCommentId === comment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
