import type { CalendarEvent, EventKind } from "./types";

export function getEventKind(event: CalendarEvent): EventKind {
  if (event.kind) {
    return event.kind;
  }
  if (event.isHoliday) {
    return "HOLIDAY";
  }
  return event.type ?? "DATE";
}
