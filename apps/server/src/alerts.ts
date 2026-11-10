import type { AlertRule, AlertTrigger, Quote } from "./types.js";
import type { Store } from "./store.js";

const dailyFired = new Set<string>();

export function evaluateAlerts(store: Store, quotes: Quote[], now = Date.now()): AlertTrigger[] {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol.toLowerCase(), quote]));
  const fired: AlertTrigger[] = [];
  for (const rule of store.listRules()) {
    if (!rule.enabled) continue;
    const quote = bySymbol.get(rule.symbol.toLowerCase());
    if (!quote) continue;
    const value = metric(rule, quote);
    if (value == null || !hit(rule, value)) continue;
    const dayKey = `${rule.id}:${quote.tradingDay}`;
    if (rule.mode === "daily" && dailyFired.has(dayKey)) continue;
    const message = `${quote.name} ${label(rule)}，触发值 ${formatValue(rule, value)}`;
    const row = store.addTrigger({
      ruleId: rule.id,
      symbol: quote.symbol,
      ts: now,
      value,
      last: quote.last,
      changePct: quote.changePct,
      message,
    });
    fired.push(row);
    if (rule.mode === "once") store.setRuleEnabled(rule.id, false);
    if (rule.mode === "daily") dailyFired.add(dayKey);
  }
  return fired;
}

function metric(rule: AlertRule, quote: Quote): number | null {
  if (rule.kind === "price") return quote.last;
  if (rule.kind === "change_pct") return quote.changePct;
  if (rule.kind === "speed") return quote.speed1m == null ? null : quote.speed1m * 100;
  if (rule.kind === "oi") return quote.oiChange;
  if (rule.kind === "volume") return quote.volume;
  if (rule.kind === "near_limit") {
    if (quote.last == null || quote.prevSettlement == null || quote.prevSettlement === 0) return null;
    const up = quote.upperLimit == null ? null : ((quote.upperLimit - quote.last) / quote.prevSettlement) * 100;
    const down = quote.lowerLimit == null ? null : ((quote.last - quote.lowerLimit) / quote.prevSettlement) * 100;
    const gaps = [up, down].filter((item): item is number => item != null && item >= 0);
    if (!gaps.length) return null;
    return Math.min(...gaps);
  }
  return null;
}

function hit(rule: AlertRule, value: number): boolean {
  if (rule.kind === "near_limit") return value <= rule.threshold;
  return rule.op === "gte" ? value >= rule.threshold : value <= rule.threshold;
}

function label(rule: AlertRule): string {
  const names: Record<AlertRule["kind"], string> = {
    price: "最新价",
    change_pct: "涨跌幅",
    speed: "1分钟涨速",
    oi: "仓差",
    near_limit: "距离涨跌停",
    volume: "成交量",
  };
  const op = rule.kind === "near_limit" ? "≤" : rule.op === "gte" ? "≥" : "≤";
  return `${names[rule.kind]} ${op} ${rule.threshold}`;
}

function formatValue(rule: AlertRule, value: number): string {
  if (rule.kind === "price") return String(value);
  if (rule.kind === "change_pct" || rule.kind === "speed" || rule.kind === "near_limit") return `${value.toFixed(2)}%`;
  return `${Math.round(value)} 手`;
}

export function newRuleId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
