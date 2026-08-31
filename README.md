# TerraTrac Insights

Build a supply chain planning dashboard for a case study called 

"TerraTrac Equipment Parts — Demand Forecasting & Supply Planning."

Structure:

1. Overview page — company context (spare parts distributor, 4 DCs, 

   5 category-specialist suppliers), and a summary of key findings 

   (I will supply the actual numbers/text).

2. Demand Forecasting tab — for 5 selected SKUs:

   - A line chart per SKU showing historical weekly demand (104 weeks) 

     vs. 12-week forecast, with a shaded band for the holdout/test period

   - A callout panel explaining trend, seasonality, and promotion effects 

     detected per SKU

   - A note on how the Undercarriage stockout-censored weeks (weeks 40-45, 

     Asia Pacific DCs) were handled

   - A table of forecast accuracy (WMAPE) by SKU

3. Supply Planning tab — a table/grid by SKU x Warehouse showing:

   - Current on-hand, on-order, reorder point, safety stock, days of 

     supply remaining

   - Color-coded risk flags (stockout risk / healthy / overstocked)

   - A replenishment recommendation column (quantity, timing, respecting 

     MOQ and pack size)

4. Supplier Risk tab — bar/scatter chart of the 5 suppliers by average 

   lead time vs. OTIF reliability, with Trackline Manufacturing 

   (Undercarriage) flagged as highest-risk, and a short recommendation 

   panel on safety-stock buffering or secondary sourcing.

5. Executive Summary tab — a clean one-pager layout suitable for a 

   supply chain leadership audience, with 3-4 key takeaways and 

   recommended actions.

Design: clean, professional, data-dense but uncluttered — think 

enterprise BI tool (Tableau/Power BI aesthetic), not a marketing 

landing page. Use a neutral palette (navy/slate/teal), clear typography, 

and card-based layout. I will provide the underlying data and computed 

metrics as JSON/CSV to populate the charts and tables.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/313dfbda-d8e2-4f2f-9bed-ce0f5777ffea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
