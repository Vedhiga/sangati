"use client";

import React, { useState } from "react";
import { ActivityType as IntentType } from "@/types";
import {
  ActivityRecurrenceType,
  ActivityFrequency,
  MeetingPlatform,
  CreateActivityPayload,
} from "@/lib/activity/types";
import { INTENT_META_MAP } from "@/lib/activity/activity-utils";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Lock, Sparkles, X, Loader2 } from "lucide-react";

import { activityApiService } from "@/lib/activity/api-service";

interface HostActivityFormProps {
  onSubmit?: (payload: CreateActivityPayload) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  currentUserId?: string;
}

export function HostActivityForm({ onSubmit, onSuccess, onCancel, onClose, currentUserId }: HostActivityFormProps) {
  const [intent, setIntent] = useState<IntentType>("BUILD");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState<ActivityRecurrenceType>("RECURRING");
  const [frequency, setFrequency] = useState<ActivityFrequency>("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState("Saturday");
  const [timeOfDay, setTimeOfDay] = useState("8:00 PM");
  const [timezone, setTimezone] = useState("IST (UTC+5:30)");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatform>("Google Meet");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title for your activity.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description for your activity.");
      return;
    }

    if (!meetingUrl.trim()) {
      setError("Please enter a private meeting URL (Google Meet, Zoom, or Discord).");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateActivityPayload = {
        intent,
        title: title.trim(),
        description: description.trim(),
        activity_type: activityType,
        frequency: activityType === "RECURRING" ? frequency : undefined,
        day_of_week: dayOfWeek,
        time_of_day: timeOfDay,
        timezone,
        duration_minutes: durationMinutes,
        max_participants: maxParticipants,
        meeting_platform: meetingPlatform,
        meeting_url: meetingUrl.trim(),
        private_notes: privateNotes.trim() || undefined,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        await activityApiService.createActivity(payload);
      }

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create activity.");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-sangati-glass p-6 rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#D4AF37] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Host Activity</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Create Community Activity</h2>
        </div>
        {(onCancel || onClose) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="rounded-full text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* 1. Select Intent */}
      <div className="space-y-2">
        <Label className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
          01 / Select Intent
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(INTENT_META_MAP) as IntentType[]).map((t) => {
            const meta = INTENT_META_MAP[t];
            const Icon = meta.icon;
            const isSelected = intent === t;

            return (
              <button
                key={t}
                type="button"
                onClick={() => setIntent(t)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? "border-[#D4AF37] bg-[#D4AF37]/10 text-white font-semibold shadow-lg"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-[#D4AF37]" : "text-zinc-400"}`} />
                <span className="text-xs">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Title & Description */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="act-title" className="text-xs font-medium text-zinc-300">
            Activity Title
          </Label>
          <Input
            id="act-title"
            placeholder="e.g. RL Agent Builders, Rust System Design, etc."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-black/50 border-white/10 text-zinc-100 rounded-xl"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-desc" className="text-xs font-medium text-zinc-300">
            Description & Context
          </Label>
          <Textarea
            id="act-desc"
            placeholder="Describe what you'll be building, learning, or discussing together..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-black/50 border-white/10 text-zinc-100 rounded-xl resize-none text-xs leading-relaxed"
            required
          />
        </div>
      </div>

      {/* 3. Schedule & Recurrence */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <Label className="text-xs font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>02 / Schedule & Recurrence</span>
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Activity Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActivityType("RECURRING")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  activityType === "RECURRING"
                    ? "bg-white/15 border-white/30 text-white font-semibold"
                    : "bg-white/[0.02] border-white/10 text-zinc-400"
                }`}
              >
                Recurring
              </button>
              <button
                type="button"
                onClick={() => setActivityType("ONE_TIME")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  activityType === "ONE_TIME"
                    ? "bg-white/15 border-white/30 text-white font-semibold"
                    : "bg-white/[0.02] border-white/10 text-zinc-400"
                }`}
              >
                One-Time
              </button>
            </div>
          </div>

          {activityType === "RECURRING" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Frequency</Label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as ActivityFrequency)}
                className="w-full h-9 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="EVERY_2_WEEKS">Every 2 Weeks</option>
                <option value="CUSTOM">Custom Schedule</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Day of Week</Label>
            <Input
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              placeholder="e.g. Saturday"
              className="bg-black/50 border-white/10 text-zinc-100 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Time</Label>
            <Input
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              placeholder="e.g. 8:00 PM"
              className="bg-black/50 border-white/10 text-zinc-100 rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Max Participants</Label>
            <Input
              type="number"
              min={2}
              max={50}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 6)}
              className="bg-black/50 border-white/10 text-zinc-100 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      {/* 4. PRIVATE Session Link & Instructions */}
      <div className="space-y-4 pt-2 border-t border-white/5 bg-white/[0.015] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>03 / Private Session Link (Participants Only)</span>
          </Label>
          <span className="text-[10px] text-zinc-500 font-mono">ENCRYPTED BOUNDARY</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Platform</Label>
            <select
              value={meetingPlatform}
              onChange={(e) => setMeetingPlatform(e.target.value as MeetingPlatform)}
              className="w-full h-9 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="Google Meet">Google Meet</option>
              <option value="Zoom">Zoom</option>
              <option value="Discord">Discord</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs text-zinc-400">Meeting / Session URL</Label>
            <Input
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              className="bg-black/60 border-white/10 text-zinc-100 rounded-xl text-xs"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Private Participant Instructions (Optional)</Label>
          <Textarea
            placeholder="Links to code repo, paper PDFs, or pre-session setup instructions..."
            value={privateNotes}
            onChange={(e) => setPrivateNotes(e.target.value)}
            rows={2}
            className="bg-black/60 border-white/10 text-zinc-100 rounded-xl resize-none text-xs"
          />
        </div>
      </div>

      {/* Form Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="text-xs text-zinc-400">
            Cancel
          </Button>
        )}
        <LiquidMetalButton
          type="submit"
          disabled={isSubmitting}
          size="md"
          icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
        >
          {isSubmitting ? "Creating..." : "Publish Activity"}
        </LiquidMetalButton>
      </div>
    </form>
  );
}

export default HostActivityForm;
