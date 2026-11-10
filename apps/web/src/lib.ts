import type { Quote } from "./types";

export type Basis = "settlement" | "close";

export interface Settings {
  basis: Basis;
  theme: "dark" | "light";
  colorblind: boolean;
  riskAccepted: boolean;
}

export interface WatchGroup {
  id: string;
  name: string;
  symbols: string[];
}

export interface LayoutState {
  columns: 1 | 2 | 3;
  order: string[];
  hidden: string[];
}

const SETTINGS_KEY = "fb.settings";
const WATCH_KEY = "fb.watchlists";
const LAYOUT_KEY = "fb.layout";
const SYMBOL_KEY = "fb.symbol";
const MAIN_SEEN_KEY = "fb.mainSeen";

export const defaultSettings: Settings = {
  basis: "settlement",
  theme: "dark",
  colorblind: false,
  riskAccepted: false,
};

export const defaultLayout: LayoutState = {
  columns: 2,
  order: ["sector", "quotes", "chart", "anomalies"],
  hidden: [],
};

export function loadSettings(): Settings {
  return { ...defaultSettings, ...readJson(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadWatch(): WatchGroup[] {
  const saved = readJson<WatchGroup[] | null>(WATCH_KEY, null);
  if (saved?.length) return saved.slice(0, 20);
  return [{ id: "default", name: "自选", symbols: [] }];
}

export function saveWatch(groups: WatchGroup[]) {
  localStorage.setItem(WATCH_KEY, JSON.stringify(groups.slice(0, 20).map((group) => ({ ...group, symbols: group.symbols.slice(0, 200) }))));
}

export function loadLayout(): LayoutState {
  return { ...defaultLayout, ...readJson(LAYOUT_KEY, {}) };
}

export function saveLayout(layout: LayoutState) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

export function loadSymbol(): string {
  return localStorage.getItem(SYMBOL_KEY) ?? "";
}

export function saveSymbol(symbol: string) {
  localStorage.setItem(SYMBOL_KEY, symbol);
}

export function rememberMain(product: string, symbol: string): string | null {
  const seen = readJson<Record<string, string>>(MAIN_SEEN_KEY, {});
  const previous = seen[product];
  if (previous && previous !== symbol) {
    seen[product] = symbol;
    localStorage.setItem(MAIN_SEEN_KEY, JSON.stringify(seen));
    return previous;
  }
  seen[product] = symbol;
  localStorage.setItem(MAIN_SEEN_KEY, JSON.stringify(seen));
  return null;
}

export function applyBasis(quote: Quote, basis: Basis): Quote {
  const base = basis === "close" && quote.prevClose != null ? quote.prevClose : quote.prevSettlement;
  if (quote.last == null || base == null || base === 0) {
    return { ...quote, change: null, changePct: null, amplitudePct: null };
  }
  const change = quote.last - base;
  return {
    ...quote,
    change,
    changePct: (change / base) * 100,
    amplitudePct: quote.high != null && quote.low != null ? ((quote.high - quote.low) / base) * 100 : null,
  };
}

export function formatPrice(value: number | null, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return value.toFixed(decimals);
}

export function formatSigned(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "--";
  const text = value.toFixed(digits);
  return value > 0 ? `+${text}` : text;
}

export function formatLots(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(2)}万`;
  return `${sign}${Math.round(abs).toLocaleString("zh-CN")}`;
}

export function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "--";
  return `¥${formatLots(value)}`;
}

export function tone(value: number | null): "up" | "down" | "flat" {
  if (value == null || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

export function formatTime(ts: number): string {
  if (!ts) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(ts);
}

export function formatDateTime(ts: number): string {
  if (!ts) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(ts);
}

export function contractMonth(symbol: string): string | null {
  const matched = symbol.match(/(\d{3,4})$/);
  if (!matched) return null;
  const digits = matched[1];
  if (digits.length === 4) return `20${digits.slice(0, 2)}-${digits.slice(2)}`;
  const yearDigit = Number(digits[0]);
  const nowY = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric" }).format(new Date()));
  const decade = Math.floor(nowY / 10) * 10;
  let year = decade + yearDigit;
  if (year < nowY - 1) year += 10;
  return `${year}-${digits.slice(1)}`;
}

export function resolveSymbol(token: string, quotes: Quote[]): string {
  if (token.startsWith("main:")) {
    const product = token.slice(5).toLowerCase();
    return quotes.find((quote) => quote.product === product && quote.isMain)?.symbol ?? token;
  }
  return token;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const text = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${text}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (fallback == null || Array.isArray(parsed) || typeof parsed !== "object") return parsed;
    return { ...(fallback as object), ...(parsed as object) } as T;
  } catch {
    return fallback;
  }
}

export const FORMULAS = [
  ["涨跌", "最新价 − 昨结算", "设置可切换昨收盘；当前数据源未提供昨收盘时仍用昨结算"],
  ["涨跌幅", "(最新价 − 基准价) / 基准价 × 100%", "默认基准为昨结算"],
  ["振幅", "(最高 − 最低) / 昨结算 × 100%", ""],
  ["仓差", "今持仓 − 昨持仓", "取行情源日增仓字段"],
  ["委比", "(买一量 − 卖一量) / (买一量 + 卖一量) × 100%", "分母为 0 显示 --"],
  ["投机度", "成交量 / 持仓量", "分母为 0 显示 --"],
  ["沉淀资金", "持仓量 × 2 × 最新价 × 合约乘数 × 保证金率", "持仓按单边，k=2；保证金为交易所标准估算"],
  ["趋势度", "(最新价 − 开盘价) / (最高 − 最低)", "分母为 0 显示 --"],
  ["1分钟涨速", "(最新价 − 1分钟前价格) / 1分钟前价格", "由本机连续快照计算"],
];
