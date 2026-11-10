import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { scoreBias } from "../bias";
import { ChartPane } from "../components/ChartPane";
import { ProductNews } from "../components/ProductNews";
import type { NewsBrief } from "../news-brief";
import { formatPrice, formatSigned, loadWatch, resolveSymbol, saveWatch, tone, type WatchGroup } from "../lib";
import { useMarket } from "../market";
import type { Quote } from "../types";

export function WatchPage() {
  const market = useMarket();
  const [groups, setGroups] = useState<WatchGroup[]>(() => loadWatch());
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "default");
  const [picked, setPicked] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState<{ product: string; data: NewsBrief | null }>({ product: "", data: null });
  const colors = market.settings.colorblind ? { up: "#3B82F6", down: "#F59E0B" } : { up: "#E54545", down: "#18A058" };
  const group = groups.find((item) => item.id === groupId) ?? groups[0];

  const rows = useMemo(() => {
    if (!group) return [];
    return group.symbols
      .map((token) => market.bySymbol.get(resolveSymbol(token, market.quotes).toLowerCase()))
      .filter((quote): quote is Quote => Boolean(quote));
  }, [group, market.bySymbol, market.quotes]);

  const selected = rows.find((quote) => quote.symbol === picked) ?? rows[0];
  const stats = useMemo(() => summarize(rows), [rows]);
  const ready = selected && brief.product === selected.product ? brief.data : null;
  const bias = selected && ready ? scoreBias(selected, ready.spot, ready.inventory, ready.policy, ready.read) : null;

  useEffect(() => {
    if (!selected) {
      setBrief({ product: "", data: null });
      return;
    }
    const product = selected.product;
    let dead = false;
    setBrief({ product: "", data: null });
    fetch(`/api/news/brief?product=${encodeURIComponent(product)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("资讯正文读取失败");
        return response.json() as Promise<NewsBrief>;
      })
      .then((data) => {
        if (!dead) setBrief({ product, data });
      })
      .catch(() => {
        if (!dead) setBrief({ product, data: { product, productName: selected.productName, source: "新浪财经", read: 0, spot: [], inventory: [], policy: [] } });
      });
    return () => {
      dead = true;
    };
  }, [selected?.product, selected?.productName]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const owned = new Set(group?.symbols ?? []);
    return market.quotes
      .filter((quote) => {
        if (owned.has(quote.symbol)) return false;
        return `${quote.symbol} ${quote.name} ${quote.productName} ${quote.pinyin} ${quote.initials} ${quote.sinaSymbol}`.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [query, market.quotes, group]);

  const update = (next: WatchGroup[]) => {
    setGroups(next);
    saveWatch(next);
  };

  const add = (symbol: string) => {
    if (!group || group.symbols.includes(symbol) || group.symbols.length >= 200) return;
    update(groups.map((item) => (item.id === group.id ? { ...item, symbols: [...item.symbols, symbol] } : item)));
    setPicked(symbol);
    setQuery("");
    setOpen(false);
  };

  const remove = (symbol: string) => {
    if (!group) return;
    update(groups.map((item) => (item.id === group.id ? { ...item, symbols: item.symbols.filter((token) => resolveSymbol(token, market.quotes) !== symbol && token !== symbol) } : item)));
    if (picked === symbol) setPicked("");
  };

  return (
    <div className="watch-page">
      <div className="watch-stats">
        <Stat label="自选" value={`${rows.length}`} />
        <Stat label="上涨" value={`${stats.up}`} toneName="up" />
        <Stat label="下跌" value={`${stats.down}`} toneName="down" />
        <Stat label="平盘" value={`${stats.flat}`} />
        <Stat label="等权平均涨跌幅" value={pct(stats.avg)} toneName={tone(stats.avg)} />
        <Stat label="最强" value={stats.best ? `${stats.best.name} ${pct(stats.best.changePct)}` : "--"} toneName="up" />
        <Stat label="最弱" value={stats.worst ? `${stats.worst.name} ${pct(stats.worst.changePct)}` : "--"} toneName="down" />
      </div>
      <div className="watch-body">
        <section className="panel">
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
                update([...groups, created]);
                setGroupId(created.id);
              }}
            >
              新建分组
            </button>
          </div>
          <div className="watch-add">
            <input
              value={query}
              placeholder="添加合约，代码或名称"
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
            {open && suggestions.length ? (
              <ul className="watch-suggest">
                {suggestions.map((quote) => (
                  <li key={quote.symbol}>
                    <button onClick={() => add(quote.symbol)}>
                      <b>{quote.name}</b>
                      <span>{quote.symbol}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ul className="watch-list">
            {rows.map((quote) => (
              <li key={quote.symbol} className={selected?.symbol === quote.symbol ? "selected" : ""}>
                <button onClick={() => setPicked(quote.symbol)}>
                  <b>{quote.name}</b>
                  <span className={tone(quote.changePct)}>{pct(quote.changePct)}</span>
                </button>
                <button className="ghost" onClick={() => remove(quote.symbol)}>移除</button>
              </li>
            ))}
          </ul>
          {!rows.length && group?.symbols.length ? <p className="muted">自选已保存，行情连接后显示。</p> : null}
          {!rows.length && !group?.symbols.length ? <p className="muted">还没有自选合约。在上方搜索后加入，工作台自选会共用这份列表。</p> : null}
        </section>
        <div className="watch-detail">
          {selected ? (
            <>
              <section className="panel">
                <div className="quote-head">
                  <div>
                    <h2>{selected.name} <small>{selected.symbol}</small></h2>
                    <div className={`book-last ${tone(selected.change)}`}>{formatPrice(selected.last, selected.priceDecimals)} <small>{formatSigned(selected.change, selected.priceDecimals)} {pct(selected.changePct)}</small></div>
                  </div>
                  <Link to={`/quote/${encodeURIComponent(selected.symbol)}`}>合约页</Link>
                </div>
                <ChartPane symbol={selected.symbol} up={colors.up} down={colors.down} />
              </section>
              {bias ? (
                <section className={`panel bias bias-${bias.side}`}>
                  <h3>多空参考 <Stars side={bias.side} stars={bias.stars} /></h3>
                  <p className="muted">阅读资讯正文后，按现货价格、库存、消息政策分别摘录依据，再对照盘面涨跌和持仓。星级表示倾向强度。这不是交易建议。</p>
                  {["资讯", "现货价格", "库存", "消息政策", "盘面"].map((category) => {
                    const items = bias.reasons.filter((reason) => reason.category === category);
                    if (!items.length) return null;
                    return (
                      <div key={category}>
                        <h4>{category}</h4>
                        <ul>
                          {items.map((reason) => (
                            <li key={`${reason.category}-${reason.text}`}>
                              {reason.text}
                              {reason.source ? <span> · {reason.source}</span> : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </section>
              ) : (
                <section className="panel">正在阅读该品种的资讯正文…</section>
              )}
              <ProductNews product={selected.product} />
            </>
          ) : (
            <section className="panel">选择或添加一个自选合约后，这里显示 K 线、多空参考和品种资讯。</section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stars({ side, stars }: { side: "long" | "short" | "range"; stars: number }) {
  if (side === "range") return <strong>中性震荡</strong>;
  return <strong className={`stars ${side === "long" ? "up" : "down"}`}>{side === "long" ? "多" : "空"} {"★".repeat(stars)}{"☆".repeat(5 - stars)}</strong>;
}

function Stat({ label, value, toneName }: { label: string; value: string; toneName?: string }) {
  return (
    <div className="panel watch-stat">
      <span>{label}</span>
      <strong className={toneName}>{value}</strong>
    </div>
  );
}

function pct(value: number | null): string {
  if (value == null) return "--";
  return `${formatSigned(value, 2)}%`;
}

function summarize(rows: Quote[]) {
  const scored = rows.filter((quote) => quote.changePct != null);
  const avg = scored.length ? scored.reduce((sum, quote) => sum + (quote.changePct ?? 0), 0) / scored.length : null;
  const ranked = [...scored].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  return {
    up: rows.filter((quote) => (quote.changePct ?? 0) > 0).length,
    down: rows.filter((quote) => (quote.changePct ?? 0) < 0).length,
    flat: rows.filter((quote) => quote.changePct == null || quote.changePct === 0).length,
    avg,
    best: ranked[0],
    worst: ranked[ranked.length - 1],
  };
}
