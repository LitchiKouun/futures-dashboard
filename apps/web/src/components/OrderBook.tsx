import { formatLots, formatPrice, formatSigned, tone } from "../lib";
import type { Quote } from "../types";

export function OrderBook({ quote }: { quote: Quote | undefined }) {
  if (!quote) return <div className="panel muted">选择合约后显示盘口</div>;
  const nearUp = quote.last != null && quote.upperLimit != null && quote.prevSettlement ? (quote.upperLimit - quote.last) / quote.prevSettlement <= 0.01 : false;
  const nearDown = quote.last != null && quote.lowerLimit != null && quote.prevSettlement ? (quote.last - quote.lowerLimit) / quote.prevSettlement <= 0.01 : false;
  return (
    <div className="book">
      <div className="book-title">
        <strong>{quote.name}</strong>
        <span className="tag">{quote.tradingStatus}</span>
        {quote.isMain ? <span className="tag">主力</span> : null}
        {quote.isContinuous ? <span className="tag">主连</span> : null}
        <span className="tag">L1</span>
      </div>
      <div className={`book-last ${tone(quote.change)}`}>{formatPrice(quote.last, quote.priceDecimals)}</div>
      <div className={tone(quote.change)}>
        {formatSigned(quote.change, quote.priceDecimals)} {quote.changePct == null ? "--" : `${formatSigned(quote.changePct, 2)}%`}
      </div>
      {nearUp ? <div className="warn-strip">接近涨停</div> : null}
      {nearDown ? <div className="warn-strip down">接近跌停</div> : null}
      <div className="book-row ask">
        <span>卖一</span>
        <b>{formatPrice(quote.ask1, quote.priceDecimals)}</b>
        <span>{formatLots(quote.askVol1)}</span>
      </div>
      <div className="book-row bid">
        <span>买一</span>
        <b>{formatPrice(quote.bid1, quote.priceDecimals)}</b>
        <span>{formatLots(quote.bidVol1)}</span>
      </div>
      <dl className="facts">
        <div><dt>委比</dt><dd className={tone(quote.orderImbalance)}>{quote.orderImbalance == null ? "--" : `${formatSigned(quote.orderImbalance, 1)}%`}</dd></div>
        <div><dt>委差</dt><dd>{quote.bidVol1 == null || quote.askVol1 == null ? "--" : formatLots(quote.bidVol1 - quote.askVol1)}</dd></div>
        <div><dt>涨停{quote.limitEstimated ? "(估)" : ""}</dt><dd>{formatPrice(quote.upperLimit, quote.priceDecimals)}</dd></div>
        <div><dt>跌停{quote.limitEstimated ? "(估)" : ""}</dt><dd>{formatPrice(quote.lowerLimit, quote.priceDecimals)}</dd></div>
        <div><dt>持仓</dt><dd>{formatLots(quote.openInterest)}</dd></div>
        <div><dt>仓差</dt><dd className={tone(quote.oiChange)}>{formatLots(quote.oiChange)}</dd></div>
      </dl>
    </div>
  );
}

export function ContractFacts({ quote }: { quote: Quote }) {
  const night = quote.night === "none" ? "无夜盘" : quote.night === "2300" ? "夜盘至 23:00" : quote.night === "0100" ? "夜盘至 01:00" : "夜盘至 02:30";
  return (
    <dl className="facts facts-wide">
      <div><dt>交易单位</dt><dd>{quote.multiplier} 吨/手，以交易所合约为准</dd></div>
      <div><dt>最小变动</dt><dd>{quote.tickSize}</dd></div>
      <div><dt>保证金率</dt><dd>{(quote.marginRate * 100).toFixed(1)}% 估算</dd></div>
      <div><dt>交易时段</dt><dd>{night}；日盘 09:00–10:15、10:30–11:30、13:30–15:00</dd></div>
      <div><dt>沉淀资金</dt><dd title="估算值，仅供横向比较">{formatLots(quote.marginCapital)} 估算</dd></div>
      <div><dt>投机度</dt><dd>{quote.speculation == null ? "--" : quote.speculation.toFixed(2)}</dd></div>
      <div><dt>外盘/内盘</dt><dd>{formatLots(quote.outside)} / {formatLots(quote.inside)}</dd></div>
      <div><dt>均价</dt><dd>{formatPrice(quote.averagePrice, quote.priceDecimals)}</dd></div>
    </dl>
  );
}
