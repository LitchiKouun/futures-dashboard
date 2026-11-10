import { allProducts, lookupProduct } from "./products.js";

export interface NewsItem {
  title: string;
  url: string;
  time: string;
  product: string;
  productName: string;
}

interface CacheEntry {
  at: number;
  items: NewsItem[];
  moreUrl: string;
}

const cache = new Map<string, CacheEntry>();
const TTL = 10 * 60 * 1000;

export async function loadProductNews(product: string): Promise<{ product: string; productName: string; source: string; moreUrl: string; items: NewsItem[] }> {
  const code = product.toLowerCase();
  const spec = lookupProduct(code, "SHFE");
  if (!allProducts().some((item) => item.code === code)) throw new Error("未知品种");
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < TTL) {
    return { product: code, productName: spec.name, source: "新浪财经", moreUrl: hit.moreUrl, items: hit.items };
  }
  const sina = code.toUpperCase();
  const hubUrl = `https://finance.sina.com.cn/money/future/${sina}/`;
  const quoteUrl = `https://finance.sina.com.cn/futures/quotes/${sina}0.shtml`;
  const hub = await fetchText(hubUrl);
  let items = hub ? parseHub(hub, code, spec.name) : [];
  let moreUrl = hubUrl;
  if (!items.length) {
    const page = await fetchText(quoteUrl);
    items = page ? parseQuoteNews(page, code, spec.name) : [];
    moreUrl = quoteUrl;
  }
  cache.set(code, { at: Date.now(), items, moreUrl });
  return { product: code, productName: spec.name, source: "新浪财经", moreUrl, items };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.sina.com.cn/" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return new TextDecoder("gbk").decode(new Uint8Array(await response.arrayBuffer()));
  } catch {
    return null;
  }
}

function parseHub(html: string, product: string, productName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const re = /<li>\s*<span[^>]*>\[([^\]]+)\]<\/span>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\(([^)<]+)\)/g;
  for (const match of html.matchAll(re)) {
    const title = decode(match[3] ?? "");
    const url = match[2] ?? "";
    if (!title || !url.startsWith("http")) continue;
    items.push({ title, url, time: decode(match[4] ?? ""), product, productName });
    if (items.length >= 20) break;
  }
  return items;
}

function parseQuoteNews(html: string, product: string, productName: string): NewsItem[] {
  const start = html.indexOf('id="box-information"');
  if (start < 0) return [];
  const end = html.indexOf("</ul>", start);
  const block = html.slice(start, end > start ? end : start + 12_000).replace(/<!--[\s\S]*?-->/g, "");
  const items: NewsItem[] = [];
  for (const li of block.matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const row = li[1] ?? "";
    const anchor = /<a href="(https?:\/\/finance\.sina\.com\.cn\/[^"]+)"[^>]*>([^<]+)<\/a>/.exec(row);
    const title = decode(anchor?.[2] ?? "");
    if (!anchor || !title) continue;
    const time = decode(/<span class="date">([^<]*)<\/span>/.exec(row)?.[1] ?? "");
    items.push({ title, url: anchor[1] ?? "", time, product, productName });
    if (items.length >= 15) break;
  }
  return items;
}

function decode(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
