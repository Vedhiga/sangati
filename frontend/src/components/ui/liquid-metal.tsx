"use client";

import React, { memo, forwardRef } from "react";
import { LiquidMetal as LiquidMetalShader } from "@paper-design/shaders-react";
import { cn } from "@/lib/utils";

export interface LiquidMetalProps {
  colorBack?: string;
  colorTint?: string;
  speed?: number;
  repetition?: number;
  distortion?: number;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const LiquidMetal = memo(function LiquidMetal({
  colorBack = "#0a0a0a",
  colorTint = "#ffffff",
  speed = 0.5,
  repetition = 4,
  distortion = 0.15,
  scale = 1,
  className,
  style,
}: LiquidMetalProps) {
  return (
    <div
      className={cn("absolute inset-0 z-0 overflow-hidden pointer-events-none", className)}
      style={style}
    >
      <LiquidMetalShader
        colorBack={colorBack}
        colorTint={colorTint}
        speed={speed}
        repetition={repetition}
        distortion={distortion}
        softness={0.1}
        shiftRed={0.2}
        shiftBlue={-0.2}
        angle={45}
        shape="none"
        scale={scale}
        fit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
});

LiquidMetal.displayName = "LiquidMetal";

export interface LiquidMetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  borderWidth?: number;
  metalConfig?: Omit<LiquidMetalProps, "className" | "style">;
  size?: "sm" | "md" | "lg";
}

export const LiquidMetalButton = forwardRef<
  HTMLButtonElement,
  LiquidMetalButtonProps
>(
  (
    {
      children,
      icon,
      borderWidth = 3,
      metalConfig,
      size = "md",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isFullWidth = className?.includes("w-full");

    const sizeStyles = {
      sm: icon ? "py-1.5 pl-2.5 pr-4 gap-2 text-xs font-medium" : "py-1.5 px-4 text-xs font-medium",
      md: icon ? "py-2 pl-3 pr-5 gap-2.5 text-sm font-medium" : "py-2 px-5 text-sm font-medium",
      lg: icon ? "py-3 pl-3.5 pr-6 gap-3 text-base font-semibold" : "py-3 px-6 text-base font-semibold",
    };

    const iconSizes = {
      sm: "w-5 h-5 text-xs",
      md: "w-7 h-7 text-sm",
      lg: "w-9 h-9 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "relative group cursor-pointer border-none bg-transparent p-0 outline-none transition-transform duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "relative rounded-full overflow-hidden shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] transition-shadow duration-300 group-hover:shadow-[0_16px_40px_-6px_rgba(255,255,255,0.15)]",
            isFullWidth && "w-full"
          )}
          style={{ padding: borderWidth }}
        >
          {/* Liquid Metal Shader Border */}
          <LiquidMetal
            colorBack={metalConfig?.colorBack ?? "#222225"}
            colorTint={metalConfig?.colorTint ?? "#ffffff"}
            speed={metalConfig?.speed ?? 0.4}
            repetition={metalConfig?.repetition ?? 4}
            distortion={metalConfig?.distortion ?? 0.15}
            scale={metalConfig?.scale ?? 1}
            className="absolute inset-0 z-0 rounded-full"
          />

          {/* Inner Button Body */}
          <div
            className={cn(
              "relative z-10 rounded-full flex items-center justify-center",
              "bg-[#0D0D0E] text-[#F5F5F3]",
              "border border-white/10",
              "transition-all duration-300",
              "group-hover:bg-[#141416] group-hover:border-white/25",
              isFullWidth && "w-full",
              sizeStyles[size]
            )}
          >
            {icon && (
              <div
                className={cn(
                  "rounded-full flex items-center justify-center shrink-0",
                  "bg-white/[0.06] text-white",
                  "border border-white/10",
                  "transition-colors duration-200 group-hover:bg-white/[0.12]",
                  iconSizes[size]
                )}
              >
                {icon}
              </div>
            )}
            <span className="tracking-tight whitespace-nowrap drop-shadow-sm">
              {children}
            </span>
          </div>
        </div>
      </button>
    );
  }
);

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;
