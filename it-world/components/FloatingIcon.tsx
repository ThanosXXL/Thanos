"use client";

import { useId } from "react";

type FloatingIconProps = {
  children: React.ReactNode;
  className?: string;
  size?: number;
};

export default function FloatingIcon({ children, className = "", size = 64 }: FloatingIconProps) {
  const gradientId = useId();
  return (
    <div
      className={`absolute rounded-2xl glass-panel shadow-glossy flex items-center justify-center bg-ink-800/80 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9edc9" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
        </defs>
        {children}
      </svg>
    </div>
  );
}

export function IconBadge({ children, size = 48 }: { children: React.ReactNode; size?: number }) {
  const gradientId = useId();
  return (
    <div
      className="flex items-center justify-center rounded-xl glass-panel bg-ink-800/80 shadow-glossy"
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9edc9" />
            <stop offset="100%" stopColor="#d4a017" />
          </linearGradient>
        </defs>
        {children}
      </svg>
    </div>
  );
}
