# Layout Studio

A browser-based document layout studio. Grid-snapped components on millimeter-accurate pages, with a pan and zoom canvas, brand checking, and print-ready output with bleed and crop marks.

[Live demo](https://layout-studio.nostromohq.workers.dev)

## Stack

- Vite + React + TypeScript
- Cloudflare Workers Static Assets

## Architecture and toolchain

This is a local single-page Vite + React + TypeScript app: document editing, brand checks, and print/export state stay in the browser while Cloudflare Workers Static Assets serves `dist`. Use Node `24.18.0` and pnpm `11.21.0` exclusively, with pnpm as the sole installer, script entry point, and owner of the single `pnpm-lock.yaml`; Oxfmt `0.63.0` formats the project and Oxlint `1.77.0` lints it. Bun has no role in this repository, so it has no scripts, dependency, or lockfile. TanStack is intentionally not included; add it only when scope warrants routed, data, or server primitives.

## Getting started

```bash
pnpm install
pnpm run dev
```

## Checks and deployment

```bash
pnpm run check
pnpm run build
pnpm audit --audit-level=moderate
pnpm run deploy
```
