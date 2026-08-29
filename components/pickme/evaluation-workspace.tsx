"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FlaskConical,
  Gauge,
  Lightbulb,
  LoaderCircle,
  PencilLine,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trophy,
  WandSparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  intentPresets,
  parseShopAsin,
  type MetadataFix,
  type PickMeEvaluation,
  type ProductDraft,
} from "@/lib/pickme";

type ProductOption = {
  asin: string;
  title: string;
  url: string;
  image: string | null;
  draft: ProductDraft;
};

type View = "adversarial" | "discovery" | "fixes";

const metricAccents = {
  completeness: "bg-blue-500",
  intent_coverage: "bg-violet-500",
  claim_quality: "bg-amber-500",
  ai_visibility: "bg-emerald-500",
};

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function parseFeatureLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function parseDetailLines(value: string) {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.split(/:\s(.+)/))
      .filter((parts) => parts.length >= 3 && parts[0].trim())
      .map((parts) => [parts[0].trim(), parts[1].trim()]),
  );
}

function DraftEditor({
  product,
  draft,
  onChange,
  onReset,
  onRerun,
  running,
}: {
  product: ProductOption;
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
  onReset: () => void;
  onRerun: () => void;
  running: boolean;
}) {
  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Metadata editor
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Improve the product evidence
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Draft changes stay on this device until you rerun the evaluation.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset original
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">
              Product title
            </span>
            <input
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">Brand</span>
            <input
              value={draft.store}
              onChange={(event) => update("store", event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">Price</span>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) => update("price", Number(event.target.value))}
                className="w-full rounded-xl border border-slate-300 py-3 pl-7 pr-3.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">
              Description
            </span>
            <textarea
              rows={5}
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
              className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">
              Feature bullets
            </span>
            <textarea
              rows={6}
              value={draft.features.join("\n")}
              onChange={(event) => update("features", parseFeatureLines(event.target.value))}
              className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 font-mono text-xs leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-1 block text-xs text-slate-400">One feature per line</span>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">
              Product details
            </span>
            <textarea
              rows={5}
              value={Object.entries(draft.details)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n")}
              onChange={(event) => update("details", parseDetailLines(event.target.value))}
              className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 font-mono text-xs leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-1 block text-xs text-slate-400">Use “Field: value” per line</span>
          </label>
        </div>

        <button
          type="button"
          onClick={onRerun}
          disabled={running}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {running ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          Rerun with edited metadata
        </button>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Draft product preview
        </p>
        <div className="relative mx-auto mt-5 aspect-square max-w-64 overflow-hidden rounded-xl bg-slate-50">
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              fill
              sizes="256px"
              className="object-contain p-5"
            />
          ) : null}
        </div>
        <p className="mt-5 text-xs font-semibold text-blue-600">{draft.store}</p>
        <h4 className="mt-1 font-bold leading-snug text-slate-950">{draft.title}</h4>
        <p className="mt-3 text-2xl font-bold text-slate-950">${draft.price.toFixed(2)}</p>
        <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
          {draft.features.slice(0, 4).map((feature, index) => (
            <li key={`${feature}-${index}`} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-blue-500" />
              {feature}
            </li>
          ))}
        </ul>
        <Link
          href={product.url}
          target="_blank"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          View original page <ExternalLink className="size-3.5" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

export function EvaluationWorkspace({ products }: { products: ProductOption[] }) {
  const firstProduct = products[0];
  const [productUrl, setProductUrl] = useState(firstProduct.url);
  const [intent, setIntent] = useState(intentPresets[0].intent);
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>(() =>
    Object.fromEntries(products.map((product) => [product.asin, product.draft])),
  );
  const [result, setResult] = useState<PickMeEvaluation | null>(null);
  const [activeView, setActiveView] = useState<View>("adversarial");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runNumber, setRunNumber] = useState(0);
  const [storageReady, setStorageReady] = useState(false);

  const selectedAsin = parseShopAsin(productUrl) ?? firstProduct.asin;
  const selectedProduct =
    products.find((product) => product.asin === selectedAsin) ?? firstProduct;
  const selectedDraft = drafts[selectedProduct.asin] ?? selectedProduct.draft;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("pickme-workspace-v1");
      if (!saved) {
        setStorageReady(true);
        return;
      }
      try {
        const parsed = JSON.parse(saved) as {
          productUrl?: string;
          intent?: string;
          drafts?: Record<string, ProductDraft>;
          runNumber?: number;
        };
        if (parsed.productUrl) setProductUrl(parsed.productUrl);
        if (parsed.intent) setIntent(parsed.intent);
        if (parsed.drafts) setDrafts((current) => ({ ...current, ...parsed.drafts }));
        if (parsed.runNumber) setRunNumber(parsed.runNumber);
      } catch {
        window.localStorage.removeItem("pickme-workspace-v1");
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(
      "pickme-workspace-v1",
      JSON.stringify({ productUrl, intent, drafts, runNumber }),
    );
  }, [drafts, intent, productUrl, runNumber, storageReady]);

  const targetRank = useMemo(
    () => result?.leaderboard.find((entry) => entry.asin === result.targetAsin)?.rank,
    [result],
  );

  function choosePreset(presetId: string) {
    const preset = intentPresets.find((candidate) => candidate.id === presetId);
    const product = products.find((candidate) => candidate.asin === preset?.asin);
    if (!preset || !product) return;
    setIntent(preset.intent);
    setProductUrl(product.url);
    setResult(null);
    setError(null);
  }

  async function runEvaluation() {
    const asin = parseShopAsin(productUrl);
    const product = products.find((candidate) => candidate.asin === asin);
    if (!asin || !product) {
      setError("Paste one of the five Shopwise product URLs shown in the selector.");
      return;
    }
    if (intent.trim().length < 12) {
      setError("Describe the buyer, need, constraints, and expected use case.");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productUrl,
          intent,
          productDraft: drafts[asin] ?? product.draft,
        }),
      });
      const payload = (await response.json()) as PickMeEvaluation & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Evaluation failed.");
      setResult(payload);
      setRunNumber((current) => current + 1);
      setActiveView("adversarial");
      window.setTimeout(
        () => document.getElementById("evaluation-results")?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Evaluation failed.");
    } finally {
      setRunning(false);
    }
  }

  function updateDraft(draft: ProductDraft) {
    setDrafts((current) => ({ ...current, [draft.parent_asin]: draft }));
  }

  function applyFix(fix: MetadataFix) {
    const draft = selectedDraft;
    if (fix.field === "title") updateDraft({ ...draft, title: fix.suggestedValue });
    if (fix.field === "description")
      updateDraft({ ...draft, description: fix.suggestedValue });
    if (fix.field === "features")
      updateDraft({ ...draft, features: parseFeatureLines(fix.suggestedValue) });
    if (fix.field === "details")
      updateDraft({
        ...draft,
        details: {
          ...draft.details,
          "Additional product information": fix.suggestedValue,
        },
      });
  }

  function applyAllFixes() {
    if (!result) return;
    const draft = { ...selectedDraft, details: { ...selectedDraft.details } };
    for (const fix of result.fixes) {
      if (fix.field === "title") draft.title = fix.suggestedValue;
      if (fix.field === "description") draft.description = fix.suggestedValue;
      if (fix.field === "features") draft.features = parseFeatureLines(fix.suggestedValue);
      if (fix.field === "details")
        draft.details["Additional product information"] = fix.suggestedValue;
    }
    updateDraft(draft);
    document.getElementById("metadata-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-white/10 bg-[#091629] text-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="PickMe home">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span className="text-xl font-black tracking-tight">PickMe</span>
          </Link>
          <span className="hidden h-5 w-px bg-white/20 sm:block" />
          <span className="hidden text-sm text-slate-300 sm:block">AI Product Visibility Lab</span>
          <nav className="ml-auto flex items-center gap-2 text-sm font-semibold">
            <a href="#how-it-works" className="hidden rounded-lg px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white md:block">
              How it works
            </a>
            <Link href="/shop" className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">
              Demo shop <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#091629] pb-32 pt-14 text-white sm:pt-20">
          <div className="absolute -right-32 -top-32 size-[420px] rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-40 left-16 size-[360px] rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-200">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Powered by OpenAI product evaluation
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
                Will AI pick your product?
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Stress-test product visibility, inspect the agent&apos;s discovery path, and improve the metadata that decides who ranks first.
              </p>
            </div>

            <div className="mt-9 flex max-w-3xl items-center gap-3 text-xs font-semibold text-slate-400 sm:gap-5 sm:text-sm">
              {[
                ["1", "Set intent"],
                ["2", "Test & rank"],
                ["3", "Fix & rerun"],
              ].map(([number, label], index) => (
                <div key={number} className="contents">
                  {index > 0 ? <ChevronRight className="size-4 shrink-0 text-slate-600" /> : null}
                  <span className="flex items-center gap-2 text-slate-200">
                    <span className="grid size-7 place-items-center rounded-full bg-white/10 text-xs text-white">{number}</span>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1fr_330px]">
            <div className="p-5 sm:p-8 lg:p-10">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Target className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Evaluation setup</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">Choose a product and buyer intent</h2>
                </div>
              </div>

              <div className="mt-7 grid gap-6">
                <label>
                  <span className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
                    Shop product URL
                    <span className="font-normal text-slate-400">Five demo products supported</span>
                  </span>
                  <div className="flex rounded-xl border border-slate-300 bg-white shadow-sm transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                    <span className="grid w-12 shrink-0 place-items-center text-slate-400">
                      <Search className="size-4" aria-hidden="true" />
                    </span>
                    <input
                      type="url"
                      value={productUrl}
                      onChange={(event) => {
                        setProductUrl(event.target.value);
                        setResult(null);
                      }}
                      placeholder="https://…/shop/dp/B0811M2JG9"
                      className="min-w-0 flex-1 rounded-r-xl py-3.5 pr-4 text-sm outline-none"
                    />
                  </div>
                  <select
                    value={selectedProduct.asin}
                    onChange={(event) => {
                      const product = products.find((candidate) => candidate.asin === event.target.value);
                      if (product) setProductUrl(product.url);
                      setResult(null);
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 outline-none focus:border-blue-500 sm:text-sm"
                    aria-label="Choose a demo product"
                  >
                    {products.map((product) => (
                      <option key={product.asin} value={product.asin}>
                        {product.asin} — {product.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold text-slate-800">User intent</span>
                  <textarea
                    value={intent}
                    onChange={(event) => {
                      setIntent(event.target.value);
                      setResult(null);
                    }}
                    rows={5}
                    placeholder="Describe the buyer, the job to be done, key constraints, budget, and context…"
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3.5 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Try a test persona</p>
                  <div className="flex flex-wrap gap-2">
                    {intentPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => choosePreset(preset.id)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          preset.asin === selectedProduct.asin && preset.intent === intent
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                {error ? (
                  <div role="alert" className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={runEvaluation}
                  disabled={running}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65 sm:w-fit"
                >
                  {running ? (
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="size-4 fill-current" aria-hidden="true" />
                  )}
                  {running ? "Running the AI evaluation…" : "Run PickMe evaluation"}
                  {!running ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
                </button>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">This run will</p>
              <ol className="mt-5 space-y-5">
                {[
                  [FlaskConical, "Adversarial testing", "Stress the intent with four query variations."],
                  [BarChart3, "Product ranking", "Compare all five products in one leaderboard."],
                  [ClipboardCheck, "Discovery plan", "Expose the agent’s search and evidence path."],
                  [WandSparkles, "Metadata fixes", "Turn weak evidence into rerunnable edits."],
                ].map(([Icon, title, copy]) => {
                  const ItemIcon = Icon as typeof FlaskConical;
                  return (
                    <li key={String(title)} className="flex gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200">
                        <ItemIcon className="size-4" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-slate-900">{String(title)}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{String(copy)}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-900">No database required</p>
                <p className="mt-1 text-xs leading-5 text-blue-700">Your metadata drafts are stored only in this browser for the first workflow version.</p>
              </div>
            </aside>
          </div>
        </section>

        {running ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-live="polite">
            <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-slate-950">OpenAI is evaluating the catalog</p>
                  <p className="text-sm text-slate-500">Generating stress queries, ranks, scores, and grounded fixes.</p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
              </div>
            </div>
          </section>
        ) : null}

        {result ? (
          <section id="evaluation-results" className="mx-auto max-w-7xl scroll-mt-5 px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  <span className="size-2 rounded-full bg-emerald-500" /> Run {runNumber}
                </div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Evaluation results</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{result.summary}</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
                Model: {result.model}
              </span>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[280px_1fr]">
              <div className="rounded-2xl bg-[#0d1d33] p-6 text-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">PickMe score</span>
                  <Gauge className="size-5 text-blue-400" aria-hidden="true" />
                </div>
                <p className="mt-6 text-6xl font-black tracking-tight">{result.overallScore}<span className="text-xl text-slate-500">/100</span></p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${result.overallScore}%` }} />
                </div>
                <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                  <span>
                    <span className="block text-xs text-slate-400">Target rank</span>
                    <span className="mt-1 block text-2xl font-black">#{targetRank ?? "–"}</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${targetRank === 1 ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                    {targetRank === 1 ? "Top pick" : "Needs lift"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {result.metrics.map((metric) => (
                  <article key={metric.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-bold leading-5 text-slate-800">{metric.label}</p>
                      <p className={`text-xl font-black ${scoreTone(metric.score * 4)}`}>{metric.score}<span className="text-xs text-slate-400">/25</span></p>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${metricAccents[metric.key]}`} style={{ width: `${metric.score * 4}%` }} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{metric.summary}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="min-w-0">
                <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  {([
                    ["adversarial", FlaskConical, "Adversarial testing"],
                    ["discovery", Search, "Discovery plan"],
                    ["fixes", Lightbulb, "Fix recommendations"],
                  ] as const).map(([view, Icon, label]) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={`inline-flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition ${activeView === view ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      <Icon className="size-4" aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>

                {activeView === "adversarial" ? (
                  <div className="mt-5 space-y-4">
                    {result.adversarialTests.map((test, index) => (
                      <article key={`${test.label}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Stress test {index + 1}</p>
                            <h3 className="mt-1 text-lg font-bold text-slate-950">{test.label}</h3>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${test.verdict === "pass" ? "bg-emerald-50 text-emerald-700" : test.verdict === "watch" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                            Target #{test.targetRank} · {test.verdict}
                          </span>
                        </div>
                        <blockquote className="mt-4 rounded-xl border-l-4 border-blue-500 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-slate-700">“{test.prompt}”</blockquote>
                        <p className="mt-3 text-xs text-slate-500"><span className="font-bold text-slate-700">What this stresses:</span> {test.stress}</p>
                        <div className="mt-5 grid gap-2 sm:grid-cols-5">
                          {test.topProducts.map((entry) => (
                            <div key={entry.asin} className={`rounded-xl border p-3 ${entry.asin === result.targetAsin ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                              <span className="text-xs font-black text-slate-400">#{entry.rank}</span>
                              <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-slate-800">{entry.title}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}

                {activeView === "discovery" ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="mb-7">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Agent trace</p>
                      <h3 className="mt-1 text-xl font-bold">How the product is discovered</h3>
                    </div>
                    <ol className="relative space-y-0 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-slate-200">
                      {result.discoveryPlan.map((step) => (
                        <li key={step.step} className="relative grid grid-cols-[42px_1fr] gap-4 pb-7 last:pb-0">
                          <span className="z-10 grid size-10 place-items-center rounded-full bg-slate-950 text-sm font-black text-white ring-4 ring-white">{step.step}</span>
                          <div className="rounded-xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-bold text-slate-950">{step.title}</h4>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                <Check className="size-3" aria-hidden="true" /> Target #{step.targetRank} · top 5
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{step.action}</p>
                            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500"><span className="font-bold text-slate-700">Evidence signal:</span> {step.signal}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {activeView === "fixes" ? (
                  <div className="mt-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                      <div>
                        <p className="font-bold text-blue-950">Turn recommendations into a new test</p>
                        <p className="mt-1 text-sm text-blue-700">Apply grounded rewrites, review the draft, then rerun the full loop.</p>
                      </div>
                      <button type="button" onClick={applyAllFixes} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Apply all fixes</button>
                    </div>
                    {result.fixes.map((fix, index) => (
                      <article key={`${fix.field}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${fix.priority === "high" ? "bg-rose-50 text-rose-700" : fix.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{fix.priority} priority</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold capitalize text-blue-700">{fix.field}</span>
                        </div>
                        <h4 className="mt-4 font-bold text-slate-950">{fix.issue}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{fix.recommendation}</p>
                        <div className="mt-4 rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                          <span className="mb-1 block font-bold uppercase tracking-[0.14em] text-blue-300">Suggested value</span>
                          {fix.suggestedValue}
                        </div>
                        <button type="button" onClick={() => applyFix(fix)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                          <PencilLine className="size-4" aria-hidden="true" /> Apply to draft
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-amber-500" aria-hidden="true" />
                    <h3 className="font-bold text-slate-950">Product leaderboard</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Intent fit</span>
                </div>
                <ol className="mt-5 space-y-3">
                  {result.leaderboard.map((entry) => (
                    <li key={entry.asin} className={`rounded-xl border p-3.5 ${entry.asin === result.targetAsin ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black ${entry.rank === 1 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>#{entry.rank}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">{entry.title}</p>
                            <span className="shrink-0 text-sm font-black text-slate-900">{entry.fitScore}</span>
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-500">{entry.reason}</p>
                          {entry.asin === result.targetAsin ? <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Submitted product</span> : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>

            <div id="metadata-editor" className="scroll-mt-5 pt-12">
              <DraftEditor
                product={selectedProduct}
                draft={selectedDraft}
                onChange={updateDraft}
                onReset={() => updateDraft(selectedProduct.draft)}
                onRerun={runEvaluation}
                running={running}
              />
            </div>
          </section>
        ) : (
          <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">One continuous loop</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">From uncertain ranking to stronger product evidence</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                [FlaskConical, "Stress the query", "OpenAI generates adversarial versions of the buyer intent and reranks every catalog product."],
                [ClipboardCheck, "Inspect discovery", "See the exact evidence checkpoints that move the target product up or down."],
                [RefreshCw, "Fix and rerun", "Edit the product metadata in a safe draft, then measure whether the score and rank improve."],
              ].map(([Icon, title, copy], index) => {
                const ItemIcon = Icon as typeof FlaskConical;
                return (
                  <article key={String(title)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><ItemIcon className="size-5" aria-hidden="true" /></span>
                      <span className="text-xs font-black text-slate-300">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{String(copy)}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-semibold text-slate-700">PickMe · AI Product Visibility Lab</span>
          <span>Evaluations are directional, evidence-based tests—not guaranteed marketplace rankings.</span>
        </div>
      </footer>
    </div>
  );
}
