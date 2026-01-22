"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import OrbitItem, { OrbitMenuItem } from "./OrbitItem";

type OrbitMenuProps = {
  items: OrbitMenuItem[];
  isPaused?: boolean;
  onEnter: (
    item: OrbitMenuItem,
    rect: DOMRect,
    icon: LucideIcon
  ) => void;
  radius?: number;
  disabled?: boolean;
};

export default function OrbitMenu({
  items,
  isPaused,
  onEnter,
  radius = 210,
  disabled,
}: OrbitMenuProps) {
  const ringControls = useAnimation();
  const orbitDurationSec = 20;
  const ringSize = radius * 2;
  const ringRef = useRef<HTMLDivElement>(null);
  const [diameter, setDiameter] = useState(ringSize);

  useEffect(() => {
    if (isPaused) {
      ringControls.stop();
      return;
    }

    ringControls.start({
      rotate: 360,
      transition: {
        repeat: Infinity,
        duration: orbitDurationSec,
        ease: "linear",
      },
    });
  }, [isPaused, orbitDurationSec, ringControls]);

  useEffect(() => {
    if (!ringRef.current) {
      return;
    }

    const updateSize = () => {
      const rect = ringRef.current?.getBoundingClientRect();
      if (rect?.width) {
        setDiameter(rect.width);
      }
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(ringRef.current);

    return () => observer.disconnect();
  }, []);

  const r = useMemo(() => {
    const outerEdgeRadius = diameter / 2;
    let computed = outerEdgeRadius;
    computed = Math.max(20, Math.min(computed, outerEdgeRadius));
    return computed;
  }, [diameter]);

  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 relative"
      style={{ width: ringSize, height: ringSize }}
    >
      <motion.div
        ref={ringRef}
        className="absolute inset-0 orbit-ring"
        animate={ringControls}
      />
      <div
        className="orbit-rotator absolute inset-0"
        style={{
          animationDuration: `${orbitDurationSec}s`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {items.map((item, index) => {
          const angle = (360 / items.length) * index - 110;
          const radians = (angle * Math.PI) / 180;
          const x = r * Math.cos(radians);
          const y = r * Math.sin(radians);
          return (
            <OrbitItem
              key={item.id}
              item={item}
              x={x}
              y={y}
              onEnter={onEnter}
              disabled={disabled}
              isPaused={isPaused}
              orbitDurationSec={orbitDurationSec}
            />
          );
        })}
      </div>
    </div>
  );
}
