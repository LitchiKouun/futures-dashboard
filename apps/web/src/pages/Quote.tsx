import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ChartPane } from "../components/ChartPane";
import { ProductNews } from "../components/ProductNews";
import { ContractFacts, OrderBook } from "../components/OrderBook";
import { useMarket } from "../market";
import { contractMonth, loadWatch, saveWatch } from "../lib";
import { EXCHANGE_NAME } from "../types";

export function QuotePage() {
  const { symbol = "" } = useParams();
  const market = useMarket();
  const decoded = decodeURIComponent(symbol);
  const quote = market.bySymbol.get(decoded.toLowerCase());
  useEffect(() => {
    if (quote) market.setSelected(quote.symbol);
  }, [quote?.symbol]);
  const colors = market.settings.colorblind ? { up: "#3B82F6", down: "#F59E0B" } : { up: "#E54545", down: "#18A058" };
  if (!quote) return <div className="panel">未找到合约 {symbol}。行情加载后会自动出现。</div>;
  const month = contractMonth(quote.symbol);
  return (
    <div className="quote-page">
      <div className="quote-head">
        <div>
          <h2>{quote.name} <small>{quote.symbol}</small></h2>
          <div className="muted">{EXCHANGE_NAME[quote.exchange]} · {quote.sector} · 交易日 {quote.tradingDay}</div>
        </div>
        <button
          onClick={() => {
            const groups = loadWatch();
            const first = groups[0];
            if (!first || first.symbols.includes(quote.symbol) || first.symbols.length >= 200) return;
            first.symbols.push(quote.symbol);
            saveWatch(groups);
          }}
        >
          加入自选
        </button>
        <Link to="/market">返回全市场</Link>
      </div>
      <div className="chart-book">
        <ChartPane symbol={quote.symbol} up={colors.up} down={colors.down} />
        <OrderBook quote={quote} />
      </div>
      <section className="panel">
        <h3>合约资料</h3>
        <ContractFacts quote={quote} />
        <p className="muted">合约月份 {month ?? "--"}。最后交易日与交割方式以交易所公告为准。五档行情需要 Level-2 授权，当前展示买一卖一。</p>
      </section>
      <ProductNews product={quote.product} />
    </div>
  );
}
