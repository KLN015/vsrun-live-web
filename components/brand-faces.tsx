import { customFonts, type Brand } from "@/lib/brand";
import type { ManagedFont } from "@/lib/types";

/** Ce dont une déclaration a besoin — commun à une charte et au dashboard. */
type Face = { id: string; family: string; css_format: string; url: string };

/**
 * Les règles `@font-face` d'un jeu de polices déposées.
 *
 * C'est le seul endroit du produit où une valeur venue de la base devient une
 * règle CSS, et c'est délibérément resserré : les trois valeurs interpolées
 * sont une famille `vsrun-font-<uuid>` dérivée côté serveur, une URL d'API
 * construite par le serveur, et un mot-clé de format pris dans une énumération
 * fermée. Aucune n'est un texte d'organisateur — le nom qu'il donne à sa police
 * ne sert qu'à l'affichage dans le dashboard.
 *
 * Les deux filtres relisent cette garantie plutôt que de la supposer : si une
 * famille cessait un jour d'être un simple identifiant, la déclaration est
 * omise et l'affichage retombe sur la police de repli.
 *
 * `swap` plutôt que `block` : mieux vaut un titre en Inter pendant deux
 * secondes qu'un écran de tribune vide le temps du téléchargement.
 */
function faceRules(fonts: Face[]): string[] {
  return fonts
    .filter((font) => /^vsrun-font-[0-9a-f-]{36}$/.test(font.family))
    .filter((font) => /^[a-z0-9-]+$/.test(font.css_format))
    .map(
      (font) => `@font-face {
  font-family: "${font.family}";
  src: url("${encodeURI(font.url)}") format("${font.css_format}");
  font-display: swap;
}`,
    );
}

/**
 * `href` et `precedence` confient la feuille à React, qui la remonte dans le
 * `<head>` et la dédoublonne : une page qui affiche plusieurs blocs habillés
 * par la même charte ne déclare la police qu'une fois.
 */
function FontFaces({ fonts }: { fonts: Face[] }) {
  const rules = faceRules(fonts);

  if (rules.length === 0) return null;

  return (
    <style
      href={`fonts-${fonts.map((font) => font.id).join("-")}`}
      precedence="medium"
    >
      {rules.join("\n")}
    </style>
  );
}

/** Les polices déposées qu'emploie une charte. */
export function BrandFontFaces({ brand }: { brand: Brand }) {
  return <FontFaces fonts={customFonts(brand)} />;
}

/** Celles du catalogue d'une organisation, pour les montrer telles qu'elles sont. */
export function ManagedFontFaces({ fonts }: { fonts: ManagedFont[] }) {
  return <FontFaces fonts={fonts} />;
}
