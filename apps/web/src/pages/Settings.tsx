import { FORMULAS } from "../lib";
import { useMarket } from "../market";

export function SettingsPage() {
  const { settings, setSettings } = useMarket();
  return (
    <div className="split">
      <section className="panel form">
        <h2>显示</h2>
        <label>涨跌基准
          <select value={settings.basis} onChange={(event) => setSettings({ ...settings, basis: event.target.value as "settlement" | "close" })}>
            <option value="settlement">昨结算</option>
            <option value="close">昨收盘</option>
          </select>
        </label>
        <p className="muted">当前行情源只提供昨结算。切换到昨收盘后，若没有昨收字段，全站仍按昨结算计算，并在工作台标明。</p>
        <label>主题
          <select value={settings.theme} onChange={(event) => setSettings({ ...settings, theme: event.target.value as "dark" | "light" })}>
            <option value="dark">深色</option>
            <option value="light">浅色</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.colorblind} onChange={(event) => setSettings({ ...settings, colorblind: event.target.checked })} />
          色盲友好（上涨蓝，下跌橙，仍保留正负号）
        </label>
        <p className="muted">时区固定为 Asia/Shanghai。价格小数位按合约最小变动价位显示。刷新约 1 秒，由本机服务拉取。</p>
      </section>
      <section className="panel">
        <h2>字段说明</h2>
        <table className="formula">
          <thead><tr><th>指标</th><th>公式</th><th>说明</th></tr></thead>
          <tbody>
            {FORMULAS.map(([name, formula, note]) => (
              <tr key={name}><td>{name}</td><td>{formula}</td><td>{note}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted">沉淀资金、资金流向类指标为估算值，只适合同一数据源内横向比较。</p>
      </section>
    </div>
  );
}
