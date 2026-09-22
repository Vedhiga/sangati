"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface ElasticStackItem {
  id: string;
  image?: string;
  name?: string;
}

export interface ElasticStackProps extends React.HTMLAttributes<HTMLDivElement> {
  items: ElasticStackItem[];
  itemSize?: number;
  overlap?: number;
  pushForce?: number;
  onSwipe?: (item: ElasticStackItem) => void;
}

export function ElasticStack({
  items,
  itemSize = 56,
  overlap = 24,
  pushForce = 15,
  onSwipe,
  className,
  ...props
}: ElasticStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = items.length;

  const springEasing =
    "linear(0, 0.79 14.4%, 1.026 22.4%, 1.164 31.2%, 1.207 38.2%, 1.208 46.2%, 1.033 80%, 1)";

  return (
    <div
      className={cn(
        "flex items-center justify-center cursor-pointer py-4",
        className
      )}
      onMouseLeave={() => setHoveredIndex(null)}
      {...props}
    >
      {items.map((item, i) => {
        let translateX = 0;
        let scale = 1;
        let zIndex = i;
        const isHovered = hoveredIndex === i;

        if (hoveredIndex !== null) {
          if (i > hoveredIndex) {
            translateX = Math.min(
              pushForce * (total - i - 1),
              overlap
            );
          } else if (i < hoveredIndex) {
            translateX = -Math.min(pushForce * i, overlap);
          } else {
            scale = 1.25;
            zIndex = 100;
          }
        }

        return (
          <div
            key={item.id}
            onMouseEnter={() => setHoveredIndex(i)}
            className={cn(
              "relative flex items-center justify-center rounded-full isolate transition-all duration-700 bg-neutral-900",
              "border-2 border-neutral-950",
              isHovered ? "shadow-xl ring-2 ring-[#D4AF37]" : "shadow-sm"
            )}
            style={{
              width: itemSize,
              height: itemSize,
              marginLeft: i === 0 ? 0 : -overlap,
              transform: `translateX(${translateX}px) scale(${scale})`,
              transitionTimingFunction: springEasing,
              zIndex,
            }}
            title={item.name}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.name || `Avatar ${i}`}
                className="w-full h-full object-cover rounded-full pointer-events-none"
              />
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center font-semibold text-neutral-200 bg-neutral-800 text-sm">
                {item.name ? item.name.charAt(0).toUpperCase() : i + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ElasticStack;
