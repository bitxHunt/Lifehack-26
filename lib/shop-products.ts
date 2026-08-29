import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type ProductImage = {
  thumb: string | null;
  large: string | null;
  variant: string;
  hi_res: string | null;
};

export type ShopProduct = {
  main_category: string;
  title: string;
  average_rating: number;
  rating_number: number;
  features: string[];
  description: string[];
  price: number;
  images: ProductImage[];
  videos: Array<{ title: string; url: string; user_id: string }>;
  store: string;
  categories: string[];
  details: Record<string, string>;
  parent_asin: string;
  bought_together: string[] | null;
};

const dataFile = join(
  process.cwd(),
  "data",
  "amazon_fashion_5_complete_records.jsonl",
);

function loadProducts(): ShopProduct[] {
  return readFileSync(dataFile, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as ShopProduct;
      } catch (error) {
        throw new Error(
          `Invalid product JSON at ${dataFile}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
}

export const shopProducts = loadProducts();

export function getProduct(asin: string) {
  return shopProducts.find((product) => product.parent_asin === asin);
}

export function getProductImage(product: ShopProduct) {
  const image =
    product.images.find((candidate) => candidate.variant === "MAIN") ??
    product.images[0];
  return image?.hi_res ?? image?.large ?? image?.thumb ?? null;
}

export function getProductPath(product: ShopProduct) {
  return `/shop/dp/${product.parent_asin}`;
}
