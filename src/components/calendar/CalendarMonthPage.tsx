"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addLabel, deleteEvent, deleteLabel, updateEvent, updateLabel, useCalendarStore } from "@/lib/calendar/store";
import { addDays, formatDate } from "@/lib/calendar/date";
import EventDetailModal from "@/components/calendar/EventDetailModal";
import LabelBar from "@/components/calendar/LabelBar";
import MonthGrid from "@/components/calendar/MonthGrid";
import ShoppingListPanel from "@/components/calendar/ShoppingListPanel";
import StatusBar from "@/components/calendar/StatusBar";
import UpcomingEvents from "@/components/calendar/UpcomingEvents";
import type { CalendarEvent } from "@/lib/calendar/types";

export default function CalendarMonthPage() {
  const router = useRouter();
  const { events, labels, statusBar } = useCalendarStore((state) => state);
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const wheelAccum = useRef(0);

  const headerLabel = useMemo(() => {
    return cursorDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [cursorDate]);

  const goToMonth = (delta: number) => {
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, prev.getDate()));
  };
  const goToWeek = (delta: number) => {
    setCursorDate((prev) => addDays(prev, delta * 7));
  };
  const wheelThreshold = 40;

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-sky-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-100/60">
              Calendar
            </p>
            <div className="mt-2 flex items-center gap-4">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                className="rounded-full border border-white/10 px-3 py-2 text-lg text-sky-100/70 transition hover:text-white"
                aria-label="Previous month"
              >
                ‹
              </button>
              <h1 className="w-[20ch] text-center text-4xl font-semibold tracking-[0.15em] whitespace-nowrap">
                {headerLabel}
              </h1>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                className="rounded-full border border-white/10 px-3 py-2 text-lg text-sky-100/70 transition hover:text-white"
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursorDate(new Date())}
              className="rounded-full border border-cyan-200/60 bg-cyan-300/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100 transition hover:bg-cyan-200/20"
            >
              Today
            </button>
          </div>
        </div>

        <StatusBar data={statusBar} />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-6">
            <UpcomingEvents
              events={events}
              labels={labels}
              onSelect={(event) => setSelectedEvent(event)}
            />
            <div
              className="touch-none"
              onWheel={(event) => {
                event.preventDefault();
                wheelAccum.current += event.deltaY;
                if (Math.abs(wheelAccum.current) < wheelThreshold) {
                  return;
                }
                const step = wheelAccum.current > 0 ? 1 : -1;
                wheelAccum.current = 0;
                goToWeek(step);
              }}
            >
              <MonthGrid
                activeMonth={cursorDate}
                events={events}
                labels={labels}
                onSelectDate={(date) => router.push(`/calendar/${date}`)}
                onSelectEvent={(event) => setSelectedEvent(event)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <ShoppingListPanel />
            <LabelBar
              labels={labels}
              onAdd={(data) => addLabel(data)}
              onUpdate={(id, patch) => updateLabel(id, patch)}
              onDelete={(id) => deleteLabel(id)}
            />
          </div>
        </div>
      </div>

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
