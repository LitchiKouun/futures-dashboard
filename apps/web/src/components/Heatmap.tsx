import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tone } from "../lib";
import type { Quote } from "../types";

type SizeBy = "turnover" | "openInterest";
type GroupBy = "sector" | "exchange";

export function Heatmap({ quotes }: { quotes: Quote[] }) {
  const [sizeBy, setSizeBy] = useState<SizeBy>("turnover");
  const [groupBy, setGroupBy] = useState<GroupBy>("sector");
  const navigate = useNavigate();
  const groups = useMemo(() => {
    const map = new Map<string, Quote[]>();
    for (const quote of quotes) {
      const key = groupBy === "sector" ? quote.sector : quote.exchange;
      const list = map.get(key) ?? [];
      list.push(quote);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [quotes, groupBy]);

  return (
    <div>
      <div className="toolbar">
        <label>大小<select value={sizeBy} onChange={(event) => setSizeBy(event.target.value as SizeBy)}><option value="turnover">成交额</option><option value="openInterest">持仓量</option></select></label>
        <label>分组<select value={groupBy} onChange={(event) => setGroupBy(event.target.value as GroupBy)}><option value="sector">板块</option><option value="exchange">交易所</option></select></label>
      </div>
      {groups.map(([name, items]) => {
        const total = items.reduce((sum, quote) => sum + Math.max(0, (sizeBy === "turnover" ? quote.turnover : quote.openInterest) ?? 0), 0) || 1;
        return (
          <section key={name} className="heat-group">
            <h3>{name}</h3>
            <div className="heat-grid">
              {items.slice(0, 40).map((quote) => {
                const weight = Math.max(0, (sizeBy === "turnover" ? quote.turnover : quote.openInterest) ?? 0);
                const flex = Math.max(1, Math.round((weight / total) * 100));
                return (
                  <button
                    key={quote.symbol}
                    className={`heat ${tone(quote.changePct)}`}
                    style={{ flexGrow: flex, flexBasis: `${Math.max(72, flex)}px` }}
                    onClick={() => navigate(`/quote/${encodeURIComponent(quote.symbol)}`)}
                    title={quote.name}
                  >
                    <b>{quote.productName}</b>
                    <span>{quote.changePct == null ? "--" : `${quote.changePct > 0 ? "+" : ""}${quote.changePct.toFixed(2)}%`}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function RankList({ title, quotes, value }: { title: string; quotes: Quote[]; value: (quote: Quote) => string }) {
  const navigate = useNavigate();
  return (
    <section className="rank">
      <h3>{title}</h3>
      <ol>
        {quotes.map((quote) => (
          <li key={quote.symbol}>
            <button onClick={() => navigate(`/quote/${encodeURIComponent(quote.symbol)}`)}>
              <span>{quote.name}</span>
              <b className={tone(quote.changePct)}>{value(quote)}</b>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
