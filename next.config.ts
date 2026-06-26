import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the `'use cache'` directive + `cacheLife()` / `cacheTag()`
  // for Server Components. Used by `src/app/_landing/services-section.tsx`
  // to cache the ACTIVE services query for 5 minutes.
  cacheComponents: true,
};

export default nextConfig;
