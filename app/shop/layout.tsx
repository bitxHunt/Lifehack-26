import { ShopHeader } from "@/components/shop/shop-header";

export default function ShopLayout({ children }: LayoutProps<"/shop">) {
  return (
    <div className="min-h-screen bg-[#eaeded] text-slate-950">
      <ShopHeader />
      {children}
      <footer className="mt-10 bg-[#131a22] px-5 py-10 text-center text-xs text-slate-300">
        <p className="font-semibold text-white">Shopwise demo store</p>
        <p className="mt-2">
          A fictional storefront built from public catalog metadata. No orders
          are processed.
        </p>
      </footer>
    </div>
  );
}
