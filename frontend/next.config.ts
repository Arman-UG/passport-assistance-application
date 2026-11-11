import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone is for containerized Docker; on Vercel, Vercel traces serverless functions natively
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
  serverExternalPackages: ["jose"],
};

export default nextConfig;
