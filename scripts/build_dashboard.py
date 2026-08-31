"""Build src/data/dashboard.json from the client-supplied analysis outputs.

Sources (authoritative, produced by supply_chain_analysis.py):
  forecast_results.csv, holdout_accuracy.csv, safety_stock_reorder.csv,
  replenishment_plan.csv, supplier_risk.csv, undercarriage_correction.csv
plus Supply_Chain_Assessment_Dataset.xlsx for masters and 104-week history.
"""

import json
import numpy as np
import pandas as pd

U = "/mnt/user-uploads"
xl = pd.ExcelFile(f"{U}/Supply_Chain_Assessment_Dataset.xlsx")
product = xl.parse("Product_Master")
warehouse = xl.parse("Warehouse_Master")
demand = xl.parse("Demand_History", parse_dates=["Week_Start_Date"])

fc = pd.read_csv(f"{U}/forecast_results.csv", parse_dates=["Forecast_Week_Start"])
acc = pd.read_csv(f"{U}/holdout_accuracy.csv")
ss = pd.read_csv(f"{U}/safety_stock_reorder.csv")
rep = pd.read_csv(f"{U}/replenishment_plan.csv")
sup = pd.read_csv(f"{U}/supplier_risk.csv")
cens = pd.read_csv(f"{U}/undercarriage_correction.csv")

SERIES_SKUS = ["SKU-005", "SKU-009", "SKU-018", "SKU-011", "SKU-001"]
HOLDOUT = 8

demand = demand.sort_values(["SKU_ID", "Warehouse_ID", "Week_Start_Date"]).reset_index(drop=True)
demand["week_num"] = demand.groupby(["SKU_ID", "Warehouse_ID"]).cumcount() + 1
corr = cens.set_index(["SKU_ID", "Warehouse_ID", "week_num"])["Units_Sold_Corrected"]
key = list(zip(demand.SKU_ID, demand.Warehouse_ID, demand.week_num))
demand["adjusted"] = [corr.get(k, np.nan) for k in key]
demand["censored"] = demand["adjusted"].notna() & (
    demand["adjusted"].round(2) > demand["Units_Sold"].round(2)
)
demand["adjusted"] = demand["adjusted"].fillna(demand["Units_Sold"].astype(float))

promo_col = "Promotion_Flag" if "Promotion_Flag" in demand.columns else demand.columns[-1]


def design(weeks, promo):
    t = np.asarray(weeks, dtype=float)
    cols = [np.ones_like(t), t / 52.0]
    for h in (1, 2, 3):
        cols += [np.sin(2 * np.pi * h * t / 52.0), np.cos(2 * np.pi * h * t / 52.0)]
    cols.append(np.asarray(promo, dtype=float))
    return np.column_stack(cols)


series, accuracy = [], []
for sku in SERIES_SKUS:
    meta = product[product.SKU_ID == sku].iloc[0]
    d = demand[demand.SKU_ID == sku]
    g = d.groupby("week_num").agg(
        date=("Week_Start_Date", "first"),
        actual=("Units_Sold", "sum"),
        adjusted=("adjusted", "sum"),
        promo=(promo_col, "max"),
        censored=("censored", "max"),
    ).reset_index()

    X = design(g.week_num, g.promo)
    beta, *_ = np.linalg.lstsq(X, g.adjusted.values, rcond=None)
    fit = X @ beta

    f = fc[fc.SKU_ID == sku].groupby("Week_Ahead").agg(
        units=("Forecast_Units", "sum"), date=("Forecast_Week_Start", "first")
    ).reset_index()

    base = g.adjusted.mean()
    points = []
    for i, r in g.iterrows():
        points.append(
            {
                "week": int(r.week_num),
                "date": r.date.strftime("%Y-%m-%d"),
                "actual": round(float(r.actual), 1),
                "adjusted": round(float(r.adjusted), 1),
                "fit": round(float(fit[i]), 1),
                "forecast": None,
                "promo": int(r.promo),
                "censored": bool(r.censored),
            }
        )
    points[-1]["forecast"] = points[-1]["adjusted"]
    for _, r in f.iterrows():
        points.append(
            {
                "week": 104 + int(r.Week_Ahead),
                "date": r.date.strftime("%Y-%m-%d"),
                "actual": None,
                "adjusted": None,
                "fit": None,
                "forecast": round(float(r.units), 1),
                "promo": 0,
                "censored": False,
            }
        )

    trend = beta[1] / base * 100
    seas_curve = np.column_stack([X[:, 2 + k] for k in range(6)]) @ beta[2:8]
    seas = (seas_curve.max() - seas_curve.min()) / 2 / base * 100
    promo_lift = beta[8] / base * 100

    series.append(
        {
            "sku": sku,
            "name": meta.Product_Name,
            "category": meta.Category,
            "abc": meta.ABC_Class,
            "supplier": meta.Primary_Supplier_ID,
            "points": points,
            "trend_pct_yr": round(float(trend), 1),
            "seasonal_amp_pct": round(float(seas), 1),
            "promo_lift_pct": round(float(promo_lift), 1),
            "avg_weekly": round(float(base), 1),
            "forecast_avg": round(float(f.units.mean()), 1),
        }
    )

    # SKU-level accuracy: demand-weighted roll-up of the per-DC holdout metrics
    a = acc[acc.SKU_ID == sku].merge(
        ss[["SKU_ID", "Warehouse_ID", "Avg_Weekly_Demand"]], on=["SKU_ID", "Warehouse_ID"]
    )
    w = a.Avg_Weekly_Demand
    wmape = float((a.WMAPE_pct * w).sum() / w.sum())
    bias = float((a.Bias_pct * w).sum() / w.sum())

    # naive 52-week moving-average baseline, measured per DC on the same
    # 8-week holdout and rolled up with the same demand weights
    nv, nw = [], []
    for whid, dw in d.groupby("Warehouse_ID"):
        dw = dw.sort_values("week_num")
        pred = dw.adjusted.rolling(52).mean().shift(1).tail(HOLDOUT)
        act = dw.adjusted.tail(HOLDOUT)
        nv.append(float((pred.values - act.values).__abs__().sum() / act.sum() * 100))
        nw.append(float(ss.loc[(ss.SKU_ID == sku) & (ss.Warehouse_ID == whid), "Avg_Weekly_Demand"].iloc[0]))
    naive = float(np.average(nv, weights=nw))
    hold = g.tail(HOLDOUT)
    ha = float(hold.adjusted.sum())
    accuracy.append(
        {
            "sku": sku,
            "name": meta.Product_Name,
            "abc": meta.ABC_Class,
            "wmape": round(wmape, 1),
            "bias": round(bias, 1),
            "naive_wmape": round(naive, 1),
            "holdout_actual": round(ha),
            "holdout_forecast": round(ha * (1 + bias / 100)),
        }
    )

# censored-demand restoration summary
censoring = []
for (sku, wh), grp in cens.groupby(["SKU_ID", "Warehouse_ID"]):
    grp = grp[grp.Stockout_Flag == 1]
    censoring.append(
        {
            "sku": sku,
            "warehouse": wh,
            "observed": int(grp.Units_Sold.sum()),
            "restored": int(round(grp.Units_Sold_Corrected.sum())),
            "weeks": int(len(grp)),
        }
    )
censoring.sort(key=lambda r: -(r["restored"] - r["observed"]))

STATUS = {
    "STOCKOUT RISK (URGENT)": "critical",
    "REORDER DUE": "stockout_risk",
    "OK": "healthy",
    "OVERSTOCKED": "overstock",
}
TIMING = {
    "critical": "Order now",
    "stockout_risk": "Order this cycle",
    "healthy": "No action",
    "overstock": "Hold / no buy",
}

wh_meta = warehouse.set_index("Warehouse_ID")
prod_meta = product.set_index("SKU_ID")
sup_meta = sup.set_index("Supplier_ID")
fc_wk = fc.groupby(["SKU_ID", "Warehouse_ID"]).Forecast_Units.mean()
rep_idx = rep.set_index(["SKU_ID", "Warehouse_ID"])
cost_col = next(c for c in product.columns if "Cost" in c or "Price" in c)

plan = []
for _, r in ss.iterrows():
    p = prod_meta.loc[r.SKU_ID]
    w = wh_meta.loc[r.Warehouse_ID]
    status = STATUS[r.Risk_Flag]
    fw = float(fc_wk.loc[(r.SKU_ID, r.Warehouse_ID)])
    qty = int(rep_idx.Recommended_Order_Qty.get((r.SKU_ID, r.Warehouse_ID), 0))
    plan.append(
        {
            "sku": r.SKU_ID,
            "name": p.Product_Name,
            "abc": p.ABC_Class,
            "warehouse": r.Warehouse_ID,
            "warehouse_name": w.Warehouse_Name,
            "region": w.Region,
            "on_hand": int(r.On_Hand_Qty),
            "on_order": int(r.On_Order_Qty),
            "fcst_weekly": round(fw, 1),
            "safety_stock": int(r.Safety_Stock),
            "rop": int(r.Reorder_Point),
            "dos": round((r.On_Hand_Qty + r.On_Order_Qty) / fw * 7, 0),
            "status": status,
            "order_qty": qty,
            "timing": TIMING[status],
            "moq": int(r.MOQ),
            "pack": int(r.Pack_Size),
            "supplier": sup_meta.loc[r.Primary_Supplier_ID, "Supplier_Name"],
            "lead_time": round(float(sup_meta.loc[r.Primary_Supplier_ID, "Actual_Avg_LT_Days"]), 1),
            "value": round(qty * float(p[cost_col])),
            "excess_value": round(
                max(0.0, (r.On_Hand_Qty + r.On_Order_Qty) - r.Reorder_Point - 4 * fw)
                * float(p[cost_col])
            )
            if status == "overstock"
            else 0,
        }
    )
plan.sort(key=lambda r: (["critical", "stockout_risk", "healthy", "overstock"].index(r["status"]), -r["value"]))

suppliers = []
for _, r in sup.iterrows():
    suppliers.append(
        {
            "id": r.Supplier_ID,
            "name": r.Supplier_Name,
            "region": r.Region,
            "category": r.Categories_Supplied,
            "master_lt": int(r.Avg_Lead_Time_Days),
            "master_sd": int(r.Lead_Time_StdDev_Days),
            "otif_master": int(r.OTIF_Reliability_Pct),
            "actual_lt": round(float(r.Actual_Avg_LT_Days), 1),
            "actual_lt_sd": round(float(r.Actual_LT_StdDev_Days), 1),
            "p95_lt": round(float(r.Actual_Avg_LT_Days) + 1.645 * float(r.Actual_LT_StdDev_Days)),
            "pos": int(r.POs),
            "otif_actual": round(float(r.OnTime_Pct_Actual), 1),
            "avg_delay": round(float(r.Avg_Delay_Days), 1),
            "max_delay": int(r.Max_Delay_Days),
            "risk_score": round(float(r.Risk_Score), 1),
        }
    )
suppliers.sort(key=lambda s: -s["risk_score"])

counts = {k: sum(1 for r in plan if r["status"] == k) for k in STATUS.values()}
out = {
    "generated": pd.Timestamp.now('UTC').strftime("%Y-%m-%d"),
    "skus": SERIES_SKUS,
    "warehouses": warehouse.to_dict("records"),
    "suppliers": suppliers,
    "series": series,
    "accuracy": accuracy,
    "censoring": censoring,
    "plan": plan,
    "totals": {
        "skus_total": int(product.SKU_ID.nunique()),
        "rows": int(len(demand)),
        "weeks": 104,
        "pos": int(sup.POs.sum()),
        "planned_skus": int(ss.SKU_ID.nunique()),
        "plan_rows": len(plan),
        "critical": counts["critical"],
        "at_risk": counts["stockout_risk"],
        "overstock": counts["overstock"],
        "healthy": counts["healthy"],
        "buy_value": sum(r["value"] for r in plan),
        "excess_value": sum(r["excess_value"] for r in plan),
        "wmape_avg": round(float(np.mean([a["wmape"] for a in accuracy])), 1),
        "naive_avg": round(float(np.mean([a["naive_wmape"] for a in accuracy])), 1),
        "holdout_weeks": HOLDOUT,
        "censored_uplift_pct": round(
            (sum(c["restored"] for c in censoring) / sum(c["observed"] for c in censoring) - 1) * 100
        ),
    },
}
json.dump(out, open("src/data/dashboard.json", "w"), indent=0)
print(json.dumps(out["totals"], indent=2))
print([{k: a[k] for k in ("sku", "wmape", "bias", "naive_wmape")} for a in accuracy])
print([(s["sku"], s["trend_pct_yr"], s["seasonal_amp_pct"], s["promo_lift_pct"]) for s in series])
print(censoring[:3])
