"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/lib/shop-products";

export function ProductGallery({
  images,
  productTitle,
}: {
  images: ProductImage[];
  productTitle: string;
}) {
  const availableImages = images.filter(
    (image) => image.hi_res || image.large || image.thumb,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = availableImages[selectedIndex] ?? availableImages[0];
  const selectedSource = selected?.hi_res ?? selected?.large ?? selected?.thumb;

  if (!selectedSource) {
    return (
      <div className="flex aspect-square items-center justify-center bg-slate-100 text-sm text-slate-500">
        No product image available
      </div>
    );
  }

  return (
    <section aria-label="Product images" className="grid grid-cols-[52px_1fr] gap-4">
      <div className="flex flex-col gap-2">
        {availableImages.map((image, index) => {
          const source = image.thumb ?? image.large ?? image.hi_res;
          if (!source) return null;
          return (
            <button
              key={`${image.variant}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show ${image.variant.toLowerCase()} view`}
              aria-pressed={index === selectedIndex}
              className={`relative aspect-square overflow-hidden rounded border bg-white ${
                index === selectedIndex
                  ? "border-[#e77600] ring-1 ring-[#e77600]"
                  : "border-slate-400 hover:border-[#e77600]"
              }`}
            >
              <Image src={source} alt="" fill sizes="52px" className="object-contain p-0.5" />
            </button>
          );
        })}
      </div>
      <div className="relative aspect-square min-w-0 bg-white">
        <Image
          src={selectedSource}
          alt={`${productTitle}, ${selected.variant.toLowerCase()} view`}
          fill
          priority
          sizes="(max-width: 768px) 80vw, 45vw"
          className="object-contain"
        />
      </div>
    </section>
  );
}
