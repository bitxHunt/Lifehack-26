import Link from "next/link";
import { MapPin, Menu, Search, ShoppingCart } from "lucide-react";

export function ShopHeader() {
  return (
    <header className="text-white">
      <div className="flex min-h-16 flex-wrap items-center gap-3 bg-[#131921] px-3 py-2 sm:flex-nowrap sm:px-5">
        <Link
          href="/shop"
          aria-label="Shopwise home"
          className="shrink-0 rounded-sm border border-transparent px-2 py-1 hover:border-white focus-visible:border-white"
        >
          <span className="block text-2xl font-bold tracking-tight">
            shop<span className="text-[#ff9900]">wise</span>
          </span>
          <span className="-mt-1 block text-[9px] uppercase tracking-[0.2em] text-slate-300">
            demo store
          </span>
        </Link>

        <button className="hidden min-w-36 items-center gap-1 rounded-sm border border-transparent px-2 py-1 text-left hover:border-white lg:flex">
          <MapPin className="mt-2 size-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="block text-xs text-slate-300">Deliver to</span>
            <span className="block text-sm font-bold">Singapore 048583</span>
          </span>
        </button>

        <form action="/shop" className="order-last flex h-10 w-full sm:order-none sm:flex-1">
          <label htmlFor="shop-search" className="sr-only">
            Search Shopwise
          </label>
          <select
            aria-label="Search department"
            className="hidden rounded-l-md border-r border-slate-300 bg-slate-100 px-3 text-xs text-slate-700 outline-none sm:block"
            defaultValue="fashion"
          >
            <option value="fashion">Fashion</option>
          </select>
          <input
            id="shop-search"
            name="q"
            type="search"
            placeholder="Search Shopwise"
            className="min-w-0 flex-1 rounded-l-md bg-white px-4 text-sm text-slate-950 outline-none focus:ring-4 focus:ring-[#ff9900] sm:rounded-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex w-12 items-center justify-center rounded-r-md bg-[#febd69] text-slate-950 hover:bg-[#f3a847]"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
        </form>

        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
          <button className="rounded-sm border border-transparent px-2 py-1 text-left hover:border-white">
            <span className="block text-xs">Hello, sign in</span>
            <span className="block text-sm font-bold">Account & Lists</span>
          </button>
          <button className="hidden rounded-sm border border-transparent px-2 py-1 text-left hover:border-white md:block">
            <span className="block text-xs">Returns</span>
            <span className="block text-sm font-bold">& Orders</span>
          </button>
          <button
            className="flex items-end rounded-sm border border-transparent px-2 py-1 hover:border-white"
            aria-label="Cart, 0 items"
          >
            <span className="relative">
              <ShoppingCart className="size-8" aria-hidden="true" />
              <span className="absolute -top-2 left-3 text-sm font-bold text-[#ff9900]">
                0
              </span>
            </span>
            <span className="hidden pb-0.5 text-sm font-bold md:inline">Cart</span>
          </button>
        </div>
      </div>

      <nav
        aria-label="Shop departments"
        className="flex h-10 items-center gap-1 overflow-x-auto bg-[#232f3e] px-3 text-sm sm:px-5"
      >
        <Link
          href="/"
          className="shrink-0 rounded-sm border border-[#ff9900]/60 bg-[#ff9900]/10 px-2 py-1 font-bold text-[#ffd38f] hover:border-[#ff9900]"
        >
          PickMe Lab
        </Link>
        <Link
          href="/shop"
          className="flex shrink-0 items-center gap-1 rounded-sm border border-transparent px-2 py-1 font-bold hover:border-white"
        >
          <Menu className="size-5" aria-hidden="true" /> All
        </Link>
        <Link href="/shop" className="shrink-0 rounded-sm border border-transparent px-2 py-1 hover:border-white">
          Today&apos;s Deals
        </Link>
        <Link href="/shop" className="shrink-0 rounded-sm border border-transparent px-2 py-1 hover:border-white">
          Fashion
        </Link>
        <Link href="/shop" className="shrink-0 rounded-sm border border-transparent px-2 py-1 hover:border-white">
          Customer Service
        </Link>
        <Link href="/shop/journey" className="shrink-0 rounded-sm border border-transparent px-2 py-1 hover:border-white">
          Path editor
        </Link>
        <a href="/shop/catalog.json" className="shrink-0 rounded-sm border border-transparent px-2 py-1 hover:border-white">
          Catalog JSON
        </a>
        <span className="ml-auto hidden text-xs font-semibold text-slate-200 md:inline">
          AI-ready demo catalog
        </span>
      </nav>
    </header>
  );
}
