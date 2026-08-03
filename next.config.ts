import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Vercel runs the standard Next.js build, where Cloudflare's virtual module
  // does not exist. The shim keeps optional D1/R2 persistence unavailable but
  // lets the rest of the application and its APIs run normally.
  webpack(config, { webpack }) {
    if (process.env.VERCEL === "1") {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^cloudflare:workers$/,
          path.resolve(
            process.cwd(),
            "lib/server/cloudflare-workers-vercel.ts",
          ),
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
