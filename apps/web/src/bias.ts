import type { Evidence } from "./news-brief";
import type { Quote } from "./types";

export interface BiasReason {
  category: string;
  text: string;
  source: string;
}

export interface Bias {
  side: "long" | "short" | "range";
  label: string;
  stars: number;
  reasons: BiasReason[];
}

export function scoreBias(quote: Quote, spot: Evidence[], inventory: Evidence[], policy: Evidence[], read: number): Bias {
  const reasons: BiasReason[] = [];
  const parts: Array<{ weight: number; score: number }> = [];
  pushCategory(parts, reasons, "现货价格", spot, 0.34);
  pushCategory(parts, reasons, "库存", inventory, 0.28);
  pushCategory(parts, reasons, "消息政策", policy, 0.22);

  if (quote.changePct != null) {
    let market = clamp(quote.changePct / 2, -1, 1);
    const oiRatio = quote.openInterest && quote.oiChange != null ? quote.oiChange / quote.openInterest : null;
    let marketText = `盘面相对昨结算${quote.changePct > 0 ? "上涨" : quote.changePct < 0 ? "下跌" : "持平"} ${Math.abs(quote.changePct).toFixed(2)}%`;
    if (oiRatio != null && Math.abs(oiRatio) >= 0.008 && Math.abs(quote.changePct) >= 0.15) {
      const adding = oiRatio > 0;
      const up = quote.changePct > 0;
      if (up === adding) market = clamp(market * 1.15, -1, 1);
      marketText += adding
        ? `，持仓增加 ${formatHands(quote.oiChange)}，${up ? "多头增仓" : "空头增仓"}`
        : `，持仓减少 ${formatHands(quote.oiChange)}，${up ? "空头回补" : "多头离场"}`;
    }
    parts.push({ weight: 0.16, score: market });
    reasons.push({ category: "盘面", text: marketText, source: "行情快照" });
  }

  if (!spot.length && !inventory.length && !policy.length) {
    reasons.unshift({
      category: "资讯",
      text: read ? `已读 ${read} 篇正文，没有抽出现货价格、库存或政策表述` : "没有读到可用的资讯正文",
      source: "新浪财经",
    });
  } else {
    reasons.unshift({ category: "资讯", text: `已阅读 ${read} 篇新浪正文，并摘出下列依据`, source: "新浪财经" });
  }

  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  const score = weight ? parts.reduce((sum, part) => sum + part.weight * part.score, 0) / weight : 0;
  const magnitude = Math.abs(score);
  if (magnitude < 0.16) return { side: "range", label: "中性震荡", stars: 0, reasons };
  const stars = Math.min(5, Math.max(1, Math.round(magnitude * 5)));
  const side = score > 0 ? "long" : "short";
  return { side, label: side === "long" ? `多 ${stars} 星` : `空 ${stars} 星`, stars, reasons };
}

function pushCategory(parts: Array<{ weight: number; score: number }>, reasons: BiasReason[], category: string, items: Evidence[], weight: number) {
  if (!items.length) {
    reasons.push({ category, text: "正文中没有对应表述", source: "" });
    return;
  }
  const score = items.reduce((sum, item) => sum + item.tilt, 0) / items.length;
  parts.push({ weight, score });
  for (const item of items) {
    const mark = item.tilt > 0 ? "偏多" : item.tilt < 0 ? "偏空" : "中性";
    reasons.push({ category, text: `${mark}：${item.text}`, source: item.title });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatHands(value: number | null): string {
  if (value == null) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value).toLocaleString("zh-CN")} 手`;
}
