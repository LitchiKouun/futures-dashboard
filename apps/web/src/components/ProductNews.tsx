import { useEffect, useState } from "react";

export interface NewsItem {
  title: string;
  url: string;
  time: string;
  product: string;
  productName: string;
}

interface NewsPayload {
  productName: string;
  source: string;
  moreUrl: string;
  items: NewsItem[];
}

export function ProductNews({ product }: { product: string }) {
  const [data, setData] = useState<NewsPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let dead = false;
    setData(null);
    setError("");
    fetch(`/api/news?product=${encodeURIComponent(product)}`)
      .then(async (response) => {
        const body = (await response.json()) as NewsPayload & { message?: string };
        if (!response.ok) throw new Error(body.message || "资讯获取失败");
        return body;
      })
      .then((body) => {
        if (!dead) setData(body);
      })
      .catch((reason: unknown) => {
        if (!dead) setError(reason instanceof Error ? reason.message : "资讯获取失败");
      });
    return () => {
      dead = true;
    };
  }, [product]);

  return (
    <section className="panel news-panel">
      <h3>{data?.productName ?? product.toUpperCase()} 资讯</h3>
      {error ? <p className="muted">{error}</p> : null}
      {!data && !error ? <p className="muted">正在读取新浪财经资讯</p> : null}
      {data && data.items.length === 0 ? <p className="muted">这个品种暂时没有读到资讯。</p> : null}
      <ul className="news-list">
        {(data?.items ?? []).map((item) => (
          <li key={item.url}>
            <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
            <span>{item.time}</span>
          </li>
        ))}
      </ul>
      {data ? (
        <p className="source-line">
          来源 {data.source}
          {data.moreUrl ? <> · <a href={data.moreUrl} target="_blank" rel="noreferrer">新浪品种页</a></> : null}
        </p>
      ) : null}
    </section>
  );
}
