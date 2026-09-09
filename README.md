# TerraTrac Insights

A supply chain planning dashboard for a synthetic case study — TerraTrac Equipment Parts, a fictional distributor of spare parts for heavy construction equipment.

**Live dashboard:** https://trac-planner-insight.lovable.app

## What this is

TerraTrac operates 4 regional distribution centers and sources from 5 category-specialist suppliers. Using 104 weeks of weekly sell-through history, a current inventory snapshot, and 220 historical purchase orders, this project:

- Forecasts 12-week forward demand for 5 SKUs across 3 ABC classes, using a trend + Fourier-seasonality + promotion regression
- Corrects a 6-week stockout-censoring event in the Undercarriage category (weeks 41-46, Asia Pacific DCs) rather than ignoring or excluding it
- Calculates safety stock and reorder points at a 95% service level, using lead-time variability measured from actual purchase order history (not just supplier-stated averages)
- Flags SKU x warehouse positions at stockout risk and recommends a replenishment plan respecting MOQ and pack size
- Ranks supplier risk using measured on-time delivery performance, and flags where it diverges from the supplier master data

## How it's built

- `scripts/supply_chain_analysis.py` — the actual analysis: demand correction, forecasting, safety stock/reorder point calculation, and supplier risk scoring. Produces the CSV outputs.
- `scripts/build_dashboard.py` — combines those CSVs into `src/data/dashboard.json`, the single data file the frontend reads from.
- Frontend: React + TypeScript + Tailwind, built with [Lovable](https://lovable.dev).

## Data

`Supply_Chain_Assessment_Dataset.xlsx` is fully synthetic — all company names, figures, and identifiers are generated for this exercise.

## Running the analysis locally

```bash
pip install pandas numpy scipy statsmodels
python3 scripts/supply_chain_analysis.py     # writes CSVs to ./output
python3 scripts/build_dashboard.py            # rebuilds src/data/dashboard.json
```

## Project Report

[Download the full case study (PDF)](./docs/terratrac-insights_Data_Analytics_Portfolio.pdf)
