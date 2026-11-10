import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { evaluateAlerts, newRuleId } from "./alerts.js";
import { getSessions, isTradingDay, monthGrid, sessionText } from "./calendar.js";
import { dropOffSessionBars, filterTradingDay, loadKline } from "./kline.js";
import { allProducts, lookupProduct } from "./products.js";
import { loadNewsBrief } from "./news-read.js";
import { loadProductNews } from "./news.js";
import { fetchQuotes } from "./quotes.js";
import { ranksFromHistory, ranksFromQuotes, readRankFile, writeRankFile } from "./ranks.js";
import { Store } from "./store.js";
import type { AlertRule, Anomaly, Quote } from "./types.js";

const PORT = 8787;
const HOST = "127.0.0.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const store = new Store(path.join(root, "data", "board.db"));

interface Snapshot {
  type: "snapshot";
  seq: number;
  serverTime: number;
  source: string;
  klineSource: string;
  refreshMs: number;
  quotes: Quote[];
  anomalies: Anomaly[];
  alerts: Array<{ message: string; symbol: string; ts: number }>;
}

const signatures = new Map<string, string>();

function signatureOf(quote: Quote): string {
  return [quote.last, quote.bid1, quote.ask1, quote.bidVol1, quote.askVol1, quote.volume, quote.openInterest, quote.oiChange, quote.high, quote.low, quote.tradingStatus, quote.speed1m, quote.isMain].join("|");
}

let latest: Snapshot = {
  type: "snapshot",
  seq: 0,
  serverTime: 0,
  source: "东方财富展示行情",
  klineSource: "新浪财经",
  refreshMs: 1000,
  quotes: [],
  anomalies: [],
  alerts: [],
};
let lastError: string | null = null;
let refreshMs = 1000;
let paused = false;
let forceRefresh = false;
let lastDuration = 0;
let lastOkAt = 0;
let lastSavedAt = 0;
const bootedAt = Date.now();
const rankDir = path.join(root, "data", "ranks");
const sockets = new Set<WebSocket>();

function send(socket: WebSocket, payload: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
}

function broadcast(payload: unknown) {
  const text = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(text);
  }
}

function statusPayload() {
  return {
    ok: lastError == null && latest.seq > 0,
    paused,
    refreshMs,
    seq: latest.seq,
    serverTime: latest.serverTime,
    contracts: latest.quotes.length,
    sockets: sockets.size,
    error: lastError,
    source: latest.source,
    klineSource: latest.klineSource,
    uptimeMs: Date.now() - bootedAt,
    lastDuration,
    lastOkAt,
    memoryMb: Math.round(process.memoryUsage().rss / 1048576),
    host: HOST,
    port: PORT,
  };
}

async function tick() {
  const started = Date.now();
  const shouldFetch = forceRefresh || !paused;
  forceRefresh = false;
  if (shouldFetch) try {
    const { quotes, anomalies } = await fetchQuotes(store);
    const triggers = evaluateAlerts(store, quotes);
    latest = {
      ...latest,
      seq: latest.seq + 1,
      serverTime: Date.now(),
      refreshMs,
      quotes,
      anomalies,
      alerts: triggers.map((item) => ({ message: item.message, symbol: item.symbol, ts: item.ts })),
    };
    lastError = null;
    lastDuration = Date.now() - started;
    lastOkAt = Date.now();
    const tradingDay = quotes.find((quote) => quote.tradingDay)?.tradingDay;
    if (tradingDay && Date.now() - lastSavedAt > 60_000) {
      writeRankFile(rankDir, ranksFromQuotes(tradingDay, quotes, latest.source, "当日行情快照，沉淀资金为估算值"));
      lastSavedAt = Date.now();
    }
    const changed = quotes.filter((quote) => {
      const signature = signatureOf(quote);
      const previous = signatures.get(quote.symbol);
      signatures.set(quote.symbol, signature);
      return previous !== signature;
    });
    for (const symbol of [...signatures.keys()]) {
      if (!quotes.some((quote) => quote.symbol === symbol)) signatures.delete(symbol);
    }
    const fresh = latest.seq === 1 || latest.seq % 30 === 0 || changed.length > 500;
    broadcast(fresh ? latest : { ...latest, type: "patch", quotes: changed });
  } catch (error) {
    lastError = error instanceof Error ? error.message : "行情拉取失败";
    lastDuration = Date.now() - started;
    broadcast({ type: "status", ok: false, message: lastError, serverTime: Date.now() });
  }
  const wait = paused ? 400 : Math.max(200, refreshMs - (Date.now() - started));
  setTimeout(tick, wait);
}

function quoteOf(symbol: string): Quote | undefined {
  const key = symbol.toLowerCase();
  return latest.quotes.find((quote) => quote.symbol.toLowerCase() === key);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error("请求过大");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(raw),
    "Cache-Control": "no-store",
  });
  res.end(raw);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${HOST}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      json(res, 200, statusPayload());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/admin") {
      json(res, 200, statusPayload());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/admin") {
      const body = JSON.parse(await readBody(req)) as { paused?: boolean; refreshMs?: number; refreshNow?: boolean };
      if (typeof body.paused === "boolean") paused = body.paused;
      if (body.refreshMs != null) {
        if (!Number.isFinite(body.refreshMs) || body.refreshMs < 500 || body.refreshMs > 60_000) {
          json(res, 400, { message: "刷新间隔需在 0.5 秒到 60 秒之间" });
          return;
        }
        refreshMs = body.refreshMs;
        latest = { ...latest, refreshMs };
      }
      if (body.refreshNow) forceRefresh = true;
      json(res, 200, statusPayload());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/calendar/ranks") {
      const date = url.searchParams.get("date") ?? "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        json(res, 400, { message: "日期格式应为 YYYY-MM-DD" });
        return;
      }
      if (!isTradingDay(date)) {
        json(res, 200, { date, closed: true, gainers: [], losers: [], volume: [], openInterest: [], marginCapital: [] });
        return;
      }
      const saved = readRankFile(rankDir, date);
      if (saved) {
        json(res, 200, saved);
        return;
      }
      const tradingDay = latest.quotes.find((quote) => quote.tradingDay)?.tradingDay;
      if (date === tradingDay && latest.quotes.length) {
        const ranks = ranksFromQuotes(date, latest.quotes, latest.source, "当日行情快照，沉淀资金为估算值");
        writeRankFile(rankDir, ranks);
        json(res, 200, ranks);
        return;
      }
      if (!latest.quotes.length) {
        json(res, 503, { message: "行情尚未就绪" });
        return;
      }
      json(res, 200, await ranksFromHistory(date, latest.quotes));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/quotes") {
      json(res, 200, { serverTime: latest.serverTime, source: latest.source, quotes: latest.quotes, anomalies: latest.anomalies });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/kline") {
      const symbol = url.searchParams.get("symbol") ?? "";
      const period = url.searchParams.get("period") ?? "1d";
      const quote = quoteOf(symbol);
      if (!quote) {
        json(res, 404, { message: "未找到合约" });
        return;
      }
      const allowed = new Set(["intraday", "1m", "5m", "15m", "30m", "1h", "1d", "1w", "1M"]);
      if (!allowed.has(period)) {
        json(res, 400, { message: "不支持的周期" });
        return;
      }
      let bars = await loadKline(quote.sinaSymbol, period === "intraday" ? "intraday" : period);
      if (period !== "1d" && period !== "1w" && period !== "1M") bars = dropOffSessionBars(bars);
      if (period === "intraday") bars = filterTradingDay(bars, quote.tradingDay, quote.night !== "none");
      json(res, 200, {
        symbol: quote.symbol,
        sinaSymbol: quote.sinaSymbol,
        period,
        source: "新浪财经",
        tradingDay: quote.tradingDay,
        note: quote.isContinuous ? "主连由真实日线拼接，换月处可能出现跳空" : "K线为数据源原始柱，未做插值",
        bars,
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/calendar") {
      const now = new Date();
      const year = Number(url.searchParams.get("year") ?? now.getFullYear());
      const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
      const product = (url.searchParams.get("product") ?? "rb").toLowerCase();
      const spec = lookupProduct(product, "SHFE");
      json(res, 200, {
        year,
        month,
        days: monthGrid(year, month).map((cell) => ({ ...cell, trading: isTradingDay(cell.date) })),
        sessions: sessionText(spec.night),
        detail: getSessions(url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10), spec.night).map((session) => ({
          ...session,
          phase: session.phase,
          label: session.label,
        })),
        product: spec,
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/products") {
      json(res, 200, allProducts());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/news") {
      const product = (url.searchParams.get("product") ?? "").toLowerCase();
      if (!/^[a-z]{1,4}$/.test(product)) {
        json(res, 400, { message: "请指定品种代码" });
        return;
      }
      try {
        json(res, 200, await loadProductNews(product));
      } catch (error) {
        json(res, 404, { message: error instanceof Error ? error.message : "资讯获取失败" });
      }
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/news/brief") {
      const product = (url.searchParams.get("product") ?? "").toLowerCase();
      if (!/^[a-z]{1,4}$/.test(product)) {
        json(res, 400, { message: "请指定品种代码" });
        return;
      }
      try {
        json(res, 200, await loadNewsBrief(product));
      } catch (error) {
        json(res, 404, { message: error instanceof Error ? error.message : "资讯正文读取失败" });
      }
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/alerts") {
      json(res, 200, store.listRules());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/triggers") {
      json(res, 200, store.listTriggers());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/alerts") {
      const body = JSON.parse(await readBody(req)) as Partial<AlertRule>;
      const kinds = new Set(["price", "change_pct", "speed", "oi", "near_limit", "volume"]);
      if (!body.symbol || !body.kind || !kinds.has(body.kind) || !Number.isFinite(body.threshold)) {
        json(res, 400, { message: "预警条件不完整" });
        return;
      }
      if (store.listRules().filter((rule) => rule.enabled).length >= 20) {
        json(res, 400, { message: "最多 20 条启用中的预警" });
        return;
      }
      const quote = quoteOf(body.symbol);
      const rule: AlertRule = {
        id: newRuleId(),
        symbol: quote?.symbol ?? body.symbol,
        kind: body.kind,
        op: body.op === "lte" ? "lte" : "gte",
        threshold: Number(body.threshold),
        mode: body.mode === "daily" ? "daily" : "once",
        enabled: true,
        createdAt: Date.now(),
      };
      store.saveRule(rule);
      json(res, 201, rule);
      return;
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/alerts/")) {
      store.deleteRule(decodeURIComponent(url.pathname.slice("/api/alerts/".length)));
      json(res, 200, { ok: true });
      return;
    }
    json(res, 404, { message: "未找到" });
  } catch (error) {
    json(res, 500, { message: error instanceof Error ? error.message : "服务异常" });
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket) => {
  sockets.add(socket);
  send(socket, latest.seq > 0 ? latest : { type: "status", ok: false, message: "正在拉取行情", serverTime: Date.now() });
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => sockets.delete(socket));
});

server.listen(PORT, HOST, () => {
  console.log(`期货看板行情服务 http://${HOST}:${PORT}`);
  void tick();
});
