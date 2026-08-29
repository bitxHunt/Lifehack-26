/**
 * The simulated shopping agent.
 *
 * It reads product pages the way ChatGPT would -- text only, no spec sheet, no
 * photos, no brand loyalty -- scores each product against what the shopper asked
 * for, and picks a winner. Then it explains itself, which is the part brands can
 * actually act on.
 *
 * Swapping this for a real LLM call later means replacing `scoreProduct` and
 * keeping every other function as-is.
 */

import { BRAND_PRODUCT_ID, PRODUCTS, QUERIES, QUESTIONS, getProduct } from "./catalog";
import { FACETS, FACET_IDS, readFacet } from "./facets";
import { pyRound } from "./round";
import type {
  BreakdownRow,
  Coverage,
  CoverageRow,
  CoverageStatus,
  FacetId,
  Gap,
  LossExplanation,
  PageReading,
  Patches,
  Product,
  Query,
  QueryRun,
  RankedProduct,
  ScoredProduct,
  ShareOfVoiceRow,
  ShelfQueryResult,
  ShelfReport,
  Tier,
  UnbackedClaim,
} from "./types";

export const TOP_N = 3; // an assistant usually names about three products

/** The full text an agent would read, including any fixes applied so far. */
export function pageText(product: Product, patches?: Patches): string {
  const lines = [...product.content, ...(patches?.[product.id] ?? [])];
  return lines.join("\n");
}

/** What the agent understands about every facet, from the page alone. */
export function readPage(product: Product, patches?: Patches): PageReading {
  const text = pageText(product, patches);
  const reading = {} as PageReading;
  for (const facetId of FACET_IDS) {
    reading[facetId] = readFacet(facetId, text);
  }
  return reading;
}

/** Score one product against one shopper question. */
export function scoreProduct(product: Product, query: Query, patches?: Patches): ScoredProduct {
  if (query.max_price !== null && product.price_sgd > query.max_price) {
    return {
      product_id: product.id,
      name: product.name,
      price_sgd: product.price_sgd,
      is_ours: product.is_ours,
      score: 0,
      excluded: true,
      exclusion_reason: `S$${product.price_sgd} is over the shopper's S$${query.max_price} budget`,
      breakdown: [],
    };
  }

  const reading = readPage(product, patches);
  const weights = Object.entries(query.weights) as [FacetId, number][];
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);

  let earned = 0;
  const breakdown: BreakdownRow[] = [];

  for (const [facetId, weight] of weights) {
    const seen = reading[facetId];
    const points = weight * seen.credit;
    earned += points;
    breakdown.push({
      facet: facetId,
      label: FACETS[facetId].label,
      weight,
      tier: seen.tier,
      points: pyRound(points, 2),
      max_points: weight,
    });
  }

  // Heaviest facets first, then alphabetically so the order is stable.
  breakdown.sort((a, b) => b.weight - a.weight || (a.facet < b.facet ? -1 : a.facet > b.facet ? 1 : 0));

  return {
    product_id: product.id,
    name: product.name,
    price_sgd: product.price_sgd,
    is_ours: product.is_ours,
    score: pyRound((earned / totalWeight) * 100),
    excluded: false,
    exclusion_reason: null,
    breakdown,
  };
}

/** Rank the whole shelf against one shopper question. */
export function runQuery(query: Query, patches?: Patches, products: Product[] = PRODUCTS): QueryRun {
  const scored = products.map((p) => scoreProduct(p, query, patches));
  scored.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const results: RankedProduct[] = scored.map((result, index) => {
    const rank = index + 1;
    return {
      ...result,
      rank,
      recommended: rank <= TOP_N && !result.excluded && result.score > 0,
    };
  });

  return {
    query_id: query.id,
    query: query.text,
    max_price: query.max_price,
    results,
  };
}

// --- Why we lost -----------------------------------------------------------

/**
 * Compare our product against the winner and say exactly what cost us.
 *
 * Every gap lands in one of two buckets:
 *   silent strength -- the shoe genuinely does this, the page never says so.
 *                      Fixable with a sentence.
 *   real gap        -- the shoe genuinely doesn't. Fixable only in the factory.
 */
export function explainLoss(
  query: Query,
  patches?: Patches,
  productId: string = BRAND_PRODUCT_ID,
  products: Product[] = PRODUCTS,
): LossExplanation {
  const ranked = runQuery(query, patches, products);
  const ours = ranked.results.find((r) => r.product_id === productId)!;
  const winner = ranked.results[0];

  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }
  const ourPoints = new Map(ours.breakdown.map((b) => [b.facet, b]));
  const winnerPoints = new Map(winner.breakdown.map((b) => [b.facet, b]));

  const silentStrengths: Gap[] = [];
  const realGaps: Gap[] = [];

  for (const facetId of Object.keys(query.weights) as FacetId[]) {
    const mine = ourPoints.get(facetId)?.points ?? 0;
    const theirs = winnerPoints.get(facetId)?.points ?? 0;
    if (theirs <= mine) {
      continue;
    }

    const ourTier: Tier = ourPoints.get(facetId)?.tier ?? "silent";
    const winnerTier: Tier = winnerPoints.get(facetId)?.tier ?? "silent";
    const evidence = product.truth[facetId];

    const gap: Gap = {
      facet: facetId,
      label: FACETS[facetId].label,
      points_lost: pyRound(theirs - mine, 2),
      our_tier: ourTier,
      winner_tier: winnerTier,
      fix: evidence ?? null,
    };

    if (evidence !== undefined) {
      silentStrengths.push(gap);
    } else {
      realGaps.push(gap);
    }
  }

  silentStrengths.sort((a, b) => b.points_lost - a.points_lost);
  realGaps.sort((a, b) => b.points_lost - a.points_lost);

  return {
    query: ranked.query,
    our_rank: ours.rank,
    our_score: ours.score,
    winner_name: winner.name,
    winner_score: winner.score,
    beaten_by: Math.max(0, winner.score - ours.score),
    silent_strengths: silentStrengths,
    real_gaps: realGaps,
  };
}

/**
 * Competitors making strong claims their spec sheet does not support.
 *
 * Once brands start writing for agents, some will simply write whatever wins.
 * This is the trust check: page says it, spec sheet doesn't back it.
 */
export function unbackedClaims(): UnbackedClaim[] {
  const flags: UnbackedClaim[] = [];

  for (const product of PRODUCTS) {
    if (product.is_ours) {
      continue;
    }
    const reading = readPage(product);
    for (const facetId of FACET_IDS) {
      const seen = reading[facetId];
      if (seen.tier === "strong" && product.truth[facetId] === undefined) {
        flags.push({
          product: product.name,
          facet: facetId,
          label: FACETS[facetId].label,
          matched: seen.matched,
        });
      }
    }
  }

  return flags;
}

// --- Coverage map ----------------------------------------------------------

/** Which shopper questions can this page answer at all? */
export function coverage(
  productId: string = BRAND_PRODUCT_ID,
  patches?: Patches,
  products: Product[] = PRODUCTS,
): Coverage {
  const product = products.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }
  const reading = readPage(product, patches);

  const rows: CoverageRow[] = QUESTIONS.map(({ question, facets }) => {
    const tiers = facets.map((f) => reading[f].tier);

    let status: CoverageStatus;
    if (tiers.every((t) => t === "strong")) {
      status = "answered";
    } else if (tiers.every((t) => t !== "silent")) {
      status = "vague";
    } else {
      status = "silent";
    }

    return {
      question,
      facets,
      status,
      recoverable:
        status !== "answered" &&
        facets.every((f) => reading[f].tier === "strong" || product.truth[f] !== undefined),
    };
  });

  const answered = rows.filter((r) => r.status === "answered").length;

  return {
    product: product.name,
    rows,
    answered,
    total: rows.length,
    percent: pyRound((answered / rows.length) * 100),
  };
}

// --- Whole-shelf report ----------------------------------------------------

/** Run every shopper question and summarise how we did across all of them. */
export function shelfReport(patches?: Patches, productId: string = BRAND_PRODUCT_ID): ShelfReport {
  const runs = QUERIES.map((q) => runQuery(q, patches));

  const ours: ShelfQueryResult[] = runs.map((run) => {
    const result = run.results.find((r) => r.product_id === productId)!;
    return {
      query_id: run.query_id,
      query: run.query,
      rank: result.rank,
      score: result.score,
      recommended: result.recommended,
      excluded: result.excluded,
      winner: run.results[0].name,
    };
  });

  const total = ours.length;
  const wins = ours.filter((o) => o.rank === 1).length;
  const recommended = ours.filter((o) => o.recommended).length;

  // Share of voice: how often each brand takes the top slot.
  const share = new Map<string, number>();
  for (const run of runs) {
    const winner = run.results[0].name;
    share.set(winner, (share.get(winner) ?? 0) + 1);
  }
  const shareOfVoice: ShareOfVoiceRow[] = [...share.entries()]
    .map(([name, wins]) => ({ name, wins, percent: pyRound((wins / total) * 100) }))
    .sort((a, b) => b.wins - a.wins);

  return {
    product: getProduct(productId).name,
    shelf_score: pyRound(ours.reduce((sum, o) => sum + o.score, 0) / total),
    win_rate: pyRound((wins / total) * 100),
    recommend_rate: pyRound((recommended / total) * 100),
    queries: ours,
    share_of_voice: shareOfVoice,
  };
}

// --- Scoring a brand-new draft against the existing shelf ------------------

/** The shoes a freshly-drafted listing has to compete against. */
export function competitorProducts(): Product[] {
  return PRODUCTS.filter((p) => !p.is_ours);
}

/** Same three headline numbers as `shelfReport`, for a product that isn't in the catalog. */
export function customShelfSummary(product: Product, competitors: Product[], patches?: Patches) {
  const products = [product, ...competitors];
  const runs = QUERIES.map((q) => runQuery(q, patches, products));
  const ours = runs.map((run) => run.results.find((r) => r.product_id === product.id)!);

  const total = ours.length;
  const wins = ours.filter((o) => o.rank === 1).length;
  const recommended = ours.filter((o) => o.recommended).length;

  return {
    shelf_score: pyRound(ours.reduce((sum, o) => sum + o.score, 0) / total),
    win_rate: pyRound((wins / total) * 100),
    recommend_rate: pyRound((recommended / total) * 100),
  };
}
