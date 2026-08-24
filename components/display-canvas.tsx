import { AutoScroll } from "@/components/auto-scroll";
import { BrandFontFaces } from "@/components/brand-faces";
import { brandStyle, scaled, type Brand } from "@/lib/brand";
import {
  DISPLAY_LAYOUT_GRID,
  DISPLAY_ZONE_SPAN,
  type DisplayLayout,
  type PublicResult,
  type PublicVideo,
  type RenderedZone,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Rendu d'un écran de diffusion.
 *
 * Le même composant sert à l'écran réel et à l'aperçu du panneau de contrôle,
 * à l'échelle près : l'organisateur voit exactement ce que verra la tribune.
 * Deux rendus séparés divergeraient dès la première modification.
 *
 * Volontairement sans état et sans dépendance : il reçoit des zones résolues
 * et les dessine.
 */
export function DisplayCanvas({
  layout,
  zones,
  brand,
  compact = false,
}: {
  layout: DisplayLayout;
  zones: RenderedZone[];
  /** Charte de l'organisateur — c'est souvent la première chose que voit le public. */
  brand?: Brand;
  /** Aperçu : typographie réduite, pour tenir dans une carte du dashboard. */
  compact?: boolean;
}) {
  return (
    <div
      style={
        brand
          ? {
              ...brandStyle(brand),
              backgroundColor: "var(--brand-background)",
              color: "var(--brand-text)",
              fontFamily: "var(--brand-font-body)",
            }
          : undefined
      }
      className={cn(
        "grid h-full w-full gap-2 p-2",
        // Sans marque — l'aperçu du dashboard — on garde le rendu sombre neutre.
        brand ? "" : "bg-neutral-950 text-neutral-50",
        DISPLAY_LAYOUT_GRID[layout],
      )}
    >
      {brand ? <BrandFontFaces brand={brand} /> : null}

      {zones.map((zone) => (
        <div
          key={zone.position}
          style={brand ? { backgroundColor: "color-mix(in srgb, var(--brand-text) 6%, var(--brand-background))" } : undefined}
          className={cn(
            "overflow-hidden rounded-md p-3",
            brand ? "" : "bg-neutral-900",
            DISPLAY_ZONE_SPAN[layout]?.[zone.position],
          )}
        >
          <Zone zone={zone} compact={compact} />
        </div>
      ))}
    </div>
  );
}

function Zone({ zone, compact }: { zone: RenderedZone; compact: boolean }) {
  if (zone.content_type === "empty" || zone.content === null) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-700">
        <span className={compact ? "text-[10px]" : "text-sm"}>
          {zone.content_type === "empty" ? "" : "En attente"}
        </span>
      </div>
    );
  }

  if ("video" in zone.content) {
    return (
      <VideoZone
        video={zone.content.video}
        loop={zone.content.loop}
        muted={zone.content.muted}
        compact={compact}
      />
    );
  }

  const title =
    "discipline" in zone.content
      ? zone.content.discipline.name
      : "Derniers résultats";

  return (
    <div className="flex h-full flex-col">
      <h2
        style={{
          fontFamily: "var(--brand-font-heading)",
          color: "var(--brand-accent)",
          fontSize: scaled(compact ? "11px" : "3rem", "heading"),
        }}
        className="mb-2 shrink-0 font-semibold tracking-tight"
      >
        {title}
      </h2>

      <ResultList results={zone.content.results} compact={compact} />
    </div>
  );
}

/**
 * Vidéo d'écran.
 *
 * Muette et en boucle : elle tourne en fond de tribune, sans personne pour la
 * relancer. `playsInline` évite qu'un navigateur mobile la passe en plein écran
 * de lui-même, ce qui masquerait les autres zones.
 */
function VideoZone({
  video,
  loop,
  muted,
  compact,
}: {
  video: PublicVideo;
  loop: boolean;
  muted: boolean;
  compact: boolean;
}) {
  if (compact) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] opacity-60">
        {video.title}
      </div>
    );
  }

  return (
    <video
      src={video.source_url}
      poster={video.thumbnail_url ?? undefined}
      autoPlay
      loop={loop}
      muted={muted}
      playsInline
      controls={false}
      className="h-full w-full rounded object-cover"
    />
  );
}

function ResultList({
  results,
  compact,
}: {
  results: PublicResult[];
  compact: boolean;
}) {
  if (results.length === 0) {
    return (
      <p
        className="text-neutral-600"
        style={{ fontSize: scaled(compact ? "10px" : "1.96875rem", "body") }}
      >
        En attente de résultats
      </p>
    );
  }

  return (
    <AutoScroll ids={results.map((result) => result.id)} enabled={!compact}>
      <ol>
        {results.map((result) => (
        <li
          key={result.id}
          // Repère de la ligne, pour qu'un temps qui vient de tomber puisse
          // être amené à l'écran.
          data-row={result.id}
          className="flex items-baseline gap-3 border-b border-neutral-800 py-1 last:border-0"
          style={{ fontSize: scaled(compact ? "10px" : "2.1875rem", "body") }}
        >
          <span
            className={cn(
              "shrink-0 tabular-nums text-neutral-500",
              compact ? "w-3" : "w-8",
            )}
          >
            {result.rank ?? "—"}
          </span>

          <span className="min-w-0 flex-1 truncate">
            {result.participant?.display_name ?? "—"}
          </span>

          {/* La marque a sa propre famille *et* sa propre taille : c'est ce
              qu'on lit depuis le fond de la tribune. */}
          <span
            className="shrink-0 font-semibold tabular-nums"
            style={{
              fontFamily: "var(--brand-font-numeric)",
              fontSize: scaled(compact ? "10px" : "3.125rem", "numeric"),
            }}
          >
            {result.display_value}
          </span>
        </li>
        ))}
      </ol>
    </AutoScroll>
  );
}
