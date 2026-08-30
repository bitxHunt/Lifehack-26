# PickMe — AI Product Visibility Lab

## Inspiration

Shopping is moving from search boxes to conversations.

Instead of typing a perfect keyword query, a shopper might ask:

> "What can I wear to help with tired legs during long nursing shifts?"

An AI shopping agent now has to interpret that request, decide what is missing, search a catalog, inspect product evidence, compare alternatives, and choose what deserves to be recommended.

That creates a new problem for merchants: a product can genuinely fit the shopper but still disappear because its listing is incomplete, ambiguous, difficult to retrieve, or less verifiable than a competitor's page.

Merchants can measure search rankings and page traffic, but they cannot easily answer:

> If our product genuinely fits the need, will an AI shopping agent consistently understand and recommend it across the messy ways people actually talk?

We built PickMe to answer that question.

## What it does

PickMe is an adversarial testing and observability platform for AI commerce.

A merchant submits a product URL from our Shopwise storefront and a natural shopper intent. PickMe then:

1. searches a catalog of Amazon Fashion metadata;
2. retrieves and deduplicates likely competitors;
3. runs a discovery agent and a simulated-shopper stress test in parallel;
4. exposes the evidence path that moved the product up or down;
5. calculates a PickMe score and product leaderboard;
6. recommends evidence-grounded metadata fixes;
7. lets the merchant edit and preview the listing; and
8. replays the exact same validation suite to measure the change.

The stress branch evaluates **100 shopper messages** in four parallel batches. It covers plain chat, Singapore English, shorthand and typos, constraint-heavy requests, ambiguity, and context shifts. It also simulates different moments in a shopping conversation: vague openings, clarification replies, constraint reveals, preference changes, and purchase refusals.

The discovery branch exposes seven auditable checkpoints across clarification, search, inspection, comparison, verification, and recommendation. We show safe model-provided reasoning summaries and observable actions—not private raw chain-of-thought.

PickMe scores each listing across four dimensions, each worth 25 points:

- **Product-Data Completeness**
- **Query and Intent Coverage**
- **Claim Specificity and Verifiability**
- **AI Visibility**

The merchant can inspect a red/green metadata diff and an Amazon-style page preview before saving. Description, feature, and detail improvements merge with verified evidence instead of deleting it.

On rerun, PickMe reuses the exact same 100 messages and enforces their wording, category, dialogue stage, and information disclosure. The interface compares the previous and current score, primary rank, and Top-5 coverage.

Rank improvement is not guaranteed or faked. If another product still fits better, PickMe explains the remaining evidence gap.

## Our demo

We built an AI-accessible Amazon-style storefront with five Amazon Fashion products:

- beach sandals;
- calf compression sleeves;
- a budget tie-dye sweatshirt;
- a vintage music tribute T-shirt;
- office and formal pumps.

The preset shopper requests are intentionally broad, such as:

> "Need a vintage-looking T-shirt for a music fan, preferably not too expensive."

They avoid exact product titles and niche identifiers, so the submitted product does not automatically rank first.

Our deployable evaluation catalog contains **5,000 stratified Amazon Fashion products**. It guarantees the five target products and retains strong competitors around each scenario. For local full-corpus experiments, we also built an FTS5 index containing **826,050 unique Amazon Fashion records** from the Amazon Reviews 2023 dataset.

## How we built it

PickMe is a full-stack Next.js 16 application built with React 19, TypeScript, Tailwind CSS, and shadcn/Base UI components.

### Catalog and retrieval

We sourced product metadata from McAuley Lab's Amazon Reviews 2023 Amazon Fashion dataset. Reviews and image binaries are excluded from the retrieval corpus.

SQLite FTS5 performs weighted lexical retrieval across titles, brands, features, descriptions, details, and categories. The target product is inserted into the shortlist without receiving first-position advantage. Only the strongest evidence candidates are sent to OpenAI for semantic judgment.

The application supports three catalog backends:

1. a protected remote search service;
2. Turso/libSQL; or
3. embedded/local SQLite.

For the hackathon deployment, the 5.9 MB embedded catalog can ship directly with the Vercel function, so no external database is required.

### Agent architecture

We route work by capability:

- **`gpt-5.6-terra` with high reasoning effort** handles discovery, evidence comparison, ranking, the seven-step agent path, metrics, and grounded fixes.
- **`gpt-5.6-luna` with low reasoning effort** handles four parallel 25-case shopper-simulation batches.

The backend uses the OpenAI Responses API with structured outputs. It streams newline-delimited progress events, reasoning summaries, evidence events, batch completion, and the final result to the browser.

### Product editing and history

The five storefront products are editable through a metadata endpoint. The workspace includes a before/after diff, product-page preview, save-and-rerun loop, and local run history. Browser localStorage keeps drafts and past runs available during the demo without requiring authentication.

## Challenges we ran into

### Defining a real failure

More recommendations are not automatically better. If a shopper asks for a waterproof shoe and the product is not waterproof, exclusion is the correct outcome.

We therefore distinguish between:

- retrieval failure;
- insufficient product evidence;
- competitor advantage;
- unresolved shopper requirements; and
- correct exclusion.

Our goal is not to game an AI. It is to make genuinely relevant product evidence understandable and missing evidence visible.

### Making before-and-after testing fair

Our first rerun implementation generated a fresh adversarial suite every time. That made score changes noisy because both the product and the test set changed.

We corrected this by making reruns controlled experiments. PickMe now replays the same 100 messages and server-enforces their definitions while reevaluating only their outcomes.

### Preserving verified metadata

An early fix workflow replaced whole description and feature fields. A "better" title could therefore coincide with lost size, material, care, or fit evidence and produce a lower score.

We rebuilt the editor around evidence-preserving merges, restored facts from the original dataset, added local-draft reconciliation, and reject operator notes as customer-facing product data.

### Hosting a large fashion corpus

The full metadata file is about 1.3 GB and the local SQLite index is about 620 MB. That was not a good fit for a simple hackathon database deployment.

Instead of taking a random sample, we generated a reproducible 5,000-product catalog stratified around the five demo scenarios. This preserves meaningful competitors while keeping the deployable database under 6 MB.

## Accomplishments that we're proud of

- A working Amazon-style storefront with five editable product pages.
- A searchable Amazon Fashion evidence corpus with dataset-backed competitor pages.
- 100 adversarial shopper cases across six language patterns and five dialogue stages.
- A real parallel Terra/Luna evaluation flow with live streamed activity.
- Seven auditable discovery checkpoints rather than a single unexplained answer.
- A product leaderboard and four-dimensional score out of 100.
- Controlled same-case replay for defensible before-and-after comparisons.
- Evidence-preserving metadata edits with a diff and product-page preview.
- Local run history for reviewing prior experiments.
- A deployable embedded search catalog requiring no external database.

## What we learned

AI commerce is not simply SEO with a chatbot added.

Traditional search asks whether a page matches a query. Conversational shopping asks whether an agent can infer intent, identify uncertainty, retrieve evidence, compare constraints, and justify a recommendation.

We also learned that one ideal prompt is a weak evaluation. A listing that ranks first only when the shopper repeats its exact title is not robust. The useful measurement is whether it survives the short, indirect, typo-heavy, colloquial, and changing language of real conversations.

Finally, scores need context. A score change is meaningful only when the product, competitor pool, intent, and test suite are comparable. That insight led us to controlled replay and Top-5 coverage across the same 100 cases.

## What's next for PickMe

We want to grow PickMe into an AI-commerce observability layer that merchants can use before and after publishing product content.

Next steps include:

- authenticated merchant workspaces and durable shared run history;
- Shopify and product-feed ingestion;
- multi-model and multi-provider benchmarking;
- confidence intervals and repeated trials for ranking stability;
- evidence approval workflows for new claims;
- multimodal product-image evaluation;
- regression monitoring when agent models change; and
- production-scale hosted retrieval for complete merchant catalogs.

When AI agents become the shelf between shoppers and products, merchants should be able to test whether the shelf understands what they sell.

**PickMe makes that recommendation journey observable, testable, and improvable.**

## Built with

Next.js · React · TypeScript · Tailwind CSS · OpenAI Responses API · GPT-5.6 Terra · GPT-5.6 Luna · SQLite FTS5 · Amazon Reviews 2023 metadata · Vercel

