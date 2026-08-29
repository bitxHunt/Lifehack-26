# PickMe

PickMe is an AI product-visibility lab backed by a five-product Amazon Fashion
demo catalog. It stress-tests buyer intents, ranks every product, traces the
agent discovery path, scores product metadata, and turns recommendations into
an editable draft that can be evaluated again.

## Local setup

Copy `.env.example` to `.env.local`, provide `OPENAI_API_KEY`, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` for PickMe or `/shop` for the demo storefront.
The evaluation endpoint uses `gpt-5.4-mini` by default; override it with
`OPENAI_EVAL_MODEL`.

## Data and persistence

The catalog is generated from
`data/amazon_fashion_5_complete_records.jsonl`. A database is not required for
the current flow: metadata drafts and the run counter are stored in the user's
browser. Add durable storage only when experiments need accounts, shared run
history, or collaboration across devices.

## Validation

```bash
npm run lint
npm run build:next
npm run build
```

`npm run build` produces the Cloudflare Worker-compatible Sites artifact and
removes local development secrets from the deployable output.
