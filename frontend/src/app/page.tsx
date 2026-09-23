"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Layers,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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
    <div className="w-full space-y-20 sm:space-y-24 py-4 relative z-10">
      {/* SECTION 1: Clean Editorial Hero */}
      <section className="relative max-w-4xl mx-auto pt-6 pb-4 space-y-8 animate-fade-in-up">
        {/* Section Label */}
        <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
          <span>SANGATI DIGITAL ETHOS</span>
        </div>

        {/* Display Heading & Word Cycling */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-[#F5F5F3] leading-[1.06]">
            Discover people who{" "}
            <FlipText className="font-serif italic text-white font-normal underline decoration-white/20 underline-offset-[8px]">
              differently
            </FlipText>
            .
          </h1>

          <div className="pt-2">
            <FlipFadeText
              words={["BUILD", "LEARN", "DISCUSSION", "EXPLORE"]}
              className="justify-start min-h-[60px]"
              textClassName="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#D4AF37] tracking-wider"
            />
          </div>
        </div>

        {/* Supporting Editorial Paragraph */}
        <p className="text-base sm:text-lg text-[#8A8A8A] leading-relaxed max-w-2xl font-normal">
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
                <LiquidMetalButton size="lg" icon={<Sparkles className="w-4 h-4 text-[#D4AF37]" />}>
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
      </section>

      {/* Geometric Horizontal Line */}
      <div className="geometric-line-h w-full" />

      {/* SECTION 2: Architecture Pipeline */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <TextAnimation as="span" className="text-[11px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase">
            PLATFORM ARCHITECTURE
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
              <span className="text-[11px] font-mono text-[#D4AF37] block tracking-widest font-semibold">{item.step}</span>
              <h3 className="text-sm font-medium text-[#F5F5F3] group-hover:text-white transition-colors">{item.title}</h3>
              <p className="text-xs text-[#8A8A8A] leading-relaxed font-normal">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Geometric Horizontal Line */}
      <div className="geometric-line-h w-full" />

      {/* SECTION 3: Active Intent 2x2 Bento Grid */}
      <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <TextAnimation as="h2" className="text-[11px] font-mono tracking-[0.2em] text-[#8A8A8A] uppercase">
            CORE PILLARS & INTENTS
          </TextAnimation>
          {isAuthenticated && (
            <Link
              href="/activity"
              className="text-xs text-[#F5F5F3] hover:text-[#D4AF37] transition-colors flex items-center gap-1 font-mono tracking-wider"
            >
              Configure intent →
            </Link>
          )}
        </div>

        <StaggeredGrid />
      </section>

      {/* Geometric Horizontal Line */}
      <div className="geometric-line-h w-full" />

      {/* SECTION 4: Feed Calculation Section */}
      <section className="space-y-8">
        <div className="space-y-2">
          <TextAnimation as="h2" className="text-2xl sm:text-3xl font-light text-[#F5F5F3] tracking-tight">
            How your feed is calculated
          </TextAnimation>
          <p className="text-xs sm:text-sm text-[#8A8A8A] max-w-xl leading-relaxed font-normal">
            No black-box algorithms. Every post in your feed is ranked deterministically based on verified parameters:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Active Intent Alignment (+3.0)", text: "Matches what you're currently building or learning." },
            { label: "Mutual Connection (+3.0)", text: "Prioritizes posts from accepted mutual connections." },
            { label: "Topic Interest Overlap (+2.0)", text: "Calculated based on shared interest tags." },
            { label: "Smooth Recency Decay (+2.0)", text: "12-hour exponential half-life decay." },
          ].map((rule, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-sangati-glass border border-white/[0.08] hover:border-white/20 transition-all duration-300 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-[#D4AF37] shrink-0" />
                <h3 className="text-sm font-semibold text-[#F5F5F3]">{rule.label}</h3>
              </div>
              <p className="text-xs text-[#8A8A8A] leading-relaxed pl-6 font-normal">{rule.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
