import { LiveBadge, VsrunLogo } from "@/components/vsrun-logo";
import { cn } from "@/lib/utils";

/**
 * L'habillage d'un écran de diffusion : logo, pastille LIVE, nom de la
 * compétition.
 *
 * Repris du prototype `vsrun-live` — un écran de tribune doit dire d'où il
 * parle et qu'il parle *maintenant*. Le point qui bat est ce qui distingue un
 * affichage vivant d'une capture oubliée sur un projecteur : c'est la seule
 * chose qui bouge quand aucun résultat ne tombe.
 *
 * La couleur vient de `--brand-accent` et non de `--brand-primary` : dans cette
 * charte, `primary` est une encre sombre — la pastille aurait été noire sur
 * noir. `accent` est la couleur qui ressort, celle des titres d'épreuve.
 *
 * Alignement : les trois éléments partagent une même ligne, centrés les uns sur
 * les autres. L'identité de l'organisateur ne cède jamais de place (`shrink-0`)
 * — c'est son écran ; c'est le nom de la compétition qui se tronque si la
 * fenêtre est étroite. Ce `min-w-0` n'est pas décoratif : sans lui, un élément
 * de flex refuse de descendre sous la largeur de son texte, `truncate` reste
 * sans effet et le nom vient chevaucher la pastille.
 */
export function DisplayChrome({
  eventName,
  live,
  logoUrl,
  compact = false,
}: {
  eventName?: string;
  /** L'événement est-il en cours ? Hors direct, le point cesse de battre. */
  live: boolean;
  /** Le logo de l'organisateur, s'il en a déposé un dans sa charte. */
  logoUrl?: string | null;
  compact?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex shrink-0 items-center gap-3">
        {logoUrl ? (
          // La charte de l'organisateur prime : c'est son écran, sa
          // compétition. VSRUN reste identifiable par la pastille et le pied
          // de page public.
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt=""
              className={cn(
                "w-auto object-contain",
                compact ? "h-11" : "h-16",
              )}
            />
            <LiveBadge live={live} />
          </>
        ) : (
          <VsrunLogo
            variant="dark"
            live={live}
            accent="var(--brand-accent)"
            size={compact ? "sm" : "default"}
          />
        )}
      </div>

      {eventName ? (
        <p
          className={cn(
            "min-w-0 truncate text-right font-medium opacity-70",
            compact ? "text-[10px]" : "text-sm",
          )}
        >
          {eventName}
        </p>
      ) : null}
    </header>
  );
}
