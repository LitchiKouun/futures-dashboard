export type Exchange = "SHFE" | "DCE" | "CZCE" | "CFFEX" | "INE" | "GFEX";
export type Sector = "黑色金属" | "有色金属" | "能源化工" | "农产品" | "金融期货" | "其他";
export type Night = "none" | "2300" | "0100" | "0230";
export type TradingStatus = "集合竞价" | "连续交易" | "盘中休市" | "已收盘" | "停牌";

export interface ProductSpec {
  code: string;
  name: string;
  exchange: Exchange;
  sector: Sector;
  multiplier: number;
  tick: number;
  margin: number;
  limitPct: number;
  night: Night;
  pinyin: string;
  initials: string;
}

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
  tradingStatus: TradingStatus;
  quoteLevel: "L1";
  isDelayed: false;
  source: "eastmoney";
  isMain: boolean;
  isContinuous: boolean;
  marginCapital: number | null;
  speculation: number | null;
  orderImbalance: number | null;
  trend: number | null;
  speed1m: number | null;
  night: Night;
  pinyin: string;
  initials: string;
}

export interface Anomaly {
  symbol: string;
  name: string;
  kind: "速涨" | "速跌" | "逼近涨停" | "逼近跌停" | "增仓" | "放量";
  text: string;
  last: number | null;
  changePct: number | null;
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
