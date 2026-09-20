"use client";

import React, { useEffect, useState } from "react";

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trailing, setTrailing] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable on desktop pointers
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let animFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      setIsVisible(true);
      setPosition({ x: e.clientX, y: e.clientY });

      // Check if hovering interactive elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.closest("button") ||
          target.closest("a") ||
          target.getAttribute("role") === "button" ||
          target.classList.contains("cursor-pointer"))
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Smooth trailing animation loop
    let currentTrailing = { x: -100, y: -100 };
    const loop = () => {
      currentTrailing.x += (position.x - currentTrailing.x) * 0.2;
      currentTrailing.y += (position.y - currentTrailing.y) * 0.2;
      setTrailing({ x: currentTrailing.x, y: currentTrailing.y });
      animFrameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animFrameId);
    };
  }, [position.x, position.y]);

  if (!isVisible) return null;

  return (
    <>
      {/* Core Dot Cursor */}
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ease-out shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${
            isHovered ? 2.5 : 1
          })`,
        }}
      />

      {/* Outer Trailing Halo */}
      <div
        className={`fixed top-0 left-0 w-8 h-8 rounded-full border border-white/20 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out ${
          isHovered
            ? "scale-150 border-white/50 bg-white/[0.03] backdrop-blur-[1px]"
            : "scale-100"
        }`}
        style={{
          transform: `translate3d(${trailing.x}px, ${trailing.y}px, 0) scale(${
            isHovered ? 1.4 : 1
          })`,
        }}
      />
    </>
  );
}
