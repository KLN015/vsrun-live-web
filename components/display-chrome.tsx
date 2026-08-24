import { VsrunLogo } from "@/components/vsrun-logo";
import { cn } from "@/lib/utils";

/**
 * L'habillage d'un écran de diffusion : l'identité de l'organisateur, et rien
 * d'autre.
 *
 * Le nom de la compétition en faisait partie ; il n'y est plus. Le public d'une
 * tribune sait à quelle compétition il assiste — le lui répéter en petit dans
 * un coin ne lui apprenait rien et prenait la place de ce qu'il vient lire.
 *
 * La pastille LIVE non plus, dès qu'un logo personnalisé est déposé :
 * l'organisateur compose une identité, y accoler une marque étrangère la
 * défait. Elle reste sur le logo VSRUN, où elle fait partie du dessin — le
 * point qui bat distingue alors un affichage vivant d'une capture oubliée sur
 * un projecteur.
 *
 * La couleur vient de `--brand-accent` et non de `--brand-primary` : dans cette
 * charte, `primary` est une encre sombre — la pastille aurait été noire sur
 * noir. `accent` est la couleur qui ressort, celle des titres d'épreuve.
 */
export function DisplayChrome({
  live,
  logoUrl,
  compact = false,
}: {
  /** L'événement est-il en cours ? Hors direct, le point cesse de battre. */
  live: boolean;
  /** Le logo de l'organisateur, s'il en a déposé un dans sa charte. */
  logoUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3">
      {logoUrl ? (
        // La charte de l'organisateur prime : c'est son écran, sa compétition.
        // VSRUN reste identifiable par le pied de page public.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={cn("w-auto object-contain", compact ? "h-11" : "h-16")}
        />
      ) : (
        <VsrunLogo
          variant="dark"
          live={live}
          accent="var(--brand-accent)"
          size={compact ? "sm" : "default"}
        />
      )}
    </header>
  );
}
