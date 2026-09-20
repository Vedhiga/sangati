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
  CheckCircle2,
  ShieldCheck,
  Compass,
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
    <div className="w-full space-y-16 py-4 animate-fade-in-up">
      {/* SECTION 1: Asymmetric Cinematic Hero */}
      <section className="relative space-y-8 pt-4">
        {/* Section Label */}
        <div className="flex items-center gap-2 text-[10px] font-mono font-semibold tracking-widest text-slate-400 uppercase">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>01 // SANGATI COMMUNITY ETHOS</span>
        </div>

        {/* Hero Content Stack */}
        <div className="space-y-6 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Where <span className="text-slate-200 underline underline-offset-8 decoration-white/20">interests</span> meet people.
          </h1>

          <p className="text-base text-slate-400 leading-relaxed font-normal">
            A quiet, intentional platform built around what you&apos;re currently building, learning, discussing, or exploring — without vanity metrics, noise, or algorithms.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isAuthenticated ? (
              <>
                <Link href="/feed">
                  <Button size="lg" className="gap-2.5 px-6 bg-white text-black hover:bg-slate-200 font-semibold text-xs rounded-xl shadow-lg transition-all duration-200">
                    <Layers className="h-4 w-4" />
                    <span>Personal Feed</span>
                  </Button>
                </Link>
                <Link href="/discover">
                  <Button size="lg" variant="outline" className="gap-2.5 px-6 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 text-xs rounded-xl transition-all duration-200">
                    <Users className="h-4 w-4" />
                    <span>Discover People</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup">
                  <Button size="lg" className="gap-2.5 px-6 bg-white text-black hover:bg-slate-200 font-semibold text-xs rounded-xl shadow-lg transition-all duration-200">
                    <span>Join Sangati</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="px-6 border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 text-xs rounded-xl transition-all duration-200">
                    <span>Sign in</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Technical Divider */}
        <div className="geometric-line-h w-full" />
      </section>

      {/* SECTION 2: Core Architecture Flow */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 uppercase">
            02 // PLATFORM SYSTEM ARCHITECTURE
          </span>
          <span className="text-[11px] font-mono text-slate-400">4-STAGE PIPELINE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Active Intent", desc: "Set what you're building, learning, or discussing." },
            { step: "02", title: "Discovery", desc: "Discover peers matched by shared curiosities." },
            { step: "03", title: "Quiet Messaging", desc: "Calm 1-to-1 notes and small group discussions." },
            { step: "04", title: "Authentic Network", desc: "Form connections based on genuine mutual activity." },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl border border-white/[0.08] bg-sangati-glass hover:border-white/20 transition-all duration-200 space-y-2 group shadow-xl">
              <span className="text-[10px] font-mono text-slate-400 block tracking-widest">{item.step}</span>
              <h3 className="text-xs font-bold text-slate-100 group-hover:text-white transition-colors">{item.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: Active Intent Matrices */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 uppercase">
            03 // INTENT MATRICES
          </span>
          {isAuthenticated && (
            <Link href="/activity" className="text-xs text-slate-300 hover:text-white hover:underline transition-colors flex items-center gap-1 font-mono">
              Configure intent →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-sangati-glass hover:border-orange-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Hammer className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-md">
                  INTENT // 01
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-orange-400 transition-colors">
                  Build
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Projects, apps, open-source tools & creative experiments currently in active development.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-sangati-glass hover:border-blue-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Brain className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                  INTENT // 02
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                  Learn
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Concepts, research papers, languages & technical skills being mastered.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-sangati-glass hover:border-violet-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md">
                  INTENT // 03
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-violet-400 transition-colors">
                  Conversation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open exchange of ideas, philosophical queries, and technical discussions.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-sangati-glass hover:border-amber-500/40 transition-all duration-300 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  INTENT // 04
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors">
                  Explore
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Discover community work and serendipitous findings without a fixed agenda.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* SECTION 4: Transparent Feed Principles */}
      <section className="p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-sangati-glass space-y-6 shadow-2xl">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-slate-400 uppercase">
            04 // TRANSPARENT RANKING GUARANTEE
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">
            How your feed is calculated
          </h2>
          <p className="text-xs text-slate-400 max-w-lg leading-relaxed font-normal">
            No black-box algorithms. Every post in your feed is ranked deterministically:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {[
            { label: "Active Intent Alignment (+3.0)", text: "Matches what you're currently building or learning." },
            { label: "Mutual Connection (+3.0)", text: "Prioritizes posts from accepted mutual connections." },
            { label: "Topic Interest Overlap (+2.0)", text: "Calculated based on shared interest tags." },
            { label: "Smooth Recency Decay (+2.0)", text: "12-hour exponential half-life decay." },
          ].map((rule, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-200">{rule.label}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{rule.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
