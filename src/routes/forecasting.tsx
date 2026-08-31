import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { data, num } from "@/lib/dash";
import { PageHeader, Panel, Pill } from "@/components/dash";

export const Route = createFileRoute("/forecasting")({
  head: () => ({
    meta: [
      { title: "Demand Forecasting | TerraTrac Supply Chain Planning" },
      {
        name: "description",
        content:
          "104 weeks of history versus a 12-week forecast for five SKUs, with trend, seasonality, promotion effects, censored-demand handling and WMAPE accuracy.",
      },
      { property: "og:title", content: "Demand Forecasting | TerraTrac" },
      {
        property: "og:description",
        content:
          "Weekly demand history vs 12-week forecast, holdout validation and WMAPE accuracy by SKU.",
      },
    ],
  }),
  component: Forecasting,
});

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="panel px-3 py-2 text-xs shadow-md">
      <div className="font-semibold">
        Week {label} · {p.date}
      </div>
      {p.actual != null && (
        <div className="tabular mt-1">Actual: {num(p.actual)}</div>
      )}
      {p.adjusted != null && p.adjusted !== p.actual && (
        <div className="tabular text-warn">Censoring-adjusted: {num(p.adjusted)}</div>
      )}
      {p.forecast != null && <div className="tabular text-teal">Forecast: {num(p.forecast)}</div>}
      {p.promo === 1 && <div className="mt-1 text-muted-foreground">Promotion week</div>}
    </div>
  );
}

function Forecasting() {
  const [sel, setSel] = useState(data.series[0]!.sku);
  const s = data.series.find((x) => x.sku === sel)!;
  const chart = s.points.map((p) => ({
    ...p,
    band: p.lo != null && p.hi != null ? [p.lo, p.hi] : null,
  }));
  const censored = data.censoring.filter((c) => c.sku === s.sku);

  return (
    <>
      <PageHeader
        eyebrow="Part 1"
        title="Demand Forecasting"
        subtitle="Method: weekly demand modelled as linear trend + 3-harmonic Fourier annual seasonality + promotion dummy, fitted by least squares per SKU across all four DCs. Chosen over a plain moving average because every SKU shows both a persistent trend and a stable 52-week cycle, and over ARIMA because the seasonal signal is deterministic and the promotion effect needs an explicit regressor. Holdout: last 8 weeks of history (weeks 97-104), scored per SKU x DC and rolled up on demand weights."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {data.series.map((x) => (
          <button
            key={x.sku}
            onClick={() => setSel(x.sku)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              x.sku === sel
                ? "border-navy bg-navy text-navy-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {x.sku} · {x.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={`${s.name} (${s.sku}) — weekly demand, all DCs`}
          hint="104 weeks of history vs 12-week forecast · shaded band = holdout test period and forecast interval"
          bodyClassName="p-4"
        >
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={chart} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid stroke="var(--color-grid)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-grid)" }}
                interval={7}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceArea
                x1={97}
                x2={104}
                fill="var(--color-warn)"
                fillOpacity={0.08}
                label={{ value: "Holdout", fontSize: 10, fill: "var(--color-muted-foreground)" }}
              />
              <ReferenceArea
                x1={105}
                x2={116}
                fill="var(--color-teal)"
                fillOpacity={0.07}
                label={{ value: "Forecast", fontSize: 10, fill: "var(--color-muted-foreground)" }}
              />
              {s.category === "Undercarriage" ? (
                <ReferenceArea x1={40} x2={45} fill="var(--color-risk)" fillOpacity={0.09} />
              ) : null}
              <Area
                dataKey="band"
                stroke="none"
                fill="var(--color-teal)"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="adjusted"
                stroke="var(--color-chart-1)"
                strokeWidth={1.6}
                dot={false}
                name="Actual"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-teal)"
                strokeWidth={2.2}
                dot={false}
                name="Forecast"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-4 px-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-chart-1" /> Actual (censoring-adjusted)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-teal" /> Forecast / holdout fit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 bg-warn/20" /> Holdout window
            </span>
            {s.category === "Undercarriage" && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-4 bg-risk/20" /> Stockout-censored weeks 40-45
              </span>
            )}
          </div>
        </Panel>

        <Panel title="Pattern detected" hint={`${s.category} · ABC class ${s.abc}`}>
          <dl className="space-y-4">
            <div>
              <dt className="label-caps">Trend</dt>
              <dd className="mt-1 text-sm">
                <span className="tabular font-semibold">
                  {s.trend_pct_yr > 0 ? "+" : ""}
                  {s.trend_pct_yr}% / yr
                </span>
                <p className="mt-1 text-muted-foreground">
                  {Math.abs(s.trend_pct_yr) < 3
                    ? "Essentially flat — level dominated, so trend contributes little to the 12-week horizon."
                    : s.trend_pct_yr > 0
                      ? "Growing base demand; a moving average would systematically under-forecast this SKU."
                      : "Declining base demand; carrying last year's average forward would over-buy."}
                </p>
              </dd>
            </div>
            <div>
              <dt className="label-caps">Seasonality</dt>
              <dd className="mt-1 text-sm">
                <span className="tabular font-semibold">±{s.seasonal_amp_pct}% amplitude</span>
                <p className="mt-1 text-muted-foreground">
                  Stable 52-week cycle captured with three Fourier harmonics; peaks repeat in both
                  history years, so it is seasonality rather than noise.
                </p>
              </dd>
            </div>
            <div>
              <dt className="label-caps">Promotion effect</dt>
              <dd className="mt-1 text-sm">
                <span className="tabular font-semibold">
                  {s.promo_lift_pct > 0 ? "+" : ""}
                  {s.promo_lift_pct}% lift
                </span>
                <p className="mt-1 text-muted-foreground">
                  Estimated from 10 flagged promotion weeks and held out of the baseline. The
                  forward forecast assumes no promotions; add the lift for any planned event.
                </p>
              </dd>
            </div>
            <div>
              <dt className="label-caps">Forecast level</dt>
              <dd className="tabular mt-1 text-sm font-semibold">
                {s.forecast_avg} units / week
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  vs {s.avg_weekly} historical avg
                </span>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel
        className="mt-5"
        title="Handling the stockout-censored weeks (weeks 40-45, Asia Pacific DCs)"
        hint="Trackline Manufacturing supply disruption affecting all five Undercarriage SKUs at Chennai and Jakarta"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              During weeks 40-45 the two Asia Pacific DCs were out of stock on Undercarriage parts.
              The recorded <span className="font-medium text-foreground">Units_Sold</span> for those
              weeks is therefore not demand — it is the truncated quantity that happened to be on
              the shelf. Feeding it to a forecast model teaches the model a demand dip that never
              happened, and that dip flows straight into a lower safety stock for the least reliable
              supplier in the network — precisely the wrong direction.
            </p>
            <p>
              <span className="font-medium text-foreground">Decision: correct the history rather
              than drop it.</span> Dropping six consecutive weeks would punch a hole in the seasonal
              signal at the same point in the annual cycle. Instead each censored SKU x DC week is
              rebuilt from the same SKU's demand at the two unaffected DCs over the same weeks,
              normalised to each DC's own pre-disruption baseline (weeks 34-39) and re-scaled to the
              censored DC's baseline. Promotions and seasonality are shared across DCs while the
              outage is warehouse-specific, so the unaffected DCs carry the signal for what demand
              would have been. The regression is then fitted on the restored series.
            </p>
            <p>
              A stricter alternative is a censored (Tobit-style) likelihood that models the
              stockout flag explicitly. At six weeks out of 104 the cross-DC index gives
              near-identical fitted parameters at a fraction of the complexity, so it was preferred;
              the original Units_Sold and the stockout flag are both retained so the choice can be
              revisited.
            </p>
          </div>
          <div>
            <div className="label-caps mb-2">Demand restored by SKU x DC</div>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">

              <thead>
                <tr className="label-caps border-b border-border text-left">
                  <th className="py-1.5 font-semibold">SKU</th>
                  <th className="py-1.5 font-semibold">DC</th>
                  <th className="py-1.5 text-right font-semibold">Observed</th>
                  <th className="py-1.5 text-right font-semibold">Restored</th>
                  <th className="py-1.5 text-right font-semibold">Uplift</th>
                </tr>
              </thead>
              <tbody>
                {data.censoring.map((c) => (
                  <tr
                    key={c.sku + c.warehouse}
                    className={`border-b border-border/60 last:border-0 ${
                      c.sku === s.sku ? "bg-accent/50" : ""
                    }`}
                  >
                    <td className="tabular py-1.5">{c.sku}</td>
                    <td className="tabular py-1.5 text-muted-foreground">{c.warehouse}</td>
                    <td className="tabular py-1.5 text-right">{c.observed}</td>
                    <td className="tabular py-1.5 text-right">{c.restored}</td>
                    <td className="tabular py-1.5 text-right text-warn">
                      +{Math.round(((c.restored - c.observed) / c.observed) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

          </div>
        </div>
      </Panel>

      <Panel
        className="mt-5"
        title="Forecast accuracy — 8-week holdout (weeks 97-104)"
        hint="WMAPE weights errors by volume, so it is not distorted by low-volume weeks the way MAPE is."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">

          <thead>
            <tr className="label-caps border-b border-border text-left">
              <th className="px-5 py-2 font-semibold">SKU</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">ABC</th>
              <th className="px-3 py-2 text-right font-semibold">Actual (units)</th>
              <th className="px-3 py-2 text-right font-semibold">Forecast (units)</th>
              <th className="px-3 py-2 text-right font-semibold">WMAPE</th>
              <th className="px-3 py-2 text-right font-semibold">Bias</th>
              <th className="px-5 py-2 text-right font-semibold">Naive WMAPE</th>
            </tr>
          </thead>
          <tbody>
            {data.accuracy.map((a) => (
              <tr key={a.sku} className="border-b border-border/60">
                <td className="tabular px-5 py-2.5">{a.sku}</td>
                <td className="px-3 py-2.5 font-medium">{a.name}</td>
                <td className="px-3 py-2.5">
                  <Pill className="border-border bg-secondary text-secondary-foreground">
                    {a.abc}
                  </Pill>
                </td>
                <td className="tabular px-3 py-2.5 text-right">{num(a.holdout_actual)}</td>
                <td className="tabular px-3 py-2.5 text-right">{num(a.holdout_forecast)}</td>
                <td className="tabular px-3 py-2.5 text-right font-semibold">{a.wmape}%</td>
                <td
                  className={`tabular px-3 py-2.5 text-right ${
                    Math.abs(a.bias) > 5 ? "text-warn" : "text-muted-foreground"
                  }`}
                >
                  {a.bias > 0 ? "+" : ""}
                  {a.bias}%
                </td>
                <td className="tabular px-5 py-2.5 text-right text-muted-foreground">
                  {a.naive_wmape}%
                </td>
              </tr>
            ))}
            <tr className="bg-secondary/60">
              <td className="px-5 py-2.5 font-semibold" colSpan={5}>
                Portfolio average
              </td>
              <td className="tabular px-3 py-2.5 text-right font-semibold">
                {data.totals.wmape_avg}%
              </td>
              <td className="px-3 py-2.5" />
              <td className="tabular px-5 py-2.5 text-right font-semibold text-muted-foreground">
                {data.totals.naive_avg}%
              </td>
            </tr>
          </tbody>
        </table>
        </div>

      </Panel>
    </>
  );
}
