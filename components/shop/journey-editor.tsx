"use client";

import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Copy, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type JourneyProduct = {
  asin: string;
  title: string;
  store: string;
  path: string;
};

export function JourneyEditor({
  products,
  initialAsins,
}: {
  products: JourneyProduct[];
  initialAsins: string[];
}) {
  const [steps, setSteps] = useState(initialAsins);
  const [copied, setCopied] = useState(false);
  const productByAsin = useMemo(
    () => new Map(products.map((product) => [product.asin, product])),
    [products],
  );

  function updateSteps(nextSteps: string[]) {
    setSteps(nextSteps);
    const url = new URL(window.location.href);
    if (nextSteps.length) url.searchParams.set("path", nextSteps.join(","));
    else url.searchParams.delete("path");
    window.history.replaceState(null, "", url);
    setCopied(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    updateSteps(next);
  }

  async function copyPath() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  const unusedProducts = products.filter((product) => !steps.includes(product.asin));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-semibold">Journey steps</h2>
            <p className="mt-1 text-sm text-slate-600">Reorder or remove pages. Changes are stored in the shareable URL.</p>
          </div>
          <button
            type="button"
            onClick={copyPath}
            className="inline-flex items-center gap-2 rounded-full border border-slate-400 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            {copied ? <Check className="size-4 text-emerald-700" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy path URL"}
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          {steps.map((asin, index) => {
            const product = productByAsin.get(asin);
            if (!product) return null;
            return (
              <li key={asin} className="flex items-center gap-3 rounded-md border border-slate-200 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#232f3e] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.store}</p>
                  <Link href={product.path} className="line-clamp-2 text-sm font-medium text-[#007185] hover:text-[#c7511f] hover:underline">
                    {product.title}
                  </Link>
                  <code className="mt-1 block truncate text-[11px] text-slate-500">{product.path}</code>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${product.title} up`} className="rounded border p-2 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} aria-label={`Move ${product.title} down`} className="rounded border p-2 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronDown className="size-4" />
                  </button>
                  <button type="button" onClick={() => updateSteps(steps.filter((step) => step !== asin))} aria-label={`Remove ${product.title}`} className="rounded border p-2 text-red-700 hover:bg-red-50">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        {steps.length === 0 && (
          <p className="mt-4 rounded-md bg-slate-50 p-8 text-center text-sm text-slate-600">This path is empty. Add a product from the panel.</p>
        )}
      </section>

      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Available pages</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">Start at <code>/shop</code>, then send a person or AI agent through these product routes.</p>
        <div className="mt-4 space-y-2">
          {unusedProducts.map((product) => (
            <button
              type="button"
              key={product.asin}
              onClick={() => updateSteps([...steps, product.asin])}
              className="flex w-full items-start gap-2 rounded-md border border-slate-200 p-3 text-left hover:border-[#e77600] hover:bg-orange-50"
            >
              <Plus className="mt-0.5 size-4 shrink-0" />
              <span className="line-clamp-2 text-xs font-medium">{product.title}</span>
            </button>
          ))}
          {unusedProducts.length === 0 && <p className="text-xs text-slate-500">All products are in the journey.</p>}
        </div>
        {steps[0] && (
          <Link href={productByAsin.get(steps[0])?.path ?? "/shop"} className="mt-5 block rounded-full bg-[#ffd814] px-4 py-2.5 text-center text-sm font-medium hover:bg-[#f7ca00]">
            Start this path
          </Link>
        )}
      </aside>
    </div>
  );
}
