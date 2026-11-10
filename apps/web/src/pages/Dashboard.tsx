import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChartPane } from "../components/ChartPane";
import { OrderBook } from "../components/OrderBook";
import { DEFAULT_COLUMN_KEYS, QUOTE_COLUMNS, QuoteTable } from "../components/QuoteTable";
import { useMarket } from "../market";
import { defaultLayout, downloadCsv, loadLayout, loadWatch, rememberMain, resolveSymbol, saveLayout, saveWatch, tone, type LayoutState, type WatchGroup } from "../lib";
import { SECTORS, type Quote } from "../types";

const TITLES: Record<string, string> = {
  sector: "板块概览",
  quotes: "自选报价",
  chart: "主图与盘口",
  anomalies: "异动",
};

export function DashboardPage() {
  const market = useMarket();
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout());
  const [groups, setGroups] = useState<WatchGroup[]>(() => loadWatch());
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "default");
  const [dragId, setDragId] = useState("");
  const colors = market.settings.colorblind ? { up: "#3B82F6", down: "#F59E0B" } : { up: "#E54545", down: "#18A058" };
  const group = groups.find((item) => item.id === groupId) ?? groups[0];

  useEffect(() => {
    if (localStorage.getItem("fb.watchSeeded") || groups.some((item) => item.symbols.length) || market.quotes.length === 0) return;
    const wanted = ["螺纹", "沪铜", "沪金", "铁矿", "原油", "豆粕", "甲醇", "沪深"];
    const symbols = wanted
      .map((name) => market.quotes.find((quote) => quote.name.includes(name) && quote.isContinuous)?.symbol)
      .filter((symbol): symbol is string => Boolean(symbol));
    if (!symbols.length) return;
    const next = groups.map((item, index) => (index === 0 ? { ...item, symbols } : item));
    setGroups(next);
    saveWatch(next);
    localStorage.setItem("fb.watchSeeded", "1");
  }, [groups, market.quotes]);

  const updateLayout = (next: LayoutState) => {
    setLayout(next);
    saveLayout(next);
  };
  const updateGroups = (next: WatchGroup[]) => {
    setGroups(next);
    saveWatch(next);
  };

  const resolved = useMemo(() => {
    if (!group) return [];
    return group.symbols
      .map((token) => market.bySymbol.get(resolveSymbol(token, market.quotes).toLowerCase()))
      .filter((quote): quote is Quote => Boolean(quote));
  }, [group, market.bySymbol, market.quotes]);

  const mainNotice = useMemo(() => {
    const notes: string[] = [];
    for (const quote of market.quotes) {
      if (!quote.isMain) continue;
      const previous = rememberMain(quote.product, quote.symbol);
      if (previous) notes.push(`${quote.productName} 主力由 ${previous} 换为 ${quote.symbol}`);
    }
    return notes.slice(0, 3);
  }, [market.seq, market.quotes]);

  const sectorCards = SECTORS.map((sector) => {
    const rows = market.quotes.filter((quote) => quote.sector === sector && !quote.isContinuous && !quote.name.includes("次主连"));
    const scored = rows.filter((quote) => quote.changePct != null);
    const avg = scored.length ? scored.reduce((sum, quote) => sum + (quote.changePct ?? 0), 0) / scored.length : null;
    return {
      sector,
      avg,
      up: rows.filter((quote) => (quote.changePct ?? 0) > 0).length,
      down: rows.filter((quote) => (quote.changePct ?? 0) < 0).length,
    };
  });

  const selected = market.bySymbol.get(market.selected.toLowerCase());
  const visible = layout.order.filter((id) => !layout.hidden.includes(id));

  return (
    <div>
      <div className="toolbar">
        <span className="basis-note">涨跌基准：{market.settings.basis === "settlement" ? "昨结算" : "昨收盘"}</span>
        {market.settings.basis === "close" ? <span className="muted">数据源未提供昨收盘，仍按昨结算计算</span> : null}
        <label>
          列数
          <select value={layout.columns} onChange={(event) => updateLayout({ ...layout, columns: Number(event.target.value) as 1 | 2 | 3 })}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        <button onClick={() => updateLayout(defaultLayout)}>恢复默认</button>
      </div>
      {mainNotice.map((note) => (
        <div key={note} className="warn-strip">{note}</div>
      ))}
      <div className="workbench" style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}>
        {visible.map((id) => (
          <section
            key={id}
            className={`widget ${id === "chart" ? "span-2" : ""}`}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (!dragId || dragId === id) return;
              const order = [...layout.order];
              const from = order.indexOf(dragId);
              const to = order.indexOf(id);
              order.splice(from, 1);
              order.splice(to, 0, dragId);
              updateLayout({ ...layout, order });
            }}
          >
            <header>
              <h2>{TITLES[id]}</h2>
              <button onClick={() => updateLayout({ ...layout, hidden: [...layout.hidden, id] })}>收起</button>
            </header>
            {id === "sector" ? (
              <div className="sector-grid">
                {sectorCards.map((card) => (
                  <Link key={card.sector} to={`/market?sector=${encodeURIComponent(card.sector)}`} className={`sector-card ${tone(card.avg)}`}>
                    <b>{card.sector}</b>
                    <strong>{card.avg == null ? "--" : `${card.avg > 0 ? "+" : ""}${card.avg.toFixed(2)}%`}</strong>
                    <span>涨 {card.up} / 跌 {card.down}</span>
                  </Link>
                ))}
              </div>
            ) : null}
            {id === "quotes" ? (
              <div>
                <div className="toolbar">
                  <select value={group?.id} onChange={(event) => setGroupId(event.target.value)}>
                    {groups.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (groups.length >= 20) return;
                      const created = { id: `g${Date.now()}`, name: `分组${groups.length + 1}`, symbols: [] };
                      updateGroups([...groups, created]);
                      setGroupId(created.id);
                    }}
                  >
                    新建分组
                  </button>
                  <button
                    disabled={!market.selected || !group || group.symbols.length >= 200}
                    onClick={() => {
                      if (!group || group.symbols.includes(market.selected)) return;
                      updateGroups(groups.map((item) => (item.id === group.id ? { ...item, symbols: [...item.symbols, market.selected] } : item)));
                    }}
                  >
                    加入当前合约
                  </button>
                  <button onClick={() => exportGroup(group, resolved)}>导出 CSV</button>
                  <label className="file">
                    导入 CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file || !group) return;
                        const text = await file.text();
                        const { symbols, errors } = importSymbols(text, market.quotes);
                        updateGroups(groups.map((item) => (item.id === group.id ? { ...item, symbols } : item)));
                        if (errors.length) window.alert(errors.slice(0, 8).join("\n"));
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <QuoteTable
                  rows={resolved}
                  columns={QUOTE_COLUMNS.filter((column) => DEFAULT_COLUMN_KEYS.includes(column.key))}
                  selected={market.selected}
                  onSelect={market.setSelected}
                  height={360}
                />
              </div>
            ) : null}
            {id === "chart" ? (
              <div className="chart-book">
                <ChartPane symbol={market.selected} up={colors.up} down={colors.down} />
                <OrderBook quote={selected} />
              </div>
            ) : null}
            {id === "anomalies" ? (
              <ul className="anomaly-list">
                {market.anomalies.length === 0 ? <li className="muted">暂无异动。开盘后约 1 分钟开始计算涨速。</li> : null}
                {market.anomalies.map((item, index) => (
                  <li key={`${item.symbol}-${item.kind}-${index}`}>
                    <button onClick={() => market.setSelected(item.symbol)}>
                      <b>{item.kind}</b>
                      <span>{item.name}</span>
                      <em>{item.text}</em>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      {layout.hidden.length ? (
        <div className="toolbar">
          {layout.hidden.map((id) => (
            <button key={id} onClick={() => updateLayout({ ...layout, hidden: layout.hidden.filter((item) => item !== id) })}>
              展开{TITLES[id]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function exportGroup(group: WatchGroup | undefined, quotes: Quote[]) {
  if (!group) return;
  const header = ["代码", "名称", "最新价", "涨跌幅", "成交量", "持仓量", "数据来源", "生成时间"];
  const rows = quotes.map((quote) => [
    quote.symbol,
    quote.name,
    quote.last == null ? "--" : String(quote.last),
    quote.changePct == null ? "--" : quote.changePct.toFixed(2),
    quote.volume == null ? "--" : String(quote.volume),
    quote.openInterest == null ? "--" : String(quote.openInterest),
    "东方财富展示行情",
    new Date().toISOString(),
  ]);
  downloadCsv(`${group.name}.csv`, [header, ...rows]);
}

function importSymbols(text: string, quotes: Quote[]) {
  const known = new Map(quotes.map((quote) => [quote.symbol.toLowerCase(), quote.symbol]));
  const symbols: string[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const cell = line.split(",")[0]?.trim();
    if (!cell || cell === "代码") return;
    const token = cell.startsWith("main:") ? cell : known.get(cell.toLowerCase());
    if (!token) errors.push(`第 ${index + 1} 行无法识别：${cell}`);
    else if (!symbols.includes(token)) symbols.push(token);
  });
  return { symbols: symbols.slice(0, 200), errors };
}
