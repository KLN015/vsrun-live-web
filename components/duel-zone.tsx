import { AutoScroll } from "@/components/auto-scroll";
import { FittedText } from "@/components/fitted-text";
import { scaled } from "@/lib/brand";
import type { PublicParticipant, RenderedDuel } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Une zone « duel » : ce que la tribune voit d'une épreuve à élimination
 * directe, du côté qui est celui de cet écran.
 *
 * Le serveur envoie les faits — la série en cours, les suivantes, les
 * vainqueurs — et c'est ici qu'on décide de la scène :
 *
 *   - **épreuve close** : la liste des vainqueurs, c'est ce qu'on est venu voir ;
 *   - **aucune série appelée** : le nom de l'épreuve et les séries à venir,
 *     quel que soit le côté de l'écran — qui s'apprête à courir ;
 *   - **une série appelée** : le nom, en plein cadre. Le perdant est barré dès
 *     que le vainqueur est connu — c'est le geste qu'on attend d'un tableau.
 *
 * Le nom est « Camille A. » : un prénom et une initiale tiennent en un mot,
 * donc en très grand. Un nom complet en plein cadre serait petit ou coupé.
 */
export function DuelZoneView({
  duel,
  compact,
}: {
  duel: RenderedDuel;
  compact: boolean;
}) {
  const title = duel.discipline.group_label || duel.discipline.name;

  if (duel.finished) {
    return (
      <Frame title={title} subtitle="Vainqueurs" compact={compact}>
        <NameList
          items={duel.winners.map((p) => ({ id: p.id, label: p.short_name }))}
          compact={compact}
        />
      </Frame>
    );
  }

  const serie = duel.current;

  if (serie === null) {
    return (
      <Frame
        title={title}
        subtitle={
          duel.total > 0
            ? `${duel.total} série${duel.total > 1 ? "s" : ""}`
            : null
        }
        compact={compact}
      >
        {/* Sans série appelée, tout écran montre les séries à venir — celui
            d'un côté comme celui de tous. Un écran qui attend n'a rien de
            mieux à faire que de dire au public qui va courir. */}
        {duel.upcoming.length > 0 ? (
          <NameList
            items={duel.upcoming.map((s) => ({
              id: s.id,
              label: `${s.position}. ${[s.a, s.b, s.c]
                .filter((p) => p !== null)
                .map(label)
                .join(" — ")}`,
            }))}
            compact={compact}
          />
        ) : (
          <Waiting compact={compact} />
        )}
      </Frame>
    );
  }

  const subtitle = `Série ${serie.position} / ${duel.total}`;
  const outcome = (p: PublicParticipant | null): Outcome =>
    serie.winner_participant_id === null || p === null
      ? "pending"
      : serie.winner_participant_id === p.id
        ? "won"
        : "lost";

  if (duel.side === "both") {
    // Autant de colonnes que de coureurs : deux, ou trois quand le compte
    // était impair. Un côté vide n'a pas de colonne.
    const runners = [serie.a, serie.b, serie.c].filter((p) => p !== null);

    return (
      <Frame title={title} subtitle={subtitle} compact={compact}>
        <div className="flex min-h-0 flex-1 gap-[2%]">
          {(runners.length > 0 ? runners : [null]).map((p, i) => (
            <Name
              key={p?.id ?? i}
              participant={p}
              outcome={outcome(p)}
              compact={compact}
            />
          ))}
        </div>
      </Frame>
    );
  }

  const mine =
    duel.side === "a" ? serie.a : duel.side === "b" ? serie.b : serie.c;

  return (
    <Frame title={title} subtitle={subtitle} compact={compact}>
      <Name participant={mine} outcome={outcome(mine)} compact={compact} />
    </Frame>
  );
}

type Outcome = "pending" | "won" | "lost";

function label(p: PublicParticipant | null): string {
  return p?.short_name ?? "—";
}

/** L'en-tête commun : l'épreuve en petit, l'état en dessous, puis la scène. */
function Frame({
  title,
  subtitle,
  compact,
  children,
}: {
  title: string;
  subtitle: string | null;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <h2
          style={{
            fontFamily: "var(--brand-font-heading)",
            color: "var(--brand-accent)",
            fontSize: scaled(compact ? "11px" : "2.25rem", "heading"),
          }}
          className="leading-tight font-semibold tracking-tight"
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className="opacity-70"
            style={{ fontSize: scaled(compact ? "9px" : "1.5rem", "body") }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {children}
    </div>
  );
}

/**
 * Un nom en plein cadre.
 *
 * `FittedText` mesure son bloc parent : celui-ci est posé en absolu dans un
 * conteneur qui prend tout ce qu'il reste, pour que la mesure soit celle de la
 * place réellement libre et non de la ligne de texte.
 *
 * Barré et estompé pour le perdant, jamais retiré : le public doit voir qui a
 * perdu, pas se demander où est passé le deuxième nom.
 */
function Name({
  participant,
  outcome,
  compact,
}: {
  participant: PublicParticipant | null;
  outcome: Outcome;
  compact: boolean;
}) {
  const text = label(participant);
  const bye = participant === null;

  const style = {
    fontFamily: "var(--brand-font-heading)",
    color: outcome === "won" ? "var(--brand-accent)" : "var(--brand-text)",
  };

  const className = cn(
    "px-[3%] text-center leading-none font-extrabold tracking-tight",
    outcome === "lost" && "line-through decoration-[0.06em] opacity-40",
    bye && "opacity-40",
  );

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <span className={cn(className, "text-[12px]")} style={style}>
          {text}
        </span>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0 flex items-center justify-center">
        <FittedText className={className} style={style}>
          {text}
        </FittedText>
      </div>
    </div>
  );
}

/**
 * Une liste de lignes — les séries à venir, les vainqueurs.
 *
 * Elle défile par paliers quand elle déborde, comme un classement : seize
 * séries ne tiennent pas sur un écran, et n'en montrer que six laissait la
 * moitié des coureurs sans savoir quand ils passent.
 */
function NameList({
  items,
  compact,
}: {
  items: { id: string; label: string }[];
  compact: boolean;
}) {
  if (items.length === 0) return <Waiting compact={compact} />;

  return (
    // Colonne flex : AutoScroll y prend toute la hauteur qui reste, et c'est
    // cette hauteur bornée qui lui permet de savoir qu'il déborde.
    <div className="mt-[2%] flex min-h-0 flex-1 flex-col">
      <AutoScroll ids={items.map((item) => item.id)} enabled={!compact}>
        <ol style={{ fontSize: scaled(compact ? "10px" : "2.75rem", "body") }}>
          {items.map((item) => (
            <li
              key={item.id}
              data-row={item.id}
              className="truncate border-b border-neutral-800 py-[1%] font-semibold last:border-0"
              style={{ fontFamily: "var(--brand-font-heading)" }}
            >
              {item.label}
            </li>
          ))}
        </ol>
      </AutoScroll>
    </div>
  );
}

function Waiting({ compact }: { compact: boolean }) {
  return (
    <p
      className="mt-[2%] text-neutral-600"
      style={{ fontSize: scaled(compact ? "10px" : "1.96875rem", "body") }}
    >
      En attente
    </p>
  );
}
