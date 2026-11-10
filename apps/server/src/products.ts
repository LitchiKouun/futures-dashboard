import type { Exchange, Night, ProductSpec, Sector } from "./types.js";

type Row = [
  string,
  string,
  Exchange,
  Sector,
  number,
  number,
  number,
  number,
  Night,
  string,
  string,
];

const rows: Row[] = [
  ["rb", "螺纹钢", "SHFE", "黑色金属", 10, 1, 0.07, 0.07, "2300", "luowengang", "lwg"],
  ["hc", "热轧卷板", "SHFE", "黑色金属", 10, 1, 0.07, 0.07, "2300", "rezhajuanban", "rzjb"],
  ["wr", "线材", "SHFE", "黑色金属", 10, 1, 0.09, 0.08, "none", "xiancai", "xc"],
  ["ss", "不锈钢", "SHFE", "黑色金属", 5, 5, 0.08, 0.07, "0100", "buxiugang", "bxg"],
  ["i", "铁矿石", "DCE", "黑色金属", 100, 0.5, 0.11, 0.1, "2300", "tiekuangshi", "tks"],
  ["j", "焦炭", "DCE", "黑色金属", 100, 0.5, 0.2, 0.1, "2300", "jiaotan", "jt"],
  ["jm", "焦煤", "DCE", "黑色金属", 60, 0.5, 0.12, 0.1, "2300", "jiaomei", "jm"],
  ["sf", "硅铁", "CZCE", "黑色金属", 5, 2, 0.08, 0.07, "2300", "guitie", "gt"],
  ["sm", "锰硅", "CZCE", "黑色金属", 5, 2, 0.08, 0.07, "2300", "menggui", "mg"],
  ["cu", "沪铜", "SHFE", "有色金属", 5, 10, 0.08, 0.07, "0100", "hutong", "ht"],
  ["al", "沪铝", "SHFE", "有色金属", 5, 5, 0.08, 0.07, "0100", "hulv", "hl"],
  ["zn", "沪锌", "SHFE", "有色金属", 5, 5, 0.08, 0.07, "0100", "huxin", "hx"],
  ["pb", "沪铅", "SHFE", "有色金属", 5, 5, 0.08, 0.07, "0100", "huqian", "hq"],
  ["ni", "沪镍", "SHFE", "有色金属", 1, 10, 0.12, 0.1, "0100", "hunie", "hn"],
  ["sn", "沪锡", "SHFE", "有色金属", 1, 10, 0.12, 0.1, "0100", "huxi", "hx"],
  ["ao", "氧化铝", "SHFE", "有色金属", 20, 1, 0.09, 0.08, "0100", "yanghualv", "yhl"],
  ["ad", "铸造铝合金", "SHFE", "有色金属", 10, 5, 0.09, 0.08, "0100", "zhuzaolvhejin", "zzlhj"],
  ["bc", "国际铜", "INE", "有色金属", 5, 10, 0.08, 0.08, "0100", "guojitong", "gjt"],
  ["si", "工业硅", "GFEX", "有色金属", 5, 5, 0.08, 0.07, "2300", "gongyegui", "gyg"],
  ["lc", "碳酸锂", "GFEX", "有色金属", 1, 50, 0.1, 0.1, "2300", "tansuanli", "tsl"],
  ["ps", "多晶硅", "GFEX", "有色金属", 3, 5, 0.09, 0.08, "2300", "duojinggui", "djg"],
  ["au", "沪金", "SHFE", "有色金属", 1000, 0.02, 0.08, 0.08, "0230", "hujin", "hj"],
  ["ag", "沪银", "SHFE", "有色金属", 15, 1, 0.1, 0.1, "0230", "huyin", "hy"],
  ["sc", "原油", "INE", "能源化工", 1000, 0.1, 0.1, 0.08, "0230", "yuanyou", "yy"],
  ["fu", "燃油", "SHFE", "能源化工", 10, 1, 0.1, 0.08, "2300", "ranyou", "ry"],
  ["lu", "低硫燃油", "INE", "能源化工", 10, 1, 0.1, 0.08, "2300", "diuliuranyou", "dlry"],
  ["bu", "沥青", "SHFE", "能源化工", 10, 1, 0.1, 0.08, "2300", "liqing", "lq"],
  ["ru", "橡胶", "SHFE", "能源化工", 10, 5, 0.08, 0.08, "2300", "xiangjiao", "xj"],
  ["nr", "20号胶", "INE", "能源化工", 10, 5, 0.08, 0.08, "2300", "ershihaojiao", "eshj"],
  ["br", "丁二烯橡胶", "SHFE", "能源化工", 5, 5, 0.08, 0.08, "2300", "dingerxixiangjiao", "dexxj"],
  ["sp", "纸浆", "SHFE", "能源化工", 10, 2, 0.08, 0.07, "2300", "zhijiang", "zj"],
  ["ec", "欧线集运", "INE", "能源化工", 50, 0.1, 0.12, 0.1, "2300", "ouxianjiyun", "oxjy"],
  ["l", "塑料", "DCE", "能源化工", 5, 1, 0.07, 0.07, "2300", "suliao", "sl"],
  ["v", "PVC", "DCE", "能源化工", 5, 1, 0.07, 0.07, "2300", "pvc", "pvc"],
  ["pp", "聚丙烯", "DCE", "能源化工", 5, 1, 0.07, 0.07, "2300", "jubingxi", "jbx"],
  ["eg", "乙二醇", "DCE", "能源化工", 10, 1, 0.08, 0.07, "2300", "yierchun", "yec"],
  ["eb", "苯乙烯", "DCE", "能源化工", 5, 1, 0.08, 0.07, "2300", "benyixi", "byx"],
  ["pg", "液化石油气", "DCE", "能源化工", 20, 1, 0.08, 0.07, "2300", "yehuashiyouqi", "yhsyq"],
  ["bz", "纯苯", "DCE", "能源化工", 5, 1, 0.08, 0.07, "2300", "chunben", "cb"],
  ["lg", "原木", "DCE", "能源化工", 90, 0.5, 0.08, 0.07, "2300", "yuanmu", "ym"],
  ["ta", "PTA", "CZCE", "能源化工", 5, 2, 0.07, 0.07, "2300", "pta", "pta"],
  ["ma", "甲醇", "CZCE", "能源化工", 10, 1, 0.08, 0.08, "2300", "jiachun", "jc"],
  ["fg", "玻璃", "CZCE", "能源化工", 20, 1, 0.08, 0.07, "2300", "boli", "bl"],
  ["sa", "纯碱", "CZCE", "能源化工", 20, 1, 0.08, 0.08, "2300", "chunjian", "cj"],
  ["ur", "尿素", "CZCE", "能源化工", 20, 1, 0.08, 0.07, "2300", "niaosu", "ns"],
  ["pf", "短纤", "CZCE", "能源化工", 5, 2, 0.07, 0.07, "2300", "duanxian", "dx"],
  ["sh", "烧碱", "CZCE", "能源化工", 30, 1, 0.08, 0.08, "2300", "shaojian", "sj"],
  ["px", "对二甲苯", "CZCE", "能源化工", 5, 2, 0.08, 0.08, "2300", "duierjiben", "dejb"],
  ["pr", "瓶片", "CZCE", "能源化工", 15, 2, 0.08, 0.07, "2300", "pingpian", "pp"],
  ["pl", "丙烯", "CZCE", "能源化工", 20, 1, 0.08, 0.07, "2300", "bingxi", "bx"],
  ["cy", "棉纱", "CZCE", "农产品", 5, 5, 0.08, 0.07, "2300", "miansha", "ms"],
  ["a", "豆一", "DCE", "农产品", 10, 1, 0.07, 0.07, "2300", "douyi", "dy"],
  ["b", "豆二", "DCE", "农产品", 10, 1, 0.07, 0.07, "2300", "douer", "de"],
  ["m", "豆粕", "DCE", "农产品", 10, 1, 0.07, 0.07, "2300", "doupo", "dp"],
  ["y", "豆油", "DCE", "农产品", 10, 2, 0.07, 0.07, "2300", "douyou", "dy"],
  ["p", "棕榈油", "DCE", "农产品", 10, 2, 0.08, 0.08, "2300", "zonglvyou", "zly"],
  ["c", "玉米", "DCE", "农产品", 10, 1, 0.07, 0.07, "2300", "yumi", "ym"],
  ["cs", "玉米淀粉", "DCE", "农产品", 10, 1, 0.06, 0.06, "2300", "yumidianfen", "ymdf"],
  ["jd", "鸡蛋", "DCE", "农产品", 10, 1, 0.07, 0.07, "none", "jidan", "jd"],
  ["lh", "生猪", "DCE", "农产品", 16, 5, 0.08, 0.08, "none", "shengzhu", "sz"],
  ["rr", "粳米", "DCE", "农产品", 10, 1, 0.06, 0.06, "none", "jingmi", "jm"],
  ["fb", "纤维板", "DCE", "农产品", 10, 0.5, 0.1, 0.08, "none", "xianweiban", "xwb"],
  ["bb", "胶合板", "DCE", "农产品", 500, 0.05, 0.15, 0.08, "none", "jiaoheban", "jhb"],
  ["cf", "棉花", "CZCE", "农产品", 5, 5, 0.07, 0.07, "2300", "mianhua", "mh"],
  ["sr", "白糖", "CZCE", "农产品", 10, 1, 0.07, 0.07, "2300", "baitang", "bt"],
  ["oi", "菜油", "CZCE", "农产品", 10, 1, 0.07, 0.07, "2300", "caiyou", "cy"],
  ["rm", "菜粕", "CZCE", "农产品", 10, 1, 0.07, 0.07, "2300", "caipo", "cp"],
  ["ap", "苹果", "CZCE", "农产品", 10, 1, 0.08, 0.08, "none", "pingguo", "pg"],
  ["cj", "红枣", "CZCE", "农产品", 5, 5, 0.08, 0.08, "none", "hongzao", "hz"],
  ["pk", "花生", "CZCE", "农产品", 5, 2, 0.08, 0.08, "none", "huasheng", "hs"],
  ["wh", "强麦", "CZCE", "农产品", 20, 1, 0.1, 0.08, "none", "qiangmai", "qm"],
  ["pm", "普麦", "CZCE", "农产品", 50, 1, 0.1, 0.08, "none", "pumai", "pm"],
  ["ri", "早籼稻", "CZCE", "农产品", 20, 1, 0.1, 0.08, "none", "zaoxiandao", "zxd"],
  ["lr", "晚籼稻", "CZCE", "农产品", 20, 1, 0.1, 0.08, "none", "wanxiandao", "wxd"],
  ["jr", "粳稻", "CZCE", "农产品", 20, 1, 0.1, 0.08, "none", "jingdao", "jd"],
  ["rs", "菜籽", "CZCE", "农产品", 10, 1, 0.1, 0.08, "none", "caizi", "cz"],
  ["if", "沪深300", "CFFEX", "金融期货", 300, 0.2, 0.12, 0.1, "none", "hushen300", "hs300"],
  ["ih", "上证50", "CFFEX", "金融期货", 300, 0.2, 0.12, 0.1, "none", "shangzheng50", "sz50"],
  ["ic", "中证500", "CFFEX", "金融期货", 200, 0.2, 0.14, 0.1, "none", "zhongzheng500", "zz500"],
  ["im", "中证1000", "CFFEX", "金融期货", 200, 0.2, 0.14, 0.1, "none", "zhongzheng1000", "zz1000"],
  ["t", "十债", "CFFEX", "金融期货", 10000, 0.005, 0.02, 0.02, "none", "shizhai", "sz"],
  ["tf", "五债", "CFFEX", "金融期货", 10000, 0.005, 0.012, 0.012, "none", "wuzhai", "wz"],
  ["ts", "二债", "CFFEX", "金融期货", 20000, 0.002, 0.005, 0.005, "none", "erzhai", "ez"],
  ["tl", "三十债", "CFFEX", "金融期货", 10000, 0.01, 0.035, 0.035, "none", "sanshizhai", "ssz"],
];

const byCode = new Map<string, ProductSpec>();
for (const [code, name, exchange, sector, multiplier, tick, margin, limitPct, night, pinyin, initials] of rows) {
  byCode.set(code, { code, name, exchange, sector, multiplier, tick, margin, limitPct, night, pinyin, initials });
}

const exchangeBySc: Record<number, Exchange> = {
  113: "SHFE",
  114: "DCE",
  115: "CZCE",
  8: "CFFEX",
  142: "INE",
  225: "GFEX",
};

const continuousName: Record<string, string> = {
  沪深: "if",
  上证: "ih",
  中证500: "ic",
  中证1000: "im",
  五债: "tf",
  二债: "ts",
  十债: "t",
  三十债: "tl",
};

const cffexPrefix: Record<string, string> = {
  "04": "if",
  "05": "tf",
  "06": "ic",
  "07": "ih",
  "11": "t",
  "13": "ts",
  "14": "tl",
  "15": "im",
};

const cffexLabels = Object.entries(continuousName).sort((a, b) => b[0].length - a[0].length);

export function cffexProduct(symbol: string, name: string): string | null {
  for (const [label, code] of cffexLabels) {
    if (name.startsWith(label)) return code;
  }
  return cffexPrefix[symbol.slice(0, 2)] ?? null;
}

export function exchangeOf(sc: number): Exchange {
  return exchangeBySc[sc] ?? "SHFE";
}

export function priceDecimals(tick: number): number {
  const text = tick.toString();
  const dot = text.indexOf(".");
  return dot < 0 ? 0 : text.length - dot - 1;
}

export function lookupProduct(code: string, exchange: Exchange): ProductSpec {
  const found = byCode.get(code.toLowerCase());
  if (found) return found;
  const night: Night = exchange === "CFFEX" ? "none" : "2300";
  return {
    code: code.toLowerCase(),
    name: code.toUpperCase(),
    exchange,
    sector: "其他",
    multiplier: 10,
    tick: 1,
    margin: 0.1,
    limitPct: 0.08,
    night,
    pinyin: code.toLowerCase(),
    initials: code.toLowerCase(),
  };
}

export function allProducts(): ProductSpec[] {
  return [...byCode.values()];
}

export interface ParsedSymbol {
  product: string;
  kind: "month" | "main" | "sub" | "index";
}

export function parseSymbol(symbol: string, name: string, exchange: Exchange): ParsedSymbol {
  if (exchange === "CFFEX") {
    const product = cffexProduct(symbol, name);
    if (product) {
      if (name.includes("次主连")) return { product, kind: "sub" };
      if (name.includes("主连")) return { product, kind: "main" };
      if (/\d{4}$/.test(name)) return { product, kind: "month" };
      return { product, kind: "index" };
    }
  }
  if (name.includes("次主连")) {
    const product = productFromContinuous(symbol, name, exchange);
    return { product, kind: "sub" };
  }
  if (name.includes("主连")) {
    return { product: productFromContinuous(symbol, name, exchange), kind: "main" };
  }
  if (name.includes("加权") || name.includes("指数")) {
    return { product: productFromContinuous(symbol, name, exchange), kind: "index" };
  }
  const matched = symbol.match(/^([A-Za-z]+)\d{3,4}$/);
  if (matched) return { product: matched[1].toLowerCase(), kind: "month" };
  const letters = symbol.match(/^([A-Za-z]+)$/);
  if (letters) return { product: letters[1].toLowerCase().replace(/m$/, "") || letters[1].toLowerCase(), kind: "index" };
  return { product: symbol.toLowerCase(), kind: "index" };
}

function productFromContinuous(symbol: string, name: string, exchange: Exchange): string {
  if (exchange === "CFFEX") {
    for (const [label, code] of Object.entries(continuousName)) {
      if (name.startsWith(label)) return code;
    }
  }
  const month = symbol.match(/^([A-Za-z]+)\d{3,4}$/);
  if (month) return month[1].toLowerCase();
  if (/^[A-Za-z]+m$/i.test(symbol)) return symbol.slice(0, -1).toLowerCase();
  for (const product of byCode.values()) {
    if (name.startsWith(product.name)) return product.code;
  }
  return symbol.replace(/\d+$/g, "").toLowerCase();
}

export function toSinaSymbol(symbol: string, name: string, exchange: Exchange, product: string): string {
  if (exchange === "CFFEX" && /^\d+$/.test(symbol)) {
    const month = name.match(/(\d{4})$/);
    if (month) return `${product.toUpperCase()}${month[1]}`;
    return `${product.toUpperCase()}0`;
  }
  if (name.includes("主连") && !name.includes("次主连")) return `${product.toUpperCase()}0`;
  const matched = symbol.match(/^([A-Za-z]+)(\d+)$/);
  if (!matched) return symbol.toUpperCase();
  const [, letters, digits] = matched;
  if (exchange === "CZCE" && digits.length === 3) {
    const yearDigit = Number(digits[0]);
    const month = digits.slice(1);
    const nowY = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric" }).format(new Date()),
    );
    const decade = Math.floor(nowY / 10) * 10;
    let year = decade + yearDigit;
    if (year < nowY - 1) year += 10;
    return `${letters.toUpperCase()}${String(year).slice(2)}${month}`;
  }
  return `${letters}${digits}`.toUpperCase();
}

export function roundToTick(value: number, tick: number): number {
  const steps = Math.round(value / tick);
  const rounded = steps * tick;
  const decimals = priceDecimals(tick);
  return Number(rounded.toFixed(decimals));
}
