"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Code, BookOpen, MessageSquare, Compass, ArrowUpRight, Sparkles } from "lucide-react";

export interface StaggeredGridItem {
  id: string;
  title: string;
  category: "BUILD" | "LEARN" | "CONVERSATION" | "EXPLORE" | string;
  description: string;
  badge?: string;
  linkHref?: string;
  colSpan?: string;
  gradientOverlay?: string;
  icon?: React.ReactNode;
}

export interface StaggeredGridProps {
  items?: StaggeredGridItem[];
  className?: string;
}

const DEFAULT_PILLARS: StaggeredGridItem[] = [
  {
    id: "build",
    title: "Build in Public & Showcase Projects",
    category: "BUILD",
    description: "Share live updates, technical progress, and code milestones with a community of fellow creators and engineers.",
    badge: "Pillar 01",
    linkHref: "/feed",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
    gradientOverlay: "from-blue-500/10 via-indigo-500/5 to-transparent",
    icon: <Code className="w-5 h-5 text-blue-400" />,
  },
  {
    id: "learn",
    title: "Collaborative Knowledge Sharing",
    category: "LEARN",
    description: "Exchange insights, dissect tech stacks, and learn from peer experiences in high-signal discussions.",
    badge: "Pillar 02",
    linkHref: "/feed",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
    gradientOverlay: "from-amber-500/10 via-orange-500/5 to-transparent",
    icon: <BookOpen className="w-5 h-5 text-amber-400" />,
  },
  {
    id: "conversation",
    title: "Direct & Realtime Conversations",
    category: "CONVERSATION",
    description: "Seamless 1:1 and group messaging to collaborate on projects, discuss ideas, and expand your professional network.",
    badge: "Pillar 03",
    linkHref: "/messages",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
    gradientOverlay: "from-emerald-500/10 via-teal-500/5 to-transparent",
    icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: "explore",
    title: "Discover Tech Talent & Mentors",
    category: "EXPLORE",
    description: "Find builders by skills, activity types, and interest areas across the Sangati visual discovery grid.",
    badge: "Pillar 04",
    linkHref: "/discover",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
    gradientOverlay: "from-purple-500/10 via-violet-500/5 to-transparent",
    icon: <Compass className="w-5 h-5 text-purple-400" />,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

export function StaggeredGrid({ items = DEFAULT_PILLARS, className }: StaggeredGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={cn("grid grid-cols-1 md:grid-cols-3 gap-5 w-full", className)}
    >
      {items.map((item) => {
        const ContentCard = (
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-md hover:border-zinc-500/50 hover:bg-zinc-900/80 transition-all duration-300 flex flex-col justify-between min-h-[220px]",
              item.colSpan || "col-span-1"
            )}
          >
            {/* Background Subtle Gradient */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500",
                item.gradientOverlay || "from-white/5 to-transparent"
              )}
            />

            {/* Header / Badge */}
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-zinc-800/80 border border-white/10 group-hover:border-zinc-600 transition-colors">
                  {item.icon || <Sparkles className="w-4 h-4 text-zinc-300" />}
                </div>
                <span className="text-xs font-mono tracking-wider uppercase text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {item.category}
                </span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {item.badge}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="relative z-10 my-auto">
              <h3 className="text-xl font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight mb-2 flex items-center justify-between">
                <span>{item.title}</span>
                {item.linkHref && (
                  <ArrowUpRight className="w-5 h-5 text-zinc-500 opacity-0 group-hover:opacity-100 group-hover:text-zinc-200 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                )}
              </h3>
              <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Bottom Glow line */}
            <div className="relative z-10 mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
              <span className="group-hover:text-zinc-300 transition-colors">Explore Experience &rarr;</span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 group-hover:bg-emerald-400 transition-colors" />
            </div>
          </motion.div>
        );

        if (item.linkHref) {
          return (
            <Link key={item.id} href={item.linkHref} className="block">
              {ContentCard}
            </Link>
          );
        }

        return <React.Fragment key={item.id}>{ContentCard}</React.Fragment>;
      })}
    </motion.div>
  );
}

export default StaggeredGrid;
