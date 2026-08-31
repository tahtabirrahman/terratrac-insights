import { createFileRoute, Link } from "@tanstack/react-router";
import { data, usd, num } from "@/lib/dash";
import { Kpi, PageHeader, Panel, Pill } from "@/components/dash";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview | TerraTrac Supply Chain Planning" },
      {
        name: "description",
        content:
          "Company context and key findings for TerraTrac Equipment Parts: 25 SKUs, 4 distribution centers, 5 category-specialist suppliers.",
      },
      { property: "og:title", content: "Overview | TerraTrac Supply Chain Planning" },
      {
        property: "og:description",
        content:
          "Company context and key findings from the TerraTrac demand forecasting and supply planning case study.",
      },
    ],
  }),
  component: Overview,
});

const findings = [
  {
    tag: "Forecast",
    title: "Seasonal + promo regression is the better planning basis",
    body: `A trend + Fourier-seasonality + promotion regression averages ${data.totals.wmape_avg}% WMAPE per SKU x DC on a blind ${data.totals.holdout_weeks}-week holdout, versus ${data.totals.naive_avg}% for a 52-week moving average, and it removes the systematic under-forecast the moving average carries into promotion weeks. Every reviewed SKU shows a clear annual cycle and a measurable promotion lift.`,
  },
  {
    tag: "Data quality",
    title: "Undercarriage demand in weeks 40-45 is censored, not soft",
    body: `The weeks 40-45 supply disruption at Chennai and Jakarta suppressed observed sell-through for all five Undercarriage SKUs by an average of ${data.totals.censored_uplift_pct}%. Uncorrected, it drags the forecast down and understates safety stock for the least reliable supplier in the network.`,
  },
  {
    tag: "Inventory",
    title: `${data.totals.at_risk + data.totals.critical} of ${data.totals.plan_rows} SKU x DC positions sit below reorder point`,
    body: `Network-wide cover is 1-3 weeks against supplier lead times of 2-5 weeks. ${data.totals.critical} positions cannot even cover a single replenishment lead time; ${usd(data.totals.buy_value)} of buys are recommended this cycle.`,
  },
  {
    tag: "Supply",
    title: "Trackline Manufacturing is the structural constraint",
    body: "33.4-day actual average lead time with a 10-day standard deviation and a 51-day P95 — roughly double every other supplier. It drives the largest safety-stock requirement in the portfolio and warrants a secondary source.",
  },
];

function Overview() {
  const skus = data.series;
  return (
    <>
      <PageHeader
        eyebrow="Case study"
        title="TerraTrac Equipment Parts — Demand Forecasting & Supply Planning"
        subtitle="TerraTrac distributes spare parts for heavy construction equipment across five categories, operating four regional distribution centers and sourcing from five category-specialist suppliers. This dashboard reviews two years of weekly sell-through, the current inventory position, and 220 historical purchase orders to produce a 12-week forecast and a replenishment plan."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Forecast accuracy (WMAPE)"
          value={`${data.totals.wmape_avg}%`}
          delta={`vs ${data.totals.naive_avg}% naive baseline`}
          tone="good"
        />
        <Kpi
          label="Positions below reorder point"
          value={`${data.totals.at_risk} / 20`}
          delta={`${data.totals.critical} cannot cover one lead time`}
          tone="risk"
        />
        <Kpi
          label="Recommended buy this cycle"
          value={usd(data.totals.buy_value)}
          delta="MOQ and pack size respected"
        />
        <Kpi
          label="Worst supplier lead time"
          value="33.4 d"
          delta="Trackline Mfg · σ 10.0 d · P95 51 d"
          tone="warn"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Panel title="Network" hint="Four regional distribution centers" className="lg:col-span-1">
          <ul className="space-y-3">
            {data.warehouses.map((w) => (
              <li key={w.Warehouse_ID} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{w.Warehouse_Name}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.Region} · {w.Country}
                  </div>
                </div>
                <div className="tabular text-right text-xs text-muted-foreground">
                  {num(w.Storage_Capacity_Units)}
                  <div className="text-[10px]">units cap.</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Suppliers"
          hint="Category specialists, measured on actual PO history"
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="label-caps border-b border-border text-left">
                <th className="px-5 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 text-right font-semibold">Lead time</th>
                <th className="px-3 py-2 text-right font-semibold">σ</th>
                <th className="px-5 py-2 text-right font-semibold">OTIF</th>
              </tr>
            </thead>
            <tbody>
              {data.suppliers.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-2.5 font-medium">{s.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{s.category}</td>
                  <td className="tabular px-3 py-2.5 text-right">{s.actual_lt} d</td>
                  <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                    {s.actual_lt_sd} d
                  </td>
                  <td className="tabular px-5 py-2.5 text-right">
                    <span className={s.otif_actual < 70 ? "text-risk" : ""}>{s.otif_actual}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {findings.map((f) => (
          <Panel key={f.title}>
            <Pill className="border-teal/25 bg-accent text-accent-foreground">{f.tag}</Pill>
            <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </Panel>
        ))}
      </div>

      <Panel
        className="mt-6"
        title="SKUs in scope"
        hint="Five SKUs spanning three ABC classes and four categories"
        bodyClassName="p-0"
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="label-caps border-b border-border text-left">
              <th className="px-5 py-2 font-semibold">SKU</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">ABC</th>
              <th className="px-3 py-2 text-right font-semibold">Avg weekly</th>
              <th className="px-5 py-2 text-right font-semibold">12-wk forecast avg</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((s) => (
              <tr key={s.sku} className="border-b border-border/60 last:border-0">
                <td className="tabular px-5 py-2.5">{s.sku}</td>
                <td className="px-3 py-2.5 font-medium">{s.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.category}</td>
                <td className="px-3 py-2.5">
                  <Pill className="border-border bg-secondary text-secondary-foreground">
                    {s.abc}
                  </Pill>
                </td>
                <td className="tabular px-3 py-2.5 text-right">{s.avg_weekly}</td>
                <td className="tabular px-5 py-2.5 text-right">{s.forecast_avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/forecasting"
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-navy-foreground transition-opacity hover:opacity-90"
        >
          View demand forecasts
        </Link>
        <Link
          to="/executive-summary"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Executive summary
        </Link>
      </div>
    </>
  );
}
