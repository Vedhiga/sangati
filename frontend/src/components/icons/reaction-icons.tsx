import React from "react";

export interface ReactionIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

// 1. RedHeartIcon (LOVE)
export function RedHeartIcon({ className = "w-5 h-5", size, ...props }: ReactionIconProps) {
  const width = size || undefined;
  const height = size || undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#EF4444"
      />
    </svg>
  );
}

// 2. FireIcon (INTERESTING)
export function FireIcon({ className = "w-5 h-5", size, ...props }: ReactionIconProps) {
  const width = size || undefined;
  const height = size || undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="fireGrad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C10.5 4.5 9 7 9 9.5C9 11.5 10.5 13 12 13C13.5 13 15 11.5 15 9.5C15 7 13.5 4.5 12 2Z"
        fill="#FBBF24"
      />
      <path
        d="M12 2C7.5 7 6 11 6 14.5C6 18.09 8.91 21 12.5 21C16.09 21 19 18.09 19 14.5C19 11 16.5 7 12 2ZM12.5 19C10.01 19 8 16.99 8 14.5C8 12.5 9.5 9.5 12 6.5C14.5 9.5 16 12.5 16 14.5C16 16.99 13.99 19 12.5 19Z"
        fill="url(#fireGrad)"
      />
    </svg>
  );
}

// 3. EyesIcon (CURIOUS)
export function EyesIcon({ className = "w-5 h-5", size, ...props }: ReactionIconProps) {
  const width = size || undefined;
  const height = size || undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left eye sclera */}
      <ellipse cx="6.5" cy="12" rx="4.5" ry="6" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="0.5" />
      {/* Left eye pupil */}
      <circle cx="6" cy="11.5" r="2.2" fill="#1F2937" />
      <circle cx="5.3" cy="10.8" r="0.8" fill="#FFFFFF" />

      {/* Right eye sclera */}
      <ellipse cx="17.5" cy="12" rx="4.5" ry="6" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="0.5" />
      {/* Right eye pupil */}
      <circle cx="17" cy="11.5" r="2.2" fill="#1F2937" />
      <circle cx="16.3" cy="10.8" r="0.8" fill="#FFFFFF" />
    </svg>
  );
}

// 4. RaisingHandsLightSkinToneIcon (SUPPORT)
export function RaisingHandsLightSkinToneIcon({ className = "w-5 h-5", size, ...props }: ReactionIconProps) {
  const width = size || undefined;
  const height = size || undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left hand raised */}
      <path
        d="M6 3C5.17 3 4.5 3.67 4.5 4.5V12.5C4.5 13.88 5.62 15 7 15C8.38 15 9.5 13.88 9.5 12.5V7C9.5 6.45 9.05 6 8.5 6C7.95 6 7.5 6.45 7.5 7V11"
        fill="#F6D0B1"
        stroke="#E8B896"
        strokeWidth="0.5"
      />
      <path
        d="M4 14L2 21H9L8 14"
        fill="#F6D0B1"
      />
      {/* Right hand raised */}
      <path
        d="M18 3C18.83 3 19.5 3.67 19.5 4.5V12.5C19.5 13.88 18.38 15 17 15C15.62 15 14.5 13.88 14.5 12.5V7C14.5 6.45 14.95 6 15.5 6C16.05 6 16.5 6.45 16.5 7V11"
        fill="#F6D0B1"
        stroke="#E8B896"
        strokeWidth="0.5"
      />
      <path
        d="M20 14L22 21H15L16 14"
        fill="#F6D0B1"
      />
      {/* Celebration rays */}
      <path d="M12 2V5M9 4L10.5 6.5M15 4L13.5 6.5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 5. HandshakeMediumLightSkinToneIcon (CONNECT)
export function HandshakeMediumLightSkinToneIcon({ className = "w-5 h-5", size, ...props }: ReactionIconProps) {
  const width = size || undefined;
  const height = size || undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left hand & sleeve */}
      <path d="M2 13L6 9L11 12L7.5 15.5L2 13Z" fill="#374151" />
      <path d="M6 9L11 12L14.5 9.5C13.5 8.5 12 8 10 8.5L6 9Z" fill="#D2A078" stroke="#C48D65" strokeWidth="0.5" />
      
      {/* Right hand & sleeve */}
      <path d="M22 13L18 9L13 12L16.5 15.5L22 13Z" fill="#1F2937" />
      <path d="M18 9L13 12L9.5 9.5C10.5 8.5 12 8 14 8.5L18 9Z" fill="#C48D65" stroke="#B37C55" strokeWidth="0.5" />

      {/* Interlocking fingers */}
      <path d="M9.5 11.5L12 14L14.5 11.5L12 9L9.5 11.5Z" fill="#D2A078" />
      <path d="M10.5 13.5L12.5 15.5L14.5 13.5" stroke="#B37C55" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
