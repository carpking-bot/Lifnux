"use client";

import { useEffect, useRef, useState } from "react";

type AutoFitTextProps = {
  text: string;
  className?: string;
  minFontPx?: number;
  maxFontPx?: number;
};

export default function AutoFitText({
  text,
  className,
  minFontPx = 8,
  maxFontPx = 12,
}: AutoFitTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontPx, setFontPx] = useState(maxFontPx);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        setContainerSize((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height }
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const measureEl = measureRef.current;
    if (!measureEl || !containerSize.width) {
      return;
    }
    measureEl.textContent = text;

    let low = minFontPx;
    let high = maxFontPx;
    let best = minFontPx;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      measureEl.style.fontSize = `${mid}px`;
      if (measureEl.scrollWidth <= containerSize.width) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    setFontPx(best);
  }, [text, minFontPx, maxFontPx, containerSize.width]);

  return (
    <span ref={containerRef} className={`relative block w-full ${className ?? ""}`}>
      <span
        className="block overflow-hidden whitespace-nowrap leading-tight"
        style={{ fontSize: `${fontPx}px` }}
      >
        {text}
      </span>
      <span
        ref={measureRef}
        className={`pointer-events-none absolute left-0 top-0 -z-10 block overflow-hidden whitespace-nowrap leading-tight opacity-0 ${className ?? ""}`}
      />
    </span>
  );
}
