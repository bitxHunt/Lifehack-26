/**
 * Hardcoded demo data: one category, one city, five products.
 *
 * Every product carries two separate records, and that split is the whole point
 * of this prototype:
 *
 *   content -> the words actually on the product page. This is ALL the shopping
 *              agent ever gets to read.
 *   truth   -> what the shoe really is, straight from the spec sheet.
 *
 * A brand can be excellent and still lose, because the agent cannot see `truth`.
 * Facets that are true but unsaid are what we call silent strengths, and they are
 * the cheapest sales a brand will ever recover -- no product change required,
 * just words on a page.
 */

import type { CoverageQuestion, Product, Query } from "./types";

export const BRAND_PRODUCT_ID = "striden-velocity-air-3";

export const PRODUCTS: Product[] = [
  {
    id: "striden-velocity-air-3",
    name: "Striden Velocity Air 3",
    brand: "Striden",
    price_sgd: 179,
    is_ours: true,
    // Classic spec dump. Accurate, complete, and almost useless to an agent.
    content: [
      "Striden Velocity Air 3",
      "Engineered performance footwear for the modern athlete.",
      "Upper: engineered mesh construction",
      "Midsole: STR-Foam EVA compound",
      "Outsole: high-abrasion rubber compound",
      "Weight: 218g (US M9)",
      "Drop: 8mm",
      "Available in US 7-13",
      "S$179",
    ],
    // What the shoe genuinely is. Each line is publishable copy already.
    truth: {
      humidity: "Three-layer sweat-wicking knit upper, lab tested at 85% relative humidity.",
      lightweight: "218g in US M9, one of the lightest daily trainers in its price band.",
      long_distance: "Tuned for half marathon race pace and long runs up to 21.1km.",
      cushioning: "32mm stack height with dual-density cushioning foam.",
      wet_grip: "Siped rubber outsole, wet-road tested for grip in monsoon rain.",
      wide_feet: "Also made in a 2E wide fit for wide feet.",
      durability: "Outsole tested to 800km of road mileage.",
      sizing: "Fits true to size for most runners.",
      returns: "30-day free returns and free exchanges.",
      local_availability: "In stock at 4 Singapore stores with next-day delivery.",
      price_clarity: "S$179.",
    },
  },
  {
    id: "meridian-pace-2",
    name: "Meridian Pace 2",
    brand: "Meridian",
    price_sgd: 189,
    is_ours: false,
    // An average shoe with an outstanding copywriter. Currently winning.
    content: [
      "Meridian Pace 2 - Built for Singapore's Humidity",
      "Training for your first half marathon? The Pace 2 is designed for long runs in hot, humid conditions.",
      "Sweat-wicking engineered upper keeps you dry through a full 21.1km.",
      "Grippy outsole handles wet pavements through monsoon season.",
      "Fits true to size - see our sizing guide before you order.",
      "Free 30-day returns. In stock in Singapore with next-day delivery.",
      "Lightweight at 245g, and built to last 800km of road running.",
      "S$189",
    ],
    truth: {
      humidity: "Ventilated upper, moderate moisture handling.",
      lightweight: "245g in US M9.",
      long_distance: "Comfortable up to 15km for most runners.",
      wet_grip: "Standard rubber outsole with wet-road siping.",
      sizing: "Fits true to size.",
      returns: "30-day free returns.",
      local_availability: "Next-day delivery within Singapore.",
      price_clarity: "S$189.",
    },
  },
  {
    id: "kaze-flux-lite",
    name: "Kaze Flux Lite",
    brand: "Kaze",
    price_sgd: 149,
    is_ours: false,
    content: [
      "Kaze Flux Lite",
      "A lightweight daily trainer at 210g for runners who want speed without paying flagship money.",
      "Breathable mesh upper for warm weather training.",
      "Plush 28mm stack cushioning holds up to daily mileage.",
      "Made with 40% recycled materials.",
      "S$149",
    ],
    truth: {
      humidity: "Breathable mesh, no dedicated moisture treatment.",
      lightweight: "210g in US M9.",
      cushioning: "28mm stack, single-density foam.",
      durability: "Around 500km before the foam packs out.",
      sustainability: "40% recycled upper materials.",
      price_clarity: "S$149.",
    },
  },
  {
    id: "northbound-trail-ready",
    name: "Northbound Trail Ready",
    brand: "Northbound",
    price_sgd: 229,
    is_ours: false,
    content: [
      "Northbound Trail Ready",
      "Aggressive lugs deliver slip-resistant traction on wet and muddy trails.",
      "Durable outsole rated to 900km.",
      "Wide toe box lets your foot splay naturally.",
      "Built for runners who take the long way round.",
      "S$229",
    ],
    truth: {
      wet_grip: "6mm lugs, excellent on wet ground.",
      durability: "900km rated outsole.",
      wide_feet: "Wide toe box as standard.",
      price_clarity: "S$229.",
    },
  },
  {
    id: "bolt-runner-basic",
    name: "Bolt Runner Basic",
    brand: "Bolt",
    price_sgd: 89,
    is_ours: false,
    content: [
      "Bolt Runner Basic",
      "Comfortable running shoe.",
      "Rubber sole.",
      "S$89",
    ],
    truth: {
      price_clarity: "S$89.",
    },
  },
];

/**
 * Real shopper intents, written the way people actually talk to an assistant.
 * `weights` say how much each facet matters for that particular question.
 */
export const QUERIES: Query[] = [
  {
    id: "q1",
    text: "I'm training for a half marathon in Singapore's humid weather and need lightweight shoes under S$200.",
    max_price: 200,
    weights: {
      humidity: 3,
      lightweight: 3,
      long_distance: 3,
      cushioning: 1,
      local_availability: 1,
      price_clarity: 1,
    },
  },
  {
    id: "q2",
    text: "Best running shoes for wet roads during monsoon season in Singapore?",
    max_price: null,
    weights: {
      wet_grip: 3,
      durability: 2,
      local_availability: 2,
      humidity: 1,
    },
  },
  {
    id: "q3",
    text: "I have wide feet and need cushioned shoes for long runs, budget around S$180.",
    max_price: 180,
    weights: {
      wide_feet: 3,
      cushioning: 3,
      long_distance: 2,
      price_clarity: 1,
    },
  },
  {
    id: "q4",
    text: "Beginner runner, first 10K. Which shoe won't fall apart after three months?",
    max_price: null,
    weights: {
      durability: 3,
      cushioning: 2,
      long_distance: 2,
      sizing: 1,
    },
  },
  {
    id: "q5",
    text: "Sustainable running shoes I can actually buy in Singapore this week.",
    max_price: null,
    weights: {
      sustainability: 3,
      local_availability: 3,
      price_clarity: 1,
    },
  },
  {
    id: "q6",
    text: "Lightweight daily trainer under 250g for treadmill runs in a hot gym.",
    max_price: null,
    weights: {
      lightweight: 3,
      humidity: 3,
      cushioning: 2,
    },
  },
  {
    id: "q7",
    text: "I run about 60km a week. Need something durable under S$200.",
    max_price: 200,
    weights: {
      durability: 3,
      long_distance: 2,
      cushioning: 2,
      price_clarity: 1,
    },
  },
  {
    id: "q8",
    text: "Running shoes that fit true to size. I hate dealing with returns.",
    max_price: null,
    weights: {
      sizing: 3,
      returns: 3,
      local_availability: 1,
    },
  },
  {
    id: "q9",
    text: "Cheap running shoes for humid weather that still last a year.",
    max_price: 160,
    weights: {
      price_clarity: 2,
      humidity: 3,
      durability: 3,
    },
  },
  {
    id: "q10",
    text: "What should I wear for a 21km run in 32 degree heat?",
    max_price: null,
    weights: {
      humidity: 3,
      long_distance: 3,
      lightweight: 2,
      cushioning: 1,
    },
  },
];

/**
 * The coverage map. Plain questions a shopper would ask before buying.
 * A question counts as answered only if the page addresses every facet it needs.
 */
export const QUESTIONS: CoverageQuestion[] = [
  { question: "Will these hold up in Singapore's humidity?", facets: ["humidity"] },
  { question: "How much do they weigh?", facets: ["lightweight"] },
  { question: "Are they suitable for a half marathon?", facets: ["long_distance"] },
  { question: "How much cushioning do they have?", facets: ["cushioning"] },
  { question: "Will I slip on wet pavement?", facets: ["wet_grip"] },
  { question: "Do they come in a wide fit?", facets: ["wide_feet"] },
  { question: "How many kilometres will they last?", facets: ["durability"] },
  { question: "Should I size up or down?", facets: ["sizing"] },
  { question: "Can I return them if they don't fit?", facets: ["returns"] },
  { question: "Are they made sustainably?", facets: ["sustainability"] },
  { question: "Can I get them in Singapore this week?", facets: ["local_availability"] },
  { question: "How much do they cost?", facets: ["price_clarity"] },
  { question: "Are they light enough for race day?", facets: ["lightweight", "long_distance"] },
  { question: "Good for humid long runs?", facets: ["humidity", "long_distance"] },
  { question: "Safe to run in during monsoon season?", facets: ["wet_grip", "durability"] },
  { question: "Comfortable for wide feet on long runs?", facets: ["wide_feet", "cushioning"] },
  { question: "Worth the money for high mileage?", facets: ["durability", "price_clarity"] },
  { question: "Easy to exchange if the size is wrong?", facets: ["sizing", "returns"] },
  { question: "An eco-friendly option under S$200?", facets: ["sustainability", "price_clarity"] },
  { question: "Light, cushioned and available locally?", facets: ["lightweight", "cushioning", "local_availability"] },
];

export function getProduct(productId: string): Product {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    throw new Error(`Unknown product: ${productId}`);
  }
  return product;
}

export function getQuery(queryId: string): Query {
  const query = QUERIES.find((q) => q.id === queryId);
  if (!query) {
    throw new Error(`Unknown query: ${queryId}`);
  }
  return query;
}
