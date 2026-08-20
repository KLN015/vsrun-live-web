import type { Brand } from "@/lib/brand";

/**
 * L'icône d'onglet d'une page habillée par une charte.
 *
 * Rendue sous forme de métadonnées Next plutôt que d'une balise posée à la
 * main : c'est le seul moyen qu'elle remplace celle du site au lieu de s'y
 * ajouter. Sans favicon dans la charte, on ne renvoie rien — l'icône VSRUN
 * reste alors en place, ce qui vaut mieux qu'un onglet sans icône.
 */
export function brandIcons(brand: Brand | undefined | null) {
  if (!brand?.favicon_url) return undefined;

  return { icon: [{ url: brand.favicon_url }] };
}
