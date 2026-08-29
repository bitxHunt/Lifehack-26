/**
 * Turning findings into a to-do list, ranked by what it is worth.
 *
 * A brand does not need 40 suggestions. It needs to know which sentence to write
 * first. So every fix is priced in points recoverable across the whole set of
 * shopper questions, not just the one query in front of you.
 */

import { BRAND_PRODUCT_ID, QUERIES, getProduct } from "./catalog";
import { FACETS } from "./facets";
import { pyRound } from "./round";
import { readPage, runQuery, shelfReport } from "./simulator";
import type { FacetId, LoopStep, OptimisationLoop, Patches, Suggestion } from "./types";

/** Rank the missing sentences by how much they would win back. */
export function suggestFixes(
  productId: string = BRAND_PRODUCT_ID,
  patches?: Patches,
): Suggestion[] {
  const product = getProduct(productId);
  const reading = readPage(product, patches);

  const suggestions: Suggestion[] = [];

  for (const [facetId, evidence] of Object.entries(product.truth) as [FacetId, string][]) {
    const seen = reading[facetId];
    if (seen.tier === "strong") {
      continue; // already said clearly, nothing to recover
    }

    let recoverable = 0;
    const affected: string[] = [];

    for (const query of QUERIES) {
      const weight = query.weights[facetId];
      if (!weight) {
        continue;
      }
      if (query.max_price !== null && product.price_sgd > query.max_price) {
        continue; // priced out of this question anyway
      }
      const gain = weight * (1.0 - seen.credit);
      if (gain > 0) {
        const totalWeight = Object.values(query.weights).reduce((sum, w) => sum + w, 0);
        recoverable += (gain / totalWeight) * 100;
        affected.push(query.text);
      }
    }

    if (recoverable === 0) {
      continue;
    }

    suggestions.push({
      facet: facetId,
      label: FACETS[facetId].label,
      current_state: seen.tier === "weak" ? "vague" : "not mentioned at all",
      line_to_add: evidence,
      points_recoverable: pyRound(recoverable),
      queries_affected: affected,
    });
  }

  suggestions.sort((a, b) => b.points_recoverable - a.points_recoverable);
  return suggestions;
}

/** Build the patch that adds those sentences to the page. */
export function applyFixes(facetIds: FacetId[], productId: string = BRAND_PRODUCT_ID): Patches {
  const product = getProduct(productId);
  const lines = facetIds
    .map((f) => product.truth[f])
    .filter((line): line is string => line !== undefined);
  return { [productId]: lines };
}

/**
 * Fix the single highest-value gap, re-run the whole shelf, repeat.
 *
 * This is the demo moment: the score climbs on its own, one sentence at a
 * time, and every step names the sentence that moved it.
 */
export function optimisationLoop(
  productId: string = BRAND_PRODUCT_ID,
  maxRounds = 10,
): OptimisationLoop {
  const applied: FacetId[] = [];
  const patches: Patches = { [productId]: [] };

  const history: LoopStep[] = [
    { round: 0, added: null, facet: null, ...snapshot(patches, productId) },
  ];

  for (let roundNo = 1; roundNo <= maxRounds; roundNo++) {
    const suggestions = suggestFixes(productId, patches);
    if (suggestions.length === 0) {
      break;
    }

    const best = suggestions[0];
    patches[productId].push(best.line_to_add);
    applied.push(best.facet);
    history.push({
      round: roundNo,
      added: best.line_to_add,
      facet: best.facet,
      label: best.label,
      ...snapshot(patches, productId),
    });
  }

  return {
    history,
    final_page: [...getProduct(productId).content, ...patches[productId]],
    applied_facets: applied,
  };
}

function snapshot(patches: Patches, productId: string) {
  const report = shelfReport(patches, productId);
  const hero = runQuery(QUERIES[0], patches);
  const heroResult = hero.results.find((r) => r.product_id === productId)!;
  return {
    shelf_score: report.shelf_score,
    win_rate: report.win_rate,
    recommend_rate: report.recommend_rate,
    hero_rank: heroResult.rank,
    hero_score: heroResult.score,
  };
}
