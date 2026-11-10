import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice, formatSigned, tone } from "../lib";
import type { Quote } from "../types";

export interface Column {
  key: string;
  title: string;
  width: string;
  align?: "left" | "right";
  render: (quote: Quote) => string;
  sort?: (quote: Quote) => number | null;
  tone?: (quote: Quote) => "up" | "down" | "flat";
}

export const QUOTE_COLUMNS: Column[] = [
  { key: "symbol", title: "代码", width: "92px", render: (q) => q.symbol },
  { key: "name", title: "名称", width: "128px", render: (q) => q.name },
  { key: "last", title: "最新价", width: "88px", align: "right", render: (q) => formatPrice(q.last, q.priceDecimals), sort: (q) => q.last, tone: (q) => tone(q.change) },
  { key: "change", title: "涨跌", width: "80px", align: "right", render: (q) => formatSigned(q.change, q.priceDecimals), sort: (q) => q.change, tone: (q) => tone(q.change) },
  { key: "changePct", title: "涨跌幅", width: "84px", align: "right", render: (q) => (q.changePct == null ? "--" : `${formatSigned(q.changePct, 2)}%`), sort: (q) => q.changePct, tone: (q) => tone(q.changePct) },
  { key: "bid1", title: "买一价", width: "80px", align: "right", render: (q) => formatPrice(q.bid1, q.priceDecimals), sort: (q) => q.bid1 },
  { key: "ask1", title: "卖一价", width: "80px", align: "right", render: (q) => formatPrice(q.ask1, q.priceDecimals), sort: (q) => q.ask1 },
  { key: "volume", title: "成交量", width: "88px", align: "right", render: (q) => fmtInt(q.volume), sort: (q) => q.volume },
  { key: "openInterest", title: "持仓量", width: "88px", align: "right", render: (q) => fmtInt(q.openInterest), sort: (q) => q.openInterest },
  { key: "oiChange", title: "仓差", width: "80px", align: "right", render: (q) => fmtInt(q.oiChange), sort: (q) => q.oiChange, tone: (q) => tone(q.oiChange) },
  { key: "settlement", title: "结算价", width: "80px", align: "right", render: (q) => formatPrice(q.settlement, q.priceDecimals), sort: (q) => q.settlement },
  { key: "amplitudePct", title: "振幅", width: "72px", align: "right", render: (q) => (q.amplitudePct == null ? "--" : `${q.amplitudePct.toFixed(2)}%`), sort: (q) => q.amplitudePct },
  { key: "open", title: "今开", width: "80px", align: "right", render: (q) => formatPrice(q.open, q.priceDecimals), sort: (q) => q.open },
  { key: "high", title: "最高", width: "80px", align: "right", render: (q) => formatPrice(q.high, q.priceDecimals), sort: (q) => q.high },
  { key: "low", title: "最低", width: "80px", align: "right", render: (q) => formatPrice(q.low, q.priceDecimals), sort: (q) => q.low },
  { key: "prevSettlement", title: "昨结", width: "80px", align: "right", render: (q) => formatPrice(q.prevSettlement, q.priceDecimals), sort: (q) => q.prevSettlement },
  { key: "turnover", title: "成交额", width: "96px", align: "right", render: (q) => fmtInt(q.turnover), sort: (q) => q.turnover },
  { key: "marginCapital", title: "沉淀资金", width: "100px", align: "right", render: (q) => fmtInt(q.marginCapital), sort: (q) => q.marginCapital },
  { key: "speculation", title: "投机度", width: "72px", align: "right", render: (q) => (q.speculation == null ? "--" : q.speculation.toFixed(2)), sort: (q) => q.speculation },
  { key: "orderImbalance", title: "委比", width: "72px", align: "right", render: (q) => (q.orderImbalance == null ? "--" : `${formatSigned(q.orderImbalance, 1)}%`), sort: (q) => q.orderImbalance, tone: (q) => tone(q.orderImbalance) },
  { key: "tradingStatus", title: "状态", width: "88px", render: (q) => q.tradingStatus },
];

export const DEFAULT_COLUMN_KEYS = ["symbol", "name", "last", "change", "changePct", "bid1", "ask1", "volume", "openInterest", "oiChange", "settlement", "amplitudePct"];

function fmtInt(value: number | null): string {
  if (value == null) return "--";
  return Math.round(value).toLocaleString("zh-CN");
}

export function QuoteTable({
  rows,
  columns,
  selected,
  onSelect,
  onOpen,
  height = 420,
}: {
  rows: Quote[];
  columns: Column[];
  selected?: string;
  onSelect: (symbol: string) => void;
  onOpen?: (symbol: string) => void;
  height?: number;
}) {
  const [sortKey, setSortKey] = useState("changePct");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const previous = useRef(new Map<string, number>());
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(height);
  const rowHeight = 32;

  const sorted = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sort) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = column.sort!(a);
      const bv = column.sort!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  useEffect(() => {
    const next: Record<string, "up" | "down"> = {};
    for (const quote of rows) {
      if (quote.last == null) continue;
      const old = previous.current.get(quote.symbol);
      if (old != null && old !== quote.last) next[quote.symbol] = quote.last > old ? "up" : "down";
      previous.current.set(quote.symbol, quote.last);
    }
    setFlash(next);
    const timer = window.setTimeout(() => setFlash({}), 300);
    return () => window.clearTimeout(timer);
  }, [rows]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setViewHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 6);
  const count = Math.ceil(viewHeight / rowHeight) + 12;
  const slice = sorted.slice(start, start + count);
  const template = columns.map((column) => column.width).join(" ");

  return (
    <div className="table-wrap">
      <div className="table-head" style={{ gridTemplateColumns: template }}>
        {columns.map((column) => (
          <button
            key={column.key}
            className={column.align === "right" ? "right" : ""}
            onClick={() => {
              if (!column.sort) return;
              if (sortKey === column.key) setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
              else {
                setSortKey(column.key);
                setSortDir("desc");
              }
            }}
          >
            {column.title}
            {sortKey === column.key ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
          </button>
        ))}
      </div>
      <div ref={scroller} className="table-body" style={{ height }} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
        <div style={{ height: sorted.length * rowHeight, position: "relative" }}>
          {slice.map((quote, index) => (
            <div
              key={quote.symbol}
              data-symbol={quote.symbol}
              className={`table-row${selected === quote.symbol ? " selected" : ""}`}
              style={{ gridTemplateColumns: template, top: (start + index) * rowHeight, height: rowHeight }}
              onClick={() => onSelect(quote.symbol)}
              onDoubleClick={() => (onOpen ?? onSelect)(quote.symbol)}
            >
              {columns.map((column) => (
                <span key={column.key} className={`${column.align === "right" ? "right" : ""} ${column.tone ? column.tone(quote) : ""} ${column.key === "last" ? `flash-${flash[quote.symbol] ?? ""}` : ""}`}>
                  {column.render(quote)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="table-foot">{sorted.length} 个合约</div>
    </div>
  );
}

export function useQuoteNavigate() {
  const navigate = useNavigate();
  return (symbol: string) => navigate(`/quote/${encodeURIComponent(symbol)}`);
}
