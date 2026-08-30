# PickMe Project Summary

## Executive summary

PickMe is an AI product-visibility lab for ecommerce teams. It tests whether an AI shopping agent can discover, understand, compare, and recommend a product when shoppers describe the same need in messy, incomplete, colloquial, or changing language.

The project combines a five-product Amazon-style storefront with a merchant evaluation workspace. A merchant submits a Shopwise product URL and a natural buyer intent. PickMe retrieves competing Amazon Fashion products, runs a reasoning-heavy discovery agent and a 100-case shopper stress test in parallel, exposes an auditable evidence path, scores the listing, recommends grounded metadata changes, and reruns the same validation suite after edits.

The core principle is not to manipulate an AI into recommending an unsuitable product. PickMe improves the visibility of facts that are already supported by the product record and makes exclusions explainable.

## Problem

Traditional ecommerce listings are written for keyword search and human browsing. Conversational shopping introduces a longer decision chain:

1. Interpret an incomplete shopper request.
2. Decide what needs clarification.
3. Retrieve plausible products.
4. Inspect product evidence and constraints.
5. Compare alternatives.
6. Rank and recommend.

A suitable product can disappear at any stage because the listing is incomplete, ambiguous, difficult to retrieve, or weaker than a competitor's evidence. Merchants currently have little visibility into where or why this happens.

## Product experience

### 1. AI-accessible storefront

PickMe includes five complete Amazon Fashion demo products under `/shop`, with Amazon-style detail routes at `/shop/dp/[asin]`. Dataset-backed catalog evidence pages are available at `/shop/catalog/[asin]`, so ranked competitors remain reviewable even when an old Amazon URL is unavailable.

The five scenarios cover:

- beach sandals;
- calf compression sleeves for long nursing shifts;
- a low-cost tie-dye sweatshirt with pockets;
- a vintage music and Volkswagen tribute T-shirt;
- versatile office and formal pumps.

### 2. Evaluation input

The merchant provides:

- a URL for one of the Shopwise product pages; and
- a natural-language shopper intent.

The preset intents are deliberately broad. They do not contain the exact product name or every ideal attribute, which prevents the target product from automatically ranking first.

### 3. Retrieval and comparison

The application extracts intent terms and runs weighted SQLite FTS5 retrieval. The submitted product is inserted into the evidence shortlist without receiving first-position advantage. OpenAI receives only the shortlisted product evidence for final judgment.

The deployable catalog contains 5,000 stratified Amazon Fashion products and is approximately 5.9 MB. It guarantees the five target ASINs and retains strong competitors around each scenario. A complete local index of 826,050 unique Amazon Fashion records remains available for full-corpus experiments.

### 4. Parallel AI evaluation

Two branches run concurrently:

- **Discovery agent — `gpt-5.6-terra`, high reasoning:** clarifies known and missing requirements, searches and inspects candidates, compares evidence, creates a seven-checkpoint discovery path, ranks the target, and proposes grounded fixes.
- **Shopper simulator — `gpt-5.6-luna`, low reasoning:** evaluates 100 human-style messages in four parallel batches of 25.

The 100 cases cover six writing patterns:

- plain and simple chat;
- natural Singapore English;
- shorthand and realistic typos;
- constraint-heavy requests;
- ambiguous requests;
- context or preference shifts.

Cases also cover vague openings, clarification replies, constraint reveals, preference shifts, and purchase refusals.

### 5. Live agent observability

The evaluation endpoint streams newline-delimited JSON events. The interface renders:

- processing stages;
- safe OpenAI reasoning summaries;
- environment actions;
- evidence inspected;
- discovery-structure validation;
- stress-batch progress;
- final merge and score calculation.

PickMe does not expose private raw chain-of-thought. It presents model-provided reasoning summaries and application-level actions that are appropriate for an auditable product workflow.

### 6. Results

The result workspace includes:

- the target's rank and a five-product leaderboard;
- competitor effects and decisive signals;
- 100 adversarial outcomes with filters and pagination;
- a seven-step discovery trace;
- metadata recommendations;
- a score out of 100.

The four score dimensions are each worth 25 points:

1. Product-Data Completeness.
2. Query and Intent Coverage.
3. Claim Specificity and Verifiability.
4. AI Visibility.

### 7. Evidence-preserving optimisation

Recommended edits are staged in a draft editor with a red/green before-and-after comparison and a product-page preview. Description, feature, and detail changes merge with existing verified content instead of replacing it.

The application repairs drafts created by an earlier destructive merge bug, removes operator instructions accidentally stored as customer-facing metadata, and preserves original Amazon evidence. Saving updates the product data and reruns the evaluation.

### 8. Controlled validation

A rerun reuses the exact same 100 shopper messages. The server enforces the original prompt, category, disclosure stage, and revealed/withheld information; only ranks, verdicts, top picks, and reasons are reevaluated against the revised metadata.

The interface compares:

- previous and current PickMe scores;
- previous and current primary rank;
- Top-5 coverage across the same 100 cases.

Rank improvement is not artificially guaranteed. If competitors still fit the intent better, PickMe explains the remaining evidence gap.

## Data architecture

The source is the McAuley Lab Amazon Reviews 2023 Amazon Fashion metadata dataset. Reviews and image binaries are excluded from the search corpus.

Important data assets:

- `data/meta_Amazon_Fashion.jsonl` — complete Amazon Fashion metadata source, managed with Git LFS.
- `data/index/amazon-fashion.sqlite` — local 826,050-product FTS5 index; intentionally not committed.
- `data/catalog/amazon-fashion-demo.sqlite` — 5,000-product deployable FTS5 catalog.
- `data/amazon_fashion_5_complete_records.jsonl` — editable source for the five storefront products.
- `data/amazon_fashion_5_complete_records.json` — generated storefront data.

Catalog lookup priority:

1. protected `CATALOG_SEARCH_URL`, when configured;
2. Turso/libSQL, when configured;
3. embedded or local SQLite via `CATALOG_DB_PATH`.

For the current Vercel demo, the embedded 5,000-product SQLite catalog is the simplest option and requires no hosted database.

## Persistence

Run history, draft state, intent, and run counters are stored in browser `localStorage`. This supports local demos without authentication or a shared database. A future multi-user version should move run history and merchant drafts to durable hosted storage.

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- OpenAI Responses API with structured outputs and streaming
- `gpt-5.6-terra` and `gpt-5.6-luna`
- SQLite FTS5 via Node SQLite
- optional Turso/libSQL integration
- shadcn/Base UI components
- Vercel-compatible server functions

## Important routes

- `/` — PickMe merchant evaluation workspace.
- `/shop` — Amazon-style demo storefront.
- `/shop/dp/[asin]` — editable target product page.
- `/shop/catalog/[asin]` — dataset-backed competitor evidence page.
- `/shop/catalog.json` — machine-readable storefront catalog.
- `/api/evaluate` — streamed evaluation orchestrator.
- `/api/products/[asin]/metadata` — product metadata update endpoint.
- `/pitchdeck.html` — interactive pitch deck.

## Environment variables

Required:

```env
OPENAI_API_KEY=
OPENAI_DISCOVERY_MODEL="gpt-5.6-terra"
OPENAI_DISCOVERY_EFFORT="high"
OPENAI_ADVERSARIAL_MODEL="gpt-5.6-luna"
OPENAI_ADVERSARIAL_EFFORT="low"
```

Default embedded catalog:

```env
CATALOG_DB_PATH="data/catalog/amazon-fashion-demo.sqlite"
```

Optional remote catalog:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
CATALOG_SEARCH_URL=
CATALOG_SEARCH_TOKEN=
```

## Common commands

```bash
npm install
npm run dev
npm run data:index-fashion
npm run data:index-demo
npm run data:shop
npm run links:check
npm run lint
npm run build:next
```

## Development history

1. Extracted Amazon Fashion product metadata from Amazon Reviews 2023.
2. Added Git LFS tracking for the 1.3 GB metadata JSONL.
3. Built five Amazon-style product pages under `/shop/dp/[asin]`.
4. Added a PickMe homepage accepting a product URL and shopper intent.
5. Implemented full-catalog FTS5 retrieval, evidence shortlisting, leaderboard ranking, discovery traces, four metrics, and metadata fixes.
6. Expanded adversarial testing from 30 to 100 cases with Singlish, shorthand, ambiguity, constraints, and context shifts.
7. Added streaming progress and safe real-time reasoning summaries for Terra and Luna branches.
8. Added localStorage run history and interactive before/after metadata editing.
9. Added dataset-backed competitor pages and automated result-link validation.
10. Added optional Turso and protected search-service adapters.
11. Replaced the oversized hosted database requirement with a stratified 5,000-product embedded catalog for Vercel.
12. Fixed destructive metadata replacement, restored verified facts, and added controlled replay of the same 100 tests.

## Validation completed

- TypeScript compilation passes.
- ESLint passes.
- Next.js production build passes.
- The deployable catalog contains exactly 5,000 records and all five target ASINs.
- The embedded database is included in the `/api/evaluate` production trace.
- A prior live run produced 100 unique stress cases across four completed batches.
- Dataset-backed product result links and the five target product links have been checked.

## Current limitations

- The 5,000-product deployable corpus is a representative evaluation catalog, not the full 826,050-product universe.
- Scores and semantic ranking still depend on model judgment; controlled replay reduces test drift but does not make LLM output mathematically deterministic.
- Product edits are persisted to local project files in compatible environments and browser state locally; durable collaborative storage is not yet implemented.
- The current demo supports five merchant products.
- The evaluation is text-and-metadata based; product images are shown but are not yet evaluated multimodally.

## Recommended next steps

1. Add authenticated merchant workspaces and durable run storage.
2. Store immutable test-suite IDs and evaluation versions for longitudinal comparison.
3. Add multi-model and multi-provider benchmarking.
4. Add confidence intervals and repeat sampling for ranking stability.
5. Support Shopify or product-feed ingestion.
6. Add evidence approval workflows for new claims.
7. Add multimodal image and accessibility evaluation.
8. Move the full catalog to a paid search or Postgres service when production-scale evaluation is required.

## Positioning

PickMe is best described as:

> An AI-commerce observability and adversarial testing layer that shows merchants whether shopping agents can reliably understand and recommend their products—and what verified evidence to improve when they cannot.

