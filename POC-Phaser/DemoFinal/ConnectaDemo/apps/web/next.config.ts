import type { NextConfig } from "next";
import path from "node:path";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/")))
  throw new Error(
    "NEXT_PUBLIC_BASE_PATH must start with / and have no trailing slash.",
  );
const config: NextConfig = {
  basePath,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: path.resolve(__dirname, "../..") },
  images: { unoptimized: true },
};
export default config;
