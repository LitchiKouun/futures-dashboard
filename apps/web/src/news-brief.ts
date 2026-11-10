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
