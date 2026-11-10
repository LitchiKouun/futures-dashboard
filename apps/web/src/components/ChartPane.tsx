import { useEffect, useRef, useState } from "react";
import { CandleType, dispose, init, type Chart } from "klinecharts";
import type { Bar } from "../types";

export function ChartPane({
  symbol,
  up,
  down,
}: {
  symbol: string;
  up: string;
  down: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const [period, setPeriod] = useState("intraday");
  const [meta, setMeta] = useState("");
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el || !symbol) return;
    const instance = init(el);
    chart.current = instance;
    instance?.setStyles({
      candle: {
        type: period === "intraday" ? CandleType.Area : CandleType.CandleSolid,
        bar: {
          upColor: up,
          downColor: down,
          noChangeColor: "#909399",
          upBorderColor: up,
          downBorderColor: down,
          noChangeBorderColor: "#909399",
          upWickColor: up,
          downWickColor: down,
          noChangeWickColor: "#909399",
        },
      },
    });
    instance?.setTimezone("Asia/Shanghai");
    if (period !== "intraday") instance?.createIndicator("MA", false, { id: "candle_pane" });
    instance?.createIndicator("VOL", false, { height: 72 });
    if (period !== "intraday") instance?.createIndicator("MACD", false, { height: 72 });
    let dead = false;
    setEmpty(false);
    setMeta("加载K线…");
    fetch(`/api/kline?symbol=${encodeURIComponent(symbol)}&period=${period}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ bars: Bar[]; source: string; note: string; sinaSymbol: string }>;
      })
      .then((data) => {
        if (dead) return;
        const bars = data.bars ?? [];
        setEmpty(bars.length === 0);
        setMeta(`${data.source} · ${data.sinaSymbol} · ${data.note}`);
        instance?.applyNewData(
          bars.map((bar) => ({
            timestamp: bar.timestamp,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
          })),
        );
      })
      .catch(() => {
        if (!dead) {
          setEmpty(true);
          setMeta("K线暂不可用");
        }
      });
    return () => {
      dead = true;
      dispose(el);
      chart.current = null;
    };
  }, [symbol, period, up, down]);

  const periods = [
    ["intraday", "分时"],
    ["1m", "1分"],
    ["5m", "5分"],
    ["15m", "15分"],
    ["30m", "30分"],
    ["1h", "60分"],
    ["1d", "日"],
    ["1w", "周"],
    ["1M", "月"],
  ];

  return (
    <div className="chart-pane">
      <div className="period-bar">
        {periods.map(([id, label]) => (
          <button key={id} className={period === id ? "active" : ""} onClick={() => setPeriod(id)}>
            {label}
          </button>
        ))}
      </div>
      <div ref={host} className="chart-host" />
      {empty ? <div className="chart-empty">暂无K线</div> : null}
      <div className="source-line">{meta}</div>
    </div>
  );
}
