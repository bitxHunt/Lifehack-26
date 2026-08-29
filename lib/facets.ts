/**
 * What a shopping agent actually looks for, and how it spots it in text.
 *
 * A "facet" is one dimension of shopper intent -- humidity tolerance, price,
 * wide fit, and so on. The agent never sees a product's real specs. It only
 * reads the words on the page, so every facet needs patterns that decide
 * whether the page *talks about* that facet at all.
 *
 * Two tiers on purpose:
 *   strong -> the page says it outright, with a number or a claim.
 *             The agent is confident and gives full credit.
 *   weak   -> the page hints at it and the agent has to guess.
 *             Half credit, because a guessing agent picks someone else.
 */

import type { Facet, FacetId, FacetReading } from "./types";

export const STRONG_CREDIT = 1.0;
export const WEAK_CREDIT = 0.5;

export const FACETS: Record<FacetId, Facet> = {
  humidity: {
    label: "Humid / tropical climate",
    strong: [/humid/i, /tropical/i, /sweat[- ]?wick/i, /heat and moisture/i],
    weak: [/breathab/i, /ventilat/i, /airflow/i, /\bmesh\b/i],
  },
  lightweight: {
    label: "Lightweight",
    strong: [/\b\d{2,3}\s?g\b/i, /lightweight/i, /ultra[- ]?light/i],
    weak: [/\blight\b/i, /minimal/i],
  },
  long_distance: {
    label: "Long distance / half marathon",
    strong: [/half marathon/i, /marathon/i, /long run/i, /21\.?1\s?km/i, /long[- ]distance/i],
    weak: [/endurance/i, /distance/i, /\b10\s?k\b/i],
  },
  cushioning: {
    label: "Cushioning",
    strong: [/cushion/i, /\d{1,2}\s?mm stack/i, /stack height/i, /plush/i],
    weak: [/\bsoft\b/i, /comfort/i],
  },
  wet_grip: {
    label: "Grip on wet roads",
    strong: [/wet grip/i, /wet road/i, /wet pavement/i, /monsoon/i, /slip[- ]resist/i, /\brain\b/i],
    weak: [/traction/i, /\bgrip\b/i, /outsole/i],
  },
  wide_feet: {
    label: "Wide feet",
    strong: [/wide fit/i, /wide feet/i, /\b2e\b/i, /wide toe box/i],
    weak: [/roomy/i, /toe box/i],
  },
  durability: {
    label: "Durability / mileage",
    strong: [/\b\d{3,4}\s?km\b/i, /durab/i, /mileage/i, /lasts \d+/i],
    weak: [/hard[- ]wearing/i, /tough/i, /rubber/i],
  },
  sizing: {
    label: "Sizing guidance",
    strong: [/true to size/i, /size up/i, /sizing guide/i, /runs (small|large)/i],
    weak: [/\bfit\b/i, /\bsizes?\b/i],
  },
  returns: {
    label: "Returns / exchange",
    strong: [/free return/i, /\d+[- ]day return/i, /exchange policy/i, /free exchange/i],
    weak: [/\breturns?\b/i, /warranty/i],
  },
  sustainability: {
    label: "Sustainability",
    strong: [/recycled/i, /bluesign/i, /sustainab/i, /plant[- ]based/i, /carbon/i],
    weak: [/\beco\b/i, /\bgreen\b/i, /responsib/i],
  },
  local_availability: {
    label: "Available in Singapore",
    strong: [/singapore/i, /\bsg\b/i, /next[- ]day delivery/i, /orchard/i, /in stock/i],
    weak: [/fast delivery/i, /ships/i, /\bstores?\b/i],
  },
  price_clarity: {
    label: "Price stated up front",
    strong: [/s\$\s?\d+/i, /\$\s?\d+/i],
    weak: [/affordable/i, /value for money/i, /budget/i],
  },
};

/** Every facet id, in declaration order. */
export const FACET_IDS = Object.keys(FACETS) as FacetId[];

function firstMatch(patterns: RegExp[], text: string): string | null {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return pattern.source;
    }
  }
  return null;
}

/**
 * How well does this text address one facet, as far as an agent can tell?
 *
 * Credit is 0 when the page is silent -- the agent has nothing to go on and
 * will move to the next product.
 */
export function readFacet(facetId: FacetId, text: string): FacetReading {
  const facet = FACETS[facetId];

  const strong = firstMatch(facet.strong, text);
  if (strong) {
    return { credit: STRONG_CREDIT, tier: "strong", matched: strong };
  }

  const weak = firstMatch(facet.weak, text);
  if (weak) {
    return { credit: WEAK_CREDIT, tier: "weak", matched: weak };
  }

  return { credit: 0.0, tier: "silent", matched: null };
}
