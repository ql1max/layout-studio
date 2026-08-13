# Layout Studio

A browser-based document layout studio. Grid-snapped components on millimeter-accurate pages, with a pan and zoom canvas, brand checking, and print-ready output with bleed and crop marks.

## Stack

- Vite + React + TypeScript
- Cloudflare Workers Static Assets

## Architecture and toolchain

This is a local single-page app: document editing, brand checks, and print/export state stay in the browser while Cloudflare Workers Static Assets serves `dist`. Use pnpm `11.21.0` exclusively for installs and scripts, with one `pnpm-lock.yaml`. Bun has no role in this repository, so it has no scripts, dependency, or lockfile. TanStack is intentionally not included; add it only when scope warrants routed, data, or server primitives.

## Getting started

```bash
pnpm install
pnpm run dev
```

## Checks and deployment

```bash
pnpm run check
pnpm run build
pnpm run deploy
```
