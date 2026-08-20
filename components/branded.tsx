import type { ReactNode } from "react";
import { BrandFontFaces } from "@/components/brand-faces";
import { brandStyle, type Brand } from "@/lib/brand";

/**
 * Applique une identité visuelle à ses enfants.
 *
 * Les couleurs deviennent des propriétés personnalisées CSS posées sur un
 * conteneur, et les polices des `font-family` résolues depuis la liste fermée.
 * Rien n'est concaténé dans une feuille de style : une valeur de marque ne peut
 * pas devenir une règle CSS.
 */
export function Branded({
  brand,
  children,
  className = "",
}: {
  brand: Brand;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      style={{
        ...brandStyle(brand),
        backgroundColor: "var(--brand-background)",
        color: "var(--brand-text)",
        fontFamily: "var(--brand-font-body)",
      }}
      className={className}
    >
      <BrandFontFaces brand={brand} />
      {children}
    </div>
  );
}

/** Titre à la police de titrage de la marque. */
export function BrandHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1
      style={{ fontFamily: "var(--brand-font-heading)" }}
      className={className}
    >
      {children}
    </h1>
  );
}
