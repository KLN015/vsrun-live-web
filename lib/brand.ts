import type { CSSProperties } from "react";
import { fontFamily } from "./fonts";

/**
 * Identité visuelle telle que l'API la renvoie.
 *
 * Toujours présente : le backend résout événement → organisation → identité
 * VSRUN. Le frontend n'a donc jamais à inventer des couleurs de repli.
 */
export type Brand = {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  /**
   * Trois polices : les titres, le texte courant, et les **chiffres**. Un écran
   * de compétition n'affiche presque que des nombres, et ce qui fait une bonne
   * police de texte dessert justement les colonnes de chronos.
   */
  fonts: { heading: BrandFont; body: BrandFont; numeric: BrandFont };
  logo_url: string | null;
  favicon_url: string | null;
};

/**
 * Une police de charte, et d'où elle vient.
 *
 * Deux provenances, que le rendu traite différemment : une famille du
 * catalogue est déjà embarquée par le site, une police déposée par
 * l'organisation doit être déclarée en `@font-face` avant d'être utilisable.
 *
 * `family` n'est jamais le nom saisi par l'organisateur — c'est
 * `vsrun-font-<uuid>`, dérivé côté serveur de l'identifiant de la police. C'est
 * ce qui permet d'accepter un fichier libre sans qu'aucun texte d'organisateur
 * n'atteigne une feuille de style.
 */
export type BrandFont =
  | { source: "library"; key: BrandFontKey; name: string }
  | {
      source: "custom";
      id: string;
      name: string;
      family: string;
      css_format: string;
      url: string;
    };

export type BrandFontKey =
  | "inter"
  | "geist"
  | "roboto"
  | "montserrat"
  | "oswald"
  | "barlow-condensed"
  | "bebas-neue"
  | "source-sans-3";

/**
 * Traduit une marque en propriétés personnalisées CSS.
 *
 * Le résultat est destiné à l'attribut `style` d'un conteneur — un objet de
 * paires nom/valeur, jamais une chaîne de CSS. React échappe les valeurs, et
 * les couleurs ont déjà été validées côté serveur comme `#rrggbb` stricts. Il
 * n'existe donc aucun chemin par lequel une valeur de marque deviendrait une
 * règle CSS, encore moins un script.
 */
export function brandStyle(brand: Brand): CSSProperties {
  return {
    "--brand-primary": brand.colors.primary,
    "--brand-secondary": brand.colors.secondary,
    "--brand-background": brand.colors.background,
    "--brand-text": brand.colors.text,
    "--brand-accent": brand.colors.accent,

    // Les polices suivent les couleurs plutôt que d'être recopiées à chaque
    // point d'application : les trois endroits qui habillent une page — page
    // publique, écran, aperçu — répétaient les mêmes trois lignes, et l'un
    // d'eux finissait toujours par être oublié.
    "--brand-font-heading": fontFamily(brand.fonts.heading),
    "--brand-font-body": fontFamily(brand.fonts.body),
    "--brand-font-numeric": fontFamily(brand.fonts.numeric),
  } as CSSProperties;
}

/**
 * Les polices déposées d'une charte, sans doublon.
 *
 * Une charte qui emploie la même police pour les titres et les chiffres ne doit
 * pas la déclarer — ni la télécharger — deux fois.
 */
export function customFonts(brand: Brand) {
  const seen = new Map<string, Extract<Brand["fonts"]["body"], { source: "custom" }>>();

  for (const font of [brand.fonts.heading, brand.fonts.body, brand.fonts.numeric]) {
    if (font.source === "custom") seen.set(font.id, font);
  }

  return [...seen.values()];
}
