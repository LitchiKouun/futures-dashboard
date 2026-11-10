import type { Bar } from "./types.js";
import { addDays, atShanghai, isTradingDay, parseYmd } from "./calendar.js";

const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Referer: "https://finance.sina.com.cn/",
};

const cache = new Map<string, { at: number; bars: Bar[] }>();

export async function loadKline(sinaSymbol: string, period: string): Promise<Bar[]> {
  const key = `${sinaSymbol}:${period}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 15_000) return hit.bars;
  const bars = period === "1w" || period === "1M" ? await loadAggregated(sinaSymbol, period) : await loadRaw(sinaSymbol, period);
  cache.set(key, { at: Date.now(), bars });
  return bars;
}

async function loadAggregated(sinaSymbol: string, period: "1w" | "1M"): Promise<Bar[]> {
  const daily = await loadRaw(sinaSymbol, "1d");
  const groups = new Map<string, Bar[]>();
  for (const bar of daily) {
    const key = period === "1M" ? bar.time.slice(0, 7) : weekKey(bar.time.slice(0, 10));
    const list = groups.get(key) ?? [];
    list.push(bar);
    groups.set(key, list);
  }
  return [...groups.values()].map(mergeBars);
}

async function loadRaw(sinaSymbol: string, period: string): Promise<Bar[]> {
  if (period === "1d" || period === "intraday") {
    if (period === "1d") return fetchDaily(sinaSymbol);
    const minutes = await fetchMinutes(sinaSymbol, "1");
    return minutes;
  }
  const type = period === "1m" ? "1" : period === "5m" ? "5" : period === "15m" ? "15" : period === "30m" ? "30" : "60";
  return fetchMinutes(sinaSymbol, type);
}

async function fetchDaily(symbol: string): Promise<Bar[]> {
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var=/InnerFuturesNewService.getDailyKLine?symbol=${encodeURIComponent(symbol)}`;
  const rows = await fetchJsonp(url);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const item = row as Record<string, string>;
      return toBar(item.d, item.o, item.h, item.l, item.c, item.v, item.p, item.s);
    })
    .filter((bar): bar is Bar => bar != null);
}

async function fetchMinutes(symbol: string, type: string): Promise<Bar[]> {
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var=/InnerFuturesNewService.getFewMinLine?symbol=${encodeURIComponent(symbol)}&type=${type}`;
  const rows = await fetchJsonp(url);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const item = row as Record<string, string>;
      return toBar(item.d, item.o, item.h, item.l, item.c, item.v, item.p, null);
    })
    .filter((bar): bar is Bar => bar != null)
    .sort((a, b) => a.timestamp - b.timestamp);
}

async function fetchJsonp(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`kline ${response.status}`);
  const text = await response.text();
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start < 0 || end < start) return null;
  return JSON.parse(text.slice(start + 1, end)) as unknown;
}

function toBar(
  time: string | undefined,
  open: string | undefined,
  high: string | undefined,
  low: string | undefined,
  close: string | undefined,
  volume: string | undefined,
  oi: string | null | undefined,
  settlement: string | null | undefined,
): Bar | null {
  if (!time || open == null || high == null || low == null || close == null) return null;
  const timestamp = Date.parse(time.replace(" ", "T") + (time.length <= 10 ? "T00:00:00+08:00" : "+08:00").replace("TT", "T"));
  if (!Number.isFinite(timestamp)) return null;
  const bar: Bar = {
    time,
    timestamp,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume ?? 0),
    openInterest: oi == null || oi === "" ? null : Number(oi),
    settlement: settlement == null || settlement === "" ? null : Number(settlement),
  };
  if (![bar.open, bar.high, bar.low, bar.close].every(Number.isFinite)) return null;
  return bar;
}

function mergeBars(bars: Bar[]): Bar {
  const first = bars[0];
  const last = bars[bars.length - 1];
  return {
    time: first.time.slice(0, 10),
    timestamp: first.timestamp,
    open: first.open,
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
    close: last.close,
    volume: bars.reduce((sum, bar) => sum + bar.volume, 0),
    openInterest: last.openInterest,
    settlement: last.settlement,
  };
}

function weekKey(date: string): string {
  const { year, month, day } = parseYmd(date);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - weekday + 1);
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}

export function filterTradingDay(bars: Bar[], tradingDay: string, night: boolean): Bar[] {
  return bars.filter((bar) => barTradingDay(bar.time, night) === tradingDay);
}

function barTradingDay(time: string, night: boolean): string {
  const date = time.slice(0, 10);
  const hour = Number(time.slice(11, 13) || "12");
  if (!night || hour < 16) return isTradingDay(date) ? date : date;
  return nextOpen(date);
}

function nextOpen(date: string): string {
  let cursor = addDays(date, 1);
  for (let i = 0; i < 12; i += 1) {
    if (isTradingDay(cursor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function dropOffSessionBars(bars: Bar[]): Bar[] {
  return bars.filter((bar) => {
    const hour = Number(bar.time.slice(11, 13));
    const minute = Number(bar.time.slice(14, 16));
    if (!Number.isFinite(hour)) return true;
    const minutes = hour * 60 + minute;
    const inDay =
      (minutes >= 9 * 60 && minutes <= 10 * 60 + 15) ||
      (minutes >= 10 * 60 + 30 && minutes <= 11 * 60 + 30) ||
      (minutes >= 13 * 60 + 30 && minutes <= 15 * 60);
    const inNight = minutes >= 21 * 60 || minutes <= 2 * 60 + 30;
    return inDay || inNight;
  });
}

export function sessionAnchor(tradingDay: string): number {
  return atShanghai(tradingDay, 9, 0);
}
