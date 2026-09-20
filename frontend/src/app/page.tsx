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
  Compass,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LiquidMetalCanvas } from "@/components/ui/liquid-metal-canvas";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  return (
    <div className="w-full space-y-24 py-6 relative z-10">
      {/* SECTION 1: Asymmetric Motion-First Editorial Hero */}
      <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-6 pb-12">
        {/* Left Column: Asymmetric Editorial Stack */}
        <div className="lg:col-span-7 space-y-8 animate-fade-in-up">
          {/* Section Label */}
          <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span>01 / COMMUNITY ETHOS</span>
          </div>

          {/* Display Heading with Weight Contrast */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-[#F5F5F3] leading-[1.08]">
            Discover people who think{" "}
            <span className="font-semibold italic text-white underline decoration-white/20 underline-offset-8">
              differently.
            </span>
          </h1>

          {/* Supporting Editorial Paragraph */}
          <p className="text-base sm:text-lg text-[#8A8A8A] leading-relaxed max-w-xl font-normal">
            A quiet, intentional platform built around what you&apos;re currently building, learning, discussing, or exploring — without vanity metrics, noise, or algorithms.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            {isAuthenticated ? (
              <>
                <Link href="/feed">
                  <Button
                    size="lg"
                    className="gap-3 px-8 bg-[#F5F5F3] text-[#0A0A0A] hover:bg-white font-medium text-xs rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Personal Feed</span>
                  </Button>
                </Link>
                <Link href="/discover">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-3 px-8 border-white/10 bg-white/[0.02] text-[#F5F5F3] hover:bg-white/[0.06] hover:border-white/20 text-xs rounded-full transition-all duration-300"
                  >
                    <Users className="h-4 w-4" />
                    <span>Discover People</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="gap-3 px-8 bg-[#F5F5F3] text-[#0A0A0A] hover:bg-white font-medium text-xs rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    <span>Join Sangati</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 border-white/10 bg-white/[0.02] text-[#F5F5F3] hover:bg-white/[0.06] hover:border-white/20 text-xs rounded-full transition-all duration-300"
                  >
                    <span>Sign in</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Liquid Metal 3D Canvas */}
        <div className="lg:col-span-5 relative flex items-center justify-center animate-fade-in-up delay-300">
          <LiquidMetalCanvas className="rounded-3xl border border-white/[0.06] bg-sangati-glass" />
        </div>
      </section>

      {/* Geometric Horizontal Line */}
      <div className="geometric-line-h w-full" />

      {/* SECTION 2: Architecture Pipeline */}
      <section className="space-y-8 animate-fade-in-up delay-200">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <span className="text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            02 / PLATFORM ARCHITECTURE
          </span>
          <span className="text-[11px] font-mono text-[#8A8A8A]">4-STAGE PIPELINE</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Active Intent", desc: "Define what you're currently building, learning, or discussing." },
            { step: "02", title: "Discovery Engine", desc: "Find peers matched by genuine shared curiosities." },
            { step: "03", title: "Quiet Messaging", desc: "Calm 1-to-1 notes and WebRTC audio/video connections." },
            { step: "04", title: "Authentic Network", desc: "Build meaningful connections without popularity metrics." },
          ].map((item, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-sangati-card border border-white/[0.08] hover:border-white/20 transition-all duration-300 space-y-3 group"
            >
              <span className="text-[11px] font-mono text-[#8A8A8A] block tracking-widest">{item.step}</span>
              <h3 className="text-sm font-medium text-[#F5F5F3] group-hover:text-white transition-colors">{item.title}</h3>
              <p className="text-xs text-[#8A8A8A] leading-relaxed font-normal">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Geometric Horizontal Line */}
      <div className="geometric-line-h w-full" />

      {/* SECTION 3: Active Intent Matrices */}
      <section className="space-y-8 animate-fade-in-up delay-300">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <span className="text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            03 / INTENT MATRICES
          </span>
          {isAuthenticated && (
            <Link
              href="/activity"
              className="text-xs text-[#F5F5F3] hover:text-white transition-colors flex items-center gap-1 font-mono tracking-wider"
            >
              Configure intent →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-8 rounded-2xl bg-sangati-card border border-white/[0.08] hover:border-white/25 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F5F3] flex items-center justify-center">
                  <Hammer className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-[#8A8A8A] border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  INTENT // 01
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-base text-[#F5F5F3] group-hover:text-white transition-colors">
                  Build
                </h3>
                <p className="text-xs text-[#8A8A8A] leading-relaxed">
                  Projects, software, creative work, & open-source tools currently in active development.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-8 rounded-2xl bg-sangati-card border border-white/[0.08] hover:border-white/25 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F5F3] flex items-center justify-center">
                  <Brain className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-[#8A8A8A] border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  INTENT // 02
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-base text-[#F5F5F3] group-hover:text-white transition-colors">
                  Learn
                </h3>
                <p className="text-xs text-[#8A8A8A] leading-relaxed">
                  Research papers, domains, languages & complex concepts being actively mastered.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-8 rounded-2xl bg-sangati-card border border-white/[0.08] hover:border-white/25 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F5F3] flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-[#8A8A8A] border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  INTENT // 03
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-base text-[#F5F5F3] group-hover:text-white transition-colors">
                  Conversation
                </h3>
                <p className="text-xs text-[#8A8A8A] leading-relaxed">
                  Open exchange of ideas, philosophical queries, and technical discussions.
                </p>
              </div>
            </div>
          </Link>

          <Link href={isAuthenticated ? "/activity" : "/signup"} className="block group">
            <div className="p-8 rounded-2xl bg-sangati-card border border-white/[0.08] hover:border-white/25 transition-all duration-300 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 text-[#F5F5F3] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-mono text-[#8A8A8A] border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  INTENT // 04
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-medium text-base text-[#F5F5F3] group-hover:text-white transition-colors">
                  Explore
                </h3>
                <p className="text-xs text-[#8A8A8A] leading-relaxed">
                  Discover community work and serendipitous findings without a fixed agenda.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* SECTION 4: Transparent Feed Principles */}
      <section className="p-8 sm:p-12 rounded-3xl bg-sangati-card border border-white/[0.08] space-y-8 animate-fade-in-up delay-400">
        <div className="space-y-2">
          <span className="text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            04 / TRANSPARENT RANKING GUARANTEE
          </span>
          <h2 className="text-2xl sm:text-3xl font-light text-[#F5F5F3] tracking-tight">
            How your feed is calculated
          </h2>
          <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-xl leading-relaxed font-normal">
            No black-box algorithms. Every post in your feed is ranked deterministically based on verified parameters:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {[
            { label: "Active Intent Alignment (+3.0)", text: "Matches what you're currently building or learning." },
            { label: "Mutual Connection (+3.0)", text: "Prioritizes posts from accepted mutual connections." },
            { label: "Topic Interest Overlap (+2.0)", text: "Calculated based on shared interest tags." },
            { label: "Smooth Recency Decay (+2.0)", text: "12-hour exponential half-life decay." },
          ].map((rule, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.015] border border-white/[0.05]">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#F5F5F3]">{rule.label}</p>
                <p className="text-xs text-[#8A8A8A] leading-relaxed">{rule.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
