# MichiBinder

MichiBinder is a private, desktop-first card-layout workspace for arranging trading-card images into printable binder pages. It is a client-only React PWA: images stay on the device, layouts save automatically, and the browser's print engine creates true-size PDFs.

## Features

- Upload PNG, JPG, WEBP, GIF, and AVIF card images into the reusable Michi library.
- Search the free TCGdex catalogue in real time, browse chronologically sorted sets with seamless infinite scrolling, and drag Pokémon cards directly into binder pockets.
- Select from TCGdex or Michi with standard Shift and Ctrl/Command gestures, then drag the batch into consecutive binder pockets.
- Use 4-pocket (2 × 2), 9-pocket (3 × 3), or 12-pocket (4 × 3) layouts.
- Combine adjacent pockets into oversized frames and split them again.
- Reposition cropped images inside their frames with pointer or keyboard controls.
- Add, duplicate, delete, navigate, and print multiple binder pages.
- Preview a dark binder sheet or the exact paper output.
- Configure physical card dimensions, scale, gaps, image fit, paper, and cut guides.
- Save layouts to `localStorage` and image blobs to IndexedDB, with an automatic local-storage fallback.
- Install as a landscape desktop PWA and continue working offline after the first load.

## Workspace

| Area | Purpose |
| --- | --- |
| Top utility bar | Product identity, sidebar toggle, card sizing, pocket layout, preview mode, print settings, and Print / PDF |
| Collapsible Cards / Michi sidebar | TCGdex browsing, local image upload, multi-selection, batch fill, and image deletion; its width fluidly resizes the workspace |
| Dynamic Binder / Paper workspace | Centered card editing, DPI and density tracking, Merge/Unmerge, history, spread navigation, insertion, and sheet deletion |
| Collapsible page timeline | Workspace-docked active-spread thumbnails, direct page switching, cross-page drops, and page insertion without clipping beneath the sidebar |

## Card size and print accuracy

All dimensions shown in the app are **millimetres**. The layout engine converts them to physical inches internally so browser print output remains true to size. The default Pokémon TCG preset is 65 × 90 mm. At 100% scale with a 1.5 mm gap, a 9-pocket grid fits at true size on A4.

The true-size badge reports whether the selected grid fits inside the current paper's safe area. If it does not fit, the app shows the exact reduction and suggests the smallest supported larger paper.

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
| Double-click a filled slot | Reposition a cropped image |
| Repositioning: arrows | Nudge by 1%; hold `Shift` to nudge by 10% |

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

There is no application backend. Local uploads are stored as blobs in IndexedDB and displayed through local object URLs; layout metadata is saved in `localStorage`. Pokémon searches send the entered query directly to the free TCGdex API, and result previews load from the TCGdex asset CDN. When a result is added, the app downloads and stores the high-resolution image locally when the browser permits it, using the CDN URL as a fallback if that download is blocked. If IndexedDB is unavailable, image data URLs are stored in the local layout record instead. Reset Binder in Print Setup removes the app's local stores.

## Deployment

The project is hosted on GitHub and deployed as a static Vite site on Vercel. The maintainer publishes approved work to `main` with GitHub Desktop; Vercel imports the repository with no extra configuration and deploys `main` to production.

The committed `vercel.json` supplies the Vite build command, static `dist/` output, SPA rewrite, service-worker headers, and immutable asset caching. No server, environment variables, or manual Vercel settings are required.
