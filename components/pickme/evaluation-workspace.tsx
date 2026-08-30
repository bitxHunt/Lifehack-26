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
  History,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  PencilLine,
  Play,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Trophy,
  WandSparkles,
  BrainCircuit,
  Database,
  Info,
  Minus,
  Network,
  Star,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  intentPresets,
  parseShopAsin,
  type MetadataFix,
  type PickMeEvaluation,
  type ProductDraft,
} from "@/lib/pickme";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ProductOption = {
  asin: string;
  title: string;
  url: string;
  image: string | null;
  draft: ProductDraft;
};

type View = "adversarial" | "discovery" | "fixes";
type StressCategory = PickMeEvaluation["adversarialTests"][number]["category"];
type StressFilter = "all" | StressCategory;
type EvaluationStage = "validate" | "retrieve" | "shortlist" | "discovery" | "adversarial" | "merge";
type EvaluationProgress = {
  type: "progress";
  stage: EvaluationStage;
  status: "active" | "complete";
  title: string;
  detail: string;
};
type LiveTraceUpdate = {
  type: "trace";
  id: string;
  branch: "discovery" | "adversarial" | "system";
  kind: "reasoning" | "action" | "evidence" | "batch";
  status: "active" | "complete";
  title: string;
  detail: string;
  completed?: number;
  total?: number;
};
type StoredRun = {
  id: string;
  runNumber: number;
  createdAt: string;
  productUrl: string;
  intent: string;
  draft: ProductDraft;
  result: PickMeEvaluation;
  progress: EvaluationProgress[];
  trace?: LiveTraceUpdate[];
  baselineScore?: number;
  baselineRank?: number;
  baselineTopFiveCount?: number;
};

const evaluationStages: Array<{
  key: EvaluationStage;
  label: string;
  pending: string;
  icon: typeof Target;
}> = [
  { key: "validate", label: "Understand request", pending: "Waiting to inspect the URL and buyer intent", icon: Target },
  { key: "retrieve", label: "Search full catalog", pending: "Waiting to search Amazon Fashion metadata", icon: Database },
  { key: "shortlist", label: "Build shortlist", pending: "Waiting to select distinct evidence candidates", icon: ListChecks },
  { key: "discovery", label: "Discovery branch", pending: "Waiting to inspect evidence and rank products", icon: BrainCircuit },
  { key: "adversarial", label: "Adversarial branch", pending: "Waiting to run 100 human message variants", icon: FlaskConical },
  { key: "merge", label: "Merge & validate", pending: "Waiting to merge both branches and calculate scores", icon: Gauge },
];

const stressCategories: Array<{ key: StressFilter; label: string }> = [
  { key: "all", label: "All 100" },
  { key: "plain_simple", label: "Simple chat" },
  { key: "singlish", label: "Singlish" },
  { key: "shorthand_typos", label: "Typos & shorthand" },
  { key: "constraint_heavy", label: "Constraints" },
  { key: "ambiguous", label: "Ambiguous" },
  { key: "context_shift", label: "Context shifts" },
];

const stressCategoryLabels = Object.fromEntries(
  stressCategories.filter((category) => category.key !== "all").map((category) => [category.key, category.label]),
) as Record<StressCategory, string>;

const dialogueStageLabels = {
  initial_vague: "Vague opening",
  clarification_reply: "Clarification reply",
  constraint_reveal: "Constraint reveal",
  preference_shift: "Preference shift",
  purchase_refusal: "Refusal / missing info",
} as const;

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

function LiveStageCard({ stage, event, number, branch = false }: {
  stage: (typeof evaluationStages)[number];
  event?: EvaluationProgress;
  number: number;
  branch?: boolean;
}) {
  const StageIcon = stage.icon;
  const isActive = event?.status === "active";
  const isComplete = event?.status === "complete";
  return (
    <article className={`relative rounded-xl border p-4 ${isActive ? "border-blue-300 bg-blue-50" : isComplete ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
      {branch ? <span className="absolute -left-2 top-5 size-3 rounded-full border-2 border-white bg-blue-500" /> : null}
      <div className="flex items-center justify-between gap-3">
        <span className={`grid size-9 place-items-center rounded-lg ${isComplete ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
          {isActive ? <LoaderCircle className="size-4 animate-spin" /> : isComplete ? <Check className="size-4" /> : <StageIcon className="size-4" />}
        </span>
        <span className="text-[10px] font-black text-slate-300">0{number}</span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{event?.title ?? stage.label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{event?.detail ?? stage.pending}</p>
    </article>
  );
}

function LiveAgentTrace({ events, running }: { events: LiveTraceUpdate[]; running: boolean }) {
  const branches = [
    {
      key: "discovery" as const,
      title: "Discovery agent",
      subtitle: "Live reasoning summaries, evidence checks, and structured-output validation",
      empty: "Waiting for Terra to start evaluating the evidence package.",
    },
    {
      key: "adversarial" as const,
      title: "100-case shopper simulator",
      subtitle: "Four batches of 25 run independently and report as each batch completes",
      empty: "Waiting for Luna to start the four stress-test batches.",
    },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            {running ? <LoaderCircle className="size-4 animate-spin text-blue-400" /> : <Check className="size-4 text-emerald-400" />}
            <h3 className="font-bold">Live agent activity</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-400">Real OpenAI reasoning summaries and application events. Private raw chain-of-thought is never exposed.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">{running ? "Streaming now" : "Run trace saved"}</span>
      </div>
      <div className="grid lg:grid-cols-2">
        {branches.map((branch, branchIndex) => {
          const branchEvents = events.filter((event) => event.branch === branch.key);
          return (
            <div key={branch.key} className={`min-w-0 p-5 ${branchIndex > 0 ? "border-t border-white/10 lg:border-l lg:border-t-0" : ""}`}>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-400">{branch.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{branch.subtitle}</p>
              <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
                {branchEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 p-4 text-xs leading-5 text-slate-500">{branch.empty}</div>
                ) : branchEvents.map((event) => {
                  const percentage = event.total ? Math.round(((event.completed ?? 0) / event.total) * 100) : null;
                  return (
                    <article key={event.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${event.status === "complete" ? "bg-emerald-400/15 text-emerald-300" : "bg-blue-400/15 text-blue-300"}`}>
                          {event.status === "complete" ? <Check className="size-3.5" /> : <LoaderCircle className="size-3.5 animate-spin" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-white">{event.title}</p>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{event.kind}</span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-300">{event.detail}</p>
                          {percentage !== null ? (
                            <div className="mt-3">
                              <div className="mb-1 flex justify-between text-[10px] font-bold text-slate-500"><span>{event.completed}/{event.total} cases</span><span>{percentage}%</span></div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${percentage}%` }} /></div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function migrateStoredRun(run: StoredRun): StoredRun {
  const progress: EvaluationProgress[] = [];
  for (const item of run.progress) {
    const savedStage = String(item.stage);
    if (savedStage === "evaluate") {
      progress.push({ ...item, stage: "discovery" }, { ...item, stage: "adversarial" });
    } else if (savedStage === "score") {
      progress.push({ ...item, stage: "merge" });
    } else {
      progress.push(item);
    }
  }
  return {
    ...run,
    progress,
    trace: run.trace ?? [],
    result: {
      ...run.result,
      models: run.result.models ?? {
        discovery: { name: run.result.model, reasoningEffort: "legacy" },
        adversarial: { name: run.result.model, reasoningEffort: "legacy" },
      },
      leaderboard: run.result.leaderboard.map((entry) => ({
        ...entry,
        rating: entry.rating ?? 0,
        ratingCount: entry.ratingCount ?? 0,
        amazonUrl: entry.amazonUrl ?? `https://www.amazon.com/dp/${entry.asin}`,
      })),
      adversarialTests: run.result.adversarialTests.map((test) => ({
        ...test,
        dialogueStage: test.dialogueStage ?? "initial_vague",
        revealedInformation: test.revealedInformation ?? ["Saved shopper message"],
        withheldInformation: test.withheldInformation ?? [],
      })),
      discoveryPlan: run.result.discoveryPlan.map((step, index) => {
        const legacy = step as typeof step & { action?: string; signal?: string; targetRank?: number };
        const legacyRank = legacy.targetRank ?? step.rankAfter ?? 1;
        return {
          ...step,
          step: index + 1,
          phase: step.phase ?? (index === 0 ? "clarify" : index === 6 ? "recommend" : "inspect"),
          actionType: step.actionType ?? (index === 0 ? "ask_shopper" : "interact_with_env"),
          actionContent: step.actionContent ?? (index === 0 ? (step.question ?? legacy.action ?? "What else matters for this purchase?") : `click [${run.result.targetAsin}]`),
          question: step.question ?? legacy.action ?? "What evidence is relevant at this checkpoint?",
          knownRequirements: step.knownRequirements ?? [run.intent],
          missingRequirements: step.missingRequirements ?? [],
          inputs: step.inputs ?? ["Saved evaluation context"],
          observations: step.observations ?? [legacy.signal ?? "Legacy evidence summary"],
          decision: step.decision ?? legacy.signal ?? "Rank retained from the saved run.",
          rankBefore: step.rankBefore ?? legacyRank,
          rankAfter: step.rankAfter ?? legacyRank,
          inTopFive: legacyRank <= 5,
        };
      }),
    },
  };
}

function parseFeatureLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function mergeFeatureEvidence(current: string[], suggestedValue: string) {
  const merged = [...current];
  const seen = new Set(current.map((feature) => feature.trim().toLowerCase()));
  for (const feature of parseFeatureLines(suggestedValue)) {
    const key = feature.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(feature);
    }
  }
  return merged.slice(0, 16);
}

function mergeDescriptionEvidence(current: string, suggestedValue: string) {
  const existing = current.trim();
  const suggestion = suggestedValue.trim();
  if (!suggestion || existing.toLowerCase().includes(suggestion.toLowerCase())) return existing;
  if (suggestion.toLowerCase().includes(existing.toLowerCase())) return suggestion.slice(0, 5000);
  return `${suggestion}\n\n${existing}`.slice(0, 5000);
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

function mergeDetailEvidence(current: Record<string, string>, suggestedValue: string) {
  const parsed = parseDetailLines(suggestedValue);
  if (Object.keys(parsed).length > 0) return { ...current, ...parsed };
  return { ...current, "Additional product information": suggestedValue.trim() };
}

function reconcileStoredDraft(baseline: ProductDraft, saved: ProductDraft) {
  if (saved.parent_asin !== baseline.parent_asin) return baseline;
  const details = { ...baseline.details, ...saved.details };
  const additionalInfo = details["Additional product information"];
  if (additionalInfo && /^(add verified|consider adding|include verified|add a verified)/i.test(additionalInfo)) {
    delete details["Additional product information"];
  }
  return {
    ...saved,
    description: mergeDescriptionEvidence(baseline.description, saved.description),
    features: mergeFeatureEvidence(baseline.features, saved.features.join("\n")),
    details,
  };
}

function DraftEditor({
  product,
  baseline,
  draft,
  onChange,
  onReset,
  onSaveAndRerun,
  busy,
  saveStatus,
}: {
  product: ProductOption;
  baseline: ProductDraft;
  draft: ProductDraft;
  onChange: (draft: ProductDraft) => void;
  onReset: () => void;
  onSaveAndRerun: () => void;
  busy: boolean;
  saveStatus: string | null;
}) {
  const [previewMode, setPreviewMode] = useState<"page" | "diff">("diff");
  const update = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    onChange({ ...draft, [key]: value });
  const changedFields = (["title", "store", "price", "description", "features", "details"] as const)
    .filter((key) => JSON.stringify(baseline[key]) !== JSON.stringify(draft[key]));

  const fieldValue = (value: ProductDraft[keyof ProductDraft]) => {
    if (Array.isArray(value)) return value.join("\n");
    if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${item}`).join("\n");
    return String(value);
  };

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
              Suggestions stay as a draft until you save. Saving updates the product page data, then runs all 100 tests again.
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

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSaveAndRerun}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            {busy ? "Saving and testing…" : "Save to product & run 100 tests"}
          </button>
          {saveStatus ? <span className="text-sm font-semibold text-emerald-700">{saveStatus}</span> : null}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Draft preview</p>
            <p className="mt-1 text-xs text-slate-500">{changedFields.length} fields changed</p>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 text-[11px] font-bold">
            <button type="button" onClick={() => setPreviewMode("diff")} className={`rounded-md px-2.5 py-1.5 ${previewMode === "diff" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Changes</button>
            <button type="button" onClick={() => setPreviewMode("page")} className={`rounded-md px-2.5 py-1.5 ${previewMode === "page" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Page</button>
          </div>
        </div>

        {previewMode === "diff" ? (
          <div className="mt-5 space-y-4">
            {changedFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs leading-5 text-slate-500">No draft changes yet. Apply a fix or edit a field to see the before/after comparison.</div>
            ) : changedFields.map((field) => (
              <div key={field}>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{field}</p>
                <div className="grid gap-2">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
                    <span className="mb-1 flex items-center gap-1 font-black uppercase tracking-wide text-rose-600"><Minus className="size-3" /> Before</span>
                    <span className="line-clamp-4 whitespace-pre-wrap">{fieldValue(baseline[field])}</span>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
                    <span className="mb-1 flex items-center gap-1 font-black uppercase tracking-wide text-emerald-700"><Check className="size-3" /> After</span>
                    <span className="line-clamp-4 whitespace-pre-wrap">{fieldValue(draft[field])}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-[#131921] px-3 py-2 text-xs font-black text-white">shopwise · draft</div>
            <div className="p-4">
              <div className="relative mx-auto aspect-square max-w-52 overflow-hidden rounded-xl bg-slate-50">
                {product.image ? <Image src={product.image} alt="" fill sizes="208px" className="object-contain p-4" /> : null}
              </div>
              <p className="mt-4 text-xs font-semibold text-[#007185]">{draft.store}</p>
              <h4 className="mt-1 font-bold leading-snug text-slate-950">{draft.title}</h4>
              <p className="mt-3 text-2xl font-bold text-slate-950">${draft.price.toFixed(2)}</p>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-xs leading-5 text-slate-600">
                {draft.features.slice(0, 4).map((feature, index) => <li key={`${feature}-${index}`}>{feature}</li>)}
              </ul>
            </div>
          </div>
        )}
        <Link href={product.url} target="_blank" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800">
          Open saved product page <ExternalLink className="size-3.5" aria-hidden="true" />
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
  const [savedDrafts, setSavedDrafts] = useState<Record<string, ProductDraft>>(() =>
    Object.fromEntries(products.map((product) => [product.asin, product.draft])),
  );
  const [result, setResult] = useState<PickMeEvaluation | null>(null);
  const [activeView, setActiveView] = useState<View>("adversarial");
  const [stressFilter, setStressFilter] = useState<StressFilter>("all");
  const [stressPage, setStressPage] = useState(0);
  const [running, setRunning] = useState(false);
  const [progressEvents, setProgressEvents] = useState<EvaluationProgress[]>([]);
  const [traceEvents, setTraceEvents] = useState<LiveTraceUpdate[]>([]);
  const [runHistory, setRunHistory] = useState<StoredRun[]>([]);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
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
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            productUrl?: string;
            intent?: string;
            drafts?: Record<string, ProductDraft>;
            runNumber?: number;
          };
          if (parsed.productUrl) setProductUrl(parsed.productUrl);
          if (parsed.intent) setIntent(parsed.intent);
          if (parsed.drafts) {
            const reconciledDrafts = Object.fromEntries(products.map((product) => [
              product.asin,
              parsed.drafts?.[product.asin]
                ? reconcileStoredDraft(product.draft, parsed.drafts[product.asin])
                : product.draft,
            ]));
            setDrafts((current) => ({ ...current, ...reconciledDrafts }));
          }
          if (parsed.runNumber) setRunNumber(parsed.runNumber);
        } catch {
          window.localStorage.removeItem("pickme-workspace-v1");
        }
      }
      const savedHistory = window.localStorage.getItem("pickme-run-history-v1");
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory) as StoredRun[];
          if (Array.isArray(parsedHistory)) setRunHistory(parsedHistory.map(migrateStoredRun));
        } catch {
          window.localStorage.removeItem("pickme-run-history-v1");
        }
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [products]);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(
      "pickme-workspace-v1",
      JSON.stringify({ productUrl, intent, drafts, runNumber }),
    );
  }, [drafts, intent, productUrl, runNumber, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem("pickme-run-history-v1", JSON.stringify(runHistory));
    } catch {
      const recentRuns = runHistory.slice(0, 20);
      try {
        window.localStorage.setItem("pickme-run-history-v1", JSON.stringify(recentRuns));
      } catch {
        window.localStorage.removeItem("pickme-run-history-v1");
      }
    }
  }, [runHistory, storageReady]);

  const targetRank = useMemo(
    () => result?.targetRank,
    [result],
  );
  const filteredStressTests = useMemo(
    () => result?.adversarialTests.filter((test) => stressFilter === "all" || test.category === stressFilter) ?? [],
    [result, stressFilter],
  );
  const stressPageCount = Math.max(1, Math.ceil(filteredStressTests.length / 20));
  const displayedStressTests = useMemo(
    () => filteredStressTests.slice(stressPage * 20, stressPage * 20 + 20),
    [filteredStressTests, stressPage],
  );
  const stressOutcomes = useMemo(
    () => result?.adversarialTests.reduce(
      (totals, test) => ({ ...totals, [test.verdict]: totals[test.verdict] + 1 }),
      { pass: 0, watch: 0, fail: 0 },
    ) ?? { pass: 0, watch: 0, fail: 0 },
    [result],
  );
  const stressTopFiveCount = useMemo(
    () => result?.adversarialTests.filter((test) => test.targetRank <= 5).length ?? 0,
    [result],
  );
  const activeStoredRun = useMemo(
    () => result ? runHistory.find((run) => run.result === result) : undefined,
    [result, runHistory],
  );

  function choosePreset(presetId: string) {
    const preset = intentPresets.find((candidate) => candidate.id === presetId);
    const product = products.find((candidate) => candidate.asin === preset?.asin);
    if (!preset || !product) return;
    setIntent(preset.intent);
    setProductUrl(product.url);
    setResult(null);
    setError(null);
    setSaveStatus(null);
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

    const comparableRun = runHistory.find((pastRun) =>
      parseShopAsin(pastRun.productUrl) === asin &&
      pastRun.intent.trim().toLowerCase() === intent.trim().toLowerCase(),
    );

    setRunning(true);
    setError(null);
    setResult(null);
    setProgressEvents([]);
    setTraceEvents([]);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          productUrl,
          intent,
          productDraft: drafts[asin] ?? product.draft,
          baselineEvaluation: comparableRun ? {
            targetRank: comparableRun.result.targetRank,
            overallScore: comparableRun.result.overallScore,
            metrics: comparableRun.result.metrics.map(({ key, score }) => ({ key, score })),
          } : undefined,
          baselineAdversarialTests: comparableRun?.result.adversarialTests.length === 100
            ? comparableRun.result.adversarialTests
            : undefined,
        }),
      });
      if (!response.body) throw new Error("The evaluation stream could not be opened.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: PickMeEvaluation | null = null;
      const collectedProgress: EvaluationProgress[] = [];
      const collectedTrace: LiveTraceUpdate[] = [];

      const processLine = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as
          | EvaluationProgress
          | LiveTraceUpdate
          | { type: "result"; result: PickMeEvaluation }
          | { type: "error"; error: string };
        if (event.type === "progress") {
          const existingIndex = collectedProgress.findIndex((item) => item.stage === event.stage);
          if (existingIndex >= 0) collectedProgress[existingIndex] = event;
          else collectedProgress.push(event);
          setProgressEvents([...collectedProgress]);
        }
        if (event.type === "trace") {
          const existingIndex = collectedTrace.findIndex((item) => item.id === event.id);
          if (existingIndex >= 0) collectedTrace[existingIndex] = event;
          else collectedTrace.push(event);
          setTraceEvents([...collectedTrace]);
        }
        if (event.type === "result") finalResult = event.result;
        if (event.type === "error") throw new Error(event.error || "Evaluation failed.");
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) processLine(line);
        if (done) break;
      }
      if (buffer.trim()) processLine(buffer);
      if (!finalResult) throw new Error("The evaluation finished without a result.");

      const completedResult = finalResult as PickMeEvaluation;
      const nextRunNumber = runNumber + 1;
      const run: StoredRun = {
        id: window.crypto.randomUUID(),
        runNumber: nextRunNumber,
        createdAt: new Date().toISOString(),
        productUrl,
        intent,
        draft: drafts[asin] ?? product.draft,
        result: completedResult,
        progress: [...collectedProgress],
        trace: [...collectedTrace],
        baselineScore: comparableRun?.result.overallScore,
        baselineRank: comparableRun?.result.targetRank,
        baselineTopFiveCount: comparableRun?.result.adversarialTests.filter((test) => test.targetRank <= 5).length,
      };
      setResult(completedResult);
      setRunNumber(nextRunNumber);
      setRunHistory((current) => [run, ...current]);
      setActiveView("adversarial");
      setStressFilter("all");
      setStressPage(0);
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

  function openPastRun(run: StoredRun) {
    setProductUrl(run.productUrl);
    setIntent(run.intent);
    const product = products.find((candidate) => candidate.asin === run.draft.parent_asin);
    const restoredDraft = product ? reconcileStoredDraft(product.draft, run.draft) : run.draft;
    setDrafts((current) => ({ ...current, [run.draft.parent_asin]: restoredDraft }));
    setResult(run.result);
    setProgressEvents(run.progress);
    setTraceEvents(run.trace ?? []);
    setRunNumber(run.runNumber);
    setActiveView("adversarial");
    setStressFilter("all");
    setStressPage(0);
    setError(null);
    window.setTimeout(
      () => document.getElementById("evaluation-results")?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }

  function deletePastRun(runId: string) {
    setRunHistory((current) => current.filter((run) => run.id !== runId));
  }

  function updateDraft(draft: ProductDraft) {
    setDrafts((current) => ({ ...current, [draft.parent_asin]: draft }));
    setSaveStatus(null);
  }

  async function saveMetadataAndRerun() {
    setSavingMetadata(true);
    setError(null);
    setSaveStatus(null);
    try {
      const response = await fetch(`/api/products/${selectedDraft.parent_asin}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedDraft),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The product metadata could not be saved.");
      setSavedDrafts((current) => ({ ...current, [selectedDraft.parent_asin]: selectedDraft }));
      setSaveStatus("Product page updated");
      await runEvaluation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The product metadata could not be saved.");
    } finally {
      setSavingMetadata(false);
    }
  }

  function applyFix(fix: MetadataFix) {
    const draft = selectedDraft;
    if (fix.field === "title") updateDraft({ ...draft, title: fix.suggestedValue });
    if (fix.field === "description")
      updateDraft({ ...draft, description: mergeDescriptionEvidence(draft.description, fix.suggestedValue) });
    if (fix.field === "features")
      updateDraft({ ...draft, features: mergeFeatureEvidence(draft.features, fix.suggestedValue) });
    if (fix.field === "details")
      updateDraft({
        ...draft,
        details: mergeDetailEvidence(draft.details, fix.suggestedValue),
      });
  }

  function applyAllFixes() {
    if (!result) return;
    const draft = { ...selectedDraft, details: { ...selectedDraft.details } };
    for (const fix of result.fixes) {
      if (fix.field === "title") draft.title = fix.suggestedValue;
      if (fix.field === "description") draft.description = mergeDescriptionEvidence(draft.description, fix.suggestedValue);
      if (fix.field === "features") draft.features = mergeFeatureEvidence(draft.features, fix.suggestedValue);
      if (fix.field === "details")
        draft.details = mergeDetailEvidence(draft.details, fix.suggestedValue);
    }
    updateDraft(draft);
    document.getElementById("metadata-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-white/10 bg-[#091629] text-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="PickMe home">
            <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white/5">
              <Image src="/brand/pickme-logo.png" alt="" width={36} height={36} className="size-9 object-contain" priority />
            </span>
            <span className="text-xl font-black tracking-tight">PickMe</span>
          </Link>
          <span className="hidden h-5 w-px bg-white/20 sm:block" />
          <span className="hidden text-sm text-slate-300 sm:block">AI Product Visibility Lab</span>
          <nav className="ml-auto flex items-center gap-2 text-sm font-semibold">
            <Popover>
              <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-slate-300 hover:bg-white/10 hover:text-white sm:px-3">
                <Info className="size-3.5" /> <span className="hidden sm:inline">How it works</span>
              </PopoverTrigger>
              <PopoverContent>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">One evaluation loop</p>
                <h2 className="mt-1 text-lg font-bold">Search, split, improve</h2>
                <ol className="mt-4 space-y-3 text-xs leading-5 text-slate-600">
                  <li><strong className="text-slate-900">1. Retrieve:</strong> search the full Amazon Fashion index and create an evidence shortlist.</li>
                  <li><strong className="text-slate-900">2. Run in parallel:</strong> discovery ranks evidence while the stress branch evaluates 100 human messages in four batches.</li>
                  <li><strong className="text-slate-900">3. Fix and compare:</strong> edit metadata, inspect the red/green diff, save, then compare score and rank with the prior run.</li>
                </ol>
              </PopoverContent>
            </Popover>
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
                    <span className="font-normal text-slate-400">5 editable targets · full-catalog comparison</span>
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
                  disabled={running || savingMetadata}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-65 sm:w-fit"
                >
                  {running || savingMetadata ? (
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="size-4 fill-current" aria-hidden="true" />
                  )}
                  {running || savingMetadata ? "Running the AI evaluation…" : "Run PickMe evaluation"}
                  {!running && !savingMetadata ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
                </button>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">This run will</p>
              <ol className="mt-5 space-y-5">
                {[
                  [FlaskConical, "100-message stress test", "Test simple chat, Singlish, shorthand, constraints, ambiguity, and context shifts in four batches."],
                  [BarChart3, "Full-catalog ranking", "Search all Amazon Fashion metadata, then judge the strongest candidates."],
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
                <p className="text-xs font-bold text-blue-900">Full Amazon Fashion index</p>
                <p className="mt-1 text-xs leading-5 text-blue-700">826,050 valid, unique product records are searched in a database. Only the strongest evidence candidates are sent to OpenAI for final judgment.</p>
              </div>
            </aside>
          </div>
        </section>

        {runHistory.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <History className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-bold text-slate-950">Run history on this device</h2>
                    <p className="text-xs text-slate-500">Open any past input, result, and evaluation path. Nothing is uploaded for history storage.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setRunHistory([])} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="size-3.5" aria-hidden="true" /> Clear history
                </button>
              </div>
              <div className="mt-5 grid max-h-80 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {runHistory.map((run) => (
                  <article key={run.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Run {run.runNumber} · {new Date(run.createdAt).toLocaleString()}</p>
                        <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-900">{run.intent}</p>
                      </div>
                      <button type="button" onClick={() => deletePastRun(run.id)} aria-label={`Delete run ${run.runNumber}`} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{run.result.overallScore}/100</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">Target #{run.result.targetRank}</span>
                      <span className="ml-auto truncate text-slate-400">{run.result.models.discovery.name.replace("gpt-5.6-", "")} + {run.result.models.adversarial.name.replace("gpt-5.6-", "")}</span>
                    </div>
                    <button type="button" onClick={() => openPastRun(run)} className="mt-4 w-full rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
                      Open this run
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {running || progressEvents.length > 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-live="polite">
            <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    {running ? <LoaderCircle className="size-4 animate-spin text-blue-600" aria-hidden="true" /> : <Check className="size-4 text-emerald-600" aria-hidden="true" />}
                    <p className="font-bold text-slate-950">{running ? "Evaluation running live" : "Evaluation path completed"}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">These are real processing checkpoints and evidence summaries, not a countdown or hidden chain-of-thought.</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                  {progressEvents.filter((event) => event.status === "complete").length} / {evaluationStages.length} stages complete
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_36px_1fr_36px_1fr]">
                  <LiveStageCard stage={evaluationStages[0]} event={progressEvents.find((item) => item.stage === "validate")} number={1} />
                  <div className="hidden place-items-center text-slate-300 lg:grid"><ChevronRight className="size-5" /></div>
                  <LiveStageCard stage={evaluationStages[1]} event={progressEvents.find((item) => item.stage === "retrieve")} number={2} />
                  <div className="hidden place-items-center text-slate-300 lg:grid"><ChevronRight className="size-5" /></div>
                  <LiveStageCard stage={evaluationStages[2]} event={progressEvents.find((item) => item.stage === "shortlist")} number={3} />
                </div>

                <div className="mx-auto my-4 flex max-w-3xl items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-blue-600">
                  <span className="h-px flex-1 bg-blue-200" />
                  <Network className="size-4" /> Actual parallel split
                  <span className="h-px flex-1 bg-blue-200" />
                </div>

                <div className="relative mx-auto grid max-w-4xl gap-3 before:absolute before:bottom-6 before:left-1/2 before:top-6 before:w-px before:-translate-x-1/2 before:bg-blue-200 md:grid-cols-2 md:gap-8">
                  <LiveStageCard stage={evaluationStages[3]} event={progressEvents.find((item) => item.stage === "discovery")} number={4} branch />
                  <LiveStageCard stage={evaluationStages[4]} event={progressEvents.find((item) => item.stage === "adversarial")} number={5} branch />
                </div>

                <div className="mx-auto my-4 flex max-w-xl items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" /> merge results <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="mx-auto max-w-xl">
                  <LiveStageCard stage={evaluationStages[5]} event={progressEvents.find((item) => item.stage === "merge")} number={6} />
                </div>
                <LiveAgentTrace events={traceEvents} running={running} />
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {result.comparisonPoolSize.toLocaleString()} products searched
                  </span>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                    {result.retrievedCandidateCount} evidence candidates reranked
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Terms: {result.searchTerms.slice(0, 6).join(" · ")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700">
                  Discovery: {result.models.discovery.name} · {result.models.discovery.reasoningEffort}
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">
                  Stress test: {result.models.adversarial.name} · {result.models.adversarial.reasoningEffort}
                </span>
              </div>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-[280px_1fr]">
              <div className="rounded-2xl bg-[#0d1d33] p-6 text-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">PickMe score</span>
                  <Gauge className="size-5 text-blue-400" aria-hidden="true" />
                </div>
                <p className="mt-6 text-6xl font-black tracking-tight">{result.overallScore}<span className="text-xl text-slate-500">/100</span></p>
                {activeStoredRun?.baselineScore !== undefined ? (
                  <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs ${result.overallScore > activeStoredRun.baselineScore ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : result.overallScore < activeStoredRun.baselineScore ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : "border-white/10 bg-white/5 text-slate-300"}`}>
                    <span className="font-bold">Previous {activeStoredRun.baselineScore}</span><span className="px-2">→</span><span className="font-bold">Current {result.overallScore}</span>
                    <span className="ml-2 font-black">({result.overallScore - activeStoredRun.baselineScore > 0 ? "+" : ""}{result.overallScore - activeStoredRun.baselineScore})</span>
                    {result.overallScore === activeStoredRun.baselineScore ? <span className="mt-1 block text-slate-400">No measurable change; check which metric still lacks evidence.</span> : null}
                  </div>
                ) : <p className="mt-3 text-xs text-slate-400">Baseline run — rerun this product and intent after editing to see the delta.</p>}
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" style={{ width: `${result.overallScore}%` }} />
                </div>
                <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                  <span>
                    <span className="block text-xs text-slate-400">Target rank</span>
                    <span className="mt-1 block text-2xl font-black">#{targetRank ?? "–"}</span>
                    {activeStoredRun?.baselineRank !== undefined ? <span className="mt-1 block text-[10px] text-slate-500">previous #{activeStoredRun.baselineRank}</span> : null}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${targetRank === 1 ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                    {targetRank === 1 ? "Top pick" : "Needs lift"}
                  </span>
                </div>
                {activeStoredRun?.baselineTopFiveCount !== undefined ? (
                  <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2.5 text-xs text-blue-100">
                    <span className="block font-bold">Controlled 100-case validation</span>
                    <span className="mt-1 block text-blue-200">
                      Top-5 coverage: {activeStoredRun.baselineTopFiveCount}/100 → {stressTopFiveCount}/100
                      <strong className="ml-2">({stressTopFiveCount - activeStoredRun.baselineTopFiveCount > 0 ? "+" : ""}{stressTopFiveCount - activeStoredRun.baselineTopFiveCount})</strong>
                    </span>
                    <span className="mt-1 block text-[10px] text-blue-300">The same shopper messages were replayed; only product evidence changed.</span>
                  </div>
                ) : null}
                <p className="mt-4 text-xs leading-5 text-slate-400">{result.targetReason}</p>
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
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Competitor pressure</p>
                        <h3 className="mt-1 text-lg font-bold text-slate-950">How the comparison products affect the target</h3>
                      </div>
                      <div className="mt-5 grid gap-3">
                        {result.competitorEffects.map((effect) => (
                          <div key={effect.asin} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <a href={effect.productUrl} target="_blank" rel="noreferrer" className="font-bold text-slate-950 hover:text-blue-700">
                                  #{effect.rank} {effect.title}
                                </a>
                                <p className="mt-1.5 text-sm leading-6 text-slate-600">{effect.impact}</p>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${effect.effect === "pushes_down" ? "bg-rose-50 text-rose-700" : effect.effect === "target_advantage" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {effect.effect === "pushes_down" ? "Pushes target down" : effect.effect === "target_advantage" ? "Target advantage" : "Neutral"}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {effect.decisiveSignals.map((signal) => (
                                <span key={signal} className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">{signal}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">100-message coverage</p>
                          <h3 className="mt-1 text-lg font-bold text-slate-950">How real people might ask ChatGPT</h3>
                          <p className="mt-1 text-sm text-slate-500">Six writing styles across 100 balanced cases. Showing 20 at a time so the evidence stays easy to review.</p>
                        </div>
                        <div className="flex gap-2 text-xs font-bold">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{stressOutcomes.pass} pass</span>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{stressOutcomes.watch} watch</span>
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">{stressOutcomes.fail} fail</span>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter stress tests">
                        {stressCategories.map((category) => (
                          <button
                            key={category.key}
                            type="button"
                            onClick={() => { setStressFilter(category.key); setStressPage(0); }}
                            className={`rounded-full border px-3 py-2 text-xs font-bold transition ${stressFilter === category.key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}
                          >
                            {category.label}
                          </button>
                        ))}
                      </div>
                    </article>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {displayedStressTests.map((test) => (
                        <details key={test.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:border-blue-200">
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{test.id}</span>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{stressCategoryLabels[test.category]}</span>
                                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{dialogueStageLabels[test.dialogueStage]}</span>
                                </div>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-900">“{test.prompt}”</p>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${test.verdict === "pass" ? "bg-emerald-50 text-emerald-700" : test.verdict === "watch" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                                #{test.targetRank} {test.verdict}
                              </span>
                            </div>
                          </summary>
                          <div className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-600">
                            <p><span className="font-bold text-slate-800">What changed:</span> {test.stress}</p>
                            <p className="mt-2"><span className="font-bold text-slate-800">Revealed now:</span> {test.revealedInformation.join(" · ")}</p>
                            {test.withheldInformation.length > 0 ? <p className="mt-2"><span className="font-bold text-slate-800">Still withheld:</span> {test.withheldInformation.join(" · ")}</p> : null}
                            <p className="mt-2"><span className="font-bold text-slate-800">Why it ranked this way:</span> {test.reason}</p>
                            <div className={`mt-3 rounded-lg p-3 ${test.topPickAsin === result.targetAsin ? "bg-blue-50 text-blue-800" : "bg-slate-50 text-slate-700"}`}>
                              <span className="block text-[10px] font-black uppercase tracking-[0.14em] opacity-60">AI top pick</span>
                              <span className="mt-1 block font-bold">{test.topPickTitle}</span>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                    {stressPageCount > 1 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500">Showing {stressPage * 20 + 1}-{Math.min(stressPage * 20 + 20, filteredStressTests.length)} of {filteredStressTests.length}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" disabled={stressPage === 0} onClick={() => setStressPage((page) => Math.max(0, page - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                          <span className="px-2 text-xs font-bold text-slate-500">Page {stressPage + 1} / {stressPageCount}</span>
                          <button type="button" disabled={stressPage >= stressPageCount - 1} onClick={() => setStressPage((page) => Math.min(stressPageCount - 1, page + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                        </div>
                      </div>
                    ) : null}
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
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-slate-950">{step.title}</h4>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${step.actionType === "ask_shopper" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{step.actionType.replaceAll("_", " ")}</span>
                              </div>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${step.rankAfter < step.rankBefore ? "bg-emerald-50 text-emerald-700" : step.rankAfter > step.rankBefore ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                                {step.rankBefore === step.rankAfter ? "Rank unchanged" : `#${step.rankBefore} → #${step.rankAfter}`}
                              </span>
                            </div>
                            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100">
                              <span className="mr-2 text-slate-500">Action_content:</span>{step.actionContent}
                            </div>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{step.question}</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <div className="rounded-lg bg-emerald-50 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Known requirements</p>
                                <p className="mt-1 text-xs leading-5 text-emerald-900">{step.knownRequirements.length > 0 ? step.knownRequirements.join(" · ") : "None stated yet"}</p>
                              </div>
                              <div className="rounded-lg bg-amber-50 p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Missing / unknown</p>
                                <p className="mt-1 text-xs leading-5 text-amber-900">{step.missingRequirements.length > 0 ? step.missingRequirements.join(" · ") : "No critical gap at this step"}</p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Context inspected</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">{step.inputs.map((input) => <span key={input} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{input}</span>)}</div>
                            </div>
                            <div className="mt-3 rounded-lg bg-slate-50 p-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Evidence observed</p>
                              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-600">{step.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul>
                            </div>
                            <p className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${step.inTopFive ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}><span className="font-bold">Decision summary:</span> {step.decision}</p>
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
                      <button type="button" onClick={applyAllFixes} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Add all to editor</button>
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
                          <PencilLine className="size-4" aria-hidden="true" /> Add to editor
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>

              <aside className="h-fit self-start rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700"><Star className="size-3 fill-amber-400 text-amber-400" /> {entry.rating.toFixed(1)}</span>
                            <span>{entry.ratingCount.toLocaleString()} ratings</span>
                            <span className="ml-auto font-bold text-slate-400">ASIN {entry.asin}</span>
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-slate-500">{entry.reason}</p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                            <a href={entry.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800">Verified dataset page <ExternalLink className="size-3" /></a>
                            <a href={entry.amazonUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700">Amazon <ExternalLink className="size-3" /></a>
                          </div>
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
                baseline={savedDrafts[selectedProduct.asin] ?? selectedProduct.draft}
                draft={selectedDraft}
                onChange={updateDraft}
                onReset={() => updateDraft(savedDrafts[selectedProduct.asin] ?? selectedProduct.draft)}
                onSaveAndRerun={saveMetadataAndRerun}
                busy={running || savingMetadata}
                saveStatus={saveStatus}
              />
            </div>
          </section>
        ) : null}
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
