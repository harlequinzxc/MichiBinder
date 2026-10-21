# CHANGELOG — MichiBinder Project Memory and State Ledger

This file is the project's durable memory and source of truth for engineering history and current implementation state. It records what exists, why it exists, what was replaced, what failed, and what remains incomplete. It describes reality; it is not a second rules file or a speculative roadmap.

## Current state — v4.6.7

- **Ledger date:** 2026-10-20
- **Application state entering this feature pass:** commit `bf35038` / v4.6.6
- **Product:** a private, desktop-first trading-card binder layout and true-size print workspace
- **Runtime:** static client-only React 19 PWA built by Vite 6 with Tailwind CSS v4 through `@tailwindcss/vite`
- **Runtime dependencies:** only `react`, `react-dom`, and `lucide-react`
- **Primary source:** `src/CardBinder.jsx`, approximately 3,450 lines containing the data model, persistence, catalogue integration, interactions, print tree, and most UI components
- **Supporting source:** `src/index.css` for Tailwind import, print media, page-turn depth, sleeve materials, portrait guard, and animations
- **Persistence:** binder metadata in `localStorage`; image blobs in IndexedDB; data URL/local-storage fallback when IndexedDB is unavailable
- **Network boundary:** TCGdex REST/API assets plus the public open ExchangeRate-API USD feed; no MichiBinder backend, account, telemetry, required secret, or environment variable
- **Deployment:** static `dist/` output on Vercel through `vercel.json`
- **Last functional change:** Michi cards retain exact catalogue geometry while restoring the grayscale placed-card indicator
- **Last verified behavior:** production build plus three-viewport direct-child grid structure, placed/unplaced image styling, ratio, containment, and scrollbar checks
- **Active incomplete implementation:** none. Remaining gaps are documented near the end of this file.

## SemVer reconstruction

Versions are assigned retrospectively to every commit because historical package metadata remained at `1.0.0` and no release tags were created. The package and lockfile were first synchronized with the reconstructed ledger in commit `69ad992`; this pass advances both to v4.2.3.

The classification reflects the requested strict release logic:

- **PATCH** — compatible visual polish, spacing, alignment, typography, assets, race-condition fixes, and documentation.
- **MINOR** — a backward-compatible functional feature or operational module.
- **MAJOR** — a layout or rendering paradigm was replaced rather than extended.

Three post-inception architectural breaks justify major releases:

1. **v2.0.0:** the flat page viewport was replaced by the preserved 3D spread/rotation engine.
2. **v3.0.0:** the toolbar/tray composition was dismantled and rebuilt as the four-area workspace with contextual bottom navigation.
3. **v4.0.0:** top-heavy configuration controls were removed and replaced by the standalone right utility rail plus cohesive bottom structural controller.

Historical entries are ordered from oldest to newest. Commit links, rather than nonexistent retrospective Git tags, are the immutable references.

---

## [v1.0.0] — 2026-10-18 — [`9d9b7c5`](https://github.com/harlequinzxc/MichiBinder/commit/9d9b7c5421e5bf9a1ae6c336657382d5c1def10f)

### Added

- Seeded the repository with `README.md` and the MichiBinder identity. This was the project boundary only; no executable application existed yet.

## [v1.1.0] — 2026-10-18 — [`193e375`](https://github.com/harlequinzxc/MichiBinder/commit/193e3759e1b27156965a04e7be122d3f05c9f932)

### Added

- Built the first production-capable Digital Card Binder as a Vite/React/Tailwind PWA.
- Added local image upload, reusable card pool, drag/drop placement, 2×2/3×3/4×3 grids, Merge/Unmerge, crop repositioning, multiple pages, Binder/Paper previews, true-size browser printing, accessibility labels, keyboard interaction, installation assets, service worker, Vercel config, and full README.
- Added local-first persistence: layout metadata in `localStorage`, blobs in IndexedDB, and data-URL fallback when IndexedDB fails. The architecture avoided a backend so private images stay on-device.

### Improved

- Established physical-unit layout calculations and print-fit feedback so the browser print engine, rather than a server-side PDF renderer, could produce correctly sized output.

## [v1.2.0] — 2026-10-18 — [`335b58d`](https://github.com/harlequinzxc/MichiBinder/commit/335b58dd5f22ade4d150204bddd3837ba9be8c0f)

### Added

- Added one-click Unmerge directly on a merged frame and a toast-level undo path.
- Added guarded hover/focus actions for Unmerge and Remove Card.

### Fixed

- Added marquee/action timing guards so nested buttons could not leak pointer, click, or double-click events into selection, drag, or crop repositioning.

## [v1.2.1] — 2026-10-18 — [`0a226a2`](https://github.com/harlequinzxc/MichiBinder/commit/0a226a2a88ebe1c581ab0134de839613296c5a8c)

### Improved

- Replaced the initial PWA icon family and refined the SVG artwork for cleaner install surfaces. No application behavior changed.

## [v1.2.2] — 2026-10-18 — [`b1542cd`](https://github.com/harlequinzxc/MichiBinder/commit/b1542cdcd860eb86bf8fd24cd98bb4935bd4856a)

### Improved

- Reworked the application into the black/crimson product theme and updated accents, icons, manifest colors, document metadata, service-worker cache identity, and screenshot.
- The visual system established red as action/selection hierarchy while leaving data and interaction contracts intact, so this remained a patch release.

## [v1.2.3] — 2026-10-18 — [`1716c71`](https://github.com/harlequinzxc/MichiBinder/commit/1716c71a500464b80423858d8990b0df90ca7c5b)

### Improved

- Polished page previews, navigation controls, active states, and workspace proportions.
- Updated the committed desktop screenshot to match the revised interface.

## [v1.3.0] — 2026-10-18 — [`c4750f2`](https://github.com/harlequinzxc/MichiBinder/commit/c4750f244beac499df1f84740aafd25e7f26144a)

### Added

- Added a 30-entry Undo/Redo canvas history with keyboard shortcuts.
- Added ordered selection counts, fill/delete actions, and history-aware placement, movement, merge, unmerge, clear, reset, and layout changes.

### Improved

- Centralized canvas mutations through snapshot-aware helpers. History intentionally captured pages, current page, and layout—not the card library, remote catalogue, or every setting—because canvas recovery and asset-library recovery have different lifecycles.

## [v2.0.0] — 2026-10-18 — [`7f786bc`](https://github.com/harlequinzxc/MichiBinder/commit/7f786bc96285a2f8deb9724f9a89a01eaffc9c21)

### Added

- Replaced the flat page viewport with facing-page groups, boundary covers, center spine, preserved 3D transforms, directional transitions, and spread navigation.
- Added resize-aware stage scaling and spread-aware selection/history restoration.

### Removed

- Removed the assumption that one active logical page always mapped to one flat canvas. Pages now participate in a spread and have a left/right physical side.

### Improved

- This was the first major architectural break: rendering, navigation, animation timing, and workspace geometry moved to a 3D spread engine rather than layering an effect over the old flat layout.

## [v2.1.0] — 2026-10-18 — [`f32ce17`](https://github.com/harlequinzxc/MichiBinder/commit/f32ce170ad73d233e3251f9a4b6c112918a296ba)

### Added

- Added the physical-sheet ownership model: exactly two pages (`front` and `back`) share one `sheetId`.
- Added migration/repair for odd, legacy, or unpaired page arrays.
- Made add, duplicate, delete, ordering, and minimum-page behavior operate on whole sheets. This was necessary for duplex identity and credible page turns.

### Removed

- Removed independent page insertion/deletion semantics that could orphan a reverse face.

## [v2.1.1] — 2026-10-18 — [`632d076`](https://github.com/harlequinzxc/MichiBinder/commit/632d076707590426b4b66e6e716a8f1a9e3b34b9)

### Fixed

- Unified binder grouping so the first and final boundary pages render alone while interior pages render as facing pairs.
- Aligned labels, navigation, thumbnails, and side assignment to the same `binderViewGroups`/`binderViewForPage` model, removing divergent page math.

## [v2.2.0] — 2026-10-19 — [`bf5a93e`](https://github.com/harlequinzxc/MichiBinder/commit/bf5a93e6b59b806556a32f26b9ffee6fbcaf3f10)

### Added

- Added double-sided physical turns with distinct front/back faces, stable base leaves, cover layers, directional plans, and insertion/duplication transitions.
- The engine renders nonmoving base pages separately from the turning sheet so React updates cannot visually erase the page beneath the animation.

## [v2.2.1] — 2026-10-19 — [`e95acaf`](https://github.com/harlequinzxc/MichiBinder/commit/e95acafc4913d423853a6716cb0a43ba0decc9e1)

### Fixed

- Corrected rotation-axis alignment at the center spine and at front/back cover boundaries.
- Added distinct front-cover, back-cover, and interior-spread plans because the base leaf and transform origin differ at each boundary.

## [v2.2.2] — 2026-10-19 — [`ee89bc5`](https://github.com/harlequinzxc/MichiBinder/commit/ee89bc5498ad2e95371173a5e73fb974a2633387)

### Fixed

- Refined forward/backward rotation signs, face visibility, transform origins, and `translateZ` separation.
- Added a missing-face guard so stale turn plans cannot render invalid page IDs after structural edits.

## [v2.2.3] — 2026-10-19 — [`e4fbb89`](https://github.com/harlequinzxc/MichiBinder/commit/e4fbb890974465300c9c81dfb9db6b3ca4812ae2)

### Fixed

- Pinned animated spreads to an explicit frame height and controlled overflow clipping, eliminating vertical jumps during turns.

## [v2.2.4] — 2026-10-19 — [`3e510ee`](https://github.com/harlequinzxc/MichiBinder/commit/3e510ee0b66896f05f55c7574f045bcf86389bb1)

### Improved

- Added a thin page edge, directional face shading, cast shadows, and eased depth cues.
- Kept geometry rigid and expressed physical depth through light/shadow, preventing decorative effects from shifting the hinge axis.

## [v2.2.5] — 2026-10-19 — [`551ec39`](https://github.com/harlequinzxc/MichiBinder/commit/551ec394f30417531c7de05b422b7db685e3ad25)

### Improved

- Elevated hierarchy across header navigation, sizing toolbar, source pool, workspace status, responsive labels, binder spine, and page materials.
- Condensed secondary labels at narrower widths to protect the canvas from toolbar overflow.

## [v2.2.6] — 2026-10-19 — [`7ff4dc6`](https://github.com/harlequinzxc/MichiBinder/commit/7ff4dc6e09abdbd5bad39091747744c4b486bfac)

### Improved

- Clarified visual hierarchy between global controls, page tools, help/status surfaces, and the binder itself.
- Refined depth and contrast so controls remain legible without competing with card art.

## [v2.2.7] — 2026-10-19 — [`2b4e52c`](https://github.com/harlequinzxc/MichiBinder/commit/2b4e52c3fd7c1d0a19a3a47088501cd222cda1e1)

### Improved

- Rebalanced header density and responsive visibility.
- Deepened binder beds, sleeves, covers, and workspace shadows without changing print geometry.

## [v2.2.8] — 2026-10-19 — [`909614d`](https://github.com/harlequinzxc/MichiBinder/commit/909614d0a849fb8b3e1e07fa49065204bdbbb79c)

### Added

- Added a self-hosted Inter variable-font asset and license.

### Improved

- Applied Inter locally and refined typography/material details. Self-hosting preserved the no-font-network and static deployment boundary.

## [v2.2.9] — 2026-10-19 — [`87a15e0`](https://github.com/harlequinzxc/MichiBinder/commit/87a15e08125f95e59187cf214b12bbdcb341948a)

### Improved

- Tightened toolbar, upload tray, slot-label, cover, and active-thumbnail spacing, sizing, and micro-interactions.

## [v2.2.10] — 2026-10-19 — [`0f862a3`](https://github.com/harlequinzxc/MichiBinder/commit/0f862a3e7f0811b1cedeb5776cd6ef5f4854f064)

### Improved

- Unified page structural controls in one workspace toolbar and centralized icon rendering through the `Icon` abstraction.
- Deepened Binder/Paper surfaces and fixed the 3D perspective at 1200px to make axis behavior predictable across viewport scaling.

### Removed

- Removed duplicated structural controls that had become scattered across page surfaces.

## [v2.3.0] — 2026-10-19 — [`9228d40`](https://github.com/harlequinzxc/MichiBinder/commit/9228d40602bd1e074a877673e54b117662b1d476)

### Added

- Connected TCGdex card search with 350ms debounce, abortable requests, loading/error/empty states, low-resolution previews, and high-resolution imports.
- Added drag, double-click, Enter-key, slot, stage, sidebar, and timeline import paths for remote cards.
- Added a local placeholder and advanced the service-worker cache to `card-binder-v3`.

### Improved

- Normalized extensionless TCGdex image bases and restricted trusted absolute image URLs to `assets.tcgdex.net`.
- Downloaded high-resolution images into local storage when possible; retained a CDN URL only when browser/CORS policy blocks blob ingestion.

## [v2.4.0] — 2026-10-19 — [`849a14b`](https://github.com/harlequinzxc/MichiBinder/commit/849a14bbe6a4b1a1a6e5d99158e0d4553f677d2f)

### Added

- Added TCGdex set retrieval, newest-first set sorting, set filters, paged results, and per-set card caching.

### Improved

- Accepted both direct arrays and `{ data }` API envelopes and retried set listing without server sort parameters when the endpoint returned 400/422.

## [v2.5.0] — 2026-10-19 — [`71a8295`](https://github.com/harlequinzxc/MichiBinder/commit/71a82950b7e1ddaec308100e50944ca84654f990)

### Added

- Added print scope for all placed cards versus private uploads only.
- Persisted source metadata (`tcgdex` or `upload`) so storage reconciliation and printing can distinguish remote catalogue imports from private art.

### Improved

- Clarified scope-specific empty-print messaging and refined active timeline framing and page materials.

## [v2.5.1] — 2026-10-19 — [`41a802b`](https://github.com/harlequinzxc/MichiBinder/commit/41a802b6345e0c5de9ac6a4e8216363640604756)

### Fixed

- Raised Print Setup's stacking level so it no longer rendered beneath workspace surfaces.

## [v2.6.0] — 2026-10-19 — [`78d500d`](https://github.com/harlequinzxc/MichiBinder/commit/78d500d55830fddd7b2002d325b5e01dacde0aa3)

### Added

- Added separate public-catalogue and private-upload source workspaces, the foundation of the Cards/Michi sidebar.
- Added local upload cards with source badges, selection, custom drag payloads, and private-asset actions.

### Improved

- Carried source identity through IndexedDB, fallback persistence, selection, and drag ingestion so remote and private cards remain interoperable without becoming indistinguishable.

## [v2.7.0] — 2026-10-19 — [`536ee2d`](https://github.com/harlequinzxc/MichiBinder/commit/536ee2dd4a9de9f51f22acb3326043fab019a3e3)

### Added

- Added icon-bearing Cards and Michi source tabs and a collapse/expand framework for the page navigator.
- Established current tab IDs `cards` and `michi`.

### Removed

- Removed redundant sidebar filters/actions and the old `tcgdex` tab ID to simplify source switching.

## [v2.8.0] — 2026-10-19 — [`57ada8c`](https://github.com/harlequinzxc/MichiBinder/commit/57ada8c0faead71786a97c65b4d6a54438e4a4b0)

### Added

- Added the custom-upload print compiler. It gathers private upload instances in page/slot order, strips live merges, compacts them into sequential grid slots, auto-paginates by `rows × columns`, and computes paired physical sheet capacity for the temporary print tree.
- Added Database, Custom, and Density metrics.

### Improved

- Rebranded Digital Card Binder as MichiBinder across metadata, manifest, README, notifications, and portrait guard.
- Refined page-tray geometry and active thumbnail framing.

## [v2.9.0] — 2026-10-19 — [`75c3f59`](https://github.com/harlequinzxc/MichiBinder/commit/75c3f59c0e7afb716a5b2e8dc3955632038b496a)

### Added

- Replaced manual TCGdex pagination with near-bottom infinite scrolling, append-mode fetches, a scroll lock, loading-more state, end-of-catalog state, and filter reset.

### Removed

- Removed previous/next API page buttons because continuous browsing better matched large sets.

## [v2.10.0] — 2026-10-20 — [`9e159bf`](https://github.com/harlequinzxc/MichiBinder/commit/9e159bfb667dff6cb00deedd2672bea097adaadd)

### Added

- Added a floating controller pod for Undo/Redo, spread navigation, Add Spread, and Delete Sheet.
- Added native slot-target highlighting through data attributes.

### Removed

- Removed page navigation and destructive sheet actions from the crowded header.

### Fixed

- Reset drag state before asynchronous file/import work so high-frequency native drop/end events could not leave stale highlights or locked drag state.

## [v3.0.0] — 2026-10-20 — [`9c0c2ec`](https://github.com/harlequinzxc/MichiBinder/commit/9c0c2ecaf259691983684cf608271cf21b2e835d)

### Added

- Rebuilt the application as a four-area workspace: top utility bar, collapsible source sidebar, dynamic live preview, and contextual bottom controller.
- Added sidebar control to the header and moved Merge/Unmerge, reset, clear, history, and spread actions into one bottom surface.

### Removed

- Dismantled the separate sizing toolbar, canvas toolbar, page tray, and fixed status footer from the previous paradigm.

### Improved

- This was the second major break: control ownership and viewport layout were replaced rather than rearranged, establishing the structure later extended by the timeline and utility rail.

## [v3.1.0] — 2026-10-20 — [`11c6eb8`](https://github.com/harlequinzxc/MichiBinder/commit/11c6eb82f4bcab6001fc6760e20e6f156e4eb65d)

### Added

- Made the workspace fluidly resize with the sidebar instead of reserving its width permanently.
- Grounded the floating pod into a full-width bottom control track with horizontal overflow protection.

### Improved

- Temporarily integrated Database/Custom/Density into the control track; these metrics returned to the preview surface in v3.2.0 to keep status distinct from actions.

## [v3.2.0] — 2026-10-20 — [`d0b6350`](https://github.com/harlequinzxc/MichiBinder/commit/d0b6350944357efcfc2c0bf3c15c9613c57a8b04)

### Added

- Restored a collapsible timeline with spread-group thumbnails, direct switching, cross-page drops, insertion, and a right-aligned toggle in the bottom controller.

### Improved

- Returned Database/Custom/Density to an absolute row at the bottom of the preview viewport so timeline collapse can expand the canvas independently.

## [v3.3.0] — 2026-10-20 — [`7c18131`](https://github.com/harlequinzxc/MichiBinder/commit/7c181310e21ac2f303b7fb9784de251087df0095)

### Added

- Unified Cards and Michi selection in `selectedCardIds`.
- Added Shift-range and Ctrl/Command-toggle selection for TCGdex results, ordered badges, remote batch drag/import, and consecutive placement across pages.

### Fixed

- Docked the timeline to the dynamic right workspace with stable min-content width and horizontal overscroll containment so it no longer clipped beneath the sidebar.

## [v4.0.0] — 2026-10-20 — [`268aac6`](https://github.com/harlequinzxc/MichiBinder/commit/268aac6a756c45a5e4fc1fd822d82f8e7fca829f)

### Added

- Added persisted per-page section names with editable Binder and Paper labels.
- Added the standalone right control rail for layout, preview, scale, card material, printing, duplication, shortcuts, and installation.

### Removed

- Removed the top-heavy configuration controls and reduced the header to product identity, sidebar control, and persistence status.

### Improved

- This was the third major break: configuration moved from horizontal toolbar rows to a vertical rail while structural page editing stayed in the bottom controller.
- Polished rings, sheets, covers, paper shadows, metrics, and collapsed timeline semantics.

## [v4.1.0] — 2026-10-20 — [`0727608`](https://github.com/harlequinzxc/MichiBinder/commit/0727608cfd5a48493d15744c2b03f73cf9a3e397)

### Added

- Added reusable left-projecting dark-glass rail popovers with dialog semantics, `aria-expanded`, and `aria-haspopup`.
- Added compact menu modules for grid, print scope, scale, card material, print setup, and shortcuts.

### Removed

- Removed the full-height dock/divider appearance and oversized inline rail controls, turning the rail into a detached rounded capsule.

## [v4.1.1] — 2026-10-20 — [`576a4ac`](https://github.com/harlequinzxc/MichiBinder/commit/576a4ac5eb6694b32752e4e34c38dc1bff610006)

### Improved

- Forced every Lucide icon to exactly 16×16 through `Icon`; caller size utilities are filtered out.
- Standardized control sizing and tightened rail gaps for shorter landscape viewports.
- Made persistence state explicit: `Saved locally`, pulsing `Saving...`, and `Save failed`.

### Fixed

- Added viewport-oriented placement for large Print Setup/Shortcuts menus and eliminated mixed icon geometry that caused alignment drift.

## [v4.1.2] — 2026-10-20 — [`7dd740e`](https://github.com/harlequinzxc/MichiBinder/commit/7dd740e4764c7d7a685d062f9aa478b947c3f4f3)

### Improved

- Moved the detached right capsule inside the same flex parent as the live preview stage. The stage now gives up the complete padded rail zone, and the rail centers against the current preview height rather than the entire main column.
- Expanded the timeline from the sidebar boundary through the right viewport edge while retaining ownership in the right-side main tree.
- Standardized rail and bottom-controller icon frames at 32×32 and preserved the active thumbnail's red ring plus four-pixel neutral offset.

### Fixed

- Replaced Tailwind important-prefixed collapse utilities with mutually exclusive open/closed class sets. This removed residual height, padding, border, clipping, and collapse jitter.
- Ensured rail centering updates when timeline collapse changes preview height.

## [v4.2.0] — 2026-10-20 — [`51b25de`](https://github.com/harlequinzxc/MichiBinder/commit/51b25de31cb5ac8e9737b2f7ce5039ac144c52e9)

### Added

- Added the real `/icons/icon-192.png` identity mark.
- Added one Eye/Preview popover for Binder and Paper modes.
- Added one Print / PDF popover containing print scope and the actual print action.
- Added boundary-aware smooth centering for active timeline groups.

### Removed

- Removed the placeholder Lucide brand mark, separate Print Scope trigger, separate Binder/Paper rail buttons, and rail-level Duplicate action.

### Improved

- Moved Duplicate immediately left of Delete in the cohesive bottom structural controller.
- Added `timelineContainerRef` and active `data-active="true"` group identity.
- Compacted shortcut rows to keep the now-shorter vertically centered rail's large menus within the tested viewport.

## [v4.2.1] — 2026-10-20 — [`58da341`](https://github.com/harlequinzxc/MichiBinder/commit/58da341f4c28e7013ca73144e83c87e6bcd0e46a)

### Fixed

- Added `timelineRevealPageIdRef` and `data-timeline-page-id` so Add Page and Duplicate target the exact new group rather than relying only on generic active-page detection.
- Preserved the request while the timeline is collapsed and fulfilled it when reopened.
- Made rapid consecutive additions converge on the newest request while retaining ordinary active-page boundary centering.

## [v4.2.2] — 2026-10-20 — [`69ad992`](https://github.com/harlequinzxc/MichiBinder/commit/69ad99221055b7fd18c9cd12128552ef5ddcd93e)

### Added

- Added the first repository-owned `CHANGELOG.md` with a complete commit ledger, architecture memory, pitfalls, open gaps, and handoff context.

### Improved

- Synchronized package and lockfile version metadata with the then-current retrospective ledger.

## [v4.2.3] — 2026-10-20

### Improved

- Re-audited every commit and rebuilt the ledger in chronological order with strict SemVer classification.
- Reclassified the 3D engine, four-area workspace, and standalone rail transitions as major releases because each replaced a prior architectural paradigm.
- Standardized each iteration around Added, Improved, Removed, and Fixed records, embedding the engineering rationale alongside the change.
- Expanded current-state, visual-axis, drag-ingestion, print-compiler, known-gap, and incoming-engineer handoff detail.
- Advanced package and lockfile metadata to v4.2.3; runtime application behavior did not change.

## [v4.3.0] — 2026-10-20

### Added

- Added a centralized Zen Mode toggle to the far-right global header with 32×32 premium utility styling, accessible pressed state, and Lucide `Maximize2`/`Minimize2` icons through the shared 16×16 `Icon` abstraction.
- Added one root `handleToggleZenMode` coordinator: if either the source sidebar or page timeline is visible it closes both, and when both are closed it restores both.

### Improved

- Kept the independent sidebar and timeline controls intact while making their combined focus state immediately visible through exact “Enter Focus Mode” and “Exit Focus Mode” titles.
- Reused the preview stage's existing `ResizeObserver`, elastic sheet-frame transitions, and flex boundaries so reclaimed width and height enlarge the binder without moving the detached rail outside the live preview surface.
- Verified simultaneous collapse/restore, independent sidebar behavior, 16×16 icon geometry, zero-dimension closed timeline state, centered rail geometry, binder scaling, and absence of document overflow at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.3.0.

## [v4.3.1] — 2026-10-20

### Improved

- Replaced transformed/ringed active timeline groups with a dimension-neutral two-pixel inner outline, transparent border, and neutral surface so thumbnail and label grids remain physically locked.
- Standardized every right-rail dialog on the same trigger-relative `right-full`, `mr-3`, `top-0` projection; long Print Setup and Keyboard Shortcuts content now scrolls within a 40vh panel instead of switching to viewport-fixed coordinates.
- Upgraded Database, Custom, and Density metrics to the self-hosted Inter sans stack with compact uppercase headers and crisp neutral gradient values.
- Segmented History, Slot Structure, and Spread Navigation into visually distinct bottom-controller pockets with two non-interactive one-pixel dividers.

### Fixed

- Swapped the Zen Mode glyph mapping so standard view displays `Minimize2` and focused view displays `Maximize2`, while preserving the existing mode titles and state behavior.
- Removed active-thumbnail scale and ring-offset geometry that could cross the Page/Pages label line.
- Allowed trigger-relative rail panels to escape the preview band's clip boundary while retaining the main workspace boundary, preventing low-height panels from being truncated.
- Verified fixed thumbnail geometry, a two-pixel post-outline label gap, all seven absolute rail projections, bounded long-panel scrolling, Inter typography, divider placement, icon state, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.3.1.

## [v4.3.2] — 2026-10-20

### Improved

- Restored the Zen Mode glyph mapping so standard view displays `Maximize2` and focused view displays `Minimize2`, without changing the centralized panel-state behavior or titles.
- Recast the former Card material control as Card size with the exact Lucide `RulerDimensionLine` glyph on both trigger and dialog, a concise fixed title, and no redundant Card archetype caption above the accessible size selector.
- Replaced the Print setup sliders glyph with Lucide `FileSliders` and moved its trigger directly between Print / PDF and Grid selection in the rail's visual order.
- Advanced `lucide-react` from v0.468.0 to v0.525.0 to supply the requested ruler-dimension-line component while retaining the existing shared 16×16 `Icon` geometry.
- Verified glyph identity and size, Card size labeling/content, exact rail ordering, bounded Print setup geometry, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.3.2.

## [v4.3.3] — 2026-10-20

### Improved

- Enforced a three-tier sidebar hierarchy: 12px medium actions and options, 11px secondary descriptions, and 9px uppercase semibold system context, while retaining the explicitly requested 10px text-only counters.
- Standardized the Pokémon search and Card set controls at 36px tall with identical neutral surface, border, radius, padding, font size, weight, and foreground geometry; the Card set block now begins exactly 14px below search.
- Replaced red active source tabs with a restrained neutral slate surface while preserving the prior inactive treatment.
- Expanded the Michi upload capsule to 24px vertical padding, added a 20px upload glyph through the shared `Icon` abstraction, and aligned its typography and slate hairline treatment with the catalog controls.
- Rebuilt the empty Michi collection state as a centered title/subtitle feature callout and normalized visible card option names, catalog context, and descriptive copy to the tiered type scale.

### Fixed

- Removed pill chrome from TCGdex result and Your Uploads counters, leaving clean 10px Inter text-only readouts.
- Restored the `Layers` registration used by the Cards source tab after the prior Card size icon refactor removed its shared mapping.
- Verified exact input geometry, 14px form spacing, count reset styles, tab states, 20px upload geometry, empty-state content, responsive sidebar layout, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.3.3.

## [v4.3.4] — 2026-10-20

### Improved

- Replaced the opaque two-pixel selection marquee with a Figma-style one-pixel red hairline, four-percent translucent surface, one-pixel backdrop blur, restrained inset highlight, and compact transition timing.
- Reworked the centered selection-size readout as a low-profile neutral glass capsule with 9px uppercase monospaced context instead of a solid red badge.
- Added deterministic selection-overlay and badge data hooks for geometry and visual-state verification without changing merge, quick-merge, or Unmerge behavior.

### Fixed

- Prevented the Combine selection frame from visually obscuring underlying cards and pocket slots during multi-cell drags.
- Verified 2×2 marquee interaction, one-pixel frame geometry, four-percent surface opacity, blur/shadow treatment, badge typography and padding, viewport containment, document overflow, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.3.4.

## [v4.4.0] — 2026-10-20

### Added

- Added live TCGplayer market valuation from TCGdex card-detail records, using positive `market`, then `low`, then `mid` as the defensive USD price priority.
- Added a public USD-to-SGD exchange-rate request with a safe 1.35 fallback and a global SGD/USD capsule toggle beside the portfolio readout.
- Added an instance-aware Total Value capsule, active-spread value metric, and dual DPI/market-value hover badge with restrained GPU-accelerated counter feedback.

### Improved

- Persisted sanitized raw-USD prices under schema v5 and carried each TCGdex card's canonical ID through localStorage, IndexedDB, data-URL fallback, and CDN-fallback import paths so generated local asset IDs resolve after reload.
- Derived portfolio totals from all placed slot instances and spread totals from rendered anchors on active pages, keeping values synchronous across placement, movement, removal, page navigation, repricing, and currency changes.
- Hydrated card-detail pricing for queried catalogue results and saved TCGdex assets while deduplicating in-flight requests per canonical card ID.
- Verified exchange conversion, positive-market and low-price fallback selection, schema-v5 persistence, canonical metadata, top-bar ordering, responsive containment, hover values, page navigation, removal updates, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.4.0.

## [v4.4.1] — 2026-10-20

### Fixed

- Corrected TCGplayer extraction for the live TCGdex card-detail schema, where prices are grouped by print variant and use `marketPrice`, `lowPrice`, and `midPrice` rather than only top-level `market`, `low`, and `mid` fields.
- Preserved the requested positive market → low → mid priority across normal, holofoil, reverse-holofoil, first-edition, and unlimited variant keys, including the naming variants currently documented by TCGdex.
- Added a compatibility migration that recovers canonical TCGdex IDs from legacy imported filenames and validated CDN paths, allowing eligible cards imported before schema v5 to hydrate prices after reload.
- Reverified nested market selection, nested low fallback, legacy-ID migration, persisted raw USD values, currency switching, portfolio/spread totals, removal updates, hover values, responsive containment, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.4.1.

## [v4.5.0] — 2026-10-20

### Added

- Added pointer-relative 3D physics to placed cards using local `--rx`, `--ry`, `--mx`, and `--my` channels, a 600px perspective, 12-degree rotational range, 3D scale, and deterministic pointer-leave reset without React render churn.
- Added a cursor-tracking radial specular sheen on card sleeves, with composited opacity and transform transitions isolated through GPU layers and `will-change` hints.
- Added a staggered 25ms catalogue entrance track so asynchronous TCGdex result batches fade and rise into the grid instead of appearing abruptly.

### Improved

- Reweighted physical page turns to a 500ms `cubic-bezier(0.25, 1, 0.5, 1)` deceleration curve and separated both face surfaces by 0.8px to reduce midpoint flicker.
- Reworked the timeline drawer into a 300ms elastic height, opacity, padding, and translated-rest transition while preserving literal zero-height, zero-padding collapsed geometry.
- Added 100ms GPU-backed 0.93 active compression to shared ToolButton, RailButton, and floating navigation controls.
- Preserved crop repositioning, marquee selection, drag/drop, market-value badges, page ownership, and reduced-motion behavior while introducing the new pointer and compositing paths.
- Verified exact tilt coordinates, baseline reset, sheen response, page-face transforms, timeline states, button feedback classes, catalogue stagger/final visibility, valuation behavior, sidebar and selection regressions, viewport containment, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.5.0.

## [v4.5.1] — 2026-10-20

### Fixed

- Split placed cards into a flat outer pointer-tracking wrapper and an inner GPU-rendered hull so cursor normalization always reads invariant slot bounds instead of a box already distorted by its own perspective transform.
- Tuned the moving hull to a 0.98 3D scale, creating a clean micro-inset that protects tilted edges from clipping while keeping slot geometry and action overlays stationary.
- Forced crop-edit mode to zero both rotational channels while retaining the inset hull, preserving reposition controls and pointer ownership.
- Replaced catalogue entrance animation fill-state dependence with a two-frame transition and a deterministic settled-state fallback, preventing search cards from remaining permanently transparent when a browser defers an offscreen animation timeline.
- Extended TCGdex extraction to inspect `variants_detailed`/`variantsDetailed` pricing when the card-level `pricing.tcgplayer` provider is null, without treating genuinely unavailable provider data as a fabricated value.
- Verified stable outer geometry, exact pointer vectors, inner-only transforms, 0.98 edit transforms, sheen/reset behavior, catalogue final visibility without forced animation completion, detailed-variant price fallback, valuation badges, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.5.1.

## [v4.6.0] — 2026-10-20

### Added

- Added Cardmarket as a real-value fallback when TCGdex has no positive TCGplayer market, low, or mid price, scanning both card-level and `variants_detailed`/`variantsDetailed` provider data.
- Added Cardmarket priority selection across positive trend, average, and low EUR values, with normal-versus-holo preference aligned to the card's declared variants.
- Extended the existing USD exchange-rate request to read `rates.EUR` and convert Cardmarket EUR amounts into canonical persisted USD before the established optional SGD display conversion.
- Cached raw Cardmarket EUR quotes so fallback prices are recalculated when the live EUR-per-USD rate arrives; a static 0.92 EUR-per-USD default covers the interval before a successful rate response.

### Preserved and verified

- Kept positive TCGplayer market → low → mid as the primary source, prevented non-positive provider data from fabricating a value, and retained canonical `cardPrices[tcgdexId]` persistence.
- Verified Cardmarket fallback from detailed variants, live EUR-to-USD conversion, Total Value, Spread Value, placed-card badges, deduplicated detail requests, persistence, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.6.0.

## [v4.6.1] — 2026-10-20

### Fixed

- Added explicit top spacing to the catalogue metadata and Clear Filters row so it no longer crowds the Card Set selector frame.
- Raised the uppercase Card Set label from muted neutral-500 semibold text to neutral-400 bold text with the established compact sans-serif tracking, improving contrast against the dark sidebar.
- Advanced package and lockfile metadata to v4.6.1.

## [v4.6.2] — 2026-10-20

### Fixed

- Hid the app-bar Total Value until every placed TCGdex-backed card contributing to the portfolio has a positive retrieved or persisted price, preventing incomplete totals and `$0.00` placeholders.
- Hid the active Spread Value and its separator when the visible spread has no complete positive valuation, including removal from the workspace metrics accessibility label.
- Omitted unavailable per-card market values from placed-card hover details while preserving the useful effective-DPI readout.
- Preserved the established USD/SGD display conversion and full Total Value, Spread Value, and card-value presentation whenever complete positive pricing is available.
- Verified both successful Cardmarket/TCGplayer valuation and provider-null unavailable-pricing behavior at 1600×1000, 1366×768, and 1200×700 with zero browser errors.
- Advanced package and lockfile metadata to v4.6.2.

## [v4.6.3] — 2026-10-20

### Fixed

- Standardized the TCGdex results viewport on the requested `scroll-area`, two-column grid, contained vertical-overflow, and scrollbar-suppression utility sequence.
- Added an explicit unlayered `scrollbar-none` implementation for Firefox, Chromium, and WebKit so the global compact-scrollbar rule cannot override hidden-scrollbar catalogue viewports; native wheel, trackpad, touch, and overscroll behavior remains intact.
- Standardized the custom-upload viewport on the same two-column, `gap-3`, padded, rounded, subtly bordered scroll capsule and updated its empty state to span the two-column grid.
- Normalized visible workspace metrics to uppercase `DATABASE`, `ITEMS`, `CUSTOM`, `UPLOADED`, `DENSITY`, `FILLED`, and `SPREAD VALUE` strings without changing their high-contrast gradient styling.
- Verified both catalogue viewports compute `scrollbar-width: none`, a hidden zero-width WebKit scrollbar, and native `overflow-y: auto`, and confirmed uppercase metrics plus valuation behavior at 1600×1000, 1366×768, and 1200×700 with zero browser errors.
- Advanced package and lockfile metadata to v4.6.3.

## [v4.6.4] — 2026-10-20

### Fixed

- Hid the USD/SGD currency converter unless every placed TCGdex-backed card contributing to the portfolio has a positive retrieved or persisted price, matching the existing Total Value completeness gate.
- Preserved converter access and currency switching whenever the portfolio has a complete positive valuation.
- Verified complete-price and provider-null visibility behavior at 1600×1000, 1366×768, and 1200×700 with zero browser errors.
- Advanced package and lockfile metadata to v4.6.4.

## [v4.6.5] — 2026-10-20

### Fixed

- Locked the preview surface and its canvas stage to hidden overflow beneath the already-contained `data-dynamic-workspace` shell, eliminating native workspace scrollbars caused by nested micro-overflow.
- Retained the identical two-column, `gap-3`, padded scroll capsule for both Cards and Michi tabs while preserving native scrolling inside the asset lists.
- Changed custom-upload cards from the approximate `2.5/3.5` frame to the exact TCGdex `245/337` aspect ratio and standardized their images on `object-contain` presentation.
- Verified hidden overflow on the workspace, preview surface, and canvas stage; exact viewport-sized document bounds; twelve-card custom-grid rendering; exact card ratio; contained image fit; hidden asset-list scrollbars; and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.6.5.

## [v4.6.6] — 2026-10-20

### Fixed

- Force-verified the Michi asset viewport uses the exact Cards-tab two-column wrapper with no custom inline style or legacy three-column/short-height override.
- Retained the exact `aspect-[245/337]` custom-card frame and replaced custom-only full-height/dimming image classes with the precise catalogue image string: `w-full h-auto object-contain bg-neutral-950 transition-opacity duration-200`.
- Verified the exact wrapper and image class strings, twelve-card rendering, 245/337 geometry, contained image fit, hidden catalogue scrollbars, canvas containment, viewport-sized document bounds, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.6.6.

## [v4.6.7] — 2026-10-20

### Fixed

- Confirmed the Michi branch has one master two-column scroll grid directly wrapping every `customCards.map(...)` item, with no nested grid or custom height override.
- Restored the placed-card image indicator through `opacity-45 grayscale group-hover/local:opacity-75` while retaining the catalogue-aligned `w-full h-auto object-contain bg-neutral-950 transition-all duration-200` base.
- Verified twelve custom cards remain direct children of the sole grid, exact 245/337 geometry, 0.45 placed opacity, grayscale filtering, unmodified unplaced presentation, canvas containment, hidden list scrollbars, viewport-sized document bounds, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.6.7.

---

## Current architecture and engineering rationale

### Repository shape

- `src/main.jsx` mounts `CardBinder` under React `StrictMode` and registers `/sw.js` only for production builds.
- `src/CardBinder.jsx` deliberately contains almost all product logic and UI. This minimized dependency and abstraction overhead during rapid product formation, but its size is now the primary maintenance risk.
- `src/index.css` owns global/print styles and physical animation cues that are awkward to express as local utility strings.
- Tailwind v4 runs through the Vite plugin; there is no separate Tailwind config.
- The app is JavaScript/JSX only. No state, drag, component, print, or persistence library is present.

### Physical page model

- Every page has `id`, `sectionName`, `merges`, `slots`, `crops`, `sheetId`, `face`, and normalized order.
- Every sheet has exactly two faces. `normalizePhysicalPages` repairs old/odd data instead of rejecting it, which is why persistence remained backward compatible across the physical-sheet migration.
- `binderViewGroups` renders the first and last pages as boundary covers and pairs interior pages. `pageSide`, navigation, thumbnails, and page-turn planning all depend on that same grouping.
- Add Page inserts a two-page sheet before the final boundary. Duplicate clones the active sheet with new page/sheet/merge IDs. Delete removes an entire sheet. Reset creates four pages/two sheets.
- The cover model, even-page invariant, and insertion index are coupled. A change that treats a face as an independent page can corrupt duplex ownership without throwing an immediate error.

### Grid, merge, and hidden assignment model

- Supported grids are 2×2, 3×3, and 4×3. Slot identity is `row-col`; a merged frame stores content at its top-left anchor.
- Persisted merges are sanitized to a maximum 3×4 domain. Invalid, overlapping, out-of-range, or one-cell merges are discarded.
- Changing density can make old slot keys non-renderable. `hiddenAssignments` preserves those cards; layout-choice/reflow paths decide whether and how to move them. They are not silently deleted.
- Combine-mode selection uses a dimension-neutral one-pixel wireframe with four-percent red translucency and a neutral glass size badge, preserving the visibility of cards and slots beneath the marquee.
- The live preview and print tree share sanitized data but use different presentation and pagination paths.

### 3D rotation axis and page-turn engine

- The workspace perspective is fixed at 1200px and the current spine gap is `gap-4`.
- The turning sheet is pinned to the center line with direction-specific left/right origins. Forward and backward rotations have opposite signs, while the reverse face starts at ±180 degrees.
- A turn plan stores front face ID, back face ID, stable left/right base page IDs, direction, and boundary type. IDs—not array positions—keep the animation coherent while insertion or duplication changes page arrays.
- The 500ms turn uses a weighted `cubic-bezier(0.25, 1, 0.5, 1)` track. Both front and reverse canvases use 0.8px `translateZ` separation, backface visibility, a two-pixel edge, face shading, and cast shadow without altering width, origin, or grid-column geometry.
- Placed cards use a flat outer tracking wrapper and a 0.98-scale inner 3D hull. The outer layer updates local tilt/specular CSS variables from invariant pointer coordinates without React state; the inner layer alone consumes perspective transforms, resets on leave/cancel, and locks rotation to zero during crop editing.
- Tokenized timers cancel superseded turns. Without token checks, rapid navigation can let an old 40ms/560ms callback overwrite a newer animation.
- The spread clip deliberately opens beyond its nominal width during animation; ordinary state uses normal clipping to prevent horizontal workspace overflow.

### React state versus synchronous interaction refs

- React state drives rendering, while refs (`pagesRef`, `currentPageRef`, drag/edit/marquee refs, timer refs, and timeline reveal ref) are authoritative inside native events and timers.
- This split exists because multiple drag/drop, pointer, or page-add events can occur before React commits a render. Reading a closed-over state array in those paths can place cards twice, insert against an old page count, or clear the wrong drag payload.
- `applyCanvasChange` writes refs synchronously, then React state, then history. The order is intentional.
- `selectedCardIds` is the shared source of truth for Cards and Michi; array order is placement order. Shift selection constructs contiguous source order, and Ctrl/Command preserves prior IDs.

### High-frequency drag/drop ingestion

- Native drag payload kinds are `pool`, `remote`, `remote-batch`, and `slot`; file drops are identified from `DataTransfer.types`.
- `dragRef.current` remains authoritative because some browsers do not preserve custom MIME data reliably for in-app drags.
- Async remote batch import uses ordered card arrays; `Promise.all` preserves input order before consecutive placement.
- Drop handlers snapshot `FileList`/payload data and reset visual drag state before awaiting IndexedDB, file reads, or remote downloads. This prevents a later native `dragend` from clearing state belonging to a newer drag.
- Slot-action timing guards prevent Remove/Unmerge controls from also starting a marquee, card drag, or double-click reposition.
- Native drag targets are DOM-highlighted rather than kept as a high-frequency React array; this avoids render-cycle lag during pointer movement.

### Sidebar source and typography system

- Cards and Michi share `selectedCardIds` but keep independent source semantics. Their active tabs use a neutral slate surface; inactive tabs remain muted until hover.
- Sidebar typography follows three semantic tiers: 12px medium actions/options, 11px secondary descriptions, and 9px uppercase semibold system context. TCGdex and upload counters are deliberate 10px text-only readout exceptions.
- Search and Card set controls share a 36px height, neutral-950 surface, six-percent white border, six-pixel radius, 12px horizontal padding, six-pixel vertical padding, and 12px medium foreground. The set block sits 14px below search.
- Michi's upload capsule uses a 20px Lucide upload glyph, 24px vertical padding, and neutral hairline hover treatment. Its zero-asset state is a three-column centered feature callout rather than an unstructured sentence.

### Timeline, rail, and viewport boundaries

- The header is 48px tall and owns identity, sidebar toggle, save state, and the centralized Zen Mode toggle.
- The source sidebar consumes width when open; the right-side main tree receives the remainder.
- The preview surface is one flex row containing the scrollable stage and detached rail. The stage stops at the rail's left edge, including the rail padding zone; the surface permits overflow so rail dialogs can overlay lower workspace bands while the main workspace remains the outer clip boundary.
- The rail has no full-height edge divider and no `self-start`; its outer box is vertically centered against the **live preview surface**, not the complete main column. Collapsing the timeline changes preview height, so the rail's vertical center moves.
- The rail begins with Print / PDF, Print setup, then Grid selection. Print setup uses `FileSliders`; Card size uses `RulerDimensionLine` and exposes its selector without a redundant archetype caption.
- Every rail dialog is absolutely anchored at `right-full mr-3 top-0` relative to its trigger. Panels cap at 40vh and scroll internally when their content is longer.
- Database/Custom/Density is absolutely anchored to the preview bottom edge. It uses the self-hosted Inter sans stack and is not part of the timeline or bottom controller flow.
- The bottom controller owns Undo/Redo, Merge/Unmerge/reset/clear, spread navigation, Add, Duplicate, Delete, and timeline toggle. One-pixel dividers separate its History, Slot Structure, and Spread Navigation pockets.
- The timeline is a sibling below the preview/controller inside the right-side main tree. Its 300ms elastic slide/fade transitions height, opacity, and padding; collapsed geometry still resolves to zero height, padding, and border so the preview reclaims the full band.
- Active groups use `data-active="true"` and a dimension-neutral two-pixel shadow outline without scale or ring offset. Add/Duplicate use a requested page ID and then call `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })` on its containing group.

### Persistence and history

- `localStorage` key: `digital-card-binder:v1`.
- Persisted schema: version `5`. Data claiming a newer schema falls back to a clean binder rather than being partially interpreted.
- Schema v5 stores a sanitized canonical-ID-to-raw-USD `cardPrices` map and preserves `tcgdexId` on generated local pool assets.
- IndexedDB: database `digital-card-binder`, store `images`, version `1`.
- IndexedDB is preferred for blobs and now carries canonical TCGdex IDs alongside remote card blobs. Fallback records store data URLs and the same canonical metadata in the local payload.
- Object URLs are tracked and revoked during reconciliation, deletion, reset, and unmount paths.
- Undo/Redo is a 30-entry **canvas** history containing pages, active page, and layout. It intentionally excludes pool deletion/import, catalogue state, print scope, and most settings.
- Save status is brief and asynchronous: `Saving...` appears only during persistence work, then returns to `Saved locally`; failure remains visible as `Save failed`.

### TCGdex contract

- API base: `https://api.tcgdex.net/v2/en`; asset host: `https://assets.tcgdex.net`.
- Card list records provide `id`, `localId`, `name`, and an extensionless image base. The UI appends `/low.jpg`; import appends `/high.jpg`.
- Queried and persisted TCGdex cards hydrate `/cards/{id}` detail records. Raw USD selection accepts only positive values, prioritizing market → low → mid across direct `pricing.tcgplayer`, print-variant records such as `normal.marketPrice`, and `variants_detailed` pricing when the root provider is null.
- Set lists are normalized and sorted newest-first where release dates exist. Full set fetches provide the card list used by local infinite pagination.
- Search is debounced and abortable. Pages append 40 normalized records at a time; new result wrappers use a 300ms fade/rise animation staggered by 25ms per result, and detail-price requests are deduplicated by canonical card ID.
- Only the TCGdex asset origin is accepted when normalizing absolute card-image bases.
- If high-resolution fetch succeeds, the blob becomes a local asset. If browser privacy/CORS policy blocks it, the validated CDN URL remains the persisted fallback.
- `https://open.er-api.com/v6/latest/USD` supplies the optional live SGD rate. Invalid or unavailable responses retain the local 1.35 fallback; raw persisted card prices remain USD.

### Print compiler state

- Measurements enter the UI in millimetres and are converted to inches (`1 / 25.4`) for CSS print math.
- Print-fit uses a 0.125-inch safe margin and supports A4, Letter, A3, and Tabloid.
- `all` scope preserves binder page placement, valid cards, crops, and optional empty-page skipping.
- `custom` scope is **implemented**, not unfinished. `compactCustomPrintPages` gathers private upload instances, orders them by source page/slot, strips merges, repacks sequentially at current grid capacity, auto-paginates overflow, carries non-centered crops, and builds temporary front/back sheet identities for printing.
- The custom compiler does not mutate the live binder and intentionally does not preserve section names or merge geometry; it is a compact print-only projection.
- Browser print settings remain outside application control. Correct output requires matching paper, margins None, scale 100%, and Background graphics enabled; browser “Fit to page” breaks physical size.

### PWA and deployment

- Production-only service-worker registration keeps development HMR out of cache behavior.
- `card-binder-v3` precaches shell assets and handles navigation network-first; same-origin assets use cached response with background refresh.
- Vercel routes the SPA to `index.html`, prevents long caching for the service worker/manifest, and marks hashed `/assets` immutable.
- The application has no server process in production and no required deployment settings beyond the repository config.

## Known issues, limitations, and visual quirks

1. **No committed automated test suite or CI.** Validation has been `npm run build` plus external Chromium harnesses, so regressions are not automatically blocked.
2. **No export/import or cloud backup.** Clearing site data, losing a profile, or changing devices loses local work.
3. **Desktop landscape is the product boundary.** A portrait guard exists; geometry was validated down to 1200×700, not as a small-screen editor.
4. **Cross-browser confidence is incomplete.** Recent testing used Chromium. Safari/Firefox print scaling, PWA install behavior, vertical range input, and native drag/drop have not received equivalent automated coverage.
5. **Market data is an online dependency.** TCGdex search/detail data and CDN-only fallback art are unavailable offline until cached locally; exchange failure is non-blocking because SGD conversion retains the 1.35 fallback.
6. **Browser printing is partly manual.** The app cannot force paper, margin, scale, duplex, or background settings.
7. **Service-worker cache growth is unbounded.** `card-binder-v3` has no per-entry eviction, so old hashed assets remain until the cache name changes or site data is cleared.
8. **`CardBinder.jsx` is highly coupled.** Broad rewrites can cross persistence, printing, drag state, physical ownership, and layout geometry even when the request appears visual.
9. **README has small UI drift.** Its workspace table still assigns sizing/preview/print controls to the top utility bar; those controls now live in the right rail and Print / PDF menu.
10. **Large smooth-scroll jumps are not instantaneous.** Headless Chromium sometimes needed several seconds to settle after many rapid additions; the final target remained correct.
11. **Long rail dialogs scroll internally.** Print Setup and Keyboard Shortcuts cap at 40vh to preserve uniform trigger-relative anchoring; their lower content is not visible all at once on short landscape viewports.
12. **Custom compact print is intentionally lossy.** It preserves private images/crops, not live page labels or merged frames. That is current behavior, not an unfinished pagination loop.

## Historical dead ends and pitfalls

- Tailwind v4 did not reliably emit/apply important-prefixed collapse utilities such as `!h-0`; mutually exclusive class composition fixed the timeline.
- Measuring popovers while `animate-scaleIn` is active returns intermediate geometry (historically around 60% width). Geometry tests finished animations first.
- Trigger and dialog controls can share accessible names; browser automation scoped by dialog and role to avoid ambiguous selectors.
- `Saving...` can be missed by slow polling because the persistence transition is intentionally brief.
- The agent environment blocked live TCGdex hosts, so browser tests mocked official schema responses. Production behavior was validated against documented endpoint shapes and defensive normalizers.
- The working external browser setup used Playwright Core plus Sparticuz Chromium and required `/tmp/al2023/lib` in `LD_LIBRARY_PATH`; those files were not committed and may not exist in a fresh environment.
- Sparticuz single-process browser runs were more stable sequentially than in parallel.
- TCGdex image fields are extensionless bases, not complete files. Failing to append `/low.jpg` or `/high.jpg` produces broken images.
- Hydrating raw persisted JSON without `sanitizeSettings`, `sanitizePage`, and `normalizePhysicalPages` would discard compatibility and can create overlapping merges or orphan sheet faces.
- The print tree and live preview share data, not markup. Screen-only fixes do not prove print output, and print-only styles do not prove live geometry.
- Python Pillow and the shell `file` utility were unavailable in the prior agent environment; ImageMagick `identify` was used for image inspection when necessary.

## Unfinished work and intentional boundaries

- A repository-owned unit/integration/browser test system remains unbuilt. Highest-value coverage is physical-sheet normalization, binder grouping, merge sanitation, placement overflow, persistence migration, custom print compaction, page-turn plans, and timeline reveal.
- Export/import backup remains unimplemented.
- Cross-browser print calibration and installed-PWA lifecycle testing remain manual.
- README's workspace/control description has not yet been brought in line with the latest rail menus.
- Historical SemVer labels are not Git tags or GitHub Releases. Commit links remain the release evidence.
- There is no account, cloud sync, collaboration, telemetry, backend, or environment-secret layer. Those are deliberate scope boundaries, not half-built modules.
- No active functional workspace task was open when v4.2.3 was recorded.

## Incoming engineer hand-off brief

The current application is stable because several boundaries agree with one another. The most important context before changing code is:

- **Treat sheets as the structural unit.** A page face is not independently owned. Add, duplicate, delete, navigation, covers, and print identity all depend on front/back pairing.
- **Treat the spine as a geometry contract.** The spread is two equal frame widths plus `gap-4`, under 1200px perspective. The page-turn origin sits on that center axis; decorative depth must not move it.
- **Treat refs as part of the state engine.** Native drag/pointer/timer callbacks depend on synchronous refs because React state can be one render behind during burst input.
- **Treat the preview, controller, and timeline as separate vertical bands.** The rail belongs inside the preview flex row; the status row is absolutely inside preview; the controller and timeline are siblings below it. Moving the rail outside that row reintroduces width mismatch and timeline gaps.
- **Treat collapsed timeline dimensions literally.** Closed means zero height, padding, and border. Any residual box prevents the preview from consuming released height and shifts rail centering.
- **Treat `selectedCardIds` order as user intent.** Batch import and placement use that order across Cards and Michi.
- **Treat persistence sanitizers as migrations.** They are not optional validation helpers; they are the compatibility boundary for saved binders.
- **Treat print as a second renderer.** Verify all-scope and custom-scope output independently from live Binder/Paper preview.
- **Treat TCGdex card images as trusted-host extensionless bases.** Preserve low/high suffix behavior and fallback storage semantics.
- **Treat all Lucide output as 16×16 and all rail/bottom icon frames as 32×32.** Mixed geometry was a prior source of drift.
- **Treat existing `data-*` hooks as both product and validation interfaces.** Timeline auto-reveal uses them at runtime; external browser checks use many others for deterministic geometry.

The practical baseline before a new visual or interaction round is a clean production build plus browser checks for page ownership, Add/Duplicate/Delete, Merge/Unmerge and history, drag batches, timeline open/closed geometry, rail centering, popover clipping, persistence status, and both print scopes. This describes the current risk surface; it does not impose a separate workflow policy.
