import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "export",
  // Static export produces one .html file per route; StaticFiles(html=True) on the
  // FastAPI side only auto-resolves directory + index.html, so routes must use a
  // trailing slash end-to-end (this also makes next/link emit matching hrefs).
  trailingSlash: true,
};

export default nextConfig;
