# PickMe - AI Product Visibility Lab

PickMe tests whether AI shopping agents can reliably discover, understand, and
recommend an ecommerce product across the messy ways real shoppers communicate.

A merchant submits a Shopwise product URL and a natural buyer intent. PickMe
searches Amazon Fashion competitors, runs an AI discovery agent and 100-case
shopper stress test in parallel, streams the evidence path, ranks the target,
scores its metadata, recommends grounded fixes, and replays the same validation
suite after an evidence-preserving edit.

## What the project does

- Provides an Amazon-style storefront with five editable Fashion products.
- Searches a deployable 5,000-product SQLite FTS5 evaluation catalog.
- Runs `gpt-5.6-terra` for discovery, comparison, ranking and grounded fixes.
- Runs `gpt-5.6-luna` across four parallel batches of 25 shopper messages.
- Tests simple chat, Singlish, shorthand, constraints, ambiguity and context shifts.
- Streams safe reasoning summaries, environment actions and batch progress.
- Shows a five-product leaderboard and seven-step discovery trace.
- Scores Product-Data Completeness, Intent Coverage, Claim Quality and AI Visibility.
- Provides a red/green metadata diff and Amazon-style product-page preview.
- Replays the exact same 100 cases and compares score, rank and Top-5 coverage.
- Stores drafts and run history in browser `localStorage` for the local demo.

PickMe does not guarantee or manufacture a better rank. It preserves verified
product facts and explains when a competitor still provides stronger evidence.

## How to run it

Requirements:

- Node.js 22 or newer
- npm
- an OpenAI API key

Install dependencies and create the local environment file:

```bash
npm install
copy .env.example .env.local
```

On macOS or Linux, use:

```bash
cp .env.example .env.local
```

Add your OpenAI key to `.env.local`, then start the app:

```bash
npm run dev
```

Open:

- `http://localhost:3000` - PickMe evaluation workspace
- `http://localhost:3000/shop` - Shopwise demo storefront
- `http://localhost:3000/pitchdeck.html` - interactive pitch deck

Run the production checks with:

```bash
npm run lint
npm run build:next
```

Useful data commands:

```bash
npm run data:shop          # Regenerate five-product JSON from JSONL
npm run data:index-demo    # Rebuild the deployable 5,000-product catalog
npm run data:index-fashion # Rebuild the complete local Fashion index
npm run links:check        # Validate result links
```

## Setup and environment variables

Required:

```env
OPENAI_API_KEY=your_openai_api_key
```

Recommended model configuration:

```env
OPENAI_DISCOVERY_MODEL="gpt-5.6-terra"
OPENAI_DISCOVERY_EFFORT="high"
OPENAI_ADVERSARIAL_MODEL="gpt-5.6-luna"
OPENAI_ADVERSARIAL_EFFORT="low"
```

The embedded catalog works locally and on Vercel without a hosted database:

```env
CATALOG_DB_PATH="data/catalog/amazon-fashion-demo.sqlite"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

To run against the complete local Amazon Fashion index instead:

```env
CATALOG_DB_PATH="data/index/amazon-fashion.sqlite"
```

Optional hosted catalog backends:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
CATALOG_SEARCH_URL=
CATALOG_SEARCH_TOKEN=
```

Catalog lookup priority is protected search service, Turso, then SQLite.
Do not commit `.env.local` or any API/database tokens.

## Main technologies

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS,
  shadcn/Base UI and Lucide icons.
- **AI:** OpenAI Responses API, structured outputs, streaming reasoning summaries,
  GPT-5.6 Terra and GPT-5.6 Luna.
- **Search and data:** SQLite FTS5, Node SQLite, optional Turso/libSQL, Amazon
  Reviews 2023 Amazon Fashion metadata.
- **Deployment:** Vercel-compatible Next.js functions with a bundled 5.9 MB
  evaluation catalog.
- **Local persistence:** browser `localStorage` for drafts and evaluation history.

## Data and scale

- Five editable target products power the Shopwise storefront.
- The deployable corpus contains 5,000 stratified Fashion products.
- The complete local FTS5 index contains 826,050 unique Fashion records.
- `data/meta_Amazon_Fashion.jsonl` is managed with Git LFS.
- `data/index/amazon-fashion.sqlite` is generated locally and not committed.

## Project documentation

- [`summary.md`](summary.md) - architecture, development history and limitations.
- [`devpost.md`](devpost.md) - hackathon submission copy.
- [`public/pitchdeck.html`](public/pitchdeck.html) - interactive 12-slide pitch deck.
- `output/pdf/pickme-project-description.pdf` - concise judge-facing project PDF.
