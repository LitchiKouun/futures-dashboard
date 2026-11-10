import { useEffect, useState } from "react";
import { useMarket } from "../market";
import { formatDateTime, formatPrice } from "../lib";
import type { AlertRule, AlertTrigger } from "../types";

const KINDS: Array<{ id: AlertRule["kind"]; name: string }> = [
  { id: "price", name: "最新价" },
  { id: "change_pct", name: "涨跌幅%" },
  { id: "speed", name: "1分钟涨速%" },
  { id: "oi", name: "仓差(手)" },
  { id: "near_limit", name: "距离涨跌停%" },
  { id: "volume", name: "成交量(手)" },
];

export function AlertsPage() {
  const { selected, quotes, alerts } = useMarket();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertTrigger[]>([]);
  const [symbol, setSymbol] = useState(selected);
  const [kind, setKind] = useState<AlertRule["kind"]>("price");
  const [op, setOp] = useState<"gte" | "lte">("gte");
  const [threshold, setThreshold] = useState("0");
  const [mode, setMode] = useState<"once" | "daily">("once");
  const [message, setMessage] = useState("");

  const reload = async () => {
    const [ruleRes, triggerRes] = await Promise.all([fetch("/api/alerts"), fetch("/api/triggers")]);
    setRules(await ruleRes.json());
    setHistory(await triggerRes.json());
  };

  useEffect(() => {
    void reload();
  }, [alerts.length]);

  useEffect(() => {
    if (selected) setSymbol(selected);
  }, [selected]);

  return (
    <div className="split">
      <section className="panel">
        <h2>新建预警</h2>
        <p className="muted">条件在本机服务里判断。页面打开且允许通知时，会弹出浏览器通知。这里只做提醒，不会发出任何交易指令。</p>
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (Notification.permission === "default") await Notification.requestPermission();
            const response = await fetch("/api/alerts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol, kind, op, threshold: Number(threshold), mode }),
            });
            const body = await response.json();
            setMessage(response.ok ? "已保存，服务会在后续快照中判断" : body.message);
            if (response.ok) void reload();
          }}
        >
          <label>合约<input list="symbols" value={symbol} onChange={(event) => setSymbol(event.target.value)} required /></label>
          <datalist id="symbols">
            {quotes.filter((quote) => quote.isMain || quote.isContinuous).slice(0, 80).map((quote) => (
              <option key={quote.symbol} value={quote.symbol}>{quote.name}</option>
            ))}
          </datalist>
          <label>条件
            <select value={kind} onChange={(event) => setKind(event.target.value as AlertRule["kind"])}>
              {KINDS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {kind === "near_limit" ? null : (
            <label>方向
              <select value={op} onChange={(event) => setOp(event.target.value as "gte" | "lte")}>
                <option value="gte">大于等于</option>
                <option value="lte">小于等于</option>
              </select>
            </label>
          )}
          <label>阈值<input value={threshold} onChange={(event) => setThreshold(event.target.value)} required /></label>
          <label>次数
            <select value={mode} onChange={(event) => setMode(event.target.value as "once" | "daily")}>
              <option value="once">一次性</option>
              <option value="daily">每个交易日一次</option>
            </select>
          </label>
          <button type="submit">保存预警</button>
          {message ? <p>{message}</p> : null}
        </form>
        <ul className="rule-list">
          {rules.map((rule) => (
            <li key={rule.id}>
              <span>{rule.symbol} · {KINDS.find((item) => item.id === rule.kind)?.name} {rule.kind === "near_limit" ? "≤" : rule.op === "gte" ? "≥" : "≤"} {rule.threshold}</span>
              <em>{rule.enabled ? rule.mode === "once" ? "一次性" : "每日" : "已停用"}</em>
              <button
                onClick={async () => {
                  await fetch(`/api/alerts/${rule.id}`, { method: "DELETE" });
                  void reload();
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>触发记录</h2>
        <ul className="rule-list">
          {history.length === 0 ? <li className="muted">还没有触发记录</li> : null}
          {history.map((item) => (
            <li key={item.id}>
              <span>{formatDateTime(item.ts)} {item.message}</span>
              <em>最新价 {formatPrice(item.last, 2)}</em>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
