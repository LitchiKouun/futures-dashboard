import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { applyBasis, loadSettings, loadSymbol, saveSettings, saveSymbol, type Settings } from "./lib";
import type { Anomaly, Quote, Snapshot } from "./types";

interface MarketState {
  quotes: Quote[];
  anomalies: Anomaly[];
  bySymbol: Map<string, Quote>;
  serverTime: number;
  source: string;
  klineSource: string;
  refreshMs: number;
  connected: boolean;
  error: string;
  seq: number;
  settings: Settings;
  setSettings: (next: Settings) => void;
  selected: string;
  setSelected: (symbol: string) => void;
  alerts: Array<{ message: string; symbol: string; ts: number }>;
}

const MarketContext = createContext<MarketState | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const [selected, setSelectedState] = useState(() => loadSymbol());
  const [raw, setRaw] = useState<Quote[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [alerts, setAlerts] = useState<Array<{ message: string; symbol: string; ts: number }>>([]);
  const [serverTime, setServerTime] = useState(0);
  const [source, setSource] = useState("东方财富展示行情");
  const [klineSource, setKlineSource] = useState("新浪财经");
  const [refreshMs, setRefreshMs] = useState(1000);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("正在连接行情");
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.cb = settings.colorblind ? "1" : "0";
  }, [settings]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let stopped = false;
    let retry = 500;
    const connect = () => {
      if (stopped) return;
        const protocol = location.protocol === "https:" ? "wss" : "ws";
        const host = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "127.0.0.1:8787" : location.host;
        socket = new WebSocket(`${protocol}://${host}/ws`);
      socket.onopen = () => {
        retry = 500;
        setConnected(true);
      };
      socket.onclose = () => {
        setConnected(false);
        setError("行情连接中断，正在重连");
        window.setTimeout(connect, Math.min(retry, 5000));
        retry *= 2;
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as Snapshot | { type: "status"; message?: string; serverTime?: number };
        if (message.type === "status") {
          setError(message.message ?? "行情暂不可用");
          if (message.serverTime) setServerTime(message.serverTime);
          return;
        }
        setRaw((current) => {
          if (message.type === "snapshot" || current.length === 0) return message.quotes;
          const merged = new Map(current.map((quote) => [quote.symbol, quote]));
          for (const quote of message.quotes) merged.set(quote.symbol, quote);
          return [...merged.values()];
        });
        setAnomalies(message.anomalies);
        setServerTime(message.serverTime);
        setSource(message.source);
        setKlineSource(message.klineSource);
        setRefreshMs(message.refreshMs);
        setSeq(message.seq);
        setError("");
        if (message.alerts.length) {
          setAlerts((prev) => [...message.alerts, ...prev].slice(0, 50));
          if (Notification.permission === "granted") {
            for (const item of message.alerts) new Notification("预警触发", { body: item.message });
          }
        }
      };
    };
    connect();
    return () => {
      stopped = true;
      socket?.close();
    };
  }, []);

  const quotes = useMemo(() => raw.map((quote) => applyBasis(quote, settings.basis)), [raw, settings.basis]);
  const bySymbol = useMemo(() => new Map(quotes.map((quote) => [quote.symbol.toLowerCase(), quote])), [quotes]);

  const setSettings = (next: Settings) => {
    setSettingsState(next);
    saveSettings(next);
  };
  const setSelected = (symbol: string) => {
    setSelectedState(symbol);
    saveSymbol(symbol);
  };

  useEffect(() => {
    if (!selected && quotes.length) {
      const preferred = quotes.find((quote) => quote.product === "rb" && quote.isContinuous) ?? quotes.find((quote) => quote.isMain);
      if (preferred) setSelected(preferred.symbol);
    }
  }, [quotes, selected]);

  const value: MarketState = {
    quotes,
    anomalies,
    bySymbol,
    serverTime,
    source,
    klineSource,
    refreshMs,
    connected,
    error,
    seq,
    settings,
    setSettings,
    selected,
    setSelected,
    alerts,
  };
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const value = useContext(MarketContext);
  if (!value) throw new Error("行情上下文不可用");
  return value;
}
