import type { Metadata } from "next";

import { EvaluationWorkspace } from "@/components/pickme/evaluation-workspace";
import { productPathFromAsin, toProductDraft } from "@/lib/pickme";
import { getProductImage, shopProducts } from "@/lib/shop-products";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://shopwise-fashion-edit.z3e0.chatgpt.site";

export const metadata: Metadata = {
  title: "AI Product Visibility Lab",
  description:
    "Test ecommerce product visibility with adversarial buyer intents, AI rankings, discovery traces, metadata scoring, and rerunnable fixes.",
};

export default function Home() {
  const products = shopProducts.map((product) => ({
    asin: product.parent_asin,
    title: product.title,
    url: `${siteUrl}${productPathFromAsin(product.parent_asin)}`,
    image: getProductImage(product),
    draft: toProductDraft(product),
  }));

  return <EvaluationWorkspace products={products} />;
}
