import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything here is deterministic, in-memory data -- no database, no env,
  // nothing to configure. Left explicit so the file is obvious rather than empty.
  reactStrictMode: true,
};

export default nextConfig;
