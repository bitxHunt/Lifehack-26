# Amazon Reviews 2023 product metadata

This directory contains the catalog and generated product-only metadata from
[McAuley Lab's Amazon Reviews 2023 dataset](https://amazon-reviews-2023.github.io/).
Review records and image binaries are intentionally excluded.

## Fetch metadata

List the 34 available categories and their download sizes:

```powershell
npm run data:products -- --list
```

Fetch one or more categories:

```powershell
npm run data:products -- --category Gift_Cards
npm run data:products -- --category All_Beauty --category Appliances
```

Fetch all categories only on a drive with enough free space:

```powershell
npm run data:products -- --all
```

The source metadata is about 24.48 GiB compressed and 94.43 GiB uncompressed.
The generated gzip files will also require roughly 25 GiB. During each category,
the resumable source download temporarily needs additional space. Use `--output-dir`
to place the generated data on a larger drive if necessary:

```powershell
npm run data:products -- --all --output-dir D:\amazon-products
```

Interrupted source downloads resume from `data/.cache/`. Successfully transformed
source files are removed unless `--keep-source` is supplied. Existing completed
outputs are skipped; use `--force` to rebuild them.

## Output

Each category becomes `data/products/meta_<category>.jsonl.gz`. Every line is one
JSON product object. All source fields are preserved:

- `main_category`, `title`, `average_rating`, `rating_number`
- `features`, `description`, `price`, `images`, `videos`
- `store`, `categories`, `details`, `parent_asin`, `bought_together`

The extractor adds:

- `source_category`: the dataset category file the record came from
- `amazon_product_url`: `https://www.amazon.com/dp/<parent_asin>`

`data/products/manifest.json` records row counts, output sizes, hashes, and whether
an output is complete or was generated with `--limit` for testing.

## Read an output file

```js
import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

const lines = createInterface({
  input: createReadStream("data/products/meta_Gift_Cards.jsonl.gz").pipe(createGunzip()),
  crlfDelay: Infinity,
});

for await (const line of lines) {
  const product = JSON.parse(line);
  console.log(product.title, product.amazon_product_url);
}
```

The catalog file `amazon-reviews-2023-catalog.json` is committed, while downloaded
and generated bulk files are ignored by Git.
