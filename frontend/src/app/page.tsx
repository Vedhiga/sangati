"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Layers,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LiquidMetalCanvas } from "@/components/ui/liquid-metal-canvas";
import { FlipFadeText } from "@/components/ui/flip-fade-text";
import { FlipText } from "@/components/ui/flip-text";
import { TextAnimation } from "@/components/ui/text-animation";
import { StaggeredGrid } from "@/components/ui/staggered-grid";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  return (
    <div className="w-full space-y-24 py-4 relative z-10">
      {/* SECTION 1: Asymmetric Motion-First Editorial Hero */}
      <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-4 pb-8">
        {/* Left Column: Editorial Display Typography Stack */}
        <div className="lg:col-span-7 space-y-8 animate-fade-in-up">
          {/* Section Label */}
          <div className="flex items-center gap-3 text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>01 / SANGATI DIGITAL ETHOS</span>
          </div>

          {/* Display Heading with Word Cycling */}
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-[#F5F5F3] leading-[1.06]">
              Discover people who{" "}
              <FlipText className="font-serif italic text-white font-normal underline decoration-white/20 underline-offset-[8px]">
                differently
              </FlipText>
              .
            </h1>
            <div className="pt-2">
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">
                Active Intent Mode:
              </p>
              <FlipFadeText
                words={["BUILD", "LEARN", "CONVERSATION", "EXPLORE"]}
                className="justify-start min-h-[60px]"
                textClassName="text-3xl sm:text-5xl font-extrabold text-emerald-400 tracking-wider"
              />
            </div>
          </div>

          {/* Supporting Editorial Paragraph */}
          <p className="text-base sm:text-lg text-[#8A8A8A] leading-relaxed max-w-xl font-normal">
            A quiet, intentional community built around what you&apos;re currently building, learning, discussing, or exploring — without vanity metrics or noise.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isAuthenticated ? (
              <>
                <Link href="/feed">
                  <LiquidMetalButton size="md" icon={<Layers className="w-4 h-4" />}>
                    Explore Personal Feed
                  </LiquidMetalButton>
                </Link>
                <Link href="/discover">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2.5 px-6 border-white/10 bg-white/[0.02] text-[#F5F5F3] hover:bg-white/[0.06] hover:border-white/20 text-xs rounded-full transition-all duration-300 h-11"
                  >
                    <Users className="h-4 w-4" />
                    <span>Discover People</span>
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup">
                  <LiquidMetalButton size="lg" icon={<Sparkles className="w-4 h-4 text-emerald-400" />}>
                    Get Started with Sangati
                  </LiquidMetalButton>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 border-white/10 bg-white/[0.02] text-[#F5F5F3] hover:bg-white/[0.06] hover:border-white/20 text-xs rounded-full transition-all duration-300 h-12"
                  >
                    <span>Sign in</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Floating 3D Liquid Metal Canvas */}
        <div className="lg:col-span-5 relative flex items-center justify-center min-h-[340px]">
          <LiquidMetalCanvas className="w-full h-full min-h-[340px]" />
        </div>
      </section>

      {/* Geometric Horizontal Line */}
      <div className="geometric-line-h w-full" />

      {/* SECTION 2: Architecture Pipeline */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <TextAnimation as="span" className="text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            02 / PLATFORM ARCHITECTURE
          </TextAnimation>
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
              className="p-6 rounded-2xl bg-sangati-glass border border-white/[0.08] hover:border-white/20 transition-all duration-300 space-y-3 group"
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

      {/* SECTION 3: Active Intent Staggered Bento Grid */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <TextAnimation as="h2" className="text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            03 / CORE PILLARS & INTENTS
          </TextAnimation>
          {isAuthenticated && (
            <Link
              href="/activity"
              className="text-xs text-[#F5F5F3] hover:text-white transition-colors flex items-center gap-1 font-mono tracking-wider"
            >
              Configure intent →
            </Link>
          )}
        </div>

        <StaggeredGrid />
      </section>

      {/* SECTION 4: Transparent Feed Principles */}
      <section className="p-8 sm:p-12 rounded-3xl bg-sangati-glass border border-white/[0.08] space-y-8">
        <div className="space-y-2">
          <span className="text-[11px] font-mono tracking-[0.25em] text-[#8A8A8A] uppercase">
            04 / TRANSPARENT RANKING GUARANTEE
          </span>
          <TextAnimation as="h2" className="text-2xl sm:text-3xl font-light text-[#F5F5F3] tracking-tight">
            How your feed is calculated
          </TextAnimation>
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
