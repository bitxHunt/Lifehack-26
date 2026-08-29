import productData from "@/data/amazon_fashion_5_complete_records.json";

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

export const shopProducts = productData as ShopProduct[];

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
