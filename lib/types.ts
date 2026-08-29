/** Shared shapes for the catalog data and everything the simulator returns. */

/** One dimension of shopper intent. Fixed set -- see `lib/facets.ts`. */
export type FacetId =
  | "humidity"
  | "lightweight"
  | "long_distance"
  | "cushioning"
  | "wet_grip"
  | "wide_feet"
  | "durability"
  | "sizing"
  | "returns"
  | "sustainability"
  | "local_availability"
  | "price_clarity";

/**
 * How clearly a page addresses a facet, as far as an agent can tell.
 *   strong -> said outright, full credit
 *   weak   -> hinted at, half credit
 *   silent -> nothing to go on
 */
export type Tier = "strong" | "weak" | "silent";

export interface Facet {
  label: string;
  strong: RegExp[];
  weak: RegExp[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price_sgd: number;
  is_ours: boolean;
  /** The words actually on the page. All the agent ever gets to read. */
  content: string[];
  /** What the product really is. The agent never sees this. */
  truth: Partial<Record<FacetId, string>>;
}

export interface Query {
  id: string;
  text: string;
  max_price: number | null;
  weights: Partial<Record<FacetId, number>>;
}

/** A plain shopper question and the facets a page must cover to answer it. */
export interface CoverageQuestion {
  question: string;
  facets: FacetId[];
}

/** Sentences added to a page during the fix loop, keyed by product id. */
export type Patches = Record<string, string[]>;

export interface FacetReading {
  credit: number;
  tier: Tier;
  matched: string | null;
}

/** What the agent understands about every facet on one page. */
export type PageReading = Record<FacetId, FacetReading>;

export interface BreakdownRow {
  facet: FacetId;
  label: string;
  weight: number;
  tier: Tier;
  points: number;
  max_points: number;
}

export interface ScoredProduct {
  product_id: string;
  name: string;
  price_sgd: number;
  is_ours: boolean;
  score: number;
  excluded: boolean;
  exclusion_reason: string | null;
  breakdown: BreakdownRow[];
}

export interface RankedProduct extends ScoredProduct {
  rank: number;
  recommended: boolean;
}

export interface QueryRun {
  query_id: string;
  query: string;
  max_price: number | null;
  results: RankedProduct[];
}

export interface Gap {
  facet: FacetId;
  label: string;
  points_lost: number;
  our_tier: Tier;
  winner_tier: Tier;
  /** The sentence that closes it, or null when the product genuinely can't. */
  fix: string | null;
}

export interface LossExplanation {
  query: string;
  our_rank: number;
  our_score: number;
  winner_name: string;
  winner_score: number;
  beaten_by: number;
  silent_strengths: Gap[];
  real_gaps: Gap[];
}

export interface UnbackedClaim {
  product: string;
  facet: FacetId;
  label: string;
  matched: string | null;
}

export type CoverageStatus = "answered" | "vague" | "silent";

export interface CoverageRow {
  question: string;
  facets: FacetId[];
  status: CoverageStatus;
  /** True when the page could answer this today, just by saying what is true. */
  recoverable: boolean;
}

export interface Coverage {
  product: string;
  rows: CoverageRow[];
  answered: number;
  total: number;
  percent: number;
}

export interface ShelfQueryResult {
  query_id: string;
  query: string;
  rank: number;
  score: number;
  recommended: boolean;
  excluded: boolean;
  winner: string;
}

export interface ShareOfVoiceRow {
  name: string;
  wins: number;
  percent: number;
}

export interface ShelfReport {
  product: string;
  shelf_score: number;
  win_rate: number;
  recommend_rate: number;
  queries: ShelfQueryResult[];
  share_of_voice: ShareOfVoiceRow[];
}

export interface Suggestion {
  facet: FacetId;
  label: string;
  current_state: string;
  line_to_add: string;
  points_recoverable: number;
  queries_affected: string[];
}

export interface LoopStep {
  round: number;
  added: string | null;
  facet: FacetId | null;
  label?: string;
  shelf_score: number;
  win_rate: number;
  recommend_rate: number;
  hero_rank: number;
  hero_score: number;
}

export interface OptimisationLoop {
  history: LoopStep[];
  final_page: string[];
  applied_facets: FacetId[];
}

/** One query's precomputed ranking and post-mortem, as handed to the UI. */
export interface QueryView {
  ranking: QueryRun;
  explanation: LossExplanation;
}

// --- Create-a-listing workflow ----------------------------------------------

/** Facts the seller knows are true, keyed by facet -- becomes a draft's `truth`. */
export type FacetFacts = Partial<Record<FacetId, string>>;

export interface ListingDraftRequest {
  name: string;
  brand?: string;
  price_sgd?: number;
  notes?: string;
  facts?: FacetFacts;
  photo_data_url?: string;
}

export interface ListingDraftResponse {
  content: string[];
  source: "llm" | "template";
}

export interface ListingScoreRequest {
  name: string;
  brand?: string;
  price_sgd?: number;
  content: string[];
  facts?: FacetFacts;
}

export interface ListingScoreResponse {
  queries: { id: string; text: string }[];
  views: Record<string, QueryView>;
  coverage: Coverage;
  shelf_score: number;
  win_rate: number;
  recommend_rate: number;
}
