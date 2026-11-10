import assert from "node:assert/strict";
import test from "node:test";
import { amplitudePct, changeOf, changePctOf, marginCapital, orderImbalance, speculation, trend } from "./metrics.js";

test("涨跌默认相对昨结算", () => {
  assert.equal(changeOf(3034, 3050), -16);
  assert.equal(changePctOf(-16, 3050)?.toFixed(4), ((-16 / 3050) * 100).toFixed(4));
});

test("分母为 0 时衍生指标为空", () => {
  assert.equal(orderImbalance(0, 0), null);
  assert.equal(speculation(10, 0), null);
  assert.equal(trend(10, 10, 10, 10), null);
  assert.equal(changePctOf(1, 0), null);
  assert.equal(amplitudePct(11, 9, null), null);
});

test("沉淀资金按单边持仓乘 2", () => {
  assert.equal(marginCapital(100, 3000, 10, 0.1), 100 * 2 * 3000 * 10 * 0.1);
  assert.equal(marginCapital(null, 3000, 10, 0.1), null);
});
