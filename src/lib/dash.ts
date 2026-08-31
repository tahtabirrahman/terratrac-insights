import raw from "@/data/dashboard.json";

export type Point = {
  week: number;
  date: string;
  actual: number | null;
  adjusted: number | null;
  fit: number | null;
  forecast: number | null;
  lo?: number;
  hi?: number;
  promo: number;
  censored: boolean;
};

export type Series = {
  sku: string;
  name: string;
  category: string;
  abc: string;
  supplier: string;
  points: Point[];
  trend_pct_yr: number;
  seasonal_amp_pct: number;
  promo_lift_pct: number;
  avg_weekly: number;
  forecast_avg: number;
};

export type PlanRow = {
  sku: string;
  name: string;
  abc: string;
  warehouse: string;
  warehouse_name: string;
  region: string;
  on_hand: number;
  on_order: number;
  fcst_weekly: number;
  safety_stock: number;
  rop: number;
  dos: number;
  status: "critical" | "stockout_risk" | "healthy" | "overstock";
  order_qty: number;
  timing: string;
  moq: number;
  pack: number;
  supplier: string;
  lead_time: number;
  value: number;
};

export type Supplier = {
  id: string;
  name: string;
  region: string;
  category: string;
  master_lt: number;
  master_sd: number;
  otif_master: number;
  actual_lt: number;
  actual_lt_sd: number;
  p95_lt: number;
  pos: number;
  otif_actual: number;
  avg_delay: number;
  max_delay: number;
  risk_score: number;
};

export const data = raw as unknown as {
  skus: string[];
  warehouses: {
    Warehouse_ID: string;
    Warehouse_Name: string;
    Region: string;
    Country: string;
    Storage_Capacity_Units: number;
  }[];
  suppliers: Supplier[];
  series: Series[];
  accuracy: {
    sku: string;
    name: string;
    abc: string;
    wmape: number;
    bias: number;
    naive_wmape: number;
    holdout_actual: number;
    holdout_forecast: number;
  }[];
  censoring: { sku: string; warehouse: string; observed: number; restored: number; weeks: number }[];
  plan: PlanRow[];
  totals: {
    skus_total: number;
    rows: number;
    weeks: number;
    pos: number;
    planned_skus: number;
    plan_rows: number;
    holdout_weeks: number;
    censored_uplift_pct: number;
    critical: number;
    at_risk: number;
    overstock: number;
    healthy: number;
    buy_value: number;
    excess_value: number;
    wmape_avg: number;
    naive_avg: number;
  };
};

export const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1000
      ? `$${(n / 1000).toFixed(0)}K`
      : `$${n.toFixed(0)}`;

export const num = (n: number, d = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const statusMeta: Record<PlanRow["status"], { label: string; cls: string; dot: string }> = {
  critical: {
    label: "Critical",
    cls: "bg-risk-soft text-risk border-risk/25",
    dot: "bg-risk",
  },
  stockout_risk: {
    label: "Stockout risk",
    cls: "bg-warn-soft text-warn border-warn/25",
    dot: "bg-warn",
  },
  healthy: { label: "Healthy", cls: "bg-good-soft text-good border-good/25", dot: "bg-good" },
  overstock: { label: "Overstocked", cls: "bg-info-soft text-info border-info/25", dot: "bg-info" },
};
