import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Sortie autonome : `next build` produit un serveur Node qui n'embarque que
   * les dépendances réellement atteintes. L'image de production pèse quelques
   * dizaines de mégaoctets au lieu de plusieurs centaines, et ne contient plus
   * ni sources ni `node_modules` complet.
   */
  output: "standalone",
};

export default nextConfig;
