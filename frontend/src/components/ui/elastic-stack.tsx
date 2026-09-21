"use client";

import React, { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ElasticStackItem {
  id: string;
  name: string;
  handle?: string;
  avatar_url?: string | null;
  headline?: string | null;
  bio?: string | null;
}

export interface ElasticStackProps {
  items: ElasticStackItem[];
  onSwipe?: (item: ElasticStackItem) => void;
  className?: string;
}

export function ElasticStack({ items, onSwipe, className }: ElasticStackProps) {
  const [stack, setStack] = useState<ElasticStackItem[]>(items);

  // Sync if props update
  React.useEffect(() => {
    setStack(items);
  }, [items]);

  const handleSwipe = (id: string) => {
    const swipedItem = stack.find((item) => item.id === id);
    if (swipedItem && onSwipe) {
      onSwipe(swipedItem);
    }
    setStack((prev) => prev.filter((item) => item.id !== id));
  };

  if (!stack || stack.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 rounded-2xl border border-white/10 bg-black/40 text-center backdrop-blur-md", className)}>
        <p className="text-zinc-400 text-sm font-medium">No profile cards in stack</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full max-w-sm h-80 flex items-center justify-center mx-auto", className)}>
      <AnimatePresence>
        {stack.map((item, index) => {
          const isTop = index === 0;
          const displayIndex = index;

          if (displayIndex > 3) return null;

          return (
            <ElasticCard
              key={item.id}
              item={item}
              index={displayIndex}
              isTop={isTop}
              onSwipe={() => handleSwipe(item.id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

interface ElasticCardProps {
  item: ElasticStackItem;
  index: number;
  isTop: boolean;
  onSwipe: () => void;
}

function ElasticCard({ item, index, isTop, onSwipe }: ElasticCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe();
    }
  };

  const yOffset = index * 12;
  const scale = 1 - index * 0.05;

  const initials = (item.name || "U")[0].toUpperCase();

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        zIndex: 50 - index,
      }}
      animate={{
        y: yOffset,
        scale: scale,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: "grabbing" }}
      className={cn(
        "absolute top-0 left-0 right-0 w-full h-72 rounded-2xl p-6 shadow-2xl flex flex-col justify-between select-none cursor-grab border backdrop-blur-xl transition-colors duration-300",
        isTop
          ? "bg-zinc-900/90 border-zinc-700/80 hover:border-zinc-500/80"
          : "bg-zinc-950/80 border-zinc-800/60"
      )}
    >
      <div className="flex items-center space-x-4">
        <Avatar className="h-12 w-12 border border-white/10 shrink-0">
          <AvatarImage src={item.avatar_url || undefined} alt={item.name} />
          <AvatarFallback className="bg-zinc-800 text-zinc-200 text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="overflow-hidden">
          <h3 className="font-semibold text-zinc-100 text-lg leading-tight truncate">
            {item.name}
          </h3>
          {item.handle && (
            <p className="text-xs text-zinc-400 truncate">@{item.handle}</p>
          )}
        </div>
      </div>

      <div className="my-3 flex-1 overflow-hidden">
        {item.headline && (
          <p className="text-sm font-medium text-emerald-400 mb-1 line-clamp-1">
            {item.headline}
          </p>
        )}
        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3">
          {item.bio || "Member of the Sangati community. Connected to build, learn, and collaborate."}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-zinc-400">
        <span>{isTop ? "Swipe left/right to dismiss" : `Stack item #${index + 1}`}</span>
        <span className="font-mono text-zinc-400 uppercase tracking-widest text-[10px]">
          Sangati
        </span>
      </div>
    </motion.div>
  );
}

export default ElasticStack;
