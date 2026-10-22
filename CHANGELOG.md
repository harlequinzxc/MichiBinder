# CHANGELOG — MichiBinder Project Memory and State Ledger

This file is the project's durable memory and source of truth for engineering history and current implementation state. It records what exists, why it exists, what was replaced, what failed, and what remains incomplete. It describes reality; it is not a second rules file or a speculative roadmap.

## Current state — v4.22.10

- **Ledger date:** 2026-10-22
- **Application state entering this feature pass:** commit `cd8b5bf` / v4.22.9
- **Product:** a private, desktop-first, multi-binder trading-card layout and true-size print workspace
- **Runtime:** static client-only React 19 PWA built by Vite 6 with Tailwind CSS v4 through `@tailwindcss/vite`
- **Runtime dependencies:** only `react`, `react-dom`, and `lucide-react`
- **Primary source:** `src/CardBinder.jsx`, approximately 5,100 lines containing the data model, persistence, catalogue integration, interactions, print tree, and most UI components
- **Supporting source:** `src/index.css` for Tailwind import, print media, page-turn depth, sleeve materials, portrait guard, and animations
- **Persistence:** a versioned multi-binder repository in `localStorage`; binder-scoped image blobs and binder-scoped native directory handles in IndexedDB; data URL/local-storage fallback when IndexedDB is unavailable
- **Network boundary:** TCGdex REST/API assets and the public open ExchangeRate-API USD feed; custom assets remain entirely local with no upload, proxy, scraper, manifest, or remote-sync request path; no MichiBinder backend, account, telemetry, or required environment variable
- **Deployment:** static `dist/` output on Vercel through `vercel.json`
- **Last functional change:** the `webkitdirectory` fallback now installs a binder-scoped session handle after folder selection, so Brave and other browsers without `showDirectoryPicker` immediately render Folder Connected, Sync, and Disconnect; fallback Sync reopens the directory picker because no persistent native permission token exists
- **Last verified behavior:** production build; native File System Access and `webkitdirectory` fallback linkage; immediate header/sidebar updates; fallback Sync repicker; two-binder session-handle isolation and restoration; scoped native token storage/deletion; preserved assets; exact copy/classes; zero linked/unlinked layout shift; migration/reset/upload-race regressions; synchronized v4.22.10 title pill; and zero browser errors
- **Active incomplete implementation:** none. Remaining gaps are documented near the end of this file.

## Strict SemVer policy and audit

Versions through v4.2.3 were reconstructed retrospectively because the earliest package metadata remained at `1.0.0` and no Git tags or GitHub Releases existed. Package and lockfile metadata first synchronized with that ledger in commit `69ad992`; subsequent entries record the version assigned to each completed change set.

MichiBinder applies SemVer to its user-visible application contract:

- **PATCH** — a backward-compatible correction or completion of existing behavior, including visual/accessibility polish, timing and lifecycle fixes, compatibility repairs, documentation, and internal refactors that add no independent workflow.
- **MINOR** — a new backward-compatible capability, workflow, stateful interaction, data source, or operational module.
- **MAJOR** — an incompatible replacement of a layout, rendering, persistence, or interaction paradigm rather than an extension of the current contract.

The 2026-10-21 full-ledger audit confirmed the three post-inception major boundaries:

1. **v2.0.0:** the flat page viewport was replaced by the preserved 3D spread/rotation engine.
2. **v3.0.0:** the toolbar/tray composition was dismantled and rebuilt as the four-area workspace with contextual bottom navigation.
3. **v4.0.0:** top-heavy configuration controls were removed and replaced by the standalone right utility rail plus cohesive bottom structural controller.

The audit also confirmed that presentation-only releases remain patches; capability releases such as TCGdex integration, source workspaces, valuation, upload deletion, print slicing, and first-unplaced tracking remain minors; and later fixes that complete those existing contracts remain patches. Specifically, v4.8.2 restored the Custom metric removed during v4.8.1 consolidation, while v4.11.1–v4.11.7 corrected lifecycle and print-slicing gaps in capabilities introduced by v4.11.0 and earlier print releases. Persistent per-tab scroll memory is a new stateful interaction and therefore begins v4.12.0 rather than v4.11.8; continuously measurable inactive-panel background scrolling is likewise a new cross-tab capability and begins v4.15.0; premium layout-aware prompt compilation and copy workflows begin v4.16.0, while their preview-format and prompt-copy corrections remain the v4.16.1 patch; remote public-asset ingestion begins v4.17.0, its replacement with bulk Imgur album deconstruction and concurrent streaming begins v4.18.0, the CORS-safe public-page scraper correction remains the v4.18.1 patch, cloud-first ImgBB upload interception begins v4.19.0, cross-device downstream ImgBB profile rehydration begins v4.20.0, the GridRip boundary-instruction correction remains the v4.20.1 patch, the cloud-control/header presentation correction remains the v4.20.2 patch, the downstream root-profile parser correction remains the v4.20.3 patch, the JSONP profile-loader correction remains the v4.20.4 patch, the device-ledger rehydration correction remains the v4.20.5 patch, the public-manifest registry correction remains the v4.20.6 patch, and the authoritative clipboard-reconciliation correction remains the v4.20.7 patch. Browser-native authoritative directory mounting replaces the retired online custom-asset architecture as a new ingestion capability and therefore begins v4.21.0; cached-handle unlinking completes that capability as the v4.21.1 patch. Independent multi-binder workspace creation, switching, restoration, and persistence form a new stateful lifecycle capability and therefore begin v4.22.0; native-handle-derived folder truth and its associated health/copy correction remain the v4.22.1 patch, binder-scoped handle allocation and the requested human-copy cleanup complete that lifecycle as the v4.22.2 patch, the explicit reactive folder-state bridge is the v4.22.3 patch, its replacement with an authoritative memoized native-handle selector is the v4.22.4 patch, activation-time handle-context rebroadcasting is the v4.22.5 patch, simplifying folder health to a direct current-handle Boolean is the v4.22.6 patch, binding the sidebar controls directly to that handle is the v4.22.7 patch, synchronously aligning the active state/ref channel during workspace activation is the v4.22.8 patch, routing folder selection plus Link/Disconnect directly through active React state is the v4.22.9 patch, and restoring linked-session UI semantics for the directory-input fallback is the v4.22.10 patch.

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

## [v4.6.8] — 2026-10-20

### Fixed

- Reasserted the exact single Michi master-grid class sequence with two columns, 12px gaps, catalogue padding, native vertical scrolling, hidden scrollbar chrome, rounded bounds, and the requested subtle border.
- Replaced conditional custom-card wrapper styling with the exact fixed `aspect-[245/337]` catalogue frame and replaced the image layer with full-width, full-height `object-cover` bounds.
- Added `grid-auto-rows: max-content` and start alignment specifically to the custom-assets scroll grid; this prevents the flex-constrained grid from shrinking row tracks below the fixed card aspect height and overlapping subsequent rows.
- Verified twelve direct grid children, zero nested grids, exact class strings, 245/337 geometry, full card-image bounds, 12px horizontal and vertical gaps, working overflow scrolling, hidden scrollbar chrome, canvas containment, viewport-sized document bounds, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.6.8.

## [v4.7.0] — 2026-10-20

### Added

- Added persisted ISO `createdAt` metadata for newly imported image records and recovered IndexedDB uploads, preserving backward compatibility for legacy pool entries.
- Added chronological ascending rendering for Michi uploads immediately before the mapping loop, with stable insertion order retained when legacy IDs are not parseable dates.
- Added a low-profile Clear All action beside the upload count with explicit destructive confirmation.
- Added a data-model-aware clear-all workflow that removes every custom upload from the pool, prunes its assignments and crops from all binder sheets, clears related selection/editing state and object URLs, requests IndexedDB deletion, and immediately writes the cleaned binder snapshot to local storage.

### Preserved and verified

- Restored the placed-upload image treatment with 0.45 opacity, grayscale, and 0.75 hover opacity over the full-height `object-cover` image geometry.
- Verified ascending display from reverse-ordered persisted input, twelve direct non-overlapping grid children, placed-state styling, exact confirmation copy and button classes, retention of unrelated TCGdex pool and slot data, immediate persisted custom-data removal, native list scrolling, canvas containment, viewport-sized document bounds, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.7.0.

## [v4.7.1] — 2026-10-20

### Fixed

- Added an all-sheet placed-asset index and mapped placed TCGdex pool assets back to canonical TCGdex IDs so catalogue results can detect binder placement without assuming the app's object-based slot model matches the API-card model.
- Matched catalogue artwork to the Michi full-frame `object-cover` treatment and applied 0.45 opacity plus grayscale whenever the canonical card is placed anywhere in the binder.
- Used the existing named `group/card` hover channel for 0.75 placed-card hover opacity, preventing the catalogue container's outer `group` from brightening every placed result when a different card is hovered.
- Verified placed and unplaced image classes, 0.45 placed opacity, grayscale filtering, full-frame cover behavior, isolated hover state, 0.75 hover opacity, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.7.1.

## [v4.8.0] — 2026-10-20

### Added

- Added a confirmed Clear Binder action to the Cards search header that removes every placed TCGdex-backed asset and its crop from all sheets while preserving custom uploads, pool records, physical sheets, and undo history.
- Added a dedicated `timelineScrollRef` plus smooth 400px left/right navigation functions for the horizontal page tray.
- Added translucent, hover-revealed Lucide chevron overlays at both timeline edges using the required 16px icons and fixed gradient treatments.
- Added vertical-wheel-to-horizontal-scroll translation on the timeline; a native non-passive guard prevents browser page scrolling without triggering React's passive wheel-listener console error.

### Changed

- Unified Card Set and Your Uploads section labels on the same 9px bold, tracked neutral-400 uppercase Inter treatment with 6px bottom spacing.
- Unified Cards item counts and Michi asset counts on clean 10px medium neutral-500 metadata typography.
- Wrapped the existing timeline scroller in a relative `group/timeline` frame while retaining its 300ms elastic drawer geometry, hidden scrollbar chrome, native horizontal overflow, and active-page reveal behavior.

### Verified

- Verified cancel and confirm Clear Binder paths, removal of only database slots/crops, preservation of custom slots/crops and both pool records, and persisted results.
- Verified overflow across a 40-page timeline, 180px wheel translation, smooth +400px/-400px overlay movement, exact overlay classes, 16px icons, typography classes, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.8.0.

## [v4.8.1] — 2026-10-21

### Changed

- Simplified the empty Cards catalogue state to a single TCGdex browsing instruction beneath its icon, removing the competing headline.
- Moved the live Michi asset total into the uppercase Your Uploads heading and removed the separate assets metadata readout.
- Replaced the inventory-oriented Database and Custom workspace metrics with one Binder card metric that totals placed TCGdex and custom cards across every page while retaining the premium gradient number treatment.
- Updated the workspace metrics accessibility label to report the consolidated binder-card total alongside current-page density and optional spread value.

### Verified

- Verified exact empty-state copy, absence of the removed catalogue headline and standalone asset counter, live `YOUR UPLOADS (1)` heading copy/class, an all-page `BINDER 4 CARDS` test total, exact metadata class, gradient number treatment, consolidated accessibility text, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.8.1.

## [v4.8.2] — 2026-10-21

### Fixed

- Restored the Custom workspace metric between Binder and Density after the v4.8.1 metric consolidation, counting every custom-upload placement across all pages through the assignment-map model and reporting the total in the row's accessibility label.
- Changed each timeline page frame to visible overflow with centered flex containment, removing the strict clipping that could hide lower miniature rows.
- Wrapped each complete timeline sheet grid in one GPU-backed, center-origin 0.85 scale container to create a consistent visual buffer without altering page or slot geometry.
- Standardized miniature card images on full-size `object-contain` rendering with a 1px corner radius so their aspect ratios remain intact at filmstrip scale.

### Verified

- Verified exact frame and scaler classes, computed visible overflow/flex centering and 0.85 scale, pointer isolation, nine contained miniature images, complete visibility of slots 7–9, exact contain-image classes, an all-page `CUSTOM 6 CARDS` test total, metric dividers/gradient typography, consolidated accessibility text, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.8.2.

## [v4.8.3] — 2026-10-21

### Changed

- Replaced chronological Michi upload ordering with natural alphanumeric ordering by card/file name, using numeric comparison and case-insensitive base sensitivity.
- Retained stable ID fallback behavior for legacy upload records without names; newly added files continue to persist their original `file.name` in IndexedDB-backed and local-storage-backed pool records.

### Verified

- Verified `Alpha.png`, `card 1.png`, `Card 2.png`, and `Card 10.png` render in natural filename order despite opposing creation timestamps.
- Verified a newly uploaded `card 3.PNG` is inserted between Card 2 and Card 10, preserves its exact original filename in persistence, and produces zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.8.3.

## [v4.9.0] — 2026-10-21

### Added

- Added a low-profile 24px per-upload delete control with a 12px Lucide trash glyph that fades in on Michi card hover.
- Added confirmed permanent single-upload removal that deletes the custom pool record and image state, removes every matching assignment and crop across all pages, cleans IndexedDB when active, resets stale selection/editing state, and immediately persists the result.

### Changed

- Expanded Michi card React keys with the current upload count and filename so file insertions and removals remount the ordered grid immediately without a refresh.
- Kept permanent asset deletion aligned with the assignment-map page model while preserving unrelated custom uploads, database cards, placements, crops, sheets, and natural filename ordering.

### Verified

- Verified immediate natural ordering after upload, structural remounting of existing cards, exact trash-control class, 12×12 icon geometry, 0-to-1 hover opacity, exact confirmation text, cancel preservation, click-propagation isolation, confirmed pool deletion, two-page slot/crop cleanup, retained unrelated assets, updated Binder/Custom/Density telemetry, persistence, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.9.0.

## [v4.9.1] — 2026-10-21

### Fixed

- Switched the Michi per-upload delete control from Lucide `Trash2` to the standard `Trash` module while retaining its exact 12px footprint, hover styling, stacking, and permanent cleanup behavior.
- Confirmed the existing all-page custom-placement reducer and Custom metric remain positioned between Binder and Density with the requested divider, label typography, transparent gradient digits, and accessibility text.

### Verified

- Verified the rendered glyph identifies as `lucide-trash` rather than `lucide-trash-2`, remains 12×12px, transitions from zero to full opacity on card hover, and completes cancel/confirm deletion without browser errors at 1600×1000, 1366×768, and 1200×700.
- Reverified natural insertion ordering, dual-page assignment/crop cleanup, retained unrelated assets, persisted results, and `CUSTOM 1 CARDS` telemetry after deletion.
- Advanced package and lockfile metadata to v4.9.1.

## [v4.9.2] — 2026-10-21

### Fixed

- Extended generated slot descriptors with one-based print column/row starts and active column/row spans, then passed those properties directly to print slot wrappers so merged dimensions survive browser Print/PDF layout.
- Replaced print images' runtime cover/contain override with the dedicated `printable-card-image` class using full-size `object-contain` rendering and print-scoped maximum dimensions, preserving natural artwork proportions independently of the editor fit preference.
- Retained saved object positioning, cut guides, physical card dimensions, configured gaps, page sizing, skip-empty behavior, and existing editor slot geometry.

### Verified

- Verified exact inline 2×2 and 1×1 print grid coordinates, computed two-column/two-row merged bounds, custom 100×50mm track ratio, two contained print images, 100% print max-width/max-height, saved 25%/75% object positioning, absence of cover/square print classes, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Generated and validated a non-empty CSS-page-sized PDF beginning with a valid `%PDF` signature.
- Advanced package and lockfile metadata to v4.9.2.

## [v4.9.3] — 2026-10-21

### Changed

- Moved the Michi per-upload delete overlay from the top-right to the top-left corner with the exact `top-1.5 left-1.5` positioning tokens.
- Kept the explicitly imported standard Lucide `Trash` component at 12px, the 50-layer overlay, direct card-child placement, named hover group behavior, and existing translucent control treatment.

### Verified

- Verified exact control classes, top-left geometry inside the card border, standard `lucide-trash` identity, 12×12px icon dimensions, zero-to-full hover opacity, immediate natural ordering, cancel/confirm removal, two-page assignment/crop cleanup, persistence, updated telemetry, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.9.3.

## [v4.9.4] — 2026-10-21

### Fixed

- Normalized each print slot wrapper onto CSS `gridColumn` and `gridRow` shorthands driven by its active column/row spans.
- Retained explicit one-based grid starts in those shorthands so non-origin merged cards cannot auto-flow into earlier holes or displace later pockets.
- Continued omitting every covered pocket through the canonical merged-slot generator rather than rendering hidden duplicate cells beneath 2×1, 2×2, or full-sheet spans.

### Verified

- Verified exact `1 / span 2`, `2 / span 2`, and `1 / span 3` print shorthands for 2×1, 2×2, and 3×3 cards, alongside explicit normal-pocket placement.
- Verified a page containing 2×1 and 2×2 merges renders only five canonical slot wrappers, a 3×3 page renders only one, physical bounds match each span, custom 100×50mm tracks remain 2:1, print images remain contained, and no browser errors occur at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.9.4.

## [v4.9.5] — 2026-10-21

### Changed

- Replaced the physical-unit print `SheetGrid` surface with the requested dedicated A4-ratio print sheet using an explicit three-column, three-row CSS Grid, fixed gap/padding tokens, white paper treatment, and clipped print bounds.
- Changed canonical print slot wrappers to full-size relative grid items whose `gridColumn` and `gridRow` values are driven directly by each active column/row span.
- Changed print artwork to full-cell `object-cover` rendering through the exact `printable-card-image` class while retaining saved object positioning.
- Preserved cut guides as a non-interactive overlay and continued deriving slots through the canonical merge-aware generator so covered pocket indices are omitted.

### Verified

- Verified exact sheet, slot, and image classes; explicit `repeat(3, 1fr)` columns/rows; computed three-track output; A4 aspect; hidden overflow; and `object-cover` rendering.
- Verified 2×1, 2×2, and 3×3 span strings, five canonical wrappers for a combined 2×1/2×2 page, one wrapper for a full 3×3 page, complete slot containment, valid PDF output, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.9.5.

## [v4.10.0] — 2026-10-21

### Added

- Added a canonical print-cell expansion helper that unfolds each merge-aware slot into its complete set of physical 1×1 pocket cells and restores strict row-major paper order.
- Added seamless background slicing for placed merged artwork: each physical cell renders the shared image at the full merged footprint size with column/row-relative percentage offsets.

### Changed

- Forced every print pocket wrapper to `grid-column: span 1` and `grid-row: span 1`, so 2×1, 2×2, 3×3, and other merged editor cards print as separate cuttable pocket pieces instead of one spanned paper block.
- Replaced print `<img>` elements with exact `printable-card-slice` background layers using scaled background dimensions, deterministic 0/50/100% slice positions, and no-repeat rendering.
- Retained the explicit 3×3 A4-ratio print sheet, nine equal pocket cells, cut-guide overlays, source-card trace attributes, and valid PDF generation.

### Verified

- Verified every tested print page renders nine ordered 1×1 wrappers with `span 1` column/row styles and equal geometry.
- Verified 2×1 slices use 200%×100% backgrounds at 0%/100% horizontal offsets; 2×2 slices use 200%×200% backgrounds at all four corners; and 3×3 slices use 300%×300% backgrounds across the full 0%/50%/100% position matrix.
- Verified normal cards remain 100%×100%, print output contains no legacy image elements, generated PDF output remains valid, and no browser errors occur at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.10.0.

## [v4.10.1] — 2026-10-21

### Fixed

- Moved merged-card print background sizing and position calculations directly into each `printable-card-slice` style declaration using explicit 1×1 span and zero-offset fallbacks.
- Protected print slicing from missing span or offset metadata while retaining the exact proportional formula for every physical pocket segment.

### Verified

- Reverified nine isolated 1×1 cells per page, 200%×100% 2×1 slices, all four 200%×200% 2×2 corners, the complete 300%×300% 3×3 0%/50%/100% matrix, equal pocket geometry, valid PDF output, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.10.1.

## [v4.11.0] — 2026-10-21

### Added

- Added a shared `scrollToNextUnplacedCard` utility that resolves the first item without `data-placed` inside a requested catalogue and smoothly reveals it with nearest-block alignment on the next animation frame.
- Added 60ms post-mount auto-scroll tracking when switching between Cards and Michi.
- Added first-unplaced tracking after canvas placements, imported TCGdex assets, and slot moves, gated on actual canvas changes where applicable.

### Changed

- Added the canonical `data-placed` attribute to placed TCGdex result wrappers, matching the existing Michi upload contract and enabling the shared selector engine across both catalogues.

### Verified

- Verified the Cards catalogue marks canonical placed results and advances from Card 1 to Card 2 on tab activation, then to Card 3 after importing/placing Card 2.
- Verified Michi advances from placed Custom A to Custom B on tab activation, then to Custom C after placing Custom B.
- Verified every captured call uses `{ behavior: 'smooth', block: 'nearest' }`, import and placement hooks both resolve against committed state, and no browser errors occur at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.0.

## [v4.11.1] — 2026-10-21

### Changed

- Introduced the requested literal `v1.4.1` identity badge adjacent to the MichiBinder title as presentation-only identity polish using the exact low-profile monospace pill typography and surface tokens.
- Changed all shared first-unplaced scroll calls from nearest-block alignment to smooth top-boundary alignment through `block: 'start'`.

### Fixed

- Corrected query and set-filter hydration timing with a 100ms first-unplaced trigger after every successful TCGdex result update.

### Verified

- Verified initial query hydration and subsequent set-filter hydration both target the first unplaced TCGdex card with smooth start alignment.
- Reverified Cards/Michi tab switches, Michi placement advancement, imported TCGdex placement advancement, exact `v1.4.1` badge copy/classes, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.1.

## [v4.11.2] — 2026-10-21

### Fixed

- Reworked Uploads-only print compaction to collect canonical custom-card anchors through the merge-aware slot generator instead of flattening raw assignments into dimensionless identities.
- Preserved each compacted instance's saved column span, row span, and non-centered crop data while retaining sequential temporary-page packing and physical front/back page identities.
- Added compatibility-safe per-slot print metadata and resolved print background sizing/offset denominators from that metadata, with existing canonical slot dimensions as the standard-print fallback.

### Verified

- Verified 1×1, 2×1, 2×2, and 3×3 custom-card dimensions survive Uploads-only compaction in source order across paired temporary print pages, while database cards remain excluded.
- Reverified two nine-cell pages with 9/3 compacted custom instances, canonical standard-scope 2×1/2×2/3×3 slice matrices, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.2.

## [v4.11.3] — 2026-10-21

### Fixed

- Moved the shared first-unplaced scroll engine into a stable component callback and delayed its DOM lookup by 120ms so React can commit and paint asynchronous catalogue frames before target resolution.
- Routed Cards/Michi tab tracking through the same delayed callback while preserving the existing tab, result-hydration, import, placement, and slot-move triggers.
- Retained canonical TCGdex result tracking through `data-tcgdex-card={item.id}` and the explicit empty-string `data-placed` marker for cards already placed in the binder.

### Verified

- Verified query hydration, set-filter hydration, Cards/Michi tab switches, Michi placement, and imported TCGdex placement all skip placed cards and target the first unplaced card with smooth start alignment.
- Reverified the exact `data-placed` lifecycle and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.3.

## [v4.11.4] — 2026-10-21

### Fixed

- Completed first-unplaced catalogue tracking for lazy-loaded results: when every painted TCGdex result is already placed and another result page exists, the shared observer advances pagination automatically.
- Made result hydration reevaluate the first-unplaced target whenever fetched card data or lookahead state changes.
- Corrected post-removal tracking for individual binder-pocket removal and Clear Binder so newly available Cards or Michi assets return to the top boundary.

### Changed

- Increased the shared painted-layout delay from 120ms to 150ms and retained smooth `block: 'start'` alignment.
- Synchronized the MichiBinder title pill with package and ledger SemVer at `v4.11.4`.

### Verified

- Verified an all-placed 40-card TCGdex result page automatically requests page 2 and scrolls to Card 41, the first newly loaded unplaced result.
- Verified individual slot removal and Clear Binder both scroll back to Card 1 after its placed marker is removed.
- Reverified query/set hydration, Cards/Michi tab and placement advancement, exact placed-state skipping, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.4.

## [v4.11.5] — 2026-10-21

### Fixed

- Moved compact custom-print span metadata out of the card-assignment `slots` map and into an isolated per-page `metaData` dictionary keyed by the temporary 1×1 print slot.
- Preserved source dimensions and non-centered crops while keeping compacted slot values as pure asset IDs, eliminating metadata objects from canonical card lookup paths.
- Unified custom and standard print rendering around resolved column/row spans and precomputed background offsets before each physical pocket slice is emitted.

### Verified

- Verified compact custom output retains ordered 1×1, 2×1, 2×2, and 3×3 source dimensions across two nine-cell pages with 9/3 populated slots, database-card exclusion, and valid PDF generation.
- Reverified standard 2×1, 2×2, and 3×3 merged artwork across the complete expected background-position matrices.
- Verified the synchronized `v4.11.5` title pill and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.5.

## [v4.11.6] — 2026-10-21

### Fixed

- Replaced card-level `scrollIntoView` calls in the first-unplaced catalogue engine with container-local `scrollTo` updates derived from target and container bounding rectangles plus the current inner scroll offset.
- Preserved the 150ms painted-layout delay and automatic TCGdex pagination lookahead while preventing catalogue movement from propagating to the parent sidebar or its Cards/Michi tab row.

### Verified

- Verified the deep lookahead target computes a 3,682px inner-container destination while the Cards/Michi tab row remains at an identical viewport position before and after scrolling.
- Reverified automatic page-2 loading, individual-removal and Clear Binder snap-back, smooth container-local scrolling, and the absence of card-level `scrollIntoView` calls.
- Verified the synchronized `v4.11.6` title pill and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.6.

## [v4.11.7] — 2026-10-21

### Fixed

- Reworked Uploads-only compaction to decompose every custom-card footprint into ordered 1×1 slices using the source card's runtime column and row spans rather than emitting one metadata-bearing cell per card.
- Added explicit column/row offsets to every temporary slice and taught the print renderer to prioritize those custom offsets while retaining canonical merge offsets for standard binder printing.
- Capped temporary custom-page packing to the fixed three-column print surface, allowing 4×3 source artwork to continue across print pages without dropping its fourth-column slices.

### Verified

- Verified 2×1, 1×2, 3×3, 4×3, 1×3, and 2×2 uploads produce all 32 expected slices in source order across four nine-cell pages populated 9/9/9/5.
- Verified the 4×3 matrix emits all twelve 400%×300% slices at 0/33.3333/66.6667/100% horizontal and 0/50/100% vertical offsets.
- Reverified standard 2×1, 2×2, and 3×3 merged-card slicing, valid PDF output, the synchronized `v4.11.7` title pill, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.11.7.

## [v4.12.0] — 2026-10-21

### Added

- Added independent mutable Cards and Michi scroll-position memory inside the source-panel component.
- Added 40ms post-render restoration so each catalogue returns to its exact prior inner-container offset after a tab transition.

### Changed

- Removed first-unplaced auto-scroll calls from passive Cards/Michi tab toggles; automatic targeting now remains limited to result hydration and binder/catalogue data modifications.
- Re-audited the complete ledger against the documented application-level SemVer contract, clarified the PATCH/MINOR/MAJOR boundaries, and corrected v4.8.2 and v4.11.4 section labels to identify restoration/completion work as fixes.

### Verified

- Verified Cards restores to 520px and Michi restores to 360px after repeated bidirectional tab transitions, with no passive-tab calls to the first-unplaced scroll engine and no tab-row displacement.
- Verified the synchronized `v4.12.0` title pill and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.12.0.

## [v4.12.1] — 2026-10-21

### Fixed

- Kept both Cards and Michi panel trees permanently mounted and switched only their wrapper display state, preventing tab transitions from replacing search controls, result nodes, upload nodes, or their native scroll containers.
- Refined v4.12.0 tab restoration so positive saved offsets restore directly, while a zero-memory first activation invokes the shared first-unplaced targeter after a 50ms paint delay.
- Preserved result-hydration, lazy-lookahead, placement, movement, removal, and Clear Binder targeting independently from tab visibility.

### Verified

- Verified Cards/Michi panel wrappers and both scroll nodes retain object identity and remain connected across repeated bidirectional transitions.
- Verified first zero-memory activations target `custom-1` and `tcg-1`, then remembered activations restore Cards to 520px and Michi to 360px without additional auto-scroll calls or tab-row displacement.
- Reverified automatic TCGdex page-2 lookahead, individual-removal and Clear Binder snap-back, the synchronized `v4.12.1` title pill, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.12.1.

## [v4.12.2] — 2026-10-21

### Fixed

- Invoked the shared custom-grid first-unplaced targeter after every successful `addFiles` cycle so newly uploaded, alphanumerically sorted assets return the Michi inventory to its top boundary.
- Moved selection-index badges to the top-right at a higher layer, separating the custom badge from the top-left Lucide delete control and shifting the selected custom source label beneath the badge.
- Unified selected Cards and Michi items behind the same red two-pixel ring, transparent border, 0.97 scale, brightness lift, tinted shadow, and translucent full-frame overlay; unified their unselected opacity, border, and hover elevation states as well.

### Verified

- Verified a fresh `00 Fresh.png` upload sorts first, becomes the target of the container-local scroll engine, and settles at the top boundary from a deeply scrolled custom grid.
- Verified matching selected and unselected visual-state classes, overlay masks, and top-right badges in both Cards and Michi, plus horizontal separation from the custom delete button and vertical separation from its source label.
- Verified the synchronized `v4.12.2` title pill and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.12.2.

## [v4.13.0] — 2026-10-21

### Added

- Added an **AI Prompt Generator** rail tool with dedicated InPaint, Restyle, and GridRip templates, disabled read-only prompt fields, compact Lucide copy controls, Clipboard API writes, and success/error toast feedback.

### Changed

- Made both Print Scope choices select their scope and launch the main print routine automatically after the requested 50ms state-settling delay; validation reads the latest compiled scope through a shared ref rather than a stale click-time closure.
- Expanded the shared rail popover footprint from 224px/40vh to 288px/50vh so print, layout, material, shortcut, and prompt content retain readable non-wrapping lines.
- Removed the standalone scale trigger and vertical scale dialog; Card size now owns a horizontal 80–125% range, inline percentage heading, endpoint parameters, double-click reset, and compact reset control directly below its preset selector.
- Centered the active crop-reposition announcement on both axes with the supplied amber capsule geometry and visual treatment.

### Verified

- Verified exact crop-badge centering with at most 0.008px rounding drift, direct one-card Uploads Only and two-card Include All print invocations, and 288px Print, Card size, and AI tool popovers.
- Verified the embedded card scale changes from 100% to 110% and resets to 100%, with no standalone scale trigger or vertical range remaining.
- Verified all three prompt values, disabled prompt fields, Clipboard API payloads, corresponding success toasts, the synchronized `v4.13.0` title pill, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Reverified four-page dynamic custom output with all 32 slices, merged horizontal/2×2/3×3 print slicing, catalogue scroll memory, lookahead/removal targeting, fresh-upload alignment, and uniform catalogue selection frames.
- Advanced package and lockfile metadata to v4.13.0.

## [v4.13.1] — 2026-10-21

### Fixed

- Added a rendered-size guard to the delayed first-unplaced scroll engine so permanently mounted catalogue containers abort when their Tailwind-hidden panel resolves to zero width and height.
- Prevented stale 150ms Cards/Michi scroll callbacks from calculating hidden geometry, invoking smooth scrolling, or requesting TCGdex lookahead after a rapid tab reversal.
- Retained first-unplaced alignment and automatic catalogue pagination when the requested container remains visible.

### Verified

- Verified rapid Michi-to-Cards reversal suppresses the stale hidden Michi callback while the visible Cards catalogue still targets `tcg-1` exactly once.
- Verified a settled Michi activation still targets `custom-1`, both inactive containers report 0×0 geometry, the synchronized `v4.13.1` title pill remains unchanged in style, and browser errors remain empty at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.13.1.

## [v4.14.0] — 2026-10-21

### Added

- Added exact, case-sensitive filename replacement for local uploads: a matching custom asset reuses its historical ID instead of creating a duplicate pool row.
- Added batch-aware filename coalescing so repeated same-name files in one picker result resolve to one asset ID and the final binary payload.

### Changed

- Deep replacement now overwrites the existing IndexedDB blob record or localStorage data URL, swaps the live `images` dictionary source, revokes superseded blob URLs, preserves binder slot/page assignments, and refreshes every mounted binder image using that asset ID.
- Custom inventory keys now include the requested dynamic image-source length so overwrite-driven source changes can remount their panel row immediately.
- Permanent custom deletion now waits 60ms for the sorted React grid to remove its old frame before scheduling the shared 150ms first-unplaced coordinate pass.
- Upload completion feedback distinguishes newly added images from refreshed same-name assets.

### Verified

- Verified three-viewport `Replace.png` overwrite retains `custom-1`, keeps exactly 30 pool rows, replaces the 77-byte IndexedDB PNG payload, changes the placed binder image source, preserves the `0-0` slot assignment, and remounts the custom row.
- Verified the IndexedDB-unavailable path updates the same historical ID and binder slot with a persisted PNG data URL without creating a duplicate.
- Verified permanent deletion removes the overwritten row, binder assignment, and IndexedDB record, then targets the first remaining unplaced asset `custom-11` at its 764px grid coordinate after the requested macro delay.
- Reverified fresh upload behavior, synchronized `v4.14.0` title styling, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.14.0.

## [v4.14.1] — 2026-10-21

### Fixed

- Returned the active crop-reposition instruction to the frame's top-center 8px inset and centered its text with an explicit flex alignment shell.
- Removed the redundant **Open print dialog** primary action and passive selected-radio treatment from Print / PDF; **Include all** and **Uploads only** are now visually identical command blocks that set scope and launch printing directly.
- Expanded every shared rail popover to a 400px desktop footprint with a 60vh ceiling.
- Reanchored shared rail popovers from `top-0`/right-origin to `bottom-0`/bottom-right-origin so panels grow upward from each trigger and remain clear of the timeline boundary as the drawer opens or collapses.

### Verified

- Verified the reposition pill stays horizontally centered at an exact 8px top inset with computed flex, centered alignment and no browser errors.
- Verified Print / PDF exposes no primary print-dialog button, radio roles, `aria-checked` state, or selected indicator; direct Uploads Only and Include All commands compile one and two placed cards respectively.
- Verified Print / PDF, Card size, and AI Generation Tools resolve to 400px widths, exact 60vh ceilings, and zero bottom-anchor drift with the timeline both expanded and collapsed at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.14.1.

## [v4.15.0] — 2026-10-21

### Added

- Added uninterrupted background first-unplaced scrolling across Cards/Michi transitions: delayed container-local coordinate passes now continue whether their source panel is active, fading, or fully transparent.
- Added 150ms cross-fade transitions between the two permanently mounted catalogue layers while preserving native inner scrolling and DOM identity.

### Changed

- Replaced inactive `hidden` display removal with the requested `opacity-0 absolute inset-0 pointer-events-none select-none` layer treatment; active panels use `opacity-100 relative` and remain the sole flex participant.
- Removed the zero-size early return from `scrollToNextUnplacedCard`, allowing hidden-source hydration, upload, removal, and lookahead callbacks to complete against measurable panel geometry.
- Added `aria-hidden` and `inert` to inactive opacity layers so invisible search, upload, and card controls remain excluded from keyboard focus and the accessibility tree without sacrificing layout measurements.

### Verified

- Verified both active and inactive panel wrappers retain nonzero dimensions at all three target viewports, with exact requested active/inactive classes and accessibility isolation.
- Verified a rapid Michi-to-Cards reversal still completes the fading Michi `custom-1` pass, while visible Cards targets `tcg-1`; a fresh upload then targets its first alphanumeric Michi row while that panel is fully opacity-zero.
- Verified native Cards/Michi offsets restore to 520px and 360px after repeated swaps, synchronized `v4.15.0` title styling remains unchanged, and browser errors remain empty at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.15.0.

## [v4.15.1] — 2026-10-21

### Fixed

- Replaced rigid top/bottom rail-popover anchoring with the requested trigger-relative `top-1/2 -translate-y-1/2` midpoint track and restored symmetric `origin-right` scaling.
- Expanded the shared vertical ceiling from 60vh to 80vh, added `min-h-fit`, increased padding and panel gaps, and strengthened the popover shadow.
- Hid internal scrollbar chrome through standard and WebKit-specific rules while retaining independent `overflow-y-auto` scrolling.

### Verified

- Verified Print / PDF, Card size, and AI Generation Tools all resolve to the exact shared class contract, 400px width, exact 80vh ceiling, hidden scrollbar treatment, and zero vertical center drift from their trigger wrappers.
- Reverified direct Uploads Only and Include All print compilation, top-centered reposition guidance, synchronized `v4.15.1` title styling, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.15.1.

## [v4.16.0] — 2026-10-21

### Added

- Added global premium InPaint and Restyle prompt dictionaries, including the full multi-reference compositing, boundary-lock, spatial-isolation, scale, redraw, lighting, and environment-interaction instructions supplied for the InPaint workflow.
- Added a layout-aware GridRip compiler in the main state component: 2×2 emits a 2×2/2:3 canvas contract, while 3×3 and 4×3 emit the requested 3×3/3:4 contract with shared extraction, seam continuity, cleanup, transparency, and one-pixel cut-line instructions.
- Added dedicated copy actions and layout-labelled success toasts for all three prompt families.

### Changed

- Replaced the prior short static AI prompt cards with selectable full-text prompt containers under the `ai-prompts` rail state.
- Wired the main component's live `settings.layout` prompt compiler into `RightControlRail`, so GridRip preview and clipboard output update immediately after a grid change.

### Verified

- Verified exact 2,743-character InPaint and 390-character Restyle display/copy payloads, plus exact 1,424-character GridRip payloads for 3×3, 2×2, and 4×3 states.
- Verified five Clipboard API writes in source order, all corresponding success toasts, removal of the superseded short InPaint template, the unchanged centered 400px AI popover contract, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.16.0.

## [v4.16.1] — 2026-10-21

### Changed

- Standardized the InPaint, Restyle, and GridRip preview containers on the same left-aligned monospace typography, preserved whitespace, normal tracking, and 160px overflow ceiling.
- Removed the parenthetical power-pole direction from the end of the InPaint environment-interaction instruction so the prompt concludes at “narratively intentional.”

### Verified

- Verified all three previews expose the exact shared class contract and compute to a 160px maximum height, pre-wrapped whitespace, and left-aligned text.
- Reverified exact displayed and copied prompt content, live 3×3 → 2×2 → 4×3 GridRip transitions, five Clipboard API writes, success toasts, and zero browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.16.1.

## [v4.17.0] — 2026-10-21

### Added

- Added a compact remote-asset form directly below Michi's local-upload capsule for streaming public image links into the custom pool without a page reload.
- Added safe URL parsing and direct-download normalization for Google Drive `/d/` and `?id=` shares, Dropbox `dl=1` shares, and ordinary public image URLs.
- Added asynchronous remote fetch ingestion with immediate saving/fetching feedback, HTTP and image MIME validation, decoded/sanitized filename derivation, `.png` fallback extensions, native `File` construction, and reuse of the existing `addFiles` persistence and first-unplaced-scroll pipeline.
- Added explicit invalid-URL, non-image, network/CORS, and non-success HTTP feedback while retaining a clean console error for operational failures.

### Fixed

- Aliased the Lucide `File` icon import to `FileIcon`, preventing it from shadowing the browser-native `File` constructor used by remote and TCGdex blob ingestion.

### Verified

- Verified direct, Dropbox, and Google Drive requests resolve respectively to the original normalized URL, `dl=1`, and `https://drive.google.com/uc?export=download&id=…` targets.
- Verified extension fallback and preserved-extension filenames, three successful image imports, exact invalid/non-image/failure toasts, the expected operational error log, and no unexpected browser errors.
- Verified remote-control geometry remains unchanged while a delayed stream is in flight and all three imported blobs survive a persisted reload at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.17.0.

## [v4.18.0] — 2026-10-21

### Added

- Added token-free Imgur album/gallery deconstruction for `/a/{id}` and `/gallery/{id}` links, extracting public media URLs from the returned text-decoded JSON payload.
- Added direct `.png`, `.jpg`, `.jpeg`, and `.webp` URL support through the same Imgur collector.
- Added concurrent `Promise.all` streaming across album media, per-asset HTTP/blob/native-`File` conversion, MIME filtering, decoded and sanitized terminal-path filenames, and content-type-aware fallback extensions.
- Added scanning and media-count progress notifications before routing each surviving batch through the existing durable `addFiles` persistence and first-unplaced-scroll pipeline.

### Changed

- Replaced the general single-file Google Drive/Dropbox/direct URL transformer, handler prop, and sidebar form with the focused bulk Imgur album streamer and `addFilesFromAlbum` contract.
- Failed individual media streams now drop out of otherwise valid batches, while total album/API/CORS failures report the dedicated public-album recovery message and clean console diagnostics.

### Verified

- Verified exact Imgur form classes/copy, album and gallery ID routing, direct-image routing, a four-item album scan with two valid concurrent imports, JPEG fallback naming, partial HTTP and non-image filtering, and progressive count feedback.
- Verified invalid links and total stream/API failures preserve the pool and display their exact error messages; all expected operational/network diagnostics were isolated from unexpected browser errors.
- Verified upload and collector geometry remains unchanged while a delayed album scan is active, and four successfully streamed blobs survive a persisted reload at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.18.0.

## [v4.18.1] — 2026-10-22

### Fixed

- Replaced the browser-blocked direct Imgur album API request with an AllOrigins edge-wrapper request for the public album page.
- Expanded hash extraction across `/a/`, `/gallery/`, topic, and five-to-seven-character direct-hash paths while preserving direct PNG/JPG/JPEG/WEBP and adding direct GIF bypass.
- Added embedded `hash`/`ext` metadata scraping, parent-cover exclusion, URL deduplication, and query-stripped Open Graph image fallback recovery.
- Contained URL, proxy JSON, and scraping faults inside `fetchImgurAlbumImages` with the requested founder-engine diagnostic while leaving the existing batch queue, notifications, and persistence handler unchanged.

### Verified

- Verified two unique album assets are recovered while duplicate and parent-cover hashes are excluded; verified both Open Graph attribute orders and query stripping through the fallback path.
- Verified album, gallery, topic, direct-hash, and direct-GIF routing; direct GIF links bypass the proxy while all page routes target the encoded AllOrigins endpoint.
- Verified unchanged fetch-time geometry, exact existing progress/error banners, six streamed assets surviving persisted reloads, expected fault diagnostics, and zero unexpected browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.18.1.

## [v4.19.0] — 2026-10-22

### Added

- Added a native-file ImgBB multipart gateway that posts authentication and image fields concurrently and resolves each successful upload to its direct CDN display URL.
- Added `uploadAndRegisterFiles`, which filters invalid inputs and failed cloud responses, attaches cloud source/identity metadata to native synthetic `File` objects, and forwards successful batches into the unchanged `addFiles` storage pipeline.
- Added cloud-upload routing for the Michi file picker plus sidebar, stage, binder-slot, and timeline-thumbnail native file drops.
- Added a fixed-height Persistent Cloud Backup status panel with the requested ImgBB CDN label and pulsing live-state indicator.

### Changed

- Removed the Imgur/AllOrigins scraper, album-link form, and all associated URL parsing and recovery loops.
- Native file additions now complete cloud upload before entering the existing IndexedDB/local-storage fallback and first-unplaced-scroll workflow; TCGdex imports and launch-queue ingestion retain their existing source-specific behavior.

### Verified

- Verified multipart POST requests carry key and image fields without manually overriding the browser-generated boundary, while direct CDN URLs produce valid cloud descriptors.
- Verified concurrent two-file uploads, successful filtering of one failed item from a mixed batch, total-failure containment, exact progress/completion/error banners, and no accidental local registration for failed uploads.
- Verified file-picker, sidebar, stage, binder-slot, and timeline-thumbnail upload paths; status-panel and upload-box geometry remain unchanged during delayed cloud writes, and seven successful assets survive persisted reloads at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.19.0.

## [v4.20.0] — 2026-10-22

### Added

- Added `pullAssetsFromImgBBCloud`, which validates an ImgBB username, fetches its public profile through the encoded AllOrigins gateway, normalizes escaped page markup, and extracts direct ImgBB CDN image URLs.
- Added deduplicated concurrent cloud downloads with HTTP/MIME validation, native `File` reconstruction, safe terminal-path filenames, partial-failure isolation, and batch forwarding through the existing `addFiles` pipeline.
- Added a compact Sync Down username form inside the Persistent Cloud Backup panel with connecting, success-count, and failure feedback.
- Added dynamic fixed-footprint CLOUD and LOCAL source badges; persisted ImgBB/ibb CDN sources use the emerald cloud treatment while non-cloud custom assets retain the muted local treatment.

### Changed

- Extended the existing optional pool `src` contract so cloud uploads and rehydrated files retain their direct recovery URL and supplied cloud identity while IndexedDB remains the primary runtime image source.
- Cloud source URLs now remain the persistence fallback in both IndexedDB and local-storage modes without changing the schema version or disturbing local-only and TCGdex source behavior.

### Verified

- Verified escaped and plain ImgBB CDN extraction, duplicate URL suppression, one failed download filtered from a three-asset profile, and the exact two-asset rehydration success count.
- Verified invalid usernames, empty public profiles, proxy failures, and individual asset failures remain contained with expected diagnostics and no pool mutation.
- Verified one LOCAL and three CLOUD badges before and after reload, exact badge variants, unchanged panel/upload geometry during delayed synchronization, and zero unexpected browser errors at 1600×1000, 1366×768, and 1200×700.
- Advanced package and lockfile metadata to v4.20.0.

## [v4.20.1] — 2026-10-22

### Changed

- Replaced the fixed final global-canvas aspect-ratio sentence in both GridRip generation branches with the requested instruction to preserve every edge and dynamically expand the outer canvas around the complete grid.
- Kept the individual-card 2:3 ratio, grid dimensions, seam continuity, transparent spacing, and layout-aware 2×2 versus shared 3×3/4×3 content unchanged.

### Verified

- Verified the new boundary-expansion sentence occurs exactly twice and both obsolete final global-canvas aspect-ratio instructions are absent.
- Reverified the generated and copied GridRip text for 2×2, 3×3, and 4×3 layouts, synchronized the title pill, and advanced package and lockfile metadata to v4.20.1.

## [v4.20.2] — 2026-10-22

### Fixed

- Replaced the absolutely overlaid Sync Down action with a vertically stacked, full-width input and Pull from Cloud button separated by a deterministic six-pixel gap.
- Shortened the username placeholder and increased the field/button heights to 32px, eliminating text overlap and clipping across supported desktop viewport heights.
- Made the global save badge inspect the live pool: settled local-only state now remains neutral as “Saved locally,” while persisted ImgBB/ibb assets switch it to emerald “Saved to Cloud” with the matching indicator dot.
- Routed the pool through `AppBar` and `SaveStatus` without changing any persistence writes, save timing, upload behavior, or cloud rehydration data structures.

### Verified

- Verified the exact requested panel, input, and full-width CTA classes, no legacy absolute action, and a measured six-pixel vertical control gap at 1600×1000, 1366×768, and 1200×700.
- Verified local-only neutral header state, saving state, cloud-emerald settled state, persisted “Saved to Cloud” recovery after reload, synchronized v4.20.2 title pill, and zero browser errors.
- Advanced package and lockfile metadata to v4.20.2.

## [v4.20.3] — 2026-10-22

### Fixed

- Reworked downstream ImgBB synchronization around the primary `https://<username>.imgbb.com/` profile stream instead of relying on an album subpath that does not expose raw public-media hashes.
- Sent the encoded root-profile URL through the valid AllOrigins JSON gateway and retained normalization for escaped slash and HTML-entity forms found in embedded frontend metadata.
- Narrowed primary extraction to direct `i.ibb.co` image assets, deduplicated repeated profile references, and added the requested `thumb.ibb.co` to `i.ibb.co` fallback conversion when direct paths are hidden.
- Kept concurrent blob-to-`File` reconstruction while retaining each direct CDN URL on its synthetic file, preserving CLOUD inventory labels and the global Saved to Cloud status after persistence and reload.
- Preserved the full-width Pull from Cloud controls and left the pool-aware header badge implementation unchanged.

### Verified

- Verified the exact encoded root-profile target, duplicate suppression, direct URL extraction, escaped-direct URL normalization, legacy thumbnail fallback conversion, successful concurrent ingestion, and persisted cloud-header restoration at 1600×1000, 1366×768, and 1200×700.
- Verified the full-width Pull from Cloud button contract, neutral local-to-emerald cloud status transition, zero control overlap, zero unexpected browser errors, and unchanged runtime dependencies.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.20.3.

## [v4.20.4] — 2026-10-22

### Fixed

- Replaced the downstream profile loader’s open-proxy `fetch`/JSON execution sequence with a dynamically named JSONP callback and transient script element, avoiding browser CORS handling on profile payload collection.
- Lowercased trimmed usernames, targeted the primary `https://<username>.imgbb.com/` stream, and encoded that URL into the JSONP request with a unique callback name.
- Added deterministic callback cleanup that removes the transient script and deletes its temporary global as soon as the profile payload resolves or fails.
- Replaced the previous escaped-markup and thumbnail parser with direct `i.ibb.co` media extraction plus deduplicated native `ibb.co/<hash>` viewer-link fallback derivation.
- Retained concurrent image streaming and persisted each reconstructed file’s CDN source pointer so CLOUD labels and the global Saved to Cloud state survive reload.
- Preserved the full-width Pull from Cloud control geometry and the existing pool-aware header badge implementation.

### Verified

- Verified direct duplicate suppression, native viewer-link fallback, direct WEBP ingestion, lowercased root-profile targeting, callback naming and teardown, one-request streaming, and persisted cloud-header restoration at 1600×1000, 1366×768, and 1200×700.
- Verified six-pixel non-overlapping cloud-control spacing, exact full-width CTA classes, zero unexpected browser errors, unchanged runtime dependencies, and retained GridRip boundary instructions.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.20.4.

## [v4.20.5] — 2026-10-22

### Fixed

- Removed the complete downstream public-profile HTML, JSONP, callback-global, viewer-path, and open-proxy parsing sequence from `pullAssetsFromImgBBCloud`.
- Rebased cloud rehydration on unique persisted ImgBB upload sources already held in the pool ledger, including both website-hosted and direct `i.ibb.co` CDN forms.
- Added a device-session vault fallback for cases where the active pool has no tracked cloud source, with type filtering and a final deduplication pass before streaming.
- Appended each successful authenticated upload URL to `imgbb_cloud_sync_vault` without duplicates while allowing hardened privacy contexts to continue through durable pool persistence when session storage is unavailable.
- Retained concurrent image streaming and attached every source URL to its reconstructed synthetic file, preserving CLOUD inventory labels and the global Saved to Cloud state after persistence and reload.
- Preserved the full-width Pull from Cloud control geometry and the pool-aware header badge implementation without layout changes.

### Verified

- Verified persisted-pool ingestion, direct-CDN recognition, session-vault fallback filtering and deduplication, empty-ledger guidance, fresh-upload vault tracking, replacement ingestion, and reload restoration at 1600×1000, 1366×768, and 1200×700.
- Verified zero AllOrigins requests, six-pixel non-overlapping cloud-control spacing, exact full-width CTA classes, zero unexpected browser errors, unchanged runtime dependencies, and retained GridRip boundary instructions.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.20.5.

## [v4.20.6] — 2026-10-22

### Fixed

- Replaced device-local pool/session-vault retrieval with a public manifest registry that works from an entirely blank browser cache or a fresh device.
- Removed every `imgbb_cloud_sync_vault` read/write, the obsolete username lookup contract, and all remaining profile-scraping or proxy assumptions from the downstream path.
- Added direct plain-text manifest fetching, bounded global extraction of `i.ibb.co` PNG/JPG/JPEG/WEBP sources, empty-entry filtering, duplicate suppression, and query-string preservation.
- Added concurrent direct-image downloads with response and MIME validation, safe trailing-path filenames, partial-failure isolation, and durable CDN source pointers on reconstructed files.
- Rewired the cloud form to `cloudManifest`, added the public-manifest URL placeholder and accessible label, and retained the exact stacked panel, full-width 32px input/button, and six-pixel control gap.
- Preserved the cloud-first multi-upload path, pool persistence structures, CLOUD labels, and global Saved to Cloud behavior without adding runtime dependencies.

### Verified

- Verified blank-cache two-asset manifest ingestion with duplicate suppression, fresh-device embedded-manifest parsing with a query-bearing CDN URL, empty-manifest recovery, and a subsequent two-file authenticated upload at 1600×1000, 1366×768, and 1200×700.
- Verified one manifest fetch per submission, zero AllOrigins requests, complete session-vault removal, six-pixel non-overlapping controls, exact full-width CTA classes, reload restoration, zero unexpected browser errors, and retained GridRip boundary instructions.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.20.6.

## [v4.20.7] — 2026-10-22

### Fixed

- Replaced the public-manifest URL fetcher and form controls with a zero-network clipboard document deconstructor that accepts raw pasted ImgBB account-page text.
- Added direct `i.ibb.co` PNG/JPG/JPEG/WEBP extraction, bounded recovery from dense multiline dumps, empty-entry filtering, and complete URL deduplication.
- Made each non-empty paste authoritative for cloud-backed uploads: CDN entries absent from the pasted set are removed from the pool, binder placements, crop map, selection/editing state, image cache, history, and IndexedDB while local-only and TCGdex assets remain intact.
- Added concurrent direct-image reconstruction with response/MIME validation, decoded safe filenames, stable IDs for retained cloud cards, and collision-safe names that cannot overwrite standalone local uploads.
- Replaced the manifest input/button with the requested 64px self-clearing clipboard textarea and Real-Time Clipboard Sync metadata while retaining the exact fixed-width panel shell.
- Preserved cloud source pointers on every reconstructed file so CLOUD labels and the global Saved to Cloud status remain correct after persistence and reload.

### Verified

- Verified blank-cache four-asset concurrent ingestion and duplicate suppression, authoritative stale cloud pool/slot removal, retained local-only slots, retained cloud IDs, invalid-paste recovery, and reload restoration at 1600×1000, 1366×768, and 1200×700.
- Verified immediate textarea clearing, unchanged panel dimensions during synchronization, removal of the manifest URL and Pull from Cloud controls, zero proxy/manifest requests, zero unexpected browser errors, unchanged runtime dependencies, and retained GridRip boundary instructions.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.20.7.

## [v4.21.0] — 2026-10-22

### Added

- Added `syncPoolFromLocalDirectory(fileListObjects)`, a strict pool-aware directory reconciler that flattens native file selections, filters `.DS_Store`, `Thumbs.db`, `desktop.ini`, AppleDouble artifacts, and non-image nodes, then forwards valid image batches through the existing IndexedDB/local-storage pipeline.
- Added authoritative filename reconciliation for mounted directories: custom uploads absent from the selected folder are removed from the pool, binder placements, crops, selection/editing state, object-URL cache, history, and IndexedDB while matching custom IDs and every TCGdex asset remain intact.
- Added a hidden multi-file `webkitdirectory`/`directory` picker, a self-resetting **Mount Local Hub Folder** trigger, and the compact **Asset Folder Connection / Native Disk Directory** panel beneath manual upload.
- Added the settled global status **Local Hub Sync Active** with the requested zinc text and steady neutral indicator while preserving saving and failure precedence.

### Removed

- Removed the embedded ImgBB credential, multipart upload helper, remote-first manual picker/drop routing, profile/proxy scrapers, JSONP callbacks, manifest fetching, clipboard URL parsing, direct CDN downloads, cloud source IDs, CLOUD badges, and pool-aware cloud header overrides.
- Removed every online custom-asset request path; manual picker/drop ingestion now writes native image files directly through `addFiles` without a network prerequisite.

### Verified

- Verified blank-cache mounting of 24 images in one directory selection, system-artifact rejection, exact-filename refresh, stale custom pool/slot deletion, matching custom-ID retention, TCGdex pool/placement retention, metadata-only empty-directory clearing, picker reset, and reload restoration at 1600×1000, 1366×768, and 1200×700.
- Verified fixed panel dimensions during synchronization, exact directory attributes and CTA classes, all custom-card badges rendered LOCAL, local-hub header styling, zero ImgBB/AllOrigins/manifest requests, zero unexpected browser errors, unchanged runtime dependencies, and retained GridRip boundary instructions.
- Advanced package, lockfile, and title-pill metadata to v4.21.0.

## [v4.21.1] — 2026-10-22

### Fixed

- Upgraded the image database to schema v2 with a dedicated `directory-handles` store and persisted the active browser `FileSystemDirectoryHandle` separately from image records.
- Restored valid cached directory handles on startup, including permission-state validation, while deleting denied tokens instead of presenting a false linked state.
- Added recursive handle traversal and a one-click **Sync** action that rereads nested files through the existing authoritative filename reconciliation pipeline.
- Added `unlinkDirectoryHandle()`, which immediately clears the in-memory handle and linked state, resets the fallback picker, deletes the cached IndexedDB token, and preserves every rendered pool asset, placement, and persistence payload.
- Added the requested low-contrast **Disconnect Folder** micro-action and a reserved disconnected placeholder footprint so Mount and Sync states occupy identical panel geometry.
- Added a fixed-width global status footprint: disconnected settled state is red **No Folder Picked**, while a linked settled state remains zinc **Local Hub Sync Active**; saving and failure precedence remain unchanged.
- Retained the hidden `webkitdirectory` fallback for browsers without `showDirectoryPicker`; only persistable native handles activate linked Sync/Disconnect state.

### Verified

- Verified native handle selection, dedicated-store caching, recursive initial import, same-session resync after deleting one disk file and adding another, stale pool reconciliation, and local ID retention at 1600×1000, 1366×768, and 1200×700.
- Verified immediate unlink state, cached-token deletion, fallback-input reset, unchanged localStorage pool IDs, rendered-asset survival after unlink and reload, zero panel/action/header width shifts, zero online cloud requests, and zero unexpected browser errors.
- Advanced package, lockfile, and title-pill metadata to v4.21.1.

## [v4.22.0] — 2026-10-22

### Added

- Added a centralized versioned binder repository with independent binder IDs, names, selected card sets, settings, page/sheet trees, pool metadata, raw-USD prices, active pages, and creation/update timestamps.
- Added the locked blurred workspace-activation wizard for a fresh repository and explicit creation, including binder title, 2×2/3×3/4×3 grid selection, bounded 1–100 page count, manual-or-TCGdex set selection, JSON backup restoration, and the **Launch Workspace Canvas** action.
- Added the horizontal browser-tab workspace strip above the primary viewport, including active/inactive binder states, binder name and grid metadata, the active local-folder indicator, native horizontal overflow, and the terminal Lucide Plus trigger.
- Added atomic active-workspace switching so the canvas, source sidebar, toolbar, valuation, bottom timeline, selection, crop editor, history, and catalogue filter rehydrate from one binder without remounting either source-tab tree.
- Added JSON restoration through `#wizard-backup-picker`; repository-shaped backups restore the selected/first binder and legacy single-binder snapshots restore directly into a new uniquely identified workspace.

### Migrated

- Migrated valid `digital-card-binder:v1` snapshots non-destructively into a named **My Collection Binder** record under `digital-card-binder:repository:v1`, retaining physical sheets, settings, pool data, placements, crops, prices, and the active page.
- Upgraded IndexedDB to schema v3 and namespaced every new image record by binder and asset ID while retaining canonical asset IDs inside records; legacy unscoped records referenced by the migrated binder are adopted into its namespace and removed only after the scoped copy succeeds.
- Kept the native directory permission token in its dedicated global store so folder authorization and Sync/Disconnect state survive binder changes, while directory reconciliation and binary deletion target only the active binder's pool.
- Replaced legacy direct snapshot writes and global image-store reset with debounced active-record repository commits and binder-scoped cleanup.

### Verified

- Verified fresh zero-repository activation, two independently configured workspaces, 2×2 and 4×3 canvas/toolbar/timeline switching, isolated sidebar uploads, scoped IndexedDB keys, active-ID persistence, reload hydration, terminal Plus creation, JSON restoration, and zero top-band layout shift at 1440×900.
- Verified a 24 MiB in-flight upload remains owned by its initiating binder when the user switches workspaces before IndexedDB completion; the destination binder's pool and binary namespace remain untouched.
- Verified legacy single-binder metadata migration plus legacy unscoped-blob adoption, with placements and layout preserved and the old localStorage key retired after successful hydration.
- Verified active-only reset leaves a second binder's metadata and image blob intact.
- Re-ran native directory handle caching, recursive synchronization, unlink token deletion, asset preservation, fixed panel/header footprints, and zero-error checks at 1600×1000, 1366×768, and 1200×700.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.22.0 without changing runtime dependencies.

## [v4.22.1] — 2026-10-22

### Fixed

- Removed the parallel boolean folder flag and made `Boolean(directoryHandle)` the single source of truth for linked state, preventing header/sidebar drift from the native handle actually held in memory or restored from IndexedDB.
- Made a denied Sync permission clear both the live directory handle and its cached token so the interface immediately returns to the disconnected state instead of advertising stale access.
- Replaced the header's persistence-status multiplexing with the exact folder-health contract: pulsing red **No Folder Picked** while unlinked and pulsing emerald **Folder Connected** while a native handle is active.
- Replaced the sidebar copy with **Cloud-Free Storage / CUSTOM CARD ART FOLDER** and consolidated its primary action into the exact **Link Folder / Sync** mutating button route.
- Renamed and wired the disconnect action as `handleDisconnectFolder`; it clears the native handle and IndexedDB token while preserving rendered assets, binder records, background data, and the fixed action footprint.

### Verified

- Verified exact red/green label and marker classes, Link Folder-to-Sync mutation, disconnect copy/classes, and native picker/sync routing.
- Re-ran cached-handle storage, recursive folder reconciliation after one deletion and one addition, active upload retention, token deletion, red-state restoration, and reload survival at 1600×1000, 1366×768, and 1200×700.
- Verified unchanged action-panel/header geometry between linked and unlinked states, zero unexpected browser errors, and no multi-binder tab-strip modification.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.22.1 without changing runtime dependencies.

## [v4.22.2] — 2026-10-22

### Fixed

- Replaced the single global native folder handle with a binder-keyed runtime handle map, so the active header/sidebar state is derived from `Boolean(activeBinder?.directoryHandle || currentDirectoryHandle)` and changes immediately during tab activation.
- Upgraded IndexedDB to schema v4 and stored each native `FileSystemDirectoryHandle` under `binder-directory:{binderId}` with binder ID, folder name, and update metadata; the prior `active-directory` token migrates once into the active legacy binder.
- Added serializable `directoryHandleKey` and `directoryName` fields to binder records while keeping the structured-clone-only native handle inside IndexedDB.
- Scoped Link, Sync, denied-permission cleanup, and Disconnect to the initiating binder. Disconnecting one workspace no longer changes another binder's folder token or linked controls.
- Updated the sidebar typography to the exact **Cloud-Free Storage / CUSTOM CARD ART FOLDER** system and revised the creation wizard subtitle, field labels, and restore message to the requested plain-language copy.

### Verified

- Linked two binders to separate native OPFS directory handles, switched tabs repeatedly, and verified immediate red/green header state, Link Folder/Sync/Disconnect mutation, isolated directory assets, and two independent IndexedDB token keys without reloads.
- Verified authoritative Sync on one binder after deleting `beta.png` and adding `gamma.png`, then disconnected only that binder while preserving its rendered pool and the other binder's token, controls, and `alpha.png` asset.
- Verified the exact header, sidebar, primary CTA, disconnect, wizard-copy, repository-metadata, and IndexedDB-key contracts plus fixed panel/action/header geometry and zero browser errors at 1440×900.
- Rebuilt the production bundle and advanced package, lockfile, and title-pill metadata to v4.22.2 without changing runtime dependencies.

## [v4.22.3] — 2026-10-22

### Fixed

- Replaced render-time folder-link derivation with the explicit top-level `const [isFolderLinked, setIsFolderLinked] = useState(false);` state bridge required for reliable React propagation into the header, active binder tab, and Michi folder controls.
- Added active-binder lookahead and a reactive validation effect that require both the binder's canonical `directoryHandleKey` and its own live native directory handle before rendering a linked state, preventing one binder's handle from leaking into another tab.
- Updated successful native Link, active-binder Disconnect, and denied-permission cleanup to drive the bridge immediately while retaining binder-scoped IndexedDB tokens, authoritative directory reconciliation, and existing rendered assets.
- Kept a synchronous binder-keyed handle ref aligned with every runtime handle-map mutation and startup hydration, so rapid tab activation reads the latest handle allocation rather than a stale render closure.

### Verified

- Linked two binders to separate native OPFS directories, alternated between them repeatedly, and verified immediate Folder Connected/No Folder Picked plus Sync/Link Folder propagation without pool or token crossover.
- Verified active permission expiry and Disconnect each return to the unlinked state, purge only the initiating binder's token, preserve its rendered custom assets, and leave the other binder's state untouched.
- Verified the exact status, folder panel, primary CTA, and low-contrast disconnect copy/classes; measured unchanged header and folder-action rectangles across linked and unlinked states; and observed zero page or console errors at 1440×900.
- Re-ran legacy repository migration, active-only reset isolation, and a 24 MiB in-flight upload/binder-switch race; rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.3 without changing dependencies.

## [v4.22.4] — 2026-10-22

### Fixed

- Removed the effect-driven folder-link mirror state and replaced it with a memoized single-source-of-truth selector over `directoryHandles[activeBinderId]`, eliminating the extra render/effect cycle between native handle changes and header/sidebar output.
- Made successful Link synchronously patch the initiating binder's `directoryHandleKey` and `directoryName` in React state immediately after updating the binder-keyed handle map, while retaining the centralized persisted metadata update.
- Made Disconnect synchronously clear those same binder metadata fields alongside the runtime handle deletion before removing the IndexedDB permission token.
- Removed obsolete startup, permission-expiry, and binder-activation boolean setter paths; all linked-state consumers now receive the same raw-handle projection without parallel state drift.

### Verified

- Linked two binders to separate native OPFS directories, repeatedly alternated between linked and unlinked workspaces, and verified immediate header, active-tab indicator, Sync/Link Folder, and Disconnect updates without cross-binder leakage.
- Verified denied permission and Disconnect purge only the initiating token, preserve rendered custom assets, retain the other binder's token and pool, and produce no page or console errors.
- Rechecked exact folder copy/classes and unchanged header/folder-action rectangles across both states at 1440×900.
- Re-ran legacy repository migration, active-only reset isolation, and the 24 MiB in-flight upload/binder-switch race; rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.4 without changing dependencies.

## [v4.22.5] — 2026-10-22

### Fixed

- Confirmed the AppBar, active binder tab, and Michi folder actions all consume the same memoized `isFolderLinked` projection directly, with no binder-record override or parallel boolean state.
- Retained synchronous Link and Disconnect updates to the binder-keyed handle map and serializable binder metadata.
- Added an activation-time directory-handle map rebroadcast inside `hydrateBinderWorkspace`, forcing every handle-dependent memo and consumer to re-evaluate when a workspace becomes active even when its native handle object is unchanged.

### Verified

- Linked two binders to separate native OPFS directories, switched repeatedly between them, and verified immediate status badge, active-tab folder glyph, Sync/Link Folder, and Disconnect rendering without state crossover.
- Verified active permission expiry and Disconnect purge only the initiating binder's permission token while preserving rendered custom assets and the other binder's handle and pool.
- Rechecked exact copy/classes, unchanged header and folder-action rectangles, legacy migration, active-only reset isolation, and the 24 MiB upload-switch race with no page or console errors.
- Rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.5 without changing dependencies.

## [v4.22.6] — 2026-10-22

### Fixed

- Replaced the memoized folder-health selector with the direct computed constant `Boolean(currentDirectoryHandle && currentDirectoryHandle.kind === 'directory')`, leaving the active binder's handle map as the only render source of truth.
- Confirmed the obsolete `isFolderLinked` state hook, synchronization effect, and setter calls remain fully absent from Link, Sync, Disconnect, startup hydration, and workspace activation paths.
- Ordered startup hydration to publish `hydratedHandles` into React state before synchronizing `directoryHandlesRef`, so the interface and native callback reference receive the same complete binder-keyed map in one initialization pass.

### Verified

- Linked two binders to separate native OPFS directories, repeatedly switched between them, and verified immediate top-bar status, active-tab folder glyph, Sync/Link Folder, and Disconnect updates without cross-binder state leakage.
- Verified permission expiry and Disconnect purge only the initiating binder's token while preserving rendered assets and the unrelated binder's handle and pool.
- Rechecked exact copy/classes, zero linked/unlinked layout shift, legacy migration, active-only reset isolation, and the 24 MiB upload-switch race with no page or console errors.
- Rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.6 without changing dependencies.

## [v4.22.7] — 2026-10-22

### Fixed

- Replaced the Michi sidebar's `isFolderLinked` primitive prop with the active binder's `currentDirectoryHandle`, eliminating an intermediate sidebar status value.
- Bound the sidebar's Link Folder/Sync label and Disconnect rendering directly to `Boolean(currentDirectoryHandle)` while retaining the top-level computed folder health for AppBar and active-tab presentation.
- Confirmed Link and Disconnect continue replacing the top-level `directoryHandles` object and synchronizing `directoryHandlesRef` in the same functional state update, preserving immediate React propagation and native-callback consistency.

### Verified

- Linked two binders to separate native OPFS directories, repeatedly switched between them, and verified immediate AppBar status, sidebar Link/Sync/Disconnect, and active-tab glyph updates without cross-binder leakage.
- Verified denied permission and Disconnect purge only the initiating binder's token while preserving rendered custom assets and the unrelated binder's handle and pool.
- Rechecked exact folder copy/classes, zero linked/unlinked layout shift, legacy migration, active-only reset isolation, and the 24 MiB upload-switch race with no page or console errors.
- Rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.7 without changing dependencies.

## [v4.22.8] — 2026-10-22

### Fixed

- Moved `activeBinderIdRef.current = target.id` to the start of `hydrateBinderWorkspace`, immediately after sanitizing the target binder, before any workspace reset, state hydration, or asynchronous follow-up can observe the active workspace channel.
- Scheduled `setActiveBinderIdState(target.id)` alongside that early ref assignment so render-time selectors and native callback handlers converge on the same binder during the activation batch.
- Added the same synchronous ref alignment in `commitAndActivateBinder` immediately before hydration as a fallback boundary around repository persistence.
- Removed the trailing duplicate active-ID assignments and the forced `setDirectoryHandles` map clone from workspace hydration, eliminating the redundant broadcast and its extra render work.

### Verified

- Linked two binders to separate native OPFS directories, repeatedly switched between them, and verified immediate AppBar status, sidebar Link/Sync/Disconnect, and active-tab glyph updates without cross-binder ID or handle leakage.
- Verified denied permission and Disconnect purge only the initiating binder's token while preserving rendered custom assets and the unrelated binder's handle and pool.
- Rechecked exact folder copy/classes, zero linked/unlinked layout shift, legacy migration, active-only reset isolation, and the 24 MiB upload-switch race with no page or console errors.
- Rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.8 without changing dependencies.

## [v4.22.9] — 2026-10-22

### Fixed

- Changed `currentDirectoryHandle` and `isFolderLinked` to index `directoryHandles` directly with `activeBinderIdState`, removing the render path's dependency on the active-ID alias and native-handle property inspection.
- Changed Link and Disconnect to capture `activeBinderIdState` as their target binder and added that state to both callback dependency lists.
- Simplified successful Link to return a fresh handle-map object directly from its functional state update and simplified Disconnect to delete from a fresh shallow copy, leaving React state as the render broadcast authority.
- Removed synchronous `directoryHandlesRef` mutations from Link and Disconnect; the render pass continues to mirror committed state into the ref for native callback consumers.

### Verified

- Linked two binders to separate native OPFS directories, repeatedly switched between them, and verified immediate AppBar status, sidebar Link/Sync/Disconnect, and active-tab glyph updates without cross-binder handle leakage.
- Verified denied permission and Disconnect purge only the initiating binder's token while preserving rendered custom assets and the unrelated binder's handle and pool.
- Rechecked exact folder copy/classes, zero linked/unlinked layout shift, legacy migration, active-only reset isolation, and the 24 MiB upload-switch race with no page or console errors.
- Rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.9 without changing dependencies.

## [v4.22.10] — 2026-10-22

### Fixed

- Identified the production-only symptom as the unsupported-API fallback path: when `window.showDirectoryPicker` is unavailable, the hidden `webkitdirectory` input imported images successfully but never populated `directoryHandles`, so the header and sidebar correctly remained visually unlinked despite the success toast.
- Added a binder-scoped, session-only fallback directory marker after a successful directory-input selection. It uses the same handle map consumed by AppBar, the active tab, and CardPool, immediately enabling **Folder Connected**, **Sync**, and **Disconnect Folder**.
- Routed fallback Sync back through the hidden directory picker because a `FileList` cannot provide a persistent `FileSystemDirectoryHandle`; choosing the folder again performs the same authoritative reconciliation without pretending a persistent permission token exists.
- Kept native `showDirectoryPicker` handles and their IndexedDB persistence unchanged. Disconnect removes either handle type while preserving already-rendered assets.

### Verified

- Simulated a browser with `window.showDirectoryPicker` unavailable, selected a `webkitdirectory` folder, and verified immediate linked header/sidebar state, imported artwork, Sync repicker behavior, scoped two-binder restoration, Disconnect, and asset preservation.
- Re-ran the native two-directory harness for Link, Sync, permission expiry, token isolation, tab switching, exact copy/classes, and zero layout shift.
- Re-ran legacy repository migration, active-only reset isolation, and the 24 MiB upload-switch race with no page or console errors.
- Rebuilt the production bundle and synchronized package, lockfile, and title-pill metadata at v4.22.10 without changing dependencies.

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

- React state drives rendering, while refs (`pagesRef`, `currentPageRef`, `directoryHandlesRef`, drag/edit/marquee refs, timer refs, and timeline reveal ref) are authoritative inside native events and timers.
- `currentDirectoryHandle` and `isFolderLinked` index the binder-keyed handle map directly with `activeBinderIdState`; there is no folder-health setter, memo cache, synchronization effect, alias lookup, or handle-property read in the health Boolean. The header plus active tab consume the Boolean, while the sidebar receives the same selected handle and renders its actions from its presence. Workspace hydration aligns `activeBinderIdRef` and `activeBinderIdState` before all other target-state mutations.
- This state/ref split exists because multiple drag/drop, pointer, page-add, folder, or tab-switch events can occur before React commits a render. React state is authoritative for folder rendering and Link/Disconnect publish fresh shallow maps; `directoryHandlesRef` mirrors the committed map during render for native callbacks rather than being mutated inside those two state updaters.
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
- Cards and Michi panel trees remain mounted under opacity-layered wrappers, retaining their search/upload controls, measurable geometry, and native scroll nodes. The active layer is relative and fully opaque; the inactive layer is absolute, transparent, pointer-inert, `aria-hidden`, and DOM-inert. Positive remembered offsets restore directly, while zero-memory activation, hydration, uploads, and binder/catalogue data changes can continue first-unplaced targeting in either measurable layer.
- Cards and Michi use the same high-contrast selected ring, scale, brightness, tinted shadow, and translucent frame mask. Their numbered badges occupy the top-right layer; Michi's destructive upload control remains isolated at top-left and its source label shifts beneath a selected badge.
- Local uploads are keyed by exact filename for replacement: a collision retains the custom asset ID, updates its binary/source URL, preserves every slot assignment, and remounts the corresponding inventory row through its dynamic image-source-length key.
- Sidebar typography follows three semantic tiers: 12px medium actions/options, 11px secondary descriptions, and 9px uppercase semibold system context. TCGdex and upload counters are deliberate 10px text-only readout exceptions.
- Search and Card set controls share a 36px height, neutral-950 surface, six-percent white border, six-pixel radius, 12px horizontal padding, six-pixel vertical padding, and 12px medium foreground. The set block sits 14px below search.
- Michi's upload capsule uses a 20px Lucide upload glyph, 24px vertical padding, and neutral hairline hover treatment. Manual picker and native drop inputs write image files directly to local persistence. A compact **Cloud-Free Storage / CUSTOM CARD ART FOLDER** panel sits beneath the capsule: supported browsers cache one `FileSystemDirectoryHandle` per binder in a dedicated IndexedDB store for recursive one-click Sync. Browsers without `showDirectoryPicker` use the self-resetting `webkitdirectory` input and receive a binder-scoped session marker so linked controls update immediately; fallback Sync reopens the picker because no persistent permission handle is available. Linked state adds Disconnect Folder beneath Sync; disconnected state reserves that same footprint beneath Link Folder, preventing panel movement. Each sync is authoritative by exact custom-card filename inside the active binder: missing uploads and their placements are purged, matching IDs are refreshed, system metadata/non-images are ignored, and TCGdex assets remain untouched. Every custom card uses the fixed-footprint muted LOCAL badge. Its zero-asset state is a three-column centered feature callout rather than an unstructured sentence.

### Timeline, rail, and viewport boundaries

- The header is 48px tall and owns identity, sidebar toggle, active-binder folder health, and the centralized Zen Mode toggle. A separate 40px horizontally scrollable binder-tab band sits immediately beneath it, leaving the primary workspace at `100vh - 88px` without changing canvas, 3D, or pointer-tilt equations.
- The source sidebar consumes width when open; the right-side main tree receives the remainder. Binder switching is intentionally absent from the sidebar and lives only in the top tab band.
- The preview surface is one flex row containing the scrollable stage and detached rail. The stage stops at the rail's left edge, including the rail padding zone; the surface permits overflow so rail dialogs can overlay lower workspace bands while the main workspace remains the outer clip boundary.
- The rail has no full-height edge divider and no `self-start`; its outer box is vertically centered against the **live preview surface**, not the complete main column. Collapsing the timeline changes preview height, so the rail's vertical center moves.
- The rail begins with Print / PDF, Print setup, then Grid selection. Print scope is exposed as two stateless command blocks that immediately select and launch their compilation; Print setup uses `FileSliders`; Card size uses `RulerDimensionLine` and owns both its preset selector and horizontal 80–125% scale controls.
- Keyboard shortcuts are followed by AI Prompt Generator, whose premium global InPaint and Restyle dictionaries and live layout-aware GridRip compiler render in parity-formatted, monospace, pre-wrapped previews with 160px scroll ceilings, preserve individual-card ratios while directing the outer canvas to expand without clipping, copy exact full-text payloads through the Clipboard API, and report the result through standard toasts.
- Every rail dialog is absolutely anchored at `right-full mr-3 top-1/2 -translate-y-1/2` relative to its trigger and animates symmetrically from the right. Panels use a uniform 400px width, cap at 80vh, hide scrollbar chrome, and scroll internally when their content is longer.
- Database/Custom/Density is absolutely anchored to the preview bottom edge. It uses the self-hosted Inter sans stack and is not part of the timeline or bottom controller flow.
- The bottom controller owns Undo/Redo, Merge/Unmerge/reset/clear, spread navigation, Add, Duplicate, Delete, and timeline toggle. One-pixel dividers separate its History, Slot Structure, and Spread Navigation pockets.
- The timeline is a sibling below the preview/controller inside the right-side main tree. Its 300ms elastic slide/fade transitions height, opacity, and padding; collapsed geometry still resolves to zero height, padding, and border so the preview reclaims the full band.
- Active groups use `data-active="true"` and a dimension-neutral two-pixel shadow outline without scale or ring offset. Add/Duplicate use a requested page ID and then call `scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })` on its containing group.

### Persistence and history

- Active repository key: `digital-card-binder:repository:v1`. It stores repository version `1`, save time, active binder ID, and sanitized binder records. The retired `digital-card-binder:v1` key is read only for backward migration and removed after repository persistence succeeds.
- Each binder owns its name, selected card set, timestamps, active page, schema-v5 settings/pool/page/price payload, stable binder ID, and serializable `directoryHandleKey`/`directoryName` metadata. Data claiming a newer repository version is not partially interpreted.
- Schema v5 binder payloads store a sanitized canonical-ID-to-raw-USD `cardPrices` map and preserve `tcgdexId` on generated local pool assets.
- IndexedDB: database `digital-card-binder`, `images` and `directory-handles` stores, version `4`. Image keys use `{binderId}::{assetId}`; directory keys use `binder-directory:{binderId}` and retain the structured-clone native handle plus binder/folder metadata. The legacy global `active-directory` token migrates to the active binder.
- IndexedDB is preferred for blobs and carries canonical TCGdex IDs alongside remote card blobs. Legacy unscoped image rows are adopted only when referenced by the active migrated binder. Exact-filename custom replacement overwrites only that binder's scoped record; fallback records replace the same active pool entry with a new data URL and canonical metadata.
- Object URLs are tracked and revoked during reconciliation, replacement, deletion, reset, binder switching, and unmount paths. Active reset deletes only records owned by that binder.
- Undo/Redo is a 30-entry **canvas** history containing pages, active page, and layout. It intentionally excludes pool deletion/import, catalogue state, print scope, and most settings, and is cleared rather than shared during binder activation.
- The fixed 142px header footprint is the active binder's native-folder health indicator, rendered from the direct `isFolderLinked` Boolean of that binder's live native handle: disconnected state is pulsing red `No Folder Picked`, and linked state is pulsing emerald `Folder Connected`. Binder metadata is patched in the same Link/Disconnect event and persisted separately; save state remains internal to repository operations and toasts rather than overriding folder truth.

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
- `custom` scope is **implemented**, not unfinished. `compactCustomPrintPages` gathers canonical private-upload anchors through `getSlots`, orders them by source page/slot, decomposes every runtime column/row span into ordered 1×1 slices, preserves non-centered crops, packs against the fixed print surface, auto-paginates overflow, and builds temporary front/back sheet identities for printing.
- Temporary custom-slot metadata lives in an isolated per-page `metaData` dictionary and carries each slice's source dimensions plus row/column offsets into the print renderer without entering the asset-ID `slots` map; standard printing falls back to canonical merge-derived dimensions and offsets. The custom compiler does not mutate the live binder and intentionally does not preserve section names or source-page placement because it is a compact print-only projection.
- Browser print settings remain outside application control. Correct output requires matching paper, margins None, scale 100%, and Background graphics enabled; browser “Fit to page” breaks physical size.

### PWA and deployment

- Production-only service-worker registration keeps development HMR out of cache behavior.
- `card-binder-v3` precaches shell assets and handles navigation network-first; same-origin assets use cached response with background refresh.
- Vercel routes the SPA to `index.html`, prevents long caching for the service worker/manifest, and marks hashed `/assets` immutable.
- The application has no server process in production and no required deployment settings beyond the repository config.

## Known issues, limitations, and visual quirks

1. **No committed automated test suite or CI.** Validation has been `npm run build` plus external Chromium harnesses, so regressions are not automatically blocked.
2. **No built-in export command or cloud backup.** The activation wizard can restore compatible JSON snapshots, but image blobs are recoverable only when embedded as data URLs; clearing site data, losing a profile, or changing devices can still lose local work.
3. **Desktop landscape is the product boundary.** A portrait guard exists; geometry was validated down to 1200×700, not as a small-screen editor.
4. **Cross-browser confidence is incomplete.** Recent testing used Chromium. Safari/Firefox print scaling, PWA install behavior, vertical range input, and native drag/drop have not received equivalent automated coverage.
5. **Market data is an online dependency.** TCGdex search/detail data and CDN-only fallback art are unavailable offline until cached locally; exchange failure is non-blocking because SGD conversion retains the 1.35 fallback.
6. **Browser printing is partly manual.** The app cannot force paper, margin, scale, duplex, or background settings.
7. **Service-worker cache growth is unbounded.** `card-binder-v3` has no per-entry eviction, so old hashed assets remain until the cache name changes or site data is cleared.
8. **`CardBinder.jsx` is highly coupled.** Broad rewrites can cross persistence, printing, drag state, physical ownership, and layout geometry even when the request appears visual.
9. **README has small UI drift.** Its workspace table still assigns sizing/preview/print controls to the top utility bar; those controls now live in the right rail and Print / PDF menu.
10. **Large smooth-scroll jumps are not instantaneous.** Headless Chromium sometimes needed several seconds to settle after many rapid additions; the final target remained correct.
11. **Long rail dialogs scroll internally.** Shared popovers cap at 80vh under the uniform trigger-centered anchor; lower content may still require internal scrolling on short landscape viewports.
12. **Custom compact print is intentionally arrangement-lossy.** It preserves private images, crops, and source dimensions through temporary metadata, but not live page labels or source-page placement. That is current behavior, not an unfinished pagination loop.

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
- A built-in JSON export command remains unimplemented; the startup/creation wizard now provides JSON import for compatible binder or repository snapshots.
- Cross-browser print calibration and installed-PWA lifecycle testing remain manual.
- README's workspace/control description has not yet been brought in line with the latest rail menus.
- Historical SemVer labels are not Git tags or GitHub Releases. Commit links remain the release evidence.
- There is no MichiBinder account, collaboration, telemetry, backend, environment-secret layer, or online custom-asset synchronization. Browsers supporting `showDirectoryPicker` can retain one selected handle per binder locally in IndexedDB, but may require renewed read permission after restart; unsupported browsers fall back to choosing the directory for each refresh.
- The v4.22.10 session-linked directory-input fallback is complete; no active functional workspace task remains open.

## Incoming engineer hand-off brief

The current application is stable because several boundaries agree with one another. The most important context before changing code is:

- **Treat sheets as the structural unit.** A page face is not independently owned. Add, duplicate, delete, navigation, covers, and print identity all depend on front/back pairing.
- **Treat the spine as a geometry contract.** The spread is two equal frame widths plus `gap-4`, under 1200px perspective. The page-turn origin sits on that center axis; decorative depth must not move it.
- **Treat binder activation as an atomic snapshot boundary.** Commit the outgoing workspace from live state before hydrating the incoming record; `bindersRef` and `activeBinderIdRef` prevent delayed native callbacks and directory reconciliation from writing into a previous binder.
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
