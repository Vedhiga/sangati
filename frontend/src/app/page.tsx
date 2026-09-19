"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Hammer,
  Brain,
  MessageSquare,
  Sparkles,
  Users,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  return (
    <div className="w-full space-y-10 py-4">
      {/* Hero Badge & Title */}
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Sangati Community</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-100 leading-tight">
          Where <span className="text-white underline underline-offset-4 decoration-white/20">interests</span> meet people.
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
          Connect around what you&apos;re currently building, learning, discussing, or exploring. Minimal, quiet, and introductory.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            <>
              <Link href="/feed">
                <Button size="sm" className="gap-2 px-5 bg-white text-black hover:bg-slate-200 font-medium">
                  <Layers className="h-4 w-4" />
                  <span>Personal Feed</span>
                </Button>
              </Link>
              <Link href="/discover">
                <Button size="sm" variant="outline" className="gap-2 px-5 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10">
                  <Users className="h-4 w-4" />
                  <span>Discover People</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button size="sm" className="gap-2 px-5 bg-white text-black hover:bg-slate-200 font-medium">
                  <span>Join Sangati</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" variant="outline" className="px-5 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10">
                  <span>Sign in</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Core Flow Stepper */}
      <div className="rounded-xl border border-white/10 bg-sangati-glass p-6 space-y-4">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block text-center">
          The Sangati Core Flow
        </span>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          {[
            { step: "01", title: "Interests", desc: "Share what you're up to" },
            { step: "02", title: "People", desc: "Discover like-minded peers" },
            { step: "03", title: "Conversations", desc: "Calm 1-to-1 notes & groups" },
            { step: "04", title: "Collaboration", desc: "Build & learn together" },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">{item.step}</span>
              <p className="text-xs font-semibold text-slate-200">{item.title}</p>
              <p className="text-[10px] text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Intent Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Intents
          </h2>
          {isAuthenticated && (
            <Link href="/activity" className="text-xs text-slate-300 hover:text-white hover:underline">
              Set your intent →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-5 rounded-xl border border-white/10 bg-sangati-glass hover:border-orange-500/40 transition-all duration-200 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                <Hammer className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-200 group-hover:text-orange-400 transition-colors">
                  Build
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Projects, apps, tools & creative experiments in progress.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-5 rounded-xl border border-white/10 bg-sangati-glass hover:border-blue-500/40 transition-all duration-200 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition-colors">
                  Learn
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Concepts, research, papers & new skills being explored.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-5 rounded-xl border border-white/10 bg-sangati-glass hover:border-violet-500/40 transition-all duration-200 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-200 group-hover:text-violet-400 transition-colors">
                  Conversation
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Discuss ideas and exchange perspectives with curious companions.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-5 rounded-xl border border-white/10 bg-sangati-glass hover:border-amber-500/40 transition-all duration-200 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-200 group-hover:text-amber-400 transition-colors">
                  Explore
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Browse community discoveries without a fixed agenda.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

