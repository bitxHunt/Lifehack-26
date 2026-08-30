import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Star } from "lucide-react";

import { getCatalogProductByAsin } from "@/lib/catalog-search";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/shop/catalog/[asin]">): Promise<Metadata> {
  const { asin } = await params;
  const product = await getCatalogProductByAsin(asin);
  if (!product) return { title: "Catalog product not found" };
  return {
    title: `${product.title} | Amazon Fashion dataset record`,
    description: (product.description || product.features[0] || product.title).slice(0, 160),
  };
}

export default async function CatalogProductPage({ params }: PageProps<"/shop/catalog/[asin]">) {
  const { asin } = await params;
  const product = await getCatalogProductByAsin(asin);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="border-b border-slate-200 bg-[#131921] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/shop" className="text-xl font-black">shopwise</Link>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Dataset-backed product page</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="text-[#007185] hover:underline">PickMe</Link>
          <span className="px-2">›</span>
          <span>Amazon Fashion</span>
          <span className="px-2">›</span>
          <span>{product.asin}</span>
        </nav>

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(300px,0.75fr)_minmax(0,1fr)_260px]">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-50">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.title} fill sizes="(min-width: 1024px) 34vw, 90vw" className="object-contain p-8" loading="eager" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">No product image in metadata</div>
            )}
          </div>

          <article>
            <p className="text-sm font-semibold text-[#007185]">{product.brand || "Amazon Fashion seller"}</p>
            <h1 className="mt-1 text-2xl font-normal leading-9">{product.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-4 text-sm">
              <span className="inline-flex items-center gap-1 text-[#007185]"><Star className="size-4 fill-[#de7921] text-[#de7921]" /> {product.rating.toFixed(1)}</span>
              <span className="text-[#007185]">{product.ratingCount.toLocaleString()} ratings</span>
              <span className="text-slate-400">ASIN {product.asin}</span>
            </div>
            {product.price !== null ? <p className="mt-5 text-3xl font-medium"><sup className="text-sm">$</sup>{product.price.toFixed(2)}</p> : null}
            <section className="mt-6">
              <h2 className="font-bold">About this item</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                {product.features.slice(0, 8).map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </section>
          </article>

          <aside className="rounded-xl border border-slate-300 p-5 shadow-sm">
            <p className="text-sm font-bold text-emerald-700">Verified in local dataset</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">This page is generated directly from the indexed Amazon Fashion record, so PickMe result links stay reviewable even when an old Amazon listing is unavailable.</p>
            <a href={`https://www.amazon.com/dp/${product.asin}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#007185] hover:underline">
              Try original Amazon listing <ExternalLink className="size-3.5" />
            </a>
          </aside>
        </div>

        <section className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-xl font-bold">Product metadata evidence</h2>
          <div className="mt-5 grid gap-7 lg:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              <h3 className="font-bold text-slate-950">Description</h3>
              <p className="mt-2 whitespace-pre-wrap">{product.description || "No description supplied."}</p>
            </div>
            <dl className="overflow-hidden rounded-xl border border-slate-200 text-sm">
              {Object.entries(product.details).slice(0, 16).map(([label, value], index) => (
                <div key={label} className={`grid grid-cols-[150px_1fr] ${index % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                  <dt className="p-3 font-semibold">{label}</dt><dd className="p-3">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}
