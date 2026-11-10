import { lookupProduct } from "./products.js";
import { loadProductNews } from "./news.js";

export interface Evidence {
  category: "spot" | "inventory" | "policy";
  text: string;
  title: string;
  url: string;
  tilt: -1 | 0 | 1;
}

export interface NewsBrief {
  product: string;
  productName: string;
  source: string;
  read: number;
  spot: Evidence[];
  inventory: Evidence[];
  policy: Evidence[];
}

const cache = new Map<string, { at: number; brief: NewsBrief }>();
const TTL = 10 * 60 * 1000;

const EXTRA: Record<string, string[]> = {
  rb: ["螺纹"],
  hc: ["热卷", "热轧"],
  i: ["铁矿"],
  j: ["焦炭"],
  jm: ["焦煤"],
  cu: ["沪铜", "铜价"],
  al: ["沪铝", "铝价"],
  zn: ["沪锌", "锌价"],
  pb: ["沪铅", "铅价"],
  ni: ["沪镍", "镍价"],
  sn: ["沪锡", "锡价"],
  au: ["沪金", "黄金"],
  ag: ["沪银", "白银"],
  sc: ["原油"],
  fu: ["燃油"],
  bu: ["沥青"],
  ru: ["橡胶"],
  m: ["豆粕"],
  y: ["豆油"],
  p: ["棕榈"],
  c: ["玉米"],
  a: ["豆一"],
  b: ["豆二"],
  lh: ["生猪", "猪价"],
  jd: ["鸡蛋"],
  ma: ["甲醇"],
  sa: ["纯碱"],
  fg: ["玻璃"],
  ta: ["PTA"],
  ur: ["尿素"],
  if: ["沪深300", "股指"],
  ih: ["上证50"],
  ic: ["中证500"],
  im: ["中证1000"],
  t: ["十债", "十年期国债"],
  tf: ["五债"],
  ts: ["二债"],
  tl: ["三十债"],
  lc: ["碳酸锂", "锂价"],
  si: ["工业硅"],
};

export async function loadNewsBrief(product: string): Promise<NewsBrief> {
  const code = product.toLowerCase();
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL) return hit.brief;
  const spec = lookupProduct(code, "SHFE");
  const list = await loadProductNews(code);
  const names = aliases(code, spec.name);
  const picked = list.items.filter((item) => markdownUrl(item.url)).slice(0, 10);
  const articles = await Promise.all(picked.map(async (item) => ({ item, body: await fetchMarkdown(item.url) })));
  const spot: Evidence[] = [];
  const inventory: Evidence[] = [];
  const policy: Evidence[] = [];
  let read = 0;
  for (const article of articles) {
    if (!article.body || article.body.length < 40) continue;
    read += 1;
    const found = extract(article.body, names, article.item.title, article.item.url);
    spot.push(...found.filter((item) => item.category === "spot"));
    inventory.push(...found.filter((item) => item.category === "inventory"));
    policy.push(...found.filter((item) => item.category === "policy"));
  }
  const brief: NewsBrief = {
    product: code,
    productName: spec.name,
    source: "新浪财经",
    read,
    spot: rank(spot),
    inventory: rank(inventory),
    policy: rank(policy),
  };
  cache.set(code, { at: Date.now(), brief });
  return brief;
}

function aliases(code: string, name: string): string[] {
  return [...new Set([name, ...(EXTRA[code] ?? [])].filter((item) => item.length >= 2))];
}

function markdownUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "finance.sina.com.cn" || !parsed.pathname.endsWith(".shtml")) return null;
    return `${parsed.origin}${parsed.pathname}.md`;
  } catch {
    return null;
  }
}

async function fetchMarkdown(url: string): Promise<string> {
  const target = markdownUrl(url);
  if (!target) return "";
  try {
    const response = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.sina.com.cn/" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return "";
    const text = await response.text();
    const fence = text.indexOf("---", 3);
    const body = (fence >= 0 ? text.slice(fence + 3) : text).replace(/\u3000/g, "").trim();
    if (body.length < 40) return "";
    return body;
  } catch {
    return "";
  }
}

function extract(body: string, names: string[], title: string, url: string): Evidence[] {
  const lines = body.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let section = false;
  const chunks: string[] = [];
  for (const line of lines) {
    if (isHeader(line)) {
      section = names.some((name) => line.includes(name));
      continue;
    }
    if (/从业资格|责任编辑|风险自担|不构成投资建议|免责声明/.test(line)) continue;
    if (section || names.some((name) => line.includes(name))) chunks.push(line);
  }
  const found: Evidence[] = [];
  for (const chunk of chunks) {
    for (const sentence of chunk.split(/(?<=[。！？])/).map((item) => item.trim()).filter((item) => item.length >= 12 && item.length <= 180)) {
      for (const category of categoriesOf(sentence)) {
        found.push({ category, text: sentence, title, url, tilt: tiltOf(sentence, category) });
      }
    }
  }
  return found;
}

function isHeader(line: string): boolean {
  return line.length <= 16 && /[：:]$/.test(line);
}

function categoriesOf(sentence: string): Evidence["category"][] {
  const found: Evidence["category"][] = [];
  if (/库存|累库|去库|社库|厂库|港口库存/.test(sentence)) found.push("inventory");
  if (/政策|限产|减产|环保|关税|调控|应急响应|停产|复产|收储|抛储|发改委|国务院|保障措施/.test(sentence)) found.push("policy");
  if (/现货|报价|出厂价|市场价/.test(sentence) || (/元\/吨|元每吨/.test(sentence) && !/盘面|合约收盘|期货/.test(sentence))) found.push("spot");
  return found;
}

function tiltOf(sentence: string, category: Evidence["category"]): -1 | 0 | 1 {
  if (category === "inventory") {
    if (/去库|库存下降|库存减少|库存回落|降至/.test(sentence) && !/累库|库存增加|库存上升/.test(sentence)) return 1;
    if (/累库|库存上升|库存增加|库存回升|增至/.test(sentence)) return -1;
    return 0;
  }
  if (category === "policy") {
    const demandWeak = /需求/.test(sentence) && /停产|停车|走弱|下滑|负反馈|极低|疲弱/.test(sentence);
    const supplyTight = /供应|厂家|开工/.test(sentence) && /限产|减产|停产|检修|收紧/.test(sentence) && !/需求/.test(sentence);
    const supplyLoose = /复产|增产|供应增加|供应恢复/.test(sentence);
    if (demandWeak || supplyLoose) return -1;
    if (supplyTight) return 1;
  }
  if (/持平|窄幅|震荡/.test(sentence) && !/上涨|下跌|上调|下调|限产|复产/.test(sentence)) return 0;
  const bull = count(sentence, category === "policy"
    ? ["限产", "减产", "停产", "收储", "刺激", "出口增加", "供应收紧"]
    : ["上涨", "上调", "提涨", "走高", "走强", "反弹"]);
  const bear = count(sentence, category === "policy"
    ? ["复产", "增产", "抛储", "出口下滑", "限制出口", "供应增加"]
    : ["下跌", "下调", "回落", "走低", "走弱", "承压"]);
  if (bull === bear) return 0;
  return bull > bear ? 1 : -1;
}

function count(sentence: string, words: string[]): number {
  return words.reduce((sum, word) => sum + (sentence.includes(word) ? 1 : 0), 0);
}

function rank(items: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.text.slice(0, 24);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt))
    .slice(0, 3);
}
