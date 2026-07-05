import { fontLibrary } from './model';
import type { Doc } from './model';

/* CMYK soft proof: flag very saturated, very bright RGB colors that
   typically shift when converted to CMYK. A heuristic, not color
   management - browsers can only output RGB. */

function hexChannels(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function cmykRisky(hex: string): boolean {
  const [r, g, b] = hexChannels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min > 170 && max > 215;
}

export function collectColors(doc: Doc): string[] {
  const colors = new Set<string>();
  for (const page of doc.pages) {
    colors.add(page.background.toLowerCase());
    for (const item of page.items) {
      if (item.kind === 'text' || item.kind === 'table') {
        colors.add(item.color.toLowerCase());
      }
      if (item.kind === 'shape') colors.add(item.fill.toLowerCase());
    }
  }
  return [...colors];
}

export type Violation = {
  pageIndex: number;
  itemId?: string;
  message: string;
};

const norm = (color: string) => color.trim().toLowerCase();

export function checkBrand(doc: Doc): Violation[] {
  const colors = new Set(doc.brand.colors.map(norm));
  const fonts = new Set(doc.brand.fonts);
  const violations: Violation[] = [];
  let hasLogo = false;

  doc.pages.forEach((page, pageIndex) => {
    if (!colors.has(norm(page.background))) {
      violations.push({
        pageIndex,
        message: `Background ${page.background} is off-palette`,
      });
    }

    for (const item of page.items) {
      if (item.kind === 'text') {
        if (!colors.has(norm(item.color))) {
          violations.push({
            pageIndex,
            itemId: item.id,
            message: `Text color ${item.color} is off-palette`,
          });
        }
        if (!fonts.has(item.font)) {
          violations.push({
            pageIndex,
            itemId: item.id,
            message: `${fontLibrary[item.font].label} is not a brand font`,
          });
        }
        if (item.sizePt < doc.brand.minBodyPt) {
          violations.push({
            pageIndex,
            itemId: item.id,
            message: `Text is ${item.sizePt}pt, below the ${doc.brand.minBodyPt}pt minimum`,
          });
        }
      }

      if (item.kind === 'shape' && !colors.has(norm(item.fill))) {
        violations.push({
          pageIndex,
          itemId: item.id,
          message: `Shape fill ${item.fill} is off-palette`,
        });
      }

      if (item.kind === 'table') {
        if (!colors.has(norm(item.color))) {
          violations.push({
            pageIndex,
            itemId: item.id,
            message: `Table color ${item.color} is off-palette`,
          });
        }
        if (!fonts.has(item.font)) {
          violations.push({
            pageIndex,
            itemId: item.id,
            message: `${fontLibrary[item.font].label} is not a brand font`,
          });
        }
      }

      if (item.kind === 'image' && item.isLogo) hasLogo = true;
    }
  });

  if (!hasLogo) {
    violations.push({
      pageIndex: 0,
      message: 'No logo placed. Mark an image as the logo.',
    });
  }

  return violations;
}
