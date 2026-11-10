import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadKline } from "./kline.js";
import type { Quote } from "./types.js";

export interface RankRow {
  symbol: string;
  name: string;
  last: number | null;
  changePct: number | null;
  volume: number | null;
  openInterest: number | null;
  marginCapital: number | null;
}

export interface DayRanks {
  date: string;
  source: string;
  note: string;
  gainers: RankRow[];
  losers: RankRow[];
  volume: RankRow[];
  openInterest: RankRow[];
  marginCapital: RankRow[];
}

const memory = new Map<string, DayRanks>();

export function ranksFromQuotes(date: string, quotes: Quote[], source: string, note: string): DayRanks {
  return pack(date, source, note, quotes.filter(isMonthContract).map(rowFromQuote));
}

export function writeRankFile(dir: string, ranks: DayRanks) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${ranks.date}.json`), JSON.stringify(ranks));
  memory.set(ranks.date, ranks);
}

export function readRankFile(dir: string, date: string): DayRanks | null {
  const hit = memory.get(date);
  if (hit) return hit;
  try {
    const parsed = JSON.parse(readFileSync(path.join(dir, `${date}.json`), "utf8")) as DayRanks;
    memory.set(date, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function ranksFromHistory(date: string, quotes: Quote[]): Promise<DayRanks> {
  const cached = memory.get(`hist:${date}`);
  if (cached) return cached;
  const mains = quotes.filter((quote) => quote.isMain && isMonthContract(quote));
  const rows: RankRow[] = [];
  await runPool(mains, 4, async (quote) => {
    try {
      const bars = await loadKline(quote.sinaSymbol, "1d");
      const index = bars.findIndex((bar) => bar.time.slice(0, 10) === date);
      if (index < 0) return;
      const bar = bars[index];
      const prev = index > 0 ? bars[index - 1] : null;
      const basis = prev?.settlement ?? prev?.close ?? null;
      const changePct = basis ? ((bar.close - basis) / basis) * 100 : null;
      const openInterest = bar.openInterest;
      rows.push({
        symbol: quote.symbol,
        name: quote.name,
        last: bar.close,
        changePct,
        volume: bar.volume,
        openInterest,
        marginCapital:
          openInterest != null && bar.close ? openInterest * 2 * bar.close * quote.multiplier * quote.marginRate : null,
      });
    } catch {
      /* 单个合约日线缺失时跳过 */
    }
  });
  const ranks = pack(date, "新浪财经", "按当日主力合约收盘日线汇总，沉淀资金为估算值", rows);
  memory.set(`hist:${date}`, ranks);
  return ranks;
}

function pack(date: string, source: string, note: string, rows: RankRow[]): DayRanks {
  return {
    date,
    source,
    note,
    gainers: top(rows, (row) => row.changePct, true),
    losers: top(rows, (row) => row.changePct, false),
    volume: top(rows, (row) => row.volume, true),
    openInterest: top(rows, (row) => row.openInterest, true),
    marginCapital: top(rows, (row) => row.marginCapital, true),
  };
}

function rowFromQuote(quote: Quote): RankRow {
  return {
    symbol: quote.symbol,
    name: quote.name,
    last: quote.last,
    changePct: quote.changePct,
    volume: quote.volume,
    openInterest: quote.openInterest,
    marginCapital: quote.marginCapital,
  };
}

function isMonthContract(quote: Quote): boolean {
  return !quote.isContinuous && !quote.name.includes("次主连") && !quote.name.includes("加权") && !quote.name.includes("连续");
}

function top(rows: RankRow[], pick: (row: RankRow) => number | null, desc: boolean): RankRow[] {
  return [...rows]
    .filter((row) => pick(row) != null)
    .sort((a, b) => (desc ? (pick(b) ?? 0) - (pick(a) ?? 0) : (pick(a) ?? 0) - (pick(b) ?? 0)))
    .slice(0, 10);
}

async function runPool<T>(items: T[], size: number, task: (item: T) => Promise<void>) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await task(items[index]);
    }
  });
  await Promise.all(workers);
}
