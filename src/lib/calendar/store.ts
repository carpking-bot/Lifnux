"use client";

import { useEffect, useSyncExternalStore } from "react";
import type {
  CalendarEvent,
  CalendarLabel,
  Importance,
  StatusBarData,
} from "./types";
import { seedEvents, seedLabels, seedStatusBar } from "./seed";

type CalendarState = {
  events: CalendarEvent[];
  labels: CalendarLabel[];
  statusBar: StatusBarData;
};

const STORAGE_KEY = "lifnux.calendar.v1";

let initialized = false;
let hasHydrated = false;
let state: CalendarState = {
  events: [],
  labels: [],
  statusBar: seedStatusBar(),
};
const listeners = new Set<() => void>();

function isValidState(candidate: unknown): candidate is CalendarState {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }
  const value = candidate as CalendarState;
  return (
    Array.isArray(value.events) &&
    Array.isArray(value.labels) &&
    typeof value.statusBar === "object" &&
    value.statusBar !== null
  );
}

function loadFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (isValidState(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function saveToStorage(nextState: CalendarState) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // ignore storage write failures
  }
}

function initStore() {
  if (initialized) {
    return;
  }
  state = {
    events: seedEvents(),
    labels: seedLabels(),
    statusBar: seedStatusBar(),
  };
  initialized = true;
}

function notify() {
  saveToStorage(state);
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  initStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  initStore();
  return state;
}

export function useCalendarStore<T>(selector: (data: CalendarState) => T) {
  useEffect(() => {
    if (hasHydrated) {
      return;
    }
    hasHydrated = true;
    const stored = loadFromStorage();
    if (stored) {
      state = stored;
      notify();
    }
  }, []);
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () =>
    selector(getSnapshot())
  );
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function addEvent(
  data: Omit<CalendarEvent, "id" | "importance"> & { importance?: Importance }
) {
  initStore();
  let event: CalendarEvent = {
    ...data,
    id: createId("event"),
  };
  if (data.kind === "HOLIDAY") {
    event = {
      ...event,
      labelId: undefined,
      startTime: undefined,
      endTime: undefined,
      importance: undefined,
    };
  } else {
    event = {
      ...event,
      importance: data.importance ?? "LOW",
    };
  }
  state = { ...state, events: [...state.events, event] };
  notify();
  return event;
}

export function updateEvent(id: string, patch: Partial<CalendarEvent>) {
  initStore();
  state = {
    ...state,
    events: state.events.map((event) =>
      event.id === id ? { ...event, ...patch } : event
    ),
  };
  notify();
}

export function deleteEvent(id: string) {
  initStore();
  state = { ...state, events: state.events.filter((event) => event.id !== id) };
  notify();
}

export function addLabel(data: Omit<CalendarLabel, "id">) {
  initStore();
  const label: CalendarLabel = { ...data, id: createId("label") };
  state = { ...state, labels: [...state.labels, label] };
  notify();
  return label;
}

export function updateLabel(id: string, patch: Partial<CalendarLabel>) {
  initStore();
  state = {
    ...state,
    labels: state.labels.map((label) =>
      label.id === id ? { ...label, ...patch } : label
    ),
  };
  notify();
}

export function deleteLabel(id: string) {
  initStore();
  state = {
    ...state,
    labels: state.labels.filter((label) => label.id !== id),
    events: state.events.map((event) =>
      event.labelId === id ? { ...event, labelId: null } : event
    ),
  };
  notify();
}
