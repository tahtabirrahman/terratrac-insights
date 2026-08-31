import { createFileRoute } from "@tanstack/react-router";
import { data, usd } from "@/lib/dash";
import { PageHeader, Panel, TableWrap } from "@/components/dash";

export const Route = createFileRoute("/executive-summary")({
  head: () => ({
    meta: [
      { title: "Executive Summary | TerraTrac Supply Chain Planning" },
      {
        name: "description",
        content:
          "One-page summary for supply chain leadership: forecast accuracy, inventory exposure, supplier risk and four recommended actions with owners and timing.",
      },
      { property: "og:title", content: "Executive Summary | TerraTrac" },
      {
        property: "og:description",
        content:
          "Key takeaways and recommended actions from the TerraTrac demand forecasting and supply planning review.",
      },
    ],
  }),
  component: ExecutiveSummary,
});

const takeaways = [
  {
    n: "01",
    title: "Demand is forecastable — the current planning basis is not using it",
    body: `A trend + seasonality + promotion model delivers ${data.totals.wmape_avg}% WMAPE per SKU x DC on a blind ${data.totals.holdout_weeks}-week holdout, against ${data.totals.naive_avg}% for the moving-average approach it replaces — and, unlike the moving average, it prices in promotions and the annual cycle instead of chasing them a quarter late.`,
    metric: `${data.totals.wmape_avg}%`,
    metricLabel: `WMAPE, ${data.totals.holdout_weeks}-wk holdout`,
    tone: "good" as const,
  },
  {
    n: "02",
    title: "Coverage is below policy almost everywhere",
    body: `${data.totals.at_risk + data.totals.critical} of ${data.totals.plan_rows} reviewed SKU x DC positions are below reorder point and ${data.totals.critical} cannot cover a single replenishment lead time. Cover runs days, not weeks, against lead times of 14-33 days, so a normal supplier slip becomes a customer-facing stockout.`,
    metric: `${data.totals.at_risk + data.totals.critical}/${data.totals.plan_rows}`,
    metricLabel: "positions below ROP",
    tone: "risk" as const,
  },
  {
    n: "03",
    title: "One supplier carries most of the risk",
    body: "Trackline Manufacturing (Undercarriage) averages 33.4 days with σ 10.0 days and a 51-day P95 — the slowest and least consistent source in the network, and the cause of the six-week Asia Pacific outage in weeks 40-45 that censored demand history.",
    metric: "33.4d",
    metricLabel: "Trackline lead time · σ 10.0d",
    tone: "warn" as const,
  },
  {
    n: "04",
    title: "History must be corrected before it is trusted",
    body: "Six stockout weeks across five Undercarriage SKUs at two DCs understate true demand by roughly 100-200%. Left uncorrected, the forecast lowers safety stock precisely on the least reliable supplier — compounding the exposure rather than covering it.",
    metric: `+${data.totals.censored_uplift_pct}%`,
    metricLabel: "avg demand restored, weeks 40-45",
    tone: "info" as const,
  },
];

const actions = [
  {
    action: "Release the catch-up replenishment plan",
    detail: `${usd(data.totals.buy_value)} across ${data.totals.planned_skus} SKUs x 4 DCs, MOQ and pack size respected. Expedite the ${data.totals.critical} critical positions.`,
    owner: "Planning",
    when: "This week",
    tone: "risk",
  },
  {
    action: "Adopt the seasonal + promo forecast as the planning basis",
    detail: "Weekly refresh, WMAPE and bias tracked per SKU; promotions entered as a forward regressor rather than absorbed into the baseline.",
    owner: "Demand Planning",
    when: "Next cycle",
    tone: "good",
  },
  {
    action: "Re-parameterise safety stock from actual PO history",
    detail: "95% service level network-wide, 97.5% for Undercarriage at Chennai and Jakarta, planned against P95 lead times for Trackline.",
    owner: "Inventory",
    when: "30 days",
    tone: "warn",
  },
  {
    action: "Qualify a secondary Undercarriage source",
    detail: "Dual-source Track Shoe and Track Chain at a 70/30 split; put measured OTIF into the supplier QBR for all five vendors.",
    owner: "Procurement",
    when: "90 days",
    tone: "info",
  },
];

const toneCls: Record<string, string> = {
  risk: "border-l-risk",
  good: "border-l-good",
  warn: "border-l-warn",
  info: "border-l-info",
};
const metricCls: Record<string, string> = {
  risk: "text-risk",
  good: "text-good",
  warn: "text-warn",
  info: "text-info",
};

function ExecutiveSummary() {
  return (
    <>
      <PageHeader
        eyebrow="Part 3 · for supply chain leadership"
        title="Executive Summary"
        subtitle="TerraTrac Equipment Parts — demand forecasting and supply planning review. Scope: 7 planned SKUs across 3 ABC classes and 4 categories, 4 distribution centers, 5 suppliers, 104 weeks of sell-through and 220 purchase orders."
      />

      <Panel className="border-l-4 border-l-navy" bodyClassName="px-4 py-4 sm:px-6 sm:py-5">
        <div className="label-caps">The headline</div>
        <p className="mt-2 max-w-4xl text-[15px] leading-relaxed">
          Demand is predictable to within{" "}
          <span className="font-semibold">{data.totals.wmape_avg}% weighted error</span>, but
          inventory is not positioned to serve it:{" "}
          <span className="font-semibold text-risk">
            {data.totals.at_risk + data.totals.critical} of {data.totals.plan_rows} SKU x DC positions sit below reorder point
          </span>{" "}
          and {data.totals.critical} cannot cover one supplier lead time. The exposure is
          concentrated in Undercarriage, sourced single-vendor from the slowest and least reliable
          supplier in the network. Releasing a{" "}
          <span className="font-semibold">{usd(data.totals.buy_value)}</span> catch-up buy and
          re-basing safety stock on measured lead times closes the near-term gap; a secondary
          Undercarriage source closes the structural one.
        </p>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {takeaways.map((t) => (
          <Panel key={t.n} className={`border-l-4 ${toneCls[t.tone]}`}>
            <div className="flex items-start justify-between gap-5">
              <div>
                <div className="tabular label-caps">{t.n}</div>
                <h3 className="mt-1 text-sm font-semibold">{t.title}</h3>
              </div>
              <div className="shrink-0 text-right">
                <div className={`tabular text-xl font-semibold ${metricCls[t.tone]}`}>
                  {t.metric}
                </div>
                <div className="max-w-[9.5rem] text-[10px] leading-tight text-muted-foreground">
                  {t.metricLabel}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5" title="Recommended actions" bodyClassName="p-0">
        <TableWrap minWidth={620}>
          <table className="w-full text-sm">
            <thead>
              <tr className="label-caps border-b border-border text-left">
                <th className="px-5 py-2 font-semibold">Action</th>
                <th className="px-3 py-2 font-semibold">Owner</th>
                <th className="px-5 py-2 font-semibold">Timing</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.action} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          a.tone === "risk"
                            ? "bg-risk"
                            : a.tone === "good"
                              ? "bg-good"
                              : a.tone === "warn"
                                ? "bg-warn"
                                : "bg-info"
                        }`}
                      />
                      <div>
                        <div className="font-medium">{a.action}</div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{a.owner}</td>
                  <td className="px-5 py-3 align-top font-medium">{a.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Method in one line" className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Weekly demand per SKU modelled as linear trend + 3-harmonic annual Fourier seasonality +
            promotion dummy, fitted by least squares on censoring-corrected history and validated on
            a blind 8-week holdout. Reorder points combine lead-time demand with a 95%
            service-level safety stock that accounts for both demand and lead-time variability,
            using lead times measured from 220 actual purchase orders rather than supplier master
            data.
          </p>
        </Panel>
        <Panel title="Open questions for leadership">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Is 95% the right service level for C-class items, or should they run leaner?</li>
            <li>What working-capital ceiling applies to the catch-up buy?</li>
            <li>Is there appetite to qualify a second Undercarriage vendor this fiscal year?</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
