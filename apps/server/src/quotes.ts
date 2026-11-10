import type { Anomaly, Quote } from "./types.js";
import { describeMarket } from "./calendar.js";
import {
  amplitudePct,
  averageFromTurnover,
  changeOf,
  changePctOf,
  marginCapital,
  orderImbalance,
  priceOrNull,
  speculation,
  trend,
} from "./metrics.js";
import {
  exchangeOf,
  lookupProduct,
  parseSymbol,
  priceDecimals,
  roundToTick,
  toSinaSymbol,
} from "./products.js";
import type { Store } from "./store.js";

const FIELDS = "dm,sc,name,p,zsjd,zde,zdf,o,h,l,zjsj,vol,cje,wp,np,ccl,mrj,mcj,mrl,mcl,zt,dt,rz,j";
const URL = `https://futsseapi.eastmoney.com/list/113,114,115,8,142,225?orderBy=dm&sort=asc&pageSize=2000&pageIndex=0&token=58b2fa8f54638b60b87d69b31969089c&field=${FIELDS}`;

interface Sample {
  t: number;
  p: number;
  vol: number;
  oi: number;
}

const history = new Map<string, Sample[]>();

export async function fetchQuotes(store: Store, now = new Date()): Promise<{ quotes: Quote[]; anomalies: Anomaly[]; error?: string }> {
  const response = await fetch(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://quote.eastmoney.com/",
    },
  });
  if (!response.ok) throw new Error(`行情源返回 ${response.status}`);
  const body = (await response.json()) as { list?: Array<Record<string, unknown>> };
  const list = body.list ?? [];
  const received = now.getTime();
  const drafts: Quote[] = [];
  for (const item of list) {
    const quote = normalize(item, received, now);
    if (quote) drafts.push(quote);
  }
  applyMains(store, drafts);
  const anomalies = collectAnomalies(drafts, received);
  return { quotes: drafts, anomalies };
}

function normalize(item: Record<string, unknown>, received: number, now: Date): Quote | null {
  const symbol = String(item.dm ?? "");
  const name = String(item.name ?? symbol);
  if (!symbol || !name) return null;
  const exchange = exchangeOf(Number(item.sc));
  const parsed = parseSymbol(symbol, name, exchange);
  const product = lookupProduct(parsed.product, exchange);
  const market = describeMarket(now, product.night);
  const last = priceOrNull(item.p);
  const open = priceOrNull(item.o);
  const high = priceOrNull(item.h);
  const low = priceOrNull(item.l);
  const prevSettlement = priceOrNull(item.zjsj);
  const bid1 = priceOrNull(item.mrj);
  const ask1 = priceOrNull(item.mcj);
  const volume = num(item.vol);
  const turnover = num(item.cje);
  const openInterest = num(item.ccl);
  const oiChange = num(item.rz);
  const upper = priceOrNull(item.zt);
  const lower = priceOrNull(item.dt);
  const quotedAvg = priceOrNull(item.j);
  const tick = product.tick;
  const decimals = Number.isFinite(Number(item.zsjd)) ? Number(item.zsjd) : priceDecimals(tick);
  let upperLimit = upper;
  let lowerLimit = lower;
  let limitEstimated = false;
  if ((upperLimit == null || lowerLimit == null) && prevSettlement != null) {
    upperLimit = upperLimit ?? roundToTick(prevSettlement * (1 + product.limitPct), tick);
    lowerLimit = lowerLimit ?? roundToTick(prevSettlement * (1 - product.limitPct), tick);
    limitEstimated = true;
  }
  const change = changeOf(last, prevSettlement);
  const avg =
    quotedAvg != null && low != null && high != null && quotedAvg >= low && quotedAvg <= high
      ? quotedAvg
      : averageFromTurnover(turnover, volume, product.multiplier);
  return {
    symbol,
    sinaSymbol: toSinaSymbol(symbol, name, exchange, product.code),
    exchange,
    product: product.code,
    productName: product.name,
    name,
    sector: product.sector,
    tradingDay: market.tradingDay,
    timestamp: received,
    last,
    open,
    high,
    low,
    prevClose: null,
    prevSettlement,
    settlement: null,
    change,
    changePct: changePctOf(change, prevSettlement),
    bid1,
    bidVol1: num(item.mrl),
    ask1,
    askVol1: num(item.mcl),
    volume,
    turnover,
    openInterest,
    prevOpenInterest: openInterest != null && oiChange != null ? openInterest - oiChange : null,
    oiChange,
    upperLimit,
    lowerLimit,
    limitEstimated,
    averagePrice: avg,
    amplitudePct: amplitudePct(high, low, prevSettlement),
    inside: num(item.np),
    outside: num(item.wp),
    multiplier: product.multiplier,
    tickSize: tick,
    priceDecimals: decimals,
    marginRate: product.margin,
    tradingStatus: market.status,
    quoteLevel: "L1",
    isDelayed: false,
    source: "eastmoney",
    isMain: false,
    isContinuous: parsed.kind === "main",
    marginCapital: marginCapital(openInterest, last, product.multiplier, product.margin),
    speculation: speculation(volume, openInterest),
    orderImbalance: orderImbalance(num(item.mrl), num(item.mcl)),
    trend: trend(last, open, high, low),
    speed1m: null,
    night: product.night,
    pinyin: product.pinyin,
    initials: product.initials,
  };
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function applyMains(store: Store, quotes: Quote[]): void {
  const groups = new Map<string, Quote[]>();
  for (const quote of quotes) {
    const letterMonth = /^[A-Za-z]+\d{3,4}$/.test(quote.symbol);
    const cffexMonth = quote.exchange === "CFFEX" && /\d{4}$/.test(quote.name);
    if (!letterMonth && !cffexMonth) continue;
    if (quote.name.includes("主连") || quote.name.includes("加权") || quote.name.includes("连续")) continue;
    const list = groups.get(quote.product) ?? [];
    list.push(quote);
    groups.set(quote.product, list);
  }
  for (const [product, list] of groups) {
    list.sort((a, b) => (b.openInterest ?? -1) - (a.openInterest ?? -1) || (b.volume ?? -1) - (a.volume ?? -1));
    const leader = list[0];
    if (!leader) continue;
    const day = leader.tradingDay;
    const state = store.getMain(product);
    if (!state) {
      store.saveMain({ product, symbol: leader.symbol, pendingSymbol: null, pendingStreak: 0, tradingDay: day });
    } else if (state.tradingDay !== day) {
      if (leader.symbol === state.symbol) {
        store.saveMain({ ...state, pendingSymbol: null, pendingStreak: 0, tradingDay: day });
      } else if (leader.symbol === state.pendingSymbol) {
        const streak = state.pendingStreak + 1;
        if (streak >= 2) {
          store.saveMain({ product, symbol: leader.symbol, pendingSymbol: null, pendingStreak: 0, tradingDay: day });
        } else {
          store.saveMain({ ...state, pendingStreak: streak, tradingDay: day });
        }
      } else {
        store.saveMain({ ...state, pendingSymbol: leader.symbol, pendingStreak: 1, tradingDay: day });
      }
    }
    const confirmed = store.getMain(product)?.symbol;
    for (const quote of list) quote.isMain = quote.symbol === confirmed;
  }
}

function collectAnomalies(quotes: Quote[], now: number): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const quote of quotes) {
    if (quote.isContinuous || quote.name.includes("次主连") || quote.name.includes("加权")) continue;
    if (quote.last == null) continue;
    const samples = history.get(quote.symbol) ?? [];
    samples.push({ t: now, p: quote.last, vol: quote.volume ?? 0, oi: quote.openInterest ?? 0 });
    const kept = samples.filter((sample) => now - sample.t <= 90_000);
    history.set(quote.symbol, kept);
    const past = [...kept].reverse().find((sample) => now - sample.t >= 55_000);
    if (past && past.p) {
      quote.speed1m = (quote.last - past.p) / past.p;
      if (quote.speed1m >= 0.005) anomalies.push(anomaly(quote, "速涨", `1分钟 ${pct(quote.speed1m)}`));
      if (quote.speed1m <= -0.005) anomalies.push(anomaly(quote, "速跌", `1分钟 ${pct(quote.speed1m)}`));
      const volDelta = (quote.volume ?? 0) - past.vol;
      const oiDelta = (quote.openInterest ?? 0) - past.oi;
      if (oiDelta >= 2000) anomalies.push(anomaly(quote, "增仓", `1分钟增仓 ${oiDelta} 手`));
      if (volDelta >= 8000) anomalies.push(anomaly(quote, "放量", `1分钟成交 ${volDelta} 手`));
    }
    if (quote.upperLimit != null && quote.prevSettlement) {
      const gap = (quote.upperLimit - quote.last) / quote.prevSettlement;
      if (gap >= 0 && gap <= 0.01) anomalies.push(anomaly(quote, "逼近涨停", "距离涨停不超过 1%"));
    }
    if (quote.lowerLimit != null && quote.prevSettlement) {
      const gap = (quote.last - quote.lowerLimit) / quote.prevSettlement;
      if (gap >= 0 && gap <= 0.01) anomalies.push(anomaly(quote, "逼近跌停", "距离跌停不超过 1%"));
    }
  }
  return anomalies.slice(0, 40);
}

function anomaly(quote: Quote, kind: Anomaly["kind"], text: string): Anomaly {
  return { symbol: quote.symbol, name: quote.name, kind, text, last: quote.last, changePct: quote.changePct };
}

function pct(value: number): string {
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}
