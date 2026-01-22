"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent, CalendarLabel, Importance } from "@/lib/calendar/types";
import { formatTimeLabel } from "@/lib/calendar/date";
import { getEventKind } from "@/lib/calendar/event";

type EventDetailModalProps = {
  event: CalendarEvent | null;
  labels: CalendarLabel[];
  onClose: () => void;
  onSave: (eventId: string, patch: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
};

const IMPORTANCE_LEVELS: Importance[] = [
  "LOW",
  "MIDDLE",
  "HIGH",
  "CRITICAL",
];

const TIME_OPTIONS = (() => {
  const options: string[] = [];
  for (let minutes = 7 * 60; minutes < 24 * 60; minutes += 30) {
    options.push(formatTimeLabel(minutes));
  }
  for (let minutes = 0; minutes <= 6 * 60; minutes += 30) {
    options.push(formatTimeLabel(minutes));
  }
  return options;
})();

export default function EventDetailModal({
  event,
  labels,
  onClose,
  onSave,
  onDelete,
}: EventDetailModalProps) {
  const kind = event ? getEventKind(event) : "DATE";
  const [title, setTitle] = useState("");
  const [labelId, setLabelId] = useState<string | null>(null);
  const [importance, setImportance] = useState<Importance>("LOW");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    if (!event) {
      return;
    }
    setTitle(event.title);
    setLabelId(event.labelId ?? null);
    setImportance(event.importance ?? "LOW");
    setLocation(event.location ?? "");
    setNote(event.note ?? "");
    setStartTime(event.startTime ?? "09:00");
    setEndTime(event.endTime ?? "10:00");
  }, [event]);

  if (!event) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1624]/95 p-6 text-sky-100 shadow-[0_20px_60px_rgba(5,20,35,0.7)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Event Detail
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{event.title}</h2>
            {kind === "HOLIDAY" ? (
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-rose-200/80">
                {event.isSystemHoliday ? "\uae30\ubcf8 \uacf5\ud734\uc77c" : "Holiday"}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-sky-100/70 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
            />
          </label>

          {kind === "TIMED" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                Start
                <select
                  value={startTime}
                  onChange={(eventValue) => setStartTime(eventValue.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100"
                >
                  {TIME_OPTIONS.map((option) => (
                    <option
                      key={`start-${option}`}
                      value={option}
                      className="bg-slate-900 text-sky-100"
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                End
                <select
                  value={endTime}
                  onChange={(eventValue) => setEndTime(eventValue.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100"
                >
                  {TIME_OPTIONS.map((option) => (
                    <option
                      key={`end-${option}`}
                      value={option}
                      className="bg-slate-900 text-sky-100"
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {kind !== "HOLIDAY" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                Label
                <select
                  value={labelId ?? ""}
                  onChange={(event) =>
                    setLabelId(event.target.value || null)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100"
                >
                  <option value="" className="bg-slate-900 text-sky-100">
                    None
                  </option>
                  {labels.map((label) => (
                    <option
                      key={label.id}
                      value={label.id}
                      className="bg-slate-900 text-sky-100"
                    >
                      {label.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                Importance
                <select
                  value={importance}
                  onChange={(event) =>
                    setImportance(event.target.value as Importance)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100"
                >
                  {IMPORTANCE_LEVELS.map((level) => (
                    <option
                      key={level}
                      value={level}
                      className="bg-slate-900 text-sky-100"
                    >
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
            Location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
            />
          </label>

          <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
            Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDelete(event.id)}
            className="rounded-full border border-rose-400/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-rose-200/90 transition hover:text-white"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                onSave(
                  event.id,
                  kind === "HOLIDAY"
                    ? {
                        title: title.trim() || event.title,
                        location: location.trim(),
                        note: note.trim(),
                      }
                    : {
                        title: title.trim() || event.title,
                        labelId,
                        importance,
                        location: location.trim(),
                        note: note.trim(),
                        startTime: kind === "TIMED" ? startTime : undefined,
                        endTime: kind === "TIMED" ? endTime : undefined,
                      }
                )
              }
              className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


