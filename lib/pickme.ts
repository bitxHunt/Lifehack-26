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
  productUrl: string;
  amazonUrl: string;
  rating: number;
  ratingCount: number;
};

export type CompetitorEffect = {
  asin: string;
  title: string;
  rank: number;
  effect: "pushes_down" | "neutral" | "target_advantage";
  impact: string;
  decisiveSignals: string[];
  productUrl: string;
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
  id: string;
  category:
    | "plain_simple"
    | "singlish"
    | "shorthand_typos"
    | "constraint_heavy"
    | "ambiguous"
    | "context_shift";
  label: string;
  dialogueStage:
    | "initial_vague"
    | "clarification_reply"
    | "constraint_reveal"
    | "preference_shift"
    | "purchase_refusal";
  prompt: string;
  stress: string;
  revealedInformation: string[];
  withheldInformation: string[];
  targetRank: number;
  verdict: "pass" | "watch" | "fail";
  topPickAsin: string;
  topPickTitle: string;
  reason: string;
};

export type DiscoveryStep = {
  step: number;
  phase:
    | "clarify"
    | "search"
    | "inspect"
    | "compare"
    | "verify"
    | "recommend";
  title: string;
  actionType: "ask_shopper" | "interact_with_env";
  actionContent: string;
  question: string;
  knownRequirements: string[];
  missingRequirements: string[];
  inputs: string[];
  observations: string[];
  decision: string;
  rankBefore: number;
  rankAfter: number;
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
  models: {
    discovery: { name: string; reasoningEffort: string };
    adversarial: { name: string; reasoningEffort: string };
  };
  targetAsin: string;
  targetTitle: string;
  targetRank: number;
  targetReason: string;
  overallScore: number;
  summary: string;
  comparisonPoolSize: number;
  retrievedCandidateCount: number;
  searchTerms: string[];
  metrics: EvaluationMetric[];
  leaderboard: RankingEntry[];
  competitorEffects: CompetitorEffect[];
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
      "Need comfortable sandals for a beach holiday, preferably under $35.",
  },
  {
    id: "maya",
    name: "Shift Nurse Maya",
    shortLabel: "Compression sleeves",
    asin: "B07SB2892S",
    intent:
      "What can I wear to help with tired legs during long nursing shifts?",
  },
  {
    id: "kayla",
    name: "Budget-Conscious Kayla",
    shortLabel: "Budget sweatshirt",
    asin: "B08FMLXY1Z",
    intent:
      "I need a cheap comfy sweatshirt with pockets for campus.",
  },
  {
    id: "dan",
    name: "Deadhead Dan",
    shortLabel: "Collectible T-shirt",
    asin: "B079J6WGYY",
    intent:
      "Need a vintage-looking T-shirt for a music fan, preferably not too expensive.",
  },
  {
    id: "elena",
    name: "Office Professional Elena",
    shortLabel: "Work pumps",
    asin: "B015WXZSZ6",
    intent:
      "I need comfortable heels that work for the office and formal events.",
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
