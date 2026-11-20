# MichiBinder

MichiBinder is a private, desktop-first card-layout workspace for arranging trading-card images into printable binder pages. It is a client-only React PWA: images stay on the device, layouts save automatically, and the browser's print engine creates true-size PDFs.

## Features

- Upload PNG, JPG, WEBP, GIF, and AVIF card images into the reusable Michi library.
- Search the free TCGdex catalogue in real time, browse chronologically sorted sets with seamless infinite scrolling, and exclude or restore all placed catalogue cards in print/PDF without changing either source library or hiding live artwork.
- Select from TCGdex or Michi with standard Shift and Ctrl/Command gestures, then drag the batch into consecutive binder pockets.
- Use 4-pocket (2 × 2), 9-pocket (3 × 3), or 12-pocket (4 × 3) layouts.
- Combine adjacent pockets into oversized frames and split them again.
- Reposition and zoom cropped images per slot with pointer, keyboard, an amber 100–300% slider, or the mouse wheel.
- Add, duplicate, delete, navigate, and print multiple binder pages.
- Use **Include all** to omit print-hidden cards and compact the remaining cards across print sheets without changing the live binder layout.
- Preview a dark binder sheet or the exact paper output.
- Configure physical card dimensions, scale, gaps, image fit, paper, and cut guides.
- Save every binder tab as one portable `.michibinder` project with all card images embedded, then open it on another computer without replacing existing binders.
- Save layouts to `localStorage` and image blobs to IndexedDB, with an automatic local-storage fallback.
- Install as a landscape desktop PWA and continue working offline after the first load.

## Workspace

| Area | Purpose |
| --- | --- |
| Top utility bar | Product identity, sidebar toggle, folder-link health, portfolio value, and distraction-free workspace toggle |
| Binder tab strip | Binder switching, renaming, drag ordering, and workspace creation |
| Collapsible Cards / Michi sidebar | TCGdex browsing, local image upload, multi-selection, batch fill, and image deletion; its width fluidly resizes the workspace |
| Dynamic Binder / Paper workspace | Centered card editing, DPI and density tracking, Merge/Unmerge, history, spread navigation, insertion, and sheet deletion |
| Right control rail | Portable project Save/Open, print commands, physical setup, grid, preview, card size, shortcuts, and prompt tools |
| Collapsible page timeline | Workspace-docked active-spread thumbnails, direct page switching, cross-page drops, and page insertion without clipping beneath the sidebar |

## Portable projects

Use **Save project** in the right control rail to download one `.michibinder` file containing every binder tab in its current order. The file preserves pages, assignments, unplaced library cards, layouts, paper and card settings, crop focus and zoom, merged slots, print exclusions, section names, prices, and other editable metadata. Every card image is embedded, so the project does not depend on the source computer's IndexedDB records or a remote image URL.

Use **Open project** to validate and import that file. Imported binders are appended to the existing tab strip, and binder, asset, page, sheet, and merge IDs are regenerated to prevent collisions with current work. The app restores embedded images into IndexedDB, with the same data-URL fallback used by normal local persistence when IndexedDB is unavailable. The workflow is client-only and requires no MichiBinder account, backend, or cloud storage.

If Save project cannot recover an image, it stops rather than creating an incomplete file. Choose **Show card** in the error notification to open the owning binder and page; the affected slot pulses amber with an **Image needed for project** label. If the asset is unplaced, MichiBinder opens its Cards search or selects its Michi library entry instead.

Native **Custom Card Vault** folder permissions are browser- and device-local, so they are intentionally not included. Imported assets remain editable and printable, but reconnect the folder on the destination computer if you want **Reload Assets** to synchronize it again. The Open control also retains compatibility with older JSON binder snapshots; those legacy files are not guaranteed to contain image data.

## Card size and print accuracy

All dimensions shown in the app are **millimetres**. The default Pokémon TCG preset is 65 × 90 mm. At 100% scale with a 1.5 mm gap, a 9-pocket grid fits at true size on A4. The print renderer uses fixed physical card tracks rather than stretching rows or columns to fill the paper, so the PDF card geometry matches the Paper preview.

Both **Print / PDF** and **Print setup** disclose the calculated PDF card size before printing. The true-size badge reports whether the selected grid fits inside the current paper's safe area; if it does not fit, the displayed output dimensions include the exact reduction and the app suggests the smallest supported larger paper.

### Save as PDF

1. Choose **Print / PDF**.
2. In the browser print dialog select **Save as PDF**.
3. Set **Margins** to **None**.
4. Keep **Scale** at **100%**.
5. Turn **Background graphics** on.
6. Confirm that the paper size matches Print Setup.

Do not use the print dialog's “Fit to page” option; MichiBinder has already calculated the correct physical scale.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/⌘ + A` | Select all visible library images |
| `Esc` | Cancel the current operation, close a panel, or clear selection |
| `Delete` / `Backspace` | Delete selected pool images |
| `M` | Toggle Combine mode |
| `Enter` | Merge the selected slots or confirm repositioning |
| `U` | Unmerge selected frames |
| `←` / `→` | Previous / next page |
| `PageUp` / `PageDown` | Previous / next page |
| `F` | Fill from the current pool selection |
| Double-click a filled slot | Reposition and zoom an image |
| Repositioning: arrows | Nudge by 1%; hold `Shift` to nudge by 10% |
| Repositioning: mouse wheel | Zoom in or out by 5% without scrolling the page |

## Local development

Requires Node.js 18.18 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
npm run preview
```

Vite serves development on `0.0.0.0:5173` and preview on `0.0.0.0:4173`.

## Storage and privacy

There is no application backend. Local uploads are stored as binder-scoped blobs in IndexedDB and displayed through local object URLs; layout metadata is saved in `localStorage`. Native Custom Card Vault handles also remain in device-local IndexedDB and are never serialized into portable projects. Pokémon searches send the entered query directly to the free TCGdex API, and result previews load from the TCGdex asset CDN. When a result is added, the app downloads and stores the high-resolution image locally when the browser permits it, using the CDN URL as a fallback if that download is blocked. If IndexedDB is unavailable, image data URLs are stored in the local layout record instead. Reset Binder in Print Setup removes the active binder's local data.

## Deployment

The project is hosted on GitHub and deployed as a static Vite site on Vercel. The maintainer publishes approved work to `main` with GitHub Desktop; Vercel imports the repository with no extra configuration and deploys `main` to production.

The committed `vercel.json` supplies the Vite build command, static `dist/` output, SPA rewrite, service-worker headers, and immutable asset caching. No server, environment variables, or manual Vercel settings are required.
