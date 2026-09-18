import type { ReactNode } from "react";
import { AutoScroll } from "@/components/auto-scroll";
import { BrandFontFaces } from "@/components/brand-faces";
import { DuelZoneView } from "@/components/duel-zone";
import { brandStyle, scaled, type Brand } from "@/lib/brand";
import {
  DISPLAY_LAYOUT_GRID,
  DISPLAY_ZONE_SPAN,
  type DisplayLayout,
  type PublicResult,
  type PublicVideo,
  type RenderedZone,
  type ZoneGeometry,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Rendu d'un écran découpé en grille.
 *
 * Volontairement sans état et sans dépendance : il reçoit des zones résolues
 * et les dessine. Le découpage libre a son propre rendu (`FreeZone`) — sa zone
 * porte sa place, sa taille et son habillage, ce qu'aucune case de grille ne
 * fait.
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

/**
 * Le rectangle qu'occupe une zone d'un écran à découpage libre.
 *
 * Une zone jamais placée occupe toute la toile. Un écran fraîchement créé doit
 * montrer son logo, pas une surface noire dont rien ne dit qu'elle fonctionne.
 */
export function freeGeometry(
  zone: RenderedZone | undefined,
  canvas: { width: number; height: number },
): ZoneGeometry {
  return (
    zone?.geometry ?? { x: 0, y: 0, width: canvas.width, height: canvas.height }
  );
}

/**
 * Le rectangle qui enveloppe toutes les zones d'une toile libre.
 *
 * C'est « la composition » : ce que l'organisateur a posé, et rien d'autre. Le
 * compte à rebours s'y centre, un visuel la recouvre. Une seule zone, c'est
 * elle-même — le comportement d'avant, quand il n'y en avait qu'une ; trois
 * zones, c'est leur enveloppe, et pas la toile entière, sinon un carton posé
 * pour une composition rangée dans un coin s'étalerait sur tout le mur.
 *
 * Partagé, parce que plusieurs rendus s'y calent : deux calculs de la même
 * chose divergeraient au premier changement.
 */
export function freeBounds(
  zones: RenderedZone[],
  canvas: { width: number; height: number },
): ZoneGeometry {
  if (zones.length === 0) return freeGeometry(undefined, canvas);

  const rects = zones.map((zone) => freeGeometry(zone, canvas));
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));

  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Un rectangle posé sur la toile, aux couleurs de la charte. */
function frameStyle(geometry: ZoneGeometry, brand?: Brand) {
  return {
    position: "absolute" as const,
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    backgroundColor: brand
      ? "color-mix(in srgb, var(--brand-text) 6%, var(--brand-background))"
      : undefined,
  };
}

/**
 * Un visuel sur une toile libre : il recouvre la composition, bord à bord.
 *
 * Ni habillage, ni marge. Une affiche, un carton de départ, une photo de
 * podium se lisent en grand ou ne se lisent pas ; le logo posé au-dessus ne
 * faisait que rogner la seule chose qu'on est venu regarder — et il reparaît
 * dès que le visuel se retire.
 *
 * `object-contain` reste la règle à l'intérieur du rectangle : le rogner
 * couperait le texte d'une affiche.
 */
export function FreeVisual({
  bounds,
  brand,
  image,
}: {
  bounds: ZoneGeometry;
  brand?: Brand;
  image: { url: string };
}) {
  return (
    <div
      style={frameStyle(bounds, brand)}
      className={cn("overflow-hidden rounded-md", brand ? "" : "bg-neutral-900")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="" className="h-full w-full object-contain" />
    </div>
  );
}

/**
 * Une zone d'un écran à découpage libre.
 *
 * Elle porte sa place — ce que l'organisateur a posé en (x, y) sur la toile —
 * et confine tout ce qu'elle montre à son rectangle, habillage compris :
 * chaque zone a son logo, la première a en plus le chronomètre. C'est la
 * différence avec une case de grille, qui ne connaît ni sa place ni
 * l'habillage posé au-dessus d'elle : le découpage libre a son rendu propre
 * plutôt qu'un `if` de plus dans DisplayCanvas.
 */
export function FreeZone({
  zone,
  canvas,
  brand,
  header,
  compact = false,
}: {
  zone?: RenderedZone;
  /** La toile, repère des coordonnées de la zone. */
  canvas: { width: number; height: number };
  brand?: Brand;
  /** L'habillage, rendu au sommet de la zone. */
  header?: ReactNode;
  compact?: boolean;
}) {
  return (
    <FreeFrame
      geometry={freeGeometry(zone, canvas)}
      brand={brand}
      header={header}
      compact={compact}
    >
      {zone && zone.content_type !== "empty" ? (
        <Zone zone={zone} compact={compact} />
      ) : null}
    </FreeFrame>
  );
}

/** Un cadre posé sur la toile libre : l'habillage en haut, le contenu dessous. */
function FreeFrame({
  geometry,
  brand,
  header,
  compact = false,
  children,
}: {
  geometry: ZoneGeometry;
  brand?: Brand;
  header?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={frameStyle(geometry, brand)}
      className={cn(
        "flex flex-col overflow-hidden rounded-md",
        compact ? "gap-1 p-1.5" : "gap-4 p-6",
        brand ? "" : "bg-neutral-900",
      )}
    >
      {header}

      <div className="min-h-0 flex-1">{children}</div>
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

  if ("duel" in zone.content) {
    return <DuelZoneView duel={zone.content.duel} compact={compact} />;
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

  // Avant le premier chrono de la journée, une zone « Derniers résultats »
  // arrive avec `discipline: null` — le champ est là, sa valeur non. Tester la
  // présence de la clé suffisait à faire lire `.name` sur rien, et l'écran
  // partait en erreur jusqu'à la première publication : exactement le moment
  // où le public le regarde.
  const title =
    "discipline" in zone.content && zone.content.discipline !== null
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
