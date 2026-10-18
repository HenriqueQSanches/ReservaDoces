import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera o servidor de desenvolvimento para o celular na rede local (só vale no `next dev`)
  allowedDevOrigins: ["192.168.0.100"],
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
