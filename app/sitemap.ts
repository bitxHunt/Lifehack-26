import type { MetadataRoute } from "next";

import { getProductPath, shopProducts } from "@/lib/shop-products";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://shopwise-fashion-edit.z3e0.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/shop`, priority: 1, changeFrequency: "weekly" },
    { url: `${siteUrl}/shop/journey`, priority: 0.6, changeFrequency: "monthly" },
    ...shopProducts.map((product) => ({
      url: `${siteUrl}${getProductPath(product)}`,
      images: product.images
        .map((image) => image.hi_res ?? image.large)
        .filter((image): image is string => Boolean(image)),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
  ];
}
