import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductNews } from "../components/ProductNews";
import { SECTORS, type Sector } from "../types";

interface ProductRow {
  code: string;
  name: string;
  sector: Sector;
}

export function NewsPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const selected = (params.get("product") ?? "rb").toLowerCase();

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((rows: ProductRow[]) => setProducts(rows))
      .catch(() => setProducts([]));
  }, []);

  const grouped = useMemo(() => {
    return SECTORS.map((sector) => ({
      sector,
      items: products.filter((item) => item.sector === sector),
    })).filter((group) => group.items.length);
  }, [products]);

  return (
    <div className="news-page">
      <aside className="panel news-products">
        <h2>按品种</h2>
        {grouped.map((group) => (
          <div key={group.sector}>
            <h3>{group.sector}</h3>
            <div className="news-product-list">
              {group.items.map((item) => (
                <button
                  key={item.code}
                  className={item.code === selected ? "active" : ""}
                  onClick={() => setParams({ product: item.code })}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>
      <ProductNews product={selected} />
    </div>
  );
}
