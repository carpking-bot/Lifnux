"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatClock(now: Date) {
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const weekday = WEEKDAYS[now.getDay()];
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return {
    dateText: `${year}.${month}.${day} (${weekday})`,
    timeText: `${hours}:${minutes}:${seconds}`,
  };
}

export default function LifnuxHeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { dateText, timeText } = formatClock(now);
  return (
    <header className="lifnux-clock flex w-full max-w-xl items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-center text-[1.9rem] text-sky-100/85 shadow-[0_10px_30px_rgba(12,30,55,0.35)] backdrop-blur-md sm:px-10">
      <span className="leading-tight">
        <span className="block">{dateText}</span>
        <span className="block">{timeText}</span>
      </span>
    </header>
  );
}
