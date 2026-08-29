import {
  getProductImage,
  getProductPath,
  shopProducts,
} from "@/lib/shop-products";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      schema_version: "1.0",
      name: "Shopwise Fashion Edit",
      description:
        "A fictional, AI-accessible ecommerce catalog containing five complete Amazon Fashion metadata records.",
      entrypoint: "/shop",
      path_editor: "/shop/journey",
      product_route_pattern: "/shop/dp/{parent_asin}",
      products: shopProducts.map((product) => ({
        ...product,
        path: getProductPath(product),
        primary_image: getProductImage(product),
      })),
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
