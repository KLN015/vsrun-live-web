import { ArrowLeftRightIcon } from "lucide-react";
import { DuelParticipantsPicker } from "@/components/duel-participants-picker";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  advanceDuel,
  createDuel,
  createNextRound,
  declareDuelWinner,
  deleteDuel,
  generateDuels,
  reassignDuel,
  setCurrentDuel,
  setDisciplineStatus,
  swapDuel,
} from "@/lib/actions";
import { athleteName } from "@/lib/athlete";
import type { Discipline, Duel, Participant } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Le poste de l'opérateur d'une épreuve à élimination directe.
 *
 * Conçu pour un téléphone au bord de la piste : trois gestes, gros boutons,
 * dans l'ordre où ils arrivent entre deux courses — qui a gagné, puis la
 * suivante. Tout le reste (composer, corriger, inverser) est là, mais en
 * retrait.
 *
 * Aucun état local : chaque geste est un formulaire vers une action serveur,
 * qui revalide la page. C'est le serveur qui prévient les écrans ; ce panneau
 * n'a rien à leur dire directement.
 */
export function DuelPanel({
  discipline,
  participants,
  back,
}: {
  discipline: Discipline;
  participants: Participant[];
  back: string;
}) {
  const duels = discipline.duels ?? [];
  const current =
    duels.find((d) => d.id === discipline.current_duel_id) ?? null;
  const played = duels.filter((d) => d.winner_participant_id !== null);
  const remaining = duels.filter((d) => d.winner_participant_id === null);
  const finished = discipline.status === "finished";

  const winners = played
    .map((d) => (d.winner_participant_id === d.participant_a_id ? d.a : d.b))
    .filter((p): p is Participant => !!p);

  const options = participants.map((p) => ({
    value: p.id,
    label: [p.bib ? `${p.bib} ·` : null, athleteName(p)]
      .filter(Boolean)
      .join(" "),
  }));

  const order = (
    <Field label="Ordre">
      <FormSelect
        name="order"
        defaultValue="listed"
        options={[
          { value: "listed", label: "Dans l'ordre de la liste" },
          { value: "random", label: "Tirage au sort" },
        ]}
      />
    </Field>
  );

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------
          La commande : ce qui se joue maintenant, et les deux gestes.
         ------------------------------------------------------------------ */}
      <Card>
        <CardContent className="space-y-4">
          {finished ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">
                  {winners.length === 1
                    ? `Vainqueur de l'épreuve : ${athleteName(winners[0])} — il n'y a plus personne à lui opposer.`
                    : "Épreuve terminée — les écrans montrent les vainqueurs."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <form action={setDisciplineStatus}>
                    <input
                      type="hidden"
                      name="discipline_id"
                      value={discipline.id}
                    />
                    <input type="hidden" name="status" value="live" />
                    <Button type="submit" variant="outline" size="sm">
                      Rouvrir
                    </Button>
                  </form>
                </div>
              </div>
              <ol className="grid gap-1 sm:grid-cols-2">
                {winners.map((p, i) => (
                  <li
                    key={p.id}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground mr-2">{i + 1}.</span>
                    {athleteName(p)}
                  </li>
                ))}
              </ol>
            </div>
          ) : current ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  Série {current.position} / {duels.length}
                  {current.winner_participant_id ? " · jouée" : " · en cours"}
                </p>
                <form action={swapDuel}>
                  <input type="hidden" name="duel_id" value={current.id} />
                  <input type="hidden" name="back" value={back} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    title="Faire tourner les côtés"
                  >
                    <ArrowLeftRightIcon className="size-4" /> Inverser
                  </Button>
                </form>
              </div>

              {/* Un gros bouton par coureur : deux, ou trois. Le vainqueur
                  reste enfoncé ; cliquer un autre corrige. */}
              <div
                className={cn(
                  "grid gap-3",
                  current.participant_c_id ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                <WinnerButton duel={current} side="a" back={back} />
                <WinnerButton duel={current} side="b" back={back} />
                {current.participant_c_id ? (
                  <WinnerButton duel={current} side="c" back={back} />
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={advanceDuel}>
                  <input
                    type="hidden"
                    name="discipline_id"
                    value={discipline.id}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      remaining.length === 0 && !current.winner_participant_id
                    }
                  >
                    Suivante
                  </Button>
                </form>
                <form action={setCurrentDuel}>
                  <input
                    type="hidden"
                    name="discipline_id"
                    value={discipline.id}
                  />
                  <input type="hidden" name="duel_id" value="" />
                  <Button type="submit" variant="ghost" size="lg">
                    Aucune série
                  </Button>
                </form>
                {current.winner_participant_id ? (
                  <form action={declareDuelWinner}>
                    <input type="hidden" name="duel_id" value={current.id} />
                    <input type="hidden" name="participant_id" value="" />
                    <input type="hidden" name="back" value={back} />
                    <Button type="submit" variant="ghost" size="lg">
                      Annuler le vainqueur
                    </Button>
                  </form>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Aucune série appelée — les écrans attendent.
                {duels.length === 0 ? " Composez les séries ci-dessous." : ""}
              </p>
              {remaining.length > 0 ? (
                <form action={advanceDuel}>
                  <input
                    type="hidden"
                    name="discipline_id"
                    value={discipline.id}
                  />
                  <Button type="submit" size="lg">
                    Appeler la série {remaining[0].position}
                  </Button>
                </form>
              ) : null}
            </div>
          )}

          {!finished && duels.length > 0 && remaining.length === 0 ? (
            // Tout est joué : c'est le moment de clôturer, et de composer la
            // suite. Les deux boutons ensemble, parce qu'ils viennent ensemble.
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <p className="text-muted-foreground mr-auto text-sm">
                Toutes les séries sont jouées.
              </p>
              <form action={setDisciplineStatus}>
                <input
                  type="hidden"
                  name="discipline_id"
                  value={discipline.id}
                />
                <input type="hidden" name="status" value="finished" />
                <Button type="submit">
                  Clôturer — afficher les vainqueurs
                </Button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------
          Composer : à la main, d'un coup, ou le tour d'après.
         ------------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        <FormDialog
          trigger="Ajouter une série"
          variant="outline"
          title="Une série"
          description="Deux engagés, ou trois. Un seul : un exempt, vainqueur d'office."
          submitLabel="Ajouter"
          action={createDuel}
        >
          <input type="hidden" name="discipline_id" value={discipline.id} />
          <Field label="Côté A">
            <FormSelect
              name="participant_a_id"
              placeholder="Choisir"
              options={options}
            />
          </Field>
          <Field label="Côté B">
            <FormSelect
              name="participant_b_id"
              placeholder="Personne"
              options={options}
            />
          </Field>
          <Field label="Côté C" hint="Pour une série à trois.">
            <FormSelect
              name="participant_c_id"
              placeholder="Personne"
              options={options}
            />
          </Field>
        </FormDialog>

        <FormDialog
          trigger="Générer les séries"
          variant="outline"
          title="Composer les séries"
          description="Deux par deux, dans l'ordre choisi. Un nombre impair fait courir le dernier avec la dernière paire : une série à trois. Les séries s'ajoutent à celles qui existent."
          submitLabel="Composer"
          action={generateDuels}
        >
          <input type="hidden" name="discipline_id" value={discipline.id} />
          {order}
          <Field
            label="Engagés"
            hint="Filtrez par catégorie ou par sexe, puis cochez tout d'un clic. Personne de coché : tous les engagés de l'événement."
          >
            <DuelParticipantsPicker participants={participants} />
          </Field>
        </FormDialog>

        {winners.length >= 2 ? (
          <FormDialog
            trigger="Tour suivant"
            title="Le tour suivant"
            description={`Une nouvelle épreuve « ${discipline.name} », avec les ${winners.length} vainqueur${winners.length > 1 ? "s" : ""} de celle-ci. Deux vainqueurs : la finale.`}
            submitLabel="Créer le tour"
            action={createNextRound}
          >
            <input type="hidden" name="discipline_id" value={discipline.id} />
            {order}
          </FormDialog>
        ) : null}
      </div>

      {/* ------------------------------------------------------------------
          Le tableau.
         ------------------------------------------------------------------ */}
      {duels.length === 0 ? (
        <EmptyState>
          Aucune série. Ajoutez-en une, ou composez-les depuis la liste des
          engagés.
        </EmptyState>
      ) : (
        <ol className="space-y-2">
          {duels.map((duel) => (
            <DuelRow
              key={duel.id}
              duel={duel}
              discipline={discipline}
              isCurrent={duel.id === discipline.current_duel_id}
              options={options}
              back={back}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Le vainqueur d'une série jouée, quel que soit son côté. */
function winnerOf(duel: Duel): Participant | null | undefined {
  if (!duel.winner_participant_id) return null;

  return (["a", "b", "c"] as const)
    .map((side) => ({ id: duel[`participant_${side}_id`], p: duel[side] }))
    .find(({ id }) => id === duel.winner_participant_id)?.p;
}

/** Le bouton qui dit qui a gagné. Enfoncé pour le vainqueur, barré pour le perdant. */
function WinnerButton({
  duel,
  side,
  back,
}: {
  duel: Duel;
  side: "a" | "b" | "c";
  back: string;
}) {
  const participant = duel[side];
  const id = duel[`participant_${side}_id`];
  const decided = duel.winner_participant_id !== null;
  const won = decided && duel.winner_participant_id === id;
  const lost = decided && !won;

  if (!participant || !id) {
    return (
      <div className="text-muted-foreground flex min-h-24 items-center justify-center rounded-lg border border-dashed text-sm">
        Exempt
      </div>
    );
  }

  return (
    <form action={declareDuelWinner} className="contents">
      <input type="hidden" name="duel_id" value={duel.id} />
      <input type="hidden" name="participant_id" value={id} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className={cn(
          "flex min-h-24 flex-col items-center justify-center rounded-lg border-2 px-3 py-4 text-center transition",
          won && "border-primary bg-primary text-primary-foreground",
          lost && "border-transparent opacity-50 line-through",
          !decided && "hover:border-primary",
        )}
      >
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          Côté {side.toUpperCase()}
          {won ? " · vainqueur" : ""}
        </span>
        <span className="mt-1 text-xl font-semibold">
          {participant.short_name}
        </span>
        <span className="text-xs opacity-70">{athleteName(participant)}</span>
      </button>
    </form>
  );
}

function DuelRow({
  duel,
  discipline,
  isCurrent,
  options,
  back,
}: {
  duel: Duel;
  discipline: Discipline;
  isCurrent: boolean;
  options: { value: string; label: string }[];
  back: string;
}) {
  const winnerName = winnerOf(duel)?.short_name ?? null;

  // Le perdant est barré ; un exempt ne perd pas, il n'a personne en face.
  const name = (p: Participant | null | undefined, id: string | null) =>
    p ? (
      <span
        className={cn(
          "truncate",
          duel.winner_participant_id &&
            duel.winner_participant_id !== id &&
            "text-muted-foreground line-through",
        )}
      >
        {athleteName(p)}
      </span>
    ) : (
      <em className="text-muted-foreground">exempt</em>
    );

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2 text-sm",
        isCurrent && "border-primary bg-primary/5",
      )}
    >
      <span className="text-muted-foreground w-6 shrink-0 tabular-nums">
        {duel.position}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {name(duel.a, duel.participant_a_id)}
        <span className="text-muted-foreground shrink-0">vs</span>
        {name(duel.b, duel.participant_b_id)}
        {duel.participant_c_id ? (
          <>
            <span className="text-muted-foreground shrink-0">vs</span>
            {name(duel.c, duel.participant_c_id)}
          </>
        ) : null}
      </div>

      {isCurrent ? <Badge>En cours</Badge> : null}
      {winnerName ? <Badge variant="secondary">{winnerName}</Badge> : null}

      <div className="ml-auto flex items-center gap-1">
        {!isCurrent ? (
          <form action={setCurrentDuel}>
            <input type="hidden" name="discipline_id" value={discipline.id} />
            <input type="hidden" name="duel_id" value={duel.id} />
            <Button type="submit" variant="outline" size="sm">
              Appeler
            </Button>
          </form>
        ) : null}

        <form action={swapDuel}>
          <input type="hidden" name="duel_id" value={duel.id} />
          <input type="hidden" name="back" value={back} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            title="Faire tourner les côtés"
          >
            <ArrowLeftRightIcon className="size-4" />
          </Button>
        </form>

        <FormDialog
          trigger="Modifier"
          variant="outline"
          title={`Série ${duel.position}`}
          description="Changer un engagé remet le vainqueur en jeu. Le côté C sert aux séries à trois."
          submitLabel="Enregistrer"
          action={reassignDuel}
        >
          <input type="hidden" name="duel_id" value={duel.id} />
          <input type="hidden" name="back" value={back} />
          <Field label="Côté A">
            <FormSelect
              name="participant_a_id"
              defaultValue={duel.participant_a_id ?? ""}
              placeholder="Personne"
              options={options}
            />
          </Field>
          <Field label="Côté B">
            <FormSelect
              name="participant_b_id"
              defaultValue={duel.participant_b_id ?? ""}
              placeholder="Personne"
              options={options}
            />
          </Field>
          <Field label="Côté C" hint="Pour une série à trois.">
            <FormSelect
              name="participant_c_id"
              defaultValue={duel.participant_c_id ?? ""}
              placeholder="Personne"
              options={options}
            />
          </Field>
        </FormDialog>

        <form action={deleteDuel}>
          <input type="hidden" name="duel_id" value={duel.id} />
          <input type="hidden" name="back" value={back} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
          >
            Supprimer
          </Button>
        </form>
      </div>
    </li>
  );
}
