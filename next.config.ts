import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera o servidor de desenvolvimento para o celular em qualquer IP da rede local (só vale no `next dev`)
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
