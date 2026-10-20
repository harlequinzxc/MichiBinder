import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Columns4,
  Copy,
  Eraser,
  Eye,
  File,
  Grid2X2,
  Grid3X3,
  Image as ImageIcon,
  Keyboard,
  Layers,
  LayoutGrid,
  MonitorDown,
  Move,
  Menu,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
  Undo2,
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
const SCHEMA_VERSION = 4;
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
const THUMB_BOX = { w: 40, h: 40 * 1.414, pad: 3 };
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
  sectionName: '',
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

function compactCustomPrintPages(pages, dims, customIds) {
  const instances = pages.flatMap((page) => Object.entries(page.slots)
    .filter(([, id]) => customIds.has(id))
    .sort(([firstKey], [secondKey]) => {
      const [firstRow, firstCol] = firstKey.split('-').map(Number);
      const [secondRow, secondCol] = secondKey.split('-').map(Number);
      return (firstRow * MAX_COLS + firstCol) - (secondRow * MAX_COLS + secondCol);
    })
    .map(([key, id]) => ({ id, crop: getCrop(page, key, id) })));
  if (!instances.length) return [];

  const pageCapacity = dims.rows * dims.cols;
  const occupiedPageCount = Math.ceil(instances.length / pageCapacity);
  const physicalPageCount = Math.ceil(occupiedPageCount / 2) * 2;
  const compiledPages = Array.from({ length: physicalPageCount }, (_, pageIndex) => ({
    id: `print-custom-page-${pageIndex + 1}`,
    sheetId: `print-custom-sheet-${Math.floor(pageIndex / 2) + 1}`,
    face: pageIndex % 2 === 0 ? 'front' : 'back',
    merges: [],
    slots: {},
    crops: {},
  }));

  instances.forEach((instance, instanceIndex) => {
    const pageIndex = Math.floor(instanceIndex / pageCapacity);
    const pocketIndex = instanceIndex % pageCapacity;
    const key = keyOf(Math.floor(pocketIndex / dims.cols), pocketIndex % dims.cols);
    compiledPages[pageIndex].slots[key] = instance.id;
    if (instance.crop.x !== 50 || instance.crop.y !== 50) compiledPages[pageIndex].crops[key] = { img: instance.id, ...instance.crop };
  });

  return compiledPages.filter((page) => Object.keys(page.slots).length);
}

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
    sectionName: typeof value.sectionName === 'string' ? value.sectionName.slice(0, 40) : '',
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
    const pool = Array.isArray(parsed.pool) ? parsed.pool.filter((item) => item && typeof item.id === 'string').map((item) => ({
      id: item.id,
      name: String(item.name || 'Card image'),
      source: item.source === 'tcgdex' ? 'tcgdex' : 'upload',
      ...(typeof item.src === 'string' ? { src: item.src } : {}),
    })) : [];
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
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  combine: SquareDashedMousePointer,
  copy: Copy,
  eraser: Eraser,
  eye: Eye,
  file: File,
  grid: LayoutGrid,
  grid2x2: Grid2X2,
  grid3x3: Grid3X3,
  grid4x3: Columns4,
  image: ImageIcon,
  install: MonitorDown,
  keyboard: Keyboard,
  layers: Layers,
  merge: TableCellsMerge,
  menu: Menu,
  move: Move,
  plus: Plus,
  printer: Printer,
  redo: Redo2,
  reset: RotateCcw,
  rotate: RotateCw,
  ruler: Ruler,
  selectAll: Check,
  sliders: SlidersHorizontal,
  split: TableCellsSplit,
  sparkles: Sparkles,
  trash: Trash2,
  undo: Undo2,
  upload: Upload,
  wand: WandSparkles,
  x: X,
};
function Icon({ name, className = '', strokeWidth }) {
  const Component = ICONS[name];
  if (!Component) {
    if (import.meta.env.DEV) console.warn(`Unknown icon: ${name}`);
    return null;
  }
  const appearanceClasses = className
    .split(/\s+/)
    .filter((token) => token && !/^(?:size|w|h)-/.test(token))
    .join(' ');
  return <Component size={16} className={`h-4 w-4 shrink-0 ${appearanceClasses}`} strokeWidth={strokeWidth ?? 2} aria-hidden="true" />;
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
      {icon && <Icon name={icon} />}
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
          {option.icon && <Icon name={option.icon} />}
          <span className={previewStyle ? 'max-[1349px]:hidden' : ''}>{option.label}</span>
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

function PageSectionInput({ value, pageNumber, onCommit, style }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);
  const commit = () => {
    const next = draft.trim().slice(0, 40);
    setDraft(next);
    if (next !== (value || '')) onCommit(next);
  };
  return (
    <input
      data-page-section
      value={draft}
      maxLength={40}
      aria-label={`Section name for page ${pageNumber}`}
      placeholder="Section name"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === 'Escape') { setDraft(value || ''); event.currentTarget.blur(); }
      }}
      className="absolute z-20 h-5 border-0 bg-transparent px-2 text-center font-mono text-[9px] font-semibold tracking-[0.22em] text-white/40 uppercase outline-none transition-colors placeholder:text-white/20 hover:text-white/60 focus:bg-black/15 focus:text-white/80 focus:ring-0"
      style={style}
    />
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
          className="slot-area relative after:pointer-events-none data-[drop-active]:after:absolute data-[drop-active]:after:inset-0 data-[drop-active]:after:z-[60] data-[drop-active]:after:rounded-md data-[drop-active]:after:ring-2 data-[drop-active]:after:ring-inset data-[drop-active]:after:ring-red-500 data-[drop-active]:after:shadow-[0_0_20px_rgba(220,38,38,0.28)]"
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
  const saving = status === 'saving';
  const failed = status === 'error';
  const label = failed ? 'Save failed' : saving ? 'Saving...' : 'Saved locally';
  return (
    <div
      data-engine-badge
      className={`shrink-0 text-xs flex items-center gap-1.5 ${failed ? 'font-medium text-red-300' : saving ? 'text-neutral-200 font-medium animate-pulse' : 'text-neutral-400 font-medium'}`}
      aria-live="polite"
      aria-label={`Local storage: ${label}`}
      title="Local persistence status"
    >
      <span className={`size-1.5 rounded-full ${failed ? 'bg-red-400' : saving ? 'bg-amber-400' : 'bg-emerald-400'} shadow-[0_0_8px_currentColor]`} />
      <span>{label}</span>
    </div>
  );
}

function AppBar({ isLeftSidebarOpen, setIsLeftSidebarOpen, saveStatus }) {
  return (
    <header className="titlebar no-print relative z-[70] h-12 bg-neutral-900 border-b border-white/[0.06] flex items-center justify-between px-4 shrink-0">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setIsLeftSidebarOpen((value) => !value)}
          className="cursor-pointer rounded-md p-1.5 text-neutral-400 transition-all hover:bg-neutral-800 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          title={isLeftSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-label={isLeftSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-pressed={!isLeftSidebarOpen}
        >
          <Icon name="menu" />
        </button>
        <div className="flex items-center gap-2 select-none">
          <img src="/icons/icon-192.png" className="w-4 h-4 object-contain select-none pointer-events-none" alt="MichiBinder Logo" />
          <h1 className="bg-gradient-to-r from-white via-neutral-200 to-red-400 bg-clip-text text-xs font-semibold tracking-tight whitespace-nowrap text-transparent">MichiBinder</h1>
        </div>
        <SaveStatus status={saveStatus} />
      </div>
    </header>
  );
}

function RailButton({ icon, label, active = false, expanded, onClick, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : 'dialog'}
      title={label}
      className={`relative w-8 h-8 flex shrink-0 items-center justify-center rounded-lg bg-neutral-800/40 hover:bg-neutral-700/60 border border-white/[0.03] transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${active ? '!border-red-500/30 !bg-red-950/70 text-red-300' : 'text-neutral-400 hover:text-neutral-200'} ${className}`}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

function RailPopover({ title, icon, align = 'top', children }) {
  const positionClass = align === 'viewport' ? 'fixed right-[72px] top-16' : `absolute right-full mr-3 ${align === 'bottom' ? 'bottom-0' : 'top-0'}`;
  return (
    <div
      data-rail-popover
      role="dialog"
      aria-label={title}
      className={`${positionClass} z-50 w-56 bg-neutral-950/95 border border-white/[0.08] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-scaleIn origin-right p-3 flex flex-col gap-2`}
      style={{ transformOrigin: 'right center' }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2 text-[11px] font-semibold text-neutral-100">
        <Icon name={icon} className="text-neutral-400" />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function RightControlRail({
  settings,
  setSettings,
  onChooseLayout,
  onViewChange,
  printScope,
  setPrintScope,
  onPrint,
  openPanel,
  setOpenPanel,
  fitInfo,
  suggestedPaper,
  printCount,
  onReset,
  installPrompt,
  onInstall,
}) {
  const cleanSize = settings.cardSize;
  const base = baseCardSizeMm(cleanSize);
  const custom = cleanSize.preset === 'custom';
  const activeLayout = getLayout(settings.layout);
  const setCardSize = (patch) => setSettings((value) => ({ ...value, cardSize: sanitizeCardSize({ ...value.cardSize, ...patch }) }));
  const togglePanel = (panel) => setOpenPanel((value) => value === panel ? null : panel);
  const choosePrintScope = (scope) => { setPrintScope(scope); };
  const chooseGrid = (layoutId) => { onChooseLayout(layoutId); setOpenPanel(null); };
  const chooseView = (view) => { onViewChange(view); setOpenPanel(null); };

  return (
    <aside data-control-rail aria-label="Layout and print controls" className="no-print py-3 pr-3 flex items-center justify-center z-40 select-none max-h-[calc(100vh-176px)] shrink-0">
      <div data-control-pod className="w-14 h-full bg-neutral-900/85 backdrop-blur-md border border-white/[0.06] rounded-2xl flex flex-col items-center py-4 gap-6 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] [@media(max-height:720px)]:gap-3">
        <div data-rail-zone="primary" className="flex flex-col items-center gap-2 [@media(max-height:720px)]:gap-1">
          <div className="relative flex">
            <RailButton icon="printer" label="Print / PDF" active={openPanel === 'print-menu'} expanded={openPanel === 'print-menu'} onClick={() => togglePanel('print-menu')} />
            {openPanel === 'print-menu' && (
              <RailPopover title="Print / PDF" icon="printer">
                <button type="button" onClick={onPrint} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-red-500/25 bg-red-950/55 px-3 text-[11px] font-semibold text-red-100 transition-colors hover:bg-red-900/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                  <Icon name="printer" />
                  <span>Open print dialog</span>
                </button>
                <div className="border-t border-white/[0.06] pt-2">
                  <span className="mb-1.5 block text-[9px] font-bold tracking-widest text-neutral-500 uppercase">Print scope</span>
                  <div role="radiogroup" aria-label="Print scope" className="flex flex-col gap-1">
                    {[
                      { value: 'all', label: 'Include all', detail: 'Every placed card' },
                      { value: 'custom', label: 'Uploads only', detail: 'Private uploads only' },
                    ].map((option) => (
                      <button key={option.value} type="button" role="radio" aria-checked={printScope === option.value} onClick={() => choosePrintScope(option.value)} className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${printScope === option.value ? 'border-red-500/25 bg-red-950/55 text-red-200' : 'border-white/[0.05] bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800'}`}>
                        <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${printScope === option.value ? 'border-red-400/50 bg-red-500/15' : 'border-white/10 bg-neutral-950'}`}>{printScope === option.value && <span className="size-1.5 rounded-full bg-red-400" />}</span>
                        <span className="min-w-0"><strong className="block text-[11px] font-semibold">{option.label}</strong><span className="block truncate text-[9px] text-neutral-500">{option.detail}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
              </RailPopover>
            )}
          </div>
        </div>

        <div data-rail-zone="layout" className="flex flex-col gap-3.5 items-center [@media(max-height:720px)]:gap-2">
          <div className="relative flex">
            <RailButton icon={activeLayout.icon} label={`Grid selection: ${activeLayout.label}`} active={openPanel === 'grid'} expanded={openPanel === 'grid'} onClick={() => togglePanel('grid')}>
              <span className="absolute bottom-1 right-1 text-[7px] font-mono font-bold leading-none text-current">{activeLayout.pockets}</span>
            </RailButton>
            {openPanel === 'grid' && (
              <RailPopover title="Grid selection" icon="grid">
                <div role="radiogroup" aria-label="Pocket layout" className="flex flex-col gap-1">
                  {GRID_LAYOUTS.map((layoutOption) => (
                    <button key={layoutOption.id} type="button" role="radio" aria-checked={settings.layout === layoutOption.id} aria-label={`${layoutOption.label} (${layoutOption.hint})`} onClick={() => chooseGrid(layoutOption.id)} className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${settings.layout === layoutOption.id ? 'border-red-500/25 bg-red-950/55 text-red-200' : 'border-white/[0.05] bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800'}`}>
                      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/[0.06] bg-neutral-950"><Icon name={layoutOption.icon} /></span>
                      <span className="min-w-0 flex-1"><strong className="block text-[11px] font-semibold">{layoutOption.pockets} pockets</strong><span className="block text-[9px] text-neutral-500">{layoutOption.hint}</span></span>
                      {settings.layout === layoutOption.id && <Icon name="check" className="text-red-400" />}
                    </button>
                  ))}
                </div>
              </RailPopover>
            )}
          </div>
          <span aria-hidden="true" className="my-1 h-px w-7 bg-white/[0.06]" />
          <div className="relative flex">
            <RailButton icon="eye" label="Preview" active={openPanel === 'preview'} expanded={openPanel === 'preview'} onClick={() => togglePanel('preview')} />
            {openPanel === 'preview' && (
              <RailPopover title="Preview" icon="eye">
                <div role="radiogroup" aria-label="Preview mode" className="flex flex-col gap-1">
                  {[
                    { value: 'binder', label: 'Binder preview', detail: 'Physical spread and rings', icon: 'book' },
                    { value: 'paper', label: 'Paper preview', detail: 'Print-safe sheet surface', icon: 'file' },
                  ].map((option) => (
                    <button key={option.value} type="button" role="radio" aria-checked={settings.view === option.value} onClick={() => chooseView(option.value)} className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${settings.view === option.value ? 'border-red-500/25 bg-red-950/55 text-red-200' : 'border-white/[0.05] bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800'}`}>
                      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/[0.06] bg-neutral-950"><Icon name={option.icon} /></span>
                      <span className="min-w-0 flex-1"><strong className="block text-[11px] font-semibold">{option.label}</strong><span className="block truncate text-[9px] text-neutral-500">{option.detail}</span></span>
                      {settings.view === option.value && <Icon name="check" className="text-red-400" />}
                    </button>
                  ))}
                </div>
              </RailPopover>
            )}
          </div>
          <div className="relative flex">
            <button type="button" aria-label={`Card scale: ${Math.round(cleanSize.scale * 100)}%`} aria-expanded={openPanel === 'scale'} aria-haspopup="dialog" onClick={() => togglePanel('scale')} title="Card scale" className={`flex h-7 w-11 items-center justify-center rounded-full border text-[10px] font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${openPanel === 'scale' ? 'border-red-500/30 bg-red-950/70 text-red-300' : 'border-white/[0.08] bg-neutral-950 text-neutral-300 hover:bg-neutral-800'}`}>{Math.round(cleanSize.scale * 100)}%</button>
            {openPanel === 'scale' && (
              <RailPopover title="Card scale" icon="ruler">
                <div className="flex items-center justify-center gap-5 py-1">
                  <input type="range" min={80} max={125} step={1} value={Math.round(cleanSize.scale * 100)} aria-label="Card scale" onChange={(event) => setCardSize({ scale: Number(event.target.value) / 100 })} onDoubleClick={() => setCardSize({ scale: 1 })} className="h-40 w-5 cursor-pointer accent-red-600 [direction:rtl] [writing-mode:vertical-lr] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500" />
                  <div className="flex flex-col items-center gap-3"><output className="text-xl font-semibold tracking-tight text-neutral-100">{Math.round(cleanSize.scale * 100)}%</output><span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">80–125%</span><button type="button" onClick={() => setCardSize({ scale: 1 })} className="rounded-md border border-white/[0.08] bg-neutral-900 px-2 py-1 text-[9px] font-semibold text-neutral-400 hover:text-neutral-200">Reset</button></div>
                </div>
              </RailPopover>
            )}
          </div>
        </div>

        <div data-rail-zone="material" className="flex flex-col items-center gap-2 [@media(max-height:720px)]:gap-1">
          <div className="relative flex">
            <RailButton icon="layers" label={`Card size: ${custom ? 'Custom' : 'Pokémon'} ${round1(base.w)} × ${round1(base.h)} mm`} active={openPanel === 'card-size'} expanded={openPanel === 'card-size'} onClick={() => togglePanel('card-size')} />
            {openPanel === 'card-size' && (
              <RailPopover title="Card material" icon="layers">
                <label className="block"><span className="mb-1.5 block text-[9px] font-bold tracking-widest text-neutral-500 uppercase">Card archetype</span><select value={custom ? 'custom' : cleanSize.preset} aria-label="Card size" onChange={(event) => { if (event.target.value === 'custom') setCardSize({ preset: 'custom', customWmm: base.w, customHmm: base.h }); else setCardSize({ preset: event.target.value }); }} className="h-9 w-full rounded-lg border border-white/[0.08] bg-neutral-900 px-2 text-[11px] font-medium text-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500">{CARD_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label} · {preset.wMm} × {preset.hMm} mm</option>)}<option value="custom">Custom dimensions…</option></select></label>
                {custom && <div className="flex items-center justify-between gap-1 rounded-lg border border-white/[0.06] bg-neutral-900/70 p-2"><MmField label="W" value={cleanSize.customWmm} onCommit={(customWmm) => setCardSize({ customWmm })} /><span className="text-neutral-600">×</span><MmField label="H" value={cleanSize.customHmm} onCommit={(customHmm) => setCardSize({ customHmm })} /></div>}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[9px] font-mono text-neutral-500"><span>Effective</span><strong className="text-neutral-200">{fmtMm(resolveCardSize(cleanSize).w)} × {fmtMm(resolveCardSize(cleanSize).h)} mm</strong></div>
              </RailPopover>
            )}
          </div>
          <div className="relative flex">
            <RailButton icon="sliders" label="Print setup" active={openPanel === 'print'} expanded={openPanel === 'print'} onClick={() => togglePanel('print')}>
              <span className={`absolute right-1 top-1 size-1.5 rounded-full ${fitInfo.fitsTrueSize ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </RailButton>
            {openPanel === 'print' && <RailPopover title="Print setup" icon="sliders" align="viewport"><PrintSetupContent settings={settings} setSettings={setSettings} fitInfo={fitInfo} suggestedPaper={suggestedPaper} printCount={printCount} onReset={onReset} /></RailPopover>}
          </div>
          <div className="relative flex">
            <RailButton icon="keyboard" label="Keyboard shortcuts" active={openPanel === 'shortcuts'} expanded={openPanel === 'shortcuts'} onClick={() => togglePanel('shortcuts')} />
            {openPanel === 'shortcuts' && <RailPopover title="Keyboard shortcuts" icon="keyboard" align="viewport"><ShortcutsContent /></RailPopover>}
          </div>
          {installPrompt && <RailButton icon="install" label="Install app" onClick={onInstall} />}
        </div>
      </div>
    </aside>
  );
}

function FloatingNavigation({
  showBottomTimeline,
  onToggleTimeline,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  combineMode,
  onToggleCombine,
  canMerge,
  onMerge,
  selectedMergeCount,
  onUnmerge,
  canResetLayout,
  onResetLayout,
  canClearPage,
  onClearPage,
  currentSpread,
  totalSpreads,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onAdd,
  onDuplicate,
  onDelete,
  canDelete,
}) {
  const bottomIconButton = 'w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-800/40 hover:bg-neutral-700/60 border border-white/[0.03] transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500';
  const neutralIconButton = `${bottomIconButton} text-neutral-400 hover:text-neutral-200 disabled:pointer-events-none disabled:cursor-default disabled:text-neutral-700`;
  return (
    <div data-bottom-control-bar className="no-print relative flex w-full shrink-0 items-center justify-center border-t border-white/[0.06] bg-neutral-900/60 px-6 py-3 backdrop-blur-md select-none">
      <div className="flex w-full items-center justify-center">
        <div data-floating-navigation className="flex w-fit max-w-[calc(100%_-_10rem)] items-center gap-2 overflow-x-auto rounded-xl border border-white/[0.06] bg-neutral-950 px-4 py-2 shadow-2xl scrollbar-none [scrollbar-width:none] min-[1281px]:gap-4 [&::-webkit-scrollbar]:hidden">
          <div role="group" aria-label="History" className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo" className={neutralIconButton}><Icon name="undo" /></button>
            <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo" className={neutralIconButton}><Icon name="redo" /></button>
          </div>
          <div role="group" aria-label="Slot structure" className="flex shrink-0 items-center gap-1 border-l border-white/[0.06] pl-2 min-[1281px]:pl-4">
            <button type="button" onClick={onToggleCombine} aria-pressed={combineMode} aria-label="Combine slots" title="Combine slots (M)" className={`${bottomIconButton} ${combineMode ? '!border-red-500/30 !bg-red-950/70 text-red-300' : 'text-neutral-400 hover:text-neutral-200'}`}><Icon name="combine" /></button>
            <button type="button" onClick={onMerge} disabled={!canMerge} aria-label="Merge selected slots" title="Merge selected slots (Enter)" className={neutralIconButton}><Icon name="merge" /></button>
            <button type="button" onClick={onUnmerge} disabled={!selectedMergeCount} aria-label="Unmerge selected frame" title="Unmerge selected frame (U)" className={neutralIconButton}><Icon name="split" /></button>
            <button type="button" onClick={onResetLayout} disabled={!canResetLayout} aria-label="Reset merged layout" title="Reset merged layout" className={neutralIconButton}><Icon name="reset" /></button>
            <button type="button" onClick={onClearPage} disabled={!canClearPage} aria-label="Clear active page" title="Clear active page" className={`${bottomIconButton} text-neutral-500 hover:!bg-red-500/10 hover:text-red-400 disabled:pointer-events-none disabled:cursor-default disabled:text-neutral-700`}><Icon name="eraser" /></button>
          </div>
          <div role="group" aria-label="Spread navigation" className="flex shrink-0 items-center gap-2 border-l border-white/[0.06] pl-2 min-[1281px]:pl-4">
            <button type="button" onClick={onPrevious} disabled={!canPrevious} aria-label="Previous spread" title="Previous spread" className={neutralIconButton}><Icon name="chevronLeft" /></button>
            <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 font-medium" aria-live="polite">
              <span className="max-[1280px]:sr-only">Spread</span>
              <span className="rounded border border-white/[0.04] bg-neutral-900 px-2 py-0.5 font-semibold text-neutral-200">{currentSpread}</span>
              <span>/</span>
              <span>{totalSpreads}</span>
            </div>
            <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next spread" title="Next spread" className={neutralIconButton}><Icon name="chevronRight" /></button>
          </div>
          <button type="button" onClick={onAdd} aria-label="Add spread" className={`${bottomIconButton} text-neutral-200 shadow-sm min-[1281px]:ml-2`} title="Insert a new two-page physical sheet"><Icon name="plus" /></button>
          <button type="button" onClick={onDuplicate} aria-label="Duplicate physical sheet" title="Duplicate physical sheet" className={`${neutralIconButton} min-[1281px]:ml-2`}><Icon name="copy" /></button>
          <button type="button" onClick={onDelete} disabled={!canDelete} aria-label="Delete active sheet" title={canDelete ? 'Delete active sheet' : 'Keep at least one physical sheet'} className={`${bottomIconButton} text-neutral-500 hover:!bg-red-500/10 hover:text-red-400 disabled:pointer-events-none disabled:cursor-default disabled:text-neutral-700`}><Icon name="trash" /></button>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={showBottomTimeline}
        aria-controls="bottom-page-timeline"
        onClick={onToggleTimeline}
        className={`${bottomIconButton} absolute right-6 text-neutral-400 shadow hover:text-neutral-200`}
        title={showBottomTimeline ? 'Collapse Timeline' : 'Expand Timeline'}
      >
        <Icon name={showBottomTimeline ? 'chevronDown' : 'chevronUp'} />
      </button>
    </div>
  );
}

function PrintSetupContent({ settings, setSettings, fitInfo, suggestedPaper, printCount, onReset }) {
  return (
    <div className="space-y-2.5 text-[11px] text-zinc-300">
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-zinc-400">Paper size</span>
        <select value={settings.paper} onChange={(event) => setSettings((value) => ({ ...value, paper: event.target.value }))} className="h-8 w-full rounded-lg border border-zinc-800 bg-[#0B0B0C] px-2 text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500">
          {Object.entries(PAPER_SIZES).map(([key, paper]) => <option key={key} value={key}>{paper.label}</option>)}
        </select>
      </label>
      <div className={`flex items-center gap-2 rounded-lg p-2 ${fitInfo.fitsTrueSize ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
        <Icon name={fitInfo.fitsTrueSize ? 'check' : 'alert'} />
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
      <div className="rounded-lg border border-zinc-800 bg-[#0B0B0C]/70 p-2 text-[11px] leading-relaxed text-zinc-400">In the print dialog choose <strong className="text-zinc-200">Save as PDF</strong>, margins <strong className="text-zinc-200">None</strong>, scale <strong className="text-zinc-200">100%</strong>, and turn on <strong className="text-zinc-200">Background graphics</strong>.</div>
      <div className="flex items-center justify-between border-t border-zinc-800 pt-3"><span>{plural(printCount, 'page')} will print</span><ToolButton icon="reset" label="Reset binder…" variant="danger" dense onClick={onReset} /></div>
    </div>
  );
}

function ShortcutsContent() {
  const rows = [
    ['Ctrl/⌘ + Z', 'Undo canvas change'], ['Ctrl + Y / Ctrl/⌘ + Shift + Z', 'Redo canvas change'],
    ['Ctrl/⌘ + A', 'Select visible cards'], ['Esc', 'Cancel or clear'], ['Delete', 'Delete selected cards'],
    ['M', 'Toggle Combine mode'], ['Enter', 'Merge / confirm'], ['U', 'Unmerge selection'],
    ['← / →', 'Previous / next spread'], ['PageUp / PageDown', 'Previous / next spread'], ['F', 'Fill active page'],
    ['Double-click', 'Reposition an image'],
  ];
  return (
    <dl className="flex flex-col gap-0.5">
      {rows.map(([key, action]) => (
        <div key={key} className="flex items-center gap-2 rounded-md border border-white/[0.04] bg-neutral-900/45 px-2 py-0.5">
          <dt className="shrink-0"><Kbd className="text-[8px]">{key}</Kbd></dt>
          <dd className="min-w-0 text-[9px] leading-tight text-neutral-400">{action}</dd>
        </div>
      ))}
    </dl>
  );
}

function CardPool({
  isOpen,
  customUploadedCards,
  selectedCardIds,
  placedIds,
  images,
  inputRef,
  onFiles,
  onPoolClick,
  onPoolDoubleClick,
  onPoolDragStart,
  onDragEnd,
  onClearSelection,
  sidebarDropActive,
  slotDropActive,
  onDragOver,
  onDragLeave,
  onDrop,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  fetchedCards,
  isLoading,
  setsList,
  selectedSet,
  setSelectedSet,
  hasMoreCards,
  searchError,
  onSearchSubmit,
  onClearFilters,
  onLoadMore,
  onFetchedCardDragStart,
  onFetchedCardAdd,
}) {
  const searchActive = Boolean(searchQuery.trim() || selectedSet);
  const customCards = customUploadedCards.map((item) => ({ ...item, localUrlDataString: images[item.id] || item.src || '' }));
  const catalogScrollLockRef = useRef(false);
  useEffect(() => {
    if (!isLoading) catalogScrollLockRef.current = false;
  }, [isLoading, fetchedCards.length]);
  const handleCatalogScroll = (event) => {
    const catalog = event.currentTarget;
    const nearBottom = catalog.scrollHeight - catalog.scrollTop - catalog.clientHeight <= 100;
    if (!nearBottom || isLoading || !hasMoreCards || catalogScrollLockRef.current) return;
    catalogScrollLockRef.current = true;
    onLoadMore();
  };
  const handleLocalUploadEvent = (event) => {
    onFiles(event.target.files);
    event.target.value = '';
  };
  const chooseTab = (tab) => {
    if (tab === activeTab) return;
    onClearSelection();
    setActiveTab(tab);
  };
  return (
    <aside
      data-left-sidebar
      aria-hidden={!isOpen}
      className={`no-print relative z-50 flex h-full shrink-0 flex-col overflow-hidden bg-neutral-900 transition-[width,opacity] duration-300 ease-in-out will-change-[width,opacity] ${isOpen ? 'w-80 border-r border-white/[0.06] opacity-100 shadow-[8px_0_28px_rgba(0,0,0,0.28)]' : 'w-0 border-r-0 opacity-0 pointer-events-none'} ${sidebarDropActive ? 'ring-2 ring-inset ring-red-600' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}
    >
      <nav aria-label="Card source" className="px-4 pb-3 pt-3">
        <div className="grid grid-cols-2 rounded-lg border border-white/[0.06] bg-neutral-950 p-0.5 shadow-inner">
          {[
            { id: 'cards', label: 'Cards', icon: 'layers' },
            { id: 'michi', label: 'Michi', icon: 'sparkles' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => chooseTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${activeTab === tab.id ? 'border border-red-500/25 bg-red-950/60 text-red-300 shadow-sm' : 'border border-transparent text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200'}`}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'michi' ? (
        <section aria-label="Michi custom assets" className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div data-local-upload className={`w-full p-4 border border-dashed border-neutral-800 hover:border-neutral-600 bg-neutral-900/30 hover:bg-neutral-900/50 transition-all rounded-lg text-center cursor-pointer select-none group relative ${sidebarDropActive && !slotDropActive ? '!border-red-600 !bg-red-950/30' : ''}`}>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              aria-label="Upload custom card art"
              onChange={handleLocalUploadEvent}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Icon name="upload" className="mx-auto text-neutral-500 group-hover:text-neutral-400 mb-1.5 transition-colors" />
            <span className="block text-xs font-semibold text-neutral-200">Upload custom card art</span>
            <span className="block text-[10px] font-mono text-neutral-500 tracking-normal mt-0.5">PNG, JPG, or WEBP files</span>
          </div>

          <div className="flex items-center justify-between px-1 py-1.5 border-b border-white/[0.04] mt-3 mb-2 select-none">
            <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-500">Your Uploads</span>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded-md border border-white/[0.04]">{customUploadedCards.length} assets</span>
          </div>

          <div role="listbox" aria-label="Custom uploaded cards" aria-multiselectable="true" className="scroll-area grid grid-cols-3 gap-2 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0.5" onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}>
            {customCards.map((localCard) => {
              const selectionIndex = selectedCardIds.indexOf(localCard.id);
              const placed = placedIds.has(localCard.id);
              return (
                <div
                  key={localCard.id}
                  data-local-card={localCard.id}
                  data-placed={placed ? '' : undefined}
                  role="option"
                  aria-selected={selectionIndex >= 0}
                  aria-label={`${localCard.name || 'Custom Art'}, local upload`}
                  tabIndex={0}
                  draggable="true"
                  title={`${localCard.name || 'Custom Art'} · drag to a binder slot`}
                  onClick={(event) => onPoolClick(event, localCard.id, customCards)}
                  onDoubleClick={() => onPoolDoubleClick(localCard.id)}
                  onKeyDown={(event) => { if (event.key === 'Enter') onPoolDoubleClick(localCard.id); }}
                  onDragStart={(event) => onPoolDragStart(event, localCard.id)}
                  onDragEnd={onDragEnd}
                  className={`relative group/local aspect-[2.5/3.5] cursor-grab active:cursor-grabbing rounded-md overflow-hidden bg-neutral-900 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-red-500 ${selectionIndex >= 0 ? 'ring-2 ring-red-500 scale-[0.98] brightness-110 shadow-lg' : 'border border-white/[0.03] opacity-80 hover:opacity-100 shadow-sm hover:shadow-lg hover:border-white/[0.15]'}`}
                >
                  {localCard.localUrlDataString ? <img src={localCard.localUrlDataString} className={`w-full h-full object-cover bg-neutral-950 pointer-events-none ${placed ? 'opacity-45 grayscale group-hover/local:opacity-75' : ''}`} alt="Uploaded Card" /> : <span className="absolute inset-0 grid place-items-center text-neutral-600"><Icon name="image" /></span>}
                  <span className="absolute top-1 right-1 bg-neutral-950/80 backdrop-blur-sm text-[8px] font-mono text-neutral-400 border border-white/[0.08] px-1 py-0.5 rounded shadow-sm">LOCAL</span>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-5 text-[9px] font-medium text-neutral-200 opacity-0 transition-opacity group-hover/local:opacity-100 group-focus-visible/local:opacity-100"><span className="block truncate">{localCard.name || 'Custom Art'}</span></span>
                  {selectionIndex >= 0 && <span className="animate-scaleIn absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-mono font-bold text-white shadow-md">{selectionIndex + 1}</span>}
                </div>
              );
            })}
            {!customUploadedCards.length && <div className="col-span-3 py-10 text-center text-[11px] leading-relaxed text-neutral-500">Upload custom card art to build your private Michi collection.</div>}
          </div>
        </section>
      ) : (
        <>
          <div className="px-4 pb-3">
            <form
              role="search"
              className="relative"
              onSubmit={(event) => { event.preventDefault(); onSearchSubmit(); }}
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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
                  onChange={(event) => setSelectedSet(event.target.value)}
                  className="w-full px-3 py-1.5 bg-neutral-950 border border-white/[0.06] rounded-md text-xs font-medium text-neutral-300 focus:outline-none cursor-pointer focus:ring-1 focus:ring-red-500/50"
                >
                  <option value="">All sets</option>
                  {setsList.map((set) => <option key={set.id} value={set.id}>{set.name}{set.cardCount ? ` · ${set.cardCount}` : ''}</option>)}
                </select>
              </label>
            </div>
          </div>

          {searchActive ? (
            <section aria-label="TCGdex search results" className="flex min-h-0 flex-1 flex-col px-3 pb-4">
              <div className="flex items-center justify-between w-full px-1 py-1 border-b border-white/[0.04] mb-2">
                <span aria-live="polite" className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded border border-white/[0.04]">{isLoading && !fetchedCards.length ? 'Loading…' : plural(fetchedCards.length, 'item')}</span>
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50 rounded-sm"
                >
                  <Icon name="x" />
                  <span>Clear Filters</span>
                </button>
              </div>
              {searchError && <div role="alert" className="mx-1 mb-2 rounded-md border border-red-500/20 bg-red-950/30 px-2.5 py-2 text-[10px] leading-relaxed text-red-300">{searchError}</div>}
              <div className="px-2 py-1">
                <div
                  data-tcgdex-results
                  role="listbox"
                  aria-label="Pokémon card search results"
                  aria-busy={isLoading}
                  onScroll={handleCatalogScroll}
                  onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}
                  className="scroll-area grid grid-cols-2 gap-3 p-2 overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-none will-change-transform [scrollbar-width:none] [&::-webkit-scrollbar]:hidden group rounded-md border border-white/[0.04]"
                >
                  {isLoading && !fetchedCards.length && Array.from({ length: 6 }, (_, index) => <span key={index} aria-hidden="true" className="aspect-[245/337] animate-pulse rounded-lg border border-white/[0.04] bg-neutral-900" />)}
                  {fetchedCards.map((item) => {
                    const fullImageUrl = item.image ? `${item.image}/low.jpg` : '/placeholder.png';
                    const highResImageUrl = item.image ? `${item.image}/high.jpg` : '/placeholder.png';
                    const selectionIndex = selectedCardIds.indexOf(item.id);
                    return (
                      <div
                        key={item.id}
                        data-tcgdex-card={item.id}
                        role="option"
                        aria-selected={selectionIndex >= 0}
                        aria-label={`${item.name}, drag to binder`}
                        tabIndex={0}
                        draggable="true"
                        title={`${item.name} · click to select · drag to a binder slot`}
                        onClick={(event) => onPoolClick(event, item.id, fetchedCards)}
                        onDragStart={(event) => onFetchedCardDragStart(event, item)}
                        onDragEnd={onDragEnd}
                        onDoubleClick={() => onFetchedCardAdd(item, highResImageUrl)}
                        onKeyDown={(event) => { if (event.key === 'Enter') onFetchedCardAdd(item, highResImageUrl); }}
                        className={`relative group/card aspect-[245/337] cursor-grab active:cursor-grabbing rounded-md overflow-hidden bg-neutral-900 outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-red-500 ${selectionIndex >= 0 ? 'ring-2 ring-red-500 scale-[0.98] brightness-110 shadow-lg' : 'border border-white/[0.03] opacity-80 hover:opacity-100 shadow-sm hover:shadow-xl hover:border-white/[0.1]'}`}
                      >
                        <img data-img-id={item.id} src={fullImageUrl} alt={item.name} draggable={false} loading="lazy" className="w-full h-auto object-contain bg-neutral-950 transition-opacity duration-200" onError={(event) => { if (!event.currentTarget.src.endsWith('/placeholder.png')) event.currentTarget.src = '/placeholder.png'; }} />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 group-focus-visible/card:opacity-100 transition-opacity p-2 flex items-end"><span className="text-[9px] font-mono font-medium tracking-wide text-neutral-200 truncate w-full">{item.name}</span></span>
                        {selectionIndex >= 0 && <span className="animate-scaleIn absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-mono font-bold text-white shadow-md">{selectionIndex + 1}</span>}
                      </div>
                    );
                  })}
                  {isLoading && fetchedCards.length > 0 && <div data-catalog-loading className="col-span-2 flex items-center justify-center gap-2 py-3 text-[10px] font-medium text-neutral-500"><span aria-hidden="true" className="size-3 animate-spin rounded-full border border-neutral-700 border-t-red-500" />Loading more cards…</div>}
                  {!isLoading && !searchError && !fetchedCards.length && <div className="col-span-2 text-center py-12 text-xs text-neutral-500 font-mono tracking-wide">No matching Pokémon cards found.</div>}
                  {!isLoading && !searchError && !hasMoreCards && fetchedCards.length > 0 && <div data-catalog-end className="col-span-2 border-t border-white/[0.04] py-3 text-center text-[9px] font-mono tracking-widest text-neutral-600 uppercase">End of catalog</div>}
                </div>
              </div>
              <p className="mt-2 px-1 text-center text-[9px] leading-relaxed text-neutral-600">Drag to a slot or double-click to add · Powered by TCGdex</p>
            </section>
          ) : (
            <div className="mx-4 mt-1 rounded-lg border border-dashed border-white/[0.05] bg-neutral-900/20 px-5 py-10 text-center">
              <Icon name="sparkles" className="mx-auto mb-2 text-neutral-600" />
              <p className="text-xs font-medium text-neutral-400">Search the public card catalog</p>
              <p className="mt-1 text-[10px] leading-relaxed text-neutral-600">Enter a Pokémon name or select a set to browse TCGdex.</p>
            </div>
          )}
        </>
      )}
      {slotDropActive && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-red-950/80 p-6 text-center text-sm font-semibold text-red-100 backdrop-blur-sm"><span className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3"><Icon name="trash" />Drop to remove from binder</span></div>}
    </aside>
  );
}

function CanvasHelper({ editing, multiDrag, flowCount, offsetX, onCenter, onCancel, onDone }) {
  let tone = 'border-zinc-800 bg-[#121214] text-zinc-200';
  let content;
  if (editing) {
    tone = 'border-amber-400/30 bg-amber-950/90 text-amber-100';
    content = <><Icon name="move" /><span>Reposition image — drag inside the slot · arrows nudge · click outside to confirm</span><ToolButton label="Center" dense onClick={onCenter} /><ToolButton label="Cancel" dense onClick={onCancel} /><ToolButton label="Done" dense variant="primary" onClick={onDone} /></>;
  } else if (multiDrag > 1) {
    tone = 'border-emerald-400/30 bg-emerald-950/90 text-emerald-100';
    content = <><Icon name="wand" /><span>Dropping {plural(multiDrag, 'card')} into the first empty slots{flowCount ? ` · ${flowCount} will flow to the next page(s)` : ''}</span></>;
  } else return null;

  return <div data-reposition-ui={editing ? '' : undefined} className={`absolute top-full z-30 mt-4 flex h-8 w-auto min-w-fit max-w-none -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 text-[11px] whitespace-nowrap shadow-xl shadow-black/30 ${tone}`} style={{ left: `calc(50% + ${offsetX}px)` }}>{content}</div>;
}

function BinderSpine({ view }) {
  const binderView = view === 'binder';
  return (
    <div
      data-binder-spine
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 left-1/2 z-30 -translate-x-1/2 ${binderView ? 'w-8 shadow-[inset_10px_0_18px_-12px_rgba(0,0,0,0.98),inset_-10px_0_18px_-12px_rgba(0,0,0,0.98)]' : 'w-px bg-black/70'}`}
    >
      {binderView && <span data-spine-crease className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-r from-black/85 via-transparent to-black/85" />}
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/90" />
      {binderView && [0.17, 0.5, 0.83].map((position) => (
        <span
          key={position}
          className="absolute left-1/2 h-3 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-gradient-to-b from-neutral-500/70 via-neutral-800 to-black shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(0,0,0,0.9)]"
          style={{ top: `${position * 100}%` }}
        >
          <span className="absolute inset-x-2 top-px h-px rounded-full bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        </span>
      ))}
    </div>
  );
}

export default function CardBinder() {
  const boot = useMemo(loadPersisted, []);
  useEffect(() => {
    document.title = "MichiBinder";
  }, []);
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
  const [activeTab, setActiveTab] = useState('cards');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [showBottomTimeline, setShowBottomTimeline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedCards, setFetchedCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [setsList, setSetsList] = useState([]);
  const [selectedSet, setSelectedSet] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [hasMoreCards, setHasMoreCards] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [settings, setSettings] = useState(boot.settings);
  const [images, setImages] = useState(() => Object.fromEntries(boot.pool.filter((item) => item.src).map((item) => [item.id, item.src])));
  const [imageDims, setImageDims] = useState({});
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [storageMode, setStorageMode] = useState('indexeddb');
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [openPanel, setOpenPanel] = useState(null);
  const [printScope, setPrintScope] = useState('all');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [combineMode, setCombineModeState] = useState(false);
  const [selBox, setSelBox] = useState(null);
  const [selectionPageId, setSelectionPageId] = useState(null);
  const [pageFlip, setPageFlip] = useState({ animating: false, turned: false, direction: 1, token: 0, plan: null });
  const [marqueeActive, setMarqueeActive] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [sidebarDropActive, setSidebarDropActive] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stageSize, setStageSize] = useState({ w: 1000, h: 620 });

  const stageRef = useRef(null);
  const timelineContainerRef = useRef(null);
  const inputRef = useRef(null);
  const dragRef = useRef(null);
  const searchAbortRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const setCardsCacheRef = useRef(new Map());
  const marqueeRef = useRef(null);
  const selBoxRef = useRef(selBox);
  const selectionPageIdRef = useRef(selectionPageId);
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
  const currentFilledCount = useMemo(() => current ? getSlots(current, dims).filter((slot) => current.slots[slot.key]).length : 0, [current, dims]);
  const spreadGroups = useMemo(() => binderViewGroups(pages.length), [pages.length]);
  const activeSpread = useMemo(() => binderViewForPage(currentPage, pages.length), [currentPage, pages.length]);
  const activeSpreadIndex = spreadGroups.findIndex((group) => group.includes(currentPage));
  const visible = useMemo(() => visibleAssignments(pages, dims), [pages, dims]);
  const hidden = useMemo(() => hiddenAssignments(pages, dims), [pages, dims]);
  const placedIds = useMemo(() => new Set(visible.map((assignment) => assignment.id)), [visible]);
  const visiblePool = useMemo(() => pool.filter((item) => !settings.hidePlaced || !placedIds.has(item.id)), [pool, settings.hidePlaced, placedIds]);
  const selectedOrdered = useMemo(() => pool.filter((item) => selectedCardIds.includes(item.id)).map((item) => item.id), [pool, selectedCardIds]);
  const selectedFetchedCards = useMemo(() => fetchedCards.filter((item) => selectedCardIds.includes(item.id)), [fetchedCards, selectedCardIds]);
  const customUploadedCards = useMemo(() => pool.filter((item) => item.source !== 'tcgdex'), [pool]);
  const customUploadedIds = useMemo(() => new Set(customUploadedCards.map((item) => item.id)), [customUploadedCards]);
  const allPoolIds = useMemo(() => new Set(pool.map((item) => item.id)), [pool]);
  const printPages = useMemo(() => {
    if (printScope === 'custom') return compactCustomPrintPages(pages, dims, customUploadedIds);
    return pages
      .map((page) => {
        const slots = Object.fromEntries(Object.entries(page.slots).filter(([, id]) => allPoolIds.has(id)));
        const crops = Object.fromEntries(Object.entries(page.crops || {}).filter(([key, crop]) => slots[key] === crop.img));
        return { ...page, slots, crops };
      })
      .filter((page) => !settings.skipEmptyPages || getSlots(page, dims).some((slot) => page.slots[slot.key]));
  }, [pages, settings.skipEmptyPages, dims, printScope, customUploadedIds, allPoolIds]);

  useEffect(() => { layoutIdRef.current = settings.layout; }, [settings.layout]);
  useEffect(() => { dimsRef.current = dims; }, [dims]);
  useEffect(() => { editingRef.current = editing; }, [editing]);
  useEffect(() => { selBoxRef.current = selBox; }, [selBox]);
  useEffect(() => { selectionPageIdRef.current = selectionPageId; }, [selectionPageId]);

  useEffect(() => {
    const timeline = timelineContainerRef.current;
    if (!timeline || !showBottomTimeline) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeGroup = timeline.querySelector('[data-active="true"]');
      if (!activeGroup) return;
      const trackBounds = timeline.getBoundingClientRect();
      const activeBounds = activeGroup.getBoundingClientRect();
      if (activeBounds.left < trackBounds.left || activeBounds.right > trackBounds.right) {
        activeGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentPage, activeSpreadIndex, showBottomTimeline]);

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

  const resetCatalogState = useCallback(() => {
    window.clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setCatalogPage(1);
    setHasMoreCards(true);
    setFetchedCards([]);
    setSearchError('');
    setIsLoading(false);
    setSelectedCardIds([]);
    setSelectionAnchorId(null);
  }, []);

  const updateSearchQuery = useCallback((value) => {
    resetCatalogState();
    setSearchQuery(value);
  }, [resetCatalogState]);

  const updateSelectedSet = useCallback((value) => {
    resetCatalogState();
    setSelectedSet(value);
  }, [resetCatalogState]);

  const clearCatalogFilters = useCallback(() => {
    resetCatalogState();
    setSearchQuery('');
    setSelectedSet('');
  }, [resetCatalogState]);

  const fetchCards = useCallback(async (rawQuery, setId, pageNumber) => {
    const query = String(rawQuery || '').trim();
    const activeSet = String(setId || '').trim();
    const nextPage = Math.max(1, Math.floor(Number(pageNumber) || 1));
    if (!query && !activeSet) {
      setFetchedCards([]);
      setHasMoreCards(false);
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
        hasNext = normalized.length === TCGDEX_RESULT_LIMIT && start + normalized.length < matching.length;
      } else {
        const endpoint = `${TCGDEX_SEARCH_ENDPOINT}${encodeURIComponent(query)}&pagination:page=${nextPage}&pagination:itemsPerPage=${TCGDEX_RESULT_LIMIT}`;
        const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`TCGdex returned ${response.status}`);
        normalized = normalizeTcgdexCards(await response.json());
        hasNext = normalized.length === TCGDEX_RESULT_LIMIT;
      }
      if (searchAbortRef.current !== controller) return;
      setFetchedCards((currentCards) => nextPage === 1 ? normalized : [...currentCards, ...normalized]);
      setHasMoreCards(hasNext);
    } catch (error) {
      if (error?.name === 'AbortError' || searchAbortRef.current !== controller) return;
      if (nextPage === 1) setFetchedCards([]);
      setHasMoreCards(false);
      setSearchError('TCGdex search is unavailable right now. Check your connection and try again.');
    } finally {
      if (searchAbortRef.current === controller) setIsLoading(false);
    }
  }, []);

  const submitCardSearch = useCallback(() => {
    window.clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    setCatalogPage(1);
    setHasMoreCards(true);
    setFetchedCards([]);
    fetchCards(searchQuery, selectedSet, 1);
  }, [fetchCards, searchQuery, selectedSet]);

  const loadMoreCards = useCallback(() => {
    if (isLoading || !hasMoreCards || (!searchQuery.trim() && !selectedSet)) return;
    setCatalogPage((value) => value + 1);
  }, [hasMoreCards, isLoading, searchQuery, selectedSet]);

  useEffect(() => {
    window.clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    const query = searchQuery.trim();
    if (!query && !selectedSet) {
      setFetchedCards([]);
      setHasMoreCards(false);
      setSearchError('');
      setIsLoading(false);
      return undefined;
    }
    setHasMoreCards(true);
    setIsLoading(true);
    searchDebounceRef.current = window.setTimeout(() => fetchCards(query, selectedSet, 1), query ? 350 : 0);
    return () => window.clearTimeout(searchDebounceRef.current);
  }, [searchQuery, selectedSet, fetchCards]);

  useEffect(() => {
    if (catalogPage <= 1 || !hasMoreCards) return;
    const query = searchQuery.trim();
    if (!query && !selectedSet) return;
    fetchCards(query, selectedSet, catalogPage);
  }, [catalogPage, fetchCards, hasMoreCards, searchQuery, selectedSet]);

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
          const orphans = records.filter((record) => !present.has(record.id)).sort((a, b) => (a.added || 0) - (b.added || 0)).map((record) => ({ id: record.id, name: record.name || 'Card image', source: record.source === 'tcgdex' ? 'tcgdex' : 'upload' }));
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

  const addFiles = useCallback(async (fileList, options = {}) => {
    const files = Array.from(fileList || []).filter((file) => file.type?.startsWith('image/'));
    if (!files.length) {
      notify('Choose PNG, JPG, WEBP, GIF, or AVIF image files.', 'warn');
      return [];
    }
    const source = options.source === 'tcgdex' ? 'tcgdex' : 'upload';
    const added = Date.now();
    const entries = files.map((file, index) => ({ id: uid('image'), name: file.name || `Card ${pool.length + index + 1}`, file, source, added: added + index }));
    entries.forEach((entry) => sessionIdsRef.current.add(entry.id));
    if (storageMode === 'indexeddb') {
      try {
        await idbPutMany(entries.map((entry) => ({ id: entry.id, name: entry.name, type: entry.file.type, blob: entry.file, source: entry.source, added: entry.added })));
        const nextImages = {};
        entries.forEach((entry) => {
          const url = URL.createObjectURL(entry.file);
          objectUrlsRef.current.add(url);
          nextImages[entry.id] = url;
        });
        setImages((value) => ({ ...value, ...nextImages }));
        setPool((value) => [...value, ...entries.map(({ id, name, source: entrySource }) => ({ id, name, source: entrySource }))]);
        if (!persistedRef.current) {
          persistedRef.current = true;
          navigator.storage?.persist?.().catch(() => {});
        }
      } catch {
        setStorageMode('localstorage');
        try {
          const urls = await Promise.all(entries.map((entry) => readFileAsDataUrl(entry.file)));
          setImages((value) => ({ ...value, ...Object.fromEntries(entries.map((entry, index) => [entry.id, urls[index]])) }));
          setPool((value) => [...value, ...entries.map((entry, index) => ({ id: entry.id, name: entry.name, source: entry.source, src: urls[index] }))]);
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
        setPool((value) => [...value, ...entries.map((entry, index) => ({ id: entry.id, name: entry.name, source: entry.source, src: urls[index] }))]);
      } catch {
        notify('Could not read one or more images.', 'error');
        return [];
      }
    }
    if (!options.silent) notify(`${plural(entries.length, 'image')} added to MichiBinder.`, 'success');
    return entries.map((entry) => entry.id);
  }, [notify, pool.length, storageMode]);

  const importFetchedCard = useCallback(async (item, highResImageUrl, options = {}) => {
    const requestedSource = highResImageUrl || item.url || (item.image ? `${item.image}/high.jpg` : '/placeholder.png');
    const source = requestedSource === '/placeholder.png' || requestedSource.startsWith(`${TCGDEX_ASSET_CDN}/`) ? requestedSource : '/placeholder.png';
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Image download returned ${response.status}`);
      const blob = await response.blob();
      if (!blob.type?.startsWith('image/')) throw new Error('TCGdex returned a non-image asset');
      const file = new File([blob], `${safeFileName(item.name)} · ${safeFileName(item.id)}.jpg`, { type: blob.type || 'image/jpeg' });
      const ids = await addFiles([file], { source: 'tcgdex', silent: options.silent });
      if (ids.length) return ids;
    } catch {
      // Some privacy extensions block cross-origin blob downloads. The live CDN URL
      // still remains a valid, persistable source for the binder and print views.
    }
    const id = uid('tcgdex');
    sessionIdsRef.current.add(id);
    setImages((value) => ({ ...value, [id]: source }));
    setPool((value) => [...value, { id, name: item.name || 'Pokémon card', source: 'tcgdex', src: source }]);
    if (!options.silent) notify(`${item.name || 'Pokémon card'} added from TCGdex.`, 'success');
    return [id];
  }, [addFiles, notify]);

  const importFetchedCards = useCallback(async (cards) => {
    if (!cards?.length) return [];
    const imported = await Promise.all(cards.map((item) => importFetchedCard(item, item.url, { silent: true })));
    const ids = imported.flat();
    if (ids.length) notify(`${plural(ids.length, 'card')} added from TCGdex.`, 'success');
    return ids;
  }, [importFetchedCard, notify]);

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

  const updateSectionName = useCallback((pageId, sectionName) => {
    applyCanvasChange((allPages) => allPages.map((page) => (
      page.id === pageId ? { ...page, sectionName } : page
    )));
  }, [applyCanvasChange]);

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
    setSelectedCardIds([]);
    setSelectionAnchorId(null);
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

  const fillSelection = useCallback(async () => {
    const selectedCount = activeTab === 'cards' ? selectedFetchedCards.length : selectedOrdered.length;
    if (!selectedCount) return;
    const targets = planPlacement(pagesRef.current, currentPageRef.current, null, selectedCount, dimsRef.current);
    if (!targets.length) { notify(`Page ${currentPageRef.current + 1} is full.`, 'warn'); return; }
    const ids = activeTab === 'cards' ? await importFetchedCards(selectedFetchedCards) : selectedOrdered;
    placeCards(ids, currentPageRef.current, null);
  }, [activeTab, selectedFetchedCards, selectedOrdered, importFetchedCards, placeCards, notify]);

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
    const ids = selectedOrdered.includes(imageId) ? selectedOrdered : [imageId];
    if (!selectedOrdered.includes(imageId)) {
      setSelectedCardIds([imageId]);
      setSelectionAnchorId(imageId);
    }
    const cards = ids.map((id) => {
      const item = pool.find((candidate) => candidate.id === id);
      return {
        id,
        name: item?.name || 'Custom Art',
        image: images[id] || item?.src || '',
        isLocalUpload: item?.source !== 'tcgdex',
      };
    });
    const payload = { kind: 'pool', ids, cards, isLocalUpload: cards.every((cardItem) => cardItem.isLocalUpload) };
    dragRef.current = payload;
    try {
      event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
      event.dataTransfer.setData('text/plain', JSON.stringify({ cards }));
    } catch { /* live ref is authoritative */ }
    event.dataTransfer.effectAllowed = 'copy';
    makeDragGhost(event, ids);
    setDragInfo(payload);
  }, [commitEditing, selectedOrdered, pool, images, makeDragGhost]);

  const startFetchedCardDrag = useCallback((event, item) => {
    commitEditing();
    const batch = selectedCardIds.includes(item.id) ? selectedFetchedCards : [item];
    if (!selectedCardIds.includes(item.id)) {
      setSelectedCardIds([item.id]);
      setSelectionAnchorId(item.id);
    }
    const cards = batch.map((cardItem) => ({
      id: cardItem.id,
      name: cardItem.name,
      image: cardItem.image,
      url: cardItem.image ? `${cardItem.image}/high.jpg` : '/placeholder.png',
      isLocalUpload: false,
    }));
    const payload = { kind: 'remote-batch', cards, isLocalUpload: false };
    dragRef.current = payload;
    try {
      event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
      event.dataTransfer.setData('text/plain', JSON.stringify({ cards: cards.map(({ id, name, url, isLocalUpload }) => ({ id, name, image: url, isLocalUpload })) }));
      if (cards.length === 1) event.dataTransfer.setData('text/uri-list', cards[0].url);
    } catch { /* The live ref remains authoritative for in-app drops. */ }
    event.dataTransfer.effectAllowed = 'copy';
    makeDragGhost(event, cards.map((cardItem) => cardItem.id));
    setDragInfo(payload);
  }, [commitEditing, selectedCardIds, selectedFetchedCards, makeDragGhost]);

  const startSlotDrag = useCallback((event, pageId, key, imgId) => {
    commitEditing();
    const pageIndex = pagesRef.current.findIndex((page) => page.id === pageId);
    if (pageIndex >= 0) activateCanvasPage(pageIndex);
    const payload = { kind: 'slot', pageId, key, imgId };
    dragRef.current = payload;
    try { event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload)); } catch { /* live ref is authoritative */ }
    event.dataTransfer.effectAllowed = 'move';
    makeDragGhost(event, [imgId]);
    setDragInfo(payload);
  }, [commitEditing, activateCanvasPage, makeDragGhost]);

  const clearNativeDropTargets = useCallback(() => {
    stageRef.current?.querySelectorAll('[data-drop-active]').forEach((element) => {
      element.removeAttribute('data-drop-active');
      element.removeAttribute('data-drop-order');
    });
  }, []);

  const markNativeDropTargets = useCallback((targets) => {
    const stage = stageRef.current;
    if (!stage) return;
    const targetKeys = new Set(targets.map((target) => `${target.pageIndex}:${target.key}`));
    stage.querySelectorAll('[data-drop-active]').forEach((element) => {
      const canvas = element.closest('[data-canvas]');
      const token = `${canvas?.dataset.pageIndex}:${element.dataset.key}`;
      if (!targetKeys.has(token)) {
        element.removeAttribute('data-drop-active');
        element.removeAttribute('data-drop-order');
      }
    });
    targets.forEach((target, index) => {
      const element = stage.querySelector(`[data-canvas][data-page-index="${target.pageIndex}"] [data-key="${target.key}"]`);
      if (!element) return;
      element.setAttribute('data-drop-active', '');
      element.setAttribute('data-drop-order', String(index + 1));
    });
  }, []);

  const resetDrag = useCallback((event) => {
    dragRef.current = null;
    clearNativeDropTargets();
    try { event?.dataTransfer?.clearData(); } catch { /* Some browsers lock the transfer store after drop. */ }
    setDragInfo(null);
    setSidebarDropActive(false);
  }, [clearNativeDropTargets]);

  const getPayload = useCallback((event) => {
    if (dragRef.current) return dragRef.current;
    try {
      const raw = event.dataTransfer.getData(DRAG_MIME);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const handleSlotDragOver = useCallback((event, slot, pageIndex = currentPageRef.current) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = dragRef.current;
    if (combineMode || editingRef.current || (!payload && !hasFiles(event.dataTransfer))) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.dataTransfer.dropEffect = payload?.kind === 'slot' ? 'move' : 'copy';
    const batchSize = payload?.kind === 'pool' ? payload.ids.length : payload?.kind === 'remote-batch' ? payload.cards.length : 1;
    const targets = ['pool', 'remote-batch'].includes(payload?.kind)
      ? planPlacement(pagesRef.current, pageIndex, slot.key, batchSize, dimsRef.current)
      : [{ pageIndex, key: slot.key }];
    markNativeDropTargets(targets);
  }, [combineMode, markNativeDropTargets]);

  const handleSlotDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleSlotDrop = useCallback(async (event, slot, pageIndex = currentPageRef.current) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getPayload(event);
    const carriesFiles = hasFiles(event.dataTransfer);
    const files = Array.from(event.dataTransfer.files || []);
    resetDrag(event);
    if (combineMode || editingRef.current) return;
    activateCanvasPage(pageIndex);
    if (carriesFiles) {
      const ids = await addFiles(files);
      placeCards(ids, pageIndex, slot.key);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, pageIndex, slot.key);
    else if (payload?.kind === 'remote-batch') {
      const ids = await importFetchedCards(payload.cards);
      placeCards(ids, pageIndex, slot.key);
    } else if (payload?.kind === 'remote') {
      const ids = await importFetchedCard(payload.card, payload.url);
      placeCards(ids, pageIndex, slot.key);
    } else if (payload?.kind === 'slot') moveSlotCard(payload, pageIndex, slot.key);
  }, [combineMode, getPayload, activateCanvasPage, addFiles, importFetchedCards, importFetchedCard, placeCards, moveSlotCard, resetDrag]);

  const handleStageDrop = useCallback(async (event) => {
    event.preventDefault();
    const payload = getPayload(event);
    const carriesFiles = hasFiles(event.dataTransfer);
    const files = Array.from(event.dataTransfer.files || []);
    resetDrag(event);
    if (combineMode || editingRef.current) return;
    if (carriesFiles) {
      const ids = await addFiles(files);
      placeCards(ids, currentPageRef.current, null);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, currentPageRef.current, null);
    else if (payload?.kind === 'remote-batch') {
      const ids = await importFetchedCards(payload.cards);
      placeCards(ids, currentPageRef.current, null);
    } else if (payload?.kind === 'remote') {
      const ids = await importFetchedCard(payload.card, payload.url);
      placeCards(ids, currentPageRef.current, null);
    }
  }, [combineMode, getPayload, addFiles, importFetchedCards, importFetchedCard, placeCards, resetDrag]);

  const handleSidebarDrop = useCallback(async (event) => {
    event.preventDefault();
    const payload = getPayload(event);
    const carriesFiles = hasFiles(event.dataTransfer);
    const files = Array.from(event.dataTransfer.files || []);
    resetDrag(event);
    if (carriesFiles) await addFiles(files);
    else if (payload?.kind === 'remote-batch') await importFetchedCards(payload.cards);
    else if (payload?.kind === 'remote') await importFetchedCard(payload.card, payload.url);
    else if (payload?.kind === 'slot') {
      removeSlotCard(payload.pageId, payload.key);
      notify('Card removed from the binder.', 'info');
    }
  }, [getPayload, addFiles, importFetchedCards, importFetchedCard, removeSlotCard, notify, resetDrag]);

  const handleThumbDrop = useCallback(async (event, pageIndex) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getPayload(event);
    const carriesFiles = hasFiles(event.dataTransfer);
    const files = Array.from(event.dataTransfer.files || []);
    resetDrag(event);
    if (carriesFiles) {
      const ids = await addFiles(files);
      placeCards(ids, pageIndex, null);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, pageIndex, null);
    else if (payload?.kind === 'remote-batch') {
      const ids = await importFetchedCards(payload.cards);
      placeCards(ids, pageIndex, null);
    } else if (payload?.kind === 'remote') {
      const ids = await importFetchedCard(payload.card, payload.url);
      placeCards(ids, pageIndex, null);
    } else if (payload?.kind === 'slot') moveSlotCard(payload, pageIndex, null);
  }, [getPayload, addFiles, importFetchedCards, importFetchedCard, placeCards, moveSlotCard, resetDrag]);

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
      if (event.type === 'dragend' || event.type === 'drop') resetDrag(event);
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
    setSelectedCardIds([]);
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
    if (!printPages.length || !printPages.some((page) => Object.keys(page.slots).length)) {
      notify(printScope === 'custom' ? 'No uploaded cards are placed in the current print scope.' : 'Add at least one card before printing.', 'warn');
      return;
    }
    setOpenPanel(null);
    window.setTimeout(() => window.print(), 50);
  }, [commitEditing, printPages, printScope, notify]);

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
    setSelectedCardIds([]);
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

  const onPoolClick = useCallback((event, itemId, sourceItems = visiblePool) => {
    const itemIndex = sourceItems.findIndex((item) => item.id === itemId);
    const item = sourceItems[itemIndex];
    if (!item) return;
    const toggle = event.ctrlKey || event.metaKey;
    const range = event.shiftKey && selectionAnchorId;
    if (range) {
      const anchorIndex = sourceItems.findIndex((entry) => entry.id === selectionAnchorId);
      const start = anchorIndex < 0 ? itemIndex : Math.min(anchorIndex, itemIndex);
      const end = anchorIndex < 0 ? itemIndex : Math.max(anchorIndex, itemIndex);
      const ids = sourceItems.slice(start, end + 1).map((entry) => entry.id);
      setSelectedCardIds((value) => toggle ? Array.from(new Set([...value, ...ids])) : ids);
    } else if (toggle) {
      setSelectedCardIds((value) => value.includes(item.id) ? value.filter((id) => id !== item.id) : [...value, item.id]);
      setSelectionAnchorId(item.id);
    } else {
      setSelectedCardIds([item.id]);
      setSelectionAnchorId(item.id);
    }
  }, [visiblePool, selectionAnchorId]);

  const selectAllVisible = useCallback((requestedIds) => {
    const defaultItems = activeTab === 'michi' ? pool.filter((item) => item.source !== 'tcgdex') : fetchedCards;
    const ids = Array.isArray(requestedIds) ? requestedIds : defaultItems.map((item) => item.id);
    setSelectedCardIds(ids);
    setSelectionAnchorId(ids[0] || null);
  }, [activeTab, pool, fetchedCards]);

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
        else if (selectedCardIds.length) { setSelectedCardIds([]); setSelectionAnchorId(null); }
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedCardIds.length) {
          event.preventDefault();
          if (activeTab === 'michi') deleteImages(selectedCardIds);
          else { setSelectedCardIds([]); setSelectionAnchorId(null); }
        }
        return;
      }
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); setCombineMode((state) => !state); return; }
      if (event.key === 'Enter' && canMerge) { event.preventDefault(); performMerge(selBox, selectionPageIndex); return; }
      if (event.key.toLowerCase() === 'u' && selectedMerges.length) { event.preventDefault(); unmergeBox(); return; }
      if (event.key.toLowerCase() === 'f' && selectedCardIds.length) { event.preventDefault(); fillSelection(); return; }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); goToAdjacentSpread(-1); return; }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); goToAdjacentSpread(1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [undoAction, redoAction, cancelEditing, commitEditing, selectAllVisible, openPanel, selBox, combineMode, selectedCardIds, activeTab, deleteImages, setCombineMode, canMerge, performMerge, selectionPageIndex, selectedMerges.length, unmergeBox, fillSelection, goToAdjacentSpread]);

  useEffect(() => {
    if (!openPanel) return undefined;
    const close = (event) => {
      if (!event.target.closest?.('[data-control-rail]')) setOpenPanel(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [openPanel]);

  const frameWIn = settings.view === 'paper' ? paper.wIn : gridW + SHEET_PAD.left + SHEET_PAD.right;
  const frameHIn = settings.view === 'paper' ? paper.hIn : gridH + SHEET_PAD.top + SHEET_PAD.bottom;
  const spineGap = 16;
  const pageAreaWidth = Math.max(160, (stageSize.w - spineGap) / 2);
  const ppi = Math.max(12, Math.min(pageAreaWidth / frameWIn, stageSize.h / frameHIn));
  const gridPpi = settings.view === 'paper' ? ppi * printFit : ppi;
  const frameWidth = frameWIn * ppi;
  const frameHeight = frameHIn * ppi;
  const spreadWidth = frameWidth * 2 + spineGap;
  const helperOffsetX = settings.view === 'binder' ? ((SHEET_PAD.left - SHEET_PAD.right) / 2) * ppi : 0;
  const dragBatchSize = dragInfo?.kind === 'pool' ? dragInfo.ids.length : dragInfo?.kind === 'remote-batch' ? dragInfo.cards.length : 0;
  const multiFlow = dragBatchSize > 1 ? Math.max(0, planPlacement(pages, currentPage, null, dragBatchSize, dims).filter((target) => target.pageIndex > currentPage).length) : 0;

  const renderEditorSlot = (page, pageIndex, slot, slotIndex) => {
    const imgId = page.slots[slot.key];
    const source = images[imgId] || pool.find((item) => item.id === imgId)?.src;
    const crop = imgId ? getCrop(page, slot.key, imgId) : { x: 50, y: 50 };
    const isEditing = editing?.pageId === page.id && editing.key === slot.key && editing.imgId === imgId;
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
            <Icon name="split" />
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
            <Icon name="x" />
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
            className={`group grid size-full cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-red-500 ${settings.view === 'binder' ? 'border-white/[0.05] bg-neutral-900/40 text-neutral-400 shadow-inner hover:border-white/[0.1] hover:bg-neutral-900/70 hover:text-neutral-200' : 'border-zinc-400 bg-white/30 text-zinc-700 hover:border-red-500 hover:text-red-800'}`}
            style={{ borderRadius: radius }}
          >
            {labelVisible && <span className="flex flex-col items-center gap-1.5"><span className="text-neutral-700 transition-colors group-hover:text-neutral-500"><Icon name="plus" strokeWidth={1.1} /></span><span className="text-[9px] font-mono font-medium tracking-widest text-neutral-600 uppercase transition-colors group-hover:text-neutral-400">{slot.cs * slot.rs > 1 ? `${boxDims(slot)} frame` : `Slot ${slotIndex + 1}`}</span></span>}
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
        className={`group group/slot relative size-full transition-transform duration-150 ease-out hover:z-30 hover:scale-[1.02] ${!combineMode && !editing ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
        <div className={`relative size-full overflow-hidden border bg-white transition-all duration-150 ${settings.view === 'binder' ? 'sleeve-sheen rounded-md border-white/[0.06] bg-neutral-900/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_18px_rgba(0,0,0,0.22),0_8px_22px_rgba(0,0,0,0.24)] hover:border-white/[0.12] hover:bg-neutral-900/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_30px_rgba(0,0,0,0.42)]' : 'border-transparent'} ${isEditing ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900' : ''}`} style={{ borderRadius: radius }}>
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
          /> : <span className="absolute inset-0 grid place-items-center bg-zinc-800 text-zinc-500"><Icon name="image" /></span>}
        </div>
        {slotActions}
        {!dragInfo && !combineMode && !editing && dpi && <span title={`${dpi} effective DPI at print size`} className={`absolute bottom-1.5 right-1.5 z-40 hidden rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow group-hover:block ${dpiTone}`}>{dpi} DPI</span>}
        {slot.mergeId && <span className="absolute bottom-1.5 left-1.5 z-40 rounded-full bg-red-700/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">{boxDims(slot)}</span>}
        {isEditing && <span className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-amber-950 shadow">Drag to reposition</span>}
      </div>
    );
  };

  const slotDropProps = (pageIndex) => (slot) => ({
    onDragOver: (event) => handleSlotDragOver(event, slot, pageIndex),
    onDragEnter: handleSlotDragEnter,
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget) && !stageRef.current?.contains(event.relatedTarget)) clearNativeDropTargets();
    },
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
        <div className={`grid aspect-[1/1.414] w-10 place-items-center overflow-hidden rounded-sm border bg-neutral-950 transition-colors ${currentLeaf ? 'border-white/25' : active ? 'border-neutral-700' : 'border-neutral-800 group-hover:border-neutral-600'}`}>
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
      <div key={group.join('-')} data-page-group={pageNumbers.join('-')} data-active={active ? 'true' : undefined} className={`relative flex shrink-0 flex-col items-center gap-1 text-[10px] font-medium whitespace-nowrap ${active ? 'text-red-400' : 'text-neutral-500'}`}>
        <div className={`flex items-center gap-0.5 p-1.5 ${active ? 'ring-2 ring-red-500 ring-offset-4 ring-offset-neutral-950 rounded-md scale-105 duration-200 transition-transform' : 'rounded-md duration-200 transition-transform'}`}>
          {group.map((pageIndex) => renderThumbnailLeaf(pages[pageIndex], pageIndex))}
        </div>
        <span>{label}</span>
      </div>
    );
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
            className="sheet-frame relative flex size-full items-start justify-start overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-neutral-800 to-neutral-800/90 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.9),0_1px_0px_rgba(255,255,255,0.05)_inset]"
            style={{ paddingTop: SHEET_PAD.top * ppi, paddingRight: (side === 'left' ? SHEET_PAD.left : SHEET_PAD.right) * ppi, paddingBottom: SHEET_PAD.bottom * ppi, paddingLeft: (side === 'left' ? SHEET_PAD.right : SHEET_PAD.left) * ppi }}
          >
            <PageSectionInput value={page.sectionName} pageNumber={pageIndex + 1} onCommit={(sectionName) => updateSectionName(page.id, sectionName)} style={{ left: (side === 'left' ? SHEET_PAD.right : SHEET_PAD.left) * ppi, top: Math.max(1, (SHEET_PAD.top * ppi - 20) / 2), width: gridW * gridPpi }} />
            {[0.17, 0.5, 0.83].map((position) => <span key={position} aria-hidden="true" className={`absolute size-3 -translate-y-1/2 rounded-full border border-black/80 bg-neutral-900 ring-1 ring-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.12)] ${side === 'left' ? 'translate-x-1/2' : '-translate-x-1/2'}`} style={{ [side === 'left' ? 'right' : 'left']: (SHEET_PAD.left * ppi) / 2, top: `${position * 100}%` }} />)}
            {renderEditorGrid(page, pageIndex)}
          </div>
        ) : (
          <div className="sheet-frame relative grid size-full place-items-center overflow-hidden bg-[#f4f4f5] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.6),0_1px_0px_rgba(255,255,255,0.7)_inset] ring-1 ring-black/20">
            <span aria-hidden="true" className="pointer-events-none absolute border border-dashed border-zinc-400" style={{ inset: PRINT_SAFE_MARGIN_IN * ppi }} />
            <PageSectionInput value={page.sectionName} pageNumber={pageIndex + 1} onCommit={(sectionName) => updateSectionName(page.id, sectionName)} style={{ left: '50%', top: Math.max(1, (frameHeight - gridH * gridPpi) / 2 - 22), width: gridW * gridPpi, transform: 'translateX(-50%)', color: 'rgba(24,24,27,0.55)' }} />
            {renderEditorGrid(page, pageIndex)}
          </div>
        )}
        {showHelper && pageIndex === currentPage && <CanvasHelper editing={editing} multiDrag={dragBatchSize} flowCount={multiFlow} offsetX={side === 'left' ? -helperOffsetX : helperOffsetX} onCenter={() => { const value = editingRef.current; if (value) { const next = { ...value, x: 50, y: 50 }; editingRef.current = next; setEditing(next); } }} onCancel={cancelEditing} onDone={commitEditing} />}
      </div>
    );
  };

  const renderCoverLayer = (side) => (
    <div
      key={`cover-${side}`}
      data-cover-layer={side}
      aria-hidden="true"
      className={`relative overflow-hidden border border-white/[0.04] bg-neutral-950 ${side === 'left' ? 'shadow-[inset_-18px_0_38px_rgba(0,0,0,0.9),0_26px_65px_-18px_rgba(0,0,0,0.85)] rounded-l-2xl' : 'shadow-[inset_18px_0_38px_rgba(0,0,0,0.9),0_26px_65px_-18px_rgba(0,0,0,0.85)] rounded-r-2xl'}`}
      style={{ width: frameWidth, height: frameHeight, gridColumn: side === 'left' ? 1 : 2, gridRow: 1 }}
    >
      <span className="absolute inset-0 opacity-70 bg-[repeating-linear-gradient(92deg,rgba(255,255,255,0.012)_0px,rgba(255,255,255,0.012)_1px,transparent_1px,transparent_4px)]" />
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_34%,rgba(0,0,0,0.28))]" />
      <span className={`absolute inset-y-0 w-10 ${side === 'left' ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/70 to-transparent`} />
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
        <AppBar
          isLeftSidebarOpen={isLeftSidebarOpen}
          setIsLeftSidebarOpen={setIsLeftSidebarOpen}
          saveStatus={saveStatus}
        />
        <div data-main-layout className="flex h-[calc(100vh-48px)] w-full overflow-hidden bg-neutral-950">
          <CardPool
            isOpen={isLeftSidebarOpen}
            customUploadedCards={customUploadedCards}
            selectedCardIds={selectedCardIds}
            placedIds={placedIds}
            images={images}
            inputRef={inputRef}
            onFiles={addFiles}
            onPoolClick={onPoolClick}
            onPoolDoubleClick={(id) => placeCards([id], currentPage, null)}
            onPoolDragStart={startPoolDrag}
            onDragEnd={resetDrag}
            onClearSelection={() => { setSelectedCardIds([]); setSelectionAnchorId(null); }}
            sidebarDropActive={sidebarDropActive}
            slotDropActive={sidebarDropActive && dragInfo?.kind === 'slot'}
            onDragOver={(event) => { if (dragRef.current || hasFiles(event.dataTransfer)) { event.preventDefault(); setSidebarDropActive(true); event.dataTransfer.dropEffect = dragRef.current?.kind === 'slot' ? 'move' : 'copy'; } }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSidebarDropActive(false); }}
            onDrop={handleSidebarDrop}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={updateSearchQuery}
            fetchedCards={fetchedCards}
            isLoading={isLoading}
            setsList={setsList}
            selectedSet={selectedSet}
            setSelectedSet={updateSelectedSet}
            hasMoreCards={hasMoreCards}
            searchError={searchError}
            onSearchSubmit={submitCardSearch}
            onClearFilters={clearCatalogFilters}
            onLoadMore={loadMoreCards}
            onFetchedCardDragStart={startFetchedCardDrag}
            onFetchedCardAdd={addFetchedCardToPage}
          />
          <main data-dynamic-workspace className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-neutral-950">
            <div data-preview-surface className="relative flex min-h-0 w-full flex-1 items-center overflow-hidden">
              <div
                ref={stageRef}
                className="relative flex h-full min-w-0 flex-1 items-center justify-center overflow-auto bg-neutral-950 bg-[radial-gradient(ellipse_at_center,rgba(82,82,91,0.18),transparent_65%)] p-6"
              onPointerMove={moveMarquee}
              onPointerDown={(event) => { if (event.target === event.currentTarget && combineMode) { setSelBox(null); setSelectionPageId(null); } }}
              onDragEnter={(event) => { if (!combineMode && (['pool', 'remote', 'remote-batch'].includes(dragRef.current?.kind) || hasFiles(event.dataTransfer))) event.preventDefault(); }}
              onDragOver={(event) => { if (!combineMode && (['pool', 'remote', 'remote-batch'].includes(dragRef.current?.kind) || hasFiles(event.dataTransfer))) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
              onDrop={handleStageDrop}
            >
              <div data-workspace-metrics aria-label={`Database ${fetchedCards.length} items, Custom ${customUploadedCards.length} uploaded, Density ${currentFilledCount} of ${layout.pockets} filled`} className="pointer-events-none absolute bottom-3 left-6 z-40 flex items-center gap-3 rounded-md border border-white/[0.06] bg-neutral-950/85 px-2.5 py-1.5 text-[10px] font-mono shadow-lg backdrop-blur-sm select-none">
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="font-bold tracking-widest text-neutral-500 uppercase">Database</span><strong className="text-xs font-semibold text-neutral-100">{fetchedCards.length} items</strong></span>
                <span aria-hidden="true" className="h-3 w-px bg-white/[0.08]" />
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="font-bold tracking-widest text-neutral-500 uppercase">Custom</span><strong className="text-xs font-semibold text-red-300">{customUploadedCards.length} uploaded</strong></span>
                <span aria-hidden="true" className="h-3 w-px bg-white/[0.08]" />
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="font-bold tracking-widest text-neutral-500 uppercase">Density</span><strong className="text-xs font-semibold text-neutral-100">{currentFilledCount}/{layout.pockets} filled</strong></span>
              </div>
              {settings.view === 'binder' && (
                <span
                  data-binder-bed
                  aria-hidden="true"
                  className="pointer-events-none absolute rounded-[2rem] border border-white/[0.03] bg-gradient-to-b from-neutral-900/35 to-black/20 shadow-[0_30px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.025)]"
                  style={{ width: spreadWidth + 48, height: frameHeight + 48 }}
                />
              )}
              <div data-workspace-frame className="relative [perspective:1200px]" style={{ width: spreadWidth, height: frameHeight }}>
                <div
                  data-spread
                  data-flip-active={pageFlip.animating ? '' : undefined}
                  className={`relative grid size-full grid-cols-2 gap-4 [transform-style:preserve-3d] ${pageFlip.animating ? 'pointer-events-none' : ''}`}
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
              <RightControlRail
                settings={settings}
                setSettings={setSettings}
                onChooseLayout={chooseLayout}
                onViewChange={(view) => { commitEditing(); setSettings((value) => ({ ...value, view })); }}
                printScope={printScope}
                setPrintScope={setPrintScope}
                onPrint={handlePrint}
                openPanel={openPanel}
                setOpenPanel={setOpenPanel}
                fitInfo={fitInfo}
                suggestedPaper={suggestedPaper}
                printCount={printPages.length}
                onReset={resetBinder}
                installPrompt={installPrompt}
                onInstall={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
              />
            </div>
            <FloatingNavigation
              showBottomTimeline={showBottomTimeline}
              onToggleTimeline={() => setShowBottomTimeline((value) => !value)}
              canUndo={pastRef.current.length > 0}
              canRedo={futureRef.current.length > 0}
              onUndo={undoAction}
              onRedo={redoAction}
              combineMode={combineMode}
              onToggleCombine={() => setCombineMode((value) => !value)}
              canMerge={canMerge}
              onMerge={() => performMerge(selBox, selectionPageIndex)}
              selectedMergeCount={selectedMerges.length}
              onUnmerge={() => unmergeBox()}
              canResetLayout={activeMerges(current, dims).length > 0}
              onResetLayout={() => resetLayout(currentPage)}
              canClearPage={currentFilledCount > 0}
              onClearPage={() => clearPage(currentPage)}
              currentSpread={activeSpreadIndex + 1}
              totalSpreads={spreadGroups.length}
              canPrevious={activeSpreadIndex > 0 && !pageFlip.animating}
              canNext={activeSpreadIndex < spreadGroups.length - 1 && !pageFlip.animating}
              onPrevious={() => goToAdjacentSpread(-1)}
              onNext={() => goToAdjacentSpread(1)}
              onAdd={addPage}
              onDuplicate={duplicatePage}
              onDelete={deletePage}
              canDelete={pages.length > 2}
            />
            <footer
              ref={timelineContainerRef}
              id="bottom-page-timeline"
              data-page-timeline
              aria-label="Page timeline"
              aria-hidden={!showBottomTimeline}
              inert={showBottomTimeline ? undefined : true}
              className={`no-print w-full bg-neutral-900/40 backdrop-blur-sm transition-all duration-300 ease-in-out shrink-0 relative flex justify-start items-center select-none scrollbar-none min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${showBottomTimeline ? 'h-28 border-t border-white/[0.04] overflow-x-auto overscroll-x-contain gap-4 p-4 opacity-100' : 'h-0 border-0 overflow-hidden gap-0 p-0 opacity-0 pointer-events-none'}`}
            >
              <div data-page-timeline-inner className="flex h-full min-w-max w-max items-center justify-start gap-4">
                {spreadGroups.map(renderThumbnailGroup)}
                <div className="flex shrink-0 flex-col items-center gap-1 text-[10px] font-medium whitespace-nowrap text-neutral-500">
                  <button type="button" onClick={addPage} aria-label="Add page" className="group shrink-0 rounded-md bg-transparent p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                    <span className="flex aspect-[1/1.414] w-10 items-center justify-center overflow-hidden rounded-sm border border-dashed border-neutral-700 text-neutral-500 transition-colors group-hover:border-neutral-500 group-hover:bg-neutral-900 group-hover:text-neutral-200"><Icon name="plus" /></span>
                  </button>
                  <span>Add page</span>
                </div>
              </div>
            </footer>
          </main>
        </div>
        <div className="no-print pointer-events-none fixed bottom-10 right-20 z-[100] flex w-[360px] flex-col items-end gap-2">
          {toasts.map((toast) => <div key={toast.id} role="status" className={`animate-toast pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-[12px] shadow-2xl shadow-black/40 ${toastTones[toast.tone] || toastTones.info}`}><span className="leading-relaxed">{toast.message}</span>{toast.action && <button type="button" onClick={() => { setToasts((value) => value.filter((item) => item.id !== toast.id)); toast.action.onClick(); }} className="shrink-0 rounded-md bg-white/10 px-2 py-1 font-semibold text-white hover:bg-white/20">{toast.action.label}</button>}<button type="button" title="Dismiss" aria-label="Dismiss notification" onClick={() => setToasts((value) => value.filter((item) => item.id !== toast.id))} className="grid size-6 shrink-0 place-items-center rounded-md text-current hover:bg-white/10"><Icon name="x" /></button></div>)}
        </div>
      </div>
      <div className="portrait-guard"><Icon name="rotate" className="text-red-400" /><h2 className="text-xl font-semibold text-white">Rotate to landscape</h2><p className="max-w-sm text-sm text-zinc-400">MichiBinder is designed as a desktop, landscape workspace.</p></div>
      {printTree}
    </>
  );
}
