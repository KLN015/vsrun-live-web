import { cn } from "@/lib/utils";

/**
 * Le logo VSRUN et sa pastille LIVE.
 *
 * Un seul composant pour tout le produit — en-tête du dashboard, surface
 * publique, écrans de diffusion. Deux rendus séparés finiraient par diverger,
 * et c'est la marque qui en pâtirait.
 *
 * Deux fichiers, choisis par le fond : sur clair le « RUN » est noir, sur
 * sombre il est blanc. Le reste du logo — la lame et le « VS » — est orange
 * dans les deux cas.
 *
 * Le conteneur qui l'accueille doit être une boîte flex, et pas un bloc
 * ordinaire. Rendu en `inline-flex`, le logo se pose sinon sur une ligne de
 * texte : la réserve de jambage sous cette ligne allonge la boîte du parent de
 * quelques pixels, et un `items-center` voisin centre alors cette boîte trop
 * haute — le logo se retrouve remonté par rapport au reste de l'en-tête.
 */
export function VsrunLogo({
  variant = "light",
  live,
  accent,
  size = "default",
  className,
}: {
  /** Le fond sur lequel il se pose, pas la couleur du logo. */
  variant?: "light" | "dark";
  /**
   * Pastille LIVE : `true` la fait battre, `false` l'éteint sans la retirer,
   * `undefined` ne l'affiche pas.
   */
  live?: boolean;
  /** Couleur de la pastille. Par défaut l'orange VSRUN. */
  accent?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const heights = { sm: "h-11", default: "h-16", lg: "h-24" } as const;
  const color = accent ?? "var(--vsrun-orange)";

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant === "dark" ? "/img/logo_dark.png" : "/img/logo_light.png"}
        alt="VSRUN"
        className={cn("w-auto object-contain", heights[size])}
      />

      {live === undefined ? null : <LiveBadge live={live} color={color} />}
    </span>
  );
}

/**
 * La pastille LIVE, qui accompagne le logo VSRUN.
 *
 * Elle fait partie de ce dessin-là et de nul autre : un écran qui porte le logo
 * d'un organisateur l'affiche seul, sans pastille étrangère accolée.
 */
function LiveBadge({
  live,
  color = "var(--brand-accent, var(--vsrun-orange))",
}: {
  live: boolean;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
      }}
    >
      <span
        className={cn(
          "size-[7px] rounded-full",
          live && "animate-[vsrun-pulse_1.6s_ease-in-out_infinite]",
        )}
        style={{
          background: color,
          boxShadow: live ? `0 0 8px ${color}` : "none",
          opacity: live ? 1 : 0.35,
        }}
      />
      Live
    </span>
  );
}
