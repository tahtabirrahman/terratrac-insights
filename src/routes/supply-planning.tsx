import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { data, num, statusMeta, usd, type PlanRow } from "@/lib/dash";
import { Kpi, PageHeader, Panel, Pill } from "@/components/dash";

export const Route = createFileRoute("/supply-planning")({
  head: () => ({
    meta: [
      { title: "Supply Planning | TerraTrac Supply Chain Planning" },
      {
        name: "description",
        content:
          "SKU x warehouse inventory grid with on-hand, on-order, reorder point, safety stock, days of supply, risk flags and MOQ-respecting replenishment recommendations.",
      },
      { property: "og:title", content: "Supply Planning | TerraTrac" },
      {
        property: "og:description",
        content:
          "Reorder points, safety stock at 95% service level, risk flags and replenishment recommendations by SKU and DC.",
      },
    ],
  }),
  component: SupplyPlanning,
});

function SupplyPlanning() {
  const [wh, setWh] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const rows = useMemo(
    () =>
      data.plan.filter(
        (r) =>
          (wh === "ALL" || r.warehouse === wh) && (status === "ALL" || r.status === status),
      ),
    [wh, status],
  );
  const buy = rows.reduce((a, r) => a + r.value, 0);

  return (
    <>
      <PageHeader
        eyebrow="Part 2"
        title="Supply Planning"
        subtitle="Reorder point = forecast demand over the supplier lead time + safety stock. Safety stock uses a 95% cycle service level (z = 1.645) and combines demand variability and lead-time variability: SS = z x sqrt(LT x σ_demand² + (μ_demand x σ_LT)²). Lead times and their standard deviations come from the actual 220-PO delivery history, not the supplier master."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Critical positions"
          value={String(data.totals.critical)}
          delta="cover < one lead time"
          tone="risk"
        />
        <Kpi
          label="Below reorder point"
          value={`${data.totals.at_risk} / 20`}
          delta="action required this cycle"
          tone="warn"
        />
        <Kpi
          label="Healthy / overstocked"
          value={`${data.totals.healthy} / ${data.totals.overstock}`}
          delta="no position carries excess cover"
        />
        <Kpi label="Recommended buy (filtered)" value={usd(buy)} delta="at standard unit cost" />
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center gap-2">
        <span className="label-caps mr-1">Filter</span>
        {[{ id: "ALL", label: "All DCs" }, ...data.warehouses.map((w) => ({
          id: w.Warehouse_ID,
          label: w.Warehouse_Name,
        }))].map((o) => (
          <button
            key={o.id}
            onClick={() => setWh(o.id)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              wh === o.id
                ? "border-navy bg-navy text-navy-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {o.label}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        {[
          { id: "ALL", label: "All statuses" },
          { id: "critical", label: "Critical" },
          { id: "stockout_risk", label: "Stockout risk" },
          { id: "healthy", label: "Healthy" },
        ].map((o) => (
          <button
            key={o.id}
            onClick={() => setStatus(o.id)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              status === o.id
                ? "border-navy bg-navy text-navy-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <Panel
        title="Inventory position and replenishment plan"
        hint="Days of supply is based on the 12-week forecast, not trailing demand. Order quantities are rounded up to pack size and floored at MOQ."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="label-caps border-b border-border text-left">
                <th className="px-5 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">DC</th>
                <th className="px-3 py-2 text-right font-semibold">On hand</th>
                <th className="px-3 py-2 text-right font-semibold">On order</th>
                <th className="px-3 py-2 text-right font-semibold">Fcst / wk</th>
                <th className="px-3 py-2 text-right font-semibold">Safety stock</th>
                <th className="px-3 py-2 text-right font-semibold">Reorder point</th>
                <th className="px-3 py-2 text-right font-semibold">DoS</th>
                <th className="px-3 py-2 font-semibold">Flag</th>
                <th className="px-3 py-2 text-right font-semibold">Recommend</th>
                <th className="px-5 py-2 font-semibold">Timing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: PlanRow) => {
                const m = statusMeta[r.status];
                return (
                  <tr
                    key={r.sku + r.warehouse}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/50"
                  >
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="tabular text-[11px] text-muted-foreground">
                        {r.sku} · {r.abc} · {r.supplier}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{r.warehouse_name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.region}</div>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">{num(r.on_hand)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                      {num(r.on_order)}
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">{r.fcst_weekly}</td>
                    <td className="tabular px-3 py-2.5 text-right">{num(r.safety_stock)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{num(r.rop)}</td>
                    <td
                      className={`tabular px-3 py-2.5 text-right font-semibold ${
                        r.dos < 14 ? "text-risk" : r.dos < 21 ? "text-warn" : ""
                      }`}
                    >
                      {r.dos}d
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill className={m.cls}>
                        <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                        {m.label}
                      </Pill>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">
                      {r.order_qty > 0 ? (
                        <>
                          <div className="font-semibold">{num(r.order_qty)} u</div>
                          <div className="text-[11px] text-muted-foreground">
                            MOQ {r.moq} · pack {r.pack}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-xs">
                      <div className={r.timing.startsWith("Order now") ? "font-medium text-risk" : ""}>
                        {r.timing}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        arrives ~{Math.round(r.lead_time)}d
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title="Assumptions">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Cycle service level 95% (z = 1.645) for A and B items; C items reviewed at the same level for comparability.</li>
            <li>Lead time and σ taken from actual PO order-to-receipt history per supplier.</li>
            <li>Weekly review cycle; order-up-to level = reorder point + 4 weeks of forecast demand.</li>
            <li>Demand allocated to DCs using each DC's share of the last 52 weeks of adjusted demand.</li>
          </ul>
        </Panel>
        <Panel title="What the grid is saying" className="lg:col-span-2">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">The network is structurally under-covered.</span>{" "}
              Across the five reviewed SKUs, cover runs 4-26 days against replenishment lead times
              of 17-33 days. {data.totals.critical} of 20 positions cannot survive a single lead
              time even with on-order stock counted, so the exposure is not a forecasting artefact —
              it is a policy gap.
            </p>
            <p>
              <span className="font-medium text-foreground">Undercarriage is the largest single commitment.</span>{" "}
              Track Shoe alone accounts for the biggest recommended buy, because Trackline's 33-day
              lead time and 10-day variability inflate both the lead-time demand term and the safety
              stock term of the reorder point.
            </p>
            <p>
              <span className="font-medium text-foreground">No position is genuinely overstocked.</span>{" "}
              Where the dataset looks "heavy" — Chennai on Seal Kit and Track Shoe — the cover is
              still only 3-4 weeks. Excess-inventory write-down is not the issue this cycle;
              expediting capacity and cash for the catch-up buy is.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
