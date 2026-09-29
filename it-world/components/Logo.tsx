"use client";

import { useId } from "react";

type LogoProps = {
  size?: number;
  showText?: boolean;
  className?: string;
};

export default function Logo({ size = 96, showText = true, className = "" }: LogoProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="drop-shadow-[0_10px_25px_rgba(212,160,23,0.35)]"
        role="img"
        aria-label="IT-World Logo"
      >
        <defs>
          <radialGradient id={id("sphereBase")} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#2a2a30" />
            <stop offset="45%" stopColor="#131316" />
            <stop offset="100%" stopColor="#020202" />
          </radialGradient>
          <linearGradient id={id("ringGoldBack")} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8a670c" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#d4a017" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8a670c" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={id("ringGoldFront")} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8a670c" />
            <stop offset="45%" stopColor="#f9edc9" />
            <stop offset="55%" stopColor="#f3da93" />
            <stop offset="100%" stopColor="#8a670c" />
          </linearGradient>
          <radialGradient id={id("rimLight")} cx="80%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#f3da93" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#d4a017" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#d4a017" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("specular")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <pattern id={id("dotGrid")} width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="1.1" cy="1.1" r="1.1" fill="#e6b433" />
          </pattern>
          <radialGradient id={id("terminator")} cx="30%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.92" />
          </radialGradient>
          <clipPath id={id("sphereClip")}>
            <circle cx="100" cy="95" r="68" />
          </clipPath>
          <filter id={id("softGlow")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        <g transform="rotate(-16 100 95)">
          <path
            d="M -8 95 A 108 30 0 0 0 208 95"
            fill="none"
            stroke={`url(#${id("ringGoldBack")})`}
            strokeWidth="3.5"
          />
        </g>

        <circle cx="100" cy="95" r="68" fill={`url(#${id("sphereBase")})`} />
        <g clipPath={`url(#${id("sphereClip")})`}>
          <rect x="32" y="27" width="136" height="136" fill={`url(#${id("dotGrid")})`} opacity="0.9" />
          <rect x="32" y="27" width="136" height="136" fill={`url(#${id("terminator")})`} />
          <circle cx="100" cy="95" r="68" fill={`url(#${id("rimLight")})`} opacity="0.6" />
        </g>
        <circle cx="100" cy="95" r="68" fill="none" stroke="#3a3a42" strokeWidth="1" opacity="0.6" />
        <ellipse
          cx="72"
          cy="62"
          rx="30"
          ry="16"
          fill={`url(#${id("specular")})`}
          opacity="0.5"
          filter={`url(#${id("softGlow")})`}
        />

        <g transform="rotate(-16 100 95)">
          <path
            d="M -8 95 A 108 30 0 0 1 208 95"
            fill="none"
            stroke={`url(#${id("ringGoldFront")})`}
            strokeWidth="4"
            filter={`url(#${id("softGlow")})`}
          />
          <path
            d="M -8 95 A 108 30 0 0 1 208 95"
            fill="none"
            stroke={`url(#${id("ringGoldFront")})`}
            strokeWidth="2"
          />
        </g>
      </svg>

      {showText && (
        <div className="mt-2 text-center select-none">
          <div
            className="font-extrabold tracking-wide text-gold-gradient"
            style={{ fontSize: size * 0.24, letterSpacing: "0.04em" }}
          >
            IT&nbsp;-&nbsp;WORLD
          </div>
          <div
            className="text-gold-300/80 tracking-[0.35em] font-medium"
            style={{ fontSize: size * 0.075 }}
          >
            IT SOLUTIONS
          </div>
        </div>
      )}
    </div>
  );
}
