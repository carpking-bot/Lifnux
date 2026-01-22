"use client";

import { useMemo } from "react";
import {
  Activity,
  Briefcase,
  CalendarDays,
  Gamepad2,
  Medal,
  Music2,
  Sprout,
  Wallet,
} from "lucide-react";
import CalendarCore from "@/components/CalendarCore";
import OrbitMenu from "@/components/OrbitMenu";
import type { OrbitMenuItem } from "@/components/OrbitItem";
import type { EnterEffect } from "@/components/EnterEffectOverlay";

type LifnuxOrbitHubProps = {
  disabled?: boolean;
  isPaused?: boolean;
  onEnter: (route: string, label: string, icon: EnterEffect["icon"], rect: DOMRect) => void;
};

export default function LifnuxOrbitHub({ disabled, isPaused, onEnter }: LifnuxOrbitHubProps) {
  const modules = useMemo<OrbitMenuItem[]>(
    () => [
      { id: "gaming", label: "Gaming", route: "/gaming", icon: Gamepad2 },
      { id: "finance", label: "Finance", route: "/finance", icon: Wallet },
      { id: "sport", label: "Sport", route: "/sport", icon: Medal },
      { id: "running", label: "Running", route: "/running", icon: Activity },
      { id: "career", label: "Career", route: "/career", icon: Briefcase },
      { id: "music", label: "Music", route: "/music", icon: Music2 },
      {
        id: "growth",
        label: "Personal Growth",
        route: "/growth",
        icon: Sprout,
      },
    ],
    []
  );

  return (
    <div className="relative h-[640px] w-[640px] max-w-full">
      <div className="absolute inset-[160px] rounded-full border border-sky-200/10" />
      <OrbitMenu
        items={modules}
        isPaused={Boolean(isPaused)}
        disabled={Boolean(disabled)}
        onEnter={(item, rect, icon) => onEnter(item.route, item.label, icon, rect)}
        radius={260}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <CalendarCore
          label="Calendar"
          route="/calendar"
          icon={CalendarDays}
          onEnter={onEnter}
          disabled={Boolean(disabled)}
        />
      </div>
    </div>
  );
}
