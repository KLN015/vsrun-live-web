"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Une zone qui fait défiler son contenu quand il déborde.
 *
 * Un écran de tribune n'a jamais la place d'afficher une série entière : les
 * lignes en trop étaient simplement coupées, et personne ne voyait la fin du
 * classement. La zone parcourt donc la liste par paliers, du haut vers le bas,
 * puis revient au début — en boucle, tant que l'épreuve est affichée.
 *
 * Par paliers et non d'un glissement continu : un texte qui bouge sans arrêt ne
 * se lit pas à trente mètres. Le mouvement sert à changer de page, la pause
 * sert à lire. Chaque palier recouvre légèrement le précédent, pour qu'aucune
 * ligne ne tombe exactement sur la charnière.
 *
 * Un nouveau temps interrompt la ronde : il est amené à l'écran, montré, et le
 * parcours reprend de là. C'est le moment où l'attention du public est acquise,
 * et le faire attendre son tour de page n'aurait aucun sens.
 */
export function AutoScroll({
  children,
  ids,
  enabled = true,
  holdMs = 4000,
}: {
  children: ReactNode;
  /** Les lignes affichées, dans l'ordre : sert à repérer les nouvelles. */
  ids: string[];
  /** L'aperçu du dashboard ne défile pas — c'est une vignette. */
  enabled?: boolean;
  /** Le temps de lecture d'un palier. */
  holdMs?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);

  // La liste des identifiants change d'identité à chaque rendu ; c'est son
  // contenu qui compte.
  const signature = ids.join(",");

  useEffect(() => {
    const element = box.current;

    if (!element || !enabled) return;

    // Au premier affichage, tout est nouveau : on ne met rien en avant, on
    // commence simplement par le haut.
    const first = seen.current === null;
    const known = seen.current ?? new Set<string>();
    const fresh = ids.find((id) => !known.has(id));

    seen.current = new Set(ids);

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    /** Avance d'un palier, ou revient au début une fois la liste parcourue. */
    const advance = () => {
      if (stopped) return;

      const travel = element.scrollHeight - element.clientHeight;

      // Tout tient à l'écran : rien à faire, mais on revient vérifier — une
      // série se remplit au fil des arrivées.
      if (travel <= 1) {
        timer = setTimeout(advance, holdMs);

        return;
      }

      const page = Math.max(element.clientHeight - OVERLAP, 1);

      // On ne repart du haut qu'une fois le bas réellement atteint. Enjamber
      // le dernier palier parce qu'il est incomplet reviendrait à ne jamais
      // montrer la fin du classement — c'est-à-dire à ne pas résoudre le
      // problème pour lequel cette zone existe.
      const atBottom = element.scrollTop >= travel - 1;
      const next = atBottom ? 0 : Math.min(element.scrollTop + page, travel);

      element.scrollTo({ top: next, behavior: "smooth" });

      // Le retour en haut est le moment où l'on perd le fil : on laisse
      // davantage de temps avant de repartir.
      timer = setTimeout(advance, next === 0 ? holdMs * 1.5 : holdMs);
    };

    let fade: ReturnType<typeof setTimeout> | undefined;

    if (!first && fresh !== undefined) {
      const row = element.querySelector<HTMLElement>(`[data-row="${CSS.escape(fresh)}"]`);

      row?.scrollIntoView({ behavior: "smooth", block: "center" });

      // La ligne s'allume, puis s'éteint d'elle-même — l'animation est dans
      // globals.css, l'attribut ne fait que la déclencher. Une surbrillance
      // permanente laisserait une traînée de marques sur toute la série, et
      // plus rien ne signalerait la suivante.
      if (row) {
        row.dataset.fresh = "true";
        fade = setTimeout(() => delete row.dataset.fresh, FRESH_MS);
      }
    }

    timer = setTimeout(advance, holdMs);

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(fade);
    };
    // `signature` porte le contenu de `ids`, que la règle ne sait pas voir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled, holdMs]);

  return (
    <div ref={box} className="min-h-0 flex-1 overflow-hidden">
      {children}
    </div>
  );
}

/** Recouvrement entre deux paliers, pour qu'aucune ligne ne soit coupée en deux. */
const OVERLAP = 48;

/** Durée de la surbrillance — à garder alignée sur `vsrun-fresh-row`. */
const FRESH_MS = 9000;
