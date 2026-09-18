import type {
  PublicDiscipline,
  PublicDuel,
  PublicParticipant,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Les séries d'un duel, sur la fiche publique : deux noms par ligne, le
 * perdant barré, la série en cours signalée. Ce sont les résultats de cette
 * épreuve — il n'y en a pas d'autres.
 */
export function PublicDuels({ discipline }: { discipline: PublicDiscipline }) {
  const duels = discipline.duels ?? [];

  if (duels.length === 0) return null;

  // « En cours » n'a de sens que tant que l'épreuve se joue : close, la
  // dernière série appelée n'est plus qu'une série jouée parmi les autres.
  const current =
    discipline.status === "finished" ? null : discipline.current_duel_id;

  return (
    <ol className="mt-3 divide-y border-t text-sm">
      {duels.map((duel) => (
        <li
          key={duel.id}
          className={cn(
            "flex items-center gap-3 py-1.5",
            duel.id === current && "font-medium",
          )}
        >
          <span className="text-muted-foreground w-5 shrink-0 tabular-nums">
            {duel.position}
          </span>
          <Name duel={duel} participant={duel.a ?? null} />
          <span className="text-muted-foreground shrink-0 text-xs">vs</span>
          <Name duel={duel} participant={duel.b ?? null} />
          {duel.id === current ? (
            <span className="text-destructive ml-auto shrink-0 text-xs uppercase">
              En cours
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function Name({
  duel,
  participant,
}: {
  duel: PublicDuel;
  participant: PublicParticipant | null;
}) {
  if (!participant) {
    return <em className="text-muted-foreground min-w-0 flex-1">exempt</em>;
  }

  const decided = duel.winner_participant_id !== null;
  const won = duel.winner_participant_id === participant.id;

  return (
    <span
      className={cn(
        "min-w-0 flex-1 truncate",
        decided && !won && "text-muted-foreground line-through",
        decided && won && "font-semibold",
      )}
    >
      {participant.short_name}
    </span>
  );
}
