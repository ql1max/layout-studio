import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { checkBrand, cmykRisky, collectColors } from './brand';
import { CanvasView, PageView, itemLabel } from './Canvas';
import type { Selection } from './Canvas';
import {
  MM,
  clampFrame,
  defaultOutput,
  fontLibrary,
  loadDoc,
  makeImage,
  makeShape,
  makeTable,
  makeText,
  newId,
  pageFormats,
  saveDoc,
  templates,
} from './model';
import type {
  Doc,
  FontId,
  Frame,
  GridOverlay,
  Item,
  Page,
  PageFormat,
} from './model';
import './index.css';

const HISTORY_LIMIT = 60;

function reclampDoc(doc: Doc): Doc {
  return {
    ...doc,
    pages: doc.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => ({
        ...item,
        frame: clampFrame(item.frame, doc.format, doc.grid),
      })),
    })),
  };
}

/* ── Small form controls ─────────────────────────────────── */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

function NumInput({
  value,
  min,
  max,
  step = 1,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (next: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onCommit(Math.min(max, Math.max(min, next)));
      }}
    />
  );
}

/* ── App ─────────────────────────────────────────────────── */

export default function App() {
  const [doc, setDoc] = useState<Doc>(() => loadDoc() ?? templates[0].make());
  const [selection, setSelection] = useState<Selection>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string>(doc.pages[0].id);
  const [pendingColor, setPendingColor] = useState('#4a7dff');
  const [printRange, setPrintRange] = useState<'current' | 'all'>('current');
  const [, setHistoryTick] = useState(0);

  const docRef = useRef(doc);
  docRef.current = doc;
  const pastRef = useRef<Doc[]>([]);
  const futureRef = useRef<Doc[]>([]);
  const txnRef = useRef<Doc | null>(null);

  const focusPageIndex = Math.max(
    0,
    doc.pages.findIndex((page) => page.id === selectedPageId),
  );
  const focusPage = doc.pages[focusPageIndex];

  /* History */

  const bump = () => setHistoryTick((tick) => tick + 1);

  const commit = (next: Doc) => {
    pastRef.current.push(docRef.current);
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    setDoc(next);
    bump();
  };

  const beginTransaction = () => {
    txnRef.current = docRef.current;
  };

  const endTransaction = () => {
    if (txnRef.current && txnRef.current !== docRef.current) {
      pastRef.current.push(txnRef.current);
      if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
      futureRef.current = [];
      bump();
    }
    txnRef.current = null;
  };

  const undo = () => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(docRef.current);
    setDoc(prev);
    setEditingId(null);
    bump();
  };

  const redo = () => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(docRef.current);
    setDoc(next);
    setEditingId(null);
    bump();
  };

  /* Autosave */

  useEffect(() => {
    const handle = window.setTimeout(() => saveDoc(doc), 400);
    return () => window.clearTimeout(handle);
  }, [doc]);

  /* Document mutation helpers */

  const mutateItem = (
    pageId: string,
    itemId: string,
    mutate: (item: Item) => Item,
    withHistory: boolean,
  ) => {
    const current = docRef.current;
    const next: Doc = {
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              items: page.items.map((item) =>
                item.id === itemId ? mutate(item) : item,
              ),
            }
          : page,
      ),
    };
    if (withHistory) commit(next);
    else setDoc(next);
  };

  const selectedItem: Item | null = selection
    ? (doc.pages
        .find((page) => page.id === selection.pageId)
        ?.items.find((item) => item.id === selection.itemId) ?? null)
    : null;

  const updateSelected = (mutate: (item: Item) => Item) => {
    if (selection) mutateItem(selection.pageId, selection.itemId, mutate, true);
  };

  const addItem = (kind: Item['kind']) => {
    const page = focusPage;
    const stagger = (page.items.length * 2) % 20;
    const frames: Record<Item['kind'], Frame> = {
      text: { col: 0, row: stagger, colSpan: 6, rowSpan: 4 },
      shape: { col: 0, row: stagger, colSpan: 4, rowSpan: 8 },
      image: { col: 0, row: stagger, colSpan: 6, rowSpan: 14 },
      table: { col: 0, row: stagger, colSpan: 5, rowSpan: 8 },
    };
    const frame = clampFrame(frames[kind], doc.format, doc.grid);
    const item: Item =
      kind === 'text'
        ? makeText({ frame, text: 'New text' })
        : kind === 'shape'
          ? makeShape({ frame, fill: doc.brand.colors[0] ?? '#141414' })
          : kind === 'image'
            ? makeImage({ frame })
            : makeTable({ frame });

    commit({
      ...docRef.current,
      pages: docRef.current.pages.map((p) =>
        p.id === page.id ? { ...p, items: [...p.items, item] } : p,
      ),
    });
    setSelection({ pageId: page.id, itemId: item.id });
  };

  const deleteSelected = () => {
    if (!selection) return;
    commit({
      ...docRef.current,
      pages: docRef.current.pages.map((page) =>
        page.id === selection.pageId
          ? { ...page, items: page.items.filter((item) => item.id !== selection.itemId) }
          : page,
      ),
    });
    setSelection(null);
    setEditingId(null);
  };

  const duplicateSelected = () => {
    if (!selection || !selectedItem) return;
    const copy: Item = {
      ...structuredClone(selectedItem),
      id: newId(),
      frame: clampFrame(
        {
          ...selectedItem.frame,
          col: selectedItem.frame.col + 1,
          row: selectedItem.frame.row + 2,
        },
        doc.format,
        doc.grid,
      ),
    };
    commit({
      ...docRef.current,
      pages: docRef.current.pages.map((page) =>
        page.id === selection.pageId ? { ...page, items: [...page.items, copy] } : page,
      ),
    });
    setSelection({ pageId: selection.pageId, itemId: copy.id });
  };

  const reorderItem = (pageId: string, itemId: string, direction: 1 | -1) => {
    commit({
      ...docRef.current,
      pages: docRef.current.pages.map((page) => {
        if (page.id !== pageId) return page;
        const index = page.items.findIndex((item) => item.id === itemId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= page.items.length) return page;
        const items = [...page.items];
        const [moved] = items.splice(index, 1);
        items.splice(target, 0, moved);
        return { ...page, items };
      }),
    });
  };

  const reorderSelected = (direction: 1 | -1) => {
    if (selection) reorderItem(selection.pageId, selection.itemId, direction);
  };

  const layerName = (item: Item): string => {
    if (item.kind === 'text') {
      const words = item.text.replace(/\s+/g, ' ').trim();
      return words.length > 22 ? `${words.slice(0, 22)}…` : words || 'Empty text';
    }
    if (item.kind === 'table') return `Table · ${item.rows.length} rows`;
    return itemLabel(item);
  };

  const layerGlyph = (item: Item): string => {
    if (item.kind === 'text') return 'T';
    if (item.kind === 'shape') return '▬';
    if (item.kind === 'image') return '▣';
    return '☰';
  };

  /* Pages */

  const addPage = () => {
    const page: Page = { id: newId(), background: focusPage.background, items: [] };
    commit({ ...docRef.current, pages: [...docRef.current.pages, page] });
    setSelectedPageId(page.id);
    setSelection(null);
  };

  const duplicatePage = (pageId: string) => {
    const source = docRef.current.pages.find((page) => page.id === pageId);
    if (!source) return;
    const copy: Page = {
      id: newId(),
      background: source.background,
      items: source.items.map((item) => ({ ...structuredClone(item), id: newId() })),
    };
    const index = docRef.current.pages.findIndex((page) => page.id === pageId);
    const pages = [...docRef.current.pages];
    pages.splice(index + 1, 0, copy);
    commit({ ...docRef.current, pages });
    setSelectedPageId(copy.id);
  };

  const deletePage = (pageId: string) => {
    if (docRef.current.pages.length <= 1) return;
    const pages = docRef.current.pages.filter((page) => page.id !== pageId);
    commit({ ...docRef.current, pages });
    if (selectedPageId === pageId) setSelectedPageId(pages[0].id);
    if (selection?.pageId === pageId) setSelection(null);
  };

  /* Keyboard shortcuts */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        editingId ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (!selection || !selectedItem) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (event.key === 'Escape') {
        setSelection(null);
        return;
      }

      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const delta = arrows[event.key];
      if (!delta) return;
      event.preventDefault();
      const frame = { ...selectedItem.frame };
      if (event.shiftKey) {
        frame.colSpan += delta[0];
        frame.rowSpan += delta[1];
      } else {
        frame.col += delta[0];
        frame.row += delta[1];
      }
      updateSelected((item) => ({
        ...item,
        frame: clampFrame(frame, docRef.current.format, docRef.current.grid),
      }));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  /* Image upload */

  const onImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selection) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateSelected((item) =>
        item.kind === 'image' ? { ...item, src: String(reader.result) } : item,
      );
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /* Doc-level settings */

  const setDocProps = (props: Partial<Doc>) => {
    commit(reclampDoc({ ...docRef.current, ...props }));
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const next = template.make();
    commit(next);
    setSelectedPageId(next.pages[0].id);
    setSelection(null);
  };

  const thumbScale = (format: PageFormat) => 88 / (pageFormats[format].heightMm * MM);

  const violations = checkBrand(doc);
  const riskyColors = collectColors(doc).filter(cmykRisky);

  /* JSON export / import */

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${doc.name.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'document'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as Doc;
        if (!next.pages?.length || !next.grid || !next.format) return;
        if (!next.output) next.output = { ...defaultOutput };
        commit(reclampDoc(next));
        setSelectedPageId(next.pages[0].id);
        setSelection(null);
      } catch {
        // invalid file; ignore
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  /* Print sheet geometry */

  const markSpaceMm = doc.output.cropMarks ? 6 : 0;
  const bleedMm = doc.output.bleedMm;
  const printFormat = pageFormats[doc.format];
  const sheetW = printFormat.widthMm + 2 * (bleedMm + markSpaceMm);
  const sheetH = printFormat.heightMm + 2 * (bleedMm + markSpaceMm);
  const trimOffset = markSpaceMm + bleedMm;
  const printPages = printRange === 'all' ? doc.pages : [focusPage];

  const cropMarkStyles = doc.output.cropMarks
    ? ([
        { left: 0, top: `${trimOffset}mm`, width: '4mm', height: '0.25mm' },
        { right: 0, top: `${trimOffset}mm`, width: '4mm', height: '0.25mm' },
        { left: 0, bottom: `${trimOffset}mm`, width: '4mm', height: '0.25mm' },
        { right: 0, bottom: `${trimOffset}mm`, width: '4mm', height: '0.25mm' },
        { top: 0, left: `${trimOffset}mm`, height: '4mm', width: '0.25mm' },
        { top: 0, right: `${trimOffset}mm`, height: '4mm', width: '0.25mm' },
        { bottom: 0, left: `${trimOffset}mm`, height: '4mm', width: '0.25mm' },
        { bottom: 0, right: `${trimOffset}mm`, height: '4mm', width: '0.25mm' },
      ] as const)
    : [];

  return (
    <div className="studio">
      <header className="topbar">
        <div className="topbar__left">
          <span className="topbar__logo">Layout Studio</span>
          <input
            className="topbar__name"
            value={doc.name}
            onChange={(event) => setDoc({ ...doc, name: event.target.value })}
            aria-label="Document name"
          />
        </div>
        <div className="topbar__right">
          <button
            type="button"
            className="ghost-button"
            onClick={undo}
            disabled={pastRef.current.length === 0}
          >
            Undo
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={redo}
            disabled={futureRef.current.length === 0}
          >
            Redo
          </button>
          <button type="button" className="print-button" onClick={() => window.print()}>
            Export PDF
          </button>
        </div>
      </header>

      <div className="studio__body">
        <aside className="rail">
          <section>
            <h2>Pages</h2>
            <div className="thumbs">
              {doc.pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`thumb ${page.id === selectedPageId ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="thumb__preview"
                    onClick={() => {
                      setSelectedPageId(page.id);
                      setSelection(null);
                    }}
                    aria-label={`Go to page ${index + 1}`}
                  >
                    <span
                      className="thumb__page"
                      style={{
                        width: pageFormats[doc.format].widthMm * MM * thumbScale(doc.format),
                        height: 88,
                      }}
                    >
                      <span
                        className="thumb__page-inner"
                        style={{ transform: `scale(${thumbScale(doc.format)})` }}
                      >
                        <PageView doc={doc} page={page} />
                      </span>
                    </span>
                  </button>
                  <div className="thumb__meta">
                    <span>{index + 1}</span>
                    <span className="thumb__actions">
                      <button type="button" onClick={() => duplicatePage(page.id)}>
                        Dup
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePage(page.id)}
                        disabled={doc.pages.length <= 1}
                      >
                        Del
                      </button>
                    </span>
                  </div>
                </div>
              ))}
              <button type="button" className="thumb__add" onClick={addPage}>
                + Add page
              </button>
            </div>
          </section>

          <section>
            <h2>Layers</h2>
            {focusPage.items.length === 0 ? (
              <p className="hint">Nothing on this page yet.</p>
            ) : (
              <div className="layers">
                {[...focusPage.items].reverse().map((item) => (
                  <div
                    key={item.id}
                    className={`layer ${
                      selection?.itemId === item.id ? 'is-active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="layer__main"
                      onClick={() =>
                        setSelection({ pageId: focusPage.id, itemId: item.id })
                      }
                    >
                      <strong>{layerGlyph(item)}</strong>
                      <span>{layerName(item)}</span>
                    </button>
                    <span className="layer__z">
                      <button
                        type="button"
                        title="Bring forward"
                        onClick={() => reorderItem(focusPage.id, item.id, 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        title="Send backward"
                        onClick={() => reorderItem(focusPage.id, item.id, -1)}
                      >
                        ↓
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Insert</h2>
            <div className="palette">
              <button type="button" onClick={() => addItem('text')}>
                <strong>Aa</strong> Text
              </button>
              <button type="button" onClick={() => addItem('shape')}>
                <strong>▬</strong> Shape
              </button>
              <button type="button" onClick={() => addItem('image')}>
                <strong>▣</strong> Image
              </button>
              <button type="button" onClick={() => addItem('table')}>
                <strong>☰</strong> Table
              </button>
            </div>
          </section>

          <section>
            <h2>Templates</h2>
            <div className="template-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadTemplate(template.id)}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <CanvasView
          doc={doc}
          selection={selection}
          editingId={editingId}
          onSelect={setSelection}
          onEdit={setEditingId}
          updateItemFrame={(pageId, itemId, frame) =>
            mutateItem(pageId, itemId, (item) => ({ ...item, frame }), false)
          }
          beginTransaction={beginTransaction}
          endTransaction={endTransaction}
          onTextCommit={(pageId, itemId, text) =>
            mutateItem(
              pageId,
              itemId,
              (item) => (item.kind === 'text' ? { ...item, text } : item),
              true,
            )
          }
          onCellCommit={(pageId, itemId, rowIndex, field, text) =>
            mutateItem(
              pageId,
              itemId,
              (item) =>
                item.kind === 'table'
                  ? {
                      ...item,
                      rows: item.rows.map((row, index) =>
                        index === rowIndex ? { ...row, [field]: text } : row,
                      ),
                    }
                  : item,
              true,
            )
          }
          onAddPage={addPage}
          focusPageIndex={focusPageIndex}
        />

        <aside className="inspector">
          {!selectedItem && (
            <>
              <section>
                <h2>Document</h2>
                <Field label="Format">
                  <select
                    value={doc.format}
                    onChange={(event) =>
                      setDocProps({ format: event.target.value as PageFormat })
                    }
                  >
                    {Object.entries(pageFormats).map(([key, format]) => (
                      <option key={key} value={key}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Page background">
                  <input
                    type="color"
                    value={focusPage.background}
                    onChange={(event) =>
                      commit({
                        ...docRef.current,
                        pages: docRef.current.pages.map((page) =>
                          page.id === focusPage.id
                            ? { ...page, background: event.target.value }
                            : page,
                        ),
                      })
                    }
                  />
                </Field>
              </section>

              <section>
                <h2>Grid</h2>
                <Field label="Columns">
                  <NumInput
                    value={doc.grid.columns}
                    min={2}
                    max={24}
                    onCommit={(columns) =>
                      setDocProps({ grid: { ...doc.grid, columns } })
                    }
                  />
                </Field>
                <Field label="Gutter (mm)">
                  <NumInput
                    value={doc.grid.gutterMm}
                    min={0}
                    max={12}
                    step={0.5}
                    onCommit={(gutterMm) =>
                      setDocProps({ grid: { ...doc.grid, gutterMm } })
                    }
                  />
                </Field>
                <Field label="Margin (mm)">
                  <NumInput
                    value={doc.grid.marginMm}
                    min={4}
                    max={30}
                    onCommit={(marginMm) =>
                      setDocProps({ grid: { ...doc.grid, marginMm } })
                    }
                  />
                </Field>
                <Field label="Baseline (mm)">
                  <NumInput
                    value={doc.grid.baselineMm}
                    min={2}
                    max={12}
                    step={0.5}
                    onCommit={(baselineMm) =>
                      setDocProps({ grid: { ...doc.grid, baselineMm } })
                    }
                  />
                </Field>
                <Field label="Overlay">
                  <select
                    value={doc.overlay}
                    onChange={(event) =>
                      setDocProps({ overlay: event.target.value as GridOverlay })
                    }
                  >
                    <option value="none">None</option>
                    <option value="columns">Columns</option>
                    <option value="baseline">Baseline</option>
                    <option value="modular">Modular</option>
                  </select>
                </Field>
              </section>

              <section>
                <h2>Brand kit</h2>
                <div className="chip-row">
                  {doc.brand.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="chip"
                      style={{ background: color }}
                      title={`Remove ${color} from the palette`}
                      onClick={() =>
                        setDocProps({
                          brand: {
                            ...doc.brand,
                            colors: doc.brand.colors.filter((c) => c !== color),
                          },
                        })
                      }
                    />
                  ))}
                </div>
                <div className="button-row">
                  <input
                    type="color"
                    value={pendingColor}
                    onChange={(event) => setPendingColor(event.target.value)}
                    aria-label="New brand color"
                  />
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      if (!doc.brand.colors.includes(pendingColor)) {
                        setDocProps({
                          brand: {
                            ...doc.brand,
                            colors: [...doc.brand.colors, pendingColor],
                          },
                        });
                      }
                    }}
                  >
                    Add color
                  </button>
                </div>
                {Object.entries(fontLibrary).map(([id, font]) => (
                  <label className="check-row" key={id}>
                    <input
                      type="checkbox"
                      checked={doc.brand.fonts.includes(id as FontId)}
                      onChange={(event) =>
                        setDocProps({
                          brand: {
                            ...doc.brand,
                            fonts: event.target.checked
                              ? [...doc.brand.fonts, id as FontId]
                              : doc.brand.fonts.filter((f) => f !== id),
                          },
                        })
                      }
                    />
                    {font.label}
                  </label>
                ))}
                <Field label="Min text (pt)">
                  <NumInput
                    value={doc.brand.minBodyPt}
                    min={4}
                    max={14}
                    step={0.5}
                    onCommit={(minBodyPt) =>
                      setDocProps({ brand: { ...doc.brand, minBodyPt } })
                    }
                  />
                </Field>
              </section>

              <section>
                <h2>
                  Brand check{violations.length > 0 ? ` (${violations.length})` : ''}
                </h2>
                <div
                  className={`score-card ${violations.length === 0 ? 'score-card--ok' : 'score-card--warn'}`}
                >
                  <strong>{violations.length === 0 ? 'On brand' : 'Off brand'}</strong>
                  <span>{Math.max(0, 100 - violations.length * 8)}%</span>
                </div>
                {(
                  [
                    ['Colors', /palette/],
                    ['Fonts', /font/],
                    ['Type sizes', /minimum/],
                    ['Logo', /logo/i],
                  ] as const
                ).map(([label, pattern]) => {
                  const count = violations.filter((v) => pattern.test(v.message)).length;
                  return (
                    <div className="brand-row" key={label}>
                      <span className={count ? 'brand-row__dot is-warn' : 'brand-row__dot'} />
                      <span>{label}</span>
                      <span className="brand-row__status">
                        {count ? `${count} issue${count > 1 ? 's' : ''}` : 'OK'}
                      </span>
                    </div>
                  );
                })}
                {violations.length === 0 ? (
                  <p className="hint hint--ok">
                    Everything on the document follows the brand kit.
                  </p>
                ) : (
                  <div className="violations">
                    {violations.map((violation, index) => (
                      <button
                        key={index}
                        type="button"
                        className="violation"
                        onClick={() => {
                          const page = doc.pages[violation.pageIndex];
                          if (!page) return;
                          setSelectedPageId(page.id);
                          setSelection(
                            violation.itemId
                              ? { pageId: page.id, itemId: violation.itemId }
                              : null,
                          );
                        }}
                      >
                        <span>p.{violation.pageIndex + 1}</span>
                        {violation.message}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2>Output</h2>
                <Field label="Bleed (mm)">
                  <NumInput
                    value={doc.output.bleedMm}
                    min={0}
                    max={5}
                    step={0.5}
                    onCommit={(bleedMm) =>
                      setDocProps({ output: { ...doc.output, bleedMm } })
                    }
                  />
                </Field>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={doc.output.cropMarks}
                    onChange={(event) =>
                      setDocProps({
                        output: { ...doc.output, cropMarks: event.target.checked },
                      })
                    }
                  />
                  Crop marks
                </label>
                <Field label="Print range">
                  <select
                    value={printRange}
                    onChange={(event) =>
                      setPrintRange(event.target.value as 'current' | 'all')
                    }
                  >
                    <option value="current">Current page</option>
                    <option value="all">All pages</option>
                  </select>
                </Field>
                {riskyColors.length > 0 && (
                  <p className="hint hint--warn">
                    CMYK soft proof: {riskyColors.join(', ')} may shift in
                    print. Browsers export RGB; convert in prepress.
                  </p>
                )}
                <div className="button-row">
                  <button type="button" className="ghost-button" onClick={exportJson}>
                    Save .json
                  </button>
                  <label className="ghost-button file-button">
                    Open .json
                    <input type="file" accept="application/json" onChange={importJson} />
                  </label>
                </div>
              </section>

              <section>
                <h2>Help</h2>
                <p className="hint">
                  Scroll to pan, Ctrl + scroll to zoom. Drag items to move them
                  on the grid, drag the handles to resize. Double-click text to
                  edit. Arrow keys nudge, Shift + arrows resize, Ctrl + D
                  duplicates.
                </p>
              </section>
            </>
          )}

          {selectedItem && (
            <>
              <section>
                <h2>{selectedItem.kind}</h2>
                <div className="button-row">
                  <button type="button" className="ghost-button" onClick={duplicateSelected}>
                    Duplicate
                  </button>
                  <button type="button" className="ghost-button" onClick={deleteSelected}>
                    Delete
                  </button>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => reorderSelected(1)}
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => reorderSelected(-1)}
                  >
                    Backward
                  </button>
                </div>
                <p className="hint">
                  Col {selectedItem.frame.col + 1}, row {selectedItem.frame.row + 1},{' '}
                  {selectedItem.frame.colSpan} x {selectedItem.frame.rowSpan} units
                </p>
              </section>

              {selectedItem.kind === 'text' && (
                <section>
                  <h2>Type</h2>
                  <Field label="Font">
                    <select
                      value={selectedItem.font}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          font: event.target.value as FontId,
                        }))
                      }
                    >
                      {Object.entries(fontLibrary).map(([id, font]) => (
                        <option key={id} value={id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Size (pt)">
                    <NumInput
                      value={selectedItem.sizePt}
                      min={5}
                      max={120}
                      step={0.5}
                      onCommit={(sizePt) =>
                        updateSelected((item) => ({ ...item, sizePt }))
                      }
                    />
                  </Field>
                  <Field label="Weight">
                    <select
                      value={selectedItem.weight}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          weight: Number(event.target.value),
                        }))
                      }
                    >
                      {[400, 500, 600, 700].map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Line height">
                    <NumInput
                      value={selectedItem.lineHeight}
                      min={0.9}
                      max={2.4}
                      step={0.05}
                      onCommit={(lineHeight) =>
                        updateSelected((item) => ({ ...item, lineHeight }))
                      }
                    />
                  </Field>
                  <Field label="Tracking (em)">
                    <NumInput
                      value={selectedItem.letterSpacing}
                      min={-0.05}
                      max={0.3}
                      step={0.01}
                      onCommit={(letterSpacing) =>
                        updateSelected((item) => ({ ...item, letterSpacing }))
                      }
                    />
                  </Field>
                  <Field label="Align">
                    <select
                      value={selectedItem.align}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          align: event.target.value as 'left' | 'center' | 'right',
                        }))
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </Field>
                  <Field label="Color">
                    <input
                      type="color"
                      value={selectedItem.color}
                      onChange={(event) =>
                        updateSelected((item) => ({ ...item, color: event.target.value }))
                      }
                    />
                  </Field>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selectedItem.snapBaseline}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          snapBaseline: event.target.checked,
                        }))
                      }
                    />
                    Align to baseline grid
                  </label>
                  {selectedItem.snapBaseline && (
                    <p className="hint">
                      Line height rounds to whole baseline units and the first
                      baseline sits on the grid.
                    </p>
                  )}
                </section>
              )}

              {selectedItem.kind === 'shape' && (
                <section>
                  <h2>Shape</h2>
                  <Field label="Kind">
                    <select
                      value={selectedItem.shape}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          shape: event.target.value as 'rectangle' | 'ellipse' | 'line',
                        }))
                      }
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="ellipse">Ellipse</option>
                      <option value="line">Line</option>
                    </select>
                  </Field>
                  <Field label="Fill">
                    <input
                      type="color"
                      value={selectedItem.fill}
                      onChange={(event) =>
                        updateSelected((item) => ({ ...item, fill: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Radius (mm)">
                    <NumInput
                      value={selectedItem.radiusMm}
                      min={0}
                      max={20}
                      step={0.5}
                      onCommit={(radiusMm) =>
                        updateSelected((item) => ({ ...item, radiusMm }))
                      }
                    />
                  </Field>
                </section>
              )}

              {selectedItem.kind === 'image' && (
                <section>
                  <h2>Image</h2>
                  <Field label="Upload">
                    <input type="file" accept="image/*" onChange={onImageUpload} />
                  </Field>
                  <Field label="Fit">
                    <select
                      value={selectedItem.fit}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          fit: event.target.value as 'cover' | 'contain',
                        }))
                      }
                    >
                      <option value="cover">Cover</option>
                      <option value="contain">Contain</option>
                    </select>
                  </Field>
                  <Field label="Treat as logo">
                    <input
                      type="checkbox"
                      checked={selectedItem.isLogo}
                      onChange={(event) =>
                        updateSelected((item) => ({
                          ...item,
                          isLogo: event.target.checked,
                        }))
                      }
                    />
                  </Field>
                </section>
              )}

              {selectedItem.kind === 'table' && (
                <section>
                  <h2>Table</h2>
                  <Field label="Size (pt)">
                    <NumInput
                      value={selectedItem.sizePt}
                      min={5}
                      max={24}
                      step={0.5}
                      onCommit={(sizePt) =>
                        updateSelected((item) => ({ ...item, sizePt }))
                      }
                    />
                  </Field>
                  <Field label="Color">
                    <input
                      type="color"
                      value={selectedItem.color}
                      onChange={(event) =>
                        updateSelected((item) => ({ ...item, color: event.target.value }))
                      }
                    />
                  </Field>
                  <div className="button-row">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        updateSelected((item) =>
                          item.kind === 'table'
                            ? {
                                ...item,
                                rows: [...item.rows, { label: 'Label', value: 'Value' }],
                              }
                            : item,
                        )
                      }
                    >
                      Add row
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        updateSelected((item) =>
                          item.kind === 'table' && item.rows.length > 1
                            ? { ...item, rows: item.rows.slice(0, -1) }
                            : item,
                        )
                      }
                    >
                      Remove row
                    </button>
                  </div>
                  <p className="hint">Double-click the table to edit cells.</p>
                </section>
              )}
            </>
          )}
        </aside>
      </div>

      <footer className="statusbar">
        <span>
          {pageFormats[doc.format].label} · {doc.grid.columns} columns ·{' '}
          {doc.grid.baselineMm} mm baseline
        </span>
        <span>
          A labs experiment by{' '}
          <a href="https://stephanosue.com" target="_blank" rel="noopener noreferrer">
            Stephano Sue
          </a>
          {' · '}
          <a
            href="https://github.com/ql1max/layout-studio"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        </span>
      </footer>

      <div className="print-layer" aria-hidden="true">
        <style>{`@page { size: ${sheetW}mm ${sheetH}mm; margin: 0; }`}</style>
        {printPages.map((page) => (
          <div
            key={page.id}
            className="print-sheet"
            style={{ width: `${sheetW}mm`, height: `${sheetH}mm` }}
          >
            <div
              className="print-bleed"
              style={{
                left: `${markSpaceMm}mm`,
                top: `${markSpaceMm}mm`,
                width: `${printFormat.widthMm + 2 * bleedMm}mm`,
                height: `${printFormat.heightMm + 2 * bleedMm}mm`,
                background: page.background,
              }}
            >
              <div
                className="print-trim"
                style={{ left: `${bleedMm}mm`, top: `${bleedMm}mm` }}
              >
                <PageView doc={doc} page={page} />
              </div>
            </div>
            {cropMarkStyles.map((mark, index) => (
              <span key={index} className="crop-mark" style={mark} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
