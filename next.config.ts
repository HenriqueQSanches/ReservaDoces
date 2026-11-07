import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libera o servidor de desenvolvimento para o celular em qualquer IP da rede local (só vale no `next dev`)
  allowedDevOrigins: ["192.168.*.*"],
  // Desligados para publicar na Cloudflare: o adaptador não suporta o cache composável, e o site não usa.
  cacheComponents: false,
  partialPrefetching: false,
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
