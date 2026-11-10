import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SearchDialog } from "./components/SearchDialog";
import { formatTime } from "./lib";
import { useMarket } from "./market";

export function App() {
  const market = useMarket();
  const [searchOpen, setSearchOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(!market.settings.riskAccepted);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <strong>期货行情看板</strong>
        <nav>
          <NavLink to="/" end>工作台</NavLink>
          <NavLink to="/market">全市场</NavLink>
          <NavLink to="/watch">自选</NavLink>
          <NavLink to="/news">资讯</NavLink>
          <NavLink to="/alerts">预警</NavLink>
          <NavLink to="/calendar">交易日历</NavLink>
          <NavLink to="/settings">设置</NavLink>
          <NavLink to="/admin">后台</NavLink>
        </nav>
      </aside>
      <header className="topbar">
        <button onClick={() => setSearchOpen(true)}>搜索 Ctrl+K</button>
        <span className={market.connected && !market.error ? "live" : "stale"}>
          {market.error || (market.connected ? "已连接" : "连接中")}
        </span>
        <span className="source-pill" title="快照约每秒刷新一次，不是交易所直连">
          {market.source} · {market.refreshMs / 1000}s · {formatTime(market.serverTime)}
        </span>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        行情来自{market.source}，K线来自{market.klineSource}。更新时间 {formatTime(market.serverTime)}（北京时间）。本信息仅供参考，不构成投资建议，据此操作风险自担。
      </footer>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      {riskOpen ? (
        <div className="modal-back">
          <div className="modal">
            <h2>风险揭示</h2>
            <p>本看板只展示行情与公开计算指标，不提供下单、委托或收益承诺。期货交易可能损失全部本金。</p>
            <p>行情由本机转发东方财富展示数据，刷新约 1 秒，页面会标明来源和更新时间。</p>
            <button
              onClick={() => {
                market.setSettings({ ...market.settings, riskAccepted: true });
                setRiskOpen(false);
              }}
            >
              我已阅读
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
