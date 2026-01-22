"use client";

import type { StatusBarData } from "@/lib/calendar/types";
import { diffInDays, parseDateString } from "@/lib/calendar/date";

type StatusBarProps = {
  data: StatusBarData;
};

export default function StatusBar({ data }: StatusBarProps) {
  const startDate = parseDateString(data.employmentStartDate);
  const today = new Date();
  const dayCount = startDate ? diffInDays(startDate, today) : 0;
  const years = startDate ? today.getFullYear() - startDate.getFullYear() : 0;
  const months = startDate
    ? today.getMonth() - startDate.getMonth() + years * 12
    : 0;
  const yearsDisplay = Math.floor(months / 12);
  const monthsDisplay = months % 12;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-xs uppercase tracking-[0.3em] text-sky-100/70">
      <div className="flex flex-wrap gap-4">
        <span>{data.companyName}</span>
        <span>Leave {data.remainingLeaveHours}h</span>
        <span>
          Tenure {yearsDisplay}y {monthsDisplay}m
        </span>
        <span>D+{dayCount}</span>
      </div>
    </div>
  );
}
