"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";

type CalendarCoreProps = {
  label: string;
  route: string;
  icon: LucideIcon;
  onEnter: (
    route: string,
    label: string,
    icon: LucideIcon,
    rect: DOMRect
  ) => void;
  disabled?: boolean;
};

export default function CalendarCore({
  label,
  route,
  icon: Icon,
  onEnter,
  disabled,
}: CalendarCoreProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onClick={() => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          onEnter(route, label, Icon, rect);
        }
      }}
      className="relative z-10 flex h-52 w-52 flex-col items-center justify-center gap-4 rounded-full border border-white/20 bg-white/10 text-sky-100 shadow-[0_20px_60px_rgba(25,60,90,0.55)] backdrop-blur-xl transition hover:scale-[1.03] disabled:cursor-default disabled:opacity-60 pointer-events-auto sm:h-56 sm:w-56"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
        <Icon className="h-8 w-8" />
      </span>
    </button>
  );
}
