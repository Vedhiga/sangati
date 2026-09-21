"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextAnimationProps {
  children: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export function TextAnimation({
  children,
  className,
  delay = 0,
  as = "h2",
}: TextAnimationProps) {
  const Component = motion[as] as any;

  return (
    <Component
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn("tracking-tight font-medium text-[#F5F5F3]", className)}
    >
      {children}
    </Component>
  );
}

export default TextAnimation;
