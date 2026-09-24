import React from "react";

export interface CustomIconProps {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  background?: string;
  opacity?: number;
  rotation?: number;
  shadow?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  padding?: number;
  className?: string;
}

// Helper to create transforms & viewBox
function getSvgProps(
  baseSize: number,
  size?: number | string,
  color = "none",
  strokeWidth = 2,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
) {
  const transforms = [];
  if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
  if (flipHorizontal) transforms.push("scaleX(-1)");
  if (flipVertical) transforms.push("scaleY(-1)");

  const viewBoxSize = baseSize + padding * 2;
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return {
    viewBox,
    width: size || baseSize,
    height: size || baseSize,
    style: {
      opacity,
      transform: transforms.join(" ") || undefined,
      filter: shadow > 0 ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))` : undefined,
      backgroundColor: background !== "transparent" ? background : undefined,
    },
  };
}

// 1. LOVE — RedHeartIcon
export const RedHeartIcon: React.FC<CustomIconProps> = ({
  size = 24,
  color = "none",
  strokeWidth = 0,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
  className,
}) => {
  const svgProps = getSvgProps(
    64,
    size,
    color,
    strokeWidth,
    background,
    opacity,
    rotation,
    shadow,
    flipHorizontal,
    flipVertical,
    padding
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...svgProps}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        fill="#d13852"
        d="M63.841 18.646c-.246-3.85-1.072-6.977-3.752-10.198c-5.369-6.439-17.71-7.511-23.23-1.312c-.963.912-1.872 2.01-2.785 3.322l-2.066 2.969l-2.067-2.969c-.916-1.312-1.827-2.411-2.79-3.322C21.627.937 9.287 2.008 3.921 8.448C1.237 11.669.412 14.796.166 18.646C-.184 30.092 8.122 39.257 9.147 40.6c5.637 6.613 11.786 12.866 18.03 18.627c1.13.989 2.106 1.812 3.082 2.628c.587.479 1.166.964 1.749 1.44c.582-.477 1.159-.961 1.743-1.44c.98-.816 1.956-1.639 3.082-2.628c6.247-5.761 12.397-12.01 18.04-18.627c1.025-1.343 9.332-10.508 8.979-21.954"
      />
      <path
        fill="#f1a5b1"
        d="M60.39 16.604a10.1 10.1 0 0 0-.457-2.909a9 9 0 0 0-1.169-2.42c-2.973-4.369-9.451-5.943-14.863-4.837c-2.111.508-4.225 1.302-5.197 3.318c-.331.865.365 1.281 1.44 1.228c3.894-.435 8.202-.043 11.645 1.63c.858.42 1.661.918 2.395 1.503c2.47 1.913 3.537 4.887 4.02 7.837c1.201-.242 1.854-1.683 2.01-2.965a10.5 10.5 0 0 0 .177-2.385"
      />
    </svg>
  );
};

// 2. INTERESTING — FireIcon
export const FireIcon: React.FC<CustomIconProps> = ({
  size = 24,
  color = "none",
  strokeWidth = 0,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
  className,
}) => {
  const svgProps = getSvgProps(
    24,
    size,
    color,
    strokeWidth,
    background,
    opacity,
    rotation,
    shadow,
    flipHorizontal,
    flipVertical,
    padding
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...svgProps}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="fireGradCustom" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
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
        fill="url(#fireGradCustom)"
      />
    </svg>
  );
};

// 3. CURIOUS — EyesIcon
export const EyesIcon: React.FC<CustomIconProps> = ({
  size = 24,
  color = "none",
  strokeWidth = 0,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
  className,
}) => {
  const svgProps = getSvgProps(
    24,
    size,
    color,
    strokeWidth,
    background,
    opacity,
    rotation,
    shadow,
    flipHorizontal,
    flipVertical,
    padding
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...svgProps}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="6.5" cy="12" rx="4.5" ry="6" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="0.5" />
      <circle cx="6" cy="11.5" r="2.2" fill="#1F2937" />
      <circle cx="5.3" cy="10.8" r="0.8" fill="#FFFFFF" />
      <ellipse cx="17.5" cy="12" rx="4.5" ry="6" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="0.5" />
      <circle cx="17" cy="11.5" r="2.2" fill="#1F2937" />
      <circle cx="16.3" cy="10.8" r="0.8" fill="#FFFFFF" />
    </svg>
  );
};

// 4. SUPPORT — RaisingHandsLightSkinToneIcon
export const RaisingHandsLightSkinToneIcon: React.FC<CustomIconProps> = ({
  size = 24,
  color = "none",
  strokeWidth = 0,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
  className,
}) => {
  const svgProps = getSvgProps(
    24,
    size,
    color,
    strokeWidth,
    background,
    opacity,
    rotation,
    shadow,
    flipHorizontal,
    flipVertical,
    padding
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...svgProps}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M6 3C5.17 3 4.5 3.67 4.5 4.5V12.5C4.5 13.88 5.62 15 7 15C8.38 15 9.5 13.88 9.5 12.5V7C9.5 6.45 9.05 6 8.5 6C7.95 6 7.5 6.45 7.5 7V11"
        fill="#F6D0B1"
        stroke="#E8B896"
        strokeWidth="0.5"
      />
      <path d="M4 14L2 21H9L8 14" fill="#F6D0B1" />
      <path
        d="M18 3C18.83 3 19.5 3.67 19.5 4.5V12.5C19.5 13.88 18.38 15 17 15C15.62 15 14.5 13.88 14.5 12.5V7C14.5 6.45 14.95 6 15.5 6C16.05 6 16.5 6.45 16.5 7V11"
        fill="#F6D0B1"
        stroke="#E8B896"
        strokeWidth="0.5"
      />
      <path d="M20 14L22 21H15L16 14" fill="#F6D0B1" />
      <path d="M12 2V5M9 4L10.5 6.5M15 4L13.5 6.5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};

// 5. CONNECT — HandshakeMediumLightSkinToneIcon
export const HandshakeMediumLightSkinToneIcon: React.FC<CustomIconProps> = ({
  size = 24,
  color = "none",
  strokeWidth = 0,
  background = "transparent",
  opacity = 1,
  rotation = 0,
  shadow = 0,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0,
  className,
}) => {
  const svgProps = getSvgProps(
    24,
    size,
    color,
    strokeWidth,
    background,
    opacity,
    rotation,
    shadow,
    flipHorizontal,
    flipVertical,
    padding
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...svgProps}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 13L6 9L11 12L7.5 15.5L2 13Z" fill="#374151" />
      <path d="M6 9L11 12L14.5 9.5C13.5 8.5 12 8 10 8.5L6 9Z" fill="#D2A078" stroke="#C48D65" strokeWidth="0.5" />
      <path d="M22 13L18 9L13 12L16.5 15.5L22 13Z" fill="#1F2937" />
      <path d="M18 9L13 12L9.5 9.5C10.5 8.5 12 8 14 8.5L18 9Z" fill="#C48D65" stroke="#B37C55" strokeWidth="0.5" />
      <path d="M9.5 11.5L12 14L14.5 11.5L12 9L9.5 11.5Z" fill="#D2A078" />
      <path d="M10.5 13.5L12.5 15.5L14.5 13.5" stroke="#B37C55" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};

export default RedHeartIcon;
