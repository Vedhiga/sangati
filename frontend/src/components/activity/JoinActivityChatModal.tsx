"use client";

import React from "react";
import { MessageSquare, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JoinActivityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activityTitle?: string;
  isJoining?: boolean;
}

export function JoinActivityChatModal({
  isOpen,
  onClose,
  onConfirm,
  activityTitle,
  isJoining = false,
}: JoinActivityChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          disabled={isJoining}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-2 text-center pt-2">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100">
            Join Activity Chat?
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {activityTitle ? (
              <>
                Join <span className="text-zinc-200 font-semibold">{activityTitle}</span> to enter the activity group chat.
              </>
            ) : (
              "Join this activity to enter the activity chat?"
            )}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isJoining}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isJoining}
            className="bg-amber-400 text-zinc-950 hover:bg-amber-300 text-xs font-bold px-5 gap-1.5"
          >
            {isJoining ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5" />
            )}
            <span>Join Activity</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
