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

## How to archive

The recommended way to archive is via GitHub Actions. The repository includes a [manual workflow](.github/workflows/archive.yml) – go to the **Actions** tab in GitHub, select **Archive**, and click **Run workflow**.

### Required secrets

Set these in the repository's **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `USERNAME` | 1Village login email |
| `PASSWORD` | 1Village login password |

### Optional secrets (S3 upload)

If you want the archive uploaded to S3 after scraping, also set:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (default: `eu-west-3`) |
| `AWS_S3_BUCKET` | S3 bucket name (e.g. `my-bucket`) |

When `AWS_S3_BUCKET` is set, the archive is uploaded to `s3://<bucket>/archives/<schoolYear>/`.
