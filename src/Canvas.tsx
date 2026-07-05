import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  MM,
  clampFrame,
  columnWidthMm,
  contentBox,
  fontLibrary,
  frameRectMm,
  pageFormats,
  rowCount,
} from './model';
import type { Doc, Frame, Item, Page, TableItem, TextItem } from './model';

export type Selection = { pageId: string; itemId: string } | null;

const PAGE_GAP_MM = 16;

export function pageOriginMm(doc: Doc, index: number): number {
  return index * (pageFormats[doc.format].widthMm + PAGE_GAP_MM);
}

/* ── Item rendering ──────────────────────────────────────── */

function TextView({
  item,
  editing,
  onCommit,
}: {
  item: TextItem;
  editing: boolean;
  onCommit: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const style: CSSProperties = {
    fontFamily: fontLibrary[item.font].stack,
    fontSize: `${item.sizePt}pt`,
    fontWeight: item.weight,
    lineHeight: item.lineHeight,
    letterSpacing: `${item.letterSpacing}em`,
    textAlign: item.align,
    color: item.color,
  };

  if (editing) {
    return (
      <div
        ref={ref}
        className="item-text is-editing"
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={(event) => onCommit(event.currentTarget.innerText)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') (event.target as HTMLElement).blur();
          event.stopPropagation();
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {item.text}
      </div>
    );
  }

  return (
    <div className="item-text" style={style}>
      {item.text}
    </div>
  );
}

function TableView({
  item,
  editing,
  onCellCommit,
}: {
  item: TableItem;
  editing: boolean;
  onCellCommit: (rowIndex: number, field: 'label' | 'value', text: string) => void;
}) {
  const style: CSSProperties = {
    fontFamily: fontLibrary[item.font].stack,
    fontSize: `${item.sizePt}pt`,
    color: item.color,
  };

  return (
    <div className="item-table" style={style}>
      {item.rows.map((row, index) => (
        <div className="item-table__row" key={index}>
          <span
            className="item-table__label"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onCellCommit(index, 'label', event.currentTarget.innerText)}
            onPointerDown={(event) => {
              if (editing) event.stopPropagation();
            }}
          >
            {row.label}
          </span>
          <span
            className="item-table__value"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(event) => onCellCommit(index, 'value', event.currentTarget.innerText)}
            onPointerDown={(event) => {
              if (editing) event.stopPropagation();
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function ItemBody({
  item,
  editing,
  onTextCommit,
  onCellCommit,
}: {
  item: Item;
  editing: boolean;
  onTextCommit: (text: string) => void;
  onCellCommit: (rowIndex: number, field: 'label' | 'value', text: string) => void;
}) {
  if (item.kind === 'text') {
    return <TextView item={item} editing={editing} onCommit={onTextCommit} />;
  }

  if (item.kind === 'shape') {
    if (item.shape === 'line') {
      return (
        <div className="item-line">
          <span style={{ background: item.fill }} />
        </div>
      );
    }
    return (
      <div
        className="item-shape"
        style={{
          background: item.fill,
          borderRadius: item.shape === 'ellipse' ? '50%' : `${item.radiusMm}mm`,
        }}
      />
    );
  }

  if (item.kind === 'image') {
    if (item.src) {
      return (
        <img
          className="item-image"
          src={item.src}
          alt=""
          style={{ objectFit: item.fit }}
          draggable={false}
        />
      );
    }
    return (
      <div className="item-image-placeholder">
        <span>{item.isLogo ? 'Logo' : 'Image'}</span>
      </div>
    );
  }

  return <TableView item={item} editing={editing} onCellCommit={onCellCommit} />;
}

/* ── Page rendering ──────────────────────────────────────── */

type PageInteraction = {
  selection: Selection;
  editingId: string | null;
  scale: number;
  onItemPointerDown: (page: Page, item: Item, event: ReactPointerEvent) => void;
  onHandlePointerDown: (
    page: Page,
    item: Item,
    handle: ResizeHandle,
    event: ReactPointerEvent,
  ) => void;
  onItemDoubleClick: (page: Page, item: Item) => void;
  onTextCommit: (page: Page, item: Item, text: string) => void;
  onCellCommit: (
    page: Page,
    item: Item,
    rowIndex: number,
    field: 'label' | 'value',
    text: string,
  ) => void;
};

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'se';

const handleList: ResizeHandle[] = ['n', 's', 'e', 'w', 'se'];

export function PageView({
  doc,
  page,
  interaction,
}: {
  doc: Doc;
  page: Page;
  interaction?: PageInteraction;
}) {
  const format = pageFormats[doc.format];
  const box = contentBox(doc.format, doc.grid);
  const colW = columnWidthMm(doc.format, doc.grid);
  const rows = rowCount(doc.format, doc.grid);
  const scale = interaction?.scale ?? 1;

  const overlayColumns = doc.overlay === 'columns' || doc.overlay === 'modular';
  const overlayBaseline = doc.overlay === 'baseline' || doc.overlay === 'modular';

  return (
    <div
      className="page"
      style={{
        width: `${format.widthMm}mm`,
        height: `${format.heightMm}mm`,
        background: page.background,
      }}
    >
      {(overlayColumns || overlayBaseline) && (
        <div
          className="page__grid"
          style={{
            left: `${box.x}mm`,
            top: `${box.y}mm`,
            width: `${box.w}mm`,
            height: `${rows * doc.grid.baselineMm}mm`,
            backgroundImage: [
              overlayColumns
                ? `repeating-linear-gradient(to right, rgba(70,110,255,0.08) 0, rgba(70,110,255,0.08) ${colW}mm, transparent ${colW}mm, transparent ${colW + doc.grid.gutterMm}mm)`
                : null,
              overlayBaseline
                ? `repeating-linear-gradient(to bottom, rgba(70,110,255,0.28) 0, rgba(70,110,255,0.28) 0.2mm, transparent 0.2mm, transparent ${doc.grid.baselineMm}mm)`
                : null,
            ]
              .filter(Boolean)
              .join(', '),
          }}
        />
      )}

      {page.items.map((item) => {
        const rect = frameRectMm(item.frame, doc.format, doc.grid);
        const selected =
          interaction?.selection?.pageId === page.id &&
          interaction?.selection?.itemId === item.id;
        const editing = interaction?.editingId === item.id;

        return (
          <div
            key={item.id}
            className={`page-item ${selected ? 'is-selected' : ''}`}
            style={{
              left: `${rect.x}mm`,
              top: `${rect.y}mm`,
              width: `${rect.w}mm`,
              height: `${rect.h}mm`,
              ...(selected
                ? ({ '--ring': `${1.5 / scale}px` } as CSSProperties)
                : null),
            }}
            onPointerDown={
              interaction && !editing
                ? (event) => interaction.onItemPointerDown(page, item, event)
                : undefined
            }
            onDoubleClick={
              interaction ? () => interaction.onItemDoubleClick(page, item) : undefined
            }
          >
            <ItemBody
              item={item}
              editing={Boolean(editing)}
              onTextCommit={(text) => interaction?.onTextCommit(page, item, text)}
              onCellCommit={(rowIndex, field, text) =>
                interaction?.onCellCommit(page, item, rowIndex, field, text)
              }
            />

            {selected && !editing && interaction && (
              <>
                {handleList.map((handle) => (
                  <span
                    key={handle}
                    className={`handle handle--${handle}`}
                    style={{
                      width: `${9 / scale}px`,
                      height: `${9 / scale}px`,
                    }}
                    onPointerDown={(event) =>
                      interaction.onHandlePointerDown(page, item, handle, event)
                    }
                  />
                ))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Canvas (pan / zoom / drag) ──────────────────────────── */

type Transform = { x: number; y: number; scale: number };

type DragState =
  | { type: 'pan'; startX: number; startY: number; origin: Transform }
  | {
      type: 'move';
      pageId: string;
      itemId: string;
      startX: number;
      startY: number;
      startFrame: Frame;
    }
  | {
      type: 'resize';
      pageId: string;
      itemId: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      startFrame: Frame;
    };

export function CanvasView({
  doc,
  selection,
  editingId,
  onSelect,
  onEdit,
  updateItemFrame,
  beginTransaction,
  endTransaction,
  onTextCommit,
  onCellCommit,
  onAddPage,
  focusPageIndex,
}: {
  doc: Doc;
  selection: Selection;
  editingId: string | null;
  onSelect: (selection: Selection) => void;
  onEdit: (itemId: string | null) => void;
  updateItemFrame: (pageId: string, itemId: string, frame: Frame) => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  onTextCommit: (pageId: string, itemId: string, text: string) => void;
  onCellCommit: (
    pageId: string,
    itemId: string,
    rowIndex: number,
    field: 'label' | 'value',
    text: string,
  ) => void;
  onAddPage: () => void;
  focusPageIndex: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 60, y: 40, scale: 0.5 });
  const dragRef = useRef<DragState | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const format = pageFormats[doc.format];

  const fitPage = (index: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pageW = format.widthMm * MM;
    const pageH = format.heightMm * MM;
    const scale = Math.min((rect.width - 120) / pageW, (rect.height - 80) / pageH);
    const originX = pageOriginMm(doc, index) * MM;
    setTransform({
      scale,
      x: (rect.width - pageW * scale) / 2 - originX * scale,
      y: (rect.height - pageH * scale) / 2,
    });
  };

  // Fit on mount and when the focused page changes from outside (thumbnails).
  const focusRef = useRef(-1);
  useEffect(() => {
    if (focusRef.current !== focusPageIndex) {
      focusRef.current = focusPageIndex;
      fitPage(focusPageIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPageIndex, doc.format]);

  // Wheel: scroll pans, ctrl/cmd + scroll zooms toward the cursor.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = transformRef.current;
      if (event.ctrlKey || event.metaKey) {
        const rect = container.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;
        const factor = Math.exp(-event.deltaY * 0.0022);
        const scale = Math.min(4, Math.max(0.08, current.scale * factor));
        const ratio = scale / current.scale;
        setTransform({
          scale,
          x: cx - (cx - current.x) * ratio,
          y: cy - (cy - current.y) * ratio,
        });
      } else {
        setTransform({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scale = transformRef.current.scale;

    if (drag.type === 'pan') {
      setTransform({
        ...drag.origin,
        x: drag.origin.x + (event.clientX - drag.startX),
        y: drag.origin.y + (event.clientY - drag.startY),
      });
      return;
    }

    const dxMm = (event.clientX - drag.startX) / (MM * scale);
    const dyMm = (event.clientY - drag.startY) / (MM * scale);
    const colStep = columnWidthMm(doc.format, doc.grid) + doc.grid.gutterMm;
    const dCols = Math.round(dxMm / colStep);
    const dRows = Math.round(dyMm / doc.grid.baselineMm);
    const start = drag.startFrame;
    let frame: Frame;

    if (drag.type === 'move') {
      frame = { ...start, col: start.col + dCols, row: start.row + dRows };
    } else {
      frame = { ...start };
      const h = drag.handle;
      if (h === 'e' || h === 'se') frame.colSpan = start.colSpan + dCols;
      if (h === 's' || h === 'se') frame.rowSpan = start.rowSpan + dRows;
      if (h === 'w') {
        const shift = Math.min(dCols, start.colSpan - 1);
        frame.col = start.col + shift;
        frame.colSpan = start.colSpan - shift;
      }
      if (h === 'n') {
        const shift = Math.min(dRows, start.rowSpan - 1);
        frame.row = start.row + shift;
        frame.rowSpan = start.rowSpan - shift;
      }
    }

    updateItemFrame(drag.pageId, drag.itemId, clampFrame(frame, doc.format, doc.grid));
  };

  const onPointerUp = () => {
    if (dragRef.current && dragRef.current.type !== 'pan') endTransaction();
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  const startDrag = (state: DragState) => {
    dragRef.current = state;
    if (state.type !== 'pan') beginTransaction();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const interaction: PageInteraction = {
    selection,
    editingId,
    scale: transform.scale,
    onItemPointerDown: (page, item, event) => {
      event.stopPropagation();
      onSelect({ pageId: page.id, itemId: item.id });
      if (editingId && editingId !== item.id) onEdit(null);
      startDrag({
        type: 'move',
        pageId: page.id,
        itemId: item.id,
        startX: event.clientX,
        startY: event.clientY,
        startFrame: { ...item.frame },
      });
    },
    onHandlePointerDown: (page, item, handle, event) => {
      event.stopPropagation();
      startDrag({
        type: 'resize',
        pageId: page.id,
        itemId: item.id,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startFrame: { ...item.frame },
      });
    },
    onItemDoubleClick: (page, item) => {
      if (item.kind === 'text' || item.kind === 'table') {
        onSelect({ pageId: page.id, itemId: item.id });
        onEdit(item.id);
      }
    },
    onTextCommit: (page, item, text) => {
      onEdit(null);
      onTextCommit(page.id, item.id, text);
    },
    onCellCommit: (page, item, rowIndex, field, text) =>
      onCellCommit(page.id, item.id, rowIndex, field, text),
  };

  return (
    <div
      ref={containerRef}
      className="canvas"
      onPointerDown={(event) => {
        onSelect(null);
        onEdit(null);
        startDrag({
          type: 'pan',
          startX: event.clientX,
          startY: event.clientY,
          origin: transformRef.current,
        });
      }}
    >
      <div
        className="canvas__world"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        }}
      >
        {doc.pages.map((page, index) => (
          <div
            key={page.id}
            className="canvas__page"
            style={{ left: `${pageOriginMm(doc, index) * MM}px` }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span
              className="canvas__page-label"
              style={{
                fontSize: `${Math.min(48, 12 / transform.scale)}px`,
              }}
            >
              {index + 1} / {doc.pages.length} · {format.label}
            </span>
            <PageView doc={doc} page={page} interaction={interaction} />
          </div>
        ))}

        <button
          type="button"
          className="canvas__add-page"
          style={{
            left: `${pageOriginMm(doc, doc.pages.length) * MM}px`,
            top: `${(format.heightMm / 2) * MM}px`,
            transform: `translateY(-50%) scale(${1 / transform.scale})`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onAddPage}
          aria-label="Add page"
        >
          +
        </button>
      </div>

      <div className="canvas__zoom" onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() =>
            setTransform((t) => ({ ...t, scale: Math.max(0.08, t.scale / 1.25) }))
          }
        >
          −
        </button>
        <span>{Math.round(transform.scale * 100)}%</span>
        <button
          type="button"
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(4, t.scale * 1.25) }))}
        >
          +
        </button>
        <button type="button" onClick={() => fitPage(focusPageIndex)}>
          Fit
        </button>
        <button
          type="button"
          onClick={() => setTransform((t) => ({ ...t, scale: 1 }))}
          title="True size on a 96 dpi display"
        >
          100%
        </button>
      </div>
    </div>
  );
}
