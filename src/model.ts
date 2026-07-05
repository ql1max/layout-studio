export type PageFormat = 'a4' | 'letter';

export const pageFormats: Record<
  PageFormat,
  { label: string; widthMm: number; heightMm: number; cssSize: string }
> = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297, cssSize: 'A4' },
  letter: { label: 'US Letter', widthMm: 215.9, heightMm: 279.4, cssSize: 'letter' },
};

export type GridSettings = {
  columns: number;
  gutterMm: number;
  marginMm: number;
  baselineMm: number;
};

export type GridOverlay = 'none' | 'columns' | 'baseline' | 'modular';

export type Frame = { col: number; row: number; colSpan: number; rowSpan: number };

export type FontId = 'inter' | 'serif' | 'mono';

export const fontLibrary: Record<FontId, { label: string; stack: string }> = {
  inter: {
    label: 'Inter',
    stack: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
  },
  serif: {
    label: 'Source Serif',
    stack: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  },
  mono: {
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, monospace",
  },
};

type ItemBase = { id: string; frame: Frame };

export type TextItem = ItemBase & {
  kind: 'text';
  text: string;
  font: FontId;
  sizePt: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
  align: 'left' | 'center' | 'right';
  color: string;
};

export type ShapeItem = ItemBase & {
  kind: 'shape';
  shape: 'rectangle' | 'ellipse' | 'line';
  fill: string;
  radiusMm: number;
};

export type ImageItem = ItemBase & {
  kind: 'image';
  src?: string;
  fit: 'cover' | 'contain';
  isLogo: boolean;
};

export type TableItem = ItemBase & {
  kind: 'table';
  rows: { label: string; value: string }[];
  font: FontId;
  sizePt: number;
  color: string;
};

export type Item = TextItem | ShapeItem | ImageItem | TableItem;

export type Page = { id: string; background: string; items: Item[] };

export type BrandKit = {
  colors: string[];
  fonts: FontId[];
  minBodyPt: number;
};

export type OutputSettings = {
  bleedMm: number;
  cropMarks: boolean;
};

export type Doc = {
  name: string;
  format: PageFormat;
  grid: GridSettings;
  overlay: GridOverlay;
  brand: BrandKit;
  output: OutputSettings;
  pages: Page[];
};

export const defaultOutput: OutputSettings = { bleedMm: 0, cropMarks: false };

/* ── Geometry ────────────────────────────────────────────── */

export const MM = 96 / 25.4; // CSS px per millimeter

export function contentBox(format: PageFormat, grid: GridSettings) {
  const page = pageFormats[format];
  return {
    x: grid.marginMm,
    y: grid.marginMm,
    w: page.widthMm - grid.marginMm * 2,
    h: page.heightMm - grid.marginMm * 2,
  };
}

export function columnWidthMm(format: PageFormat, grid: GridSettings): number {
  const box = contentBox(format, grid);
  return (box.w - (grid.columns - 1) * grid.gutterMm) / grid.columns;
}

export function rowCount(format: PageFormat, grid: GridSettings): number {
  const box = contentBox(format, grid);
  return Math.floor(box.h / grid.baselineMm);
}

export function frameRectMm(frame: Frame, format: PageFormat, grid: GridSettings) {
  const colW = columnWidthMm(format, grid);
  return {
    x: grid.marginMm + frame.col * (colW + grid.gutterMm),
    y: grid.marginMm + frame.row * grid.baselineMm,
    w: frame.colSpan * colW + (frame.colSpan - 1) * grid.gutterMm,
    h: frame.rowSpan * grid.baselineMm,
  };
}

export function clampFrame(frame: Frame, format: PageFormat, grid: GridSettings): Frame {
  const rows = rowCount(format, grid);
  const colSpan = Math.max(1, Math.min(frame.colSpan, grid.columns));
  const rowSpan = Math.max(1, Math.min(frame.rowSpan, rows));
  return {
    colSpan,
    rowSpan,
    col: Math.max(0, Math.min(frame.col, grid.columns - colSpan)),
    row: Math.max(0, Math.min(frame.row, rows - rowSpan)),
  };
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/* ── Item factories ──────────────────────────────────────── */

export function makeText(partial: Partial<TextItem> & { frame: Frame }): TextItem {
  return {
    id: newId(),
    kind: 'text',
    text: 'Text',
    font: 'inter',
    sizePt: 10,
    weight: 400,
    lineHeight: 1.4,
    letterSpacing: 0,
    align: 'left',
    color: '#141414',
    ...partial,
  };
}

export function makeShape(partial: Partial<ShapeItem> & { frame: Frame }): ShapeItem {
  return {
    id: newId(),
    kind: 'shape',
    shape: 'rectangle',
    fill: '#141414',
    radiusMm: 0,
    ...partial,
  };
}

export function makeImage(partial: Partial<ImageItem> & { frame: Frame }): ImageItem {
  return {
    id: newId(),
    kind: 'image',
    fit: 'cover',
    isLogo: false,
    ...partial,
  };
}

export function makeTable(partial: Partial<TableItem> & { frame: Frame }): TableItem {
  return {
    id: newId(),
    kind: 'table',
    rows: [
      { label: 'Label', value: 'Value' },
      { label: 'Label', value: 'Value' },
    ],
    font: 'inter',
    sizePt: 8,
    color: '#141414',
    ...partial,
  };
}

export const defaultBrand: BrandKit = {
  colors: ['#141414', '#6d6d6b', '#f4f4f2', '#ffffff', '#b4552d'],
  fonts: ['inter', 'mono'],
  minBodyPt: 7,
};

const defaultGrid: GridSettings = {
  columns: 12,
  gutterMm: 4,
  marginMm: 12,
  baselineMm: 4,
};

/* ── Templates ───────────────────────────────────────────── */

function auroraSheet(): Doc {
  const ink = '#141414';
  const muted = '#6d6d6b';
  const accent = '#b4552d';
  const items: Item[] = [
    makeText({
      frame: { col: 0, row: 0, colSpan: 5, rowSpan: 3 },
      text: 'Halvdan',
      sizePt: 13,
      weight: 700,
      letterSpacing: -0.01,
    }),
    makeText({
      frame: { col: 6, row: 0, colSpan: 6, rowSpan: 3 },
      text: 'TASK LIGHTING · HL-AUR-01',
      font: 'mono',
      sizePt: 7,
      align: 'right',
      color: muted,
      letterSpacing: 0.06,
      lineHeight: 2,
    }),
    makeShape({
      frame: { col: 0, row: 3, colSpan: 12, rowSpan: 1 },
      shape: 'line',
      fill: ink,
    }),
    makeText({
      frame: { col: 0, row: 5, colSpan: 9, rowSpan: 6 },
      text: 'Aurora One',
      sizePt: 30,
      weight: 700,
      letterSpacing: -0.02,
      lineHeight: 1.05,
    }),
    makeText({
      frame: { col: 0, row: 11, colSpan: 8, rowSpan: 3 },
      text: 'A desk lamp that understands the difference between glare and light.',
      sizePt: 11,
      color: muted,
      lineHeight: 1.35,
    }),
    makeImage({ frame: { col: 0, row: 15, colSpan: 12, rowSpan: 13 } }),
    makeText({
      frame: { col: 0, row: 29, colSpan: 7, rowSpan: 8 },
      text:
        'Aurora One pairs a full-spectrum LED array with a machined aluminium head that rotates through 270 degrees. Color temperature follows the time of day by default, and a single dial overrides everything when you know what you want.',
      sizePt: 9,
      lineHeight: 1.55,
    }),
    makeText({
      frame: { col: 0, row: 38, colSpan: 7, rowSpan: 2 },
      text: 'Adaptive spectrum',
      sizePt: 9,
      weight: 700,
    }),
    makeText({
      frame: { col: 0, row: 40, colSpan: 7, rowSpan: 3 },
      text: '2700K to 6500K, tuned automatically or set by hand.',
      sizePt: 8.5,
      color: muted,
    }),
    makeText({
      frame: { col: 0, row: 44, colSpan: 7, rowSpan: 2 },
      text: 'Zero-flicker driver',
      sizePt: 9,
      weight: 700,
    }),
    makeText({
      frame: { col: 0, row: 46, colSpan: 7, rowSpan: 3 },
      text: 'Constant-current dimming from 5 to 100 percent.',
      sizePt: 8.5,
      color: muted,
    }),
    makeText({
      frame: { col: 0, row: 50, colSpan: 7, rowSpan: 2 },
      text: 'One dial',
      sizePt: 9,
      weight: 700,
    }),
    makeText({
      frame: { col: 0, row: 52, colSpan: 7, rowSpan: 3 },
      text: 'Press to switch modes, turn to adjust. Nothing else.',
      sizePt: 8.5,
      color: muted,
    }),
    makeTable({
      frame: { col: 8, row: 29, colSpan: 4, rowSpan: 22 },
      rows: [
        { label: 'Output', value: '1 100 lm' },
        { label: 'CRI', value: '97' },
        { label: 'Color range', value: '2700K to 6500K' },
        { label: 'Power', value: '12 W, USB-C PD' },
        { label: 'Materials', value: 'Aluminium, steel' },
        { label: 'Reach', value: '82 cm articulated' },
        { label: 'Warranty', value: '5 years' },
      ],
    }),
    makeShape({
      frame: { col: 8, row: 52, colSpan: 4, rowSpan: 8 },
      fill: accent,
      radiusMm: 2,
    }),
    makeText({
      frame: { col: 8, row: 53, colSpan: 4, rowSpan: 6 },
      text: 'MSRP\nEUR 249',
      sizePt: 12,
      weight: 700,
      align: 'center',
      color: '#ffffff',
      lineHeight: 1.5,
    }),
    makeShape({
      frame: { col: 0, row: 63, colSpan: 12, rowSpan: 1 },
      shape: 'line',
      fill: ink,
    }),
    makeText({
      frame: { col: 0, row: 64, colSpan: 6, rowSpan: 3 },
      text: 'Halvdan Lighting ApS',
      sizePt: 8,
      weight: 600,
    }),
    makeText({
      frame: { col: 6, row: 64, colSpan: 6, rowSpan: 3 },
      text: 'halvdan.dk · sales@halvdan.dk',
      sizePt: 8,
      align: 'right',
      color: muted,
    }),
  ];

  return {
    name: 'Aurora One product sheet',
    format: 'a4',
    grid: { ...defaultGrid },
    overlay: 'none',
    brand: { ...defaultBrand, colors: [...defaultBrand.colors] },
    output: { ...defaultOutput },
    pages: [{ id: newId(), background: '#ffffff', items }],
  };
}

function studioPoster(): Doc {
  const items: Item[] = [
    makeShape({
      frame: { col: 6, row: 6, colSpan: 6, rowSpan: 24 },
      shape: 'ellipse',
      fill: '#b4552d',
    }),
    makeText({
      frame: { col: 0, row: 22, colSpan: 12, rowSpan: 18 },
      text: 'Structure is a material.',
      font: 'serif',
      sizePt: 44,
      weight: 600,
      lineHeight: 1.05,
      letterSpacing: -0.01,
    }),
    makeText({
      frame: { col: 0, row: 44, colSpan: 7, rowSpan: 8 },
      text:
        'A poster set on the same twelve-column grid as everything else in this studio. Move things. The grid holds.',
      sizePt: 10,
      color: '#6d6d6b',
      lineHeight: 1.5,
    }),
    makeShape({
      frame: { col: 0, row: 62, colSpan: 12, rowSpan: 1 },
      shape: 'line',
      fill: '#141414',
    }),
    makeText({
      frame: { col: 0, row: 64, colSpan: 12, rowSpan: 3 },
      text: 'LAYOUT STUDIO · SPECIMEN 01',
      font: 'mono',
      sizePt: 7,
      color: '#6d6d6b',
      letterSpacing: 0.08,
    }),
  ];

  return {
    name: 'Studio poster',
    format: 'a4',
    grid: { ...defaultGrid },
    overlay: 'none',
    brand: { ...defaultBrand, colors: [...defaultBrand.colors] },
    output: { ...defaultOutput },
    pages: [{ id: newId(), background: '#f4f4f2', items }],
  };
}

function blankDoc(): Doc {
  return {
    name: 'Untitled document',
    format: 'a4',
    grid: { ...defaultGrid },
    overlay: 'columns',
    brand: { ...defaultBrand, colors: [...defaultBrand.colors] },
    output: { ...defaultOutput },
    pages: [{ id: newId(), background: '#ffffff', items: [] }],
  };
}

export const templates: { id: string; name: string; make: () => Doc }[] = [
  { id: 'aurora', name: 'Product sheet', make: auroraSheet },
  { id: 'poster', name: 'Poster', make: studioPoster },
  { id: 'blank', name: 'Blank page', make: blankDoc },
];

/* ── Persistence ─────────────────────────────────────────── */

const STORAGE_KEY = 'layout-studio-doc-v1';

export function loadDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as Doc;
    if (!doc.pages?.length || !doc.grid || !doc.format) return null;
    if (!doc.output) doc.output = { ...defaultOutput };
    return doc;
  } catch {
    return null;
  }
}

export function saveDoc(doc: Doc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // storage full or unavailable; autosave is best-effort
  }
}
