"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ActivityDetail } from "@/components/activity/ActivityDetail";

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  if (!activityId) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Invalid activity ID.
      </div>
    );
  }

  return (
    <div className="pb-16">
      <ActivityDetail
        activityId={activityId}
        onBack={() => router.push("/activities")}
      />
    </div>
  );
}
