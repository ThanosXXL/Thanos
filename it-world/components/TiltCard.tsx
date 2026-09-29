"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function TiltCard({ children, className = "" }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) translateZ(0)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "rotateX(0deg) rotateY(0deg)";
  }

  return (
    <div className="perspective-1000">
      <div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
