import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagens: desabilitamos a otimização interna pois usamos nosso próprio proxy
  images: {
    unoptimized: true,
  },

  // Aumenta o timeout padrão das rotas de API (scraping pode demorar)
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Pacotes nativos / scrapers pesados no server
  serverExternalPackages: ["@consumet/extensions", "hls.js"],
};

export default nextConfig;

