"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

export type OrbitMenuItem = {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
};

type OrbitItemProps = {
  item: OrbitMenuItem;
  x: number;
  y: number;
  onEnter: (
    item: OrbitMenuItem,
    rect: DOMRect,
    icon: LucideIcon
  ) => void;
  disabled?: boolean;
  isPaused?: boolean;
  orbitDurationSec: number;
};

export default function OrbitItem({
  item,
  x,
  y,
  onEnter,
  disabled,
  isPaused,
  orbitDurationSec,
}: OrbitItemProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const translateX = Number.isFinite(x) ? x.toFixed(3) : "0";
  const translateY = Number.isFinite(y) ? y.toFixed(3) : "0";

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px)`,
      }}
    >
      <div
        className="orbit-counter-rotate"
        style={{
          animationDuration: `${orbitDurationSec}s`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        <motion.button
          type="button"
          disabled={disabled}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onEnter(item, rect, item.icon);
          }}
          whileHover={!disabled ? { scale: 1.08 } : undefined}
          aria-label={item.label}
          className="group relative flex h-[4.8rem] w-[4.8rem] items-center justify-center rounded-full border border-white/15 bg-white/10 text-sky-100 shadow-[0_8px_24px_rgba(15,40,70,0.35)] backdrop-blur-md transition disabled:cursor-default disabled:opacity-60 sm:h-[5.2rem] sm:w-[5.2rem]"
        >
          <Icon className="h-8 w-8" />
          <motion.span
            initial={false}
            animate={
              hovered && !disabled
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 6 }
            }
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute left-1/2 top-[118%] -translate-x-1/2 whitespace-nowrap text-[0.95rem] font-semibold uppercase tracking-[0.22em] text-sky-100/90"
          >
            {item.label}
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
