"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type EnterEffect = {
  id: string;
  label: string;
  icon: LucideIcon;
  originX: number;
  originY: number;
  deltaX: number;
  deltaY: number;
};

type EnterEffectOverlayProps = {
  effect: EnterEffect | null;
  durationMs: number;
};

export default function EnterEffectOverlay({
  effect,
  durationMs,
}: EnterEffectOverlayProps) {
  const duration = durationMs / 1000;

  return (
    <AnimatePresence>
      {effect ? (
        <motion.div
          key="enter-overlay"
          className="pointer-events-none fixed inset-0 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 enter-scan blur-[2px]"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.08, opacity: 1 }}
            transition={{ duration, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 bg-lines"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1.05 }}
            transition={{ duration, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 bg-noise"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            className="absolute inset-0 fx-vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            className="fixed flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/15 text-sky-100 shadow-[0_12px_40px_rgba(20,40,70,0.55)] backdrop-blur-xl"
            style={{ left: effect.originX, top: effect.originY }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: effect.deltaX,
              y: effect.deltaY,
              scale: 2.2,
              opacity: 0,
            }}
            transition={{ duration, ease: "easeInOut" }}
          >
            <effect.icon className="h-7 w-7" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
