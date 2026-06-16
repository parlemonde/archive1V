# AGENTS.md

## Project overview

`archive1V` is a TypeScript tool that scrapes and archives the [1Village](https://1v.parlemonde.org) web app into a static, offline-browsable HTML site. It uses Puppeteer (headless Chrome) to log in, crawl villages/activities, download all resources (CSS, images, fonts, media), and rewrite URLs to local paths.

## Commands

```bash
pnpm run lint          # ESLint check
pnpm run lint:fix      # ESLint auto-fix
pnpm run typecheck     # TypeScript type-check (no emit)
```

To execute the archiver, run with `node`:

```bash
node src/main.ts
```

It requires a `.env` file with credentials (never commit this file):

```
USERNAME=<email>
PASSWORD=<password>
```

Output goes to `dist/{schoolYear}/` (e.g. `dist/2025-2026/`).

## Architecture

| File | Responsibility |
|---|---|
| `src/main.ts` | Entry point. Launches Puppeteer, logs in, fetches villages, orchestrates archiving, generates index. |
| `src/archive-village.ts` | Archives one village across all 3 phases. Sets `village-id` cookie, crawls pages, follows activity links depth-first. |
| `src/archive-activity.ts` | Archives a single activity page. |
| `src/go-to-page.ts` | Navigates to a URL, auto-scrolls for lazy content, inlines CSS, removes noisy UI elements. |
| `src/html.ts` | Transforms scraped HTML: strips `<script>`, rewrites asset URLs to local paths, rewrites `<a>` links, updates phase/village nav. Returns discovered activity paths for crawling. |
| `src/resources.ts` | Intercepts Puppeteer HTTP responses, saves images/fonts/media/CSS as UUID-named files in `ressources/`, processes CSS through `processCssContent`. |
| `src/css.ts` | Processes CSS `url()` references: fetches missing resources and rewrites to local paths. |
| `src/generateIndex.ts` | Generates `index.html` from `src/index.html` template, populating village links. |
| `src/ensure-dir.ts` | Small helper to `mkdir -p` if a directory doesn't exist. |
| `src/index.html` | HTML template for the archive index page. Contains `{{archiveYear}}` placeholder. |

## Code conventions

- **Module system**: ESM (`"type": "module"` in package.json). Use `.ts` extensions in imports.
- **Imports**: `import type` for type-only imports. Import ordering: builtin/external first, then parent/sibling, with a blank line between groups, alphabetized.
- **Formatting**: Prettier with 4-space tabs, single quotes, trailing commas, 150-char print width.
- **No `console.log`**: Only `console.warn`, `console.error`, and `console.info` are allowed.
- **camelCase**: Required for all identifiers.
- **TypeScript**: Strict mode. Explicit function return types are optional. Unused vars must be prefixed with `_`.
- **Editor**: VS Code configured with format-on-save via ESLint.

## Key patterns

- **Resource caching**: A shared `Record<string, string>` map tracks all downloaded resources (URL → local path). This avoids re-downloading the same image/CSS across multiple pages.
- **Activity crawling**: `exportHTML()` returns activity paths found in links, which are queued for archiving. The `visitedActivities` set prevents duplicates.
- **Headless execution**: Puppeteer runs in `headless: true` mode. Credentials come from environment variables.
- **CSS inlining**: In `go-to-page.ts`, all stylesheet rules are extracted and appended as a `<style>` tag so they survive the removal of external `<link>` references.
- **Cookie-based village switching**: The `village-id` cookie is set to switch between villages without re-logging in.
