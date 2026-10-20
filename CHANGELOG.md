# CHANGELOG — MichiBinder Project Memory

This file is the project's historical and technical memory. It records what was built and why, the decisions that shaped the current implementation, known limitations and pitfalls, unfinished work, and the state a future maintainer inherits. It describes history and state; it is not a second set of project rules.

## Current snapshot — v1.20.2

- **Date:** 2026-10-20
- **Application release before this documentation round:** v1.20.1 at commit `58da341`
- **Runtime:** static, client-only React 19 PWA built with Vite 6 and Tailwind CSS v4 through `@tailwindcss/vite`
- **Runtime dependencies:** `react`, `react-dom`, and `lucide-react`
- **Primary implementation:** `src/CardBinder.jsx`; the application intentionally remains mostly self-contained in this file
- **Supporting UI/print styles:** `src/index.css`
- **Persistence:** layout metadata in `localStorage`; image blobs in IndexedDB with a data-URL/local-storage fallback
- **Remote data:** TCGdex REST API and asset CDN for the Cards catalogue; no application backend or required environment variables
- **Deployment:** static `dist/` output on Vercel, configured by `vercel.json`
- **Latest validation:** `npm run build` passed with 1,579 transformed modules. Chromium browser checks passed for the logo, menus, print scope, Binder/Paper preview switching, 32×32 controls, 16×16 Lucide icons, uploads, batch placement, duplication, Merge/Unmerge, Undo/Redo, timeline collapse, and timeline reveal after Add Page or Duplicate Page. Responsive checks covered 1600×1000, 1366×768, and 1200×700.
- **Active implementation work:** none known at the time this file was created.

## Retrospective Semantic Version ledger

The repository originally kept `package.json` at `1.0.0` and did not create Git tags for each round. The versions below are retrospective SemVer labels assigned from the actual commit history, beginning with v1.0.0 as requested. Package metadata was first brought forward to the ledger's current version in v1.20.2.

The classification used here is:

- **MAJOR:** an intentionally incompatible persisted-data, deployment, or user contract change. No post-1.0 commit required one because migrations and compatibility paths were retained.
- **MINOR:** a backward-compatible user capability or substantial workspace mode added.
- **PATCH:** a compatible fix, visual refinement, asset update, documentation update, or hardening pass.

No historical Git tags were added by this documentation round; commit hashes remain the source-of-truth links for the earlier rounds.

---

## [v1.20.2] — 2026-10-20

### Added

- Created this `CHANGELOG.md` as the consolidated history, architecture record, issue ledger, and handoff state.

### Changed

- Aligned `package.json` and `package-lock.json` with the retrospective current release version.

### Why

- The project had extensive implementation history in Git and conversation context but no durable in-repository handoff record.

## [v1.20.1] — 2026-10-20 — [`58da341`](https://github.com/harlequinzxc/MichiBinder/commit/58da341f4c28e7013ca73144e83c87e6bcd0e46a)

### Fixed

- Made Add Page and Duplicate Physical Sheet explicitly remember the ID of the newly created page.
- Added stable timeline page IDs and used the requested page's thumbnail group as the smooth-scroll target.
- Preserved a reveal request while the timeline is collapsed so the new group is shown when the timeline reopens.

### Why

- Generic active-page centering was not sufficiently deterministic for newly inserted or duplicated sheets in long timelines.

## [v1.20.0] — 2026-10-20 — [`51b25de`](https://github.com/harlequinzxc/MichiBinder/commit/51b25de31cb5ac8e9737b2f7ce5039ac144c52e9)

### Added

- Added boundary-aware smooth centering for the active timeline group.
- Added a single Eye/Preview menu exposing Binder and Paper modes.
- Added a unified Print / PDF menu containing print scope and the print-dialog action.
- Added the real local MichiBinder logo at `/icons/icon-192.png` to the header.

### Changed

- Moved Duplicate Physical Sheet from the right rail to immediately left of Delete in the bottom controller.
- Marked the active timeline group with `data-active="true"` and attached a timeline container ref.
- Compacted the shortcuts menu so rail popovers remain visible at shorter tested viewport heights.

### Why

- The rail had accumulated related actions as separate buttons. Consolidating print and preview reduced rail density while moving structural page editing into one bottom controller.

## [v1.19.3] — 2026-10-20 — [`7dd740e`](https://github.com/harlequinzxc/MichiBinder/commit/7dd740e4764c7d7a685d062f9aa478b947c3f4f3)

### Changed

- Put the utility rail inside the same preview-surface flex tree as the binder stage so the stage excludes the rail's padded width.
- Expanded the timeline through the right viewport edge while keeping it under the dynamic workspace rather than under the sidebar.
- Vertically centered the detached rail against the live preview surface and let it recenter when the timeline collapses.
- Standardized right-rail and bottom-controller frames at 32×32 and retained the four-pixel active-thumbnail ring offset.
- Added a temporary Lucide brand mark, replaced by the local logo in v1.20.0.

### Fixed

- Replaced ineffective Tailwind important-prefixed collapse classes with conditionally composed open/closed class sets, eliminating residual timeline padding and border.

## [v1.19.2] — 2026-10-20 — [`576a4ac`](https://github.com/harlequinzxc/MichiBinder/commit/576a4ac5eb6694b32752e4e34c38dc1bff610006)

### Changed

- Centralized Lucide rendering so every icon is exactly 16×16 and size utilities passed by callers cannot override it.
- Standardized control sizing and tightened rail spacing for short landscape viewports.
- Made the header persistence status reactive: `Saved locally`, pulsing `Saving...`, and `Save failed`.
- Added viewport-oriented placement for the larger Print Setup and Keyboard Shortcuts popovers.

### Why

- Mixed icon sizes and control frames were causing visible inconsistency and made geometry validation unreliable.

## [v1.19.1] — 2026-10-20 — [`0727608`](https://github.com/harlequinzxc/MichiBinder/commit/0727608cfd5a48493d15744c2b03f73cf9a3e397)

### Changed

- Replaced the dock-like right edge with a detached rounded utility capsule.
- Converted rail settings into consistent left-projecting dark-glass popovers with dialog semantics and `aria-expanded`/`aria-haspopup` state.
- Consolidated grid choice, print scope, scale, card material, print setup, and shortcuts into compact menus.
- Reworked shortcuts into compact rows suitable for the narrow `w-56` popover.

### Why

- The first rail implementation consumed too much horizontal space and presented inconsistent panel geometry.

## [v1.19.0] — 2026-10-20 — [`268aac6`](https://github.com/harlequinzxc/MichiBinder/commit/268aac6a756c45a5e4fc1fd822d82f8e7fca829f)

### Added

- Added persisted per-page section names with editable labels in Binder and Paper previews.
- Introduced the right-side control rail for layout, preview, scale, card material, printing, duplication, shortcuts, and installation.

### Changed

- Simplified the top bar to identity, sidebar control, and local-engine status.
- Polished binder rings, sheet surfaces, boundary covers, workspace metrics, and paper shadows.
- Corrected collapsed timeline `inert` handling.

### Why

- Configuration controls had outgrown the header; the rail made the workspace more focused and created room for page labels and material depth.

## [v1.18.0] — 2026-10-20 — [`7c18131`](https://github.com/harlequinzxc/MichiBinder/commit/7c181310e21ac2f303b7fb9784de251087df0095)

### Added

- Unified Cards and Michi selection under state named `selectedCardIds`.
- Added Shift-range and Ctrl/Command-toggle selection to TCGdex results as well as local cards.
- Added remote batch drag/import and consecutive multi-card placement across pages.
- Added ordered selection badges and shared drag feedback for local and remote batches.

### Changed

- Docked the timeline to the dynamic workspace so it no longer clips beneath the sidebar.
- Added horizontal overscroll containment and stable minimum content width.

## [v1.17.0] — 2026-10-20 — [`d0b6350`](https://github.com/harlequinzxc/MichiBinder/commit/d0b6350944357efcfc2c0bf3c15c9613c57a8b04)

### Added

- Restored a collapsible bottom page timeline with spread-group thumbnails, direct page switching, page drops, and page insertion.
- Added the timeline toggle to the grounded control bar.
- Established tab IDs `cards` and `michi`.

### Changed

- Returned Database/Custom/Density metrics to an absolute row at the bottom of the preview viewport.

## [v1.16.0] — 2026-10-20 — [`11c6eb8`](https://github.com/harlequinzxc/MichiBinder/commit/11c6eb82f4bcab6001fc6760e20e6f156e4eb65d)

### Added

- Made the workspace fluidly resize when the sidebar opens and closes.
- Converted the floating navigator into a grounded full-width bottom control track with horizontal overflow protection.

### Changed

- Integrated Database, Custom, and Density counts into the control track during this layout stage; they later returned to the preview surface in v1.17.0.

## [v1.15.0] — 2026-10-20 — [`9c0c2ec`](https://github.com/harlequinzxc/MichiBinder/commit/9c0c2ecaf259691983684cf608271cf21b2e835d)

### Changed

- Rewrote the desktop workspace into four primary areas: top utility bar, collapsible source sidebar, dynamic preview, and bottom controls.
- Moved Merge/Unmerge, reset, clear-page, history, and spread controls into one bottom navigation surface.
- Added the sidebar toggle to the header and removed the separate canvas toolbar/status footer.

### Why

- The preceding layout had controls split across too many independent toolbars and overlays.

## [v1.14.0] — 2026-10-20 — [`9e159bf`](https://github.com/harlequinzxc/MichiBinder/commit/9e159bfb667dff6cb00deedd2672bea097adaadd)

### Added

- Added a floating navigator for Undo, Redo, previous/next spread, Add Spread, and Delete Sheet.
- Added native drag-target highlighting via slot data attributes.

### Changed

- Removed page navigation and destructive page actions from the crowded header.
- Hardened drag cleanup so browser drop/end events do not leave stale visual state.

## [v1.13.0] — 2026-10-19 — [`75c3f59`](https://github.com/harlequinzxc/MichiBinder/commit/75c3f59c0e7afb716a5b2e8dc3955632038b496a)

### Added

- Replaced manual TCGdex result paging with infinite scrolling.
- Added loading-more and end-of-catalog states, near-bottom scroll locking, filter reset, and append-mode fetches.

### Why

- Catalogue browsing needed to remain continuous for large sets and search results.

## [v1.12.0] — 2026-10-19 — [`57ada8c`](https://github.com/harlequinzxc/MichiBinder/commit/57ada8c0faead71786a97c65b4d6a54438e4a4b0)

### Added

- Added compact custom-upload-only print compilation, repacking private uploads into consecutive printable slots.
- Added Database, Custom, and Density workspace metrics.

### Changed

- Rebranded the product and metadata from Digital Card Binder to MichiBinder.
- Updated README, document metadata, manifest text, notifications, portrait guard, and sidebar terminology.
- Refined the page tray and active thumbnail framing.

## [v1.11.0] — 2026-10-19 — [`536ee2d`](https://github.com/harlequinzxc/MichiBinder/commit/536ee2dd4a9de9f51f22acb3326043fab019a3e3)

### Added

- Renamed the source tabs to Cards and Michi and added Lucide icons to both.
- Added collapse/expand behavior for the page navigator.

### Changed

- Simplified sidebar filters and custom-card actions.
- Standardized source tab identities that remain `cards` and `michi` in the current application.

## [v1.10.0] — 2026-10-19 — [`78d500d`](https://github.com/harlequinzxc/MichiBinder/commit/78d500d55830fddd7b2002d325b5e01dacde0aa3)

### Added

- Added separate public-catalogue and private-upload workspaces in the sidebar.
- Added local upload cards with source badges, shared selection behavior, custom drag payloads, and private-asset controls.
- Preserved source metadata (`tcgdex` versus `upload`) in IndexedDB and fallback persistence.

### Why

- Remote catalogue browsing and private user art needed distinct but interoperable workflows.

## [v1.9.1] — 2026-10-19 — [`41a802b`](https://github.com/harlequinzxc/MichiBinder/commit/41a802b6345e0c5de9ac6a4e8216363640604756)

### Fixed

- Raised the Print Setup popover stacking level so it renders above workspace surfaces.

## [v1.9.0] — 2026-10-19 — [`71a8295`](https://github.com/harlequinzxc/MichiBinder/commit/71a82950b7e1ddaec308100e50944ca84654f990)

### Added

- Added print scope state for all cards versus user uploads only.
- Tagged imported records by source so print filtering and storage reconciliation can distinguish TCGdex assets from private uploads.

### Changed

- Refined workspace spacing, preview materials, active timeline framing, and print-empty-state messaging.

## [v1.8.0] — 2026-10-19 — [`849a14b`](https://github.com/harlequinzxc/MichiBinder/commit/849a14bbe6a4b1a1a6e5d99158e0d4553f677d2f)

### Added

- Added TCGdex set retrieval, chronological set sorting, set filters, result pagination, and per-set card caching.
- Added resilient handling for both direct-array and `{ data }` API payloads and for endpoints that reject server-side sort parameters.

## [v1.7.0] — 2026-10-19 — [`9228d40`](https://github.com/harlequinzxc/MichiBinder/commit/9228d40602bd1e074a877673e54b117662b1d476)

### Added

- Added debounced TCGdex card search, loading/error/empty states, low-resolution previews, and high-resolution imports.
- Added drag, double-click, Enter-key, stage-drop, slot-drop, sidebar-drop, and timeline-drop paths for remote cards.
- Added the local placeholder asset and moved the service-worker cache to `card-binder-v3`.

### Technical decision

- Imported cards are downloaded into local storage when CORS/browser policy allows; a validated TCGdex CDN URL remains as fallback when blob download fails.

## [v1.6.10] — 2026-10-19 — [`0f862a3`](https://github.com/harlequinzxc/MichiBinder/commit/0f862a3e7f0811b1cedeb5776cd6ef5f4854f064)

### Changed

- Unified binder controls and moved page-specific structural actions into a shared workspace toolbar.
- Deepened binder and paper surfaces while retaining a fixed 1200px 3D perspective.
- Centralized icon sizing through the `Icon` abstraction and stabilized status/help surfaces.

## [v1.6.9] — 2026-10-19 — [`87a15e0`](https://github.com/harlequinzxc/MichiBinder/commit/87a15e08125f95e59187cf214b12bbdcb341948a)

### Changed

- Applied toolbar, upload tray, slot-label, cover, and active-thumbnail micro-polish.
- Tightened typography, padding, and responsive label visibility without changing the underlying workflows.

## [v1.6.8] — 2026-10-19 — [`909614d`](https://github.com/harlequinzxc/MichiBinder/commit/909614d0a849fb8b3e1e07fa49065204bdbbb79c)

### Added

- Added a self-hosted static Inter variable-font asset and its license.

### Changed

- Applied Inter locally and refined typography, sleeve material, and binder surface details without adding a network font dependency.

## [v1.6.7] — 2026-10-19 — [`2b4e52c`](https://github.com/harlequinzxc/MichiBinder/commit/2b4e52c3fd7c1d0a19a3a47088501cd222cda1e1)

### Changed

- Rebalanced the header controls and responsive visibility.
- Deepened binder beds, sleeves, covers, and workspace surfaces while keeping print geometry unchanged.

## [v1.6.6] — 2026-10-19 — [`7ff4dc6`](https://github.com/harlequinzxc/MichiBinder/commit/7ff4dc6e09abdbd5bad39091747744c4b486bfac)

### Changed

- Clarified hierarchy among global controls, page tools, status information, and binder materials.
- Refined depth and contrast so controls remain readable over the dark workspace.

## [v1.6.5] — 2026-10-19 — [`551ec39`](https://github.com/harlequinzxc/MichiBinder/commit/551ec394f30417531c7de05b422b7db685e3ad25)

### Changed

- Elevated the desktop visual hierarchy with structured header navigation, a sizing toolbar, source-pool controls, workspace status, and stronger binder depth cues.
- Added explicit responsive hiding for lower-priority labels and actions.

## [v1.6.4] — 2026-10-19 — [`3e510ee`](https://github.com/harlequinzxc/MichiBinder/commit/3e510ee0b66896f05f55c7574f045bcf86389bb1)

### Changed

- Added page thickness, face shading, cast shadows, and cubic-bezier depth cues to physical page turns.
- Kept turn geometry rigid while using light and shadow to sell the animation.

## [v1.6.3] — 2026-10-19 — [`e4fbb89`](https://github.com/harlequinzxc/MichiBinder/commit/e4fbb890974465300c9c81dfb9db6b3ca4812ae2)

### Fixed

- Kept animated page flips vertically aligned by giving the spread an explicit frame height and controlled overflow clip.

## [v1.6.2] — 2026-10-19 — [`ee89bc5`](https://github.com/harlequinzxc/MichiBinder/commit/ee89bc5498ad2e95371173a5e73fb974a2633387)

### Fixed

- Refined forward and backward turning-sheet transforms, face visibility, transform origins, and spine pinning.
- Added guard handling when a planned page face no longer exists.

## [v1.6.1] — 2026-10-19 — [`e95acaf`](https://github.com/harlequinzxc/MichiBinder/commit/e95acafc4913d423853a6716cb0a43ba0decc9e1)

### Fixed

- Corrected page-flip alignment at the center spine and at front/back cover boundaries.
- Distinguished front-cover, back-cover, and normal-spread animation plans.

## [v1.6.0] — 2026-10-19 — [`bf5a93e`](https://github.com/harlequinzxc/MichiBinder/commit/bf5a93e6b59b806556a32f26b9ffee6fbcaf3f10)

### Added

- Added double-sided physical page-turn animation with front/back faces, stable base leaves, cover layers, and directional plans.
- Integrated insertion and duplication transitions with the physical-sheet model.

## [v1.5.1] — 2026-10-18 — [`632d076`](https://github.com/harlequinzxc/MichiBinder/commit/632d076707590426b4b66e6e716a8f1a9e3b34b9)

### Fixed

- Aligned page grouping with physical facing-page behavior: first and last boundary pages render alone and interior pages render as spreads.
- Updated labels, navigation, thumbnails, and side assignment to use the same binder grouping functions.

## [v1.5.0] — 2026-10-18 — [`f32ce17`](https://github.com/harlequinzxc/MichiBinder/commit/f32ce170ad73d233e3251f9a4b6c112918a296ba)

### Added

- Modeled every physical sheet as paired `front` and `back` pages sharing a `sheetId`.
- Added migration/repair for older odd or unpaired page arrays.
- Made add, duplicate, delete, ordering, and minimum-page behavior operate on whole physical sheets.

### Why

- Independent logical pages could not correctly represent ownership, duplex printing, or realistic binder turns.

## [v1.4.0] — 2026-10-18 — [`7f786bc`](https://github.com/harlequinzxc/MichiBinder/commit/7f786bc96285a2f8deb9724f9a89a01eaffc9c21)

### Added

- Added facing-page groups, boundary covers, a center spine, 3D page transitions, direct spread navigation, and resize-aware stage scaling.
- Made page selection and history restoration spread-aware.

## [v1.3.0] — 2026-10-18 — [`c4750f2`](https://github.com/harlequinzxc/MichiBinder/commit/c4750f244beac499df1f84740aafd25e7f26144a)

### Added

- Added 30-entry canvas Undo/Redo history and keyboard shortcuts.
- Routed placement, movement, merge, unmerge, clear, reset, and layout changes through snapshot-aware canvas mutations.
- Added selection counts, fill/delete actions, and interaction polish for cards and slots.

### Technical decision

- History snapshots contain pages, current page, and layout. Pool/image-library mutations and general settings are intentionally outside canvas history.

## [v1.2.3] — 2026-10-18 — [`1716c71`](https://github.com/harlequinzxc/MichiBinder/commit/1716c71a500464b80423858d8990b0df90ca7c5b)

### Changed

- Polished page previews, page controls, active states, and workspace presentation.
- Updated the committed desktop screenshot to match the refined interface.

## [v1.2.2] — 2026-10-18 — [`b1542cd`](https://github.com/harlequinzxc/MichiBinder/commit/b1542cdcd860eb86bf8fd24cd98bb4935bd4856a)

### Changed

- Redesigned the application around the black/crimson visual system.
- Reworked icons, manifest/theme colors, document metadata, service-worker cache identity, CSS accents, and the desktop screenshot.

## [v1.2.1] — 2026-10-18 — [`0a226a2`](https://github.com/harlequinzxc/MichiBinder/commit/0a226a2a88ebe1c581ab0134de839613296c5a8c)

### Changed

- Replaced the original PWA icon family and refined the SVG artwork.

## [v1.2.0] — 2026-10-18 — [`335b58d`](https://github.com/harlequinzxc/MichiBinder/commit/335b58dd5f22ade4d150204bddd3837ba9be8c0f)

### Added

- Added one-click Unmerge directly on a merged frame with a toast-level undo action.
- Added guarded hover/focus slot actions for Unmerge and Remove Card.
- Hardened marquee, click, double-click, and pointer interactions to prevent action bleed-through.

## [v1.1.0] — 2026-10-18 — [`193e375`](https://github.com/harlequinzxc/MichiBinder/commit/193e3759e1b27156965a04e7be122d3f05c9f932)

### Added

- Built the initial production application: Vite/React/Tailwind workspace, local image pool, binder and paper previews, 2×2/3×3/4×3 layouts, merge/unmerge, drag/drop, crop repositioning, true-size print output, multi-page navigation, local persistence, PWA assets, Vercel configuration, and documentation.
- Added IndexedDB image storage with local-storage fallback, install/offline support, keyboard interactions, accessibility labels, and responsive desktop/portrait handling.

### Why

- Established a private, backend-free card-layout tool where user uploads remain on the device and browser printing produces physically sized pages.

## [v1.0.0] — 2026-10-18 — [`9d9b7c5`](https://github.com/harlequinzxc/MichiBinder/commit/9d9b7c5421e5bf9a1ae6c336657382d5c1def10f)

### Added

- Seeded the repository with the MichiBinder project identity in `README.md`.

### State at this version

- No application source existed yet; the working app arrived in v1.1.0.

---

## Current architecture and technical decisions

### Application shape

- `src/main.jsx` mounts `CardBinder` in React `StrictMode` and registers `/sw.js` only in production.
- `src/CardBinder.jsx` contains the data model, persistence, API integration, drag/drop engine, history, print tree, and most components. This is deliberate historical scope, but the file is now approximately 3,450 lines and is the largest maintenance risk.
- `src/index.css` owns Tailwind import/setup plus page-turn depth, sleeve sheen, print media behavior, portrait guard, animation, and PWA-window styling.
- Tailwind CSS v4 is integrated through Vite; there is no separate Tailwind configuration file.
- Lucide is the only icon set. The `Icon` abstraction forces rendered icons to 16×16.

### Page and sheet model

- A page stores `id`, `sectionName`, `merges`, `slots`, `crops`, `sheetId`, and `face`.
- A physical sheet always owns exactly two pages: `front` and `back`, sharing one `sheetId`.
- `normalizePhysicalPages` repairs older/unpaired arrays, enforces an even count, and writes stable order values.
- `binderViewGroups` treats the first and final pages as single boundary covers and groups interior pages into facing spreads.
- Add Page inserts one two-page sheet before the final boundary page. Duplicate copies the active physical sheet, including slots, crops, and merges but with fresh page/sheet/merge IDs. Delete removes the entire active physical sheet.
- The reset state contains four pages/two physical sheets. Structural code assumes a minimum of one physical sheet.

### Layout, merge, and rendering model

- Supported logical grids are 2×2, 3×3, and 4×3. The persisted slot key is `row-col`; merged frames consume their top-left anchor key.
- Merge geometry is sanitized against a maximum 3 rows × 4 columns. Overlapping persisted merges are discarded during sanitation.
- Layout changes can make assignments temporarily hidden. `visibleAssignments`, `hiddenAssignments`, and reflow logic preserve data rather than silently deleting hidden cards.
- Binder and Paper modes share the same page data. Measurements are calculated in inches after conversion from millimetres so CSS print dimensions remain physical.
- The 3D workspace uses a 1200px perspective. The current spread keeps a stable `gap-4` center-spine gap.
- The first/last cover behavior, page-side calculations, page-turn plans, and physical sheet ownership are coupled. Most page bugs historically came from changing one without the others.

### State, refs, and history

- React state drives rendering, while refs such as `pagesRef`, `currentPageRef`, drag refs, edit refs, and timer refs provide synchronous values inside native pointer/drag/timer callbacks.
- `applyCanvasChange` is the central canvas mutation path and maintains a 30-snapshot past/future history.
- Undo/Redo covers page/layout canvas state, not the image pool, external catalogue state, print scope, or every UI setting.
- `selectedCardIds` is shared by Cards and Michi. Selection order determines batch placement order.
- Native HTML drag/drop and pointer capture are used; there is no drag library or state library.

### Timeline and control surfaces

- The header contains sidebar control, the local logo, product identity, and reactive save status.
- The Cards/Michi sidebar is collapsible; the main workspace consumes the remaining width.
- The preview surface owns the binder stage and detached right utility rail in one flex row, preventing binder content from entering the rail zone.
- Database/Custom/Density is an absolute status row at the bottom of the preview surface.
- The bottom controller owns history, structural editing, spread navigation, Add, Duplicate, Delete, and the timeline toggle.
- The timeline belongs to the right-side main tree, spans through the right viewport edge, and is fully removed from layout when collapsed.
- Active navigation uses `data-active="true"`. Add/Duplicate also set `timelineRevealPageIdRef`; `data-timeline-page-id` resolves the exact new group before `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })`.

### TCGdex integration

- API base: `https://api.tcgdex.net/v2/en`.
- Card list records are treated as CardBrief-like objects with `id`, `localId`, `name`, and an extensionless image base.
- Preview and import URLs append `/low.jpg` and `/high.jpg` respectively.
- Sets are sorted newest-first where release dates exist; full set fetches provide cards for local pagination/infinite scrolling.
- Search uses debouncing and `AbortController`; catalogue pagination appends 40 normalized items at a time.
- The asset normalizer only trusts `https://assets.tcgdex.net` for absolute remote image bases.
- Imported high-resolution assets are stored locally when possible. If cross-origin blob download is blocked, the CDN URL is persisted as fallback.

### Persistence and PWA

- Layout key: `digital-card-binder:v1`.
- Persisted schema version: `4`; data newer than the current schema falls back to a clean binder.
- IndexedDB database/store: `digital-card-binder` / `images`, version `1`.
- Object URLs are tracked and revoked during replacement/reset/unmount paths.
- Save status is asynchronous and intentionally brief; browser checks use short polling to observe `Saving...`.
- The service worker uses cache name `card-binder-v3`, navigation network-first behavior, and same-origin cache-first-with-refresh behavior for assets.
- Vercel rewrites all routes to `index.html`, disables long caching for the service worker/manifest, and gives hashed `/assets` immutable caching.

### Printing

- Card presets/settings are stored in millimetres and converted to physical inches for layout math.
- Print-fit uses a 0.125-inch safe margin and supports A4, Letter, A3, and Tabloid.
- `all` scope preserves page placement; `custom` scope compacts private uploads into consecutive unmerged print slots.
- Print output depends on the browser dialog using matching paper, no margins, 100% scale, and background graphics. Browser “Fit to page” produces the wrong physical size.

## Known issues and limitations

No reproducible application-breaking issue was open when v1.20.2 was written. The known limitations are:

1. **No committed automated test suite or CI workflow.** Validation to date has been production builds plus external Chromium scripts. Those scripts were stored outside the repository and are not a durable test harness.
2. **No project export/import or cloud backup.** Clearing browser site data, using another browser profile, or losing the device loses locally stored work.
3. **Desktop/landscape focus.** The app has a portrait guard and has been geometry-tested down to 1200×700 landscape, not as a small-screen mobile editor.
4. **TCGdex requires a network connection.** The binder itself remains local, but catalogue search and CDN-only fallback images are unavailable offline until imported assets have been stored locally.
5. **Browser print settings remain user-controlled.** The app cannot force margins, background graphics, selected printer paper, or browser scaling.
6. **Cross-browser coverage is incomplete.** The recent interaction and geometry passes used headless Chromium. Safari and Firefox behavior for vertical range inputs, PWA installation, drag/drop, and print output has not been equivalently automated.
7. **The service-worker runtime cache has no per-entry eviction.** Old hashed assets can remain in `card-binder-v3` until the cache name changes or site data is cleared.
8. **README workspace wording has minor drift.** Its “Top utility bar” row still attributes card sizing, preview, and print controls to the top bar even though those controls now live in the right utility rail and Print / PDF menu.
9. **The main component is large.** `CardBinder.jsx` is highly coupled; even visual layout edits can affect print, page ownership, pointer state, or persistence if broad rewrites are used.

## Historical pitfalls and validation notes

- Tailwind v4 did not reliably apply important-prefixed collapse utilities such as `!h-0` in this project. Timeline collapse was fixed by composing mutually exclusive open and closed class sets.
- A backdrop-filtered ancestor can change the containing block behavior of fixed descendants. The largest rail popovers currently pass at the tested viewport floor because their content is compact; shorter landscape heights need renewed clipping checks.
- Popover scale-in animation can make geometry tests observe approximately 60% of final size. Browser checks finished element animations before asserting bounds.
- Smooth scrolling over very long timelines can take multiple seconds in headless Chromium. Visibility tests allowed the motion to settle instead of asserting immediately.
- The agent sandbox used mocked TCGdex responses because direct TCGdex access was blocked by its outbound host policy. Production schema behavior was based on TCGdex documentation and normalized defensively.
- Playwright Core with Sparticuz Chromium was the working browser setup in the prior environment; the environment required `/tmp/al2023/lib` in `LD_LIBRARY_PATH`. This setup was external and may not exist in a fresh workspace.
- Browser harnesses were most reliable when run sequentially. Sparticuz single-process Chromium could terminate if its sole page was closed unexpectedly.
- Several labels occur both on triggers and controls inside dialogs. Role-based selectors and explicit dialog scoping avoided ambiguous browser queries.
- `Saving...` is asynchronous and short-lived. Slow polling can miss it.
- Page-turn animation uses timers and stable page IDs. Rapid structural changes cancel prior turn timers by token; removing that token discipline previously risked stale animation completion.
- TCGdex image paths are extensionless bases. Appending `/low.jpg` or `/high.jpg` is required; treating the base as a complete image URL breaks previews.
- Persistence sanitation is part of compatibility. Replacing `sanitizePage`, `sanitizeSettings`, or `normalizePhysicalPages` with direct JSON hydration would regress old saved binders.
- The print tree and live preview intentionally share data but not all presentation. Screen-only controls use `no-print`; print changes need both browser preview and print-media verification.

## Unfinished work and handoff state

- A repository-owned test suite is still absent. The most valuable future test coverage would formalize physical-sheet arithmetic, binder grouping, merge sanitation, placement flow, persistence migration, print compaction, and timeline reveal behavior.
- Export/import backup remains unimplemented.
- Cross-browser print calibration and PWA validation remain manual.
- README workspace and Print / PDF instructions could be updated to match the latest utility-rail menus.
- Historical versions in this file are not Git tags or GitHub releases. The commit links are the durable historical references.
- There is no backend, account system, collaborative editing, telemetry, or required environment configuration; these were deliberate scope boundaries rather than partially built systems.
- The most recently completed functional request was deterministic timeline reveal after Add Page and Duplicate Physical Sheet. Both actions were tested on a horizontally overflowing timeline and produced one active, visible two-page group.
