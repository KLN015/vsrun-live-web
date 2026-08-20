import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createResult,
  deleteResult,
  publishAllResults,
  publishResult,
  unpublishResult,
  updateDiscipline,
  updateResultDetails,
} from "@/lib/actions";
import { athleteDetails, athleteName } from "@/lib/athlete";
import {
  athletesWithAMark,
  hasAMark,
  isFieldEvent,
  outcomeCode,
} from "@/lib/result";
import { TIME_ZONE, toLocalInput } from "@/lib/datetime";
import { apiJson, apiJsonOrNull } from "@/lib/api";
import { withSession } from "@/lib/guard";
import {
  DISCIPLINE_GENDER_LABELS,
  DISCIPLINE_ROUND_LABELS,
  RESULT_OUTCOME_LABELS,
  type Discipline,
  type Paginated,
  type Participant,
  type Result,
  type Wrapped,
} from "@/lib/types";

/** Unités acceptées par type d'épreuve — miroir de DisciplineType côté Laravel. */
const UNITS_BY_TYPE: Record<Discipline["type"], string[]> = {
  time: ["s"],
  distance: ["m", "cm"],
  height: ["m", "cm"],
  points: ["pts"],
  custom: ["s", "m", "cm", "km_h", "pts"],
};

const stampFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/**
 * Le vent appartient-il à l'épreuve entière ?
 *
 * Sur une course, oui : tous les concurrents partent ensemble et subissent le
 * même vent. Sur un concours, non — on ne saute ni ne lance en même temps, et
 * chaque essai a le sien.
 */
function windIsSharedBy(discipline: Discipline): boolean {
  return !isFieldEvent(discipline.type);
}

export default async function DisciplineResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const path = `/dashboard/disciplines/${id}`;

  const { discipline, results, participants } = await withSession(
    path,
    async () => {
      const discipline = await apiJsonOrNull<Wrapped<Discipline>>(
        `/disciplines/${id}`,
      );

      if (!discipline) {
        return { discipline: null, results: [], participants: [] };
      }

      const [results, participants] = await Promise.all([
        apiJson<Paginated<Result>>(`/disciplines/${id}/results`),
        apiJson<Paginated<Participant>>(
          `/events/${discipline.data.event_id}/participants`,
        ),
      ]);

      return {
        discipline: discipline.data,
        results: results.data,
        participants: participants.data,
      };
    },
  );

  if (!discipline) notFound();

  const drafts = results.filter((result) => result.status === "draft");

  // Qui a réussi au moins un essai : c'est ce qui sépare un X d'un NM.
  const marked = athletesWithAMark(results);

  return (
    <>
      <PageHeader
        title={discipline.name}
        description={[
          discipline.scheduled_at
            ? stampFormatter.format(new Date(discipline.scheduled_at))
            : null,
          discipline.category_code,
          discipline.round_label,
          discipline.distance_m ? `${discipline.distance_m} m` : null,
          discipline.type_label,
          windIsSharedBy(discipline) && discipline.wind !== null
            ? `vent ${discipline.wind > 0 ? "+" : ""}${discipline.wind} m/s`
            : null,
          `${results.length} résultat(s)`,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <AutoRefresh />

            <FormDialog
              trigger="Modifier l&apos;épreuve"
              variant="outline"
              title="L&apos;épreuve"
              submitLabel="Enregistrer"
              action={updateDiscipline}
            >
              <input type="hidden" name="discipline_id" value={id} />

              <Field label="Nom" htmlFor="discipline-name">
                <Input
                  id="discipline-name"
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={discipline.name}
                />
              </Field>

              <Field
                label="Heure de départ"
                htmlFor="discipline-scheduled-at"
                hint="Heure française. Elle range l'épreuve dans le programme."
              >
                <Input
                  id="discipline-scheduled-at"
                  type="datetime-local"
                  name="scheduled_at"
                  defaultValue={toLocalInput(discipline.scheduled_at)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Catégorie" htmlFor="discipline-category">
                  <Input
                    id="discipline-category"
                    name="category"
                    maxLength={8}
                    placeholder="CA"
                    defaultValue={discipline.category ?? ""}
                  />
                </Field>

                <Field label="Genre">
                  <FormSelect
                    name="gender"
                    defaultValue={discipline.gender ?? ""}
                    placeholder="Non précisé"
                    options={Object.entries(DISCIPLINE_GENDER_LABELS).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tour">
                  <FormSelect
                    name="round"
                    defaultValue={discipline.round ?? ""}
                    placeholder="Non précisé"
                    options={Object.entries(DISCIPLINE_ROUND_LABELS).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </Field>

                <Field label="Distance (m)" htmlFor="discipline-distance">
                  <Input
                    id="discipline-distance"
                    type="number"
                    name="distance_m"
                    min={1}
                    defaultValue={discipline.distance_m ?? ""}
                  />
                </Field>
              </div>

              {windIsSharedBy(discipline) ? (
                <Field
                  label="Vent (m/s)"
                  htmlFor="discipline-wind"
                  hint="Commun à toute la course. Sur un concours, le vent se saisit essai par essai."
                >
                  <Input
                    id="discipline-wind"
                    type="number"
                    step="0.1"
                    name="wind"
                    defaultValue={discipline.wind ?? ""}
                  />
                </Field>
              ) : null}

              <Field label="Statut">
                <FormSelect
                  name="status"
                  defaultValue={discipline.status}
                  options={[
                    { value: "pending", label: "À venir" },
                    { value: "live", label: "En cours" },
                    { value: "finished", label: "Terminée" },
                  ]}
                />
              </Field>
            </FormDialog>

            <FormDialog
              trigger="Saisir un résultat"
              title="Saisir un résultat"
              description="Tout résultat est créé en brouillon, quel que soit le mode de publication de l&apos;événement."
              submitLabel="Enregistrer"
              action={createResult}
            >
              <input type="hidden" name="discipline_id" value={id} />

              <Field label="Participant">
                <FormSelect
                  name="participant_id"
                  placeholder="Non identifié"
                  options={participants.map((participant) => ({
                    value: participant.id,
                    label: participant.bib
                      ? `${participant.bib} — ${participant.display_name}`
                      : participant.display_name,
                  }))}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Valeur" htmlFor="value">
                  <Input
                    id="value"
                    type="number"
                    step="0.0001"
                    name="value"
                    required
                    placeholder="10.42"
                  />
                </Field>
                <Field label="Unité">
                  <FormSelect
                    name="unit"
                    defaultValue={UNITS_BY_TYPE[discipline.type][0]}
                    options={UNITS_BY_TYPE[discipline.type].map((unit) => ({
                      value: unit,
                      label: unit,
                    }))}
                  />
                </Field>
              </div>

              {isFieldEvent(discipline.type) ? (
                <Field
                  label="Essai"
                  htmlFor="attempt"
                  hint="Son rang dans la série de tentatives."
                >
                  <Input
                    id="attempt"
                    type="number"
                    name="attempt"
                    min={1}
                    max={100}
                  />
                </Field>
              ) : (
                <Field label="Couloir" htmlFor="lane">
                  <Input id="lane" type="number" name="lane" min={1} max={100} />
                </Field>
              )}

              <Field
                label="Validité"
                hint={
                  isFieldEvent(discipline.type)
                    ? "Un essai nul s'inscrit X et ne se classe pas."
                    : "Un résultat non validé sort du classement sans le refermer."
                }
              >
                <FormSelect
                  name="outcome"
                  defaultValue="valid"
                  options={Object.entries(RESULT_OUTCOME_LABELS).map(
                    ([value, label]) => ({
                      value,
                      label:
                        value === "nm" && isFieldEvent(discipline.type)
                          ? "Essai nul (X)"
                          : label,
                    }),
                  )}
                />
              </Field>
            </FormDialog>

            <Link
              href={`/dashboard/events/${discipline.event_id}/disciplines`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Retour aux épreuves
            </Link>
            {drafts.length > 0 ? (
              <form action={publishAllResults}>
                <input type="hidden" name="discipline_id" value={id} />
                <input type="hidden" name="back" value={path} />
                <Button type="submit">
                  {drafts.length === 1
                    ? "Publier le brouillon"
                    : `Publier les ${drafts.length} brouillons`}
                </Button>
              </form>
            ) : null}
          </div>
        }
      />

      {discipline.merged_into_discipline_id ? (
        <p className="text-muted-foreground mb-6 text-sm">
          Cette série est rattachée à une épreuve du programme : ses résultats
          s&apos;affichent sous celle-ci sur la surface publique.{" "}
          <Link
            href={`/dashboard/disciplines/${discipline.merged_into_discipline_id}`}
            className="underline"
          >
            Voir l&apos;épreuve d&apos;accueil
          </Link>
        </p>
      ) : null}

      <div className="space-y-6">
        <div>
          {results.length === 0 ? (
            <EmptyState>
              Aucun résultat. Ils arriveront des applications VSRUN, ou peuvent
              être saisis à la main ci-contre.
            </EmptyState>
          ) : (
            <Card className="py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rang</TableHead>
                      <TableHead>Athlète</TableHead>
                      <TableHead className="w-32">Performance</TableHead>
                      <TableHead className="w-28">Statut</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => {
                      const participant = result.participant;

                      return (
                      <TableRow key={result.id}>
                        <TableCell className="tabular-nums">
                          {result.rank ?? "—"}
                        </TableCell>
                        <TableCell>
                          {participant ? (
                            <>
                              {/* Prénom et nom sur la première ligne, tout ce
                                  qui le décrit sur la seconde. */}
                              <span className="font-medium">
                                {athleteName(participant)}
                              </span>
                              {athleteDetails(participant) ? (
                                <p className="text-muted-foreground text-xs">
                                  {athleteDetails(participant)}
                                </p>
                              ) : null}
                            </>
                          ) : (
                            // Un chrono sans athlète se désigne par son
                            // couloir : c'est ainsi qu'il est appelé en bord
                            // de piste, en attendant qu'on lui donne un nom.
                            <span className="text-muted-foreground">
                              {result.lane ? `Couloir ${result.lane}` : "Non identifié"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-medium tabular-nums">
                          {result.outcome === "valid" ? (
                            result.display_value
                          ) : (
                            // Un essai nul n'est pas une performance faible :
                            // c'est son code qui s'écrit, pas sa mesure.
                            <span title={result.outcome_label}>
                              {outcomeCode(
                                result,
                                discipline.type,
                                hasAMark(result, marked),
                              )}
                            </span>
                          )}
                          {!windIsSharedBy(discipline) && result.wind !== null ? (
                            <p className="text-muted-foreground font-sans text-xs">
                              {result.wind > 0 ? "+" : ""}
                              {result.wind} m/s
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              result.status === "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {result.status_label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <form
                              action={
                                result.status === "published"
                                  ? unpublishResult
                                  : publishResult
                              }
                            >
                              <input
                                type="hidden"
                                name="result_id"
                                value={result.id}
                              />
                              <input type="hidden" name="back" value={path} />
                              <Button
                                variant="outline"
                                size="sm"
                                type="submit"
                              >
                                {result.status === "published"
                                  ? "Retirer"
                                  : "Publier"}
                              </Button>
                            </form>

                            <FormDialog
                            trigger="Modifier"
                            variant="outline"
                            title="Corriger le résultat"
                            description="L'athlète, la performance et les conditions de l'essai."
                            submitLabel="Enregistrer"
                            action={updateResultDetails}
                          >
                            <input
                              type="hidden"
                              name="result_id"
                              value={result.id}
                            />
                            <input type="hidden" name="back" value={path} />

                            <Field label="Athlète">
                              <FormSelect
                                name="participant_id"
                                defaultValue={participant?.id ?? ""}
                                placeholder="Non identifié"
                                options={participants.map((entry) => ({
                                  value: entry.id,
                                  label: entry.bib
                                    ? `${entry.bib} — ${entry.display_name}`
                                    : entry.display_name,
                                }))}
                              />
                            </Field>

                            <Field label="Performance" htmlFor={`value-${result.id}`}>
                              <Input
                                id={`value-${result.id}`}
                                type="number"
                                step="0.0001"
                                name="value"
                                defaultValue={result.value ?? ""}
                              />
                            </Field>

                            <div className="grid grid-cols-2 gap-3">
                              {/* On ne court pas dans un couloir à la longueur,
                                  on y prend des essais. */}
                              {isFieldEvent(discipline.type) ? (
                                <Field
                                  label="Essai"
                                  htmlFor={`attempt-${result.id}`}
                                  hint="Son rang dans la série de tentatives."
                                >
                                  <Input
                                    id={`attempt-${result.id}`}
                                    type="number"
                                    name="attempt"
                                    min={1}
                                    max={100}
                                    defaultValue={result.attempt ?? ""}
                                  />
                                </Field>
                              ) : (
                                <Field label="Couloir" htmlFor={`lane-${result.id}`}>
                                  <Input
                                    id={`lane-${result.id}`}
                                    type="number"
                                    name="lane"
                                    min={1}
                                    max={100}
                                    defaultValue={result.lane ?? ""}
                                  />
                                </Field>
                              )}

                              {windIsSharedBy(discipline) ? null : (
                                <Field
                                  label="Vent (m/s)"
                                  htmlFor={`wind-${result.id}`}
                                  hint="Celui de cet essai."
                                >
                                  <Input
                                    id={`wind-${result.id}`}
                                    type="number"
                                    step="0.1"
                                    name="wind"
                                    defaultValue={result.wind ?? ""}
                                  />
                                </Field>
                              )}
                            </div>

                            <Field
                              label="Validité"
                              hint="Un essai non validé sort du classement sans le refermer."
                            >
                              <FormSelect
                                name="outcome"
                                defaultValue={result.outcome}
                                options={Object.entries(
                                  RESULT_OUTCOME_LABELS,
                                ).map(([value, label]) => ({
                                  value,
                                  label:
                                    value === "nm" &&
                                    isFieldEvent(discipline.type)
                                      ? "Essai nul (X)"
                                      : label,
                                }))}
                              />
                            </Field>
                          </FormDialog>

                            <form action={deleteResult}>
                              <input
                                type="hidden"
                                name="result_id"
                                value={result.id}
                              />
                              <input type="hidden" name="back" value={path} />
                              <Button
                                variant="outline"
                                size="sm"
                                type="submit"
                              >
                                Supprimer
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
