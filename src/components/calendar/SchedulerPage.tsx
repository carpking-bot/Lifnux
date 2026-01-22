"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addEvent, deleteEvent, updateEvent, useCalendarStore } from "@/lib/calendar/store";
import type { CalendarEvent, EventType } from "@/lib/calendar/types";
import {
  addDays,
  formatDate,
  formatTimeLabel,
  parseDateString,
  parseTime,
} from "@/lib/calendar/date";
import { getEventKind } from "@/lib/calendar/event";
import AddEventModal from "@/components/calendar/AddEventModal";
import EventDetailModal from "@/components/calendar/EventDetailModal";

type SchedulerPageProps = {
  date: string;
};

const START_MINUTES = 7 * 60;
const TOTAL_MINUTES = 23 * 60;
const SLOT_MINUTES = 30;
const ROW_HEIGHT = 36;

function toOffsetMinutes(timeValue: string) {
  const minutes = parseTime(timeValue);
  if (minutes === null) {
    return 0;
  }
  const normalized = minutes < START_MINUTES ? minutes + 24 * 60 : minutes;
  return Math.max(0, normalized - START_MINUTES);
}

function hasTimedOverlap(
  events: CalendarEvent[],
  date: string,
  startTime: string,
  endTime: string
) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (start === null || end === null || start >= end) {
    return true;
  }
  return events.some((event) => {
    if (
      getEventKind(event) !== "TIMED" ||
      event.date !== date ||
      !event.startTime ||
      !event.endTime
    ) {
      return false;
    }
    const existingStart = parseTime(event.startTime);
    const existingEnd = parseTime(event.endTime);
    if (existingStart === null || existingEnd === null) {
      return false;
    }
    return start < existingEnd && end > existingStart;
  });
}

function createSeriesId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `series-${crypto.randomUUID()}`;
  }
  return `series-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SchedulerPage({ date }: SchedulerPageProps) {
  const params = useParams();
  const paramDate = Array.isArray(params?.date)
    ? params.date[0]
    : (params?.date as string | undefined);
  const effectiveDate = parseDateString(date) ? date : paramDate ?? "";
  const { events, labels } = useCalendarStore((state) => state);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addDefaults, setAddDefaults] = useState<{
    type: EventType;
    startTime?: string;
    endTime?: string;
  }>({ type: "TIMED" });
  const timelineRef = useRef<HTMLDivElement>(null);

  const parsedDate = parseDateString(effectiveDate);
  const dateEvents = events.filter((event) => event.date === effectiveDate);
  const timedEvents = dateEvents.filter((event) => getEventKind(event) === "TIMED");
  const dateOnlyEvents = dateEvents.filter((event) => {
    const kind = getEventKind(event);
    return kind === "DATE" || kind === "HOLIDAY";
  });

  const timeSlots = useMemo(() => {
    const slots = [];
    const slotCount = TOTAL_MINUTES / SLOT_MINUTES;
    for (let i = 0; i <= slotCount; i += 1) {
      slots.push(START_MINUTES + i * SLOT_MINUTES);
    }
    return slots;
  }, []);

  if (!parsedDate) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-sky-100">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold">Invalid date</h1>
          <Link
            href="/calendar"
            className="mt-4 inline-flex text-xs uppercase tracking-[0.3em] text-sky-100/70"
          >
            Back to calendar
          </Link>
        </div>
      </main>
    );
  }
  const weekdayLabel = parsedDate.toLocaleDateString("en-US", {
    weekday: "short",
  });

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-sky-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Scheduler
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[0.2em]">
              {effectiveDate} ({weekdayLabel})
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/calendar"
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-[0.3em] text-sky-100/70">
              Date Schedules
            </h2>
            <span className="text-xs uppercase tracking-[0.3em] text-sky-100/40">
              {dateOnlyEvents.length}
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {dateOnlyEvents.length === 0 ? (
              <p className="text-xs uppercase tracking-[0.3em] text-sky-100/40">
                No date events.
              </p>
            ) : null}
            {dateOnlyEvents.map((event) => {
              const label = labels.find((item) => item.id === event.labelId);
              const kind = getEventKind(event);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    {kind !== "HOLIDAY" ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: label?.color ?? "#94a3b8" }}
                      />
                    ) : null}
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          kind === "HOLIDAY" ? "text-rose-200" : "text-sky-100"
                        }`}
                      >
                        {event.title}
                      </p>
                      {kind === "HOLIDAY" ? (
                        <p className="text-xs uppercase tracking-[0.25em] text-rose-200/70">
                          Holiday
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {kind !== "HOLIDAY" ? (
                    <span className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
                      {event.importance}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm uppercase tracking-[0.3em] text-sky-100/70">
            Timeline 07:00 - 06:00
          </h2>
          <div className="mt-4 overflow-x-auto">
            <div className="relative min-w-[520px]">
              <div className="absolute left-0 top-0 w-16 text-xs uppercase tracking-[0.25em] text-sky-100/40">
                {timeSlots.map((minutes) => (
                  <div
                    key={minutes}
                    className="flex h-[36px] items-start"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {formatTimeLabel(minutes)}
                  </div>
                ))}
              </div>
              <div
                ref={timelineRef}
                className="relative ml-16 rounded-2xl border border-white/10 bg-white/5"
                style={{ height: timeSlots.length * ROW_HEIGHT }}
                onClick={(event) => {
                  if (!timelineRef.current) {
                    return;
                  }
                  const rect = timelineRef.current.getBoundingClientRect();
                  const offsetY = event.clientY - rect.top;
                  const slotIndex = Math.max(
                    0,
                    Math.floor(offsetY / ROW_HEIGHT)
                  );
                  const startMinutes = START_MINUTES + slotIndex * SLOT_MINUTES;
                  const endMinutes = startMinutes + SLOT_MINUTES;
                  setAddDefaults({
                    type: "TIMED",
                    startTime: formatTimeLabel(startMinutes),
                    endTime: formatTimeLabel(endMinutes),
                  });
                  setCreateError(null);
                  setShowAddModal(true);
                }}
              >
                {timeSlots.map((minutes) => (
                  <div
                    key={minutes}
                    className="border-b border-white/5"
                    style={{ height: ROW_HEIGHT }}
                  />
                ))}
                <div className="pointer-events-none absolute inset-0" />
                {timedEvents.map((event) => {
                  if (!event.startTime || !event.endTime) {
                    return null;
                  }
                  const offset = toOffsetMinutes(event.startTime);
                  const endOffset = toOffsetMinutes(event.endTime);
                  const durationMinutes = Math.max(
                    SLOT_MINUTES,
                    endOffset - offset
                  );
                  const height =
                    durationMinutes * (ROW_HEIGHT / SLOT_MINUTES);
                  const top = offset * (ROW_HEIGHT / SLOT_MINUTES);
                  const label = labels.find((item) => item.id === event.labelId);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="absolute left-2 right-2 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-400/25 via-emerald-300/15 to-slate-900/50 px-4 py-3 text-center shadow-[0_16px_40px_rgba(10,25,45,0.45)] transition hover:from-emerald-400/35 hover:via-emerald-300/20 hover:to-slate-900/60"
                      style={{ top, height }}
                    >
                      <div className="flex w-full items-center justify-center gap-3">
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: label?.color ?? "#94a3b8" }}
                        />
                        <p className="truncate text-base font-semibold">
                          {event.title}
                          <span className="ml-2 text-xs uppercase tracking-[0.2em] text-sky-100/60">
                            ({event.startTime} - {event.endTime})
                          </span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal ? (
        <AddEventModal
          date={effectiveDate}
          labels={labels}
          timedEvents={timedEvents}
          errorMessage={createError}
          onClose={() => {
            setCreateError(null);
            setShowAddModal(false);
          }}
          onCreate={({ event, repeat }) => {
            setCreateError(null);
            if (!repeat?.enabled) {
              addEvent(event);
              setShowAddModal(false);
              return;
            }
            if (event.kind !== "TIMED") {
              setCreateError("Repeat is only available for timed events.");
              return;
            }
            if (!event.startTime || !event.endTime) {
              setCreateError("Start/end time required for repeat.");
              return;
            }
            if (!repeat.days.length) {
              setCreateError("Select at least one repeat day.");
              return;
            }
            const startDate = parseDateString(event.date);
            const endDate = parseDateString(repeat.endDate);
            if (!startDate || !endDate) {
              setCreateError("Invalid repeat end date.");
              return;
            }
            if (endDate < startDate) {
              setCreateError("Repeat end date must be on or after start date.");
              return;
            }
            const conflicts: string[] = [];
            const newEvents: Omit<CalendarEvent, "id">[] = [];
            const seriesId = createSeriesId();
            for (
              let cursor = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate()
              );
              cursor <= endDate;
              cursor = addDays(cursor, 1)
            ) {
              if (!repeat.days.includes(cursor.getDay())) {
                continue;
              }
              const targetDate = formatDate(cursor);
              if (
                hasTimedOverlap(
                  events,
                  targetDate,
                  event.startTime,
                  event.endTime
                )
              ) {
                conflicts.push(targetDate);
                continue;
              }
              newEvents.push({
                ...event,
                date: targetDate,
                seriesId,
              });
            }
            if (conflicts.length > 0) {
              setCreateError(
                `Time overlap on: ${conflicts.join(", ")}`
              );
              return;
            }
            newEvents.forEach((item) => addEvent(item));
            setShowAddModal(false);
          }}
          initialType={addDefaults.type}
          initialStartTime={addDefaults.startTime}
          initialEndTime={addDefaults.endTime}
        />
      ) : null}

      <EventDetailModal
        event={selectedEvent}
        labels={labels}
        onClose={() => setSelectedEvent(null)}
        onSave={(id, patch) => updateEvent(id, patch)}
        onDelete={(id) => {
          deleteEvent(id);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}
