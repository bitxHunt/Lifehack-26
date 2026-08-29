import type { Metadata } from "next";

import { JourneyEditor } from "@/components/shop/journey-editor";
import { getProductPath, shopProducts } from "@/lib/shop-products";

export const metadata: Metadata = {
  title: "Path editor",
  description: "Create and share an ordered browsing path through the Shopwise product pages.",
};

export default async function JourneyPage({ searchParams }: PageProps<"/shop/journey">) {
  const { path } = await searchParams;
  const requestedAsins = typeof path === "string" ? path.split(",") : [];
  const validAsins = new Set(shopProducts.map((product) => product.parent_asin));
  const initialAsins = requestedAsins.length
    ? requestedAsins.filter((asin, index) => validAsins.has(asin) && requestedAsins.indexOf(asin) === index)
    : shopProducts.map((product) => product.parent_asin);
  const products = shopProducts.map((product) => ({
    asin: product.parent_asin,
    title: product.title,
    store: product.store,
    path: getProductPath(product),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c45500]">Agent journey builder</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Edit the user path</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Arrange the order in which a person or AI agent should visit these product pages. The sequence is encoded in the URL, so it can be copied and accessed from another browser or agent.
        </p>
      </div>
      <JourneyEditor products={products} initialAsins={initialAsins} />
    </main>
  );
}
