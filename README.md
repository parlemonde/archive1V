# archive1V

Scrapes and archives the [1Village](https://1v.parlemonde.org) web app into a static, offline-browsable HTML site. Uses Puppeteer (headless Chrome) to log in, crawl villages/activities, download all resources (CSS, images, fonts, media), and rewrite URLs to local paths.

## Usage

```bash
node src/main.ts
```

The script computes the current school year automatically (e.g. `2025-2026` for dates >= September). Output goes to `dist/{schoolYear}/` (e.g. `dist/2025-2026/`).

### Environment

Create a `.env` file or set the following variables:

| Variable | Required | Description |
|---|---|---|
| `USERNAME` | yes | 1Village login email |
| `PASSWORD` | yes | 1Village login password |
| `AWS_S3_BUCKET` | no | S3 bucket to upload the archive to |
| `AWS_ACCESS_KEY_ID` | if uploading | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | if uploading | AWS secret key |
| `AWS_REGION` | no | AWS region (default: `eu-west-3`) |
| `AWS_SESSION_TOKEN` | no | Temporary session token (e.g. from STS) |

When `AWS_S3_BUCKET` is set, the archive is uploaded to `s3://<bucket>/archives/<schoolYear>/` after scraping completes.

## Commands

```bash
pnpm run lint       # ESLint check
pnpm run lint:fix   # ESLint auto-fix
pnpm run typecheck  # TypeScript type-check (no emit)
```

## GitHub Actions

The repository includes a [manual workflow](.github/workflows/archive.yml) that runs the archiver on `ubuntu-latest`. Trigger it from the **Actions** tab in GitHub. It expects the same variables as [GitHub Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

## Architecture

| File | Responsibility |
|---|---|
| `src/main.ts` | Entry point. Launches Puppeteer, logs in, fetches villages, orchestrates archiving, generates index, optionally uploads to S3. |
| `src/archive-village.ts` | Archives one village across all 3 phases. Sets `village-id` cookie, crawls pages, follows activity links depth-first. |
| `src/archive-activity.ts` | Archives a single activity page. |
| `src/go-to-page.ts` | Navigates to a URL, auto-scrolls for lazy content, inlines CSS, removes noisy UI elements. |
| `src/html.ts` | Transforms scraped HTML: strips `<script>`, rewrites asset URLs to local paths, rewrites `<a>` links, updates phase/village nav. Returns discovered activity paths for crawling. |
| `src/resources.ts` | Intercepts Puppeteer HTTP responses, saves images/fonts/media/CSS as UUID-named files in `ressources/`, processes CSS through `processCssContent`. |
| `src/css.ts` | Processes CSS `url()` references: fetches missing resources and rewrites to local paths. |
| `src/generateIndex.ts` | Generates `index.html` from `src/index.html` template, populating village links. |
| `src/aws.ts` | Uploads a local directory to S3 using `aws4fetch`. |
| `src/ensure-dir.ts` | Small helper to `mkdir -p` if a directory doesn't exist. |
| `src/index.html` | HTML template for the archive index page. Contains `{{archiveYear}}` placeholder. |
