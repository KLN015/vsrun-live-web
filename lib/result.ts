import type { DisciplineType, PublicResult, Result } from "@/lib/types";

/**
 * Un concours — saut, lancer — par opposition à une course.
 *
 * La distinction commande presque tout l'affichage d'un résultat : sur une
 * piste on court dans un couloir et tout le monde subit le même vent ; sur une
 * aire de concours on prend des essais, chacun avec son vent, et on peut en
 * manquer un.
 */
export function isFieldEvent(type: DisciplineType): boolean {
  return type !== "time";
}

/**
 * Ce qui s'écrit à la place de la mesure.
 *
 * `X` et `NM` ne disent pas la même chose, et le serveur ne peut pas trancher
 * seul : il ne connaît qu'un résultat à la fois.
 *
 *   - **X** qualifie *un essai* — celui-ci est nul, l'athlète en a d'autres.
 *   - **NM** qualifie *un athlète* — aucune de ses tentatives n'a été mesurée.
 *
 * D'où le contexte passé ici : le type de l'épreuve, et le fait que l'athlète
 * ait obtenu une mesure ailleurs dans la même épreuve.
 */
export function outcomeCode(
  result: Pick<Result | PublicResult, "outcome" | "outcome_code">,
  type: DisciplineType,
  athleteHasAMark: boolean,
): string {
  if (result.outcome !== "nm") {
    return result.outcome_code;
  }

  // Sur une course, un essai nul n'existe pas : c'est NM ou rien.
  if (!isFieldEvent(type)) {
    return "NM";
  }

  return athleteHasAMark ? "X" : "NM";
}

/**
 * L'athlète d'un résultat, quelle que soit la forme qui le porte.
 *
 * Le dashboard reçoit le participant en entier, la surface publique n'en garde
 * que l'identifiant : les deux formes coexistent, et ce détail n'a pas à
 * remonter jusqu'aux composants.
 */
function athleteId(
  result: Partial<Result & PublicResult>,
): string | null {
  return result.participant?.id ?? result.participant_id ?? null;
}

/**
 * Les athlètes ayant au moins une mesure valable dans l'épreuve.
 *
 * Sert à distinguer l'essai manqué d'un sauteur qui a réussi ailleurs (X) de
 * celui qui n'a rien réussi du tout (NM).
 */
export function athletesWithAMark(
  results: readonly Partial<Result & PublicResult>[],
): Set<string> {
  return new Set(
    results
      .filter((result) => result.outcome === "valid" && athleteId(result))
      .map((result) => athleteId(result) as string),
  );
}

/** L'athlète de ce résultat a-t-il une mesure ailleurs dans l'épreuve ? */
export function hasAMark(
  result: Partial<Result & PublicResult>,
  athletes: Set<string>,
): boolean {
  const id = athleteId(result);

  return id !== null && athletes.has(id);
}
