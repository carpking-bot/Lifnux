"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

// -----------------------------
// Types
// -----------------------------
type Importance = "LOW" | "MIDDLE" | "HIGH" | "CRITICAL";

type Category = {
  id: string;
  name: string;
  color: string; // HEX
  isSystem?: boolean; // Holiday 등
  isEnabled?: boolean; // 시스템 이벤트 숨김용(공휴일)
};

type DateEvent = {
  id: string;
  kind: "DATE";
  date: string; // YYYY-MM-DD (local)
  title: string;
  categoryId: string;
  importance: Importance;
  note?: string;
  isSystem?: boolean; // 기본 공휴일 등
  isEnabled?: boolean;
  createdAt: number;
};

type TimedEvent = {
  id: string;
  kind: "TIMED";
  anchorDate: string; // YYYY-MM-DD, "07:00~익일06:00" 하루 기준일
  startMin: number; // 0..1410 step 30 (0=07:00)
  endMin: number; // (startMin+30)..1440 step 30
  title: string;
  categoryId: string;
  importance: Importance;
  location?: string;
  note?: string;
  createdAt: number;
};

type AppState = {
  categories: Category[];
  dateEvents: DateEvent[];
  timedEvents: TimedEvent[];

  // STATUS
  companyName: string;

  // 근무 정보
  isEmployed: boolean;                 // 재직중 여부
  employmentStartDate: string;         // YYYY-MM-DD
  employmentEndDate?: string;          // 퇴사일 (재직중이면 비움)

  // 연차 (내부는 분 단위)
  remainingLeaveMinutes: number;
};

// -----------------------------
// Storage Keys
// -----------------------------
const LS_KEY = "lifnux_calendar_v1";

// -----------------------------
// Helpers (dates)
// -----------------------------
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalYMD(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

function fromLocalYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(ymd: string, delta: number) {
  const dt = fromLocalYMD(ymd);
  dt.setDate(dt.getDate() + delta);
  return toLocalYMD(dt);
}

function startOfWeekMonday(ymd: string) {
  const dt = fromLocalYMD(ymd);
  // JS: 0=Sun, 1=Mon..6=Sat
  const dow = dt.getDay();
  const offset = (dow + 6) % 7; // Mon=0 ... Sun=6
  dt.setDate(dt.getDate() - offset);
  return toLocalYMD(dt);
}

function formatMD(ymd: string) {
  const dt = fromLocalYMD(ymd);
  return `${pad2(dt.getMonth() + 1)}.${pad2(dt.getDate())}`;
}

function weekdayLabelMonFirst(idx: number) {
  // 0..6
  const arr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return arr[idx] ?? "";
}

function isSameYMD(a: string, b: string) {
  return a === b;
}

function isToday(ymd: string) {
  return ymd === toLocalYMD(new Date());
}

function parseLeaveToMinutes(input: string) {
  const s = input.trim().toLowerCase();
  if (!s) return 0;

  // 숫자만 들어오면 "시간"으로 해석
  if (/^\d+(\.\d+)?$/.test(s)) {
    const hours = Number(s);
    return Number.isFinite(hours) ? Math.round(hours * 60) : 0;
  }

  let days = 0;
  let hours = 0;

  const dMatch = s.match(/(\d+(\.\d+)?)\s*d/);
  const hMatch = s.match(/(\d+(\.\d+)?)\s*h/);

  if (dMatch) days = Number(dMatch[1]);
  if (hMatch) hours = Number(hMatch[1]);

  if (!Number.isFinite(days)) days = 0;
  if (!Number.isFinite(hours)) hours = 0;

  return Math.max(0, Math.round(days * 8 * 60 + hours * 60));
}

function formatLeave(minutes: number) {
  const m = Math.max(0, Math.floor(minutes));
  const totalHours = Math.floor(m / 60);
  const d = Math.floor(totalHours / 8);
  const h = totalHours % 8;
  return { d, h, label: `${d}D ${h}H` };
}


// -----------------------------
// Helpers (importance)
// -----------------------------
const importanceOrder: Record<Importance, number> = {
  LOW: 1,
  MIDDLE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function importanceLabel(imp: Importance) {
  switch (imp) {
    case "LOW":
      return "Low";
    case "MIDDLE":
      return "Middle";
    case "HIGH":
      return "High";
    case "CRITICAL":
      return "Critical";
  }
}

function isHighPlus(imp: Importance) {
  return imp === "HIGH" || imp === "CRITICAL";
}

function isMiddlePlus(imp: Importance) {
  return imp === "MIDDLE" || imp === "HIGH" || imp === "CRITICAL";
}

// -----------------------------
// Helpers (time 07:00 base)
// -----------------------------
function minToClock(minFromBase: number) {
  // base 07:00
  const total = (7 * 60 + minFromBase) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function makeTimeOptions30m() {
  const arr: { label: string; value: number }[] = [];
  for (let m = 0; m <= 1410; m += 30) arr.push({ label: minToClock(m), value: m });
  return arr;
}

const TIME_OPTIONS = makeTimeOptions30m();

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// -----------------------------
// Seed Data
// -----------------------------
function defaultCategories(): Category[] {
  // user will edit these anyway
  return [
    { id: "cat_holiday", name: "Holiday", color: "#ff4d4f", isSystem: true, isEnabled: true },
    { id: "cat_general", name: "General", color: "#9aa0a6", isEnabled: true },
    { id: "cat_work", name: "Work", color: "#3b82f6", isEnabled: true },
    { id: "cat_meet", name: "Meeting", color: "#a855f7", isEnabled: true },
    { id: "cat_run", name: "Running", color: "#22c55e", isEnabled: true },
  ];
}

// Minimal KR fixed-date holidays (not lunar / substitute). Editable by user.
function seedKoreanFixedHolidays(year: number): DateEvent[] {
  const mk = (mm: number, dd: number, title: string): DateEvent => ({
    id: uid("hol"),
    kind: "DATE",
    date: `${year}-${pad2(mm)}-${pad2(dd)}`,
    title,
    categoryId: "cat_holiday",
    importance: "MIDDLE",
    note: "",
    isSystem: true,
    isEnabled: true,
    createdAt: Date.now(),
  });

  return [
    mk(1, 1, "New Year’s Day"),
    mk(3, 1, "Independence Movement Day"),
    mk(5, 5, "Children’s Day"),
    mk(6, 6, "Memorial Day"),
    mk(8, 15, "Liberation Day"),
    mk(10, 3, "National Foundation Day"),
    mk(10, 9, "Hangul Day"),
    mk(12, 25, "Christmas"),
  ];
}

function defaultState(): AppState {
  const today = toLocalYMD(new Date());
  const year = new Date().getFullYear();

  return {
    categories: defaultCategories(),
    dateEvents: seedKoreanFixedHolidays(year),
    timedEvents: [],

    companyName: "COMPANY",
    isEmployed: true,
    employmentStartDate: today,
    employmentEndDate: "",

    remainingLeaveMinutes: 0,
  };
}
// -----------------------------
// UI Small pieces
// -----------------------------
function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}

function BadgeImportance({ imp }: { imp: Importance }) {
  const base =
    imp === "CRITICAL"
      ? "border-red-400/40 bg-red-500/15 text-red-200"
      : imp === "HIGH"
      ? "border-red-400/30 bg-red-500/10 text-red-100"
      : imp === "MIDDLE"
      ? "border-white/20 bg-white/10 text-white/80"
      : "border-white/15 bg-white/5 text-white/70";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] tracking-wide ${base}`}>
      {importanceLabel(imp)}
    </span>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-black/70 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-sm tracking-widest text-white/80">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function TooltipCard({
  title,
  timeRange,
  location,
  note,
  categoryName,
  categoryColor,
  importance,
}: {
  title: string;
  timeRange?: string;
  location?: string;
  note?: string;
  categoryName?: string;
  categoryColor?: string;
  importance?: Importance;
}) {
  return (
    <div className="w-[280px] rounded-xl border border-white/15 bg-black/80 p-3 text-left shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-2">
        {categoryColor ? <Dot color={categoryColor} /> : null}
        <div className="text-sm font-semibold text-white/90">{title}</div>
        {importance ? <span className="ml-auto"><BadgeImportance imp={importance} /></span> : null}
      </div>
      {categoryName ? <div className="mt-1 text-[11px] text-white/60">{categoryName}</div> : null}
      <div className="mt-3 space-y-2 text-xs text-white/80">
        {timeRange ? (
          <div className="flex gap-2">
            <span className="w-16 text-white/50">Time</span>
            <span>{timeRange}</span>
          </div>
        ) : null}
        {location ? (
          <div className="flex gap-2">
            <span className="w-16 text-white/50">Location</span>
            <span className="line-clamp-2">{location}</span>
          </div>
        ) : null}
        {note ? (
          <div className="flex gap-2">
            <span className="w-16 text-white/50">Note</span>
            <span className="line-clamp-3 whitespace-pre-wrap">{note}</span>
          </div>
        ) : null}
        {!timeRange && !location && !note ? <div className="text-white/50">No details</div> : null}
      </div>
    </div>
  );
}

// -----------------------------
// Page
// -----------------------------
export default function CalendarPage() {
  const today = toLocalYMD(new Date());

  // global state
  const [state, setState] = useState<AppState>(() => defaultState());

  // view state
  const [view, setView] = useState<"CALENDAR" | "SCHEDULER">("CALENDAR");
  const [anchorDate, setAnchorDate] = useState<string>(today); // calendar 5w anchor
  const [selectedDate, setSelectedDate] = useState<string>(today); // scheduler date

  // UI state
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isCategoryEdit, setIsCategoryEdit] = useState(false);

  const [moreOpen, setMoreOpen] = useState(false);
  const [moreDate, setMoreDate] = useState<string>(today);

  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    content: React.ReactNode;
  } | null>(null);

  // scheduler modals
  const [editTimedOpen, setEditTimedOpen] = useState(false);
  const [editTimedId, setEditTimedId] = useState<string | null>(null);

  const [editDateOpen, setEditDateOpen] = useState(false);
  const [editDateId, setEditDateId] = useState<string | null>(null);

  // load / save
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AppState;
      // light validation
      if (parsed?.categories && parsed?.dateEvents && parsed?.timedEvents) setState(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // category lookup
  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of state.categories) m.set(c.id, c);
    return m;
  }, [state.categories]);

  // ensure yearly holidays exist (fixed-date) when year changes / first use
  useEffect(() => {
    const year = fromLocalYMD(today).getFullYear();
    const hasYear = state.dateEvents.some((e) => e.isSystem && e.date.startsWith(`${year}-`));
    if (hasYear) return;
    setState((s) => ({
      ...s,
      dateEvents: [...s.dateEvents, ...seedKoreanFixedHolidays(year)],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // -----------------------------
  // Derived: calendar 5-week grid (Mon start)
  // -----------------------------
  const gridDays = useMemo(() => {
    const weekStart = startOfWeekMonday(anchorDate);
    const start = addDays(weekStart, -7); // previous 1 week
    const days: string[] = [];
    for (let i = 0; i < 35; i++) days.push(addDays(start, i));
    return days;
  }, [anchorDate]);

  // Upcoming (30 days, High+)
  const upcoming = useMemo(() => {
    const start = fromLocalYMD(today);
    const end = fromLocalYMD(addDays(today, 30));
    const items: {
      kind: "DATE" | "TIMED";
      date: string;
      startMin?: number;
      title: string;
      importance: Importance;
      categoryId: string;
    }[] = [];

    for (const e of state.dateEvents) {
      if (e.isEnabled === false) continue;
      const dt = fromLocalYMD(e.date);
      if (dt < start || dt > end) continue;
      if (!isHighPlus(e.importance)) continue;
      items.push({
        kind: "DATE",
        date: e.date,
        title: e.title,
        importance: e.importance,
        categoryId: e.categoryId,
      });
    }

    for (const t of state.timedEvents) {
      const dt = fromLocalYMD(t.anchorDate);
      if (dt < start || dt > end) continue;
      if (!isHighPlus(t.importance)) continue;
      items.push({
        kind: "TIMED",
        date: t.anchorDate,
        startMin: t.startMin,
        title: t.title,
        importance: t.importance,
        categoryId: t.categoryId,
      });
    }

    items.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const sa = a.startMin ?? -1;
      const sb = b.startMin ?? -1;
      if (sa !== sb) return sa - sb;
      return importanceOrder[b.importance] - importanceOrder[a.importance];
    });

    return items.slice(0, 10);
  }, [state.dateEvents, state.timedEvents, today]);

  // -----------------------------
  // Mutations: Categories
  // -----------------------------
  function updateCategory(catId: string, patch: Partial<Category>) {
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === catId ? { ...c, ...patch } : c)),
    }));
  }

  function addCategory(name: string, color: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      categories: [
        ...s.categories,
        { id: uid("cat"), name: trimmed, color, isEnabled: true },
      ],
    }));
  }

  function tryDeleteCategory(catId: string) {
    const cat = catById.get(catId);
    if (!cat) return;
    if (cat.isSystem) return;

    const usedCount =
      state.dateEvents.filter((e) => e.categoryId === catId).length +
      state.timedEvents.filter((t) => t.categoryId === catId).length;

    if (usedCount > 0) {
      alert(`This category is in use by ${usedCount} event(s). Delete is blocked.`);
      return;
    }

    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== catId),
    }));
  }

  // -----------------------------
  // Mutations: Events
  // -----------------------------
  function addDateEvent(e: Omit<DateEvent, "id" | "createdAt" | "kind">) {
    setState((s) => ({
      ...s,
      dateEvents: [
        ...s.dateEvents,
        { ...e, id: uid("de"), kind: "DATE", createdAt: Date.now() },
      ],
    }));
  }

  function updateDateEvent(id: string, patch: Partial<DateEvent>) {
    setState((s) => ({
      ...s,
      dateEvents: s.dateEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }

  function deleteDateEvent(id: string) {
    const ev = state.dateEvents.find((e) => e.id === id);
    if (!ev) return;
    if (ev.isSystem) return; // 보호
    setState((s) => ({ ...s, dateEvents: s.dateEvents.filter((e) => e.id !== id) }));
  }

  function addTimedEvent(e: Omit<TimedEvent, "id" | "createdAt" | "kind">) {
    setState((s) => ({
      ...s,
      timedEvents: [
        ...s.timedEvents,
        { ...e, id: uid("te"), kind: "TIMED", createdAt: Date.now() },
      ],
    }));
  }

  function updateTimedEvent(id: string, patch: Partial<TimedEvent>) {
    setState((s) => ({
      ...s,
      timedEvents: s.timedEvents.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }

  function deleteTimedEvent(id: string) {
    setState((s) => ({ ...s, timedEvents: s.timedEvents.filter((t) => t.id !== id) }));
  }

  // -----------------------------
  // Calendar cell: build display list (max 5) + More
  // Rules (final):
  // - Always include High/Critical TimedEvents
  // - Prefer showing TimeEvents in time order
  // - DateEvents included, but when overflow: cut LOW first, then MIDDLE (High/Critical preserved)
  // - If still overflow (rare): show first 5 and expose More
  // -----------------------------
  function buildDayDisplay(ymd: string) {
    const dateEvsAll = state.dateEvents
      .filter((e) => e.date === ymd && e.isEnabled !== false)
      .slice();

    const timedAll = state.timedEvents.filter((t) => t.anchorDate === ymd).slice();

    // Sort date events by importance desc then createdAt
    dateEvsAll.sort((a, b) => {
      const di = importanceOrder[b.importance] - importanceOrder[a.importance];
      if (di !== 0) return di;
      return a.createdAt - b.createdAt;
    });

    const timedMandatory = timedAll
      .filter((t) => isHighPlus(t.importance))
      .sort((a, b) => a.startMin - b.startMin);

    const timedOthers = timedAll
      .filter((t) => !isHighPlus(t.importance))
      .sort((a, b) => a.startMin - b.startMin);

    // Start with all date events + mandatory timed
    let chosenDate = [...dateEvsAll];
    const chosenTimed: TimedEvent[] = [...timedMandatory];

    // Cut date events LOW then MIDDLE if (date + mandatory) exceeds 5
    function canCut(e: DateEvent) {
      return e.importance === "LOW" || e.importance === "MIDDLE";
    }
    while (chosenDate.length + chosenTimed.length > 5) {
      const idx = [...chosenDate].reverse().findIndex((e) => canCut(e));
      if (idx === -1) break;
      // reverse index -> real index
      const realIdx = chosenDate.length - 1 - idx;
      chosenDate.splice(realIdx, 1);
    }

    // Fill remaining slots with timedOthers in time order
    const capacity = 5 - (chosenDate.length + chosenTimed.length);
    const addCount = Math.max(0, capacity);
    chosenTimed.push(...timedOthers.slice(0, addCount));

    // Determine overflow (More)
    const totalRelevant = dateEvsAll.length + timedAll.length;
    const displayedCount = chosenDate.length + chosenTimed.length;
    const hasMore = totalRelevant > displayedCount;

    // Final ordering: Date then Time(time asc)
    chosenTimed.sort((a, b) => a.startMin - b.startMin);

    return {
      dateItems: chosenDate,
      timedItems: chosenTimed,
      hasMore,
      totalRelevant,
      displayedCount,
    };
  }

  // -----------------------------
  // Hover helpers
  // -----------------------------
  function showHover(
    ev: React.MouseEvent,
    content: React.ReactNode
  ) {
    const x = ev.clientX + 12;
    const y = ev.clientY + 12;
    setHoverInfo({ x, y, content });
  }
  function hideHover() {
    setHoverInfo(null);
  }

  // -----------------------------
  // Scheduler derived
  // -----------------------------
  const schedulerDateEvents = useMemo(() => {
    return state.dateEvents
      .filter((e) => e.date === selectedDate && e.isEnabled !== false)
      .sort((a, b) => importanceOrder[b.importance] - importanceOrder[a.importance]);
  }, [state.dateEvents, selectedDate]);

  const schedulerTimedEvents = useMemo(() => {
    return state.timedEvents
      .filter((t) => t.anchorDate === selectedDate)
      .sort((a, b) => a.startMin - b.startMin);
  }, [state.timedEvents, selectedDate]);

  const selectedTimed = useMemo(() => {
    if (!editTimedId) return null;
    return state.timedEvents.find((t) => t.id === editTimedId) ?? null;
  }, [state.timedEvents, editTimedId]);

  const selectedDateEvent = useMemo(() => {
    if (!editDateId) return null;
    return state.dateEvents.find((d) => d.id === editDateId) ?? null;
  }, [state.dateEvents, editDateId]);

  // -----------------------------
  // UI: background wrapper
  // -----------------------------
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/bg-lifnux.png)" }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Top-left quick nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
          >
            ← LIFNUX
          </Link>

          <div className="text-xs tracking-widest text-white/60">
            CALENDAR MODULE
          </div>
        </div>

        <div className="text-xs text-white/60">
          <span className="tracking-widest">MODE</span>{" "}
          <span className="ml-2 rounded-full border border-white/15 bg-white/5 px-2 py-1">
            {view}
          </span>
        </div>
      </div>

      {/* Content */}
      <section className="relative z-10 px-6 pb-10">
        <div className="mx-auto w-full max-w-[92vw]">
          {view === "CALENDAR" ? (
            <CalendarView
  today={today}
  anchorDate={anchorDate}
  setAnchorDate={setAnchorDate}
  onOpenScheduler={(ymd) => {
    setSelectedDate(ymd);
    setView("SCHEDULER");
  }}
  gridDays={gridDays}
  buildDayDisplay={buildDayDisplay}
  categories={state.categories}
  catById={catById}
  upcoming={upcoming}
  isCategoryEdit={isCategoryEdit}
  setIsCategoryEdit={setIsCategoryEdit}
  addCategory={addCategory}
  updateCategory={updateCategory}
  tryDeleteCategory={tryDeleteCategory}
  openMore={(ymd) => {
    setMoreDate(ymd);
    setMoreOpen(true);
  }}
  onHover={showHover}
  onHoverOut={hideHover}
  // ✅ STATUS props (이게 핵심)
  companyName={state.companyName}
  isEmployed={state.isEmployed}
  employmentStartDate={state.employmentStartDate}
  employmentEndDate={state.employmentEndDate || ""}
  remainingLeaveMinutes={state.remainingLeaveMinutes}
  isEditingStatus={isEditingStatus}
  setIsEditingStatus={setIsEditingStatus}
  updateStatus={(patch) => setState((s) => ({ ...s, ...patch }))}
/>
          ) : (
            <SchedulerView
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              onBackToCalendar={() => setView("CALENDAR")}
              categories={state.categories}
              catById={catById}
              dateEvents={schedulerDateEvents}
              timedEvents={schedulerTimedEvents}
              addDateEvent={addDateEvent}
              updateDateEvent={updateDateEvent}
              deleteDateEvent={deleteDateEvent}
              addTimedEvent={addTimedEvent}
              updateTimedEvent={updateTimedEvent}
              deleteTimedEvent={deleteTimedEvent}
              openEditTimed={(id) => {
                setEditTimedId(id);
                setEditTimedOpen(true);
              }}
              openEditDate={(id) => {
                setEditDateId(id);
                setEditDateOpen(true);
              }}
            />
          )}
        </div>
      </section>

      {/* Hover tooltip */}
      {hoverInfo ? (
        <div
          className="pointer-events-none fixed z-[90]"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          {hoverInfo.content}
        </div>
      ) : null}

      {/* More Modal */}
      <Modal
        open={moreOpen}
        title={`All events on ${moreDate} (${formatMD(moreDate)})`}
        onClose={() => setMoreOpen(false)}
      >
        <AllEventsList
          date={moreDate}
          categories={state.categories}
          catById={catById}
          dateEvents={state.dateEvents.filter((e) => e.date === moreDate && e.isEnabled !== false)}
          timedEvents={state.timedEvents.filter((t) => t.anchorDate === moreDate)}
        />
      </Modal>

      {/* Edit Timed Modal */}
      <Modal
        open={editTimedOpen}
        title="Edit Timed Event"
        onClose={() => {
          setEditTimedOpen(false);
          setEditTimedId(null);
        }}
      >
        {selectedTimed ? (
          <TimedEventEditor
            categories={state.categories}
            value={selectedTimed}
            onChange={(patch) => updateTimedEvent(selectedTimed.id, patch)}
            onDelete={() => {
              deleteTimedEvent(selectedTimed.id);
              setEditTimedOpen(false);
              setEditTimedId(null);
            }}
          />
        ) : (
          <div className="text-sm text-white/70">Event not found.</div>
        )}
      </Modal>

      {/* Edit Date Modal */}
      <Modal
        open={editDateOpen}
        title="Edit Date Event"
        onClose={() => {
          setEditDateOpen(false);
          setEditDateId(null);
        }}
      >
        {selectedDateEvent ? (
          <DateEventEditor
            categories={state.categories}
            value={selectedDateEvent}
            onChange={(patch) => updateDateEvent(selectedDateEvent.id, patch)}
            onDelete={() => {
              deleteDateEvent(selectedDateEvent.id);
              setEditDateOpen(false);
              setEditDateId(null);
            }}
          />
        ) : (
          <div className="text-sm text-white/70">Event not found.</div>
        )}
      </Modal>
    </main>
  );
}

// -----------------------------
// Calendar View
// -----------------------------
function CalendarView(props: {
  today: string;
  anchorDate: string;
  setAnchorDate: (d: string) => void;
  onOpenScheduler: (ymd: string) => void;
  gridDays: string[];
  buildDayDisplay: (ymd: string) => {
    dateItems: DateEvent[];
    timedItems: TimedEvent[];
    hasMore: boolean;
    totalRelevant: number;
    displayedCount: number;
  };
  categories: Category[];
  catById: Map<string, Category>;

  // ✅ STATUS
  companyName: string;
  isEmployed: boolean;
  employmentStartDate: string;
  employmentEndDate: string;
  remainingLeaveMinutes: number;

  isEditingStatus: boolean;
  setIsEditingStatus: (v: boolean) => void;
  updateStatus: (patch: Partial<AppState>) => void;

  upcoming: {
    kind: "DATE" | "TIMED";
    date: string;
    startMin?: number;
    title: string;
    importance: Importance;
    categoryId: string;
  }[];

  isCategoryEdit: boolean;
  setIsCategoryEdit: (v: boolean) => void;
  addCategory: (name: string, color: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  tryDeleteCategory: (id: string) => void;
  openMore: (ymd: string) => void;
  onHover: (ev: React.MouseEvent, content: React.ReactNode) => void;
  onHoverOut: () => void;
}) {
  const {
    today,
    anchorDate,
    setAnchorDate,
    onOpenScheduler,
    gridDays,
    buildDayDisplay,
    categories,
    catById,
    companyName,
 isEmployed,
  employmentStartDate,
  employmentEndDate,
  remainingLeaveMinutes,
    isEditingStatus,
    setIsEditingStatus,
    updateStatus,
    upcoming,
    isCategoryEdit,
    setIsCategoryEdit,
    addCategory,
    updateCategory,
    tryDeleteCategory,
    openMore,
    onHover,
    onHoverOut,

  } = props;

// 근무일수 계산 (재직중이면 today까지, 아니면 endDate까지)
const employmentDays = useMemo(() => {
  const start = employmentStartDate ? fromLocalYMD(employmentStartDate) : null;
  if (!start) return 0;

  const endStr =
    isEmployed
      ? today
      : (employmentEndDate && employmentEndDate.trim() ? employmentEndDate : today);

  const end = fromLocalYMD(endStr);

  // day diff (inclusive 원하면 +1, 보통은 경과일이라 floor)
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return 0;

  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1; // inclusive
}, [employmentStartDate, employmentEndDate, isEmployed, today]);

  const [companyDraft, setCompanyDraft] = useState(companyName);


// 근무 상태 draft
const [employedDraft, setEmployedDraft] = useState(isEmployed);
const [startDraft, setStartDraft] = useState(employmentStartDate);
const [endDraft, setEndDraft] = useState(employmentEndDate || "");

// 연차 D/H 분리 draft
const initLeave = formatLeave(remainingLeaveMinutes);
const [leaveDayDraft, setLeaveDayDraft] = useState(String(initLeave.d));
const [leaveHourDraft, setLeaveHourDraft] = useState(String(initLeave.h));

  useEffect(() => setCompanyDraft(companyName), [companyName]);
  useEffect(() => {
  setLeaveDraft(formatLeave(remainingLeaveMinutes).label);
}, [remainingLeaveMinutes]);
useEffect(() => {
  const f = formatLeave(remainingLeaveMinutes);
  setLeaveDayDraft(String(f.d));
  setLeaveHourDraft(String(f.h));
}, [remainingLeaveMinutes]);

  const [jumpDate, setJumpDate] = useState(anchorDate);
  useEffect(() => setJumpDate(anchorDate), [anchorDate]);

  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6ee7ff");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* LEFT */}
      <div className="space-y-6">
    {/* Status Bar */}
<div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
  <div className="flex items-center justify-between">
    <div className="text-xs tracking-widest text-white/70">STATUS</div>
    <button
  onClick={() => {
    if (isEditingStatus) {
      updateStatus({
        companyName: companyDraft.trim() || "COMPANY",
      const d = Number(leaveDayDraft);
const h = Number(leaveHourDraft);
const minutes =
  (Number.isFinite(d) ? d : 0) * 8 * 60 +
  (Number.isFinite(h) ? h : 0) * 60;

updateStatus({
  companyName: companyDraft.trim() || "COMPANY",
  remainingLeaveMinutes: Math.max(0, Math.round(minutes)),
  isEmployed: employedDraft,
  employmentStartDate: startDraft,
  employmentEndDate: employedDraft ? "" : endDraft,
});
        isEmployed: employedDraft,
        employmentStartDate: startDraft,
        employmentEndDate: employedDraft ? "" : endDraft,
      });
    }
    setIsEditingStatus(!isEditingStatus);
  }}
  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
>
  {isEditingStatus ? "Save" : "Edit"}
</button>
  </div>

  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
    {/* Company */}
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] tracking-widest text-white/50">COMPANY</div>
      {isEditingStatus ? (
        <input
          value={companyDraft}
          onChange={(e) => setCompanyDraft(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
        />
      ) : (
        <div className="mt-2 text-lg font-semibold tracking-wider">{companyName}</div>
      )}
    </div>

    {/* Remaining Leave (minutes) */}
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[11px] tracking-widest text-white/50">REMAINING LEAVE</div>
      {isEditingStatus ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={leaveDayDraft}
            onChange={(e) => setLeaveDayDraft(e.target.value)}
            inputMode="numeric"
            placeholder="D"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          />
          <input
            value={leaveHourDraft}
            onChange={(e) => setLeaveHourDraft(e.target.value)}
            inputMode="numeric"
            placeholder="H"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          />
        </div>
      ) : (
        <div className="mt-2 text-lg font-semibold tracking-wider">
          {Math.floor(remainingLeaveMinutes / (60 * 8))}D {Math.floor((remainingLeaveMinutes % (60 * 8)) / 60)}H
        </div>
      )}
      <div className="mt-1 text-[11px] text-white/45">Assume 1D = 8H</div>
    </div>
  </div>

  {/* Employment */}
  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
    <div className="flex items-center justify-between">
      <div className="text-[11px] tracking-widest text-white/50">EMPLOYMENT</div>

      {isEditingStatus ? (
        <label className="flex items-center gap-2 text-[11px] tracking-widest text-white/70">
          <input
            type="checkbox"
            checked={employedDraft}
            onChange={(e) => setEmployedDraft(e.target.checked)}
          />
          EMPLOYED
        </label>
      ) : (
        <span className="text-[11px] tracking-widest text-white/60">
          {isEmployed ? "EMPLOYED" : "NOT EMPLOYED"}
        </span>
      )}
    </div>

    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
        <div className="text-[10px] tracking-widest text-white/50">START</div>
        {isEditingStatus ? (
          <input
            type="date"
            value={startDraft}
            onChange={(e) => setStartDraft(e.target.value)}
            className="mt-1 w-full bg-transparent text-xs outline-none"
          />
        ) : (
          <div className="mt-1 font-mono">{employmentStartDate}</div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
        <div className="text-[10px] tracking-widest text-white/50">END</div>
        {isEditingStatus ? (
          <input
            type="date"
            value={endDraft}
            onChange={(e) => setEndDraft(e.target.value)}
            disabled={employedDraft}
            className="mt-1 w-full bg-transparent text-xs outline-none disabled:opacity-40"
          />
        ) : (
          <div className="mt-1 font-mono">{isEmployed ? "-" : (employmentEndDate || "-")}</div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80">
        <div className="text-[10px] tracking-widest text-white/50">DAYS</div>
        <div className="mt-1 font-semibold">{employmentDays} days</div>
      </div>
    </div>
  </div>
</div>


        {/* Upcoming */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-widest text-white/70">UPCOMING (30D) · HIGH+</div>
            <div className="text-xs text-white/50">{upcoming.length}/10</div>
          </div>

          <div className="mt-3 space-y-2">
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/60">
                No High/Critical events in the next 30 days.
              </div>
            ) : (
              upcoming.map((u, idx) => {
                const cat = catById.get(u.categoryId);
                const dt = fromLocalYMD(u.date);
                const dd = Math.ceil((dt.getTime() - fromLocalYMD(today).getTime()) / (1000 * 60 * 60 * 24));
                const dLabel = dd === 0 ? "D-Day" : dd > 0 ? `D-${dd}` : `D+${Math.abs(dd)}`;
                const time = u.kind === "TIMED" && typeof u.startMin === "number" ? minToClock(u.startMin) : "";
                return (
                  <div
                    key={`${u.kind}_${u.date}_${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className={`w-14 text-[11px] tracking-widest ${isHighPlus(u.importance) ? "text-red-200" : "text-white/70"}`}>
                      {dLabel}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {cat ? <Dot color={cat.color} /> : null}
                      <div className={`truncate text-sm ${u.importance === "CRITICAL" || u.importance === "HIGH" ? "font-semibold text-white" : "text-white/80"}`}>
                        {time ? `${time} ` : ""}{u.title}
                      </div>
                    </div>
                    <BadgeImportance imp={u.importance} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Calendar Nav */}
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs tracking-widest text-white/70">CALENDAR</div>
             <div className="mt-1 text-lg font-semibold tracking-wider">
  Today: {today}
</div>

            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAnchorDate(addDays(anchorDate, -7))}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
              >
                ◀ PREV
              </button>
              <button
                onClick={() => setAnchorDate(today)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
              >
                TODAY
              </button>
              <button
                onClick={() => setAnchorDate(addDays(anchorDate, 7))}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
              >
                NEXT ▶
              </button>

              <div className="ml-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-[11px] tracking-widest text-white/50">JUMP</span>
                <input
                  type="date"
                  value={jumpDate}
                  onChange={(e) => setJumpDate(e.target.value)}
                  className="bg-transparent text-xs text-white/80 outline-none"
                />
                <button
                  onClick={() => jumpDate && setAnchorDate(jumpDate)}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                >
                  GO
                </button>
              </div>
            </div>
          </div>
{/* Weekday header */}
<div className="mt-4 grid grid-cols-7 gap-2 text-center">
  {Array.from({ length: 7 }).map((_, i) => {
    const isWeekend = i === 5 || i === 6; // Sat=5, Sun=6 (Mon first)
    return (
      <div
        key={i}
        className={`text-[11px] tracking-widest ${
          isWeekend ? "text-red-300/80" : "text-white/50"
        }`}
      >
        {weekdayLabelMonFirst(i)}
      </div>
    );
  })}
</div>          
          {/* Grid */}
          <div className="mt-2 grid grid-cols-7 gap-2">
            {gridDays.map((ymd) => {
              const { dateItems, timedItems, hasMore } = buildDayDisplay(ymd);
              const isCurr = isToday(ymd);
              const dayNum = fromLocalYMD(ymd).getDate();
	      const dow = fromLocalYMD(ymd).getDay(); // 0 Sun ... 6 Sat
              const isWeekendDay = dow === 0 || dow === 6;

              return (
                <div
                  key={ymd}
                  className={`group relative min-h-[108px] rounded-2xl border p-2 backdrop-blur-md transition ${
                    isCurr ? "border-white/35 bg-white/10" : "border-white/12 bg-white/5 hover:bg-white/8"
                  }`}
                  onClick={() => onOpenScheduler(ymd)}
                >
                  <div className="flex items-center justify-between">
                    <div
  className={`text-xs font-semibold ${
    isCurr
      ? "text-white"
      : isWeekendDay
      ? "text-red-200/90"
      : "text-white/80"
  }`}
>
  {dayNum}
</div>
                    {ymd === today ? (
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] tracking-widest text-white/70">
                        TODAY
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dateItems.map((e) => {
                      const cat = catById.get(e.categoryId);
                      const critical = e.importance === "CRITICAL";
                      const high = e.importance === "HIGH";
                      const lineClass =
                        critical || high ? "font-semibold text-red-100" : "text-white/80";
                      return (
                        <div
                          key={e.id}
                          className={`flex items-center gap-2 text-[11px] ${lineClass}`}
                          onMouseEnter={(ev) =>
                            onHover(
                              ev,
                              <TooltipCard
                                title={e.title}
                                categoryName={cat?.name}
                                categoryColor={cat?.color}
                                importance={e.importance}
                                note={e.note?.trim() || undefined}
                              />
                            )
                          }
                          onMouseLeave={onHoverOut}
                          onClick={(ev) => {
                            // prevent parent click if user wants tooltip click behavior
                            ev.stopPropagation();
                            // open scheduler anyway (consistent)
                            onOpenScheduler(ymd);
                          }}
                        >
                          {cat ? <Dot color={cat.color} /> : null}
                          <span className="truncate">{e.title}</span>
                        </div>
                      );
                    })}

                    {timedItems.map((t) => {
                      const cat = catById.get(t.categoryId);
                      const critical = t.importance === "CRITICAL";
                      const high = t.importance === "HIGH";
                      const lineClass =
                        critical || high ? "font-semibold text-red-100" : "text-white/80";
                      return (
                        <div
                          key={t.id}
                          className={`flex items-center gap-2 text-[11px] ${lineClass}`}
                          onMouseEnter={(ev) =>
                            onHover(
                              ev,
                              <TooltipCard
                                title={t.title}
                                timeRange={`${minToClock(t.startMin)}–${minToClock(t.endMin)}`}
                                categoryName={cat?.name}
                                categoryColor={cat?.color}
                                importance={t.importance}
                                location={t.location?.trim() || undefined}
                                note={t.note?.trim() || undefined}
                              />
                            )
                          }
                          onMouseLeave={onHoverOut}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onOpenScheduler(ymd);
                          }}
                        >
                          <span className="w-10 shrink-0 text-[10px] tracking-widest text-white/60">
                            {minToClock(t.startMin)}
                          </span>
                          {cat ? <Dot color={cat.color} /> : null}
                          <span className="truncate">{t.title}</span>
                        </div>
                      );
                    })}

                    {hasMore ? (
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openMore(ymd);
                        }}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] tracking-widest text-white/70 hover:bg-white/10"
                      >
                        + MORE
                      </button>
                    ) : null}
                  </div>

                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-white/10" />
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-white/50">
            Click a date to open Scheduler (07:00–06:00).
          </div>
        </div>
      </div>

      {/* RIGHT: Category Sidebar */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-widest text-white/70">CATEGORIES</div>
            <button
              onClick={() => setIsCategoryEdit(!isCategoryEdit)}
              className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
              title="Edit categories"
            >
              {isCategoryEdit ? "Done" : "✎ Edit"}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {categories.map((c) => {
              const enabled = c.isEnabled !== false;
              return (
                <div key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center gap-2">
                    <Dot color={c.color} />
                    {isCategoryEdit ? (
                      <input
                        value={c.name}
                        onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/90 outline-none"
                      />
                    ) : (
                      <div className="min-w-0 flex-1 truncate text-sm text-white/85">
                        {c.name}
                      </div>
                    )}

                    {c.isSystem ? (
                      <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] tracking-widest text-white/60">
                        SYSTEM
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
  {/* LEFT: color */}
  <div className="flex min-w-0 items-center gap-2">
    <span className="text-[10px] tracking-widest text-white/50">COLOR</span>
    <input
      type="color"
      value={c.color}
      onChange={(e) => updateCategory(c.id, { color: e.target.value })}
      className="h-8 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
      title={c.color}
    />
    <span className="truncate text-[10px] text-white/60">{c.color}</span>
  </div>

  {/* RIGHT: enabled + delete (never overflow) */}
  <div className="flex items-center justify-end gap-2">
    <label className="flex items-center gap-2 text-[10px] tracking-widest text-white/60">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => updateCategory(c.id, { isEnabled: e.target.checked })}
      />
      ENABLED
    </label>

    <button
      onClick={() => tryDeleteCategory(c.id)}
      disabled={!!c.isSystem}
      className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] tracking-widest ${
        c.isSystem
          ? "border-white/10 bg-white/5 text-white/30"
          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      DELETE
    </button>
  </div>
</div>
                </div>
              );
            })}
          </div>

          {isCategoryEdit ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] tracking-widest text-white/60">ADD CATEGORY</div>
            <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
  {/* LEFT: inputs */}
  <div className="flex min-w-0 items-center gap-2">
    <input
      value={newCatName}
      onChange={(e) => setNewCatName(e.target.value)}
      placeholder="Name"
      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white/90 outline-none"
    />
    <input
      type="color"
      value={newCatColor}
      onChange={(e) => setNewCatColor(e.target.value)}
      className="h-10 w-12 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent"
      title={newCatColor}
    />
  </div>

  {/* RIGHT: button */}
  <button
    onClick={() => {
      addCategory(newCatName, newCatColor);
      setNewCatName("");
    }}
    className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
  >
    ADD
  </button>
</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Scheduler View (07:00 ~ next 06:00)
// -----------------------------
function SchedulerView(props: {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  onBackToCalendar: () => void;
  categories: Category[];
  catById: Map<string, Category>;
  dateEvents: DateEvent[];
  timedEvents: TimedEvent[];
  addDateEvent: (e: Omit<DateEvent, "id" | "createdAt" | "kind">) => void;
  updateDateEvent: (id: string, patch: Partial<DateEvent>) => void;
  deleteDateEvent: (id: string) => void;
  addTimedEvent: (e: Omit<TimedEvent, "id" | "createdAt" | "kind">) => void;
  updateTimedEvent: (id: string, patch: Partial<TimedEvent>) => void;
  deleteTimedEvent: (id: string) => void;
  openEditTimed: (id: string) => void;
  openEditDate: (id: string) => void;
}) {
  const {
    selectedDate,
    setSelectedDate,
    onBackToCalendar,
    categories,
    catById,
    dateEvents,
    timedEvents,
    addDateEvent,
    addTimedEvent,
    openEditTimed,
    openEditDate,
  } = props;

  // DateEvent add form
  const [deTitle, setDeTitle] = useState("");
  const [deCat, setDeCat] = useState(categories.find((c) => c.isEnabled !== false)?.id ?? categories[0]?.id ?? "cat_general");
  const [deImp, setDeImp] = useState<Importance>("LOW");
  const [deNote, setDeNote] = useState("");

  useEffect(() => {
    const firstEnabled = categories.find((c) => c.isEnabled !== false)?.id;
    if (firstEnabled) setDeCat(firstEnabled);
  }, [categories]);

  // Timed add form
  const [teTitle, setTeTitle] = useState("");
  const [teCat, setTeCat] = useState(categories.find((c) => c.isEnabled !== false)?.id ?? categories[0]?.id ?? "cat_general");
  const [teImp, setTeImp] = useState<Importance>("LOW");
  const [teStart, setTeStart] = useState(120); // 09:00
  const [teEnd, setTeEnd] = useState(180); // 10:00
  const [teLoc, setTeLoc] = useState("");
  const [teNote, setTeNote] = useState("");

  function safeCatOptions() {
    return categories.filter((c) => c.isEnabled !== false);
  }

  // timeline rows
  const rows = useMemo(() => TIME_OPTIONS.map((t) => t.value), []);

  const dayLabel = useMemo(() => `${selectedDate} (${formatMD(selectedDate)})`, [selectedDate]);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToCalendar}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
          >
            ← CALENDAR
          </button>
          <div className="text-xs tracking-widest text-white/60">SCHEDULER</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
          >
            ◀ DAY
          </button>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold tracking-wider">
            {dayLabel}
          </div>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, +1))}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
          >
            DAY ▶
          </button>
        </div>
      </div>

      {/* Date Events (All-day) */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-widest text-white/70">DATE EVENTS (ALL-DAY)</div>
          <div className="text-xs text-white/50">{dateEvents.length}</div>
        </div>

        <div className="mt-3 space-y-2">
          {dateEvents.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/60">
              No date events.
            </div>
          ) : (
            dateEvents.map((e) => {
              const cat = catById.get(e.categoryId);
              const important = isHighPlus(e.importance);
              return (
                <button
                  key={e.id}
                  onClick={() => openEditDate(e.id)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                >
                  <div className="flex items-center gap-2">
                    {cat ? <Dot color={cat.color} /> : null}
                    <div className={`min-w-0 flex-1 truncate ${important ? "font-semibold text-red-100" : "text-white/85"}`}>
                      {e.title}
                    </div>
                    <BadgeImportance imp={e.importance} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Add DateEvent */}
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] tracking-widest text-white/60">ADD DATE EVENT</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <input
              value={deTitle}
              onChange={(e) => setDeTitle(e.target.value)}
              placeholder="Title"
              className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            />
            <select
              value={deCat}
              onChange={(e) => setDeCat(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            >
              {safeCatOptions().map((c) => (
                <option key={c.id} value={c.id} className="bg-black">
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={deImp}
              onChange={(e) => setDeImp(e.target.value as Importance)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            >
              <option value="LOW" className="bg-black">Low</option>
              <option value="MIDDLE" className="bg-black">Middle</option>
              <option value="HIGH" className="bg-black">High</option>
              <option value="CRITICAL" className="bg-black">Critical</option>
            </select>
          </div>

          <textarea
            value={deNote}
            onChange={(e) => setDeNote(e.target.value)}
            placeholder="Note (optional)"
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            rows={2}
          />

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => {
                const title = deTitle.trim();
                if (!title) return;
                addDateEvent({
                  date: selectedDate,
                  title,
                  categoryId: deCat,
                  importance: deImp,
                  note: deNote.trim() || "",
                  isSystem: false,
                  isEnabled: true,
                });
                setDeTitle("");
                setDeNote("");
                setDeImp("LOW");
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
            >
              ADD
            </button>
          </div>
        </div>
      </div>

      {/* Timed Events */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-widest text-white/70">TIMED EVENTS (07:00–06:00)</div>
          <div className="text-xs text-white/50">{timedEvents.length}</div>
        </div>

        {/* Add TimedEvent */}
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] tracking-widest text-white/60">ADD TIMED EVENT</div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-6">
            <input
              value={teTitle}
              onChange={(e) => setTeTitle(e.target.value)}
              placeholder="Title"
              className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            />
            <select
              value={teStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                setTeStart(v);
                if (teEnd <= v) setTeEnd(Math.min(v + 30, 1440));
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value} className="bg-black">
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={teEnd}
              onChange={(e) => setTeEnd(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            >
              {TIME_OPTIONS.map((t) => (
                <option
                  key={t.value}
                  value={t.value}
                  disabled={t.value <= teStart}
                  className="bg-black"
                >
                  {t.label}
                </option>
              ))}
              {/* allow 06:00 exactly */}
              <option value={1440} disabled={1440 <= teStart} className="bg-black">
                06:00
              </option>
            </select>

            <select
              value={teCat}
              onChange={(e) => setTeCat(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            >
              {safeCatOptions().map((c) => (
                <option key={c.id} value={c.id} className="bg-black">
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={teImp}
              onChange={(e) => setTeImp(e.target.value as Importance)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            >
              <option value="LOW" className="bg-black">Low</option>
              <option value="MIDDLE" className="bg-black">Middle</option>
              <option value="HIGH" className="bg-black">High</option>
              <option value="CRITICAL" className="bg-black">Critical</option>
            </select>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={teLoc}
              onChange={(e) => setTeLoc(e.target.value)}
              placeholder="Location (optional) — for future map integration"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            />
            <input
              value={teNote}
              onChange={(e) => setTeNote(e.target.value)}
              placeholder="Note (optional)"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            />
          </div>

          <div className="mt-2 flex justify-end">
            <button
              onClick={() => {
                const title = teTitle.trim();
                if (!title) return;
                if (teEnd <= teStart) return;
                addTimedEvent({
                  anchorDate: selectedDate,
                  startMin: teStart,
                  endMin: teEnd,
                  title,
                  categoryId: teCat,
                  importance: teImp,
                  location: teLoc.trim() || "",
                  note: teNote.trim() || "",
                });
                setTeTitle("");
                setTeLoc("");
                setTeNote("");
                setTeImp("LOW");
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs tracking-widest text-white/80 hover:bg-white/10"
            >
              ADD
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4 grid grid-cols-[84px_1fr] gap-2">
          {/* Left times */}
          <div className="space-y-2">
            {rows.map((m) => (
              <div key={m} className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[11px] tracking-widest text-white/60">
                {minToClock(m)}
              </div>
            ))}
            <div className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[11px] tracking-widest text-white/60">
              06:00
            </div>
          </div>

          {/* Right: events list (simple MVP) */}
          <div className="space-y-2">
            {timedEvents.length === 0 ? (
              <div className="h-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No timed events.
              </div>
            ) : (
              timedEvents.map((t) => {
                const cat = catById.get(t.categoryId);
                const important = isHighPlus(t.importance);
                return (
                  <button
                    key={t.id}
                    onClick={() => openEditTimed(t.id)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-[11px] tracking-widest text-white/60">
                        {minToClock(t.startMin)}–{minToClock(t.endMin)}
                      </span>
                      {cat ? <Dot color={cat.color} /> : null}
                      <div className={`min-w-0 flex-1 truncate ${important ? "font-semibold text-red-100" : "text-white/85"}`}>
                        {t.title}
                      </div>
                      <BadgeImportance imp={t.importance} />
                    </div>
                    {(t.location?.trim() || t.note?.trim()) ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/55">
                        {t.location?.trim() ? (
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                            📍 {t.location}
                          </span>
                        ) : null}
                        {t.note?.trim() ? (
                          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5">
                            🗒 {t.note}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-white/50">
          (MVP) Timeline is shown as a formal list. Next upgrade: real block placement on 30m grid.
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// More modal list
// -----------------------------
function AllEventsList(props: {
  date: string;
  categories: Category[];
  catById: Map<string, Category>;
  dateEvents: DateEvent[];
  timedEvents: TimedEvent[];
}) {
  const { catById, dateEvents, timedEvents } = props;

  const all = useMemo(() => {
    const d = dateEvents
      .slice()
      .sort((a, b) => importanceOrder[b.importance] - importanceOrder[a.importance])
      .map((e) => ({
        kind: "DATE" as const,
        title: e.title,
        importance: e.importance,
        categoryId: e.categoryId,
        note: e.note || "",
        time: "",
      }));

    const t = timedEvents
      .slice()
      .sort((a, b) => a.startMin - b.startMin)
      .map((e) => ({
        kind: "TIMED" as const,
        title: e.title,
        importance: e.importance,
        categoryId: e.categoryId,
        note: e.note || "",
        time: `${minToClock(e.startMin)}–${minToClock(e.endMin)}`,
        location: e.location || "",
      }));

    return [...d, ...t];
  }, [dateEvents, timedEvents]);

  return (
    <div className="space-y-2">
      {all.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          No events.
        </div>
      ) : (
        all.map((it, idx) => {
          const cat = catById.get(it.categoryId);
          const important = isHighPlus(it.importance);
          return (
            <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                {it.time ? (
                  <span className="w-24 shrink-0 text-[11px] tracking-widest text-white/60">
                    {it.time}
                  </span>
                ) : (
                  <span className="w-24 shrink-0 text-[11px] tracking-widest text-white/40">
                    ALL-DAY
                  </span>
                )}
                {cat ? <Dot color={cat.color} /> : null}
                <div className={`min-w-0 flex-1 truncate ${important ? "font-semibold text-red-100" : "text-white/85"}`}>
                  {it.title}
                </div>
                <BadgeImportance imp={it.importance} />
              </div>
              {"location" in it && it.location?.trim() ? (
                <div className="mt-2 text-[11px] text-white/60">📍 {it.location}</div>
              ) : null}
              {"note" in it && (it as any).note?.trim() ? (
                <div className="mt-2 whitespace-pre-wrap text-[11px] text-white/60">
                  🗒 {(it as any).note}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

// -----------------------------
// Editors
// -----------------------------
function TimedEventEditor(props: {
  categories: Category[];
  value: TimedEvent;
  onChange: (patch: Partial<TimedEvent>) => void;
  onDelete: () => void;
}) {
  const { categories, value, onChange, onDelete } = props;
  const enabledCats = categories.filter((c) => c.isEnabled !== false);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <div className="text-[11px] tracking-widest text-white/60">TITLE</div>
          <input
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          />
        </div>

        <div>
          <div className="text-[11px] tracking-widest text-white/60">IMPORTANCE</div>
          <select
            value={value.importance}
            onChange={(e) => onChange({ importance: e.target.value as Importance })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          >
            <option value="LOW" className="bg-black">Low</option>
            <option value="MIDDLE" className="bg-black">Middle</option>
            <option value="HIGH" className="bg-black">High</option>
            <option value="CRITICAL" className="bg-black">Critical</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] tracking-widest text-white/60">START</div>
          <select
            value={value.startMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              const nextEnd = Math.max(v + 30, value.endMin);
              onChange({ startMin: v, endMin: Math.min(nextEnd, 1440) });
            }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} className="bg-black">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-[11px] tracking-widest text-white/60">END</div>
          <select
            value={value.endMin}
            onChange={(e) => onChange({ endMin: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value} disabled={t.value <= value.startMin} className="bg-black">
                {t.label}
              </option>
            ))}
                 <option value={1440} disabled={1440 <= value.startMin} className="bg-black">
              06:00
            </option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] tracking-widest text-white/60">CATEGORY</div>
          <select
            value={value.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          >
            {enabledCats.map((c) => (
              <option key={c.id} value={c.id} className="bg-black">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] tracking-widest text-white/60">LOCATION (optional)</div>
          <input
            value={value.location ?? ""}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g. Gangnam Station Exit 2"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] tracking-widest text-white/60">NOTE (optional)</div>
          <textarea
            value={value.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Write any memo..."
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            rows={4}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-white/50">
          Anchor date: <span className="font-mono">{value.anchorDate}</span>
        </div>

        <button
          onClick={onDelete}
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs tracking-widest text-red-100 hover:bg-red-500/15"
        >
          DELETE
        </button>
      </div>
    </div>
  );
}

function DateEventEditor(props: {
  categories: Category[];
  value: DateEvent;
  onChange: (patch: Partial<DateEvent>) => void;
  onDelete: () => void;
}) {
  const { categories, value, onChange, onDelete } = props;
  const enabledCats = categories.filter((c) => c.isEnabled !== false);

  const canDelete = !value.isSystem;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="text-[11px] tracking-widest text-white/60">TITLE</div>
          <input
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          />
        </div>

        <div>
          <div className="text-[11px] tracking-widest text-white/60">IMPORTANCE</div>
          <select
            value={value.importance}
            onChange={(e) => onChange({ importance: e.target.value as Importance })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          >
            <option value="LOW" className="bg-black">Low</option>
            <option value="MIDDLE" className="bg-black">Middle</option>
            <option value="HIGH" className="bg-black">High</option>
            <option value="CRITICAL" className="bg-black">Critical</option>
          </select>
        </div>

        <div>
          <div className="text-[11px] tracking-widest text-white/60">CATEGORY</div>
          <select
            value={value.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
          >
            {enabledCats.map((c) => (
              <option key={c.id} value={c.id} className="bg-black">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <div className="text-[11px] tracking-widest text-white/60">NOTE (optional)</div>
          <textarea
            value={value.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Write any memo..."
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none"
            rows={4}
          />
        </div>

        {/* System holiday controls: enable/disable */}
        {value.isSystem ? (
          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] tracking-widest text-white/60">SYSTEM EVENT</div>
                <div className="mt-1 text-xs text-white/55">
                  This is a protected holiday. You can edit fields, but delete is blocked.
                </div>
              </div>

              <label className="flex items-center gap-2 text-[11px] tracking-widest text-white/70">
                <input
                  type="checkbox"
                  checked={value.isEnabled !== false}
                  onChange={(e) => onChange({ isEnabled: e.target.checked })}
                />
                ENABLED
              </label>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-white/50">
          Date: <span className="font-mono">{value.date}</span>
        </div>

        <button
          onClick={() => {
            if (!canDelete) return;
            onDelete();
          }}
          disabled={!canDelete}
          className={`rounded-xl border px-3 py-2 text-xs tracking-widest ${
            canDelete
              ? "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/15"
              : "border-white/10 bg-white/5 text-white/30"
          }`}
        >
          DELETE
        </button>
      </div>
    </div>
  );
}
