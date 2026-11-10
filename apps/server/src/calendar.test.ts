import assert from "node:assert/strict";
import test from "node:test";
import { describeMarket, isTradingDay } from "./calendar.js";

const at = (iso: string) => new Date(iso);

test("日盘连续交易与休市", () => {
  const morning = describeMarket(at("2026-11-10T11:00:00+08:00"), "2300");
  assert.equal(morning.tradingDay, "2026-11-10");
  assert.equal(morning.status, "连续交易");
  const pause = describeMarket(at("2026-11-10T10:20:00+08:00"), "none");
  assert.equal(pause.status, "盘中休市");
  assert.equal(pause.tradingDay, "2026-11-10");
});

test("夜盘归属下一交易日，周五夜盘进入下周一", () => {
  const night = describeMarket(at("2026-11-10T22:00:00+08:00"), "2300");
  assert.equal(night.tradingDay, "2026-11-11");
  assert.equal(night.status, "连续交易");
  const friday = describeMarket(at("2026-11-13T22:00:00+08:00"), "2300");
  assert.equal(friday.tradingDay, "2026-11-16");
  assert.equal(friday.status, "连续交易");
  const closed = describeMarket(at("2026-11-10T22:00:00+08:00"), "none");
  assert.equal(closed.status, "已收盘");
  assert.equal(closed.tradingDay, "2026-11-10");
});

test("无夜盘品种周六视为已收盘，有夜盘品种处于交易日间隙", () => {
  const dayOnly = describeMarket(at("2026-11-14T10:00:00+08:00"), "none");
  assert.equal(dayOnly.status, "已收盘");
  assert.equal(dayOnly.tradingDay, "2026-11-13");
  const withNight = describeMarket(at("2026-11-14T10:00:00+08:00"), "2300");
  assert.equal(withNight.tradingDay, "2026-11-16");
  assert.equal(withNight.status, "盘中休市");
});

test("节假日不是交易日", () => {
  assert.equal(isTradingDay("2026-10-01"), false);
  assert.equal(isTradingDay("2026-11-10"), true);
  assert.equal(isTradingDay("2026-11-14"), false);
});
