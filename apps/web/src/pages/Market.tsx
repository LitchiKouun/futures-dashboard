import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heatmap, RankList } from "../components/Heatmap";
import { DEFAULT_COLUMN_KEYS, QUOTE_COLUMNS, QuoteTable } from "../components/QuoteTable";
import { useMarket } from "../market";
import { downloadCsv, formatLots, formatSigned } from "../lib";
import { EXCHANGES, SECTORS, type Quote } from "../types";

export function MarketPage() {
  const { quotes, setSelected, source, serverTime } = useMarket();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [exchange, setExchange] = useState("");
  const [sector, setSector] = useState(params.get("sector") ?? "");
  const [keyword, setKeyword] = useState("");
  const [hideContinuous, setHideContinuous] = useState(true);
  const [view, setView] = useState<"table" | "heat">("table");
  const [keys, setKeys] = useState(DEFAULT_COLUMN_KEYS);

  const monthQuotes = useMemo(
    () => quotes.filter((quote) => !quote.isContinuous && !quote.name.includes("次主连") && !quote.name.includes("加权")),
    [quotes],
  );
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (hideContinuous ? monthQuotes : quotes).filter((quote) => {
      if (exchange && quote.exchange !== exchange) return false;
      if (sector && quote.sector !== sector) return false;
      if (!q) return true;
      return `${quote.symbol} ${quote.name} ${quote.pinyin} ${quote.initials}`.toLowerCase().includes(q);
    });
  }, [quotes, monthQuotes, exchange, sector, keyword, hideContinuous]);

  const leaders = useMemo(() => {
    const mains = monthQuotes.filter((quote) => quote.isMain);
    return mains.length ? mains : monthQuotes;
  }, [monthQuotes]);

  const columns = QUOTE_COLUMNS.filter((column) => keys.includes(column.key));

  return (
    <div>
      <div className="toolbar">
        <select value={exchange} onChange={(event) => setExchange(event.target.value)}>
          {EXCHANGES.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select value={sector} onChange={(event) => setSector(event.target.value)}>
          <option value="">全部板块</option>
          {SECTORS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input value={keyword} placeholder="筛选代码或名称" onChange={(event) => setKeyword(event.target.value)} />
        <label><input type="checkbox" checked={hideContinuous} onChange={(event) => setHideContinuous(event.target.checked)} />隐藏主连</label>
        <button className={view === "table" ? "active" : ""} onClick={() => setView("table")}>报价</button>
        <button className={view === "heat" ? "active" : ""} onClick={() => setView("heat")}>热力图</button>
        <button onClick={() => exportQuotes(filtered, columns, source, serverTime)}>导出 CSV</button>
        <details>
          <summary>列</summary>
          <div className="column-picker">
            {QUOTE_COLUMNS.map((column) => (
              <label key={column.key}>
                <input
                  type="checkbox"
                  checked={keys.includes(column.key)}
                  onChange={(event) => {
                    setKeys((current) => {
                      if (event.target.checked) return [...current, column.key];
                      return current.filter((key) => key !== column.key);
                    });
                  }}
                />
                {column.title}
              </label>
            ))}
          </div>
        </details>
      </div>
      {view === "heat" ? (
        <Heatmap quotes={leaders.filter((quote) => (!sector || quote.sector === sector) && (!exchange || quote.exchange === exchange))} />
      ) : (
        <QuoteTable
          rows={filtered}
          columns={columns}
          onSelect={setSelected}
          onOpen={(symbol) => {
            setSelected(symbol);
            navigate(`/quote/${encodeURIComponent(symbol)}`);
          }}
          height={560}
        />
      )}
      <div className="rank-grid">
        <RankList title="涨幅" quotes={top(filtered, (quote) => quote.changePct, true)} value={(quote) => pct(quote.changePct)} />
        <RankList title="跌幅" quotes={top(filtered, (quote) => quote.changePct, false)} value={(quote) => pct(quote.changePct)} />
        <RankList title="成交量" quotes={top(filtered, (quote) => quote.volume, true)} value={(quote) => formatLots(quote.volume)} />
        <RankList title="持仓量" quotes={top(filtered, (quote) => quote.openInterest, true)} value={(quote) => formatLots(quote.openInterest)} />
        <RankList title="仓差" quotes={top(filtered, (quote) => quote.oiChange, true)} value={(quote) => formatLots(quote.oiChange)} />
        <RankList title="沉淀资金" quotes={top(filtered, (quote) => quote.marginCapital, true)} value={(quote) => formatLots(quote.marginCapital)} />
      </div>
      <p className="source-line">排行与报价使用同一快照。沉淀资金为估算值。成交量单位：手。示例 {formatLots(monthQuotes[0]?.volume ?? null)}</p>
    </div>
  );
}

function pct(value: number | null): string {
  if (value == null) return "--";
  return `${formatSigned(value, 2)}%`;
}

function top(quotes: Quote[], pick: (quote: Quote) => number | null, desc: boolean) {
  return [...quotes]
    .filter((quote) => pick(quote) != null)
    .sort((a, b) => (desc ? (pick(b) ?? 0) - (pick(a) ?? 0) : (pick(a) ?? 0) - (pick(b) ?? 0)))
    .slice(0, 10);
}

function exportQuotes(quotes: Quote[], columns: typeof QUOTE_COLUMNS, source: string, serverTime: number) {
  const header = [...columns.map((column) => column.title), "数据来源", "生成时间"];
  const rows = quotes.map((quote) => [...columns.map((column) => column.render(quote)), source, new Date(serverTime || Date.now()).toISOString()]);
  downloadCsv("quotes.csv", [header, ...rows]);
}
