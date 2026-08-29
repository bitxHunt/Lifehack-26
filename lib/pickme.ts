import type { ShopProduct } from "@/lib/shop-products";

export type ProductDraft = {
  parent_asin: string;
  title: string;
  store: string;
  price: number;
  description: string;
  features: string[];
  details: Record<string, string>;
};

export type RankingEntry = {
  rank: number;
  asin: string;
  title: string;
  fitScore: number;
  reason: string;
};

export type EvaluationMetric = {
  key:
    | "completeness"
    | "intent_coverage"
    | "claim_quality"
    | "ai_visibility";
  label: string;
  score: number;
  summary: string;
};

export type AdversarialTest = {
  label: string;
  prompt: string;
  stress: string;
  targetRank: number;
  verdict: "pass" | "watch" | "fail";
  topProducts: RankingEntry[];
};

export type DiscoveryStep = {
  step: number;
  title: string;
  action: string;
  signal: string;
  targetRank: number;
  inTopFive: boolean;
};

export type MetadataFix = {
  field: "title" | "description" | "features" | "details";
  priority: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
  suggestedValue: string;
};

export type PickMeEvaluation = {
  model: string;
  targetAsin: string;
  targetTitle: string;
  overallScore: number;
  summary: string;
  metrics: EvaluationMetric[];
  leaderboard: RankingEntry[];
  adversarialTests: AdversarialTest[];
  discoveryPlan: DiscoveryStep[];
  fixes: MetadataFix[];
};

export type IntentPreset = {
  id: string;
  name: string;
  shortLabel: string;
  asin: string;
  intent: string;
};

export const intentPresets: IntentPreset[] = [
  {
    id: "brenda",
    name: "Beachgoing Brenda",
    shortLabel: "Beach sandals",
    asin: "B0811M2JG9",
    intent:
      "A 38-year-old beach lover seeking comfortable, lightweight sandals with distinctive marine artwork under $35.",
  },
  {
    id: "maya",
    name: "Shift Nurse Maya",
    shortLabel: "Compression sleeves",
    asin: "B07SB2892S",
    intent:
      "A 31-year-old nurse seeking affordable, breathable compression sleeves to reduce leg fatigue during long shifts.",
  },
  {
    id: "kayla",
    name: "Budget-Conscious Kayla",
    shortLabel: "Budget sweatshirt",
    asin: "B08FMLXY1Z",
    intent:
      "A 20-year-old student seeking a colorful, comfortable sweatshirt with pockets at a low price.",
  },
  {
    id: "dan",
    name: "Deadhead Dan",
    shortLabel: "Collectible T-shirt",
    asin: "B079J6WGYY",
    intent:
      "A 52-year-old music and vintage Volkswagen fan seeking a collectible Jerry Garcia tribute T-shirt.",
  },
  {
    id: "elena",
    name: "Office Professional Elena",
    shortLabel: "Work pumps",
    asin: "B015WXZSZ6",
    intent:
      "A 35-year-old professional seeking versatile, moderately elevated pumps for work and formal occasions.",
  },
];

export function toProductDraft(product: ShopProduct): ProductDraft {
  return {
    parent_asin: product.parent_asin,
    title: product.title,
    store: product.store,
    price: product.price,
    description: product.description.join("\n\n"),
    features: [...product.features],
    details: { ...product.details },
  };
}

export function productPathFromAsin(asin: string) {
  return `/shop/dp/${asin}`;
}

export function parseShopAsin(value: string) {
  const match = value.trim().match(/\/shop\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return match?.[1]?.toUpperCase() ?? null;
}
