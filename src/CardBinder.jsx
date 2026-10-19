import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns4,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  File,
  Grid2X2,
  Grid3X3,
  Image as ImageIcon,
  Keyboard,
  LayoutGrid,
  MonitorDown,
  Move,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const GRID_LAYOUTS = [
  { id: '2x2', pockets: 4, cols: 2, rows: 2, label: '4-pocket', hint: '2 × 2', icon: 'grid2x2' },
  { id: '3x3', pockets: 9, cols: 3, rows: 3, label: '9-pocket', hint: '3 × 3', icon: 'grid3x3' },
  { id: '4x3', pockets: 12, cols: 4, rows: 3, label: '12-pocket', hint: '4 × 3 landscape', icon: 'grid4x3' },
];
const DEFAULT_LAYOUT = '3x3';
const MAX_ROWS = 3;
const MAX_COLS = 4;
const getLayout = (id) => GRID_LAYOUTS.find((layout) => layout.id === id) || GRID_LAYOUTS[1];
const MM = 1 / 25.4;
const STORAGE_KEY = 'digital-card-binder:v1';
const SCHEMA_VERSION = 3;
const CARD_PRESETS = [{ id: 'pokemon', label: 'Pokémon TCG', hint: '65 × 90 mm', wMm: 65, hMm: 90 }];
const SCALE_MIN = 0.8;
const SCALE_MAX = 1.25;
const CUSTOM_MIN_MM = 25;
const CUSTOM_MAX_MM = 150;
const DEFAULT_CARD_SIZE = { preset: 'pokemon', scale: 1, customWmm: 65, customHmm: 90 };
const PRINT_SAFE_MARGIN_IN = 0.125;
const DRAG_MIME = 'application/x-card-binder';
const TCGDEX_API_BASE = 'https://api.tcgdex.net/v2/en';
const TCGDEX_SEARCH_ENDPOINT = `${TCGDEX_API_BASE}/cards?name=`;
const TCGDEX_SETS_ENDPOINT = `${TCGDEX_API_BASE}/sets`;
const TCGDEX_ASSET_CDN = 'https://assets.tcgdex.net';
const TCGDEX_RESULT_LIMIT = 40;
const IDB_NAME = 'digital-card-binder';
const IDB_STORE = 'images';
const IDB_VERSION = 1;
const HISTORY_LIMIT = 30;
const SHEET_PAD = { top: 0.3, right: 0.3, bottom: 0.3, left: 0.62 };
const THUMB_BOX = { w: 56, h: 56 * 1.414, pad: 4 };
const PAPER_SIZES = {
  a4: { label: 'A4 (210 × 297 mm)', short: 'A4', w: '210mm', h: '297mm', wIn: 210 * MM, hIn: 297 * MM },
  letter: { label: 'US Letter (216 × 279 mm)', short: 'Letter', w: '8.5in', h: '11in', wIn: 8.5, hIn: 11 },
  a3: { label: 'A3 (297 × 420 mm)', short: 'A3', w: '297mm', h: '420mm', wIn: 297 * MM, hIn: 420 * MM },
  tabloid: { label: 'Tabloid (279 × 432 mm)', short: 'Tabloid', w: '11in', h: '17in', wIn: 11, hIn: 17 },
};
const GAP_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1 * MM, label: '1 mm' },
  { value: 1.5 * MM, label: '1.5 mm' },
  { value: 3 * MM, label: '3 mm' },
];
const DEFAULT_SETTINGS = {
  paper: 'a4',
  gap: 1.5 * MM,
  fit: 'cover',
  skipEmptyPages: true,
  cutGuides: false,
  hidePlaced: false,
  view: 'binder',
  layout: DEFAULT_LAYOUT,
  cardSize: DEFAULT_CARD_SIZE,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
const fmtMm = (inches) => (inches * 25.4).toFixed(1);
const fmtPct = (factor) => (factor >= 0.9999 ? '100%' : `${Math.floor(factor * 1000) / 10}%`);
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const keyOf = (row, col) => `${row}-${col}`;
const isEditableTarget = (element) => Boolean(element?.matches?.('input, textarea, select, [contenteditable="true"]'));
const hasFiles = (dataTransfer) => Array.from(dataTransfer?.types || []).includes('Files');
const tcgdexImageBase = (image) => {
  const value = typeof image === 'string' ? image.trim().replace(/\/$/, '') : '';
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.origin === TCGDEX_ASSET_CDN ? url.href.replace(/\/$/, '') : '';
    } catch { return ''; }
  }
  return `${TCGDEX_ASSET_CDN}${value.startsWith('/') ? '' : '/'}${value}`;
};
const normalizeTcgdexCards = (payload) => {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return items
    .filter((item) => item && item.id)
    .slice(0, TCGDEX_RESULT_LIMIT)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || item.id),
      localId: item.localId == null ? '' : String(item.localId),
      image: tcgdexImageBase(item.image),
    }));
};
const normalizeTcgdexSets = (payload) => {
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  return items
    .filter((item) => item && item.id)
    .map((item, index) => ({
      id: String(item.id),
      name: String(item.name || item.id),
      releaseDate: typeof item.releaseDate === 'string' ? item.releaseDate : '',
      seriesName: String(item.serie?.name || item.series?.name || ''),
      cardCount: Math.max(0, Number(item.cardCount?.total) || 0),
      sourceIndex: index,
    }))
    .sort((left, right) => {
      if (left.releaseDate && right.releaseDate && left.releaseDate !== right.releaseDate) return right.releaseDate.localeCompare(left.releaseDate);
      if (left.seriesName && right.seriesName && left.seriesName !== right.seriesName) return left.seriesName.localeCompare(right.seriesName);
      return left.sourceIndex - right.sourceIndex;
    });
};
const safeFileName = (value) => String(value || 'pokemon-card').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'pokemon-card';
const emptyPage = (sheetId = null, face = null) => ({
  id: uid('page'),
  merges: [],
  slots: {},
  crops: {},
  ...(sheetId && face ? { sheetId, face } : {}),
});
const emptySheet = () => {
  const id = uid('sheet');
  return { id, front: emptyPage(id, 'front'), back: emptyPage(id, 'back') };
};
const emptyPages = (count = 4) => {
  const pageCount = Math.max(2, Math.ceil(count / 2) * 2);
  return Array.from({ length: pageCount / 2 }, emptySheet).flatMap((sheet) => [sheet.front, sheet.back]);
};
const normalizePhysicalPages = (value) => {
  const source = Array.isArray(value) && value.length ? [...value] : emptyPages();
  const groups = new Map();
  source.forEach((page) => {
    if (!page?.sheetId || !['front', 'back'].includes(page.face)) return;
    const group = groups.get(page.sheetId) || {};
    group[page.face] = page;
    groups.set(page.sheetId, group);
  });
  const valid = source.length % 2 === 0
    && groups.size * 2 === source.length
    && Array.from(groups.values()).every((group) => group.front && group.back);
  const paired = valid ? source : (() => {
    const pages = [...source];
    if (pages.length % 2) pages.push(emptyPage());
    const repaired = [];
    for (let index = 0; index < pages.length; index += 2) {
      const sheetId = uid('sheet');
      repaired.push(
        { ...pages[index], sheetId, face: 'front' },
        { ...pages[index + 1], sheetId, face: 'back' },
      );
    }
    return repaired;
  })();
  return paired.map((page, order) => ({ ...page, order }));
};
const sheetsFromPages = (value) => {
  const pages = normalizePhysicalPages(value);
  const sheets = new Map();
  pages.forEach((page) => {
    const sheet = sheets.get(page.sheetId) || { id: page.sheetId, front: null, back: null };
    sheet[page.face] = page;
    sheets.set(page.sheetId, sheet);
  });
  return Array.from(sheets.values());
};
const pagesFromSheets = (sheets) => sheets
  .flatMap((sheet) => [sheet.front, sheet.back])
  .filter(Boolean)
  .sort((first, second) => first.order - second.order);
const binderViewGroups = (totalPages) => {
  if (totalPages <= 0) return [];
  if (totalPages === 1) return [[0]];
  const finalPageIndex = totalPages - 1;
  const groups = [[0]];
  for (let leftPageIndex = 1; leftPageIndex < finalPageIndex; leftPageIndex += 2) {
    groups.push(leftPageIndex + 1 < finalPageIndex ? [leftPageIndex, leftPageIndex + 1] : [leftPageIndex]);
  }
  groups.push([finalPageIndex]);
  return groups;
};
const binderViewForPage = (pageIndex, totalPages) => binderViewGroups(totalPages)
  .find((group) => group.includes(clamp(pageIndex, 0, totalPages - 1))) || [0];
const pageSide = (pageIndex, count) => {
  const group = binderViewForPage(pageIndex, count);
  if (group.length === 2) return group[0] === pageIndex ? 'left' : 'right';
  return pageIndex === 0 ? 'right' : 'left';
};
const clonePages = (pages) => pages.map((page) => ({
  ...page,
  merges: (page.merges || []).map((merge) => ({ ...merge })),
  slots: { ...page.slots },
  crops: Object.fromEntries(Object.entries(page.crops || {}).map(([key, crop]) => [key, { ...crop }])),
}));
const makeCanvasSnapshot = (pages, currentPage, layout) => ({ pages: clonePages(pages), currentPage, layout });
const sameCanvasPages = (first, second) => JSON.stringify(first) === JSON.stringify(second);

function sanitizeCardSize(value = {}) {
  const legacyW = Number(value.customW) * 25.4;
  const legacyH = Number(value.customH) * 25.4;
  const customWmm = Number.isFinite(Number(value.customWmm)) ? Number(value.customWmm) : (Number.isFinite(legacyW) ? legacyW : 65);
  const customHmm = Number.isFinite(Number(value.customHmm)) ? Number(value.customHmm) : (Number.isFinite(legacyH) ? legacyH : 90);
  return {
    preset: value.preset === 'custom' || CARD_PRESETS.some((preset) => preset.id === value.preset) ? value.preset : 'pokemon',
    scale: clamp(Number(value.scale) || 1, SCALE_MIN, SCALE_MAX),
    customWmm: clamp(customWmm, CUSTOM_MIN_MM, CUSTOM_MAX_MM),
    customHmm: clamp(customHmm, CUSTOM_MIN_MM, CUSTOM_MAX_MM),
  };
}

function baseCardSizeMm(cardSize) {
  const clean = sanitizeCardSize(cardSize);
  if (clean.preset === 'custom') return { w: clean.customWmm, h: clean.customHmm };
  const preset = CARD_PRESETS.find((item) => item.id === clean.preset) || CARD_PRESETS[0];
  return { w: preset.wMm, h: preset.hMm };
}

function resolveCardSize(cardSize) {
  const clean = sanitizeCardSize(cardSize);
  const base = baseCardSizeMm(clean);
  return { w: base.w * MM * clean.scale, h: base.h * MM * clean.scale };
}

function sanitizeSettings(value = {}) {
  const cardSize = sanitizeCardSize(value.cardSize || DEFAULT_CARD_SIZE);
  const rawGap = Number(value.gap);
  const gap = GAP_OPTIONS.reduce((best, option) => (
    Math.abs(option.value - rawGap) < Math.abs(best.value - rawGap) ? option : best
  ), GAP_OPTIONS[0]).value;
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    paper: PAPER_SIZES[value.paper] ? value.paper : DEFAULT_SETTINGS.paper,
    gap: Number.isFinite(rawGap) ? gap : DEFAULT_SETTINGS.gap,
    fit: ['cover', 'contain'].includes(value.fit) ? value.fit : DEFAULT_SETTINGS.fit,
    view: ['binder', 'paper'].includes(value.view) ? value.view : DEFAULT_SETTINGS.view,
    layout: GRID_LAYOUTS.some((layout) => layout.id === value.layout) ? value.layout : DEFAULT_LAYOUT,
    skipEmptyPages: value.skipEmptyPages !== false,
    cutGuides: Boolean(value.cutGuides),
    hidePlaced: Boolean(value.hidePlaced),
    cardSize,
  };
}

const spanW = (columns, gap, card) => columns * card.w + (columns - 1) * gap;
const spanH = (rows, gap, card) => rows * card.h + (rows - 1) * gap;
const slotBox = (row, col) => ({ r: row, c: col, rs: 1, cs: 1 });
const mergeBox = (merge) => ({ r: merge.r, c: merge.c, rs: merge.rs, cs: merge.cs });
const unionBox = (first, second) => {
  const r = Math.min(first.r, second.r);
  const c = Math.min(first.c, second.c);
  const rowEnd = Math.max(first.r + first.rs, second.r + second.rs);
  const colEnd = Math.max(first.c + first.cs, second.c + second.cs);
  return { r, c, rs: rowEnd - r, cs: colEnd - c };
};
const boxHas = (box, row, col) => row >= box.r && row < box.r + box.rs && col >= box.c && col < box.c + box.cs;
const boxesIntersect = (first, second) => first.r < second.r + second.rs && first.r + first.rs > second.r && first.c < second.c + second.cs && first.c + first.cs > second.c;
const boxDims = (box) => `${box.cs}×${box.rs}`;
const sameBox = (first, second) => Boolean(first && second && first.r === second.r && first.c === second.c && first.rs === second.rs && first.cs === second.cs);
const fitsDims = (merge, dims) => merge.r >= 0 && merge.c >= 0 && merge.r + merge.rs <= dims.rows && merge.c + merge.cs <= dims.cols;
const activeMerges = (page, dims) => (page.merges || []).filter((merge) => fitsDims(merge, dims));

function expandBox(input, merges) {
  let box = { ...input };
  let changed = true;
  while (changed) {
    changed = false;
    for (const merge of merges) {
      const candidate = mergeBox(merge);
      if (boxesIntersect(box, candidate) && !(
        box.r <= candidate.r && box.c <= candidate.c &&
        box.r + box.rs >= candidate.r + candidate.rs &&
        box.c + box.cs >= candidate.c + candidate.cs
      )) {
        box = unionBox(box, candidate);
        changed = true;
      }
    }
  }
  return box;
}

function getSlots(page, dims) {
  const merges = activeMerges(page, dims);
  const result = [];
  for (let row = 0; row < dims.rows; row += 1) {
    for (let col = 0; col < dims.cols; col += 1) {
      const covering = merges.find((merge) => boxHas(merge, row, col));
      if (covering && (covering.r !== row || covering.c !== col)) continue;
      result.push(covering
        ? { key: keyOf(row, col), r: row, c: col, rs: covering.rs, cs: covering.cs, mergeId: covering.id }
        : { key: keyOf(row, col), r: row, c: col, rs: 1, cs: 1, mergeId: null });
    }
  }
  return result;
}

function visibleAssignments(pages, dims) {
  return pages.flatMap((page, pageIndex) => getSlots(page, dims)
    .filter((slot) => page.slots[slot.key])
    .map((slot) => ({ pageIndex, key: slot.key, id: page.slots[slot.key] })));
}

function hiddenAssignments(pages, dims) {
  const visibleKeys = pages.map((page) => new Set(getSlots(page, dims).map((slot) => slot.key)));
  return pages.flatMap((page, pageIndex) => Object.entries(page.slots)
    .filter(([key]) => !visibleKeys[pageIndex].has(key))
    .map(([key, id]) => ({ pageIndex, key, id })));
}

function planPlacement(pages, pageIndex, startKey, count, dims) {
  const targets = [];
  let index = Math.max(0, pageIndex);
  let loops = 0;
  while (targets.length < count && loops < Math.max(100, count * 20)) {
    const page = pages[index] || emptyPage();
    const slots = getSlots(page, dims);
    const start = index === pageIndex && startKey ? Math.max(0, slots.findIndex((slot) => slot.key === startKey)) : 0;
    for (let slotIndex = start; slotIndex < slots.length && targets.length < count; slotIndex += 1) {
      const slot = slots[slotIndex];
      if (!page.slots[slot.key]) targets.push({ pageIndex: index, key: slot.key });
    }
    index += 1;
    loops += 1;
  }
  return targets;
}

function applyPlacement(previousPages, ids, pageIndex, startKey, dims) {
  const pages = previousPages.map((page) => ({ ...page, slots: { ...page.slots }, crops: { ...page.crops } }));
  if (ids.length === 1 && startKey && pages[pageIndex]) {
    const previousId = pages[pageIndex].slots[startKey];
    pages[pageIndex].slots[startKey] = ids[0];
    if (previousId !== ids[0]) delete pages[pageIndex].crops[startKey];
    return { pages, placed: 1, created: 0, targets: [{ pageIndex, key: startKey }] };
  }
  const targets = planPlacement(pages, pageIndex, startKey, ids.length, dims);
  const lastIndex = targets.length ? Math.max(...targets.map((target) => target.pageIndex)) : pages.length - 1;
  const before = pages.length;
  while (pages.length <= lastIndex) {
    const sheet = emptySheet();
    pages.push(sheet.front, sheet.back);
  }
  targets.forEach((target, index) => {
    pages[target.pageIndex].slots[target.key] = ids[index];
    delete pages[target.pageIndex].crops[target.key];
  });
  return { pages, placed: targets.length, created: Math.max(0, pages.length - before), targets };
}

const getCrop = (page, key, imageId) => {
  const crop = page.crops?.[key];
  return crop?.img === imageId ? { x: crop.x, y: crop.y } : { x: 50, y: 50 };
};

function coverGeometry(imageW, imageH, frame) {
  if (!imageW || !imageH || !frame?.w || !frame?.h) return { dispW: frame?.w || 0, dispH: frame?.h || 0, ovX: 0, ovY: 0 };
  const scale = Math.max(frame.w / imageW, frame.h / imageH);
  const dispW = imageW * scale;
  const dispH = imageH * scale;
  return { dispW, dispH, ovX: Math.max(0, dispW - frame.w), ovY: Math.max(0, dispH - frame.h) };
}

function pruneMissingImages(pages, validIds) {
  return pages.map((page) => {
    const slots = Object.fromEntries(Object.entries(page.slots).filter(([, id]) => validIds.has(id)));
    const crops = Object.fromEntries(Object.entries(page.crops || {}).filter(([key, crop]) => slots[key] === crop.img));
    return { ...page, slots, crops };
  });
}

function sanitizePage(value = {}) {
  const sourceMerges = Array.isArray(value.merges) ? value.merges : [];
  const merges = [];
  sourceMerges.forEach((item) => {
    const merge = { id: String(item.id || uid('merge')), r: Number(item.r), c: Number(item.c), rs: Number(item.rs), cs: Number(item.cs) };
    const integers = [merge.r, merge.c, merge.rs, merge.cs].every(Number.isInteger);
    const valid = integers && merge.r >= 0 && merge.c >= 0 && merge.rs > 0 && merge.cs > 0 && merge.rs * merge.cs > 1 && merge.r + merge.rs <= MAX_ROWS && merge.c + merge.cs <= MAX_COLS;
    if (valid && !merges.some((current) => boxesIntersect(current, merge))) merges.push(merge);
  });
  const anchors = new Set();
  for (let row = 0; row < MAX_ROWS; row += 1) {
    for (let col = 0; col < MAX_COLS; col += 1) {
      const covering = merges.find((merge) => boxHas(merge, row, col));
      if (!covering || (covering.r === row && covering.c === col)) anchors.add(keyOf(row, col));
    }
  }
  const slots = Object.fromEntries(Object.entries(value.slots || {})
    .filter(([key, id]) => anchors.has(key) && typeof id === 'string' && id));
  const crops = {};
  Object.entries(value.crops || {}).forEach(([key, crop]) => {
    if (slots[key] && crop?.img === slots[key]) crops[key] = { img: crop.img, x: clamp(crop.x, 0, 100), y: clamp(crop.y, 0, 100) };
  });
  return {
    id: String(value.id || uid('page')),
    merges,
    slots,
    crops,
    ...(typeof value.sheetId === 'string' ? { sheetId: value.sheetId } : {}),
    ...(['front', 'back'].includes(value.face) ? { face: value.face } : {}),
  };
}

function loadPersisted() {
  const fallback = { currentPage: 0, settings: sanitizeSettings(), pool: [], pages: emptyPages() };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || Number(parsed.version) > SCHEMA_VERSION) return fallback;
    const pages = normalizePhysicalPages(Array.isArray(parsed.pages) && parsed.pages.length ? parsed.pages.map(sanitizePage) : emptyPages());
    const pool = Array.isArray(parsed.pool) ? parsed.pool.filter((item) => item && typeof item.id === 'string').map((item) => ({ id: item.id, name: String(item.name || 'Card image'), ...(typeof item.src === 'string' ? { src: item.src } : {}) })) : [];
    return {
      currentPage: clamp(Math.floor(Number(parsed.currentPage) || 0), 0, pages.length - 1),
      settings: sanitizeSettings(parsed.settings),
      pool,
      pages,
    };
  } catch {
    return fallback;
  }
}

let databasePromise;
function getDB() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(IDB_STORE)) request.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open IndexedDB'));
    });
  }
  return databasePromise;
}

async function idbRun(mode, work) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, mode);
    const store = transaction.objectStore(IDB_STORE);
    let value;
    try { value = work(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
  });
}

const idbGetAll = async () => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, 'readonly');
    const request = transaction.objectStore(IDB_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};
const idbPutMany = (records) => idbRun('readwrite', (store) => records.forEach((record) => store.put(record)));
const idbDeleteMany = (ids) => idbRun('readwrite', (store) => ids.forEach((id) => store.delete(id)));
const idbClear = () => idbRun('readwrite', (store) => store.clear());

const ICONS = {
  alert: AlertTriangle,
  book: BookOpen,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  combine: SquareDashedMousePointer,
  copy: Copy,
  eraser: Eraser,
  eye: Eye,
  eyeOff: EyeOff,
  file: File,
  grid: LayoutGrid,
  grid2x2: Grid2X2,
  grid3x3: Grid3X3,
  grid4x3: Columns4,
  image: ImageIcon,
  install: MonitorDown,
  keyboard: Keyboard,
  merge: TableCellsMerge,
  move: Move,
  plus: Plus,
  printer: Printer,
  reset: RotateCcw,
  rotate: RotateCw,
  ruler: Ruler,
  selectAll: Check,
  sliders: SlidersHorizontal,
  split: TableCellsSplit,
  sparkles: Sparkles,
  trash: Trash2,
  upload: Upload,
  wand: WandSparkles,
  x: X,
};
const ICON_SIZES = { xs: 'size-3', sm: 'size-3.5', md: 'size-4', lg: 'size-5', xl: 'size-8', '2xl': 'size-12' };

function Icon({ name, size = 'md', className = '', strokeWidth }) {
  const Component = ICONS[name];
  if (!Component) {
    if (import.meta.env.DEV) console.warn(`Unknown icon: ${name}`);
    return null;
  }
  return <Component className={`${ICON_SIZES[size] || ICON_SIZES.md} shrink-0 ${className}`} strokeWidth={strokeWidth ?? (size === 'xl' || size === '2xl' ? 1.5 : 2)} aria-hidden="true" />;
}

function ToolButton({ icon, label, onClick, disabled = false, disabledReason, active, variant = 'ghost', title, kbd, className = '', dense = false, type = 'button' }) {
  const variants = {
    ghost: active ? 'bg-red-950/60 text-red-400 ring-1 ring-inset ring-red-800/60' : 'text-zinc-300 hover:bg-white/10 hover:text-white',
    primary: 'bg-red-600 text-white shadow-lg shadow-red-950/40 hover:bg-red-700',
    danger: 'text-red-300 hover:bg-red-500/15 hover:text-red-200',
    outline: 'border border-neutral-700 bg-neutral-800 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-700',
  };
  const button = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active === undefined ? undefined : active}
      aria-label={label || title || disabledReason}
      title={!disabled ? title : undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:pointer-events-none disabled:text-zinc-500 ${variant === 'primary' ? 'font-semibold' : 'font-medium'} ${dense ? 'h-7 min-w-7 px-1.5 text-[12px]' : 'h-8 px-3 py-1.5 text-xs'} ${variants[variant]} ${className}`}
    >
      {icon && <Icon name={icon} size={dense ? 'sm' : 'md'} />}
      {label && <span>{label}</span>}
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
  if (disabled && disabledReason) return <span title={disabledReason} className="inline-flex cursor-not-allowed">{button}</span>;
  return button;
}

function Kbd({ children, className = '' }) {
  return <kbd className={`inline-flex min-w-4 items-center justify-center rounded border border-white/15 bg-zinc-700/80 px-1 py-0.5 text-[10px] font-semibold leading-none text-white ${className}`}>{children}</kbd>;
}

function ToolbarDivider({ slim = false }) {
  return <span aria-hidden="true" className={`${slim ? 'mx-0.5 h-5' : 'mx-1 h-6'} w-px shrink-0 bg-white/10`} />;
}

function SegmentedControl({ value, onChange, options, ariaLabel, dense = false, appearance = 'default' }) {
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const previewStyle = appearance === 'preview';
  const refs = useRef([]);
  const choose = (index) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    requestAnimationFrame(() => refs.current[index]?.focus());
  };
  const onKeyDown = (event) => {
    let index = currentIndex;
    if (event.key === 'ArrowRight') index = (currentIndex + 1) % options.length;
    else if (event.key === 'ArrowLeft') index = (currentIndex - 1 + options.length) % options.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = options.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    choose(index);
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={previewStyle
        ? 'relative flex h-8 w-auto min-w-fit shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 p-1'
        : 'relative grid h-8 w-auto min-w-fit shrink-0 auto-cols-fr grid-flow-col rounded-full border border-zinc-800 bg-[#151518] p-0.5'}
    >
      <span
        aria-hidden="true"
        className={previewStyle
          ? 'absolute inset-y-1 left-1 rounded-md bg-red-600 shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none'
          : 'absolute inset-y-0.5 left-0.5 rounded-full border border-red-800/60 bg-red-950/60 shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none'}
        style={{ width: `calc((100% - ${previewStyle ? '0.5rem' : '0.25rem'}) / ${options.length})`, transform: `translateX(${currentIndex * 100}%)` }}
      />
      {options.map((option, index) => (
        <button
          ref={(node) => { refs.current[index] = node; }}
          key={option.value}
          type="button"
          role="radio"
          aria-checked={index === currentIndex}
          aria-label={option.ariaLabel || option.label}
          title={option.title}
          tabIndex={index === currentIndex ? 0 : -1}
          onClick={() => onChange(option.value)}
          className={`relative z-10 inline-flex w-auto min-w-fit items-center justify-center gap-1 font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${previewStyle ? 'rounded-md' : 'rounded-full'} ${dense ? 'px-2.5 text-xs' : 'px-3 text-xs'} ${index === currentIndex ? (previewStyle ? 'text-white' : 'text-red-400') : 'text-zinc-400 hover:text-zinc-100'}`}
        >
          {option.icon && <Icon name={option.icon} size="sm" />}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function MmField({ label, value, onCommit }) {
  const [draft, setDraft] = useState(String(round1(value)));
  useEffect(() => setDraft(String(round1(value))), [value]);
  const commit = () => {
    const next = clamp(Number.parseFloat(draft), CUSTOM_MIN_MM, CUSTOM_MAX_MM);
    setDraft(String(round1(next)));
    onCommit(next);
  };
  return (
    <label className="inline-flex shrink-0 items-center gap-1 text-[11px] text-zinc-400">
      <span>{label}</span>
      <input
        value={draft}
        inputMode="decimal"
        aria-label={`${label} in millimetres`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === 'Enter') { commit(); event.currentTarget.blur(); } }}
        className="h-7 w-[6ch] rounded-lg border border-zinc-800 bg-[#0B0B0C] px-1.5 text-right text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      />
    </label>
  );
}

function SheetGrid({ page, card, gap, unit, dims, animate = false, renderSlot, getSlotProps, children, className = '' }) {
  const slots = getSlots(page, dims);
  return (
    <div
      className={`sheet-grid ${animate ? 'sheet-grid--animate' : ''} ${className}`}
      style={{ '--cols': dims.cols, '--rows': dims.rows, '--card-w': card.w, '--card-h': card.h, '--gap': gap, '--u': unit }}
    >
      {slots.map((slot, index) => (
        <div
          key={slot.key}
          data-r={slot.r}
          data-c={slot.c}
          data-key={slot.key}
          className="slot-area relative"
          style={{ '--col-start': slot.c + 1, '--col-span': slot.cs, '--row-start': slot.r + 1, '--row-span': slot.rs }}
          {...(getSlotProps?.(slot, index) || {})}
        >
          {renderSlot(slot, index)}
        </div>
      ))}
      {children}
    </div>
  );
}

function SaveStatus({ status }) {
  const config = status === 'error'
    ? { dot: 'bg-red-400', text: 'Save failed' }
    : status === 'saving'
      ? { dot: 'bg-amber-400', text: 'Saving…' }
      : { dot: 'bg-emerald-400', text: 'Saved locally' };
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-400" aria-live="polite">
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      <span>{config.text}</span>
    </div>
  );
}

function PopoverShell({ title, icon, children }) {
  return (
    <section className="absolute right-0 top-11 z-[80] w-80 rounded-xl border border-zinc-800 bg-[#121214] p-4 text-left shadow-2xl shadow-black/70" onPointerDown={(event) => event.stopPropagation()}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Icon name={icon} />{title}</div>
      {children}
    </section>
  );
}

function HeaderCardControls({ settings, setSettings }) {
  const cleanSize = settings.cardSize;
  const base = baseCardSizeMm(cleanSize);
  const custom = cleanSize.preset === 'custom';
  const setCardSize = (patch) => setSettings((value) => ({ ...value, cardSize: sanitizeCardSize({ ...value.cardSize, ...patch }) }));
  return (
    <div role="group" aria-label="Card configuration" className="flex min-w-0 items-center gap-2">
      <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-white/[0.06] bg-neutral-950/45 px-2">
        <Icon name="ruler" size="sm" className="text-neutral-500" />
        <span className="hidden text-[10px] font-bold tracking-widest whitespace-nowrap text-neutral-500 uppercase min-[1500px]:inline">Card size</span>
        <select
          value={custom ? 'custom' : cleanSize.preset}
          aria-label="Card size"
          onChange={(event) => {
            if (event.target.value === 'custom') setCardSize({ preset: 'custom', customWmm: base.w, customHmm: base.h });
            else setCardSize({ preset: event.target.value });
          }}
          className="h-7 w-[170px] min-w-0 truncate bg-transparent text-xs font-medium text-neutral-200 outline-none max-[1499px]:w-[155px] focus-visible:ring-2 focus-visible:ring-red-500"
        >
          {CARD_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label.replace(' TCG', '')} · {preset.wMm} × {preset.hMm} mm</option>)}
          <option value="custom">Custom…</option>
        </select>
      </div>
      <div className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-white/[0.06] bg-neutral-950/45 px-2">
        <input
          type="range"
          min={80}
          max={125}
          step={1}
          value={Math.round(cleanSize.scale * 100)}
          aria-label="Card scale"
          list="scale-ticks"
          onChange={(event) => setCardSize({ scale: Number(event.target.value) / 100 })}
          onDoubleClick={() => setCardSize({ scale: 1 })}
          className="w-20 shrink-0 rounded-full accent-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-[1500px]:w-24"
        />
        <datalist id="scale-ticks"><option value="100" /></datalist>
        <strong className="min-w-[4ch] text-right text-xs font-medium text-neutral-200">{Math.round(cleanSize.scale * 100)}%</strong>
      </div>
    </div>
  );
}

function AppBar({
  settings,
  setSettings,
  pageLabel,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onAdd,
  onDuplicate,
  onDelete,
  canDelete,
  saveStatus,
  installPrompt,
  onInstall,
  openPanel,
  setOpenPanel,
  onPrint,
  printSetup,
  shortcuts,
}) {
  return (
    <header className="titlebar no-print flex items-center justify-between border-b border-white/[0.06] bg-neutral-900/90 px-6 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-900 shadow-lg shadow-black/40"><img src="/icons/icon.svg" alt="" className="size-9" /></span>
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="shrink-0 text-[15px] font-semibold tracking-tight text-white max-[1180px]:hidden">Digital Card Binder</h1>
          <SaveStatus status={saveStatus} />
        </div>
        <ToolbarDivider />
        <HeaderCardControls settings={settings} setSettings={setSettings} />
      </div>

      <nav aria-label="Pages" className="flex shrink-0 items-center justify-center px-3">
        <div className="flex h-8 items-center rounded-md border border-white/[0.08] bg-neutral-950/65 p-0.5 shadow-inner shadow-black/30">
          <button type="button" aria-label="Previous page" title="Previous spread" onClick={onPrevious} disabled={!canPrevious} className="grid size-7 place-items-center rounded text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Icon name="chevronLeft" size="sm" /></button>
          <span className="min-w-[118px] px-2 text-center text-[11px] font-medium tracking-wide text-neutral-200">{pageLabel}</span>
          <button type="button" aria-label="Next page" title="Next spread" onClick={onNext} disabled={!canNext} className="grid size-7 place-items-center rounded text-neutral-400 transition-colors hover:bg-white/10 hover:text-white disabled:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Icon name="chevronRight" size="sm" /></button>
        </div>
      </nav>

      <div className="relative flex min-w-0 flex-1 items-center justify-end gap-1.5">
        {installPrompt && <ToolButton icon="install" variant="outline" onClick={onInstall} title="Install App" />}
        <ToolButton icon="keyboard" onClick={() => setOpenPanel(openPanel === 'shortcuts' ? null : 'shortcuts')} active={openPanel === 'shortcuts'} title="Keyboard shortcuts" className="hidden min-[1500px]:inline-flex" />
        <ToolButton icon="plus" label="Add Page" variant="primary" onClick={onAdd} title="Insert a new two-page physical sheet" className="max-[1420px]:[&>span]:hidden" />
        <ToolButton icon="copy" onClick={onDuplicate} title="Duplicate physical sheet" className="max-[1180px]:hidden" />
        <ToolButton icon="trash" label="Delete" onClick={onDelete} disabled={!canDelete} disabledReason="Keep at least one physical sheet" title="Delete physical sheet" className="[&>span]:hidden !text-neutral-500 hover:!bg-red-500/10 hover:!text-red-300" />
        <ToolbarDivider />
        <ToolButton icon="sliders" label="Print Setup" onClick={() => setOpenPanel(openPanel === 'print' ? null : 'print')} active={openPanel === 'print'} className="max-[1400px]:[&>span]:hidden" />
        <ToolButton icon="printer" label="Print / PDF" variant="outline" onClick={onPrint} className="shadow-sm max-[1180px]:[&>span]:hidden" />
        {openPanel === 'print' && printSetup}
        {openPanel === 'shortcuts' && shortcuts}
      </div>
    </header>
  );
}

function PrintSetupPopover({ settings, setSettings, fitInfo, suggestedPaper, printCount, onReset }) {
  return (
    <PopoverShell title="Print setup" icon="sliders">
      <div className="space-y-3 text-[12px] text-zinc-300">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-zinc-400">Paper size</span>
          <select value={settings.paper} onChange={(event) => setSettings((value) => ({ ...value, paper: event.target.value }))} className="h-8 w-full rounded-lg border border-zinc-800 bg-[#0B0B0C] px-2 text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            {Object.entries(PAPER_SIZES).map(([key, paper]) => <option key={key} value={key}>{paper.label}</option>)}
          </select>
        </label>
        <div className={`flex items-center gap-2 rounded-lg p-2 ${fitInfo.fitsTrueSize ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
          <Icon name={fitInfo.fitsTrueSize ? 'check' : 'alert'} size="sm" />
          <span>{fitInfo.fitsTrueSize ? `True size on ${PAPER_SIZES[settings.paper].short}` : `${PAPER_SIZES[settings.paper].short} prints at ${fmtPct(fitInfo.printFit)}`}</span>
          {!fitInfo.fitsTrueSize && suggestedPaper && <button type="button" onClick={() => setSettings((value) => ({ ...value, paper: suggestedPaper }))} className="ml-auto font-semibold underline decoration-white/30 underline-offset-2">Use {PAPER_SIZES[suggestedPaper].short}</button>}
        </div>
        <fieldset>
          <legend className="mb-1 text-[11px] font-medium text-zinc-400">Pocket gap</legend>
          <SegmentedControl ariaLabel="Pocket gap" value={settings.gap} onChange={(gap) => setSettings((value) => ({ ...value, gap }))} dense options={GAP_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-zinc-400">Image fit</span>
          <select value={settings.fit} onChange={(event) => setSettings((value) => ({ ...value, fit: event.target.value }))} className="h-8 w-full rounded-lg border border-zinc-800 bg-[#0B0B0C] px-2 text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            <option value="cover">Fill (crop)</option>
            <option value="contain">Fit (letterbox)</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.skipEmptyPages} onChange={(event) => setSettings((value) => ({ ...value, skipEmptyPages: event.target.checked }))} className="accent-red-600" />Skip empty pages when printing</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.cutGuides} onChange={(event) => setSettings((value) => ({ ...value, cutGuides: event.target.checked }))} className="accent-red-600" />Print hairline cut guides</label>
        <div className="rounded-lg border border-zinc-800 bg-[#0B0B0C]/70 p-2 text-[11px] leading-relaxed text-zinc-400">
          In the print dialog choose <strong className="text-zinc-200">Save as PDF</strong>, margins <strong className="text-zinc-200">None</strong>, scale <strong className="text-zinc-200">100%</strong>, and turn on <strong className="text-zinc-200">Background graphics</strong>.
        </div>
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <span>{plural(printCount, 'page')} will print</span>
          <ToolButton icon="reset" label="Reset binder…" variant="danger" dense onClick={onReset} />
        </div>
      </div>
    </PopoverShell>
  );
}

function ShortcutsPopover() {
  const rows = [
    ['Ctrl/⌘ + Z', 'Undo canvas change'], ['Ctrl + Y / Ctrl/⌘ + Shift + Z', 'Redo canvas change'],
    ['Ctrl/⌘ + A', 'Select visible cards'], ['Esc', 'Cancel or clear'], ['Delete', 'Delete selected cards'],
    ['M', 'Toggle Combine mode'], ['Enter', 'Merge / confirm'], ['U', 'Unmerge selection'],
    ['← / →', 'Previous / next spread'], ['PageUp / PageDown', 'Previous / next spread'], ['F', 'Fill active page'],
    ['Double-click', 'Reposition an image'],
  ];
  return (
    <PopoverShell title="Keyboard shortcuts" icon="keyboard">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12px]">
        {rows.map(([key, action]) => <div key={key} className="contents"><dt><Kbd>{key}</Kbd></dt><dd className="text-zinc-300">{action}</dd></div>)}
      </dl>
    </PopoverShell>
  );
}

function PrintFitBadge({ fitInfo, paperKey, suggestedPaper, onUsePaper }) {
  const paper = PAPER_SIZES[paperKey];
  return (
    <div title={`Grid ${fmtMm(fitInfo.gridW)} × ${fmtMm(fitInfo.gridH)} mm`} className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap ${fitInfo.fitsTrueSize ? 'bg-emerald-500/12 text-emerald-300 ring-1 ring-inset ring-emerald-400/20' : 'bg-amber-500/12 text-amber-300 ring-1 ring-inset ring-amber-400/25'}`}>
      <Icon name={fitInfo.fitsTrueSize ? 'check' : 'alert'} size="xs" />
      <span>{fitInfo.fitsTrueSize ? `True size on ${paper.short}` : `${paper.short} at ${fmtPct(fitInfo.printFit)}`}</span>
      {!fitInfo.fitsTrueSize && suggestedPaper && <button type="button" onClick={() => onUsePaper(suggestedPaper)} className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-amber-200 hover:bg-amber-400/25">Use {PAPER_SIZES[suggestedPaper].short}</button>}
    </div>
  );
}

function SetupToolbar({ settings, setSettings, fitInfo, suggestedPaper, onChooseLayout, onViewChange }) {
  const cleanSize = settings.cardSize;
  const custom = cleanSize.preset === 'custom';
  const setCardSize = (patch) => setSettings((value) => ({ ...value, cardSize: sanitizeCardSize({ ...value.cardSize, ...patch }) }));
  return (
    <div role="toolbar" aria-label="Card sizing" className="no-print flex w-full shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-white/5 bg-neutral-950/80 px-6 py-1.5 shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-xl">
      <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-neutral-400">
        {custom && (
          <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-white/5 bg-neutral-900/60 px-2">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase">Custom size</span>
            <MmField label="W" value={cleanSize.customWmm} onCommit={(customWmm) => setCardSize({ customWmm })} />
            <span className="text-zinc-500">×</span>
            <MmField label="H" value={cleanSize.customHmm} onCommit={(customHmm) => setCardSize({ customHmm })} />
            <span className="text-[11px] text-zinc-400">mm</span>
          </div>
        )}
        <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-white/5 bg-neutral-900/60 px-2">
          <span className="shrink-0 text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Grid</span>
          <SegmentedControl
            ariaLabel="Pocket layout"
            value={settings.layout}
            onChange={onChooseLayout}
            dense={custom}
            options={GRID_LAYOUTS.map((layout) => ({ value: layout.id, label: String(layout.pockets), icon: layout.icon, ariaLabel: `${layout.label} (${layout.hint})`, title: `${layout.label} (${layout.hint})` }))}
          />
        </div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="hidden shrink-0 text-[10px] font-bold tracking-wider text-neutral-500 uppercase min-[1380px]:inline">Preview</span>
        <SegmentedControl ariaLabel="Preview" value={settings.view} onChange={onViewChange} options={[{ value: 'binder', label: 'Binder' }, { value: 'paper', label: 'Paper' }]} dense={custom} appearance="preview" />
        <PrintFitBadge fitInfo={fitInfo} paperKey={settings.paper} suggestedPaper={suggestedPaper} onUsePaper={(paper) => setSettings((value) => ({ ...value, paper }))} />
      </div>
    </div>
  );
}

function UploadZone({ empty, active, inputRef, onFiles }) {
  return (
    <label
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }}
      className={`group flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-neutral-900/30 transition-all hover:border-neutral-600 hover:bg-neutral-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${empty ? 'min-h-32 flex-col gap-2.5 p-6 text-center' : 'gap-3 p-3'} ${active ? 'border-red-600 bg-red-950/30' : ''}`}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
      <span className={`${empty ? 'size-10' : 'size-8'} grid shrink-0 place-items-center rounded-lg border border-white/5 bg-neutral-800 text-neutral-300 transition-colors group-hover:bg-neutral-700 group-hover:text-white ${active ? 'border-red-500/30 bg-red-950/70 text-red-300' : ''}`}><Icon name="upload" size={empty ? 'lg' : 'md'} /></span>
      <span>
        <span className="block text-xs font-semibold text-neutral-200">{empty ? 'Drop card images here' : 'Add more cards'}</span>
        {empty && <><span className="mt-1 block text-[11px] font-normal text-neutral-400">or click to browse</span><span className="mt-1.5 block font-mono text-[9px] tracking-normal text-neutral-500">PNG, JPG, WEBP, AVIF · multiple files</span></>}
      </span>
    </label>
  );
}

function PoolCard({ item, index, selectionIndex, placed, src, onClick, onDoubleClick, onDragStart, onDragEnd }) {
  const selected = selectionIndex >= 0;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-placed={placed ? '' : undefined}
      draggable
      title={item.name}
      onClick={(event) => onClick(event, index)}
      onDoubleClick={() => onDoubleClick(item.id)}
      onDragStart={(event) => onDragStart(event, item.id)}
      onDragEnd={onDragEnd}
      className={`group relative aspect-[5/7] min-w-0 cursor-grab overflow-hidden rounded-lg bg-[#121214] text-left outline-none transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/50 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-red-500 ${selected ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-zinc-950' : 'ring-1 ring-inset ring-zinc-800 hover:ring-zinc-600'} ${selected ? 'bg-red-950/60' : ''}`}
    >
      {src ? <img src={src} alt="" className={`absolute inset-0 size-full object-cover transition-[filter,opacity] ${placed ? 'grayscale opacity-35 group-hover:opacity-60' : ''} ${selected ? '!opacity-100' : ''}`} /> : <span className="absolute inset-0 grid place-items-center text-zinc-600"><Icon name="image" size="xl" /></span>}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white"><span className="block overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span></span>
      {selected && <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow">{selectionIndex + 1}</span>}
    </button>
  );
}

function CardPool({
  pool,
  visiblePool,
  selected,
  placedIds,
  images,
  settings,
  setSettings,
  inputRef,
  onFiles,
  onPoolClick,
  onPoolDoubleClick,
  onPoolDragStart,
  onDragEnd,
  onSelectAll,
  onClearSelection,
  onFill,
  onDeleteSelected,
  sidebarDropActive,
  slotDropActive,
  onDragOver,
  onDragLeave,
  onDrop,
  searchQuery,
  setSearchQuery,
  fetchedCards,
  isLoading,
  setsList,
  selectedSet,
  setSelectedSet,
  apiPage,
  setApiPage,
  apiHasNext,
  searchError,
  onSearchSubmit,
  onFetchedCardDragStart,
  onFetchedCardAdd,
}) {
  const searchActive = Boolean(searchQuery.trim() || selectedSet);
  return (
    <aside
      className={`no-print relative flex w-[340px] shrink-0 flex-col border-r border-white/5 bg-neutral-950/80 shadow-[8px_0_28px_rgba(0,0,0,0.18)] ${sidebarDropActive ? 'ring-2 ring-inset ring-red-600' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3">
        <div><h2 className="text-sm font-semibold tracking-tight text-white">Card Pool</h2><p className="mt-0.5 text-[11px] text-neutral-400">{plural(pool.length, 'card')} · {selected.length} selected</p></div>
        <button
          type="button"
          aria-pressed={settings.hidePlaced}
          onClick={() => setSettings((value) => ({ ...value, hidePlaced: !value.hidePlaced }))}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.06] bg-neutral-900 px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${settings.hidePlaced ? 'text-neutral-100' : 'text-neutral-400'}`}
        >
          <Icon name={settings.hidePlaced ? 'eyeOff' : 'eye'} size="sm" />
          <span>Unplaced only</span>
        </button>
      </div>
      <div className="px-4 pb-3">
        <form
          role="search"
          className="relative"
          onSubmit={(event) => { event.preventDefault(); onSearchSubmit(); }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => { setSearchQuery(event.target.value); setApiPage(1); }}
            aria-label="Search Pokémon cards"
            placeholder="Search Pokémon cards…"
            autoComplete="off"
            className="w-full px-3 py-1.5 bg-neutral-950 border border-white/[0.06] rounded-md text-xs font-medium text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
          />
          {isLoading && <span aria-hidden="true" className="absolute right-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border border-neutral-600 border-t-red-500" />}
        </form>
        <div className="mt-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Card set</span>
            <select
              value={selectedSet}
              aria-label="Filter by Pokémon set"
              onChange={(event) => { setSelectedSet(event.target.value); setApiPage(1); }}
              className="w-full px-2.5 py-1.5 bg-neutral-950 border border-white/[0.06] rounded-md text-xs font-medium text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="">All sets</option>
              {setsList.map((set) => <option key={set.id} value={set.id}>{set.name}{set.cardCount ? ` · ${set.cardCount}` : ''}</option>)}
            </select>
          </label>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] font-mono text-neutral-400">
            <button
              type="button"
              aria-label="Previous API page"
              title="Previous result page"
              disabled={apiPage <= 1 || isLoading}
              onClick={() => setApiPage((value) => Math.max(1, value - 1))}
              className="grid size-6 place-items-center rounded text-neutral-500 transition-colors hover:text-neutral-200 disabled:pointer-events-none disabled:text-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
            ><Icon name="chevronLeft" size="xs" /></button>
            <span>Page {apiPage}</span>
            <button
              type="button"
              aria-label="Next API page"
              title="Next result page"
              disabled={!searchActive || !apiHasNext || isLoading}
              onClick={() => setApiPage((value) => value + 1)}
              className="grid size-6 place-items-center rounded text-neutral-500 transition-colors hover:text-neutral-200 disabled:pointer-events-none disabled:text-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
            ><Icon name="chevronRight" size="xs" /></button>
          </div>
          <div aria-live="polite" className="mt-1 flex items-center justify-between px-0.5 text-[9px] font-medium tracking-wide text-neutral-600 uppercase">
            <span>TCGdex catalogue</span>
            {searchActive && <span>{isLoading ? 'Loading…' : plural(fetchedCards.length, 'result')}</span>}
          </div>
        </div>
      </div>
      {searchActive ? (
        <section aria-label="TCGdex search results" className="flex min-h-0 flex-1 flex-col px-3 pb-4">
          {searchError && <div role="alert" className="mx-1 mb-2 rounded-md border border-red-500/20 bg-red-950/30 px-2.5 py-2 text-[10px] leading-relaxed text-red-300">{searchError}</div>}
          <div data-tcgdex-results role="listbox" aria-label="Pokémon card search results" aria-busy={isLoading} className="scroll-area grid grid-cols-2 gap-2 p-1 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin">
            {isLoading && !fetchedCards.length && Array.from({ length: 6 }, (_, index) => <span key={index} aria-hidden="true" className="aspect-[245/337] animate-pulse rounded-lg border border-white/[0.04] bg-neutral-900" />)}
            {fetchedCards.map((item) => {
              const fullImageUrl = item.image ? `${item.image}/low.jpg` : '/placeholder.png';
              const highResImageUrl = item.image ? `${item.image}/high.jpg` : '/placeholder.png';
              return (
                <div
                  key={item.id}
                  data-tcgdex-card={item.id}
                  role="option"
                  aria-selected="false"
                  aria-label={`${item.name}, drag to binder`}
                  tabIndex={0}
                  draggable="true"
                  title={`${item.name} · drag to a binder slot`}
                  onDragStart={(event) => onFetchedCardDragStart(event, item, highResImageUrl)}
                  onDragEnd={onDragEnd}
                  onDoubleClick={() => onFetchedCardAdd(item, highResImageUrl)}
                  onKeyDown={(event) => { if (event.key === 'Enter') onFetchedCardAdd(item, highResImageUrl); }}
                  className="group relative aspect-[245/337] cursor-grab overflow-hidden rounded-lg border border-white/[0.06] bg-neutral-900 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg hover:shadow-black/50 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  <img src={fullImageUrl} alt="" draggable={false} loading="lazy" className="size-full object-cover" onError={(event) => { if (!event.currentTarget.src.endsWith('/placeholder.png')) event.currentTarget.src = '/placeholder.png'; }} />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-1.5 pt-7">
                    <span className="block truncate text-[10px] font-semibold text-white">{item.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[8px] tracking-wide text-neutral-400 uppercase">{item.id}</span>
                  </span>
                </div>
              );
            })}
            {!isLoading && !searchError && !fetchedCards.length && <div className="col-span-2 text-center py-12 text-xs text-neutral-500 font-mono tracking-wide">No matching Pokémon cards found.</div>}
          </div>
          <p className="mt-2 px-1 text-center text-[9px] leading-relaxed text-neutral-600">Drag to a slot or double-click to add · Powered by TCGdex</p>
        </section>
      ) : (
        <>
          <div className="px-4 pb-3"><UploadZone empty={!pool.length} active={sidebarDropActive && !slotDropActive} inputRef={inputRef} onFiles={onFiles} /></div>
          {pool.length > 0 && (
            <div role="toolbar" aria-label="Pool actions" className="grid grid-cols-[0.6fr_1.1fr_1fr_1.2fr] gap-1 px-4 pb-3">
              <ToolButton icon="selectAll" label="All" dense onClick={onSelectAll} disabled={!visiblePool.length} disabledReason="No visible cards" className="w-full px-1 text-[11px]" />
              <ToolButton icon="x" label={selected.length ? `None (${selected.length})` : 'None'} dense onClick={onClearSelection} disabled={!selected.length} className={`w-full px-1 text-[11px] ${selected.length ? 'text-zinc-200' : 'pointer-events-none opacity-40'}`} />
              <ToolButton icon="wand" label={selected.length ? `Fill (${selected.length})` : 'Fill'} dense variant={selected.length ? 'primary' : 'ghost'} onClick={onFill} disabled={!selected.length} className={`w-full px-1 text-[11px] ${selected.length ? '' : 'pointer-events-none opacity-40'}`} />
              <ToolButton icon="trash" label={selected.length ? `Delete (${selected.length})` : 'Delete'} dense variant="danger" onClick={onDeleteSelected} disabled={!selected.length} className={`w-full px-1 text-[11px] ${selected.length ? '' : 'pointer-events-none opacity-40'}`} />
            </div>
          )}
          <div role="listbox" aria-multiselectable="true" className="scroll-area grid flex-1 auto-rows-max grid-cols-3 content-start gap-2 px-4 pb-4" onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}>
            {visiblePool.map((item, visibleIndex) => <PoolCard key={item.id} item={item} index={visibleIndex} selectionIndex={selected.indexOf(item.id)} placed={placedIds.has(item.id)} src={images[item.id] || item.src} onClick={onPoolClick} onDoubleClick={onPoolDoubleClick} onDragStart={onPoolDragStart} onDragEnd={onDragEnd} />)}
            {!pool.length && <div className="col-span-3 mt-4 text-center text-[11px] leading-relaxed text-zinc-500">Images stay on this device and save automatically.</div>}
            {pool.length > 0 && !visiblePool.length && <div className="col-span-3 mt-8 text-center text-[12px] text-zinc-500">Every card is placed. Turn off “Unplaced only” to see them.</div>}
          </div>
        </>
      )}
      {slotDropActive && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-red-950/80 p-6 text-center text-sm font-semibold text-red-100 backdrop-blur-sm"><span className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3"><Icon name="trash" />Drop to remove from binder</span></div>}
    </aside>
  );
}

function CanvasToolbar({ combineMode, setCombineMode, selBox, canMerge, mergeLabel, onMerge, selectedMergeCount, onUnmerge, onResetLayout, onClearPage, filled, total, mergedCount, layout, pageNumber }) {
  return (
    <div data-workspace-toolbar data-active-page={pageNumber} role="toolbar" aria-label={`Grid tools for page ${pageNumber}`} className="@container absolute inset-x-0 bottom-full z-40 mb-3 flex h-10 w-full max-w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#121214]/95 px-1.5 shadow-xl shadow-black/40 backdrop-blur">
      <div className="flex shrink-0 items-center">
        <ToolButton icon="combine" dense active={combineMode} onClick={() => setCombineMode((value) => !value)} title="Combine Slots (M)" className="@[21rem]:hidden">
        </ToolButton>
        <button type="button" aria-pressed={combineMode} onClick={() => setCombineMode((value) => !value)} title="Combine Slots (M)" className="hidden h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium text-zinc-300 hover:bg-white/10 @[21rem]:inline-flex @[32.25rem]:hidden"><Icon name="combine" size="sm" /><span className="hidden @[24.25rem]:inline">Combine</span></button>
        <button type="button" aria-pressed={combineMode} onClick={() => setCombineMode((value) => !value)} title="Combine Slots (M)" className={`hidden h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium @[32.25rem]:inline-flex ${combineMode ? 'bg-red-950/60 text-red-400 ring-1 ring-inset ring-red-800/60' : 'text-zinc-300 hover:bg-white/10'}`}><Icon name="combine" size="sm" /><span>Combine Slots</span><Kbd>M</Kbd></button>
        <ToolbarDivider slim />
        <ToolButton icon="merge" label={canMerge ? mergeLabel : 'Merge'} dense variant={canMerge ? 'primary' : 'ghost'} onClick={onMerge} disabled={!canMerge} disabledReason={!combineMode ? 'Turn on Combine mode and drag across slots' : selBox ? 'Select more than one slot' : 'Drag across two or more slots'} className="[&>span]:hidden @[18rem]:[&>span]:inline" />
        <ToolButton icon="split" label={selectedMergeCount > 1 ? `Unmerge ${selectedMergeCount}` : 'Unmerge'} dense onClick={onUnmerge} disabled={!selectedMergeCount} disabledReason="Select a merged frame to unmerge" className="[&>span]:hidden @[18rem]:[&>span]:inline" />
      </div>
      <div className="flex shrink-0 items-center">
        <span className="mr-1 hidden text-[10px] font-bold tracking-widest whitespace-nowrap text-neutral-500 uppercase @[24rem]:inline">Page {pageNumber}</span>
        <ToolButton icon={layout.icon} dense title={`Reset ${layout.label} layout`} onClick={onResetLayout} disabled={!mergedCount} disabledReason="No merged frames to reset" />
        <ToolButton icon="eraser" dense variant="danger" title="Clear page" onClick={onClearPage} disabled={!filled} disabledReason="Page is already empty" />
        <ToolbarDivider slim />
        <span title={`${filled} of ${total} slots filled · ${plural(mergedCount, 'merged frame')}`} className="hidden h-6 shrink-0 items-center rounded-full bg-zinc-800 px-2 text-[10px] font-medium whitespace-nowrap text-zinc-300 @[18rem]:inline-flex">{filled}/{total}<span className="hidden @[32.25rem]:inline">&nbsp;filled</span></span>
      </div>
    </div>
  );
}

function CanvasHelper({ editing, multiDrag, flowCount, combineMode, offsetX, onCenter, onCancel, onDone }) {
  let tone = 'border-zinc-800 bg-[#121214] text-zinc-200';
  let content;
  if (editing) {
    tone = 'border-amber-400/30 bg-amber-950/90 text-amber-100';
    content = <><Icon name="move" size="sm" /><span>Reposition image — drag inside the slot · arrows nudge · click outside to confirm</span><ToolButton label="Center" dense onClick={onCenter} /><ToolButton label="Cancel" dense onClick={onCancel} /><ToolButton label="Done" dense variant="primary" onClick={onDone} /></>;
  } else if (multiDrag > 1) {
    tone = 'border-emerald-400/30 bg-emerald-950/90 text-emerald-100';
    content = <><Icon name="wand" size="sm" /><span>Dropping {plural(multiDrag, 'card')} into the first empty slots{flowCount ? ` · ${flowCount} will flow to the next page(s)` : ''}</span></>;
  } else if (combineMode) {
    tone = 'border-red-800/60 bg-red-950/80 text-red-100';
    content = <><Icon name="combine" size="sm" /><span>Combine mode · drag across slots, then Enter to merge · click a frame, then U to unmerge · Esc to exit</span></>;
  } else return null;

  return <div data-reposition-ui={editing ? '' : undefined} className={`absolute top-full z-30 mt-4 flex h-8 w-auto min-w-fit max-w-none -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 text-[11px] whitespace-nowrap shadow-xl shadow-black/30 ${tone}`} style={{ left: `calc(50% + ${offsetX}px)` }}>{content}</div>;
}

function WorkspaceStatusBar() {
  return (
    <footer data-workspace-status className="no-print pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex select-none items-center justify-center gap-4 overflow-hidden border-t border-white/[0.05] bg-neutral-950/80 px-4 py-1.5 font-mono text-[10px] whitespace-nowrap text-neutral-400 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <span><kbd className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 font-sans text-[9px] text-neutral-200 shadow-sm">Ctrl / ⌘</kbd> + Click to select multiple cards</span>
      <span aria-hidden="true" className="text-neutral-700">|</span>
      <span><kbd className="rounded border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 font-sans text-[9px] text-neutral-200 shadow-sm">Shift</kbd> + Click for page ranges</span>
      <span aria-hidden="true" className="text-neutral-700">|</span>
      <span>Drag and drop assets directly onto active binder slots</span>
    </footer>
  );
}

function BinderSpine({ view }) {
  const binderView = view === 'binder';
  return (
    <div
      data-binder-spine
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-1/2 z-30 -translate-x-1/2 ${binderView ? 'w-8 shadow-[inset_10px_0_18px_-12px_rgba(0,0,0,0.98),inset_-10px_0_18px_-12px_rgba(0,0,0,0.98)]' : 'w-px bg-black/70'}`}
    >
      {binderView && <span data-spine-crease className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-r from-black/50 via-transparent to-black/50" />}
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/80" />
      {binderView && [0.17, 0.5, 0.83].map((position) => (
        <span
          key={position}
          className="absolute left-1/2 h-3 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-gradient-to-b from-neutral-500/70 via-neutral-800 to-black shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.9)]"
          style={{ top: `${position * 100}%` }}
        >
          <span className="absolute inset-x-2 top-px h-px rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        </span>
      ))}
    </div>
  );
}

export default function CardBinder() {
  const boot = useMemo(loadPersisted, []);
  const [sheets, setSheets] = useState(() => sheetsFromPages(boot.pages));
  const pages = useMemo(() => pagesFromSheets(sheets), [sheets]);
  const setPages = useCallback((updater) => {
    setSheets((currentSheets) => {
      const currentPages = pagesFromSheets(currentSheets);
      const nextPages = typeof updater === 'function' ? updater(currentPages) : updater;
      return sheetsFromPages(nextPages);
    });
  }, []);
  const [currentPage, setCurrentPage] = useState(boot.currentPage);
  const [pool, setPool] = useState(boot.pool);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedCards, setFetchedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [setsList, setSetsList] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [apiPage, setApiPage] = useState(1);
  const [apiHasNext, setApiHasNext] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [settings, setSettings] = useState(boot.settings);
  const [images, setImages] = useState(() => Object.fromEntries(boot.pool.filter((item) => item.src).map((item) => [item.id, item.src])));
  const [imageDims, setImageDims] = useState({});
  const [selected, setSelected] = useState([]);
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [storageMode, setStorageMode] = useState('indexeddb');
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [openPanel, setOpenPanel] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [combineMode, setCombineModeState] = useState(false);
  const [selBox, setSelBox] = useState(null);
  const [selectionPageId, setSelectionPageId] = useState(null);
  const [pageFlip, setPageFlip] = useState({ animating: false, turned: false, direction: 1, token: 0, plan: null });
  const [marqueeActive, setMarqueeActive] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [dropPreview, setDropPreview] = useState([]);
  const [sidebarDropActive, setSidebarDropActive] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stageSize, setStageSize] = useState({ w: 1000, h: 620 });

  const stageRef = useRef(null);
  const inputRef = useRef(null);
  const panelRootRef = useRef(null);
  const dragRef = useRef(null);
  const searchAbortRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const setCardsCacheRef = useRef(new Map());
  const marqueeRef = useRef(null);
  const selBoxRef = useRef(selBox);
  const selectionPageIdRef = useRef(selectionPageId);
  const dropPreviewRef = useRef(dropPreview);
  const suppressClickRef = useRef(false);
  const slotActionGuardRef = useRef(0);
  const editingRef = useRef(null);
  const panRef = useRef(null);
  const pageFlipTimerRef = useRef([]);
  const pageFlipTokenRef = useRef(0);
  const historyRestoreTimerRef = useRef([]);
  const dimensionsRef = useRef(null);
  const sessionIdsRef = useRef(new Set());
  const objectUrlsRef = useRef(new Set());
  const persistedRef = useRef(false);
  const pagesRef = useRef(pages);
  const currentPageRef = useRef(currentPage);
  const previousPageIndexRef = useRef(currentPage);
  const layoutIdRef = useRef(settings.layout);
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  const layout = getLayout(settings.layout);
  const dims = useMemo(() => ({ rows: layout.rows, cols: layout.cols }), [layout.rows, layout.cols]);
  const dimsRef = useRef(dims);
  const card = useMemo(() => resolveCardSize(settings.cardSize), [settings.cardSize]);
  const paper = PAPER_SIZES[settings.paper];
  const gridW = spanW(dims.cols, settings.gap, card);
  const gridH = spanH(dims.rows, settings.gap, card);
  const fitFor = useCallback((paperValue) => Math.min(1, (paperValue.wIn - 2 * PRINT_SAFE_MARGIN_IN) / gridW, (paperValue.hIn - 2 * PRINT_SAFE_MARGIN_IN) / gridH), [gridW, gridH]);
  const printFit = fitFor(paper);
  const fitsTrueSize = printFit >= 0.9999;
  const fitInfo = { gridW, gridH, printFit, fitsTrueSize };
  const suggestedPaper = Object.entries(PAPER_SIZES).find(([, value]) => fitFor(value) >= 0.9999)?.[0] || null;
  const current = pages[currentPage] || pages[0];
  const spreadGroups = useMemo(() => binderViewGroups(pages.length), [pages.length]);
  const activeSpread = useMemo(() => binderViewForPage(currentPage, pages.length), [currentPage, pages.length]);
  const activeSpreadIndex = spreadGroups.findIndex((group) => group.includes(currentPage));
  const visible = useMemo(() => visibleAssignments(pages, dims), [pages, dims]);
  const hidden = useMemo(() => hiddenAssignments(pages, dims), [pages, dims]);
  const placedIds = useMemo(() => new Set(visible.map((assignment) => assignment.id)), [visible]);
  const visiblePool = useMemo(() => pool.filter((item) => !settings.hidePlaced || !placedIds.has(item.id)), [pool, settings.hidePlaced, placedIds]);
  const selectedOrdered = useMemo(() => pool.filter((item) => selected.includes(item.id)).map((item) => item.id), [pool, selected]);
  const printPages = useMemo(() => pages.filter((page) => !settings.skipEmptyPages || getSlots(page, dims).some((slot) => page.slots[slot.key])), [pages, settings.skipEmptyPages, dims]);

  useEffect(() => { layoutIdRef.current = settings.layout; }, [settings.layout]);
  useEffect(() => { dimsRef.current = dims; }, [dims]);
  useEffect(() => { editingRef.current = editing; }, [editing]);
  useEffect(() => { selBoxRef.current = selBox; }, [selBox]);
  useEffect(() => { selectionPageIdRef.current = selectionPageId; }, [selectionPageId]);
  useEffect(() => { dropPreviewRef.current = dropPreview; }, [dropPreview]);

  const notify = useCallback((message, tone = 'info', action = null) => {
    const id = uid('toast');
    setToasts((items) => [...items.slice(-3), { id, message, tone, action }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), action ? 6500 : 3400);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const endpoint = `${TCGDEX_SETS_ENDPOINT}?sort:field=releaseDate&sort:order=DESC`;
        let response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if ([400, 422].includes(response.status)) response = await fetch(TCGDEX_SETS_ENDPOINT, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`TCGdex returned ${response.status}`);
        setSetsList(normalizeTcgdexSets(await response.json()));
      } catch (error) {
        if (error?.name !== 'AbortError') setSetsList([]);
      }
    })();
    return () => controller.abort();
  }, []);

  const fetchCards = useCallback(async (rawQuery, setId, pageNumber) => {
    const query = String(rawQuery || '').trim();
    const activeSet = String(setId || '').trim();
    const nextPage = Math.max(1, Math.floor(Number(pageNumber) || 1));
    if (!query && !activeSet) {
      setFetchedCards([]);
      setApiHasNext(false);
      setSearchError('');
      setIsLoading(false);
      return;
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setIsLoading(true);
    setSearchError('');
    try {
      let normalized;
      let hasNext;
      if (activeSet) {
        let setCards = setCardsCacheRef.current.get(activeSet);
        if (!setCards) {
          const response = await fetch(`${TCGDEX_SETS_ENDPOINT}/${encodeURIComponent(activeSet)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error(`TCGdex returned ${response.status}`);
          const payload = await response.json();
          setCards = Array.isArray(payload?.cards) ? payload.cards : [];
          setCardsCacheRef.current.set(activeSet, setCards);
        }
        const needle = query.toLocaleLowerCase();
        const matching = needle ? setCards.filter((item) => String(item?.name || '').toLocaleLowerCase().includes(needle)) : setCards;
        const start = (nextPage - 1) * TCGDEX_RESULT_LIMIT;
        const pageItems = matching.slice(start, start + TCGDEX_RESULT_LIMIT);
        normalized = normalizeTcgdexCards(pageItems);
        hasNext = start + TCGDEX_RESULT_LIMIT < matching.length;
      } else {
        const endpoint = `${TCGDEX_SEARCH_ENDPOINT}${encodeURIComponent(query)}&pagination:page=${nextPage}&pagination:itemsPerPage=${TCGDEX_RESULT_LIMIT}`;
        const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`TCGdex returned ${response.status}`);
        normalized = normalizeTcgdexCards(await response.json());
        hasNext = normalized.length === TCGDEX_RESULT_LIMIT;
      }
      if (searchAbortRef.current !== controller) return;
      setFetchedCards(normalized);
      setApiHasNext(hasNext);
    } catch (error) {
      if (error?.name === 'AbortError' || searchAbortRef.current !== controller) return;
      setFetchedCards([]);
      setApiHasNext(false);
      setSearchError('TCGdex search is unavailable right now. Check your connection and try again.');
    } finally {
      if (searchAbortRef.current === controller) setIsLoading(false);
    }
  }, []);

  const submitCardSearch = useCallback(() => {
    window.clearTimeout(searchDebounceRef.current);
    fetchCards(searchQuery, selectedSet, apiPage);
  }, [fetchCards, searchQuery, selectedSet, apiPage]);

  useEffect(() => {
    window.clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    const query = searchQuery.trim();
    if (!query && !selectedSet) {
      setFetchedCards([]);
      setApiHasNext(false);
      setSearchError('');
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    searchDebounceRef.current = window.setTimeout(() => fetchCards(query, selectedSet, apiPage), query ? 350 : 0);
    return () => window.clearTimeout(searchDebounceRef.current);
  }, [searchQuery, selectedSet, apiPage, fetchCards]);

  useEffect(() => () => {
    window.clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const records = await idbGetAll();
        if (cancelled) return;
        const recordMap = new Map(records.map((record) => [record.id, record]));
        const urls = {};
        records.forEach((record) => {
          const url = URL.createObjectURL(record.blob);
          objectUrlsRef.current.add(url);
          urls[record.id] = url;
        });
        setImages((value) => ({ ...value, ...urls }));
        setPool((value) => {
          const present = new Set(value.map((item) => item.id));
          const kept = value.filter((item) => recordMap.has(item.id) || item.src || sessionIdsRef.current.has(item.id));
          const orphans = records.filter((record) => !present.has(record.id)).sort((a, b) => (a.added || 0) - (b.added || 0)).map((record) => ({ id: record.id, name: record.name || 'Card image' }));
          const reconciled = [...kept, ...orphans];
          const valid = new Set(reconciled.map((item) => item.id));
          setPages((currentPages) => {
            const nextPages = pruneMissingImages(currentPages, valid);
            pagesRef.current = nextPages;
            return nextPages;
          });
          return reconciled;
        });
        setStorageMode('indexeddb');
      } catch {
        if (cancelled) return;
        setStorageMode('localstorage');
        const valid = new Set(boot.pool.filter((item) => item.src).map((item) => item.id));
        setPool((value) => value.filter((item) => item.src || sessionIdsRef.current.has(item.id)));
        setPages((value) => {
          const nextPages = pruneMissingImages(value, valid);
          pagesRef.current = nextPages;
          return nextPages;
        });
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!hydrated) return undefined;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      try {
        const payload = { version: SCHEMA_VERSION, savedAt: Date.now(), currentPage, settings, pool, pages };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
        notify('Browser storage is full. Remove some images or pages, then try again.', 'error');
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [pages, currentPage, pool, settings, hydrated, notify]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !('ResizeObserver' in window)) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setStageSize((value) => (
        Math.abs(value.w - width) < 0.5 && Math.abs(value.h - height) < 0.5 ? value : { w: width, h: height }
      ));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onBeforeInstall = (event) => { event.preventDefault(); setInstallPrompt(event); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    if (window.matchMedia('(display-mode: standalone)').matches) screen.orientation?.lock?.('landscape').catch(() => {});
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type?.startsWith('image/'));
    if (!files.length) {
      notify('Choose PNG, JPG, WEBP, GIF, or AVIF image files.', 'warn');
      return [];
    }
    const added = Date.now();
    const entries = files.map((file, index) => ({ id: uid('image'), name: file.name || `Card ${pool.length + index + 1}`, file, added: added + index }));
    entries.forEach((entry) => sessionIdsRef.current.add(entry.id));
    if (storageMode === 'indexeddb') {
      try {
        await idbPutMany(entries.map((entry) => ({ id: entry.id, name: entry.name, type: entry.file.type, blob: entry.file, added: entry.added })));
        const nextImages = {};
        entries.forEach((entry) => {
          const url = URL.createObjectURL(entry.file);
          objectUrlsRef.current.add(url);
          nextImages[entry.id] = url;
        });
        setImages((value) => ({ ...value, ...nextImages }));
        setPool((value) => [...value, ...entries.map(({ id, name }) => ({ id, name }))]);
        if (!persistedRef.current) {
          persistedRef.current = true;
          navigator.storage?.persist?.().catch(() => {});
        }
      } catch {
        setStorageMode('localstorage');
        try {
          const urls = await Promise.all(entries.map((entry) => readFileAsDataUrl(entry.file)));
          setImages((value) => ({ ...value, ...Object.fromEntries(entries.map((entry, index) => [entry.id, urls[index]])) }));
          setPool((value) => [...value, ...entries.map((entry, index) => ({ id: entry.id, name: entry.name, src: urls[index] }))]);
          notify('IndexedDB is unavailable. Images will use browser storage instead.', 'warn');
        } catch {
          notify('Could not read one or more images.', 'error');
          return [];
        }
      }
    } else {
      try {
        const urls = await Promise.all(entries.map((entry) => readFileAsDataUrl(entry.file)));
        setImages((value) => ({ ...value, ...Object.fromEntries(entries.map((entry, index) => [entry.id, urls[index]])) }));
        setPool((value) => [...value, ...entries.map((entry, index) => ({ id: entry.id, name: entry.name, src: urls[index] }))]);
      } catch {
        notify('Could not read one or more images.', 'error');
        return [];
      }
    }
    notify(`${plural(entries.length, 'image')} added to the Card Pool.`, 'success');
    return entries.map((entry) => entry.id);
  }, [notify, pool.length, storageMode]);

  const importFetchedCard = useCallback(async (item, highResImageUrl) => {
    const requestedSource = highResImageUrl || (item.image ? `${item.image}/high.jpg` : '/placeholder.png');
    const source = requestedSource === '/placeholder.png' || requestedSource.startsWith(`${TCGDEX_ASSET_CDN}/`) ? requestedSource : '/placeholder.png';
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Image download returned ${response.status}`);
      const blob = await response.blob();
      if (!blob.type?.startsWith('image/')) throw new Error('TCGdex returned a non-image asset');
      const file = new File([blob], `${safeFileName(item.name)} · ${safeFileName(item.id)}.jpg`, { type: blob.type || 'image/jpeg' });
      const ids = await addFiles([file]);
      if (ids.length) return ids;
    } catch {
      // Some privacy extensions block cross-origin blob downloads. The live CDN URL
      // still remains a valid, persistable source for the binder and print views.
    }
    const id = uid('tcgdex');
    sessionIdsRef.current.add(id);
    setImages((value) => ({ ...value, [id]: source }));
    setPool((value) => [...value, { id, name: item.name || 'Pokémon card', src: source }]);
    notify(`${item.name || 'Pokémon card'} added from TCGdex.`, 'success');
    return [id];
  }, [addFiles, notify]);

  useEffect(() => {
    if (!('launchQueue' in window)) return undefined;
    let live = true;
    window.launchQueue.setConsumer(async (params) => {
      const files = await Promise.all((params.files || []).map((handle) => handle.getFile()));
      if (live) addFiles(files);
    });
    return () => { live = false; };
  }, [addFiles]);

  const beginPageFlip = useCallback((fromPage, toPage, options = {}) => {
    const fromPages = options.fromPages || pagesRef.current;
    const toPages = options.toPages || fromPages;
    const fromGroup = binderViewForPage(fromPage, fromPages.length);
    const toGroup = binderViewForPage(toPage, toPages.length);
    previousPageIndexRef.current = fromPage;
    if (fromGroup.join('-') === toGroup.join('-') && fromPages.length === toPages.length) return;

    pageFlipTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    pageFlipTimerRef.current = [];
    const token = pageFlipTokenRef.current + 1;
    const direction = toPage > previousPageIndexRef.current ? 1 : -1;
    const pageIdAt = (source, index) => source[index]?.id || null;
    const leavingFirstPage = direction > 0 && fromGroup.length === 1 && fromGroup[0] === 0;
    const returningToFirstPage = direction < 0 && toGroup.length === 1 && toGroup[0] === 0;
    const movingToLastPage = direction > 0 && toGroup.length === 1 && toGroup[0] === toPages.length - 1;
    const leavingLastPage = direction < 0 && fromGroup.length === 1 && fromGroup[0] === fromPages.length - 1;
    const plan = direction > 0 ? {
      turnSide: 'right',
      frontPageId: pageIdAt(fromPages, fromGroup[fromGroup.length - 1]),
      backPageId: pageIdAt(toPages, toGroup[0]),
      baseLeftPageId: fromGroup.length === 2 ? pageIdAt(fromPages, fromGroup[0]) : null,
      baseRightPageId: toGroup.length === 2 ? pageIdAt(toPages, toGroup[1]) : null,
      boundary: leavingFirstPage ? 'front-cover' : (movingToLastPage ? 'back-cover' : 'spread'),
    } : {
      turnSide: 'left',
      frontPageId: pageIdAt(fromPages, fromGroup[0]),
      backPageId: pageIdAt(toPages, toGroup[toGroup.length - 1]),
      baseLeftPageId: toGroup.length === 2 ? pageIdAt(toPages, toGroup[0]) : null,
      baseRightPageId: fromGroup.length === 2 ? pageIdAt(fromPages, fromGroup[1]) : null,
      boundary: returningToFirstPage ? 'front-cover' : (leavingLastPage ? 'back-cover' : 'spread'),
    };

    pageFlipTokenRef.current = token;
    setPageFlip({ animating: true, turned: false, direction, token, plan });
    const turnTimer = window.setTimeout(() => {
      if (pageFlipTokenRef.current === token) setPageFlip((value) => value.token === token ? { ...value, turned: true } : value);
    }, 40);
    const finishTimer = window.setTimeout(() => {
      if (pageFlipTokenRef.current === token) setPageFlip((value) => value.token === token ? { ...value, animating: false, turned: false, plan: null } : value);
    }, 560);
    pageFlipTimerRef.current = [turnTimer, finishTimer];
  }, []);

  useEffect(() => () => {
    pageFlipTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    historyRestoreTimerRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const clearHistory = useCallback(() => {
    historyRestoreTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    historyRestoreTimerRef.current = [];
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  const restoreCanvasSnapshot = useCallback((snapshot) => {
    if (!snapshot?.pages?.length) return;
    const nextPages = normalizePhysicalPages(clonePages(snapshot.pages));
    const nextPage = clamp(snapshot.currentPage, 0, nextPages.length - 1);
    const nextLayout = getLayout(snapshot.layout).id;
    const layoutChanged = layoutIdRef.current !== nextLayout;
    previousPageIndexRef.current = currentPageRef.current;
    pagesRef.current = nextPages;
    currentPageRef.current = nextPage;
    layoutIdRef.current = nextLayout;
    dimsRef.current = { rows: getLayout(nextLayout).rows, cols: getLayout(nextLayout).cols };
    const renderTimer = window.setTimeout(() => {
      setPages(nextPages);
      setCurrentPage(nextPage);
      if (layoutChanged) setSettings((value) => ({ ...value, layout: nextLayout }));
      historyRestoreTimerRef.current = historyRestoreTimerRef.current.filter((timer) => timer !== renderTimer);
    }, 0);
    historyRestoreTimerRef.current.push(renderTimer);
    if (selBoxRef.current) { selBoxRef.current = null; setSelBox(null); }
    if (selectionPageIdRef.current) { selectionPageIdRef.current = null; setSelectionPageId(null); }
    if (marqueeRef.current) { marqueeRef.current = null; setMarqueeActive(false); }
    if (dropPreviewRef.current.length) { dropPreviewRef.current = []; setDropPreview([]); }
    if (editingRef.current) { editingRef.current = null; setEditing(null); }
  }, []);

  const applyCanvasChange = useCallback((updater, options = {}) => {
    historyRestoreTimerRef.current.forEach((timer) => window.clearTimeout(timer));
    historyRestoreTimerRef.current = [];
    const previousPages = pagesRef.current;
    const previousPage = currentPageRef.current;
    const previousLayout = layoutIdRef.current;
    const candidatePages = typeof updater === 'function' ? updater(previousPages) : updater;
    if (!Array.isArray(candidatePages) || !candidatePages.length) return { pages: previousPages, changed: false };
    const nextPages = normalizePhysicalPages(candidatePages);
    const requestedPage = options.currentPage === undefined ? previousPage : options.currentPage;
    const nextPage = clamp(typeof requestedPage === 'function' ? requestedPage(previousPage) : requestedPage, 0, nextPages.length - 1);
    const nextLayout = options.layout ? getLayout(options.layout).id : previousLayout;
    const changed = !sameCanvasPages(previousPages, nextPages) || nextPage !== previousPage || nextLayout !== previousLayout;
    if (!changed) return { pages: previousPages, changed: false };

    const nextPast = [...pastRef.current, makeCanvasSnapshot(previousPages, previousPage, previousLayout)].slice(-HISTORY_LIMIT);
    pastRef.current = nextPast;
    futureRef.current = [];

    pagesRef.current = nextPages;
    if (nextPage !== previousPage) previousPageIndexRef.current = previousPage;
    currentPageRef.current = nextPage;
    setPages(nextPages);
    if (nextPage !== previousPage) setCurrentPage(nextPage);
    if (nextLayout !== previousLayout) {
      const nextLayoutValue = getLayout(nextLayout);
      layoutIdRef.current = nextLayout;
      dimsRef.current = { rows: nextLayoutValue.rows, cols: nextLayoutValue.cols };
      setSettings((value) => ({ ...value, layout: nextLayout }));
    }
    return { pages: nextPages, changed: true };
  }, []);

  const commitEditing = useCallback(() => {
    const value = editingRef.current;
    if (!value) return;
    applyCanvasChange((allPages) => allPages.map((page) => {
      if (page.id !== value.pageId || page.slots[value.key] !== value.imgId) return page;
      const crops = { ...page.crops };
      const x = round1(value.x);
      const y = round1(value.y);
      if (x === 50 && y === 50) delete crops[value.key];
      else crops[value.key] = { img: value.imgId, x, y };
      return { ...page, crops };
    }));
    setEditing(null);
    editingRef.current = null;
  }, [applyCanvasChange]);

  const cancelEditing = useCallback(() => {
    setEditing(null);
    editingRef.current = null;
  }, []);

  const undoAction = useCallback(() => {
    commitEditing();
    const previous = pastRef.current[pastRef.current.length - 1];
    if (!previous) return false;
    const nextPast = pastRef.current.slice(0, -1);
    const nextFuture = [...futureRef.current, makeCanvasSnapshot(pagesRef.current, currentPageRef.current, layoutIdRef.current)].slice(-HISTORY_LIMIT);
    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    restoreCanvasSnapshot(previous);
    return true;
  }, [commitEditing, restoreCanvasSnapshot]);

  const redoAction = useCallback(() => {
    commitEditing();
    const next = futureRef.current[futureRef.current.length - 1];
    if (!next) return false;
    const nextFuture = futureRef.current.slice(0, -1);
    const nextPast = [...pastRef.current, makeCanvasSnapshot(pagesRef.current, currentPageRef.current, layoutIdRef.current)].slice(-HISTORY_LIMIT);
    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    restoreCanvasSnapshot(next);
    return true;
  }, [commitEditing, restoreCanvasSnapshot]);

  const setCombineMode = useCallback((next) => {
    commitEditing();
    setCombineModeState((value) => {
      const resolved = typeof next === 'function' ? next(value) : next;
      if (!resolved) { setSelBox(null); setSelectionPageId(null); }
      return resolved;
    });
  }, [commitEditing]);

  const switchPage = useCallback((index) => {
    commitEditing();
    const previousPage = currentPageRef.current;
    const nextPage = clamp(typeof index === 'function' ? index(previousPage) : index, 0, pagesRef.current.length - 1);
    if (nextPage === previousPage) return;
    beginPageFlip(previousPage, nextPage);
    currentPageRef.current = nextPage;
    setCurrentPage(nextPage);
    setSelBox(null);
    setSelectionPageId(null);
  }, [beginPageFlip, commitEditing]);

  const activateCanvasPage = useCallback((pageIndex) => {
    const nextPage = clamp(pageIndex, 0, pagesRef.current.length - 1);
    if (nextPage === currentPageRef.current) return;
    previousPageIndexRef.current = currentPageRef.current;
    currentPageRef.current = nextPage;
    setCurrentPage(nextPage);
  }, []);

  const goToAdjacentSpread = useCallback((direction) => {
    const groups = binderViewGroups(pagesRef.current.length);
    const groupIndex = groups.findIndex((group) => group.includes(currentPageRef.current));
    const nextGroup = groups[clamp(groupIndex + direction, 0, groups.length - 1)];
    if (nextGroup) switchPage(nextGroup[0]);
  }, [switchPage]);

  const placeCards = useCallback((ids, pageIndex = currentPageRef.current, startKey = null) => {
    if (!ids?.length) return;
    commitEditing();
    let result;
    applyCanvasChange((value) => {
      result = applyPlacement(value, ids, pageIndex, startKey, dimsRef.current);
      return result.pages;
    });
    setSelected([]);
    setSelectionAnchor(null);
    requestAnimationFrame(() => {
      if (!result) return;
      const flowed = result.targets.filter((target) => target.pageIndex > pageIndex).length;
      let message = `Placed ${plural(result.placed, 'card')}`;
      if (flowed) message += ` · ${flowed} flowed onto following pages`;
      if (result.created) message += ` (${plural(result.created, 'new page')})`;
      notify(message, 'success');
    });
  }, [commitEditing, applyCanvasChange, notify]);

  const addFetchedCardToPage = useCallback(async (item, highResImageUrl) => {
    const ids = await importFetchedCard(item, highResImageUrl);
    placeCards(ids, currentPageRef.current, null);
  }, [importFetchedCard, placeCards]);

  const fillSelection = useCallback(() => {
    const ids = selectedOrdered;
    if (!ids.length) return;
    const targets = planPlacement(pagesRef.current, currentPageRef.current, null, ids.length, dimsRef.current);
    if (!targets.length) { notify(`Page ${currentPageRef.current + 1} is full.`, 'warn'); return; }
    placeCards(ids, currentPageRef.current, null);
  }, [selectedOrdered, placeCards, notify]);

  const removeSlotCard = useCallback((pageId, key) => {
    commitEditing();
    applyCanvasChange((value) => value.map((page) => {
      if (page.id !== pageId) return page;
      const slots = { ...page.slots };
      const crops = { ...page.crops };
      delete slots[key];
      delete crops[key];
      return { ...page, slots, crops };
    }));
  }, [commitEditing, applyCanvasChange]);

  const moveSlotCard = useCallback((payload, targetPageIndex, targetKey = null) => {
    commitEditing();
    applyCanvasChange((value) => {
      const sourceIndex = value.findIndex((page) => page.id === payload.pageId);
      if (sourceIndex < 0) return value;
      const sourcePage = value[sourceIndex];
      if (sourcePage.slots[payload.key] !== payload.imgId) return value;
      const next = value.map((page) => ({ ...page, slots: { ...page.slots }, crops: { ...page.crops } }));
      let destinationKey = targetKey;
      if (!destinationKey) destinationKey = getSlots(next[targetPageIndex], dimsRef.current).find((slot) => !next[targetPageIndex].slots[slot.key])?.key;
      if (!destinationKey) { notify(`Page ${targetPageIndex + 1} is full.`, 'warn'); return value; }
      if (sourceIndex === targetPageIndex && payload.key === destinationKey) return value;
      const destinationId = next[targetPageIndex].slots[destinationKey];
      const sourceCrop = getCrop(next[sourceIndex], payload.key, payload.imgId);
      const destinationCrop = destinationId ? getCrop(next[targetPageIndex], destinationKey, destinationId) : null;
      if (destinationId) {
        next[sourceIndex].slots[payload.key] = destinationId;
        if (destinationCrop.x === 50 && destinationCrop.y === 50) delete next[sourceIndex].crops[payload.key];
        else next[sourceIndex].crops[payload.key] = { img: destinationId, ...destinationCrop };
      } else {
        delete next[sourceIndex].slots[payload.key];
        delete next[sourceIndex].crops[payload.key];
      }
      next[targetPageIndex].slots[destinationKey] = payload.imgId;
      if (sourceCrop.x === 50 && sourceCrop.y === 50) delete next[targetPageIndex].crops[destinationKey];
      else next[targetPageIndex].crops[destinationKey] = { img: payload.imgId, ...sourceCrop };
      return next;
    });
  }, [commitEditing, applyCanvasChange, notify]);

  const makeDragGhost = useCallback((event, ids) => {
    try {
      const ratio = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = 150 * ratio;
      canvas.height = 190 * ratio;
      canvas.style.cssText = 'position:fixed;left:-1000px;top:-1000px;width:150px;height:190px;pointer-events:none';
      document.body.appendChild(canvas);
      const context = canvas.getContext('2d');
      context.scale(ratio, ratio);
      const drawIds = ids.slice(0, 3).reverse();
      drawIds.forEach((id, index) => {
        const image = document.querySelector(`img[data-img-id="${CSS.escape(id)}"]`);
        const offset = (drawIds.length - index - 1) * 5;
        context.save();
        context.translate(75 + offset, 92 - offset);
        context.rotate(((index - 1) * 3 * Math.PI) / 180);
        context.beginPath();
        context.roundRect(-48, -68, 96, 136, 8);
        context.clip();
        context.fillStyle = '#27272a';
        context.fillRect(-48, -68, 96, 136);
        if (image?.complete && image.naturalWidth) {
          const scale = Math.max(96 / image.naturalWidth, 136 / image.naturalHeight);
          const width = image.naturalWidth * scale;
          const height = image.naturalHeight * scale;
          context.drawImage(image, -width / 2, -height / 2, width, height);
        }
        context.restore();
      });
      if (ids.length > 1) {
        context.fillStyle = '#dc2626';
        context.beginPath();
        context.arc(120, 28, 20, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'white';
        context.font = '700 14px system-ui';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(ids.length), 120, 28);
      }
      event.dataTransfer.setDragImage(canvas, 75, 95);
      window.setTimeout(() => canvas.remove(), 0);
    } catch { /* Browsers can reject a custom drag image. */ }
  }, []);

  const startPoolDrag = useCallback((event, imageId) => {
    commitEditing();
    let ids = selectedOrdered.includes(imageId) ? selectedOrdered : [imageId];
    if (!selectedOrdered.includes(imageId)) {
      setSelected([imageId]);
      setSelectionAnchor(imageId);
    }
    const payload = { kind: 'pool', ids };
    dragRef.current = payload;
    try { event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload)); } catch { /* live ref is authoritative */ }
    event.dataTransfer.effectAllowed = 'copy';
    makeDragGhost(event, ids);
    requestAnimationFrame(() => setDragInfo(payload));
  }, [commitEditing, selectedOrdered, makeDragGhost]);

  const startFetchedCardDrag = useCallback((event, item, highResImageUrl) => {
    commitEditing();
    const payload = {
      kind: 'remote',
      card: { id: item.id, name: item.name, image: item.image },
      url: highResImageUrl,
    };
    dragRef.current = payload;
    try {
      event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
      event.dataTransfer.setData('text/uri-list', highResImageUrl);
      event.dataTransfer.setData('text/plain', highResImageUrl);
    } catch { /* The live ref remains authoritative for in-app drops. */ }
    event.dataTransfer.effectAllowed = 'copy';
    requestAnimationFrame(() => setDragInfo(payload));
  }, [commitEditing]);

  const startSlotDrag = useCallback((event, pageId, key, imgId) => {
    commitEditing();
    const pageIndex = pagesRef.current.findIndex((page) => page.id === pageId);
    if (pageIndex >= 0) activateCanvasPage(pageIndex);
    const payload = { kind: 'slot', pageId, key, imgId };
    dragRef.current = payload;
    try { event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload)); } catch { /* live ref is authoritative */ }
    event.dataTransfer.effectAllowed = 'move';
    makeDragGhost(event, [imgId]);
    requestAnimationFrame(() => setDragInfo(payload));
  }, [commitEditing, activateCanvasPage, makeDragGhost]);

  const resetDrag = useCallback(() => {
    dragRef.current = null;
    setDragInfo(null);
    setDropPreview([]);
    setSidebarDropActive(false);
  }, []);

  const getPayload = useCallback((event) => {
    if (dragRef.current) return dragRef.current;
    try {
      const raw = event.dataTransfer.getData(DRAG_MIME);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const handleSlotDragOver = useCallback((event, slot, pageIndex = currentPageRef.current) => {
    if (combineMode || editingRef.current) return;
    const payload = dragRef.current;
    if (!payload && !hasFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = payload?.kind === 'slot' ? 'move' : 'copy';
    if (payload?.kind === 'pool') setDropPreview(planPlacement(pagesRef.current, pageIndex, slot.key, payload.ids.length, dimsRef.current));
    else setDropPreview([{ pageIndex, key: slot.key }]);
  }, [combineMode]);

  const handleSlotDrop = useCallback(async (event, slot, pageIndex = currentPageRef.current) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getPayload(event);
    activateCanvasPage(pageIndex);
    if (hasFiles(event.dataTransfer)) {
      const ids = await addFiles(event.dataTransfer.files);
      placeCards(ids, pageIndex, slot.key);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, pageIndex, slot.key);
    else if (payload?.kind === 'remote') {
      const ids = await importFetchedCard(payload.card, payload.url);
      placeCards(ids, pageIndex, slot.key);
    } else if (payload?.kind === 'slot') moveSlotCard(payload, pageIndex, slot.key);
    resetDrag();
  }, [getPayload, activateCanvasPage, addFiles, importFetchedCard, placeCards, moveSlotCard, resetDrag]);

  const handleStageDrop = useCallback(async (event) => {
    if (combineMode || editingRef.current) return;
    event.preventDefault();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) {
      const ids = await addFiles(event.dataTransfer.files);
      placeCards(ids, currentPageRef.current, null);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, currentPageRef.current, null);
    else if (payload?.kind === 'remote') {
      const ids = await importFetchedCard(payload.card, payload.url);
      placeCards(ids, currentPageRef.current, null);
    }
    resetDrag();
  }, [combineMode, getPayload, addFiles, importFetchedCard, placeCards, resetDrag]);

  const handleSidebarDrop = useCallback(async (event) => {
    event.preventDefault();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) await addFiles(event.dataTransfer.files);
    else if (payload?.kind === 'remote') await importFetchedCard(payload.card, payload.url);
    else if (payload?.kind === 'slot') {
      removeSlotCard(payload.pageId, payload.key);
      notify('Card removed from the binder.', 'info');
    }
    resetDrag();
  }, [getPayload, addFiles, importFetchedCard, removeSlotCard, notify, resetDrag]);

  const handleThumbDrop = useCallback(async (event, pageIndex) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) {
      const ids = await addFiles(event.dataTransfer.files);
      placeCards(ids, pageIndex, null);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, pageIndex, null);
    else if (payload?.kind === 'remote') {
      const ids = await importFetchedCard(payload.card, payload.url);
      placeCards(ids, pageIndex, null);
    } else if (payload?.kind === 'slot') moveSlotCard(payload, pageIndex, null);
    resetDrag();
  }, [getPayload, addFiles, importFetchedCard, placeCards, moveSlotCard, resetDrag]);

  const performMerge = useCallback((box, pageIndex = currentPageRef.current) => {
    if (!box || box.rs * box.cs <= 1) return;
    const pageId = pagesRef.current[pageIndex]?.id;
    if (!pageId) return;
    activateCanvasPage(pageIndex);
    setSelectionPageId(pageId);
    let unassigned = 0;
    applyCanvasChange((value) => value.map((page) => {
      if (page.id !== pageId) return page;
      const insideKeys = [];
      for (let row = box.r; row < box.r + box.rs; row += 1) for (let col = box.c; col < box.c + box.cs; col += 1) insideKeys.push(keyOf(row, col));
      const occupied = insideKeys.filter((key) => page.slots[key]).map((key) => ({ key, id: page.slots[key], crop: getCrop(page, key, page.slots[key]) }));
      const anchor = keyOf(box.r, box.c);
      const kept = occupied.find((item) => item.key === anchor) || occupied[0];
      unassigned = Math.max(0, occupied.length - (kept ? 1 : 0));
      const slots = { ...page.slots };
      const crops = { ...page.crops };
      insideKeys.forEach((key) => { delete slots[key]; delete crops[key]; });
      if (kept) {
        slots[anchor] = kept.id;
        if (kept.crop.x !== 50 || kept.crop.y !== 50) crops[anchor] = { img: kept.id, ...kept.crop };
      }
      const merges = page.merges.filter((merge) => !boxesIntersect(merge, box));
      merges.push({ id: uid('merge'), ...box });
      return { ...page, merges, slots, crops };
    }));
    setSelBox(box);
    notify(`Combined ${boxDims(box)} slots${unassigned ? ` · ${plural(unassigned, 'card')} returned to the pool` : ''}.`, 'success', {
      label: 'Undo',
      onClick: undoAction,
    });
  }, [activateCanvasPage, applyCanvasChange, notify, undoAction]);

  const selectionPageIndex = selectionPageId ? pages.findIndex((page) => page.id === selectionPageId) : currentPage;
  const selectionPage = pages[selectionPageIndex] || current;
  const selectedMerges = useMemo(() => selBox ? activeMerges(selectionPage, dims).filter((merge) => boxesIntersect(merge, selBox)) : [], [selBox, selectionPage, dims]);
  const exactMerge = useMemo(() => activeMerges(selectionPage, dims).some((merge) => sameBox(merge, selBox)), [selectionPage, dims, selBox]);
  const canMerge = Boolean(combineMode && selBox && selBox.rs * selBox.cs > 1 && !exactMerge);

  const unmergeById = useCallback((mergeId, pageIndex = currentPageRef.current) => {
    const page = pagesRef.current[pageIndex];
    if (!page) return;
    const merge = activeMerges(page, dimsRef.current).find((item) => item.id === mergeId);
    if (!merge) return;
    activateCanvasPage(pageIndex);
    const pageId = page.id;
    setSelectionPageId(pageId);
    const snapshot = { ...merge };

    applyCanvasChange((value) => value.map((item) => (
      item.id === pageId
        ? { ...item, merges: item.merges.filter((candidate) => candidate.id !== mergeId) }
        : item
    )));
    setSelBox((value) => value && boxesIntersect(value, snapshot) ? null : value);
    notify(`Split ${boxDims(snapshot)} frame into single slots.`, 'info', {
      label: 'Undo',
      onClick: () => {
        slotActionGuardRef.current = 0;
        undoAction();
      },
    });
  }, [activateCanvasPage, applyCanvasChange, notify, undoAction]);

  const unmergeBox = useCallback((box = selBox, pageIndex = selectionPageIndex) => {
    if (!box) return;
    let count = 0;
    const pageId = pagesRef.current[pageIndex]?.id;
    if (!pageId) return;
    activateCanvasPage(pageIndex);
    applyCanvasChange((value) => value.map((page) => {
      if (page.id !== pageId) return page;
      const merges = page.merges.filter((merge) => {
        const hit = boxesIntersect(merge, box);
        if (hit) count += 1;
        return !hit;
      });
      return { ...page, merges };
    }));
    setSelBox(null);
    setSelectionPageId(null);
    requestAnimationFrame(() => { if (count) notify(`${plural(count, 'frame')} split into slots.`, 'info'); });
  }, [selBox, selectionPageIndex, activateCanvasPage, applyCanvasChange, notify]);

  const beginMarquee = useCallback((event, slot, isEmpty, page, pageIndex) => {
    if (event.button !== 0 || editingRef.current || dragRef.current || suppressClickRef.current || performance.now() < slotActionGuardRef.current) return;
    if (!combineMode && !isEmpty) return;
    activateCanvasPage(pageIndex);
    setSelectionPageId(page.id);
    const quick = !combineMode && isEmpty;
    marqueeRef.current = { start: slotBox(slot.r, slot.c), current: slotBox(slot.r, slot.c), box: slotBox(slot.r, slot.c), quick, moved: false, pointerId: event.pointerId, pageIndex, pageId: page.id };
    setMarqueeActive(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (combineMode) setSelBox(expandBox(slotBox(slot.r, slot.c), activeMerges(page, dimsRef.current)));
  }, [combineMode, activateCanvasPage]);

  const moveMarquee = useCallback((event) => {
    const state = marqueeRef.current;
    if (!state) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-key][data-r][data-c]');
    const targetCanvas = target?.closest?.('[data-canvas]');
    if (!target || !stageRef.current?.contains(target) || Number(targetCanvas?.dataset.pageIndex) !== state.pageIndex) return;
    const next = slotBox(Number(target.dataset.r), Number(target.dataset.c));
    const moved = next.r !== state.start.r || next.c !== state.start.c;
    state.current = next;
    state.moved = state.moved || moved;
    if (state.moved) {
      const expanded = expandBox(unionBox(state.start, next), activeMerges(pagesRef.current[state.pageIndex], dimsRef.current));
      state.box = expanded;
      setSelBox(expanded);
    }
  }, []);

  const finishMarquee = useCallback(() => {
    const state = marqueeRef.current;
    if (!state) return;
    marqueeRef.current = null;
    setMarqueeActive(false);
    if (state.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    }
    if (state.quick && state.moved && state.box && state.box.rs * state.box.cs > 1) {
      performMerge(state.box, state.pageIndex);
    } else if (state.quick) {
      setSelBox(null);
      setSelectionPageId(null);
    }
  }, [performMerge]);

  const startReposition = useCallback((event, page, slot, imgId) => {
    event.stopPropagation();
    if (settings.fit !== 'cover') { notify("Set Image fit to 'Fill (crop)' in Print Setup to reposition this image.", 'warn'); return; }
    const element = event.currentTarget.closest('[data-key]');
    const rect = element?.getBoundingClientRect();
    const natural = imageDims[imgId];
    const geometry = coverGeometry(natural?.w, natural?.h, { w: rect?.width || 0, h: rect?.height || 0 });
    if (geometry.ovX < 1 && geometry.ovY < 1) { notify('This image already fits the slot without cropping.', 'info'); return; }
    const crop = getCrop(page, slot.key, imgId);
    const next = { pageId: page.id, key: slot.key, imgId, x: crop.x, y: crop.y, originX: crop.x, originY: crop.y, hasX: geometry.ovX >= 1, hasY: geometry.ovY >= 1, geometry };
    editingRef.current = next;
    setEditing(next);
  }, [settings.fit, notify, imageDims]);

  const beginPan = useCallback((event) => {
    const value = editingRef.current;
    if (!value) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cropX: value.x, cropY: value.y };
  }, []);

  const movePan = useCallback((event) => {
    const pan = panRef.current;
    const value = editingRef.current;
    if (!pan || !value) return;
    const x = value.hasX ? clamp(pan.cropX - ((event.clientX - pan.x) / value.geometry.ovX) * 100, 0, 100) : 50;
    const y = value.hasY ? clamp(pan.cropY - ((event.clientY - pan.y) / value.geometry.ovY) * 100, 0, 100) : 50;
    const next = { ...value, x, y };
    editingRef.current = next;
    setEditing(next);
  }, []);

  const endPan = useCallback(() => { panRef.current = null; }, []);

  useEffect(() => {
    if (!editing) return undefined;
    const outside = (event) => {
      if (event.target.closest?.('[data-editing-slot], [data-reposition-ui]')) return;
      commitEditing();
    };
    window.addEventListener('pointerdown', outside, true);
    return () => window.removeEventListener('pointerdown', outside, true);
  }, [Boolean(editing), commitEditing]);

  useEffect(() => {
    const safety = (event) => {
      if ((event.type === 'dragover' || event.type === 'drop') && hasFiles(event.dataTransfer)) event.preventDefault();
      if (event.type === 'dragstart' && event.target?.matches?.('img, a')) event.preventDefault();
      if (event.type === 'dragend' || event.type === 'drop') window.setTimeout(resetDrag, 0);
      if (event.type === 'pointermove') moveMarquee(event);
      if (event.type === 'pointerup' || event.type === 'pointercancel') finishMarquee();
    };
    ['dragover', 'drop', 'dragstart', 'dragend', 'pointermove', 'pointerup', 'pointercancel'].forEach((name) => window.addEventListener(name, safety));
    return () => ['dragover', 'drop', 'dragstart', 'dragend', 'pointermove', 'pointerup', 'pointercancel'].forEach((name) => window.removeEventListener(name, safety));
  }, [resetDrag, moveMarquee, finishMarquee]);

  const deleteImages = useCallback(async (ids) => {
    if (!ids.length) return;
    const placedCount = visible.filter((assignment) => ids.includes(assignment.id)).length;
    if (!window.confirm(`Delete ${plural(ids.length, 'card')} from the pool${placedCount ? `, including ${plural(placedCount, 'placed copy')}` : ''}?`)) return;
    const set = new Set(ids);
    const validIds = new Set(pool.filter((item) => !set.has(item.id)).map((item) => item.id));
    const nextPages = pruneMissingImages(pagesRef.current, validIds);
    setPool((value) => value.filter((item) => !set.has(item.id)));
    pagesRef.current = nextPages;
    setPages(nextPages);
    clearHistory();
    setSelected([]);
    setImages((value) => {
      const next = { ...value };
      ids.forEach((id) => {
        const url = next[id];
        if (url?.startsWith('blob:')) { URL.revokeObjectURL(url); objectUrlsRef.current.delete(url); }
        delete next[id];
      });
      return next;
    });
    if (storageMode === 'indexeddb') idbDeleteMany(ids).catch(() => notify('Images were removed, but storage cleanup failed.', 'warn'));
    notify(`${plural(ids.length, 'card')} deleted.`, 'info');
  }, [visible, pool, storageMode, clearHistory, notify]);

  const chooseLayout = useCallback((layoutId) => {
    if (layoutId === settings.layout) return;
    commitEditing();
    setSelBox(null);
    setSelectionPageId(null);
    const nextLayout = getLayout(layoutId);
    const nextDims = { rows: nextLayout.rows, cols: nextLayout.cols };
    applyCanvasChange((value) => value, { layout: layoutId });
    const hiddenNow = hiddenAssignments(pagesRef.current, nextDims);
    if (hiddenNow.length) {
      notify(`${nextLayout.label}: ${plural(hiddenNow.length, 'card')} hidden outside the grid — kept, not deleted.`, 'warn', {
        label: 'Reflow',
        onClick: () => {
          applyCanvasChange((allPages) => {
            const concealed = hiddenAssignments(allPages, nextDims);
            const ids = concealed.map((item) => item.id);
            const first = concealed.length ? Math.min(...concealed.map((item) => item.pageIndex)) : 0;
            const stripped = allPages.map((page, pageIndex) => {
              const keys = new Set(concealed.filter((item) => item.pageIndex === pageIndex).map((item) => item.key));
              return { ...page, slots: Object.fromEntries(Object.entries(page.slots).filter(([key]) => !keys.has(key))), crops: Object.fromEntries(Object.entries(page.crops).filter(([key]) => !keys.has(key))) };
            });
            return applyPlacement(stripped, ids, first, null, nextDims).pages;
          });
          notify('Hidden cards reflowed into visible slots.', 'success');
        },
      });
    }
  }, [settings.layout, commitEditing, applyCanvasChange, notify]);

  useEffect(() => {
    if (settings.fit !== 'cover' && editingRef.current) commitEditing();
  }, [settings.fit, commitEditing]);

  const handlePrint = useCallback(() => {
    commitEditing();
    if (!printPages.length || !printPages.some((page) => Object.keys(page.slots).length)) { notify('Add at least one card before printing.', 'warn'); return; }
    setOpenPanel(null);
    window.setTimeout(() => window.print(), 50);
  }, [commitEditing, printPages, notify]);

  const resetBinder = useCallback(async () => {
    if (!window.confirm('Reset the entire binder? This deletes every page and image from this device.')) return;
    commitEditing();
    if (storageMode === 'indexeddb') await idbClear().catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    const nextPages = normalizePhysicalPages(emptyPages());
    pagesRef.current = nextPages;
    currentPageRef.current = 0;
    previousPageIndexRef.current = 0;
    layoutIdRef.current = DEFAULT_LAYOUT;
    setPages(nextPages);
    clearHistory();
    setPool([]);
    setImages({});
    setSelected([]);
    setSelBox(null);
    setSelectionPageId(null);
    setSettings(sanitizeSettings());
    setCurrentPage(0);
    setOpenPanel(null);
    notify('Binder reset.', 'info');
  }, [commitEditing, storageMode, clearHistory, notify]);

  const addPage = useCallback(() => {
    commitEditing();
    const previousCount = pagesRef.current.length;
    const insertionIndex = Math.max(1, previousCount - 1);
    const nextPage = insertionIndex + 1;
    const sheet = emptySheet();
    const nextPages = [
      ...pagesRef.current.slice(0, insertionIndex),
      sheet.front,
      sheet.back,
      ...pagesRef.current.slice(insertionIndex),
    ];
    beginPageFlip(currentPageRef.current, nextPage, { fromPages: pagesRef.current, toPages: nextPages });
    applyCanvasChange(nextPages, { currentPage: nextPage });
    setSelBox(null);
    setSelectionPageId(null);
    notify(`New sheet inserted as pages ${insertionIndex + 1}–${insertionIndex + 2}.`, 'success');
  }, [commitEditing, beginPageFlip, applyCanvasChange, notify]);

  const duplicatePage = useCallback(() => {
    commitEditing();
    const sourceIndex = currentPageRef.current;
    const sourcePage = pagesRef.current[sourceIndex];
    if (!sourcePage) return;
    const sourceIndices = pagesRef.current
      .map((page, pageIndex) => page.sheetId === sourcePage.sheetId ? pageIndex : -1)
      .filter((pageIndex) => pageIndex >= 0);
    const insertionIndex = Math.max(...sourceIndices) + 1;
    const nextSheetId = uid('sheet');
    const copyFace = (source, face) => ({
      ...source,
      id: uid('page'),
      sheetId: nextSheetId,
      face,
      merges: source.merges.map((merge) => ({ ...merge, id: uid('merge') })),
      slots: { ...source.slots },
      crops: Object.fromEntries(Object.entries(source.crops).map(([key, crop]) => [key, { ...crop }])),
    });
    const sourceFront = pagesRef.current.find((page) => page.sheetId === sourcePage.sheetId && page.face === 'front');
    const sourceBack = pagesRef.current.find((page) => page.sheetId === sourcePage.sheetId && page.face === 'back');
    if (!sourceFront || !sourceBack) return;
    const copies = [copyFace(sourceFront, 'front'), copyFace(sourceBack, 'back')];
    const nextPages = [...pagesRef.current.slice(0, insertionIndex), ...copies, ...pagesRef.current.slice(insertionIndex)];
    beginPageFlip(sourceIndex, insertionIndex, { fromPages: pagesRef.current, toPages: nextPages });
    applyCanvasChange(nextPages, { currentPage: insertionIndex });
    notify('Physical sheet duplicated.', 'success');
  }, [commitEditing, beginPageFlip, applyCanvasChange, notify]);

  const deletePage = useCallback(() => {
    if (pagesRef.current.length <= 2) return;
    const pageIndex = currentPageRef.current;
    const page = pagesRef.current[pageIndex];
    if (!page) return;
    const sheetIndices = pagesRef.current
      .map((item, index) => item.sheetId === page.sheetId ? index : -1)
      .filter((index) => index >= 0);
    const sheetPages = sheetIndices.map((index) => pagesRef.current[index]);
    const pageLabels = sheetIndices.map((index) => index + 1).join(' & ');
    if (sheetPages.some((item) => Object.keys(item.slots).length)
      && !window.confirm(`Delete the physical sheet containing pages ${pageLabels}? Cards remain in the pool.`)) return;
    commitEditing();
    const nextLength = pagesRef.current.length - sheetPages.length;
    const nextPage = Math.max(0, Math.min(Math.min(...sheetIndices), nextLength - 1));
    applyCanvasChange((value) => value.filter((item) => item.sheetId !== page.sheetId), { currentPage: nextPage });
    setSelBox(null);
    setSelectionPageId(null);
    notify('Physical sheet removed.', 'info');
  }, [commitEditing, applyCanvasChange, notify]);

  const clearPage = useCallback((pageIndex = currentPageRef.current) => {
    const page = pagesRef.current[pageIndex];
    if (!page || !Object.keys(page.slots).length) return;
    if (!window.confirm(`Clear every card from page ${pageIndex + 1}? Cards remain in the pool.`)) return;
    commitEditing();
    activateCanvasPage(pageIndex);
    applyCanvasChange((value) => value.map((item) => item.id === page.id ? { ...item, slots: {}, crops: {} } : item));
    notify('Page cleared. Cards remain in the pool.', 'info');
  }, [commitEditing, activateCanvasPage, applyCanvasChange, notify]);

  const resetLayout = useCallback((pageIndex = currentPageRef.current) => {
    const pageId = pagesRef.current[pageIndex]?.id;
    if (!pageId) return;
    activateCanvasPage(pageIndex);
    applyCanvasChange((value) => value.map((page) => page.id === pageId ? { ...page, merges: [] } : page));
    setSelBox(null);
    setSelectionPageId(null);
    notify('Merged frames reset.', 'info');
  }, [activateCanvasPage, applyCanvasChange, notify]);

  const onPoolClick = useCallback((event, visibleIndex) => {
    const item = visiblePool[visibleIndex];
    if (!item) return;
    const toggle = event.ctrlKey || event.metaKey;
    const range = event.shiftKey && selectionAnchor;
    if (range) {
      const anchorIndex = visiblePool.findIndex((entry) => entry.id === selectionAnchor);
      const start = anchorIndex < 0 ? visibleIndex : Math.min(anchorIndex, visibleIndex);
      const end = anchorIndex < 0 ? visibleIndex : Math.max(anchorIndex, visibleIndex);
      const ids = visiblePool.slice(start, end + 1).map((entry) => entry.id);
      setSelected((value) => toggle ? Array.from(new Set([...value, ...ids])) : ids);
    } else if (toggle) {
      setSelected((value) => value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id]);
      setSelectionAnchor(item.id);
    } else {
      setSelected([item.id]);
      setSelectionAnchor(item.id);
    }
  }, [visiblePool, selectionAnchor]);

  const selectAllVisible = useCallback(() => {
    setSelected(visiblePool.map((item) => item.id));
    setSelectionAnchor(visiblePool[0]?.id || null);
  }, [visiblePool]);

  useEffect(() => {
    const keydown = (event) => {
      const key = event.key.toLowerCase();
      const commandKey = event.ctrlKey || event.metaKey;
      const undoCommand = commandKey && !event.shiftKey && key === 'z';
      const redoCommand = (event.ctrlKey && key === 'y') || (commandKey && event.shiftKey && key === 'z');
      if (undoCommand) { event.preventDefault(); undoAction(); return; }
      if (redoCommand) { event.preventDefault(); redoAction(); return; }
      if (isEditableTarget(event.target)) return;
      const value = editingRef.current;
      if (value) {
        if (event.key === 'Escape') { event.preventDefault(); cancelEditing(); return; }
        if (event.key === 'Enter') { event.preventDefault(); commitEditing(); return; }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          const amount = event.shiftKey ? 10 : 1;
          let x = value.x; let y = value.y;
          if (event.key === 'ArrowLeft' && value.hasX) x -= amount;
          if (event.key === 'ArrowRight' && value.hasX) x += amount;
          if (event.key === 'ArrowUp' && value.hasY) y -= amount;
          if (event.key === 'ArrowDown' && value.hasY) y += amount;
          const next = { ...value, x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
          editingRef.current = next; setEditing(next); return;
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); selectAllVisible(); return; }
      if (event.key === 'Escape') {
        if (marqueeRef.current) { marqueeRef.current = null; setMarqueeActive(false); setSelBox(null); setSelectionPageId(null); }
        else if (openPanel) setOpenPanel(null);
        else if (selBox) { setSelBox(null); setSelectionPageId(null); }
        else if (combineMode) setCombineMode(false);
        else if (selected.length) setSelected([]);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') { if (selected.length) { event.preventDefault(); deleteImages(selected); } return; }
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); setCombineMode((state) => !state); return; }
      if (event.key === 'Enter' && canMerge) { event.preventDefault(); performMerge(selBox, selectionPageIndex); return; }
      if (event.key.toLowerCase() === 'u' && selectedMerges.length) { event.preventDefault(); unmergeBox(); return; }
      if (event.key.toLowerCase() === 'f' && selected.length) { event.preventDefault(); fillSelection(); return; }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); goToAdjacentSpread(-1); return; }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); goToAdjacentSpread(1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [undoAction, redoAction, cancelEditing, commitEditing, selectAllVisible, openPanel, selBox, combineMode, selected, deleteImages, setCombineMode, canMerge, performMerge, selectionPageIndex, selectedMerges.length, unmergeBox, fillSelection, goToAdjacentSpread]);

  useEffect(() => {
    if (!openPanel) return undefined;
    const close = (event) => {
      if (event.target.closest?.('[data-panel-toggle]')) return;
      if (!panelRootRef.current?.contains(event.target)) setOpenPanel(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [openPanel]);

  const frameWIn = settings.view === 'paper' ? paper.wIn : gridW + SHEET_PAD.left + SHEET_PAD.right;
  const frameHIn = settings.view === 'paper' ? paper.hIn : gridH + SHEET_PAD.top + SHEET_PAD.bottom;
  const spineGap = 24;
  const pageAreaWidth = Math.max(160, (stageSize.w - 80 - spineGap) / 2);
  const ppi = Math.max(12, Math.min(pageAreaWidth / frameWIn, (stageSize.h - 136) / frameHIn));
  const gridPpi = settings.view === 'paper' ? ppi * printFit : ppi;
  const frameWidth = frameWIn * ppi;
  const frameHeight = frameHIn * ppi;
  const spreadWidth = frameWidth * 2 + spineGap;
  const helperOffsetX = settings.view === 'binder' ? ((SHEET_PAD.left - SHEET_PAD.right) / 2) * ppi : 0;
  const multiFlow = dragInfo?.kind === 'pool' && dragInfo.ids.length > 1 ? Math.max(0, planPlacement(pages, currentPage, null, dragInfo.ids.length, dims).filter((target) => target.pageIndex > currentPage).length) : 0;

  const renderEditorSlot = (page, pageIndex, slot, slotIndex) => {
    const imgId = page.slots[slot.key];
    const source = images[imgId] || pool.find((item) => item.id === imgId)?.src;
    const crop = imgId ? getCrop(page, slot.key, imgId) : { x: 50, y: 50 };
    const isEditing = editing?.pageId === page.id && editing.key === slot.key && editing.imgId === imgId;
    const previewIndex = dropPreview.findIndex((target) => target.pageIndex === pageIndex && target.key === slot.key);
    const pageMerges = activeMerges(page, dims);
    const radius = Math.max(settings.view === 'binder' ? 3 : 1, gridPpi * (settings.view === 'binder' ? 0.09 : 0.04));
    const frameW = spanW(slot.cs, settings.gap, card);
    const frameH = spanH(slot.rs, settings.gap, card);
    const natural = imageDims[imgId];
    const dpi = natural ? Math.round(settings.fit === 'cover'
      ? Math.min(natural.w / (frameW * printFit), natural.h / (frameH * printFit))
      : Math.max(natural.w / (frameW * printFit), natural.h / (frameH * printFit))) : null;
    const dpiTone = dpi >= 300 ? 'bg-emerald-600/90 text-white' : dpi >= 200 ? 'bg-amber-500/90 text-black' : 'bg-red-600/90 text-white';
    const labelVisible = (frameW * gridPpi) >= 72;
    const slotActionsAvailable = !combineMode && !dragInfo && !marqueeActive && !editing;
    const stopSlotAction = (event) => event.stopPropagation();
    const activateSlotAction = (event, action) => {
      event.stopPropagation();
      if (performance.now() < slotActionGuardRef.current) return;
      slotActionGuardRef.current = performance.now() + 300;
      action();
    };
    const slotActions = slotActionsAvailable && (slot.mergeId || imgId) && (
      <div className="absolute right-1.5 top-1.5 z-40 flex gap-1 opacity-0 transition-opacity group-hover/slot:opacity-100 group-focus-within/slot:opacity-100">
        {slot.mergeId && (
          <button
            type="button"
            draggable={false}
            aria-label={`Unmerge ${boxDims(slot)} frame`}
            title={`Unmerge ${boxDims(slot)} frame`}
            onPointerDown={stopSlotAction}
            onClick={(event) => activateSlotAction(event, () => unmergeById(slot.mergeId, pageIndex))}
            onDoubleClick={stopSlotAction}
            className="grid size-6 place-items-center rounded-md bg-black/70 text-zinc-200 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Icon name="split" size="sm" />
          </button>
        )}
        {imgId && (
          <button
            type="button"
            draggable={false}
            aria-label="Remove card"
            title="Remove card"
            onPointerDown={stopSlotAction}
            onClick={(event) => activateSlotAction(event, () => { activateCanvasPage(pageIndex); removeSlotCard(page.id, slot.key); })}
            onDoubleClick={stopSlotAction}
            className="grid size-6 place-items-center rounded-md bg-black/70 text-zinc-200 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Icon name="x" size="sm" />
          </button>
        )}
      </div>
    );

    if (!imgId) {
      return (
        <div className="group/slot relative size-full">
          <button
            type="button"
            onPointerDown={(event) => beginMarquee(event, slot, true, page, pageIndex)}
            onClick={() => {
              if (suppressClickRef.current || performance.now() < slotActionGuardRef.current) return;
              activateCanvasPage(pageIndex);
              if (combineMode) { setSelectionPageId(page.id); setSelBox(expandBox(mergeBox(slot), pageMerges)); return; }
              if (selectedOrdered.length) placeCards(selectedOrdered, pageIndex, slot.key);
            }}
            className={`group grid size-full cursor-pointer place-items-center overflow-hidden rounded-md border outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 ${settings.view === 'binder' ? 'border-white/[0.03] bg-neutral-900/50 text-neutral-300 shadow-inner hover:border-white/[0.08] hover:bg-neutral-900/80 hover:text-neutral-100' : 'border-dashed border-zinc-400 bg-white/30 text-zinc-700 hover:border-red-500 hover:text-red-800'} ${previewIndex >= 0 ? '!border-red-500 !bg-red-950/20 !shadow-[inset_0_0_0_2px_rgba(239,68,68,0.25),0_0_20px_rgba(220,38,38,0.18)]' : ''}`}
            style={{ borderRadius: radius }}
          >
            {labelVisible && <span className="flex flex-col items-center gap-1.5"><Icon name="plus" size="xs" strokeWidth={1.5} className="text-neutral-600 transition-colors group-hover:text-neutral-400" /><span className="font-mono text-[9px] font-medium tracking-widest text-neutral-500 uppercase transition-colors group-hover:text-neutral-400">{slot.cs * slot.rs > 1 ? `${boxDims(slot)} frame` : `Slot ${slotIndex + 1}`}</span></span>}
            {previewIndex >= 0 && <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-950/60">{previewIndex + 1}</span>}
          </button>
          {slotActions}
        </div>
      );
    }

    return (
      <div
        data-editing-slot={isEditing ? '' : undefined}
        draggable={!combineMode && !editing}
        onDragStart={(event) => startSlotDrag(event, page.id, slot.key, imgId)}
        onDragEnd={resetDrag}
        onPointerDown={(event) => isEditing ? beginPan(event) : beginMarquee(event, slot, false, page, pageIndex)}
        onPointerMove={isEditing ? movePan : undefined}
        onPointerUp={isEditing ? endPan : undefined}
        onPointerCancel={isEditing ? endPan : undefined}
        onDoubleClick={(event) => {
          if (performance.now() < slotActionGuardRef.current) { event.stopPropagation(); return; }
          activateCanvasPage(pageIndex);
          startReposition(event, page, slot, imgId);
        }}
        onClick={() => {
          if (suppressClickRef.current || performance.now() < slotActionGuardRef.current) return;
          activateCanvasPage(pageIndex);
          if (combineMode) { setSelectionPageId(page.id); setSelBox(expandBox(mergeBox(slot), pageMerges)); }
        }}
        className={`group group/slot relative size-full ${!combineMode && !editing ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        {isEditing && editing.geometry && (
          <img
            src={source}
            alt=""
            className="pointer-events-none absolute z-30 max-w-none opacity-40"
            style={{
              width: editing.geometry.dispW,
              height: editing.geometry.dispH,
              left: -(editing.geometry.ovX * editing.x) / 100,
              top: -(editing.geometry.ovY * editing.y) / 100,
            }}
          />
        )}
        <div className={`relative size-full overflow-hidden border bg-white transition-all duration-200 ${settings.view === 'binder' ? 'sleeve-sheen rounded-md border-white/[0.03] bg-neutral-900/50 shadow-inner hover:border-white/[0.08] hover:bg-neutral-900/80' : 'border-transparent'} ${isEditing ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900' : ''} ${previewIndex >= 0 ? 'ring-2 ring-inset ring-red-500 shadow-[0_0_20px_rgba(220,38,38,0.25)]' : ''}`} style={{ borderRadius: radius }}>
          {source ? <img
            data-img-id={imgId}
            src={source}
            alt=""
            onLoad={(event) => {
              const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
              setImageDims((value) => value[imgId]?.w === w && value[imgId]?.h === h ? value : { ...value, [imgId]: { w, h } });
            }}
            className="size-full"
            style={{ objectFit: settings.fit, objectPosition: `${isEditing ? editing.x : crop.x}% ${isEditing ? editing.y : crop.y}%` }}
          /> : <span className="absolute inset-0 grid place-items-center bg-zinc-800 text-zinc-500"><Icon name="image" size="xl" /></span>}
        </div>
        {slotActions}
        {!dragInfo && !combineMode && !editing && dpi && <span title={`${dpi} effective DPI at print size`} className={`absolute bottom-1.5 right-1.5 z-40 hidden rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow group-hover:block ${dpiTone}`}>{dpi} DPI</span>}
        {slot.mergeId && <span className="absolute bottom-1.5 left-1.5 z-40 rounded-full bg-red-700/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">{boxDims(slot)}</span>}
        {isEditing && <span className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-amber-950 shadow">Drag to reposition</span>}
        {previewIndex >= 0 && <span className="absolute left-1.5 top-1.5 z-50 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg shadow-red-950/60">{previewIndex + 1}</span>}
      </div>
    );
  };

  const slotDropProps = (pageIndex) => (slot) => ({
    onDragOver: (event) => handleSlotDragOver(event, slot, pageIndex),
    onDragLeave: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropPreview([]); },
    onDrop: (event) => handleSlotDrop(event, slot, pageIndex),
  });

  const renderSelectionOverlay = (page) => selectionPageId === page.id && selBox && (
    <div
      className="slot-area pointer-events-none z-50 grid place-items-center rounded-lg border-2 border-red-600 bg-red-950/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
      style={{ '--col-start': selBox.c + 1, '--col-span': selBox.cs, '--row-start': selBox.r + 1, '--row-span': selBox.rs }}
    >
      <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
        {selBox.cs} × {selBox.rs}{marqueeRef.current?.quick ? ' · release to merge' : selectedMerges.length ? ' · U to unmerge' : ' · Enter to merge'}
      </span>
    </div>
  );

  const renderEditorGrid = (page, pageIndex) => (
    <SheetGrid page={page} card={card} gap={settings.gap} unit={`${gridPpi}px`} dims={dims} animate renderSlot={(slot, slotIndex) => renderEditorSlot(page, pageIndex, slot, slotIndex)} getSlotProps={slotDropProps(pageIndex)}>
      {renderSelectionOverlay(page)}
    </SheetGrid>
  );

  const renderThumbnailLeaf = (page, pageIndex) => {
    const unit = Math.min((THUMB_BOX.w - THUMB_BOX.pad * 2) / gridW, (THUMB_BOX.h - THUMB_BOX.pad * 2) / gridH);
    const active = activeSpread.includes(pageIndex);
    const currentLeaf = pageIndex === currentPage;
    return (
      <button
        key={page.id}
        type="button"
        aria-label={`Page ${pageIndex + 1}`}
        aria-current={currentLeaf ? 'page' : undefined}
        onClick={() => switchPage(pageIndex)}
        onDragOver={(event) => { if (dragRef.current || hasFiles(event.dataTransfer)) { event.preventDefault(); event.dataTransfer.dropEffect = dragRef.current?.kind === 'slot' ? 'move' : 'copy'; } }}
        onDrop={(event) => handleThumbDrop(event, pageIndex)}
        className="group shrink-0 bg-transparent p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <div className={`grid aspect-[1/1.414] w-14 place-items-center overflow-hidden rounded-sm border bg-neutral-950 transition-colors ${currentLeaf ? 'border-white/25' : active ? 'border-neutral-700' : 'border-neutral-800 group-hover:border-neutral-600'}`}>
          <SheetGrid page={page} card={card} gap={settings.gap} unit={`${unit}px`} dims={dims} renderSlot={(slot) => {
            const id = page.slots[slot.key];
            const src = images[id] || pool.find((item) => item.id === id)?.src;
            const crop = id ? getCrop(page, slot.key, id) : { x: 50, y: 50 };
            return <div className="size-full overflow-hidden border border-zinc-800 bg-zinc-900">{src && <img src={src} alt="" className="size-full" style={{ objectFit: settings.fit, objectPosition: `${crop.x}% ${crop.y}%` }} />}</div>;
          }} />
        </div>
      </button>
    );
  };

  const renderThumbnailGroup = (group) => {
    const active = group.some((pageIndex) => activeSpread.includes(pageIndex));
    const pageNumbers = group.map((pageIndex) => pageIndex + 1);
    const label = group.length === 1 ? `Page ${pageNumbers[0]}` : `Pages ${pageNumbers[0]}–${pageNumbers[1]}`;
    return (
      <div key={group.join('-')} data-page-group={pageNumbers.join('-')} className={`relative flex shrink-0 flex-col items-center gap-2 pb-1 text-[10px] font-medium whitespace-nowrap ${active ? 'text-red-400' : 'text-neutral-500'}`}>
        <div className={`flex items-center gap-0.5 rounded-md p-2 transition-transform duration-200 ${active ? 'scale-105 ring-2 ring-red-500 ring-offset-4 ring-offset-neutral-950' : ''}`}>{group.map((pageIndex) => renderThumbnailLeaf(pages[pageIndex], pageIndex))}</div>
        <span>{label}</span>
      </div>
    );
  };

  const renderWorkspaceToolbar = () => {
    const pageIndex = clamp(currentPage, 0, pages.length - 1);
    const page = pages[pageIndex];
    if (!page) return null;
    const pageSelBox = selectionPageId === page.id ? selBox : null;
    const pageMerges = activeMerges(page, dims);
    const pageSelectedMerges = pageSelBox ? pageMerges.filter((merge) => boxesIntersect(merge, pageSelBox)) : [];
    const pageExactMerge = pageMerges.some((merge) => sameBox(merge, pageSelBox));
    const pageCanMerge = Boolean(combineMode && pageSelBox && pageSelBox.rs * pageSelBox.cs > 1 && !pageExactMerge);
    const pageFilled = getSlots(page, dims).filter((slot) => page.slots[slot.key]).length;
    return <CanvasToolbar
      combineMode={combineMode}
      setCombineMode={setCombineMode}
      selBox={pageSelBox}
      canMerge={pageCanMerge}
      mergeLabel={`Merge ${pageSelBox ? boxDims(pageSelBox) : ''}`}
      onMerge={() => performMerge(pageSelBox, pageIndex)}
      selectedMergeCount={pageSelectedMerges.length}
      onUnmerge={() => unmergeBox(pageSelBox, pageIndex)}
      onResetLayout={() => resetLayout(pageIndex)}
      onClearPage={() => clearPage(pageIndex)}
      filled={pageFilled}
      total={layout.pockets}
      mergedCount={pageMerges.length}
      layout={layout}
      pageNumber={pageIndex + 1}
    />;
  };

  const renderCanvasLeaf = (pageIndex, options = {}) => {
    const page = pages[pageIndex];
    if (!page) return null;
    const side = options.side || pageSide(pageIndex, pages.length);
    const showHelper = options.showHelper !== false;
    return (
      <div
        key={options.renderKey || page.id}
        data-canvas={options.dataCanvas === false ? undefined : ''}
        data-page-index={pageIndex}
        data-page-side={side}
        data-turn-face={options.turnFace}
        aria-hidden={options.ariaHidden}
        className={`relative ${options.className || ''}`}
        style={{
          width: frameWidth,
          height: frameHeight,
          ...(options.surface ? {} : { gridColumn: side === 'left' ? 1 : 2, gridRow: 1 }),
          ...(options.style || {}),
        }}
      >
        {settings.view === 'binder' ? (
          <div
            className="sheet-frame relative flex size-full items-start justify-start overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-neutral-800 to-neutral-800/90 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]"
            style={{ paddingTop: SHEET_PAD.top * ppi, paddingRight: (side === 'left' ? SHEET_PAD.left : SHEET_PAD.right) * ppi, paddingBottom: SHEET_PAD.bottom * ppi, paddingLeft: (side === 'left' ? SHEET_PAD.right : SHEET_PAD.left) * ppi }}
          >
            {[0.17, 0.5, 0.83].map((position) => <span key={position} aria-hidden="true" className={`absolute size-3 -translate-y-1/2 rounded-full border border-black/80 bg-neutral-900 ring-1 ring-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.12)] ${side === 'left' ? 'translate-x-1/2' : '-translate-x-1/2'}`} style={{ [side === 'left' ? 'right' : 'left']: (SHEET_PAD.left * ppi) / 2, top: `${position * 100}%` }} />)}
            {renderEditorGrid(page, pageIndex)}
          </div>
        ) : (
          <div className="sheet-frame relative grid size-full place-items-center overflow-hidden bg-[#f4f4f5] shadow-[0_25px_70px_rgba(0,0,0,0.45)] ring-1 ring-black/20">
            <span aria-hidden="true" className="pointer-events-none absolute border border-dashed border-zinc-400" style={{ inset: PRINT_SAFE_MARGIN_IN * ppi }} />
            {renderEditorGrid(page, pageIndex)}
          </div>
        )}
        {showHelper && pageIndex === currentPage && <CanvasHelper editing={editing} multiDrag={dragInfo?.kind === 'pool' ? dragInfo.ids.length : 0} flowCount={multiFlow} combineMode={combineMode} offsetX={side === 'left' ? -helperOffsetX : helperOffsetX} onCenter={() => { const value = editingRef.current; if (value) { const next = { ...value, x: 50, y: 50 }; editingRef.current = next; setEditing(next); } }} onCancel={cancelEditing} onDone={commitEditing} />}
      </div>
    );
  };

  const renderCoverLayer = (side) => (
    <div
      key={`cover-${side}`}
      data-cover-layer={side}
      aria-hidden="true"
      className={`relative overflow-hidden bg-neutral-950 ${side === 'left' ? 'rounded-l-lg border-r border-white/[0.04] shadow-[inset_-18px_0_30px_-18px_rgba(0,0,0,0.95),inset_0_4px_12px_rgba(0,0,0,0.65),0_25px_60px_-15px_rgba(0,0,0,0.85)]' : 'rounded-r-lg border-l border-white/[0.04] shadow-[inset_18px_0_30px_-18px_rgba(0,0,0,0.95),inset_0_4px_12px_rgba(0,0,0,0.65),0_25px_60px_-15px_rgba(0,0,0,0.85)]'}`}
      style={{ width: frameWidth, height: frameHeight, gridColumn: side === 'left' ? 1 : 2, gridRow: 1 }}
    >
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.025),transparent_34%,rgba(0,0,0,0.2))]" />
      <span className={`absolute inset-y-0 w-8 ${side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/45 to-transparent`} />
    </div>
  );

  const renderAnimationBase = (pageId, side) => {
    const pageIndex = pages.findIndex((page) => page.id === pageId);
    if (pageIndex < 0) return renderCoverLayer(side);
    return renderCanvasLeaf(pageIndex, {
      renderKey: `base-${side}-${pageId}`,
      side,
      showHelper: false,
      className: 'pointer-events-none',
      ariaHidden: true,
    });
  };

  const renderTurningSheet = () => {
    const plan = pageFlip.plan;
    if (!plan) return null;

    const frontPageIndex = pages.findIndex(
      (page) => page.id === plan.frontPageId,
    );

    const backPageIndex = pages.findIndex(
      (page) => page.id === plan.backPageId,
    );

    if (frontPageIndex < 0 || backPageIndex < 0) {
      return null;
    }

    const forward = pageFlip.direction > 0;

    // Track the transition angle smoothly without conflicting with Tailwind classes
    const rotation = pageFlip.turned
      ? forward
        ? '-180deg'
        : '180deg'
      : '0deg';

    // Pin the transform origin precisely to the center spine line of the layout
    const originClass = forward
      ? 'origin-left'
      : 'origin-right';

    // Force the layout side matching to remain physically uniform during the arc
    const frontSide = forward ? 'right' : 'left';
    const backSide = forward ? 'left' : 'right';

    // Reverse rotation calculation
    const backRotation = forward ? '180deg' : '-180deg';

    return (
      <div
        data-turning-sheet
        data-turn-direction={forward ? 'forward' : 'backward'}
        data-turn-side={plan.turnSide}
        data-turn-boundary={plan.boundary}
        data-turn-view={settings.view}
        data-front-page={frontPageIndex + 1}
        data-back-page={backPageIndex + 1}
        data-turn-state={pageFlip.turned ? 'turning' : 'resting'}
        inert
        className={`absolute top-0 z-50 transform-gpu pointer-events-none transition-transform duration-500 [transition-timing-function:cubic-bezier(0.37,0,0.63,1)] [transform-style:preserve-3d] will-change-transform ${originClass}`}
        style={{
          width: frameWidth,
          height: frameHeight,
          // Enforce smooth tracking from the exact 50% midpoint line
          left: forward ? '50%' : undefined,
          right: forward ? undefined : '50%',
          transform: `rotateY(${rotation}) translateZ(2px)`, // Lift z-index physically to avoid 3D clipping
        }}
      >
        {/* Front side of the physical turning sheet */}
        {renderCanvasLeaf(frontPageIndex, {
          renderKey: `turn-front-${plan.frontPageId}`,
          side: frontSide,
          surface: true,
          dataCanvas: false,
          turnFace: 'front',
          showHelper: false,
          ariaHidden: true,
          className: 'absolute inset-0 z-20 [backface-visibility:hidden] [transform-style:preserve-3d]',
          style: {
            width: '100%',
            height: '100%',
            transform: 'rotateY(0deg) translateZ(0.5px)',
          },
        })}

        {/* Reverse side of the physical turning sheet */}
        {renderCanvasLeaf(backPageIndex, {
          renderKey: `turn-back-${plan.backPageId}`,
          side: backSide,
          surface: true,
          dataCanvas: false,
          turnFace: 'back',
          showHelper: false,
          ariaHidden: true,
          className: 'absolute inset-0 z-10 [backface-visibility:hidden] [transform-style:preserve-3d]',
          style: {
            width: '100%',
            height: '100%',
            transform: `rotateY(${backRotation}) translateZ(0.5px)`,
          },
        })}

        {/* A narrow edge is exposed around 90° so the leaf retains physical thickness. */}
        <span
          data-turn-edge
          aria-hidden="true"
          className="absolute inset-y-0 z-30 w-[2px] bg-zinc-300/80 shadow-[0_0_5px_rgba(255,255,255,0.22)] [backface-visibility:hidden]"
          style={{
            [forward ? 'right' : 'left']: '-1px',
            transform: `rotateY(${forward ? '90deg' : '-90deg'})`,
          }}
        />
      </div>
    );
  };

  const printTree = (
    <div className="print-root" aria-hidden="true" style={{ '--paper-w': paper.w, '--paper-h': paper.h }}>
      <style>{`@page { size: ${paper.w} ${paper.h}; margin: 0; }`}</style>
      {printPages.map((page) => (
        <section key={page.id} className="print-page">
          <SheetGrid page={page} card={card} gap={settings.gap} unit={`${printFit.toFixed(4)}in`} dims={dims} renderSlot={(slot) => {
            const id = page.slots[slot.key];
            const src = images[id] || pool.find((item) => item.id === id)?.src;
            const crop = id ? getCrop(page, slot.key, id) : { x: 50, y: 50 };
            return <div className="size-full overflow-hidden bg-white" style={settings.cutGuides ? { outline: '0.2pt solid #9ca3af' } : undefined}>{src && <img src={src} alt="" className="size-full" style={{ objectFit: settings.fit, objectPosition: `${crop.x}% ${crop.y}%` }} />}</div>;
          }} />
        </section>
      ))}
    </div>
  );

  const toastTones = {
    info: 'border-zinc-700 bg-[#18181B] text-zinc-100',
    success: 'border-emerald-400/25 bg-emerald-950 text-emerald-100',
    warn: 'border-amber-400/25 bg-amber-950 text-amber-100',
    error: 'border-red-400/25 bg-red-950 text-red-100',
  };

  return (
    <>
      <div className="app-shell flex flex-col bg-[#0B0B0C] text-zinc-200">
        <div ref={panelRootRef}>
          <AppBar
            settings={settings}
            setSettings={setSettings}
            pageLabel={activeSpread.length === 1 ? `Page ${activeSpread[0] + 1} / ${pages.length}` : `Pages ${activeSpread[0] + 1}–${activeSpread[1] + 1} / ${pages.length}`}
            canPrevious={activeSpreadIndex > 0}
            canNext={activeSpreadIndex < spreadGroups.length - 1}
            onPrevious={() => goToAdjacentSpread(-1)}
            onNext={() => goToAdjacentSpread(1)}
            onAdd={addPage}
            onDuplicate={duplicatePage}
            onDelete={deletePage}
            canDelete={pages.length > 2}
            saveStatus={saveStatus}
            installPrompt={installPrompt}
            onInstall={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
            openPanel={openPanel}
            setOpenPanel={setOpenPanel}
            onPrint={handlePrint}
            printSetup={<PrintSetupPopover settings={settings} setSettings={setSettings} fitInfo={fitInfo} suggestedPaper={suggestedPaper} printCount={printPages.length} onReset={resetBinder} />}
            shortcuts={<ShortcutsPopover />}
          />
        </div>
        <SetupToolbar
          settings={settings}
          setSettings={setSettings}
          fitInfo={fitInfo}
          suggestedPaper={suggestedPaper}
          onChooseLayout={chooseLayout}
          onViewChange={(view) => { commitEditing(); setSettings((value) => ({ ...value, view })); }}
        />
        <div className="flex min-h-0 flex-1 pb-7">
          <CardPool
            pool={pool}
            visiblePool={visiblePool}
            selected={selected}
            placedIds={placedIds}
            images={images}
            settings={settings}
            setSettings={setSettings}
            inputRef={inputRef}
            onFiles={addFiles}
            onPoolClick={onPoolClick}
            onPoolDoubleClick={(id) => placeCards([id], currentPage, null)}
            onPoolDragStart={startPoolDrag}
            onDragEnd={resetDrag}
            onSelectAll={selectAllVisible}
            onClearSelection={() => { setSelected([]); setSelectionAnchor(null); }}
            onFill={fillSelection}
            onDeleteSelected={() => deleteImages(selected)}
            sidebarDropActive={sidebarDropActive}
            slotDropActive={sidebarDropActive && dragInfo?.kind === 'slot'}
            onDragOver={(event) => { if (dragRef.current || hasFiles(event.dataTransfer)) { event.preventDefault(); setSidebarDropActive(true); event.dataTransfer.dropEffect = dragRef.current?.kind === 'slot' ? 'move' : 'copy'; } }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSidebarDropActive(false); }}
            onDrop={handleSidebarDrop}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            fetchedCards={fetchedCards}
            isLoading={isLoading}
            setsList={setsList}
            selectedSet={selectedSet}
            setSelectedSet={setSelectedSet}
            apiPage={apiPage}
            setApiPage={setApiPage}
            apiHasNext={apiHasNext}
            searchError={searchError}
            onSearchSubmit={submitCardSearch}
            onFetchedCardDragStart={startFetchedCardDrag}
            onFetchedCardAdd={addFetchedCardToPage}
          />
          <main className="flex min-w-0 flex-1 flex-col">
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-neutral-950 bg-[radial-gradient(ellipse_at_center,rgba(82,82,91,0.18),transparent_65%)]"
              onPointerMove={moveMarquee}
              onPointerDown={(event) => { if (event.target === event.currentTarget && combineMode) { setSelBox(null); setSelectionPageId(null); } }}
              onDragOver={(event) => { if (!combineMode && (['pool', 'remote'].includes(dragRef.current?.kind) || hasFiles(event.dataTransfer))) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
              onDrop={handleStageDrop}
            >
              {settings.view === 'binder' && (
                <span
                  data-binder-bed
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-[2rem] border border-white/[0.03] bg-gradient-to-b from-neutral-900/35 to-black/20 shadow-[0_30px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.025)]"
                  style={{ width: spreadWidth + 48, height: frameHeight + 48 }}
                />
              )}
              <div data-workspace-frame className={`relative [perspective:1200px] ${pageFlip.animating ? '[&_[data-workspace-toolbar]]:pointer-events-none [&_[data-workspace-toolbar]]:opacity-60' : ''}`} style={{ width: spreadWidth, height: frameHeight }}>
                {renderWorkspaceToolbar()}
                <div
                  data-spread
                  data-flip-active={pageFlip.animating ? '' : undefined}
                  className={`relative grid size-full grid-cols-2 gap-6 [transform-style:preserve-3d] ${pageFlip.animating ? 'pointer-events-none' : ''}`}
                  style={{ clipPath: pageFlip.animating ? 'inset(0 -100% 0 -100%)' : undefined }}
                >
                  {(settings.view === 'binder' || activeSpread.length === 2 || pageFlip.animating) && <BinderSpine view={settings.view} />}
                  {pageFlip.animating && pageFlip.plan && (
                    <span
                      data-turn-cast-shadow
                      data-turn-direction={pageFlip.direction > 0 ? 'forward' : 'backward'}
                      data-turn-state={pageFlip.turned ? 'turning' : 'resting'}
                      aria-hidden="true"
                    />
                  )}
                  {pageFlip.animating && pageFlip.plan ? (
                    <>
                      {renderAnimationBase(pageFlip.plan.baseLeftPageId, 'left')}
                      {renderAnimationBase(pageFlip.plan.baseRightPageId, 'right')}
                      {renderTurningSheet()}
                    </>
                  ) : (
                    <>
                      {settings.view === 'binder' && activeSpread.length === 1 && renderCoverLayer(activeSpread[0] === 0 ? 'left' : 'right')}
                      {activeSpread.map((pageIndex) => renderCanvasLeaf(pageIndex))}
                    </>
                  )}
                </div>
              </div>
            </div>
            <footer data-page-tray className="no-print scroll-area relative shrink-0 overflow-x-auto border-t border-white/5 bg-neutral-950/65 py-4 backdrop-blur-md before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
              <div data-page-tray-inner className="mx-auto flex w-max items-end gap-5 px-6">
                {spreadGroups.map(renderThumbnailGroup)}
                <div className="flex shrink-0 flex-col items-center justify-start gap-1 pb-1">
                  <button type="button" onClick={addPage} aria-label="Add page" className="flex aspect-[1/1.414] w-14 shrink-0 items-center justify-center rounded-sm border border-dashed border-neutral-700 text-neutral-500 transition-colors hover:border-neutral-500 hover:bg-neutral-900 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"><Icon name="plus" size="lg" /></button>
                  <span className="text-[10px] font-medium whitespace-nowrap text-neutral-500">Add page</span>
                </div>
              </div>
            </footer>
          </main>
        </div>
        <WorkspaceStatusBar />
        <div className="no-print pointer-events-none fixed bottom-10 right-5 z-[100] flex w-[360px] flex-col items-end gap-2">
          {toasts.map((toast) => <div key={toast.id} role="status" className={`animate-toast pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-[12px] shadow-2xl shadow-black/40 ${toastTones[toast.tone] || toastTones.info}`}><span className="leading-relaxed">{toast.message}</span>{toast.action && <button type="button" onClick={() => { setToasts((value) => value.filter((item) => item.id !== toast.id)); toast.action.onClick(); }} className="shrink-0 rounded-md bg-white/10 px-2 py-1 font-semibold text-white hover:bg-white/20">{toast.action.label}</button>}<button type="button" title="Dismiss" aria-label="Dismiss notification" onClick={() => setToasts((value) => value.filter((item) => item.id !== toast.id))} className="grid size-6 shrink-0 place-items-center rounded-md text-current hover:bg-white/10"><Icon name="x" size="sm" /></button></div>)}
        </div>
      </div>
      <div className="portrait-guard"><Icon name="rotate" size="2xl" className="text-red-400" /><h2 className="text-xl font-semibold text-white">Rotate to landscape</h2><p className="max-w-sm text-sm text-zinc-400">Digital Card Binder is designed as a desktop, landscape workspace.</p></div>
      {printTree}
    </>
  );
}
