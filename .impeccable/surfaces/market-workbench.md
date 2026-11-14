# Market workbench 1.4.0

Mode: Operate. User-directed replacement of the previous Web surface.

The homepage leads with a full-width market-cap ECharts treemap and places funding monitoring directly beneath it. Top navigation exposes the intraday limit-event board, personal review notes and watchlist. There is no persistent inspector. Ant Design provides standard tables, forms, overlays and darkAlgorithm.

Default dark neutral surfaces support sustained monitoring; light mode has equal functionality. Market colors are user-editable; quote text has derived contrast independently of map fills. The chart preserves actual cap weighting and provides industry zoom and a complete stock list for tiny-name access.

Data remains the dated sample: 5,566 stocks; limit U37, D33, Z21; funding only37 limit-up records. Missing all-market funding and minute series are explicit. Notes and watchlist persist locally, with notes backup/import. Reusable API/core/client boundaries remain.

UI defaults: public/ui.config.js.workbench. Runtime source: web/. Free CSS: public/theme-overrides.css. Legacy visual implementation remains /legacy.html for compatibility, and its older tokens in design.json are historical only. Current authority: DESIGN.md and web/preferences.js.

Verification: behavior suites plus bounded desktop/light/dark/mobile screenshot review. See CHANGELOG.md and docs/verification-v1.4.0.json.
