import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { AlertRule, AlertTrigger } from "./types.js";

export interface MainState {
  product: string;
  symbol: string;
  pendingSymbol: string | null;
  pendingStreak: number;
  tradingDay: string;
}

export class Store {
  db: DatabaseSync;

  constructor(file: string) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rules (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        kind TEXT NOT NULL,
        op TEXT NOT NULL,
        threshold REAL NOT NULL,
        mode TEXT NOT NULL,
        enabled INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        ts INTEGER NOT NULL,
        value REAL NOT NULL,
        last REAL,
        change_pct REAL,
        message TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mains (
        product TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        pending_symbol TEXT,
        pending_streak INTEGER NOT NULL,
        trading_day TEXT NOT NULL
      );
    `);
  }

  listRules(): AlertRule[] {
    const rows = this.db.prepare("SELECT * FROM rules ORDER BY created_at DESC").all() as Array<Record<string, unknown>>;
    return rows.map(mapRule);
  }

  saveRule(rule: AlertRule): void {
    this.db
      .prepare(
        `INSERT INTO rules (id, symbol, kind, op, threshold, mode, enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(rule.id, rule.symbol, rule.kind, rule.op, rule.threshold, rule.mode, rule.enabled ? 1 : 0, rule.createdAt);
  }

  deleteRule(id: string): void {
    this.db.prepare("DELETE FROM rules WHERE id = ?").run(id);
  }

  setRuleEnabled(id: string, enabled: boolean): void {
    this.db.prepare("UPDATE rules SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
  }

  addTrigger(row: Omit<AlertTrigger, "id">): AlertTrigger {
    const result = this.db
      .prepare(
        `INSERT INTO triggers (rule_id, symbol, ts, value, last, change_pct, message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(row.ruleId, row.symbol, row.ts, row.value, row.last, row.changePct, row.message);
    return { ...row, id: Number(result.lastInsertRowid) };
  }

  listTriggers(limit = 200): AlertTrigger[] {
    const rows = this.db
      .prepare("SELECT * FROM triggers ORDER BY ts DESC LIMIT ?")
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: Number(row.id),
      ruleId: String(row.rule_id),
      symbol: String(row.symbol),
      ts: Number(row.ts),
      value: Number(row.value),
      last: row.last == null ? null : Number(row.last),
      changePct: row.change_pct == null ? null : Number(row.change_pct),
      message: String(row.message),
    }));
  }

  getMain(product: string): MainState | null {
    const row = this.db.prepare("SELECT * FROM mains WHERE product = ?").get(product) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      product: String(row.product),
      symbol: String(row.symbol),
      pendingSymbol: row.pending_symbol == null ? null : String(row.pending_symbol),
      pendingStreak: Number(row.pending_streak),
      tradingDay: String(row.trading_day),
    };
  }

  saveMain(state: MainState): void {
    this.db
      .prepare(
        `INSERT INTO mains (product, symbol, pending_symbol, pending_streak, trading_day)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(product) DO UPDATE SET
           symbol = excluded.symbol,
           pending_symbol = excluded.pending_symbol,
           pending_streak = excluded.pending_streak,
           trading_day = excluded.trading_day`,
      )
      .run(state.product, state.symbol, state.pendingSymbol, state.pendingStreak, state.tradingDay);
  }
}

function mapRule(row: Record<string, unknown>): AlertRule {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    kind: row.kind as AlertRule["kind"],
    op: row.op as AlertRule["op"],
    threshold: Number(row.threshold),
    mode: row.mode as AlertRule["mode"],
    enabled: Number(row.enabled) === 1,
    createdAt: Number(row.created_at),
  };
}
