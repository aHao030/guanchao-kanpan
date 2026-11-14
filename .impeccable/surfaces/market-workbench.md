# Market workbench

Mode: Operate. This surface serves market scanning, industry exploration and stock review. Preserve the five pools, search, on-demand stock details and lists, sentiment, timeline and history. The user authorized implementation and documentation without another approval round.

## Direction contract

THESIS: Follow the user's explicit dapanyuntu.com reference. Let the market occupy the largest continuous reading field, with clear industry structure, correct market-cap area and stock names that retain their natural proportions.

REFERENCE EVIDENCE: Actual light-mode overview, stock-hover and industry-focus captures, observed Canvas measurements and the public renderer's offline REA analysis are recorded in `docs/reverse-engineering/`. HyperFrames contributed text-fit and rendered-output review principles. The previous seed/candidate direction is superseded by this evidence and user request; no invented workshop choice controls this surface.

OWN-WORLD: Keep the user's `light3colors` commitment: white surfaces, cool gray ground, navy text and cobalt interface state; red/green/black encode market change. Native Chinese sans, tabular figures, fine separators and flat surfaces. Borrow the reference's information hierarchy and exploration behavior while implementing the product independently.

STORY: Scan market breadth and full market structure; choose a pool, search a stock or focus an industry; inspect a stock through map or list; then read sentiment and intraday timing. A clear return restores the full market. The static sample date remains visible and US-market overview is removed.

FIRST VIEWPORT: Compact 62px identity/date/search bar and 56px market overview precede the dominant treemap. The desktop main region is `calc(100dvh - 146px)` with a 640px minimum; the map fills its width by default. The persistent inspector and focus toggle are removed. Stock clicks, search Enter and timeline clicks open native `dialog#detailDialog`; “查看列表” opens the list in the same on-demand dialog. Industry focus does not open it. Sentiment and two auxiliary plots follow below.

MAP: Three levels use the sample's existing industry / `subBoardName` / stock data. All 5,566 stocks participate in the market-cap layout without presampling; no 900-stock quota or sampled reweighting remains. Extremely small cells can lack labels or visible area depending on viewport and padding; industry focus and search preserve access to their details. Local d3-hierarchy supplies squarify geometry. Large cells show measured complete stock names, wrapping to two lines when needed, and a percentage when it fits; medium cells use complete names at 10px or larger; small cells show a name prefix only when at least two characters fit. Tiny cells retain full names on hover. Every label has normal character width and stock labels are clipped inside their cells. Industry titles and an accessible select provide focus; the visible “全市场” button returns. Status separates scope and matching counts.

MOBILE: At 700px and below, the map and other modules use a vertical flow. The map panel is 660px high; search occupies a complete row; overview and pool controls may scroll within their own region. Details and lists open in a viewport-bounded dialog with internal scrolling. Sentiment retains five items, followed by timeline and history. At 360px and below breadth and volume each get a full row. Page content must fit a 320px viewport without page-level horizontal overflow.

FINISH: The 1.2.1 build passed 26 tests, four viewport screenshot checks (1440px, 1100px, 390px, 320px), two detail-state screenshot checks and an independent review. README, PRODUCT, DESIGN, sidecar, workflow and version log are synchronized; historical verification remains attached to its version. Do not claim real-time data, complete REA coverage, or unimplemented reference features such as wheel zoom and pan. Keep research-tool details in documentation, not in the product flow.
