import type { Metadata } from "next";

import { ProductCard } from "@/components/shop/product-card";
import { shopProducts } from "@/lib/shop-products";

export const metadata: Metadata = {
  title: "Amazon Fashion demo catalog",
  description: "Browse five fashion products in an AI-accessible demo storefront.",
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const products = query
    ? shopProducts.filter((product) =>
        [product.title, product.store, ...product.features]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : shopProducts;

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-[linear-gradient(110deg,#17263a_0%,#243b55_58%,#355c7d_100%)] px-5 py-12 text-white sm:px-10 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#febd69]">
            Shopwise Fashion Edit
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Everyday style, picked for you
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
            Explore a compact collection of footwear, apparel, and active
            essentials—built as a realistic, agent-friendly shopping experience.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">
              5 complete products
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">
              Direct product routes
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">
              Structured catalog data
            </span>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="catalog-heading"
        className="mx-auto max-w-[1500px] px-0 py-6 sm:px-5 sm:py-8"
      >
        <div className="mb-5 flex items-end justify-between gap-4 px-4 sm:px-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#c45500]">
              Amazon Fashion sample
            </p>
            <h2
              id="catalog-heading"
              className="mt-1 text-2xl font-semibold tracking-tight"
            >
              {query ? `Results for “${q}”` : "Featured fashion picks"}
            </h2>
          </div>
          <p className="shrink-0 text-sm text-slate-600">
            {products.length} {products.length === 1 ? "result" : "results"}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 sm:gap-4 sm:bg-transparent lg:grid-cols-5">
            {products.map((product) => (
              <ProductCard key={product.parent_asin} product={product} />
            ))}
          </div>
        ) : (
          <div className="mx-4 rounded-md border border-slate-200 bg-white p-10 text-center sm:mx-0">
            <h2 className="text-xl font-semibold">No products found</h2>
            <p className="mt-2 text-sm text-slate-600">
              Try a brand, product type, or material.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
