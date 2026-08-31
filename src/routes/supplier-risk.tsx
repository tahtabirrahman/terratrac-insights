import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { data } from "@/lib/dash";
import { PageHeader, Panel, Pill, TableWrap } from "@/components/dash";

export const Route = createFileRoute("/supplier-risk")({
  head: () => ({
    meta: [
      { title: "Supplier Risk | TerraTrac Supply Chain Planning" },
      {
        name: "description",
        content:
          "Lead time versus OTIF reliability across five category suppliers, with Trackline Manufacturing flagged as the highest-risk source and buffering recommendations.",
      },
      { property: "og:title", content: "Supplier Risk | TerraTrac" },
      {
        property: "og:description",
        content:
          "Supplier lead-time and OTIF analysis from 220 purchase orders, with safety-stock and dual-sourcing recommendations.",
      },
    ],
  }),
  component: SupplierRisk,
});

const color = (id: string) => (id === "SUP-03" ? "var(--color-risk)" : "var(--color-chart-2)");

function SupplierRisk() {
  const s = data.suppliers;
  const worst = s.find((x) => x.id === "SUP-03")!;
  const scatter = s.map((x) => ({ ...x, x: x.actual_lt, y: x.otif_actual, z: x.actual_lt_sd }));

  return (
    <>
      <PageHeader
        eyebrow="Part 2 · supplier analysis"
        title="Supplier Risk"
        subtitle="Lead time and reliability recomputed from 220 historical purchase orders (order date to actual receipt), compared against the promised delivery date. Master-data lead times were broadly accurate; on-time performance was materially worse than the supplier master claims for every supplier."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Average lead time by supplier"
          hint="Bars show actual mean order-to-receipt days; label shows lead-time standard deviation."
          bodyClassName="p-4"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={s}
              layout="vertical"
              margin={{ top: 8, right: 44, bottom: 4, left: 8 }}
            >
              <CartesianGrid stroke="var(--color-grid)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                unit="d"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 11, fill: "var(--color-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--color-secondary)" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                }}
                formatter={(v: number) => [`${v} days`, "Avg lead time"]}
              />
              <Bar dataKey="actual_lt" radius={[0, 3, 3, 0]} barSize={20}>
                {s.map((x) => (
                  <Cell key={x.id} fill={color(x.id)} />
                ))}
                <LabelList
                  dataKey="actual_lt_sd"
                  position="right"
                  formatter={(v: number) => `σ ${v}d`}
                  style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Lead time vs OTIF reliability"
          hint="Bottom-right quadrant is the danger zone: slow and unreliable. Bubble size = lead-time variability."
          bodyClassName="p-4"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: -6 }}>
              <CartesianGrid stroke="var(--color-grid)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Lead time"
                unit="d"
                domain={[10, 40]}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Average lead time (days)",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 11,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="OTIF"
                unit="%"
                domain={[50, 100]}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <ZAxis type="number" dataKey="z" range={[80, 420]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="panel px-3 py-2 text-xs shadow-md">
                      <div className="font-semibold">{p.name}</div>
                      <div className="tabular mt-1">Lead time {p.actual_lt}d (σ {p.actual_lt_sd}d)</div>
                      <div className="tabular">OTIF {p.otif_actual}%</div>
                      <div className="tabular">P95 lead time {p.p95_lt}d · {p.pos} POs</div>
                    </div>
                  );
                }}
              />
              <Scatter data={scatter}>
                {scatter.map((x) => (
                  <Cell key={x.id} fill={color(x.id)} fillOpacity={0.75} />
                ))}
                <LabelList
                  dataKey="category"
                  position="top"
                  style={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel
        className="mt-5"
        title="Supplier scorecard"
        hint="Master data vs measured performance"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="label-caps border-b border-border text-left">
                <th className="px-5 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 text-right font-semibold">POs</th>
                <th className="px-3 py-2 text-right font-semibold">Stated LT</th>
                <th className="px-3 py-2 text-right font-semibold">Actual LT</th>
                <th className="px-3 py-2 text-right font-semibold">σ LT</th>
                <th className="px-3 py-2 text-right font-semibold">P95 LT</th>
                <th className="px-3 py-2 text-right font-semibold">Stated OTIF</th>
                <th className="px-5 py-2 text-right font-semibold">Actual OTIF</th>
              </tr>
            </thead>
            <tbody>
              {s.map((x) => (
                <tr
                  key={x.id}
                  className={`border-b border-border/60 last:border-0 ${
                    x.id === "SUP-03" ? "bg-risk-soft/60" : ""
                  }`}
                >
                  <td className="px-5 py-2.5 font-medium">
                    {x.name}
                    {x.id === "SUP-03" ? (
                      <Pill className="ml-2 border-risk/25 bg-risk-soft text-risk">
                        Highest risk
                      </Pill>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{x.category}</td>
                  <td className="tabular px-3 py-2.5 text-right">{x.pos}</td>
                  <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                    {x.master_lt}d
                  </td>
                  <td className="tabular px-3 py-2.5 text-right font-semibold">{x.actual_lt}d</td>
                  <td className="tabular px-3 py-2.5 text-right">{x.actual_lt_sd}d</td>
                  <td className="tabular px-3 py-2.5 text-right">{x.p95_lt}d</td>
                  <td className="tabular px-3 py-2.5 text-right text-muted-foreground">
                    {x.otif_master}%
                  </td>
                  <td
                    className={`tabular px-5 py-2.5 text-right font-semibold ${
                      x.otif_actual < 70 ? "text-risk" : x.otif_actual < 85 ? "text-warn" : "text-good"
                    }`}
                  >
                    {x.otif_actual}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Why Trackline Manufacturing is the priority">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Trackline delivers Undercarriage in{" "}
              <span className="font-medium text-foreground">{worst.actual_lt} days on average</span>{" "}
              with a {worst.actual_lt_sd}-day standard deviation and a P95 of {worst.p95_lt} days —
              roughly twice the network mean and more than triple the variability of Ironclad GET
              Works. Because safety stock scales with lead-time variability multiplied by mean
              demand, that single supplier drives the largest buffer requirement in the portfolio.
            </p>
            <p>
              Trackline is also the only supplier whose unreliability has already cost sales: the
              weeks 40-45 disruption emptied both Asia Pacific DCs and censored six weeks of demand
              history. Single-sourcing an entire category from the slowest and least reliable vendor
              in Asia Pacific — where two of four DCs sit — concentrates the risk exactly where the
              volume is.
            </p>
            <p>
              Circuit &amp; Cab Electronics ({s.find((x) => x.id === "SUP-04")!.actual_lt}d, σ{" "}
              {s.find((x) => x.id === "SUP-04")!.actual_lt_sd}d) is a secondary watch item; Ironclad
              GET Works and Vantage Engine Systems are performing to expectation.
            </p>
          </div>
        </Panel>
        <Panel title="Recommended actions">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-navy text-[11px] font-semibold text-navy-foreground">
                1
              </span>
              <div>
                <div className="font-medium">Buffer Undercarriage to the P95 lead time</div>
                <p className="text-muted-foreground">
                  Plan Trackline items against {worst.p95_lt} days rather than the {worst.master_lt}
                  -day master value, and raise the Undercarriage service level to 97.5% at the Asia
                  Pacific DCs. Roughly a 40% increase in Undercarriage safety stock.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-navy text-[11px] font-semibold text-navy-foreground">
                2
              </span>
              <div>
                <div className="font-medium">Open a secondary source for Track Shoe and Track Chain</div>
                <p className="text-muted-foreground">
                  Qualify a second Undercarriage vendor for the two highest-volume SKUs and target a
                  70/30 split. Dual sourcing beats buffering here: the buffer cost of a 33-day, σ
                  10-day lead time exceeds any realistic unit-price premium.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-navy text-[11px] font-semibold text-navy-foreground">
                3
              </span>
              <div>
                <div className="font-medium">Correct the supplier master and put OTIF on the QBR</div>
                <p className="text-muted-foreground">
                  Measured on-time-in-full is 12-31 points below the stated figures for every supplier, so
                  planning parameters derived from the master are optimistic. Replace them with
                  rolling 12-month actuals and review monthly.
                </p>
              </div>
            </li>
          </ol>
        </Panel>
      </div>
    </>
  );
}
