const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function parseDateString(value?: string) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return null;
  }
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMondayIndex(dayIndex: number) {
  return (dayIndex + 6) % 7;
}

export function getMonthGrid(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const startOffset = getMondayIndex(start.getDay());
  const gridStart = addDays(start, -startOffset);
  const gridDays: Date[] = [];
  const totalDays = 42;
  for (let i = 0; i < totalDays; i += 1) {
    gridDays.push(addDays(gridStart, i));
  }
  const gridEnd = addDays(gridStart, totalDays - 1);
  return {
    gridDays,
    gridStart,
    gridEnd,
    monthStart: start,
    monthEnd: end,
  };
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatTimeLabel(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function diffInDays(a: Date, b: Date) {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}
