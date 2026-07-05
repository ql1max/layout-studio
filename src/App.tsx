import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  pageFormats,
  products,
  themes,
} from './sheets';
import type { HeroMotif, PageFormat, ProductSheet, SheetTheme } from './sheets';
import './index.css';

const zoomLevels = [50, 65, 80, 100] as const;

function HeroVisual({ motif }: { motif: HeroMotif }) {
  if (motif === 'arcs') {
    return (
      <svg className="hero-svg" viewBox="0 0 600 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle
            key={i}
            cx="470"
            cy="200"
            r={40 + i * 34}
            fill="none"
            stroke="currentColor"
            strokeWidth={i === 2 ? 3 : 1.25}
            opacity={0.9 - i * 0.13}
          />
        ))}
        <circle cx="470" cy="200" r="14" fill="currentColor" />
      </svg>
    );
  }

  if (motif === 'dots') {
    const dots = [];
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 20; col += 1) {
        dots.push(
          <circle
            key={`${row}-${col}`}
            cx={24 + col * 30}
            cy={26 + row * 28}
            r={1.2 + ((row + col) % 5) * 1.1}
            fill="currentColor"
            opacity={0.35 + ((col + row) % 4) * 0.18}
          />,
        );
      }
    }
    return (
      <svg className="hero-svg" viewBox="0 0 600 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {dots}
      </svg>
    );
  }

  return (
    <svg className="hero-svg" viewBox="0 0 600 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={`M -10 ${70 + i * 24} C 120 ${20 + i * 24}, 240 ${120 + i * 24}, 360 ${64 + i * 24} S 560 ${100 + i * 24}, 620 ${58 + i * 24}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={i === 1 ? 2.5 : 1.25}
          opacity={0.85 - i * 0.18}
        />
      ))}
    </svg>
  );
}

function Sheet({
  product,
  theme,
  format,
  showGuides,
}: {
  product: ProductSheet;
  theme: SheetTheme;
  format: PageFormat;
  showGuides: boolean;
}) {
  const geometry = pageFormats[format];
  const sheetVars = {
    '--ps-page': theme.page,
    '--ps-panel': theme.panel,
    '--ps-text': theme.text,
    '--ps-muted': theme.muted,
    '--ps-accent': theme.accent,
    '--ps-accent-ink': theme.accentInk,
    '--ps-rule': theme.rule,
    '--ps-heading-font':
      theme.headingFont === 'serif'
        ? "Georgia, 'Times New Roman', serif"
        : 'inherit',
    width: `${geometry.widthMm}mm`,
    height: `${geometry.heightMm}mm`,
  } as CSSProperties;

  return (
    <div className="sheet" style={sheetVars}>
      {showGuides && <div className="sheet__guides" aria-hidden="true" />}

      <header className="ps-masthead">
        <span className="ps-brand">{product.brand}</span>
        <span className="ps-meta">
          {product.category} · {product.sku}
        </span>
      </header>

      <div className="ps-title">
        <h2>{product.name}</h2>
        <p>{product.tagline}</p>
      </div>

      <div className="ps-hero">
        <HeroVisual motif={product.heroMotif} />
      </div>

      <div className="ps-body">
        <div className="ps-main">
          <p className="ps-intro">{product.intro}</p>
          <div className="ps-features">
            {product.features.map((feature) => (
              <div className="ps-feature" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="ps-side">
          <h3 className="ps-side__heading">Specifications</h3>
          <dl className="ps-specs">
            {product.specs.map((spec) => (
              <div key={spec.label}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
          <div className="ps-price">
            <span className="ps-price__label">{product.price.label}</span>
            <span className="ps-price__value">{product.price.value}</span>
            <span className="ps-price__note">{product.price.note}</span>
          </div>
        </aside>
      </div>

      <footer className="ps-footer">
        <span>{product.contact.company}</span>
        <span>
          {product.contact.web} · {product.contact.email}
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  const [productId, setProductId] = useState(products[0].id);
  const [themeName, setThemeName] = useState(themes[0].name);
  const [format, setFormat] = useState<PageFormat>('a4');
  const [zoom, setZoom] = useState<(typeof zoomLevels)[number]>(65);
  const [showGuides, setShowGuides] = useState(false);

  const product = products.find((p) => p.id === productId) ?? products[0];
  const theme = themes.find((t) => t.name === themeName) ?? themes[0];
  const geometry = pageFormats[format];

  return (
    <div className="app">
      <style>{`@page { size: ${geometry.cssSize}; margin: 0; }`}</style>

      <header className="topbar">
        <div>
          <h1>Product Sheet Creator</h1>
          <p>
            A millimeter-accurate {geometry.label} page, rendered by the
            browser and ready for print.
          </p>
        </div>
        <button type="button" className="print-button" onClick={() => window.print()}>
          Export PDF
        </button>
      </header>

      <div className="layout">
        <aside className="controls">
          <section aria-labelledby="template-heading">
            <h2 id="template-heading">Template</h2>
            <div className="option-list" role="group" aria-label="Template">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`option ${p.id === productId ? 'is-active' : ''}`}
                  onClick={() => setProductId(p.id)}
                >
                  <span>{p.name}</span>
                  <small>{p.category}</small>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="theme-heading">
            <h2 id="theme-heading">Theme</h2>
            <div className="swatch-row" role="group" aria-label="Theme">
              {themes.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={`swatch ${t.name === themeName ? 'is-active' : ''}`}
                  onClick={() => setThemeName(t.name)}
                  aria-label={`Theme: ${t.name}`}
                  title={t.name}
                >
                  <span
                    className="swatch__chip"
                    style={{ background: t.page, borderColor: t.rule }}
                  >
                    <span style={{ background: t.accent }} />
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="format-heading">
            <h2 id="format-heading">Page</h2>
            <div className="segmented" role="group" aria-label="Page format">
              {(Object.keys(pageFormats) as PageFormat[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={format === key ? 'is-active' : ''}
                  onClick={() => setFormat(key)}
                >
                  {pageFormats[key].label}
                </button>
              ))}
            </div>
            <p className="dimension-note">
              {geometry.widthMm} x {geometry.heightMm} mm
            </p>

            <label className="toggle">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(event) => setShowGuides(event.target.checked)}
              />
              Show 12 mm margin guides
            </label>
          </section>

          <section aria-labelledby="zoom-heading">
            <h2 id="zoom-heading">Zoom</h2>
            <div className="segmented" role="group" aria-label="Zoom">
              {zoomLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  className={zoom === level ? 'is-active' : ''}
                  onClick={() => setZoom(level)}
                >
                  {level}%
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading">About</h2>
            <p className="about-note">
              Phase one of a print-aware document tool. The page is laid out in
              physical units, so what you see at 100 percent is what the
              printer gets. Editing and custom content are next.
            </p>
          </section>
        </aside>

        <main className="stage">
          <div
            className="page-scaler"
            style={{ '--zoom': zoom / 100 } as CSSProperties}
          >
            <Sheet
              product={product}
              theme={theme}
              format={format}
              showGuides={showGuides}
            />
          </div>
        </main>
      </div>

      <footer className="footer">
        <p>
          A labs experiment by{' '}
          <a href="https://stephanosue.com" target="_blank" rel="noopener noreferrer">
            Stephano Sue
          </a>
          {' · '}
          <a
            href="https://github.com/ql1max/product-sheet-creator"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
