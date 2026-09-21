"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Code, BookOpen, MessageSquare, Compass, ArrowUpRight } from "lucide-react";

export interface StaggeredGridItem {
  id: string;
  title: string;
  category: "BUILD" | "LEARN" | "CONVERSATION" | "EXPLORE" | string;
  description: string;
  linkHref?: string;
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
    linkHref: "/feed",
    icon: <Code className="w-5 h-5 text-[#D4AF37]" />,
  },
  {
    id: "learn",
    title: "Collaborative Knowledge Sharing",
    category: "LEARN",
    description: "Exchange insights, dissect tech stacks, and learn from peer experiences in high-signal discussions.",
    linkHref: "/feed",
    icon: <BookOpen className="w-5 h-5 text-[#D4AF37]" />,
  },
  {
    id: "conversation",
    title: "Direct & Realtime Conversations",
    category: "CONVERSATION",
    description: "Seamless 1:1 and group messaging to collaborate on projects, discuss ideas, and expand your professional network.",
    linkHref: "/messages",
    icon: <MessageSquare className="w-5 h-5 text-[#D4AF37]" />,
  },
  {
    id: "explore",
    title: "Discover Tech Talent & Mentors",
    category: "EXPLORE",
    description: "Find builders by skills, activity types, and interest areas across the Sangati visual discovery grid.",
    linkHref: "/discover",
    icon: <Compass className="w-5 h-5 text-[#D4AF37]" />,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function StaggeredGrid({ items = DEFAULT_PILLARS, className }: StaggeredGridProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className={cn("grid grid-cols-1 md:grid-cols-2 gap-5 w-full", className)}
    >
      {items.map((item) => {
        const ContentCard = (
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-sangati-glass p-6 hover:border-white/20 transition-all duration-300 flex flex-col justify-between min-h-[190px]"
          >
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 group-hover:border-[#D4AF37]/30 transition-colors">
                  {item.icon}
                </div>
                <span className="text-xs font-mono tracking-widest uppercase text-zinc-400 group-hover:text-[#D4AF37] transition-colors">
                  {item.category}
                </span>
              </div>
              {item.linkHref && (
                <ArrowUpRight className="w-4 h-4 text-zinc-500 opacity-60 group-hover:opacity-100 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
            </div>

            {/* Body */}
            <div className="relative z-10 my-auto space-y-1.5">
              <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed font-normal">
                {item.description}
              </p>
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
