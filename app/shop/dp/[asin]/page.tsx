import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole, MapPin, ShieldCheck } from "lucide-react";

import { ProductCard, Price } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import {
  getProduct,
  getProductImage,
  getProductPath,
  shopProducts,
} from "@/lib/shop-products";

export const dynamicParams = false;

export function generateStaticParams() {
  return shopProducts.map((product) => ({ asin: product.parent_asin }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/dp/[asin]">): Promise<Metadata> {
  const { asin } = await params;
  const product = getProduct(asin);
  if (!product) return { title: "Product not found" };

  const description = (product.description[0] ?? product.features[0] ?? product.title)
    .replace(/\s+/g, " ")
    .slice(0, 160);
  const image = getProductImage(product);
  const socialImages = image ? [{ url: image, alt: product.title }] : [];

  return {
    title: product.title,
    description,
    alternates: { canonical: getProductPath(product) },
    openGraph: {
      title: product.title,
      description,
      type: "website",
      images: socialImages,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.title,
      description,
      images: image ? [image] : [],
    },
  };
}

function Rating({ value, count }: { value: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value} out of 5 stars, ${count} ratings`}>
      <span className="text-sm text-[#007185]">{value}</span>
      <span aria-hidden="true" className="tracking-[-0.08em] text-[#de7921]">
        {Array.from({ length: 5 }, (_, index) => index < Math.round(value) ? "★" : "☆").join("")}
      </span>
      <span className="text-sm text-[#007185]">{count.toLocaleString()} ratings</span>
    </span>
  );
}

export default async function ProductPage({ params }: PageProps<"/shop/dp/[asin]">) {
  const { asin } = await params;
  const product = getProduct(asin);
  if (!product) notFound();

  const relatedProducts = shopProducts
    .filter((candidate) => candidate.parent_asin !== product.parent_asin)
    .slice(0, 4);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description.join(" "),
    image: product.images
      .map((candidate) => candidate.hi_res ?? candidate.large)
      .filter(Boolean),
    sku: product.parent_asin,
    brand: { "@type": "Brand", name: product.store },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.average_rating,
      reviewCount: product.rating_number,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.price,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema).replaceAll("<", "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-5 text-xs text-slate-500">
          <Link href="/shop" className="hover:text-[#c7511f] hover:underline">Amazon Fashion</Link>
          <span aria-hidden="true" className="px-2">›</span>
          <span>{product.store}</span>
          <span aria-hidden="true" className="px-2">›</span>
          <span>ASIN {product.parent_asin}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.9fr)_260px]">
          <ProductGallery images={product.images} productTitle={product.title} />

          <article>
            <h1 className="text-2xl font-normal leading-8 text-slate-950 sm:text-3xl sm:leading-10">{product.title}</h1>
            <a href="#product-details" className="mt-1 inline-block text-sm text-[#007185] hover:text-[#c7511f] hover:underline">
              Visit the {product.store} Store
            </a>
            <div className="mt-2 border-b border-slate-200 pb-3">
              <Rating value={product.average_rating} count={product.rating_number} />
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-600">Price</p>
              <Price value={product.price} />
              <p className="mt-1 text-sm">No Import Fees Deposit &amp; FREE Shipping to Singapore</p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-200 py-4 text-center text-xs text-[#007185]">
              <div><ShieldCheck className="mx-auto mb-1 size-7 text-slate-500" /><span>Secure transaction</span></div>
              <div><MapPin className="mx-auto mb-1 size-7 text-slate-500" /><span>Ships worldwide</span></div>
              <div><LockKeyhole className="mx-auto mb-1 size-7 text-slate-500" /><span>Privacy protected</span></div>
            </div>

            <section aria-labelledby="about-heading" className="mt-5">
              <h2 id="about-heading" className="text-lg font-bold">About this item</h2>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-5">
                {product.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </section>
          </article>

          <aside className="rounded-lg border border-slate-300 p-4 shadow-sm">
            <Price value={product.price} />
            <p className="mt-3 text-sm leading-5">FREE delivery <strong>Tuesday, September 8</strong></p>
            <p className="mt-3 flex gap-2 text-xs text-[#007185]"><MapPin className="size-4 shrink-0" /> Deliver to Singapore 048583</p>
            <p className="mt-4 text-lg text-[#007600]">In Stock</p>
            <label htmlFor="quantity" className="mt-3 block text-xs font-medium">Quantity:</label>
            <select id="quantity" className="mt-1 w-full rounded-md border border-slate-400 bg-slate-100 px-3 py-1.5 text-sm shadow-sm">
              <option>1</option><option>2</option><option>3</option>
            </select>
            <button type="button" className="mt-4 w-full rounded-full bg-[#ffd814] px-4 py-2 text-sm hover:bg-[#f7ca00]">Add to Cart</button>
            <button type="button" className="mt-2 w-full rounded-full bg-[#ffa41c] px-4 py-2 text-sm hover:bg-[#fa8900]">Buy Now</button>
            <dl className="mt-4 grid grid-cols-[72px_1fr] gap-y-1 text-xs">
              <dt className="text-slate-500">Ships from</dt><dd>Shopwise</dd>
              <dt className="text-slate-500">Sold by</dt><dd className="text-[#007185]">{product.store}</dd>
              <dt className="text-slate-500">Returns</dt><dd className="text-[#007185]">30-day refund</dd>
            </dl>
            <button type="button" className="mt-4 w-full rounded-md border border-slate-400 bg-white px-3 py-1.5 text-left text-xs shadow-sm hover:bg-slate-50">Add to List</button>
          </aside>
        </div>

        <section id="product-details" aria-labelledby="details-heading" className="mt-12 border-t border-slate-300 pt-8">
          <h2 id="details-heading" className="text-2xl font-bold text-[#cc6600]">Product information</h2>
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <dl className="overflow-hidden border border-slate-200 text-sm">
              {Object.entries(product.details).map(([label, value], index) => (
                <div key={label} className={`grid grid-cols-[minmax(130px,0.42fr)_1fr] ${index % 2 === 0 ? "bg-slate-100" : "bg-white"}`}>
                  <dt className="p-3 font-semibold">{label}</dt>
                  <dd className="p-3">{value}</dd>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(130px,0.42fr)_1fr] bg-slate-100">
                <dt className="p-3 font-semibold">ASIN</dt><dd className="p-3">{product.parent_asin}</dd>
              </div>
            </dl>
            <div>
              <h3 className="text-lg font-bold">Product description</h3>
              <div className="mt-3 space-y-4 text-sm leading-6 text-slate-700">
                {product.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="related-heading" className="mt-12 border-t border-slate-300 pt-8">
          <h2 id="related-heading" className="text-xl font-bold">Customers who viewed this item also viewed</h2>
          <div className="mt-5 grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4 sm:gap-4 sm:bg-transparent">
            {relatedProducts.map((candidate) => <ProductCard key={candidate.parent_asin} product={candidate} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
