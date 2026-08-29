import Image from "next/image";
import Link from "next/link";

import {
  getProductImage,
  getProductPath,
  type ShopProduct,
} from "@/lib/shop-products";

export function Price({ value }: { value: number }) {
  const [whole, cents] = value.toFixed(2).split(".");
  return (
    <span
      className="inline-flex items-start text-slate-950"
      aria-label={`$${value.toFixed(2)}`}
    >
      <span className="mt-1 text-sm">$</span>
      <span className="text-3xl leading-none">{whole}</span>
      <span className="mt-1 text-sm">{cents}</span>
    </span>
  );
}

export function ProductCard({ product }: { product: ShopProduct }) {
  const href = getProductPath(product);
  const image = getProductImage(product);
  const roundedRating = Math.round(product.average_rating);

  return (
    <article className="group flex min-w-0 flex-col border-b border-slate-200 bg-white p-4 sm:border sm:shadow-sm">
      <Link
        href={href}
        className="relative mb-4 block aspect-square overflow-hidden bg-white"
      >
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
            No image
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {product.store}
        </p>
        <h2 className="line-clamp-3 text-sm leading-5 text-slate-900">
          <Link href={href} className="hover:text-[#c7511f] hover:underline">
            {product.title}
          </Link>
        </h2>
        <div
          className="mt-2 flex items-center gap-1"
          aria-label={`${product.average_rating} out of 5 stars, ${product.rating_number} ratings`}
        >
          <span aria-hidden="true" className="tracking-[-0.08em] text-[#de7921]">
            {Array.from({ length: 5 }, (_, index) =>
              index < roundedRating ? "★" : "☆",
            ).join("")}
          </span>
          <span className="text-xs text-[#007185]">
            {product.rating_number.toLocaleString()}
          </span>
        </div>
        <div className="mt-2">
          <Price value={product.price} />
        </div>
        <p className="mt-1 text-xs text-slate-600">
          FREE delivery on eligible orders
        </p>
        <Link
          href={href}
          className="mt-4 w-fit rounded-full bg-[#ffd814] px-4 py-2 text-xs font-medium text-slate-950 shadow-sm hover:bg-[#f7ca00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
        >
          View product
        </Link>
      </div>
    </article>
  );
}
