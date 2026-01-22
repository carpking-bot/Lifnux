"use client";

import type { CalendarEvent, CalendarLabel } from "@/lib/calendar/types";
import { diffInDays, parseDateString, parseTime } from "@/lib/calendar/date";
import { getEventKind } from "@/lib/calendar/event";

type UpcomingEventsProps = {
  events: CalendarEvent[];
  labels: CalendarLabel[];
  limit?: number;
  onSelect: (event: CalendarEvent) => void;
};

function eventSortKey(event: CalendarEvent) {
  const date = parseDateString(event.date);
  if (!date) {
    return Number.MAX_SAFE_INTEGER;
  }
  const timeMinutes = event.startTime ? parseTime(event.startTime) ?? 0 : 0;
  return date.getTime() + timeMinutes * 60 * 1000;
}

export default function UpcomingEvents({
  events,
  labels,
  limit = 6,
  onSelect,
}: UpcomingEventsProps) {
  const today = new Date();
  const upcoming = events
    .filter((event) => {
      const kind = getEventKind(event);
      return (
        (kind === "TIMED" || kind === "DATE") &&
        (event.importance === "HIGH" || event.importance === "CRITICAL")
      );
    })
    .filter((event) => {
      const date = parseDateString(event.date);
      return date ? date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false;
    })
    .sort((a, b) => eventSortKey(a) - eventSortKey(b))
    .slice(0, limit);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.3em] text-sky-100/70">
          Upcoming
        </h3>
        <span className="text-xs uppercase tracking-[0.3em] text-sky-100/40">
          High+
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        {upcoming.length === 0 ? (
          <p className="text-xs uppercase tracking-[0.3em] text-sky-100/40">
            No upcoming high priority events.
          </p>
        ) : null}
        {upcoming.map((event) => {
          const label = labels.find((item) => item.id === event.labelId);
          const eventDate = parseDateString(event.date);
          const diff = eventDate ? diffInDays(today, eventDate) : 0;
          const dday =
            diff === 0 ? "D-Day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: label?.color ?? "#94a3b8" }}
                />
                <div>
                  <p className="text-sm font-semibold text-sky-100">
                    {event.title}
                  </p>
                  <p className="text-xs uppercase tracking-[0.25em] text-sky-100/60">
                    {event.date}
                    {event.startTime ? ` · ${event.startTime}` : ""}
                  </p>
                </div>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                {dday}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
