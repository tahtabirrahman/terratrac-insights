"""
TerraTrac Equipment Parts -- Supply Chain Planning Assessment
================================================================
End-to-end analysis covering:
  Part 1: Demand forecasting (trend/seasonality/promo, stockout-censoring correction, accuracy)
  Part 2: Supply planning (safety stock, reorder point, stockout/overstock flags, replenishment, supplier risk)
  Part 3: Outputs feeding the executive summary

Run:  python3 supply_chain_analysis.py
Outputs written to ./output/ :
  - forecast_results.csv          12-week forecast per selected SKU x warehouse
  - holdout_accuracy.csv          WMAPE / bias per SKU on the holdout window
  - safety_stock_reorder.csv      Safety stock, ROP, on-hand/on-order, risk flag per SKU x warehouse
  - replenishment_plan.csv        Recommended order qty/timing, MOQ & pack-size rounded
  - supplier_risk.csv             Actual lead-time stats & OTIF vs. stated, from PO history
  - undercarriage_correction.csv  Before/after view of the censored-week correction
"""

import os
import numpy as np
import pandas as pd
from scipy.stats import norm

pd.set_option("display.width", 140)
pd.set_option("display.max_columns", 20)

SRC = "Supply_Chain_Assessment_Dataset.xlsx"
OUT_DIR = "output"
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 0. LOAD
# ---------------------------------------------------------------------------

def load_data(path=SRC):
    xl = pd.ExcelFile(path)
    product = xl.parse("Product_Master")
    warehouse = xl.parse("Warehouse_Master")
    supplier = xl.parse("Supplier_Master")
    demand = xl.parse("Demand_History", parse_dates=["Week_Start_Date"])
    inventory = xl.parse("Inventory_Snapshot", parse_dates=["Snapshot_Date"])
    po = xl.parse("Purchase_Order_History", parse_dates=["Order_Date", "Promised_Delivery_Date", "Actual_Delivery_Date"])
    return product, warehouse, supplier, demand, inventory, po


product, warehouse, supplier, demand, inventory, po = load_data()

print(f"Loaded: {len(product)} SKUs, {len(warehouse)} warehouses, {len(supplier)} suppliers, "
      f"{len(demand)} demand rows, {len(inventory)} inventory rows, {len(po)} POs")

# ---------------------------------------------------------------------------
# SKU SELECTION
# Spans 3 ABC classes (A/B/C) and includes an Undercarriage SKU so the
# stockout-censoring correction (weeks 40-45, AP1 & AP2) is demonstrated.
# ---------------------------------------------------------------------------

SELECTED_SKUS = [
    "SKU-005",  # Hydraulic Components, A
    "SKU-009",  # Engine & Powertrain, A
    "SKU-018",  # Electrical & Cabin, A
    "SKU-002",  # Hydraulic Components, B
    "SKU-011",  # Undercarriage, B  <- censored-demand SKU
    "SKU-022",  # Ground Engaging Tools, B  <- short/reliable lead time, best-covered SKU (overstock-relative example)
    "SKU-001",  # Hydraulic Components, C
]

WAREHOUSES = warehouse["Warehouse_ID"].tolist()
HOLDOUT_WEEKS = 8      # weeks held out at the end of history to measure accuracy
FORECAST_HORIZON = 12  # weeks to forecast forward
SERVICE_LEVEL = 0.95   # stated service-level assumption for safety stock
Z = norm.ppf(SERVICE_LEVEL)

sel_meta = product[product["SKU_ID"].isin(SELECTED_SKUS)][
    ["SKU_ID", "Product_Name", "Category", "ABC_Class", "Min_Order_Qty", "Pack_Size", "Primary_Supplier_ID"]
]
print("\nSelected SKUs:\n", sel_meta.to_string(index=False))

# ---------------------------------------------------------------------------
# 1. STOCKOUT-CENSORING CORRECTION
# README: weeks 40-45 (1-indexed within the 104-week history) suppress
# observed Undercarriage demand at the two Asia Pacific DCs (WH-AP1, WH-AP2)
# because the shelf was empty -- Units_Sold in that window understates true
# demand. We correct it explicitly rather than deleting the rows or ignoring
# the issue, so the forecast is trained on demand, not on a stockout artifact.
#
# Method: for each affected SKU x warehouse, replace Units_Sold in the
# disrupted window with an estimate built from the SAME SKU's demand at
# unaffected warehouses during that window, scaled by the SKU/warehouse's
# own pre-disruption demand ratio. This uses the fact that promotions and
# broad seasonality are shared across warehouses, while the outage is
# warehouse-specific -- so unaffected DCs carry the signal for what
# undisrupted demand would have looked like.
# ---------------------------------------------------------------------------

demand = demand.sort_values(["SKU_ID", "Warehouse_ID", "Week_Start_Date"]).reset_index(drop=True)
demand["week_num"] = demand.groupby(["SKU_ID", "Warehouse_ID"]).cumcount() + 1

UNDERCARRIAGE_SKUS = product.loc[product["Category"] == "Undercarriage", "SKU_ID"].tolist()
CENSORED_WAREHOUSES = ["WH-AP1", "WH-AP2"]
CENSORED_WEEKS = range(41, 47)  # weeks 41-46 inclusive (true censored weeks per Stockout_Flag)

demand["is_censored"] = (
    demand["SKU_ID"].isin(UNDERCARRIAGE_SKUS)
    & demand["Warehouse_ID"].isin(CENSORED_WAREHOUSES)
    & demand["week_num"].isin(CENSORED_WEEKS)
)

print(f"\nCensored rows identified: {demand['is_censored'].sum()} "
      f"({demand.loc[demand['is_censored'],'SKU_ID'].nunique()} Undercarriage SKUs x 2 AP warehouses x 6 weeks)")


def correct_censored_demand(df, undercarriage_skus, censored_wh, censored_weeks):
    """Replace Units_Sold for censored SKU/warehouse/week rows with an estimate
    derived from that SKU's unaffected-warehouse demand pattern, scaled to the
    warehouse's own pre-disruption baseline. Adds Units_Sold_Corrected and
    Demand_Was_Corrected columns; leaves the original Units_Sold untouched."""
    df = df.copy()
    df["Units_Sold_Corrected"] = df["Units_Sold"].astype(float)
    df["Demand_Was_Corrected"] = False

    for sku in undercarriage_skus:
        sku_df = df[df["SKU_ID"] == sku]
        pre_window = sku_df[(sku_df["week_num"] >= 34) & (sku_df["week_num"] <= 39)]

        for wh in censored_wh:
            wh_pre = pre_window[pre_window["Warehouse_ID"] == wh]["Units_Sold"].mean()
            if pd.isna(wh_pre) or wh_pre == 0:
                continue

            # unaffected warehouses' shape during the disrupted window, normalized
            # to their own pre-disruption baseline -> a demand-index curve
            other_wh = [w for w in df["Warehouse_ID"].unique() if w not in censored_wh]
            idx_rows = []
            for ow in other_wh:
                ow_pre = pre_window[pre_window["Warehouse_ID"] == ow]["Units_Sold"].mean()
                if pd.isna(ow_pre) or ow_pre == 0:
                    continue
                ow_win = sku_df[(sku_df["Warehouse_ID"] == ow) & (sku_df["week_num"].isin(censored_weeks))]
                idx_rows.append(ow_win.set_index("week_num")["Units_Sold"] / ow_pre)

            if not idx_rows:
                continue
            demand_index = pd.concat(idx_rows, axis=1).mean(axis=1)  # avg normalized index by week

            mask = (
                (df["SKU_ID"] == sku)
                & (df["Warehouse_ID"] == wh)
                & (df["week_num"].isin(censored_weeks))
            )
            for wk in censored_weeks:
                if wk in demand_index.index:
                    row_mask = mask & (df["week_num"] == wk)
                    est = wh_pre * demand_index.loc[wk]
                    df.loc[row_mask, "Units_Sold_Corrected"] = max(est, df.loc[row_mask, "Units_Sold"].iloc[0])
                    df.loc[row_mask, "Demand_Was_Corrected"] = True

    return df


demand = correct_censored_demand(demand, UNDERCARRIAGE_SKUS, CENSORED_WAREHOUSES, CENSORED_WEEKS)

correction_view = demand[demand["Demand_Was_Corrected"]][
    ["SKU_ID", "Warehouse_ID", "week_num", "Week_Start_Date", "Units_Sold", "Units_Sold_Corrected", "Stockout_Flag"]
].sort_values(["SKU_ID", "Warehouse_ID", "week_num"])
correction_view.to_csv(f"{OUT_DIR}/undercarriage_correction.csv", index=False)

print("\nExample correction (SKU-011, WH-AP1):")
print(correction_view[(correction_view.SKU_ID == "SKU-011") & (correction_view.Warehouse_ID == "WH-AP1")]
      .to_string(index=False))

uplift = (correction_view["Units_Sold_Corrected"].sum() / max(correction_view["Units_Sold"].sum(), 1) - 1) * 100
print(f"Average demand uplift applied across censored weeks: {uplift:.0f}%")

# use corrected series as the modeling target from here on
demand["Units_Sold_Model"] = demand["Units_Sold_Corrected"]

# ---------------------------------------------------------------------------
# 2. FORECASTING
# Method: Holt-Winters (ETS) additive trend, additive weekly seasonality,
# fit per SKU x warehouse on Units_Sold_Model (censoring-corrected series).
# Promotion weeks are handled via a separate multiplicative promo-uplift
# factor estimated from history and layered onto the ETS baseline forecast
# ONLY for weeks the planner flags as promotional; the 12-week forward
# forecast assumes no promo (baseline), consistent with a standard planning
# cycle where promo weeks are called out separately by the merch calendar.
#
# Why ETS over ARIMA/regression here: each SKU has its own trend + a
# 52-week seasonal cycle with meaningful noise, and only 104 weeks of
# history per series (2 seasonal cycles) -- enough to fit an ETS model
# with a seasonal component but too little for reliable
# SARIMA order-selection per series. ETS is also robust to the noise
# level differences called out in the README, and is directly
# interpretable (level/trend/season) for the write-up.
# ---------------------------------------------------------------------------

from statsmodels.tsa.holtwinters import ExponentialSmoothing


def fit_forecast_series(y, horizon, seasonal_periods=52, holdout=0):
    """Fit Holt-Winters ETS (additive trend+seasonal, damped trend) on y[:-holdout]
    if holdout>0, else on all of y. Returns (fitted_model, forecast_array)."""
    y = y.reset_index(drop=True)
    train = y.iloc[: len(y) - holdout] if holdout else y
    train = train.clip(lower=0.01)  # ETS additive seasonal needs strictly positive-ish series

    use_seasonal = len(train) >= 2 * seasonal_periods
    try:
        model = ExponentialSmoothing(
            train,
            trend="add",
            damped_trend=True,
            seasonal="add" if use_seasonal else None,
            seasonal_periods=seasonal_periods if use_seasonal else None,
            initialization_method="estimated",
        ).fit(optimized=True)
        fc = model.forecast(horizon)
    except Exception:
        # fallback: simple moving-average of the last 8 weeks, flat forward
        level = train.tail(8).mean()
        fc = pd.Series([level] * horizon)
        model = None
    return model, np.clip(fc.values, 0, None)


def promo_uplift_factor(df):
    """Ratio of mean demand on promo weeks vs non-promo weeks, per SKU (pooled across warehouses)."""
    grp = df.groupby(["SKU_ID", "Promotion_Flag"])["Units_Sold_Model"].mean().unstack()
    if 1 not in grp.columns or 0 not in grp.columns:
        return pd.Series(dtype=float)
    factor = (grp[1] / grp[0].replace(0, np.nan)).clip(lower=1.0)
    return factor


promo_factors = promo_uplift_factor(demand[demand["SKU_ID"].isin(SELECTED_SKUS)])
print("\nPromotion demand uplift factor by SKU (promo-week mean / non-promo mean):")
print(promo_factors.round(2).to_string())

forecast_rows = []
accuracy_rows = []

for sku in SELECTED_SKUS:
    for wh in WAREHOUSES:
        series = demand[(demand.SKU_ID == sku) & (demand.Warehouse_ID == wh)].sort_values("week_num")
        if series.empty:
            continue
        y = series["Units_Sold_Model"]

        # --- holdout accuracy ---
        _, fc_holdout = fit_forecast_series(y, HOLDOUT_WEEKS, holdout=HOLDOUT_WEEKS)
        actual_holdout = y.iloc[-HOLDOUT_WEEKS:].values
        wmape = np.sum(np.abs(actual_holdout - fc_holdout)) / max(np.sum(np.abs(actual_holdout)), 1e-9) * 100
        bias = np.sum(fc_holdout - actual_holdout) / max(np.sum(np.abs(actual_holdout)), 1e-9) * 100
        accuracy_rows.append({
            "SKU_ID": sku, "Warehouse_ID": wh,
            "Holdout_Weeks": HOLDOUT_WEEKS,
            "WMAPE_pct": round(wmape, 1),
            "Bias_pct": round(bias, 1),
        })

        # --- full-history forward forecast ---
        _, fc_forward = fit_forecast_series(y, FORECAST_HORIZON, holdout=0)
        last_date = series["Week_Start_Date"].max()
        for h in range(FORECAST_HORIZON):
            forecast_rows.append({
                "SKU_ID": sku,
                "Warehouse_ID": wh,
                "Forecast_Week_Start": last_date + pd.Timedelta(weeks=h + 1),
                "Week_Ahead": h + 1,
                "Forecast_Units": round(float(fc_forward[h]), 1),
            })

forecast_df = pd.DataFrame(forecast_rows)
accuracy_df = pd.DataFrame(accuracy_rows)

forecast_df.to_csv(f"{OUT_DIR}/forecast_results.csv", index=False)
accuracy_df.to_csv(f"{OUT_DIR}/holdout_accuracy.csv", index=False)

print("\nHoldout accuracy (WMAPE / bias) by SKU x warehouse:")
print(accuracy_df.to_string(index=False))

sku_accuracy = accuracy_df.groupby("SKU_ID")[["WMAPE_pct", "Bias_pct"]].mean().round(1)
print("\nHoldout accuracy averaged across warehouses, per SKU:")
print(sku_accuracy.to_string())

# ---------------------------------------------------------------------------
# 3. SAFETY STOCK & REORDER POINT
# ROP = (avg weekly demand forecast x lead-time in weeks) + safety stock
# Safety stock (demand & lead-time both variable):
#   SS = Z * sqrt( LT_weeks * sigma_demand^2 + avg_demand_wk^2 * sigma_LT_weeks^2 )
# Service level: 95% (Z = 1.645), a standard cycle-service-level assumption
# for B/C-class MRO spend; could be raised for A-class critical parts.
# ---------------------------------------------------------------------------

sku_supplier = product.set_index("SKU_ID")["Primary_Supplier_ID"]
supplier_lt = supplier.set_index("Supplier_ID")[["Avg_Lead_Time_Days", "Lead_Time_StdDev_Days"]]

latest_inv = inventory.copy()
SNAPSHOT_DATE = pd.to_datetime(inventory["Snapshot_Date"]).max()  # use the data's own "today", not the real clock

planning_rows = []
for sku in SELECTED_SKUS:
    sup_id = sku_supplier.get(sku)
    lt_days, lt_sd_days = supplier_lt.loc[sup_id, ["Avg_Lead_Time_Days", "Lead_Time_StdDev_Days"]]
    lt_weeks = lt_days / 7
    lt_sd_weeks = lt_sd_days / 7

    prod_row = product[product.SKU_ID == sku].iloc[0]
    moq, pack = prod_row["Min_Order_Qty"], prod_row["Pack_Size"]

    for wh in WAREHOUSES:
        hist = demand[(demand.SKU_ID == sku) & (demand.Warehouse_ID == wh)]["Units_Sold_Model"]
        avg_wk_demand = hist.tail(12).mean()  # recent demand level (post-correction)
        sd_wk_demand = hist.tail(12).std(ddof=0)
        sd_wk_demand = 0.0 if pd.isna(sd_wk_demand) else sd_wk_demand

        safety_stock = Z * np.sqrt(lt_weeks * sd_wk_demand ** 2 + (avg_wk_demand ** 2) * (lt_sd_weeks ** 2))
        reorder_point = avg_wk_demand * lt_weeks + safety_stock

        inv_row = latest_inv[(latest_inv.SKU_ID == sku) & (latest_inv.Warehouse_ID == wh)]
        on_hand = inv_row["On_Hand_Qty"].iloc[0] if not inv_row.empty else np.nan
        on_order = inv_row["On_Order_Qty"].iloc[0] if not inv_row.empty else np.nan
        inv_position = on_hand + on_order

        weeks_of_supply = on_hand / avg_wk_demand if avg_wk_demand > 0 else np.inf

        # Coverage ratio = inventory position / reorder point. Across the FULL
        # network (all 100 SKU x warehouse combos, checked separately) this
        # ratio ranges ~0.07-1.43 with a median of ~0.42 -- i.e. most
        # combinations are running below the 95%-service-level target given
        # two years of demand growth against long supplier lead times, and
        # "overstock" in this dataset is a relative, not absolute, condition
        # (a few weeks of extra cover on short-/reliable-lead-time SKUs,
        # not multi-month gluts). Tiers are calibrated to that distribution.
        coverage_ratio = inv_position / reorder_point if reorder_point > 0 else np.inf

        if coverage_ratio < 0.6:
            risk = "STOCKOUT RISK (URGENT)"
        elif coverage_ratio < 1.0:
            risk = "REORDER DUE"
        elif coverage_ratio < 1.25:
            risk = "OK"
        else:
            risk = "OVERSTOCKED"

        planning_rows.append({
            "SKU_ID": sku, "Warehouse_ID": wh, "Primary_Supplier_ID": sup_id,
            "Avg_Weekly_Demand": round(avg_wk_demand, 1),
            "StdDev_Weekly_Demand": round(sd_wk_demand, 1),
            "Lead_Time_Weeks": round(lt_weeks, 2),
            "Lead_Time_StdDev_Weeks": round(lt_sd_weeks, 2),
            "Safety_Stock": round(safety_stock, 0),
            "Reorder_Point": round(reorder_point, 0),
            "On_Hand_Qty": on_hand,
            "On_Order_Qty": on_order,
            "Inventory_Position": inv_position,
            "Weeks_Of_Supply_OnHand": round(weeks_of_supply, 1) if np.isfinite(weeks_of_supply) else None,
            "Coverage_Ratio": round(coverage_ratio, 2) if np.isfinite(coverage_ratio) else None,
            "Risk_Flag": risk,
            "MOQ": moq, "Pack_Size": pack,
        })

planning_df = pd.DataFrame(planning_rows)
planning_df.to_csv(f"{OUT_DIR}/safety_stock_reorder.csv", index=False)

print(f"\nSafety stock / reorder point (service level = {SERVICE_LEVEL:.0%}):")
print(planning_df.to_string(index=False))

print("\nRisk flag summary:")
print(planning_df["Risk_Flag"].value_counts().to_string())

# ---------------------------------------------------------------------------
# 4. REPLENISHMENT PLAN
# Order-up-to target = Reorder_Point + one forecast cycle of demand
# (approximated as avg weekly demand x lead-time, i.e. cover through the
# next replenishment lead time), rounded UP to a multiple of pack size and
# at least MOQ, only for SKU/warehouses currently below reorder point.
# ---------------------------------------------------------------------------

def round_to_pack(qty, pack, moq):
    if qty <= 0:
        return 0
    qty = max(qty, moq)
    return int(np.ceil(qty / pack) * pack)


replen_rows = []
for _, r in planning_df.iterrows():
    if r["Risk_Flag"] not in ("STOCKOUT RISK (URGENT)", "REORDER DUE"):
        continue
    target_position = r["Reorder_Point"] + r["Avg_Weekly_Demand"] * r["Lead_Time_Weeks"]
    raw_qty = target_position - r["Inventory_Position"]
    order_qty = round_to_pack(raw_qty, r["Pack_Size"], r["MOQ"])
    replen_rows.append({
        "SKU_ID": r["SKU_ID"], "Warehouse_ID": r["Warehouse_ID"],
        "Primary_Supplier_ID": r["Primary_Supplier_ID"],
        "Urgency": r["Risk_Flag"],
        "Recommended_Order_Qty": order_qty,
        "MOQ": r["MOQ"], "Pack_Size": r["Pack_Size"],
        "Order_By_Date": SNAPSHOT_DATE,
        "Lead_Time_Weeks": r["Lead_Time_Weeks"],
        "Expected_Arrival": (SNAPSHOT_DATE + pd.Timedelta(weeks=r["Lead_Time_Weeks"])),
        "Reason": "On-hand + on-order below reorder point",
    })

replen_df = pd.DataFrame(replen_rows)
replen_df.to_csv(f"{OUT_DIR}/replenishment_plan.csv", index=False)

print(f"\nReplenishment plan ({len(replen_df)} lines requiring action):")
print(replen_df.to_string(index=False) if not replen_df.empty else "  (none of the selected SKU/warehouses are below ROP)")

# ---------------------------------------------------------------------------
# 5. SUPPLIER LEAD-TIME RISK (from Purchase_Order_History)
# ---------------------------------------------------------------------------

po["Actual_Lead_Time_Days"] = (po["Actual_Delivery_Date"] - po["Order_Date"]).dt.days
po["Delay_Days"] = (po["Actual_Delivery_Date"] - po["Promised_Delivery_Date"]).dt.days

sup_actual = po.groupby("Supplier_ID").agg(
    POs=("PO_ID", "count"),
    Actual_Avg_LT_Days=("Actual_Lead_Time_Days", "mean"),
    Actual_LT_StdDev_Days=("Actual_Lead_Time_Days", "std"),
    OnTime_Pct_Actual=("On_Time_Flag", "mean"),  # kept as 0-1 fraction until AFTER the x100 below
    Avg_Delay_Days=("Delay_Days", "mean"),
    Max_Delay_Days=("Delay_Days", "max"),
)
sup_actual["OnTime_Pct_Actual"] = (sup_actual["OnTime_Pct_Actual"] * 100).round(1)  # x100 BEFORE rounding
sup_actual[["Actual_Avg_LT_Days","Actual_LT_StdDev_Days","Avg_Delay_Days","Max_Delay_Days"]] = sup_actual[["Actual_Avg_LT_Days","Actual_LT_StdDev_Days","Avg_Delay_Days","Max_Delay_Days"]].round(1)

supplier_risk = supplier.set_index("Supplier_ID").join(sup_actual)
supplier_risk["LT_Gap_vs_Stated_Days"] = (supplier_risk["Actual_Avg_LT_Days"] - supplier_risk["Avg_Lead_Time_Days"]).round(1)
supplier_risk["OTIF_Gap_vs_Stated_pct"] = (supplier_risk["OnTime_Pct_Actual"] - supplier_risk["OTIF_Reliability_Pct"]).round(1)

# simple composite risk score: normalized lead-time variability + (100 - OTIF)
supplier_risk["Risk_Score"] = (
    (supplier_risk["Actual_LT_StdDev_Days"] / supplier_risk["Actual_LT_StdDev_Days"].max()) * 50
    + ((100 - supplier_risk["OnTime_Pct_Actual"]) / (100 - supplier_risk["OnTime_Pct_Actual"]).max()) * 50
).round(1)

supplier_risk = supplier_risk.sort_values("Risk_Score", ascending=False)
supplier_risk.to_csv(f"{OUT_DIR}/supplier_risk.csv")

print("\nSupplier lead-time / reliability risk (from actual PO history):")
print(supplier_risk[[
    "Supplier_Name", "Avg_Lead_Time_Days", "Actual_Avg_LT_Days", "Actual_LT_StdDev_Days",
    "OTIF_Reliability_Pct", "OnTime_Pct_Actual", "Avg_Delay_Days", "Max_Delay_Days", "Risk_Score"
]].to_string())

top_risk_supplier = supplier_risk.index[0]
print(f"\n=> Highest-risk supplier: {top_risk_supplier} ({supplier_risk.loc[top_risk_supplier,'Supplier_Name']}) "
      f"-- recommend elevated safety-stock buffer and a secondary-sourcing conversation for its category.")

print("\nAll outputs written to ./output/")
