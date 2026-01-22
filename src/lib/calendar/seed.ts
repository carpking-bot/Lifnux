import type { CalendarEvent, CalendarLabel, StatusBarData } from "./types";
import { formatDate } from "./date";

function buildHoliday(year: number, month: number, day: number, title: string) {
  return {
    id: `holiday-${year}-${month}-${day}`,
    title,
    date: `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`,
    kind: "HOLIDAY",
    isSystemHoliday: true,
  } satisfies CalendarEvent;
}

export function seedLabels(): CalendarLabel[] {
  return [
    { id: "label-work", name: "업무", color: "#5EEAD4" },
    { id: "label-life", name: "일상", color: "#60A5FA" },
    { id: "label-health", name: "건강", color: "#FCA5A5" },
    { id: "label-focus", name: "집중", color: "#FDE047" },
    { id: "label-family", name: "가족", color: "#A78BFA" },
    { id: "label-etc", name: "기타", color: "#F97316" },
  ];
}

export function seedStatusBar(): StatusBarData {
  return {
    companyName: "Lifnux Studio",
    remainingLeaveHours: 72,
    employmentStartDate: "2023-03-15",
  };
}

export function seedEvents(): CalendarEvent[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = [currentYear, currentYear + 1];
  const holidays = years.flatMap((year) => [
    buildHoliday(year, 1, 1, "신정"),
    buildHoliday(year, 3, 1, "삼일절"),
    buildHoliday(year, 5, 5, "어린이날"),
    buildHoliday(year, 6, 6, "현충일"),
    buildHoliday(year, 8, 15, "광복절"),
    buildHoliday(year, 10, 3, "개천절"),
    buildHoliday(year, 10, 9, "한글날"),
    buildHoliday(year, 12, 25, "성탄절"),
  ]);

  const baseDate = formatDate(today);

  return [
    ...holidays,
    {
      id: "event-1",
      title: "Quarterly Review",
      date: baseDate,
      kind: "TIMED",
      startTime: "10:00",
      endTime: "11:30",
      labelId: "label-work",
      importance: "HIGH",
      location: "HQ 10F",
      note: "Bring roadmap draft.",
    },
    {
      id: "event-2",
      title: "Team Lunch",
      date: baseDate,
      kind: "TIMED",
      startTime: "12:30",
      endTime: "13:30",
      labelId: "label-life",
      importance: "MIDDLE",
      location: "Cafeteria",
      note: "Try new menu.",
    },
    {
      id: "event-3",
      title: "Gym Session",
      date: baseDate,
      kind: "DATE",
      labelId: "label-health",
      importance: "LOW",
      note: "Mobility + core.",
    },
    {
      id: "event-4",
      title: "Investor Call",
      date: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
      kind: "TIMED",
      startTime: "15:00",
      endTime: "16:00",
      labelId: "label-work",
      importance: "CRITICAL",
      location: "Conference Room B",
    },
    {
      id: "event-5",
      title: "Design Sprint",
      date: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4)),
      kind: "DATE",
      labelId: "label-focus",
      importance: "HIGH",
      note: "Block the whole day.",
    },
  ];
}
