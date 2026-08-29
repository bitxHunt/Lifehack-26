import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      "https://shopwise-fashion-edit.z3e0.chatgpt.site",
  ),
  title: {
    default: "Shopwise — Fashion demo store",
    template: "%s | Shopwise",
  },
  description:
    "An AI-accessible demo fashion store built from five Amazon Fashion catalog records.",
  openGraph: {
    title: "Shopwise Fashion Edit",
    description: "Five products. One agent-ready storefront.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1729,
        height: 910,
        alt: "Shopwise Fashion Edit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopwise Fashion Edit",
    description: "Five products. One agent-ready storefront.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
