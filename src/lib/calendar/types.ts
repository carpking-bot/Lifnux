export type Importance = "LOW" | "MIDDLE" | "HIGH" | "CRITICAL";

export type EventType = "TIMED" | "DATE";
export type EventKind = "TIMED" | "DATE" | "HOLIDAY";

export type CalendarLabel = {
  id: string;
  name: string;
  color: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: EventKind;
  startTime?: string; // HH:mm (TIMED only)
  endTime?: string; // HH:mm (TIMED only)
  labelId?: string | null;
  importance?: Importance;
  location?: string;
  note?: string;
  isSystemHoliday?: boolean;
  seriesId?: string;
  type?: EventType;
  isHoliday?: boolean;
};

export type StatusBarData = {
  companyName: string;
  remainingLeaveHours: number;
  employmentStartDate: string; // YYYY-MM-DD
};
