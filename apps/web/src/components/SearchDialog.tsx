import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarket } from "../market";

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { quotes, setSelected } = useMarket();
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const results = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return quotes.filter((quote) => quote.isContinuous).slice(0, 12);
    return quotes
      .filter((quote) => {
        const blob = `${quote.symbol} ${quote.name} ${quote.product} ${quote.productName} ${quote.pinyin} ${quote.initials} ${quote.sinaSymbol}`.toLowerCase();
        return blob.includes(q);
      })
      .slice(0, 30);
  }, [quotes, text]);

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal search-modal" onClick={(event) => event.stopPropagation()}>
        <input autoFocus placeholder="代码 / 中文 / 拼音，例如 rb、螺纹、luowen" value={text} onChange={(event) => setText(event.target.value)} />
        <ul>
          {results.map((quote) => (
            <li key={quote.symbol}>
              <button
                onClick={() => {
                  setSelected(quote.symbol);
                  navigate(`/quote/${encodeURIComponent(quote.symbol)}`);
                  onClose();
                }}
              >
                <b>{quote.symbol}</b>
                <span>{quote.name}</span>
                <em>{quote.exchange}</em>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
