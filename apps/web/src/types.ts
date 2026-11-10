export interface Quote {
  symbol: string;
  sinaSymbol: string;
  exchange: Exchange;
  product: string;
  productName: string;
  name: string;
  sector: Sector;
  tradingDay: string;
  timestamp: number;
  last: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  prevSettlement: number | null;
  settlement: number | null;
  change: number | null;
  changePct: number | null;
  bid1: number | null;
  bidVol1: number | null;
  ask1: number | null;
  askVol1: number | null;
  volume: number | null;
  turnover: number | null;
  openInterest: number | null;
  prevOpenInterest: number | null;
  oiChange: number | null;
  upperLimit: number | null;
  lowerLimit: number | null;
  limitEstimated: boolean;
  averagePrice: number | null;
  amplitudePct: number | null;
  inside: number | null;
  outside: number | null;
  multiplier: number;
  tickSize: number;
  priceDecimals: number;
  marginRate: number;
  tradingStatus: string;
  quoteLevel: "L1";
  isDelayed: false;
  source: string;
  isMain: boolean;
  isContinuous: boolean;
  marginCapital: number | null;
  speculation: number | null;
  orderImbalance: number | null;
  trend: number | null;
  speed1m: number | null;
  night: "none" | "2300" | "0100" | "0230";
  pinyin: string;
  initials: string;
}

export type Exchange = "SHFE" | "DCE" | "CZCE" | "CFFEX" | "INE" | "GFEX";
export type Sector = "黑色金属" | "有色金属" | "能源化工" | "农产品" | "金融期货" | "其他";

export interface Anomaly {
  symbol: string;
  name: string;
  kind: string;
  text: string;
  last: number | null;
  changePct: number | null;
}

export interface Snapshot {
  type: "snapshot" | "patch";
  seq: number;
  serverTime: number;
  source: string;
  klineSource: string;
  refreshMs: number;
  quotes: Quote[];
  anomalies: Anomaly[];
  alerts: Array<{ message: string; symbol: string; ts: number }>;
}

export interface Bar {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest: number | null;
  settlement: number | null;
}

export interface AlertRule {
  id: string;
  symbol: string;
  kind: "price" | "change_pct" | "speed" | "oi" | "near_limit" | "volume";
  op: "gte" | "lte";
  threshold: number;
  mode: "once" | "daily";
  enabled: boolean;
  createdAt: number;
}

export interface AlertTrigger {
  id: number;
  ruleId: string;
  symbol: string;
  ts: number;
  value: number;
  last: number | null;
  changePct: number | null;
  message: string;
}

export const EXCHANGES: Array<{ id: Exchange | ""; name: string }> = [
  { id: "", name: "全部交易所" },
  { id: "SHFE", name: "上期所" },
  { id: "DCE", name: "大商所" },
  { id: "CZCE", name: "郑商所" },
  { id: "CFFEX", name: "中金所" },
  { id: "INE", name: "上期能源" },
  { id: "GFEX", name: "广期所" },
];

export const SECTORS = ["黑色金属", "有色金属", "能源化工", "农产品", "金融期货", "其他"] as const;

export const EXCHANGE_NAME: Record<string, string> = {
  SHFE: "上期所",
  DCE: "大商所",
  CZCE: "郑商所",
  CFFEX: "中金所",
  INE: "上期能源",
  GFEX: "广期所",
};
