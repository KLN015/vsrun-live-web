import {
  Barlow_Condensed,
  Bebas_Neue,
  Geist,
  Inter,
  Montserrat,
  Oswald,
  Roboto,
  Source_Sans_3,
} from "next/font/google";
import type { BrandFont, BrandFontKey } from "./brand";

/**
 * Polices de marque autorisées.
 *
 * `next/font/google` les télécharge **à la construction** et les sert depuis
 * vsrun.live : aucune requête vers un tiers à l'exécution. Un spectateur en
 * tribune ne dépend donc pas d'un service externe, et son adresse IP n'est
 * transmise à personne.
 *
 * La liste est fermée et miroir de App\Enums\BrandFont côté Laravel. Une marque
 * choisit parmi ces valeurs, elle n'en fournit jamais : c'est ce qui rend
 * impossible l'injection d'une déclaration `@font-face` arbitraire.
 */

const inter = Inter({ subsets: ["latin"], variable: "--font-brand-inter" });
const geist = Geist({ subsets: ["latin"], variable: "--font-brand-geist" });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-brand-roboto" });
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-brand-montserrat",
});
const oswald = Oswald({ subsets: ["latin"], variable: "--font-brand-oswald" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-brand-barlow-condensed",
});
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brand-bebas-neue",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-brand-source-sans-3",
});

const FONTS = {
  inter,
  geist,
  roboto,
  montserrat,
  oswald,
  "barlow-condensed": barlowCondensed,
  "bebas-neue": bebasNeue,
  "source-sans-3": sourceSans,
} as const;

/** Toutes les classes de variables, à poser une fois sur le document. */
export const allFontVariables = Object.values(FONTS)
  .map((font) => font.variable)
  .join(" ");

/**
 * Nom de la variable CSS d'une police du catalogue.
 *
 * Passe par la table ci-dessus : une clé inconnue retombe sur Inter plutôt que
 * de produire une valeur arbitraire — même si le backend garantit déjà que la
 * valeur appartient à la liste.
 */
export function fontVariable(key: BrandFontKey): string {
  return (FONTS[key] ?? inter).style.fontFamily;
}

/**
 * La `font-family` d'un emplacement de charte, quelle que soit sa provenance.
 *
 * Pour une police déposée, la famille est celle que le serveur a dérivée de
 * l'identifiant — `vsrun-font-<uuid>`. Inter reste en repli dans la pile : le
 * fichier peut mettre un instant à arriver, ou ne jamais arriver, et un écran
 * de tribune ne doit pas attendre pour afficher un chrono.
 */
export function fontFamily(font: BrandFont): string {
  if (font.source === "custom") {
    return `"${font.family}", ${inter.style.fontFamily}`;
  }

  return fontVariable(font.key);
}
