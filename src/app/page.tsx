"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackgroundFX from "@/components/BackgroundFX";
import EnterEffectOverlay, {
  type EnterEffect,
} from "@/components/EnterEffectOverlay";
import LifnuxHeaderClock from "@/components/LifnuxHeaderClock";
import LifnuxOrbitHub from "@/components/LifnuxOrbitHub";

const ENTER_DURATION_MS = 720;

export default function Home() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [effect, setEffect] = useState<EnterEffect | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerEnter = (
    route: string,
    label: string,
    icon: EnterEffect["icon"],
    rect: DOMRect
  ) => {
    if (effect) {
      return;
    }
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const deltaX = window.innerWidth / 2 - originX;
    const deltaY = window.innerHeight / 2 - originY;

    setEffect({
      id: route,
      label,
      icon,
      originX,
      originY,
      deltaX,
      deltaY,
    });

    timerRef.current = setTimeout(() => {
      router.push(route);
    }, ENTER_DURATION_MS);
  };

  return (
    <div className="lifnux-shell">
      <BackgroundFX />
      <EnterEffectOverlay effect={effect} durationMs={ENTER_DURATION_MS} />
      <main className="relative flex min-h-screen items-center justify-center px-6 py-24">
        <div className="relative flex w-full max-w-5xl flex-col items-center justify-center gap-10">
          <LifnuxHeaderClock />
          <LifnuxOrbitHub
            isPaused={Boolean(effect)}
            disabled={Boolean(effect)}
            onEnter={triggerEnter}
          />
          <div className="text-center">
            <h1 className="mt-3 text-5xl font-semibold tracking-[0.4em] text-sky-100 sm:text-6xl">
              LIFNUX
            </h1>
            <p className="mt-4 text-sm uppercase tracking-[0.35em] text-sky-100/70">
              Personal Life Operating System
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
