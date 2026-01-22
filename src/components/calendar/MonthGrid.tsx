"use client";

import Link from "next/link";
import type { CalendarEvent, CalendarLabel } from "@/lib/calendar/types";
import { formatDate, getMonthGrid } from "@/lib/calendar/date";
import { getEventKind } from "@/lib/calendar/event";

type MonthGridProps = {
  activeMonth: Date;
  events: CalendarEvent[];
  labels: CalendarLabel[];
  onSelectDate?: (date: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthGrid({
  activeMonth,
  events,
  labels,
  onSelectDate,
  onSelectEvent,
}: MonthGridProps) {
  const { gridDays, monthStart } = getMonthGrid(activeMonth);
  const monthIndex = monthStart.getMonth();

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="grid grid-cols-7 gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-2 text-center">
            {weekday}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {gridDays.map((day) => {
          const dateKey = formatDate(day);
          const dayEvents = events.filter((event) => event.date === dateKey);
          const holidayEvents = dayEvents.filter(
            (event) => getEventKind(event) === "HOLIDAY"
          );
          const importantEvents = dayEvents.filter((event) => {
            const kind = getEventKind(event);
            if (kind === "HOLIDAY") {
              return false;
            }
            return (
              event.importance === "MIDDLE" ||
              event.importance === "HIGH" ||
              event.importance === "CRITICAL"
            );
          });
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isHoliday = holidayEvents.length > 0;
          const isInactiveMonth = day.getMonth() !== monthIndex;
          const maxChips = 3;
          const visibleEvents = importantEvents.slice(0, maxChips);
          const overflow = importantEvents.length - visibleEvents.length;

          return (
            <div
              key={dateKey}
              className={`min-h-[140px] rounded-2xl border border-white/5 bg-white/5 p-3 ${
                isInactiveMonth ? "opacity-40" : ""
              }`}
            >
              <Link
                href={`/calendar/${dateKey}`}
                onClick={() => onSelectDate?.(dateKey)}
                className={`text-sm font-semibold ${
                  isWeekend || isHoliday ? "text-rose-200" : "text-sky-100"
                }`}
              >
                {day.getDate()}
              </Link>

              {holidayEvents.length > 0 ? (
                <div className="mt-2 grid gap-1">
                  {holidayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="text-left text-[0.65rem] uppercase tracking-[0.2em] text-rose-200/80"
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-2 grid gap-1">
                {visibleEvents.map((event) => {
                  const label = labels.find((item) => item.id === event.labelId);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-2 py-1 text-left text-[0.7rem] text-sky-100/90"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: label?.color ?? "#94a3b8" }}
                      />
                      <span className="truncate">{event.title}</span>
                    </button>
                  );
                })}
                {overflow > 0 ? (
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-sky-100/50">
                    +{overflow}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
