/**
 * Seeds the database from the hardcoded demo data in `lib/catalog.ts`, so the
 * DB starts out holding exactly what the in-memory prototype already ranks.
 *
 * Idempotent: re-running replaces the catalog rather than duplicating it.
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PRODUCTS, QUERIES } from "../lib/catalog";
import type { FacetId } from "../lib/types";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Cascades clear truths, weights and patches along with their parents.
  await prisma.product.deleteMany();
  await prisma.query.deleteMany();

  for (const product of PRODUCTS) {
    await prisma.product.create({
      data: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        priceSgd: product.price_sgd,
        isOurs: product.is_ours,
        content: product.content,
        truths: {
          create: Object.entries(product.truth).map(([facet, statement]) => ({
            facet: facet as FacetId,
            statement: statement as string,
          })),
        },
      },
    });
  }

  for (const query of QUERIES) {
    await prisma.query.create({
      data: {
        id: query.id,
        text: query.text,
        maxPrice: query.max_price,
        weights: {
          create: Object.entries(query.weights).map(([facet, weight]) => ({
            facet: facet as FacetId,
            weight: weight as number,
          })),
        },
      },
    });
  }

  const [products, queries] = await Promise.all([
    prisma.product.count(),
    prisma.query.count(),
  ]);
  console.log(`Seeded ${products} products and ${queries} queries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
