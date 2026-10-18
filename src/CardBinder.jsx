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
const IDB_NAME = 'digital-card-binder';
const IDB_STORE = 'images';
const IDB_VERSION = 1;
const SHEET_PAD = { top: 0.3, right: 0.3, bottom: 0.3, left: 0.62 };
const THUMB_BOX = { w: 64, h: 84 };
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
const emptyPage = () => ({ id: uid('page'), merges: [], slots: {}, crops: {} });

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
  while (pages.length <= lastIndex) pages.push(emptyPage());
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
  return { id: String(value.id || uid('page')), merges, slots, crops };
}

function loadPersisted() {
  const fallback = { currentPage: 0, settings: sanitizeSettings(), pool: [], pages: [emptyPage()] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || Number(parsed.version) > SCHEMA_VERSION) return fallback;
    const pages = Array.isArray(parsed.pages) && parsed.pages.length ? parsed.pages.map(sanitizePage) : [emptyPage()];
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

function Icon({ name, size = 'md', className = '' }) {
  const Component = ICONS[name];
  if (!Component) {
    if (import.meta.env.DEV) console.warn(`Unknown icon: ${name}`);
    return null;
  }
  return <Component className={`${ICON_SIZES[size] || ICON_SIZES.md} shrink-0 ${className}`} strokeWidth={size === 'xl' || size === '2xl' ? 1.5 : 2} aria-hidden="true" />;
}

function ToolButton({ icon, label, onClick, disabled = false, disabledReason, active, variant = 'ghost', title, kbd, className = '', dense = false, type = 'button' }) {
  const variants = {
    ghost: active ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/40' : 'text-zinc-300 hover:bg-white/10 hover:text-white',
    primary: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400',
    danger: 'text-red-300 hover:bg-red-500/15 hover:text-red-200',
    outline: 'border border-white/15 bg-zinc-900 text-zinc-200 hover:border-white/25 hover:bg-zinc-800',
  };
  const button = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active === undefined ? undefined : active}
      aria-label={label || title || disabledReason}
      title={!disabled ? title : undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:pointer-events-none disabled:text-zinc-500 ${dense ? 'h-7 min-w-7 px-1.5 text-[12px]' : 'h-8 px-2.5 text-[13px]'} ${variants[variant]} ${className}`}
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

function SegmentedControl({ value, onChange, options, ariaLabel, dense = false }) {
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
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
    <div role="radiogroup" aria-label={ariaLabel} onKeyDown={onKeyDown} className="relative grid h-8 shrink-0 auto-cols-fr grid-flow-col rounded-full bg-zinc-800 p-0.5 ring-1 ring-inset ring-white/10">
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-indigo-500 shadow-sm transition-transform motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.25rem) / ${options.length})`, transform: `translateX(${currentIndex * 100}%)` }}
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
          className={`relative z-10 inline-flex min-w-0 items-center justify-center gap-1 rounded-full font-medium whitespace-nowrap text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${dense ? 'px-2.5 text-[11px]' : 'px-3 text-[12px]'} ${index === currentIndex ? 'text-white' : 'hover:text-white'}`}
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
        className="h-7 w-[6ch] rounded-lg border border-white/10 bg-zinc-950 px-1.5 text-right text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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

function SaveStatus({ status, storageMode }) {
  const config = status === 'error'
    ? { dot: 'bg-red-400', text: 'Save failed' }
    : status === 'saving'
      ? { dot: 'bg-amber-400', text: 'Saving…' }
      : { dot: 'bg-emerald-400', text: 'Saved locally' };
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-400" aria-live="polite">
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      <span>{config.text}</span>
      <span className="hidden min-[1500px]:inline">· {storageMode === 'indexeddb' ? 'IndexedDB' : 'browser storage'}</span>
    </div>
  );
}

function PopoverShell({ title, icon, children }) {
  return (
    <section className="absolute right-0 top-11 z-[80] w-80 rounded-xl border border-white/10 bg-zinc-900 p-4 text-left shadow-2xl shadow-black/60" onPointerDown={(event) => event.stopPropagation()}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Icon name={icon} />{title}</div>
      {children}
    </section>
  );
}

function AppBar({
  currentPage,
  pageCount,
  onPrevious,
  onNext,
  onAdd,
  onDuplicate,
  onDelete,
  canDelete,
  saveStatus,
  storageMode,
  installPrompt,
  onInstall,
  openPanel,
  setOpenPanel,
  onPrint,
  printSetup,
  shortcuts,
}) {
  return (
    <header className="titlebar no-print grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] border-b border-white/10 bg-zinc-950 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20"><Icon name="grid" size="lg" /></span>
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="shrink-0 text-[15px] font-semibold tracking-tight text-white">Digital Card Binder</h1>
          <SaveStatus status={saveStatus} storageMode={storageMode} />
        </div>
      </div>

      <nav aria-label="Pages" className="flex items-center gap-2">
        <div className="flex h-8 items-center rounded-full bg-zinc-900 p-0.5 ring-1 ring-inset ring-white/10">
          <button type="button" aria-label="Previous page" title="Previous page" onClick={onPrevious} disabled={currentPage === 0} className="grid size-7 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 disabled:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"><Icon name="chevronLeft" size="sm" /></button>
          <span className="min-w-[78px] px-2 text-center text-[12px] font-medium text-zinc-200">Page {currentPage + 1} / {pageCount}</span>
          <button type="button" aria-label="Next page" title="Next page" onClick={onNext} disabled={currentPage === pageCount - 1} className="grid size-7 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 disabled:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"><Icon name="chevronRight" size="sm" /></button>
        </div>
        <ToolButton icon="plus" label="Add Page" onClick={onAdd} />
        <ToolButton icon="copy" onClick={onDuplicate} title="Duplicate page" />
        <ToolButton icon="trash" label="Delete" variant="danger" onClick={onDelete} disabled={!canDelete} disabledReason="Keep at least one page" />
      </nav>

      <div className="relative flex items-center justify-end gap-2">
        {installPrompt && <ToolButton icon="install" label="Install App" onClick={onInstall} />}
        <ToolButton icon="keyboard" onClick={() => setOpenPanel(openPanel === 'shortcuts' ? null : 'shortcuts')} active={openPanel === 'shortcuts'} title="Keyboard shortcuts" className="hidden min-[1380px]:inline-flex" />
        <ToolButton icon="sliders" label="Print Setup" onClick={() => setOpenPanel(openPanel === 'print' ? null : 'print')} active={openPanel === 'print'} className="max-[1320px]:[&>span]:hidden" />
        <ToolButton icon="printer" label="Print / PDF" variant="primary" onClick={onPrint} />
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
          <select value={settings.paper} onChange={(event) => setSettings((value) => ({ ...value, paper: event.target.value }))} className="h-8 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
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
          <select value={settings.fit} onChange={(event) => setSettings((value) => ({ ...value, fit: event.target.value }))} className="h-8 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            <option value="cover">Fill (crop)</option>
            <option value="contain">Fit (letterbox)</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.skipEmptyPages} onChange={(event) => setSettings((value) => ({ ...value, skipEmptyPages: event.target.checked }))} className="accent-indigo-500" />Skip empty pages when printing</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.cutGuides} onChange={(event) => setSettings((value) => ({ ...value, cutGuides: event.target.checked }))} className="accent-indigo-500" />Print hairline cut guides</label>
        <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-2 text-[11px] leading-relaxed text-zinc-400">
          In the print dialog choose <strong className="text-zinc-200">Save as PDF</strong>, margins <strong className="text-zinc-200">None</strong>, scale <strong className="text-zinc-200">100%</strong>, and turn on <strong className="text-zinc-200">Background graphics</strong>.
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <span>{plural(printCount, 'page')} will print</span>
          <ToolButton icon="reset" label="Reset binder…" variant="danger" dense onClick={onReset} />
        </div>
      </div>
    </PopoverShell>
  );
}

function ShortcutsPopover() {
  const rows = [
    ['Ctrl/⌘ + A', 'Select visible cards'], ['Esc', 'Cancel or clear'], ['Delete', 'Delete selected cards'],
    ['M', 'Toggle Combine mode'], ['Enter', 'Merge / confirm'], ['U', 'Unmerge selection'],
    ['← / →', 'Previous / next page'], ['PageUp / PageDown', 'Previous / next page'], ['F', 'Fill page'],
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
  const base = baseCardSizeMm(cleanSize);
  const resolved = resolveCardSize(cleanSize);
  const custom = cleanSize.preset === 'custom';
  const setCardSize = (patch) => setSettings((value) => ({ ...value, cardSize: sanitizeCardSize({ ...value.cardSize, ...patch }) }));
  return (
    <div role="toolbar" aria-label="Card sizing" className="no-print flex shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-white/10 bg-neutral-900/50 px-4 py-2">
      <div className={`flex shrink-0 items-center ${custom ? 'gap-3 min-[1600px]:gap-4' : 'gap-3 min-[1600px]:gap-4'}`}>
        <div className="flex shrink-0 items-center gap-2">
          <Icon name="ruler" className="text-indigo-300" />
          <span className={`${custom ? 'hidden min-[1600px]:inline' : 'hidden xl:inline'} shrink-0 text-[12px] font-medium text-zinc-300`}>Card size</span>
          <select
            value={custom ? 'custom' : cleanSize.preset}
            aria-label="Card size"
            onChange={(event) => {
              if (event.target.value === 'custom') setCardSize({ preset: 'custom', customWmm: base.w, customHmm: base.h });
              else setCardSize({ preset: event.target.value });
            }}
            className="h-8 w-auto min-w-fit shrink-0 rounded-lg border border-white/10 bg-zinc-900 px-2 text-[12px] text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {CARD_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label} · {preset.hint}</option>)}
            <option value="custom">Custom…</option>
          </select>
          {custom && <div className="flex shrink-0 items-center gap-1"><MmField label="W" value={cleanSize.customWmm} onCommit={(customWmm) => setCardSize({ customWmm })} /><span className="text-zinc-500">×</span><MmField label="H" value={cleanSize.customHmm} onCommit={(customHmm) => setCardSize({ customHmm })} /><span className="text-[11px] text-zinc-400">mm</span></div>}
        </div>
        <ToolbarDivider />
        <div className="flex shrink-0 items-center gap-2">
          <span className={`${custom ? 'hidden min-[1600px]:inline' : ''} shrink-0 text-[12px] font-medium text-zinc-300`}>Scale</span>
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
            className={`${custom ? 'w-24 min-[1600px]:w-28' : 'w-28'} shrink-0 accent-indigo-500`}
          />
          <datalist id="scale-ticks"><option value="100" /></datalist>
          <strong className="w-[5ch] shrink-0 text-right text-[12px] text-white">{Math.round(cleanSize.scale * 100)}%</strong>
          {cleanSize.scale !== 1 && <button type="button" title="Reset scale" aria-label="Reset scale" onClick={() => setCardSize({ scale: 1 })} className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"><Icon name="reset" size="sm" /></button>}
          <span className={`${custom ? 'hidden min-[1700px]:inline' : 'hidden min-[1440px]:inline'} shrink-0 text-[11px] text-zinc-500`}>{fmtMm(resolved.w)} × {fmtMm(resolved.h)} mm</span>
        </div>
        <ToolbarDivider />
        <div className="flex shrink-0 items-center gap-2">
          <span className={`${custom ? 'hidden min-[1600px]:inline' : ''} shrink-0 text-[12px] font-medium text-zinc-300`}>Grid</span>
          <SegmentedControl
            ariaLabel="Pocket layout"
            value={settings.layout}
            onChange={onChooseLayout}
            dense={custom}
            options={GRID_LAYOUTS.map((layout) => ({ value: layout.id, label: String(layout.pockets), icon: layout.icon, ariaLabel: `${layout.label} (${layout.hint})`, title: `${layout.label} (${layout.hint})` }))}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden shrink-0 text-[12px] font-medium text-zinc-300 min-[1380px]:inline">Preview</span>
        <SegmentedControl ariaLabel="Preview" value={settings.view} onChange={onViewChange} options={[{ value: 'binder', label: 'Binder' }, { value: 'paper', label: 'Paper' }]} dense={custom} />
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
      className={`group flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-500/80 bg-zinc-800/40 transition-colors hover:border-indigo-400 hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${empty ? 'min-h-36 flex-col gap-3 p-5 text-center' : 'gap-3 p-3'} ${active ? 'border-indigo-400 bg-indigo-500/10' : ''}`}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
      <span className={`${empty ? 'size-11' : 'size-8'} grid shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300`}><Icon name="upload" size={empty ? 'lg' : 'md'} /></span>
      <span>
        <span className="block text-[13px] font-semibold text-white">{empty ? 'Drop card images here' : 'Add more cards'}</span>
        {empty && <span className="mt-1 block text-[11px] leading-relaxed text-zinc-300">or click to browse · PNG, JPG, WEBP, AVIF · multiple files</span>}
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
      className={`group relative aspect-[5/7] min-w-0 overflow-hidden rounded-lg bg-zinc-900 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 ${selected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-950' : 'ring-1 ring-inset ring-white/10 hover:ring-white/30'} ${selected ? 'bg-indigo-500/15' : ''}`}
    >
      {src ? <img src={src} alt="" className={`absolute inset-0 size-full object-cover transition-[filter,opacity] ${placed ? 'grayscale opacity-35 group-hover:opacity-60' : ''} ${selected ? '!opacity-100' : ''}`} /> : <span className="absolute inset-0 grid place-items-center text-zinc-600"><Icon name="image" size="xl" /></span>}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white"><span className="block overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</span></span>
      {selected && <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow">{selectionIndex + 1}</span>}
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
}) {
  return (
    <aside
      className={`no-print relative flex w-[340px] shrink-0 flex-col border-r border-white/10 bg-zinc-950 ${sidebarDropActive ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}
    >
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div><h2 className="text-sm font-semibold text-white">Card Pool</h2><p className="mt-0.5 text-[11px] text-zinc-400">{plural(pool.length, 'card')} · {selected.length} selected</p></div>
        <ToolButton icon={settings.hidePlaced ? 'eyeOff' : 'eye'} label="Unplaced only" active={settings.hidePlaced} dense onClick={() => setSettings((value) => ({ ...value, hidePlaced: !value.hidePlaced }))} />
      </div>
      <div className="px-4 pb-3"><UploadZone empty={!pool.length} active={sidebarDropActive && !slotDropActive} inputRef={inputRef} onFiles={onFiles} /></div>
      {pool.length > 0 && (
        <div role="toolbar" aria-label="Pool actions" className="grid grid-cols-4 gap-1 px-4 pb-3">
          <ToolButton icon="selectAll" label="All" dense onClick={onSelectAll} disabled={!visiblePool.length} disabledReason="No visible cards" className="w-full px-1" />
          <ToolButton icon="x" label="None" dense onClick={onClearSelection} disabled={!selected.length} disabledReason="No cards selected" className="w-full px-1" />
          <ToolButton icon="wand" label="Fill" dense onClick={onFill} disabled={!selected.length} disabledReason="Select cards to fill the page" className="w-full px-1" />
          <ToolButton icon="trash" label="Delete" dense variant="danger" onClick={onDeleteSelected} disabled={!selected.length} disabledReason="Select cards to delete" className="w-full px-1" />
        </div>
      )}
      <div role="listbox" aria-multiselectable="true" className="scroll-area grid flex-1 auto-rows-max grid-cols-3 content-start gap-2 px-4 pb-4" onClick={(event) => { if (event.target === event.currentTarget) onClearSelection(); }}>
        {visiblePool.map((item, visibleIndex) => <PoolCard key={item.id} item={item} index={visibleIndex} selectionIndex={selected.indexOf(item.id)} placed={placedIds.has(item.id)} src={images[item.id] || item.src} onClick={onPoolClick} onDoubleClick={onPoolDoubleClick} onDragStart={onPoolDragStart} onDragEnd={onDragEnd} />)}
        {!pool.length && <div className="col-span-3 mt-4 text-center text-[11px] leading-relaxed text-zinc-500">Images stay on this device and save automatically.</div>}
        {pool.length > 0 && !visiblePool.length && <div className="col-span-3 mt-8 text-center text-[12px] text-zinc-500">Every card is placed. Turn off “Unplaced only” to see them.</div>}
      </div>
      {slotDropActive && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-red-950/80 p-6 text-center text-sm font-semibold text-red-100 backdrop-blur-sm"><span className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3"><Icon name="trash" />Drop to remove from binder</span></div>}
    </aside>
  );
}

function CanvasToolbar({ combineMode, setCombineMode, selBox, canMerge, mergeLabel, onMerge, selectedMergeCount, onUnmerge, onResetLayout, onClearPage, filled, total, mergedCount, layout }) {
  return (
    <div role="toolbar" aria-label="Grid tools" className="@container absolute inset-x-0 bottom-full z-40 mb-3 flex h-10 items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 px-1.5 shadow-xl shadow-black/30 backdrop-blur">
      <div className="flex shrink-0 items-center">
        <ToolButton icon="combine" dense active={combineMode} onClick={() => setCombineMode((value) => !value)} title="Combine Slots (M)" className="@[21rem]:hidden">
        </ToolButton>
        <button type="button" aria-pressed={combineMode} onClick={() => setCombineMode((value) => !value)} title="Combine Slots (M)" className="hidden h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium text-zinc-300 hover:bg-white/10 @[21rem]:inline-flex @[32.25rem]:hidden"><Icon name="combine" size="sm" /><span className="hidden @[24.25rem]:inline">Combine</span></button>
        <button type="button" aria-pressed={combineMode} onClick={() => setCombineMode((value) => !value)} title="Combine Slots (M)" className={`hidden h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium @[32.25rem]:inline-flex ${combineMode ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/40' : 'text-zinc-300 hover:bg-white/10'}`}><Icon name="combine" size="sm" /><span>Combine Slots</span><Kbd>M</Kbd></button>
        <ToolbarDivider slim />
        <ToolButton icon="merge" label={canMerge ? mergeLabel : 'Merge'} dense variant={canMerge ? 'primary' : 'ghost'} onClick={onMerge} disabled={!canMerge} disabledReason={!combineMode ? 'Turn on Combine mode and drag across slots' : selBox ? 'Select more than one slot' : 'Drag across two or more slots'} className="[&>span]:hidden @[18rem]:[&>span]:inline" />
        <ToolButton icon="split" label={selectedMergeCount > 1 ? `Unmerge ${selectedMergeCount}` : 'Unmerge'} dense onClick={onUnmerge} disabled={!selectedMergeCount} disabledReason="Select a merged frame to unmerge" className="[&>span]:hidden @[18rem]:[&>span]:inline" />
      </div>
      <div className="flex shrink-0 items-center">
        <ToolButton icon={layout.icon} dense title={`Reset ${layout.label} layout`} onClick={onResetLayout} disabled={!mergedCount} disabledReason="No merged frames to reset" />
        <ToolButton icon="eraser" dense variant="danger" title="Clear page" onClick={onClearPage} disabled={!filled} disabledReason="Page is already empty" />
        <ToolbarDivider slim />
        <span title={`${filled} of ${total} slots filled · ${plural(mergedCount, 'merged frame')}`} className="hidden h-6 shrink-0 items-center rounded-full bg-zinc-800 px-2 text-[10px] font-medium text-zinc-300 @[21rem]:inline-flex">{filled}/{total}<span className="hidden @[32.25rem]:inline">&nbsp;filled</span></span>
      </div>
    </div>
  );
}

function CanvasHelper({ editing, multiDrag, flowCount, combineMode, settings, paper, card, printFit, offsetX, onCenter, onCancel, onDone }) {
  let tone = 'border-white/10 bg-zinc-900 text-zinc-200';
  let content;
  if (editing) {
    tone = 'border-amber-400/30 bg-amber-950/90 text-amber-100';
    content = <><Icon name="move" size="sm" /><span>Reposition image — drag inside the slot · arrows nudge · click outside to confirm</span><ToolButton label="Center" dense onClick={onCenter} /><ToolButton label="Cancel" dense onClick={onCancel} /><ToolButton label="Done" dense variant="primary" onClick={onDone} /></>;
  } else if (multiDrag > 1) {
    tone = 'border-emerald-400/30 bg-emerald-950/90 text-emerald-100';
    content = <><Icon name="wand" size="sm" /><span>Dropping {plural(multiDrag, 'card')} into the first empty slots{flowCount ? ` · ${flowCount} will flow to the next page(s)` : ''}</span></>;
  } else if (combineMode) {
    tone = 'border-violet-400/30 bg-violet-950/90 text-violet-100';
    content = <><Icon name="combine" size="sm" /><span>Combine mode · drag across slots, then Enter to merge · click a frame, then U to unmerge · Esc to exit</span></>;
  } else {
    content = <>{settings.view === 'paper' && <span>{paper.short} · prints at {fmtPct(printFit)} · {fmtMm(card.w)} × {fmtMm(card.h)} mm ·</span>}<Kbd>Ctrl/⌘</Kbd><span>+ Click toggle ·</span><Kbd>Shift</Kbd><span>+ Click range · Drag the selection onto the binder</span></>;
  }
  return <div data-reposition-ui={editing ? '' : undefined} className={`absolute top-full z-30 mt-4 flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 text-[11px] whitespace-nowrap shadow-xl shadow-black/20 ${tone}`} style={{ left: `calc(50% + ${offsetX}px)` }}>{content}</div>;
}

export default function CardBinder() {
  const boot = useMemo(loadPersisted, []);
  const [pages, setPages] = useState(boot.pages);
  const [currentPage, setCurrentPage] = useState(boot.currentPage);
  const [pool, setPool] = useState(boot.pool);
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
  const marqueeRef = useRef(null);
  const suppressClickRef = useRef(false);
  const slotActionGuardRef = useRef(0);
  const editingRef = useRef(null);
  const panRef = useRef(null);
  const dimensionsRef = useRef(null);
  const sessionIdsRef = useRef(new Set());
  const objectUrlsRef = useRef(new Set());
  const persistedRef = useRef(false);
  const pagesRef = useRef(pages);
  const currentPageRef = useRef(currentPage);

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
  const visible = useMemo(() => visibleAssignments(pages, dims), [pages, dims]);
  const hidden = useMemo(() => hiddenAssignments(pages, dims), [pages, dims]);
  const placedIds = useMemo(() => new Set(visible.map((assignment) => assignment.id)), [visible]);
  const visiblePool = useMemo(() => pool.filter((item) => !settings.hidePlaced || !placedIds.has(item.id)), [pool, settings.hidePlaced, placedIds]);
  const selectedOrdered = useMemo(() => pool.filter((item) => selected.includes(item.id)).map((item) => item.id), [pool, selected]);
  const printPages = useMemo(() => pages.filter((page) => !settings.skipEmptyPages || getSlots(page, dims).some((slot) => page.slots[slot.key])), [pages, settings.skipEmptyPages, dims]);

  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { dimsRef.current = dims; }, [dims]);
  useEffect(() => { editingRef.current = editing; }, [editing]);

  const notify = useCallback((message, tone = 'info', action = null) => {
    const id = uid('toast');
    setToasts((items) => [...items.slice(-3), { id, message, tone, action }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), action ? 6500 : 3400);
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
          setPages((currentPages) => pruneMissingImages(currentPages, valid));
          return reconciled;
        });
        setStorageMode('indexeddb');
      } catch {
        if (cancelled) return;
        setStorageMode('localstorage');
        const valid = new Set(boot.pool.filter((item) => item.src).map((item) => item.id));
        setPool((value) => value.filter((item) => item.src || sessionIdsRef.current.has(item.id)));
        setPages((value) => pruneMissingImages(value, valid));
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
      if (width > 0 && height > 0) setStageSize({ w: width, h: height });
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

  useEffect(() => {
    if (!('launchQueue' in window)) return undefined;
    let live = true;
    window.launchQueue.setConsumer(async (params) => {
      const files = await Promise.all((params.files || []).map((handle) => handle.getFile()));
      if (live) addFiles(files);
    });
    return () => { live = false; };
  }, [addFiles]);

  const commitEditing = useCallback(() => {
    const value = editingRef.current;
    if (!value) return;
    setPages((allPages) => allPages.map((page) => {
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
  }, []);

  const cancelEditing = useCallback(() => {
    setEditing(null);
    editingRef.current = null;
  }, []);

  const setCombineMode = useCallback((next) => {
    commitEditing();
    setCombineModeState((value) => {
      const resolved = typeof next === 'function' ? next(value) : next;
      if (!resolved) setSelBox(null);
      return resolved;
    });
  }, [commitEditing]);

  const switchPage = useCallback((index) => {
    commitEditing();
    setCurrentPage((value) => clamp(typeof index === 'function' ? index(value) : index, 0, pagesRef.current.length - 1));
    setSelBox(null);
  }, [commitEditing]);

  const placeCards = useCallback((ids, pageIndex = currentPageRef.current, startKey = null) => {
    if (!ids?.length) return;
    commitEditing();
    let result;
    setPages((value) => {
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
  }, [commitEditing, notify]);

  const fillSelection = useCallback(() => {
    const ids = selectedOrdered;
    if (!ids.length) return;
    const targets = planPlacement(pagesRef.current, currentPageRef.current, null, ids.length, dimsRef.current);
    if (!targets.length) { notify(`Page ${currentPageRef.current + 1} is full.`, 'warn'); return; }
    placeCards(ids, currentPageRef.current, null);
  }, [selectedOrdered, placeCards, notify]);

  const removeSlotCard = useCallback((pageId, key) => {
    commitEditing();
    setPages((value) => value.map((page) => {
      if (page.id !== pageId) return page;
      const slots = { ...page.slots };
      const crops = { ...page.crops };
      delete slots[key];
      delete crops[key];
      return { ...page, slots, crops };
    }));
  }, [commitEditing]);

  const moveSlotCard = useCallback((payload, targetPageIndex, targetKey = null) => {
    commitEditing();
    setPages((value) => {
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
  }, [commitEditing, notify]);

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
        context.fillStyle = '#6366f1';
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

  const startSlotDrag = useCallback((event, pageId, key, imgId) => {
    commitEditing();
    const payload = { kind: 'slot', pageId, key, imgId };
    dragRef.current = payload;
    try { event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload)); } catch { /* live ref is authoritative */ }
    event.dataTransfer.effectAllowed = 'move';
    makeDragGhost(event, [imgId]);
    requestAnimationFrame(() => setDragInfo(payload));
  }, [commitEditing, makeDragGhost]);

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

  const handleSlotDragOver = useCallback((event, slot) => {
    if (combineMode || editingRef.current) return;
    const payload = dragRef.current;
    if (!payload && !hasFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = payload?.kind === 'slot' ? 'move' : 'copy';
    if (payload?.kind === 'pool') setDropPreview(planPlacement(pagesRef.current, currentPageRef.current, slot.key, payload.ids.length, dimsRef.current));
    else setDropPreview([{ pageIndex: currentPageRef.current, key: slot.key }]);
  }, [combineMode]);

  const handleSlotDrop = useCallback(async (event, slot) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) {
      const ids = await addFiles(event.dataTransfer.files);
      placeCards(ids, currentPageRef.current, slot.key);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, currentPageRef.current, slot.key);
    else if (payload?.kind === 'slot') moveSlotCard(payload, currentPageRef.current, slot.key);
    resetDrag();
  }, [getPayload, addFiles, placeCards, moveSlotCard, resetDrag]);

  const handleStageDrop = useCallback(async (event) => {
    if (combineMode || editingRef.current) return;
    event.preventDefault();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) {
      const ids = await addFiles(event.dataTransfer.files);
      placeCards(ids, currentPageRef.current, null);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, currentPageRef.current, null);
    resetDrag();
  }, [combineMode, getPayload, addFiles, placeCards, resetDrag]);

  const handleSidebarDrop = useCallback(async (event) => {
    event.preventDefault();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) await addFiles(event.dataTransfer.files);
    else if (payload?.kind === 'slot') {
      removeSlotCard(payload.pageId, payload.key);
      notify('Card removed from the binder.', 'info');
    }
    resetDrag();
  }, [getPayload, addFiles, removeSlotCard, notify, resetDrag]);

  const handleThumbDrop = useCallback(async (event, pageIndex) => {
    event.preventDefault();
    event.stopPropagation();
    const payload = getPayload(event);
    if (hasFiles(event.dataTransfer)) {
      const ids = await addFiles(event.dataTransfer.files);
      placeCards(ids, pageIndex, null);
    } else if (payload?.kind === 'pool') placeCards(payload.ids, pageIndex, null);
    else if (payload?.kind === 'slot') moveSlotCard(payload, pageIndex, null);
    resetDrag();
  }, [getPayload, addFiles, placeCards, moveSlotCard, resetDrag]);

  const performMerge = useCallback((box) => {
    if (!box || box.rs * box.cs <= 1) return;
    const pageId = pagesRef.current[currentPageRef.current]?.id;
    if (!pageId) return;
    let snapshot;
    let unassigned = 0;
    setPages((value) => value.map((page) => {
      if (page.id !== pageId) return page;
      snapshot = { merges: page.merges, slots: page.slots, crops: page.crops };
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
      onClick: () => {
        setPages((value) => value.map((page) => page.id === pageId ? { ...page, ...snapshot } : page));
        setSelBox(null);
      },
    });
  }, [notify]);

  const selectedMerges = useMemo(() => selBox ? activeMerges(current, dims).filter((merge) => boxesIntersect(merge, selBox)) : [], [selBox, current, dims]);
  const exactMerge = useMemo(() => activeMerges(current, dims).some((merge) => sameBox(merge, selBox)), [current, dims, selBox]);
  const canMerge = Boolean(combineMode && selBox && selBox.rs * selBox.cs > 1 && !exactMerge);

  const unmergeById = useCallback((mergeId) => {
    const page = pagesRef.current[currentPageRef.current];
    const merge = activeMerges(page, dimsRef.current).find((item) => item.id === mergeId);
    if (!merge) return;
    const pageId = page.id;
    const mergeIndex = page.merges.findIndex((item) => item.id === mergeId);
    const snapshot = { ...merge };

    setPages((value) => value.map((item) => (
      item.id === pageId
        ? { ...item, merges: item.merges.filter((candidate) => candidate.id !== mergeId) }
        : item
    )));
    setSelBox((value) => value && boxesIntersect(value, snapshot) ? null : value);
    notify(`Split ${boxDims(snapshot)} frame into single slots.`, 'info', {
      label: 'Undo',
      onClick: () => {
        slotActionGuardRef.current = 0;
        setPages((value) => value.map((item) => {
          if (item.id !== pageId || item.merges.some((candidate) => candidate.id === snapshot.id)) return item;
          const merges = [...item.merges];
          merges.splice(clamp(mergeIndex, 0, merges.length), 0, snapshot);
          return { ...item, merges };
        }));
      },
    });
  }, [notify]);

  const unmergeBox = useCallback((box = selBox) => {
    if (!box) return;
    let count = 0;
    const pageId = pagesRef.current[currentPageRef.current]?.id;
    setPages((value) => value.map((page) => {
      if (page.id !== pageId) return page;
      const merges = page.merges.filter((merge) => {
        const hit = boxesIntersect(merge, box);
        if (hit) count += 1;
        return !hit;
      });
      return { ...page, merges };
    }));
    setSelBox(null);
    requestAnimationFrame(() => { if (count) notify(`${plural(count, 'frame')} split into slots.`, 'info'); });
  }, [selBox, notify]);

  const beginMarquee = useCallback((event, slot, isEmpty) => {
    if (event.button !== 0 || editingRef.current || dragRef.current || suppressClickRef.current || performance.now() < slotActionGuardRef.current) return;
    if (!combineMode && !isEmpty) return;
    const quick = !combineMode && isEmpty;
    marqueeRef.current = { start: slotBox(slot.r, slot.c), current: slotBox(slot.r, slot.c), box: slotBox(slot.r, slot.c), quick, moved: false, pointerId: event.pointerId };
    setMarqueeActive(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (combineMode) setSelBox(expandBox(slotBox(slot.r, slot.c), activeMerges(current, dims)));
  }, [combineMode, current, dims]);

  const moveMarquee = useCallback((event) => {
    const state = marqueeRef.current;
    if (!state) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-key][data-r][data-c]');
    if (!target || !stageRef.current?.contains(target)) return;
    const next = slotBox(Number(target.dataset.r), Number(target.dataset.c));
    const moved = next.r !== state.start.r || next.c !== state.start.c;
    state.current = next;
    state.moved = state.moved || moved;
    if (state.moved) {
      const expanded = expandBox(unionBox(state.start, next), activeMerges(pagesRef.current[currentPageRef.current], dimsRef.current));
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
      performMerge(state.box);
    } else if (state.quick) {
      setSelBox(null);
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
    setPool((value) => value.filter((item) => !set.has(item.id)));
    setPages((value) => pruneMissingImages(value, new Set(pool.filter((item) => !set.has(item.id)).map((item) => item.id))));
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
  }, [visible, pool, storageMode, notify]);

  const chooseLayout = useCallback((layoutId) => {
    if (layoutId === settings.layout) return;
    commitEditing();
    setSelBox(null);
    const nextLayout = getLayout(layoutId);
    const nextDims = { rows: nextLayout.rows, cols: nextLayout.cols };
    setSettings((value) => ({ ...value, layout: layoutId }));
    const hiddenNow = hiddenAssignments(pagesRef.current, nextDims);
    if (hiddenNow.length) {
      notify(`${nextLayout.label}: ${plural(hiddenNow.length, 'card')} hidden outside the grid — kept, not deleted.`, 'warn', {
        label: 'Reflow',
        onClick: () => {
          setPages((allPages) => {
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
  }, [settings.layout, commitEditing, notify]);

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
    setPages([emptyPage()]);
    setPool([]);
    setImages({});
    setSelected([]);
    setSettings(sanitizeSettings());
    setCurrentPage(0);
    setOpenPanel(null);
    notify('Binder reset.', 'info');
  }, [commitEditing, storageMode, notify]);

  const addPage = useCallback(() => {
    commitEditing();
    setPages((value) => { const next = [...value, emptyPage()]; window.setTimeout(() => setCurrentPage(next.length - 1), 0); return next; });
    setSelBox(null);
  }, [commitEditing]);

  const duplicatePage = useCallback(() => {
    commitEditing();
    setPages((value) => {
      const source = value[currentPageRef.current];
      const copy = { id: uid('page'), merges: source.merges.map((merge) => ({ ...merge, id: uid('merge') })), slots: { ...source.slots }, crops: Object.fromEntries(Object.entries(source.crops).map(([key, crop]) => [key, { ...crop }])) };
      const next = [...value.slice(0, currentPageRef.current + 1), copy, ...value.slice(currentPageRef.current + 1)];
      window.setTimeout(() => setCurrentPage(currentPageRef.current + 1), 0);
      return next;
    });
    notify('Page duplicated.', 'success');
  }, [commitEditing, notify]);

  const deletePage = useCallback(() => {
    if (pagesRef.current.length <= 1) return;
    if (Object.keys(pagesRef.current[currentPageRef.current].slots).length && !window.confirm(`Delete page ${currentPageRef.current + 1}? Cards remain in the pool.`)) return;
    commitEditing();
    setPages((value) => value.filter((_, index) => index !== currentPageRef.current));
    setCurrentPage((value) => Math.max(0, Math.min(value, pagesRef.current.length - 2)));
    setSelBox(null);
  }, [commitEditing]);

  const clearPage = useCallback(() => {
    const page = pagesRef.current[currentPageRef.current];
    if (!Object.keys(page.slots).length) return;
    if (!window.confirm(`Clear every card from page ${currentPageRef.current + 1}? Cards remain in the pool.`)) return;
    commitEditing();
    setPages((value) => value.map((item) => item.id === page.id ? { ...item, slots: {}, crops: {} } : item));
    notify('Page cleared. Cards remain in the pool.', 'info');
  }, [commitEditing, notify]);

  const resetLayout = useCallback(() => {
    const pageId = pagesRef.current[currentPageRef.current].id;
    setPages((value) => value.map((page) => page.id === pageId ? { ...page, merges: [] } : page));
    setSelBox(null);
    notify('Merged frames reset.', 'info');
  }, [notify]);

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
        if (marqueeRef.current) { marqueeRef.current = null; setMarqueeActive(false); setSelBox(null); }
        else if (openPanel) setOpenPanel(null);
        else if (selBox) setSelBox(null);
        else if (combineMode) setCombineMode(false);
        else if (selected.length) setSelected([]);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') { if (selected.length) { event.preventDefault(); deleteImages(selected); } return; }
      if (event.key.toLowerCase() === 'm') { event.preventDefault(); setCombineMode((state) => !state); return; }
      if (event.key === 'Enter' && canMerge) { event.preventDefault(); performMerge(selBox); return; }
      if (event.key.toLowerCase() === 'u' && selectedMerges.length) { event.preventDefault(); unmergeBox(); return; }
      if (event.key.toLowerCase() === 'f' && selected.length) { event.preventDefault(); fillSelection(); return; }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); switchPage((index) => index - 1); return; }
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); switchPage((index) => index + 1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [cancelEditing, commitEditing, selectAllVisible, openPanel, selBox, combineMode, selected, deleteImages, setCombineMode, canMerge, performMerge, selectedMerges.length, unmergeBox, fillSelection, switchPage]);

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
  const ppi = Math.max(12, Math.min((stageSize.w - 64) / frameWIn, (stageSize.h - 136) / frameHIn));
  const gridPpi = settings.view === 'paper' ? ppi * printFit : ppi;
  const frameWidth = frameWIn * ppi;
  const frameHeight = frameHIn * ppi;
  const gridWidthPx = gridW * gridPpi;
  const gridHeightPx = gridH * gridPpi;
  const helperOffsetX = settings.view === 'binder' ? ((SHEET_PAD.left - SHEET_PAD.right) / 2) * ppi : 0;
  const currentSlots = getSlots(current, dims);
  const filled = currentSlots.filter((slot) => current.slots[slot.key]).length;
  const currentMerges = activeMerges(current, dims);
  const multiFlow = dragInfo?.kind === 'pool' && dragInfo.ids.length > 1 ? Math.max(0, planPlacement(pages, currentPage, null, dragInfo.ids.length, dims).filter((target) => target.pageIndex > currentPage).length) : 0;

  const renderEditorSlot = (slot, slotIndex) => {
    const imgId = current.slots[slot.key];
    const source = images[imgId] || pool.find((item) => item.id === imgId)?.src;
    const crop = imgId ? getCrop(current, slot.key, imgId) : { x: 50, y: 50 };
    const isEditing = editing?.pageId === current.id && editing.key === slot.key && editing.imgId === imgId;
    const previewIndex = dropPreview.findIndex((target) => target.pageIndex === currentPage && target.key === slot.key);
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
            onClick={(event) => activateSlotAction(event, () => unmergeById(slot.mergeId))}
            onDoubleClick={stopSlotAction}
            className="grid size-6 place-items-center rounded-md bg-black/70 text-zinc-200 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-violet-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
            onClick={(event) => activateSlotAction(event, () => removeSlotCard(current.id, slot.key))}
            onDoubleClick={stopSlotAction}
            className="grid size-6 place-items-center rounded-md bg-black/70 text-zinc-200 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
            onPointerDown={(event) => beginMarquee(event, slot, true)}
            onClick={() => {
              if (suppressClickRef.current || performance.now() < slotActionGuardRef.current) return;
              if (combineMode) { setSelBox(expandBox(mergeBox(slot), currentMerges)); return; }
              if (selectedOrdered.length) placeCards(selectedOrdered, currentPage, slot.key);
            }}
            className={`group grid size-full place-items-center overflow-hidden border border-dashed outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 ${settings.view === 'binder' ? 'border-zinc-600/80 bg-zinc-950/45 text-zinc-300 shadow-[inset_0_0_18px_rgba(0,0,0,0.45)] hover:border-indigo-400 hover:bg-indigo-500/[0.07] hover:text-indigo-100' : 'border-zinc-400 bg-white/30 text-zinc-600 hover:border-indigo-500 hover:text-indigo-700'} ${previewIndex >= 0 ? '!border-emerald-400 !shadow-[inset_0_0_0_2px_rgb(52_211_153)]' : ''}`}
            style={{ borderRadius: radius }}
          >
            {labelVisible && <span className="flex flex-col items-center gap-1 text-[11px] font-semibold"><Icon name="plus" size="lg" /><span>{slot.cs * slot.rs > 1 ? `${boxDims(slot)} frame` : `Slot ${slotIndex + 1}`}</span></span>}
            {previewIndex >= 0 && <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-emerald-950">{previewIndex + 1}</span>}
          </button>
          {slotActions}
        </div>
      );
    }

    return (
      <div
        data-editing-slot={isEditing ? '' : undefined}
        draggable={!combineMode && !editing}
        onDragStart={(event) => startSlotDrag(event, current.id, slot.key, imgId)}
        onDragEnd={resetDrag}
        onPointerDown={(event) => isEditing ? beginPan(event) : beginMarquee(event, slot, false)}
        onPointerMove={isEditing ? movePan : undefined}
        onPointerUp={isEditing ? endPan : undefined}
        onPointerCancel={isEditing ? endPan : undefined}
        onDoubleClick={(event) => {
          if (performance.now() < slotActionGuardRef.current) { event.stopPropagation(); return; }
          startReposition(event, current, slot, imgId);
        }}
        onClick={() => {
          if (suppressClickRef.current || performance.now() < slotActionGuardRef.current) return;
          if (combineMode) setSelBox(expandBox(mergeBox(slot), currentMerges));
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
        <div className={`relative size-full overflow-hidden bg-white ${settings.view === 'binder' ? 'sleeve-sheen' : ''} ${isEditing ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-900' : ''} ${previewIndex >= 0 ? 'ring-2 ring-inset ring-emerald-400' : ''}`} style={{ borderRadius: radius }}>
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
        {slot.mergeId && <span className="absolute bottom-1.5 left-1.5 z-40 rounded-full bg-violet-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">{boxDims(slot)}</span>}
        {isEditing && <span className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-amber-950 shadow">Drag to reposition</span>}
        {previewIndex >= 0 && <span className="absolute left-1.5 top-1.5 z-50 grid size-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-emerald-950">{previewIndex + 1}</span>}
      </div>
    );
  };

  const slotDropProps = (slot) => ({
    onDragOver: (event) => handleSlotDragOver(event, slot),
    onDragLeave: (event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropPreview([]); },
    onDrop: (event) => handleSlotDrop(event, slot),
  });

  const selectionOverlay = selBox && (
    <div
      className="slot-area pointer-events-none z-50 grid place-items-center rounded-lg border-2 border-violet-400 bg-violet-500/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
      style={{ '--col-start': selBox.c + 1, '--col-span': selBox.cs, '--row-start': selBox.r + 1, '--row-span': selBox.rs }}
    >
      <span className="rounded-full bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
        {selBox.cs} × {selBox.rs}{marqueeRef.current?.quick ? ' · release to merge' : selectedMerges.length ? ' · U to unmerge' : ' · Enter to merge'}
      </span>
    </div>
  );

  const editorGrid = (
    <SheetGrid page={current} card={card} gap={settings.gap} unit={`${gridPpi}px`} dims={dims} animate renderSlot={renderEditorSlot} getSlotProps={slotDropProps}>
      {selectionOverlay}
    </SheetGrid>
  );

  const renderThumbnail = (page, pageIndex) => {
    const unit = Math.min(THUMB_BOX.w / gridW, THUMB_BOX.h / gridH);
    return (
      <button
        key={page.id}
        type="button"
        aria-label={`Page ${pageIndex + 1}`}
        aria-current={pageIndex === currentPage ? 'page' : undefined}
        onClick={() => switchPage(pageIndex)}
        onDragOver={(event) => { if (dragRef.current || hasFiles(event.dataTransfer)) { event.preventDefault(); event.dataTransfer.dropEffect = dragRef.current?.kind === 'slot' ? 'move' : 'copy'; } }}
        onDrop={(event) => handleThumbDrop(event, pageIndex)}
        className={`relative flex h-[96px] w-[82px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${pageIndex === currentPage ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-white/10 hover:border-white/30'}`}
      >
        <div className="grid h-[68px] w-[64px] place-items-center overflow-hidden rounded bg-zinc-950">
          <SheetGrid page={page} card={card} gap={settings.gap} unit={`${unit}px`} dims={dims} renderSlot={(slot) => {
            const id = page.slots[slot.key];
            const src = images[id] || pool.find((item) => item.id === id)?.src;
            const crop = id ? getCrop(page, slot.key, id) : { x: 50, y: 50 };
            return <div className="size-full overflow-hidden border border-zinc-800 bg-zinc-900">{src && <img src={src} alt="" className="size-full" style={{ objectFit: settings.fit, objectPosition: `${crop.x}% ${crop.y}%` }} />}</div>;
          }} />
        </div>
        <span className="text-[10px] font-medium text-zinc-300">Page {pageIndex + 1}</span>
      </button>
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
    info: 'border-white/10 bg-zinc-800 text-zinc-100',
    success: 'border-emerald-400/25 bg-emerald-950 text-emerald-100',
    warn: 'border-amber-400/25 bg-amber-950 text-amber-100',
    error: 'border-red-400/25 bg-red-950 text-red-100',
  };

  return (
    <>
      <div className="app-shell flex flex-col bg-zinc-950 text-zinc-200">
        <div ref={panelRootRef}>
          <AppBar
            currentPage={currentPage}
            pageCount={pages.length}
            onPrevious={() => switchPage((index) => index - 1)}
            onNext={() => switchPage((index) => index + 1)}
            onAdd={addPage}
            onDuplicate={duplicatePage}
            onDelete={deletePage}
            canDelete={pages.length > 1}
            saveStatus={saveStatus}
            storageMode={storageMode}
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
        <div className="flex min-h-0 flex-1">
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
          />
          <main className="flex min-w-0 flex-1 flex-col">
            <div
              ref={stageRef}
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.055),transparent_52%)]"
              onPointerMove={moveMarquee}
              onPointerDown={(event) => { if (event.target === event.currentTarget && combineMode) setSelBox(null); }}
              onDragOver={(event) => { if (!combineMode && (dragRef.current?.kind === 'pool' || hasFiles(event.dataTransfer))) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
              onDrop={handleStageDrop}
            >
              <div data-canvas className="relative" style={{ width: frameWidth, height: frameHeight }}>
                <CanvasToolbar
                  combineMode={combineMode}
                  setCombineMode={setCombineMode}
                  selBox={selBox}
                  canMerge={canMerge}
                  mergeLabel={`Merge ${selBox ? boxDims(selBox) : ''}`}
                  onMerge={() => performMerge(selBox)}
                  selectedMergeCount={selectedMerges.length}
                  onUnmerge={() => unmergeBox()}
                  onResetLayout={resetLayout}
                  onClearPage={clearPage}
                  filled={filled}
                  total={layout.pockets}
                  mergedCount={currentMerges.length}
                  layout={layout}
                />
                {settings.view === 'binder' ? (
                  <div
                    className="sheet-frame relative flex size-full items-start justify-start rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 ring-1 ring-white/15 shadow-[0_28px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]"
                    style={{ paddingTop: SHEET_PAD.top * ppi, paddingRight: SHEET_PAD.right * ppi, paddingBottom: SHEET_PAD.bottom * ppi, paddingLeft: SHEET_PAD.left * ppi }}
                  >
                    {[0.17, 0.5, 0.83].map((position) => <span key={position} aria-hidden="true" className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-950 ring-1 ring-black shadow-[inset_0_0_3px_black,0_1px_0_rgba(255,255,255,.15)]" style={{ left: (SHEET_PAD.left * ppi) / 2, top: `${position * 100}%` }} />)}
                    {editorGrid}
                  </div>
                ) : (
                  <div className="sheet-frame relative grid size-full place-items-center bg-[#f4f4f5] shadow-[0_25px_70px_rgba(0,0,0,0.45)] ring-1 ring-black/20">
                    <span aria-hidden="true" className="pointer-events-none absolute border border-dashed border-zinc-400" style={{ inset: PRINT_SAFE_MARGIN_IN * ppi }} />
                    {editorGrid}
                  </div>
                )}
                <CanvasHelper editing={editing} multiDrag={dragInfo?.kind === 'pool' ? dragInfo.ids.length : 0} flowCount={multiFlow} combineMode={combineMode} settings={settings} paper={paper} card={card} printFit={printFit} offsetX={helperOffsetX} onCenter={() => { const value = editingRef.current; if (value) { const next = { ...value, x: 50, y: 50 }; editingRef.current = next; setEditing(next); } }} onCancel={cancelEditing} onDone={commitEditing} />
              </div>
            </div>
            <div data-page-tray className="no-print scroll-area h-[124px] shrink-0 overflow-x-auto border-t border-white/10 bg-neutral-950/60">
              <div data-page-tray-inner className="mx-auto flex w-max gap-2 py-3 pr-4" style={{ paddingLeft: `calc(1rem + ${2 * helperOffsetX}px)` }}>
                {pages.map(renderThumbnail)}
                <button type="button" onClick={addPage} className="flex h-[96px] w-[82px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-600 text-[11px] font-medium text-zinc-400 transition-colors hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"><Icon name="plus" size="lg" /><span>Add page</span></button>
              </div>
            </div>
          </main>
        </div>
        <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[360px] flex-col items-end gap-2">
          {toasts.map((toast) => <div key={toast.id} role="status" className={`animate-toast pointer-events-auto flex max-w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-[12px] shadow-2xl shadow-black/40 ${toastTones[toast.tone] || toastTones.info}`}><span className="leading-relaxed">{toast.message}</span>{toast.action && <button type="button" onClick={() => { setToasts((value) => value.filter((item) => item.id !== toast.id)); toast.action.onClick(); }} className="shrink-0 rounded-md bg-white/10 px-2 py-1 font-semibold text-white hover:bg-white/20">{toast.action.label}</button>}<button type="button" title="Dismiss" aria-label="Dismiss notification" onClick={() => setToasts((value) => value.filter((item) => item.id !== toast.id))} className="grid size-6 shrink-0 place-items-center rounded-md text-current hover:bg-white/10"><Icon name="x" size="sm" /></button></div>)}
        </div>
      </div>
      <div className="portrait-guard"><Icon name="rotate" size="2xl" className="text-indigo-300" /><h2 className="text-xl font-semibold text-white">Rotate to landscape</h2><p className="max-w-sm text-sm text-zinc-400">Digital Card Binder is designed as a desktop, landscape workspace.</p></div>
      {printTree}
    </>
  );
}
