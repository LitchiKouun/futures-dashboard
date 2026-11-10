import type { Quote } from "./types.js";

export type Basis = "settlement" | "close";

export function finiteOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function priceOrNull(value: unknown): number | null {
  const n = finiteOrNull(value);
  if (n == null || n === 0) return null;
  return n;
}

export function changeOf(last: number | null, basis: number | null): number | null {
  if (last == null || basis == null || basis === 0) return null;
  return last - basis;
}

export function changePctOf(change: number | null, basis: number | null): number | null {
  if (change == null || basis == null || basis === 0) return null;
  return (change / basis) * 100;
}

export function amplitudePct(high: number | null, low: number | null, basis: number | null): number | null {
  if (high == null || low == null || basis == null || basis === 0) return null;
  return ((high - low) / basis) * 100;
}

export function orderImbalance(bidVol: number | null, askVol: number | null): number | null {
  if (bidVol == null || askVol == null) return null;
  const total = bidVol + askVol;
  if (total === 0) return null;
  return ((bidVol - askVol) / total) * 100;
}

export function speculation(volume: number | null, openInterest: number | null): number | null {
  if (volume == null || openInterest == null || openInterest === 0) return null;
  return volume / openInterest;
}

export function trend(last: number | null, open: number | null, high: number | null, low: number | null): number | null {
  if (last == null || open == null || high == null || low == null) return null;
  const span = high - low;
  if (span === 0) return null;
  return (last - open) / span;
}

/** 国内持仓按单边口径，k=2。结果为估算值。 */
export function marginCapital(
  openInterest: number | null,
  last: number | null,
  multiplier: number,
  marginRate: number,
): number | null {
  if (openInterest == null || last == null || openInterest === 0 || last === 0) return null;
  return openInterest * 2 * last * multiplier * marginRate;
}

export function averageFromTurnover(
  turnover: number | null,
  volume: number | null,
  multiplier: number,
): number | null {
  if (turnover == null || volume == null || volume === 0 || multiplier === 0) return null;
  return turnover / volume / multiplier;
}

export function basisPrice(quote: Pick<Quote, "prevSettlement" | "prevClose">, basis: Basis): number | null {
  if (basis === "close" && quote.prevClose != null) return quote.prevClose;
  return quote.prevSettlement;
}

export function withBasis(quote: Quote, basis: Basis): Quote {
  const base = basisPrice(quote, basis);
  const change = changeOf(quote.last, base);
  return {
    ...quote,
    change,
    changePct: changePctOf(change, base),
    amplitudePct: amplitudePct(quote.high, quote.low, base),
  };
}
