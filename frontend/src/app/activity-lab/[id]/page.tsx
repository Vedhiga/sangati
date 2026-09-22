"use client";

import React, { use } from "react";
import { ActivityDetail } from "@/components/activity/ActivityDetail";
import { FlaskConical } from "lucide-react";

interface PageParams {
  id: string;
}

export default function ActivityDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = use(params);

  return (
    <div className="space-y-6 pb-16">
      {/* Isolated Prototype Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl py-2.5 px-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-300">
          <FlaskConical className="w-4 h-4 text-[#C9A84A] shrink-0" />
          <span className="text-[#C9A84A] font-semibold tracking-wide">
            ACTIVITY SYSTEM — ISOLATED PROTOTYPE LAB
          </span>
          <span className="hidden md:inline text-zinc-400 font-normal">
            | Activity Detail View & Participant Space. Phase 1 active.
          </span>
        </div>
      </div>

      <div className="pt-2">
        <ActivityDetail activityId={resolvedParams.id} currentUserId="user_1" />
      </div>
    </div>
  );
}
