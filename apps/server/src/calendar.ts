import type { Night, TradingStatus } from "./types.js";

const HOLIDAYS = new Set<string>([
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  "2026-02-15",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-21",
  "2026-02-22",
  "2026-02-23",
  "2026-04-04",
  "2026-04-05",
  "2026-04-06",
  "2026-05-01",
  "2026-05-02",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  "2026-06-19",
  "2026-06-20",
  "2026-06-21",
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
]);

export interface ShanghaiParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ymd: string;
  weekday: number;
}

export interface Session {
  start: number;
  end: number;
  phase: "集合竞价" | "连续交易";
  label: string;
}

export function shanghaiParts(date: Date): ShanghaiParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  const year = Number(bag.year);
  const month = Number(bag.month);
  const day = Number(bag.day);
  const hour = Number(bag.hour) % 24;
  const minute = Number(bag.minute);
  const second = Number(bag.second);
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    ymd: `${bag.year}-${bag.month}-${bag.day}`,
    weekday: weekdayMap[bag.weekday] ?? 0,
  };
}

export function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseYmd(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function addDays(value: string, days: number): string {
  const { year, month, day } = parseYmd(value);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return ymd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function atShanghai(value: string, hour: number, minute: number): number {
  const { year, month, day } = parseYmd(value);
  return Date.parse(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`,
  );
}

export function weekdayOf(value: string): number {
  const { year, month, day } = parseYmd(value);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isHoliday(value: string): boolean {
  return HOLIDAYS.has(value);
}

export function isTradingDay(value: string): boolean {
  const weekday = weekdayOf(value);
  if (weekday === 0 || weekday === 6) return false;
  return !HOLIDAYS.has(value);
}

export function nextTradingDay(value: string): string {
  let cursor = value;
  for (let i = 0; i < 20; i += 1) {
    if (isTradingDay(cursor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function previousTradingDay(value: string): string {
  let cursor = addDays(value, -1);
  for (let i = 0; i < 20; i += 1) {
    if (isTradingDay(cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return cursor;
}

export function nightEnd(night: Night): { hour: number; minute: number } | null {
  if (night === "2300") return { hour: 23, minute: 0 };
  if (night === "0100") return { hour: 1, minute: 0 };
  if (night === "0230") return { hour: 2, minute: 30 };
  return null;
}

export function getSessions(tradingDay: string, night: Night): Session[] {
  const sessions: Session[] = [];
  if (night !== "none") {
    const evening = previousTradingDay(tradingDay);
    const end = nightEnd(night)!;
    const endDay = end.hour < 12 ? addDays(evening, 1) : evening;
    sessions.push({
      start: atShanghai(evening, 20, 55),
      end: atShanghai(evening, 21, 0),
      phase: "集合竞价",
      label: "夜盘集合竞价",
    });
    sessions.push({
      start: atShanghai(evening, 21, 0),
      end: atShanghai(endDay, end.hour, end.minute),
      phase: "连续交易",
      label: "夜盘连续交易",
    });
  } else {
    sessions.push({
      start: atShanghai(tradingDay, 8, 55),
      end: atShanghai(tradingDay, 9, 0),
      phase: "集合竞价",
      label: "日盘集合竞价",
    });
  }
  sessions.push(
    { start: atShanghai(tradingDay, 9, 0), end: atShanghai(tradingDay, 10, 15), phase: "连续交易", label: "日盘" },
    { start: atShanghai(tradingDay, 10, 30), end: atShanghai(tradingDay, 11, 30), phase: "连续交易", label: "日盘" },
    { start: atShanghai(tradingDay, 13, 30), end: atShanghai(tradingDay, 15, 0), phase: "连续交易", label: "日盘" },
  );
  return sessions;
}

export function describeMarket(now: Date, night: Night): { tradingDay: string; status: TradingStatus } {
  const parts = shanghaiParts(now);
  const today = parts.ymd;
  const prev = previousTradingDay(addDays(today, 1));
  const candidates = [...new Set([previousTradingDay(today), isTradingDay(today) ? today : prev, nextTradingDay(addDays(today, 1))])];
  const ts = now.getTime();
  for (const tradingDay of candidates) {
    const sessions = getSessions(tradingDay, night);
    const hit = sessions.find((session) => ts >= session.start && ts < session.end);
    if (hit) return { tradingDay, status: hit.phase };
    const first = sessions[0];
    const last = sessions[sessions.length - 1];
    if (ts >= first.start && ts < last.end) return { tradingDay, status: "盘中休市" };
  }
  const started = candidates.filter((tradingDay) => getSessions(tradingDay, night)[0].start <= ts);
  const tradingDay = started.length ? started[started.length - 1] : previousTradingDay(today);
  return { tradingDay, status: "已收盘" };
}

export function getCurrentTradingDay(now: Date, night: Night): string {
  return describeMarket(now, night).tradingDay;
}

export function monthGrid(year: number, month: number): Array<{ date: string; inMonth: boolean; trading: boolean }> {
  const firstWeekday = weekdayOf(ymd(year, month, 1));
  const mondayIndex = (firstWeekday + 6) % 7;
  const start = addDays(ymd(year, month, 1), -mondayIndex);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const cellMonth = Number(date.slice(5, 7));
    cells.push({ date, inMonth: cellMonth === month, trading: isTradingDay(date) });
  }
  return cells;
}

export function sessionText(night: Night): string[] {
  const lines = ["日盘 09:00–10:15、10:30–11:30、13:30–15:00"];
  if (night === "none") lines.unshift("日盘集合竞价 08:55–09:00");
  if (night === "2300") lines.unshift("夜盘 20:55 集合竞价，21:00–23:00");
  if (night === "0100") lines.unshift("夜盘 20:55 集合竞价，21:00–01:00");
  if (night === "0230") lines.unshift("夜盘 20:55 集合竞价，21:00–02:30");
  if (night !== "none") lines.push("有夜盘的品种，夜盘归属下一交易日，日盘不再集合竞价");
  return lines;
}
