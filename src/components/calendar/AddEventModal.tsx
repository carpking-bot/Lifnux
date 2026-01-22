"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent, CalendarLabel, EventKind, EventType, Importance } from "@/lib/calendar/types";
import { formatTimeLabel, parseDateString, parseTime } from "@/lib/calendar/date";
import { getEventKind } from "@/lib/calendar/event";

type AddEventModalProps = {
  date: string;
  labels: CalendarLabel[];
  timedEvents: CalendarEvent[];
  onClose: () => void;
  onCreate: (data: {
    event: Omit<CalendarEvent, "id">;
    repeat: {
      enabled: boolean;
      days: number[];
      endDate: string;
    } | null;
  }) => void;
  errorMessage?: string | null;
  initialType?: EventType;
  initialStartTime?: string;
  initialEndTime?: string;
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

const REPEAT_DAYS = [
  { label: "Mon", dayIndex: 1 },
  { label: "Tue", dayIndex: 2 },
  { label: "Wed", dayIndex: 3 },
  { label: "Thu", dayIndex: 4 },
  { label: "Fri", dayIndex: 5 },
  { label: "Sat", dayIndex: 6 },
  { label: "Sun", dayIndex: 0 },
];

export default function AddEventModal({
  date,
  labels,
  timedEvents,
  onClose,
  onCreate,
  errorMessage,
  initialType = "TIMED",
  initialStartTime = "09:00",
  initialEndTime = "10:00",
}: AddEventModalProps) {
  const [eventType, setEventType] = useState<EventType>(initialType);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [labelId, setLabelId] = useState<string | null>(labels[0]?.id ?? null);
  const [importance, setImportance] = useState<Importance>("LOW");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [makeHoliday, setMakeHoliday] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState(date);

  const kind: EventKind = makeHoliday ? "HOLIDAY" : eventType;
  const isTimed = eventType === "TIMED" && !makeHoliday;

  const hasOverlap = useMemo(() => {
    if (!isTimed) {
      return false;
    }
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start === null || end === null || start >= end) {
      return true;
    }
    return timedEvents.some((event) => {
      if (getEventKind(event) !== "TIMED" || !event.startTime || !event.endTime) {
        return false;
      }
      const existingStart = parseTime(event.startTime);
      const existingEnd = parseTime(event.endTime);
      if (existingStart === null || existingEnd === null) {
        return false;
      }
      return start < existingEnd && end > existingStart;
    });
  }, [endTime, isTimed, startTime, timedEvents]);

  const repeatStartDate = useMemo(() => parseDateString(date), [date]);
  const repeatEndDateParsed = useMemo(
    () => parseDateString(repeatEndDate),
    [repeatEndDate]
  );
  const repeatHasDays = repeatDays.length > 0;
  const repeatEndValid =
    !!repeatStartDate &&
    !!repeatEndDateParsed &&
    repeatEndDateParsed >= repeatStartDate;
  const repeatSettingsValid =
    !repeatEnabled || (repeatHasDays && repeatEndValid);

  const canSave =
    title.trim().length > 0 &&
    (!isTimed || !hasOverlap) &&
    (!isTimed || repeatSettingsValid);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b1624]/95 p-6 text-sky-100 shadow-[0_20px_60px_rgba(5,20,35,0.7)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              New Event
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{date}</h2>
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
            Type
            <select
              value={eventType}
              onChange={(event) => {
                const next = event.target.value as EventType;
                setEventType(next);
                setRepeatEnabled(false);
              }}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100"
            >
              <option value="TIMED" className="bg-slate-900 text-sky-100">
                Timed
              </option>
              <option value="DATE" className="bg-slate-900 text-sky-100">
                Date
              </option>
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-sky-100/70">
            <input
              type="checkbox"
              checked={makeHoliday}
              onChange={(event) => {
                setMakeHoliday(event.target.checked);
                setRepeatEnabled(false);
              }}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Make as Holiday
          </label>

          <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
            />
          </label>

          {eventType === "TIMED" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                  Start
                  <select
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    disabled={makeHoliday}
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
                    onChange={(event) => setEndTime(event.target.value)}
                    disabled={makeHoliday}
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

              {isTimed ? (
                <>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.3em] text-sky-100/70">
                    <input
                      type="checkbox"
                      checked={repeatEnabled}
                      onChange={(event) => setRepeatEnabled(event.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5"
                    />
                    Repeat
                  </label>

                  {repeatEnabled ? (
                    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                        Days
                        <div className="flex flex-wrap gap-2">
                          {REPEAT_DAYS.map((day) => {
                            const isActive = repeatDays.includes(day.dayIndex);
                            return (
                              <button
                                key={`repeat-${day.label}`}
                                type="button"
                                onClick={() => {
                                  setRepeatDays((prev) =>
                                    prev.includes(day.dayIndex)
                                      ? prev.filter((value) => value !== day.dayIndex)
                                      : [...prev, day.dayIndex]
                                  );
                                }}
                                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.3em] transition ${
                                  isActive
                                    ? "border-cyan-200/70 bg-cyan-300/20 text-cyan-100"
                                    : "border-white/10 text-sky-100/70 hover:text-white"
                                }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <label className="grid gap-2 text-xs uppercase tracking-[0.3em] text-sky-100/60">
                        End Date
                        <input
                          type="date"
                          value={repeatEndDate}
                          onChange={(event) => setRepeatEndDate(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-sky-100"
                        />
                      </label>
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {!makeHoliday ? (
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
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-sky-100"
            />
          </label>
        </div>

        {hasOverlap && isTimed ? (
          <p className="mt-4 rounded-2xl border border-rose-300/50 bg-rose-200/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-rose-200/90">
            Time overlap detected. Adjust start/end.
          </p>
        ) : null}

        {isTimed && repeatEnabled && !repeatHasDays ? (
          <p className="mt-3 rounded-2xl border border-amber-200/40 bg-amber-200/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-amber-100/90">
            Select at least one repeat day.
          </p>
        ) : null}

        {isTimed && repeatEnabled && !repeatEndValid ? (
          <p className="mt-3 rounded-2xl border border-amber-200/40 bg-amber-200/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-amber-100/90">
            End date must be on or after the start date.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 rounded-2xl border border-rose-300/50 bg-rose-200/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-rose-200/90">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sky-100/70 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              onCreate({
                event: {
                  title: title.trim(),
                  date,
                  kind,
                  startTime: isTimed ? startTime : undefined,
                  endTime: isTimed ? endTime : undefined,
                  labelId: makeHoliday ? undefined : labelId,
                  importance: makeHoliday ? undefined : importance,
                  location: location.trim(),
                  note: note.trim(),
                  isSystemHoliday: false,
                },
                repeat:
                  isTimed
                    ? {
                        enabled: repeatEnabled,
                        days: repeatDays,
                        endDate: repeatEndDate,
                      }
                    : null,
              })
            }
            className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
