import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatLots, formatSigned, tone } from "../lib";
import { allProducts } from "./product-list";

interface Cell {
  date: string;
  inMonth: boolean;
  trading: boolean;
}

interface RankRow {
  symbol: string;
  name: string;
  changePct: number | null;
  volume: number | null;
  openInterest: number | null;
  marginCapital: number | null;
}

interface DayRanks {
  date: string;
  source?: string;
  note?: string;
  closed?: boolean;
  gainers: RankRow[];
  losers: RankRow[];
  volume: RankRow[];
  openInterest: RankRow[];
  marginCapital: RankRow[];
}

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [product, setProduct] = useState("rb");
  const [days, setDays] = useState<Cell[]>([]);
  const [sessions, setSessions] = useState<string[]>([]);
  const [picked, setPicked] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()),
  );
  const [ranks, setRanks] = useState<DayRanks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ year: String(year), month: String(month), product });
    fetch(`/api/calendar?${params}`)
      .then((response) => response.json())
      .then((body: { days: Cell[]; sessions: string[] }) => {
        setDays(body.days);
        setSessions(body.sessions);
      })
      .catch(() => setSessions(["日历暂不可用"]));
  }, [year, month, product]);

  useEffect(() => {
    const cell = days.find((item) => item.date === picked);
    if (!picked || (days.length && cell && !cell.trading)) {
      setRanks(null);
      setLoading(false);
      return;
    }
    let dead = false;
    setRanks(null);
    setLoading(true);
    setError("");
    fetch(`/api/calendar/ranks?date=${picked}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "排行加载失败");
        return body as DayRanks;
      })
      .then((body) => {
        if (!dead) setRanks(body);
      })
      .catch((reason: Error) => {
        if (!dead) setError(reason.message);
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [picked, days]);

  const pickedCell = days.find((cell) => cell.date === picked);

  return (
    <div className="calendar-page">
      <section className="panel">
        <div className="toolbar">
          <button onClick={() => shift(-1)}>上月</button>
          <strong>{year}年{month}月</strong>
          <button onClick={() => shift(1)}>下月</button>
          <label>
            品种时段
            <select value={product} onChange={(event) => setProduct(event.target.value)}>
              {allProducts.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="calendar-head">{["一", "二", "三", "四", "五", "六", "日"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          {days.map((cell) => (
            <button key={cell.date} className={`${cell.inMonth ? "" : "muted"} ${cell.trading ? "trading" : "closed"} ${picked === cell.date ? "selected" : ""}`} onClick={() => setPicked(cell.date)}>
              <b>{Number(cell.date.slice(8))}</b>
              <small>{cell.trading ? "交易" : "休市"}</small>
            </button>
          ))}
        </div>
        <p className="muted">{picked}{pickedCell ? (pickedCell.trading ? " 交易日" : " 休市") : ""}。{sessions.join("；")}</p>
      </section>
      <section className="panel">
        <h2>{picked} 排行</h2>
        {pickedCell && !pickedCell.trading ? <p>休市，没有成交与持仓排行。</p> : null}
        {loading ? <p>正在汇总当日涨幅、成交、持仓和沉淀资金…</p> : null}
        {error ? <p>{error}</p> : null}
        {ranks && !ranks.closed ? (
          <>
            <p className="source-line">{ranks.source} · {ranks.note}</p>
            <div className="rank-grid">
              <DayRank title="涨幅" rows={ranks.gainers} field="changePct" />
              <DayRank title="跌幅" rows={ranks.losers} field="changePct" />
              <DayRank title="成交量" rows={ranks.volume} field="volume" />
              <DayRank title="持仓量" rows={ranks.openInterest} field="openInterest" />
              <DayRank title="沉淀资金" rows={ranks.marginCapital} field="marginCapital" />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );

  function shift(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }
}

function DayRank({ title, rows, field }: { title: string; rows: RankRow[]; field: "changePct" | "volume" | "openInterest" | "marginCapital" }) {
  const navigate = useNavigate();
  return (
    <section className="rank">
      <h3>{title}</h3>
      <ol>
        {rows.length === 0 ? <li className="muted">暂无</li> : null}
        {rows.map((row) => (
          <li key={row.symbol}>
            <button onClick={() => navigate(`/quote/${encodeURIComponent(row.symbol)}`)}>
              <span>{row.name}</span>
              <b className={tone(row.changePct)}>{show(row, field)}</b>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function show(row: RankRow, field: "changePct" | "volume" | "openInterest" | "marginCapital"): string {
  if (field === "changePct") return row.changePct == null ? "--" : `${formatSigned(row.changePct, 2)}%`;
  return formatLots(row[field]);
}
