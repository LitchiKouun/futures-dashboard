import { useEffect, useState } from "react";
import { formatDateTime } from "../lib";

interface Status {
  ok: boolean;
  paused: boolean;
  refreshMs: number;
  seq: number;
  serverTime: number;
  contracts: number;
  sockets: number;
  error: string | null;
  source: string;
  klineSource: string;
  uptimeMs: number;
  lastDuration: number;
  lastOkAt: number;
  memoryMb: number;
  host: string;
  port: number;
}

export function AdminPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  const [intervalMs, setIntervalMs] = useState(1000);

  const load = async () => {
    const response = await fetch("/api/admin");
    const body = (await response.json()) as Status;
    setStatus(body);
    setIntervalMs(body.refreshMs);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const update = async (body: { paused?: boolean; refreshMs?: number; refreshNow?: boolean }) => {
    const response = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const next = (await response.json()) as Status & { message?: string };
    if (!response.ok) {
      setMessage(next.message ?? "设置失败");
      return;
    }
    setStatus(next);
    setIntervalMs(next.refreshMs);
    setMessage(body.refreshNow ? "已发起一次刷新" : "已更新");
  };

  return (
    <div className="admin-page">
      <section className="panel">
        <h2>服务器</h2>
        <dl className="facts facts-wide">
          <div><dt>地址</dt><dd>{status ? `${status.host}:${status.port}` : "--"}</dd></div>
          <div><dt>运行</dt><dd>{status ? duration(status.uptimeMs) : "--"}</dd></div>
          <div><dt>内存</dt><dd>{status ? `${status.memoryMb} MB` : "--"}</dd></div>
          <div><dt>页面连接</dt><dd>{status?.sockets ?? "--"}</dd></div>
          <div><dt>行情源</dt><dd>{status?.source ?? "--"}</dd></div>
          <div><dt>K线源</dt><dd>{status?.klineSource ?? "--"}</dd></div>
        </dl>
      </section>
      <section className="panel">
        <h2>更新状态</h2>
        <dl className="facts facts-wide">
          <div><dt>状态</dt><dd>{status?.paused ? "已暂停" : status?.ok ? "正常" : "等待数据"}</dd></div>
          <div><dt>序号</dt><dd>{status?.seq ?? "--"}</dd></div>
          <div><dt>合约数</dt><dd>{status?.contracts ?? "--"}</dd></div>
          <div><dt>最近成功</dt><dd>{status?.lastOkAt ? formatDateTime(status.lastOkAt) : "--"}</dd></div>
          <div><dt>最近耗时</dt><dd>{status ? `${status.lastDuration} ms` : "--"}</dd></div>
          <div><dt>最近错误</dt><dd>{status?.error || "无"}</dd></div>
        </dl>
        <div className="toolbar">
          <label>
            刷新间隔
            <select value={intervalMs} onChange={(event) => setIntervalMs(Number(event.target.value))}>
              <option value={500}>0.5 秒</option>
              <option value={1000}>1 秒</option>
              <option value={2000}>2 秒</option>
              <option value={5000}>5 秒</option>
              <option value={10000}>10 秒</option>
            </select>
          </label>
          <button onClick={() => void update({ refreshMs: intervalMs })}>应用间隔</button>
          <button onClick={() => void update({ refreshNow: true })}>立即刷新</button>
          <button onClick={() => void update({ paused: !status?.paused })}>{status?.paused ? "恢复刷新" : "暂停刷新"}</button>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>
    </div>
  );
}

function duration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}小时${minutes}分${seconds % 60}秒`;
}
