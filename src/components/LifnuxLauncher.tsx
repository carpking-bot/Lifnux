"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Home } from "lucide-react";
import LifnuxOrbitHub from "@/components/LifnuxOrbitHub";

const ENTER_DURATION_MS = 0;

export default function LifnuxLauncher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (isOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return;
  }, [isOpen]);

  const handleEnter = (route: string) => {
    setIsOpen(false);
    if (ENTER_DURATION_MS === 0) {
      router.push(route);
      return;
    }
    setTimeout(() => {
      router.push(route);
    }, ENTER_DURATION_MS);
  };

  return (
    <>
      <div className="fixed right-6 top-6 z-40 flex items-center gap-2">
        <button
          type="button"
          aria-label="Open Lifnux Launcher"
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sky-100/80 shadow-[0_12px_30px_rgba(5,10,20,0.45)] backdrop-blur transition hover:text-white"
        >
          <Command className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Go to Home"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            }
            router.push("/");
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sky-100/80 shadow-[0_12px_30px_rgba(5,10,20,0.45)] backdrop-blur transition hover:text-white"
        >
          <Home className="h-5 w-5" />
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6 py-12 backdrop-blur"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-0 top-0 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-sky-100/70 transition hover:text-white"
            >
              X
            </button>
            <div className="flex items-center justify-center">
              <LifnuxOrbitHub
                onEnter={(route) => handleEnter(route)}
                disabled={false}
                isPaused={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
