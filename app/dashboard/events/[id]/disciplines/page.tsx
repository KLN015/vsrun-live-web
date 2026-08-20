import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Field } from "@/components/layout";
import { EmptyState } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  attachDiscipline,
  createDiscipline,
  deleteDiscipline,
  detachDiscipline,
} from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import {
  DISCIPLINE_GENDER_LABELS,
  DISCIPLINE_ROUND_LABELS,
  DISCIPLINE_TYPE_LABELS,
  type Discipline,
  type Paginated,
} from "@/lib/types";

/**
 * Les heures d'une compétition française se lisent à l'heure française, quel
 * que soit le fuseau du serveur qui rend la page.
 */
const TIME_ZONE = "Europe/Paris";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** « 18 août à 14:02 » : ce qui situe une série sans encombrer la ligne. */
const stampFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** Ce qui désigne une épreuve sur une ligne de programme, après son nom. */
function qualifiers(discipline: Discipline): string {
  return [
    discipline.category_code,
    discipline.round_label,
    discipline.distance_m ? `${discipline.distance_m} m` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * De quoi reconnaître une série reçue parmi ses homonymes.
 *
 * Quatre séries d'un même entraînement s'appellent toutes « Séance Vitesse » :
 * ce sont la distance et le moment des chronos qui les distinguent, pas leur
 * nom. Le titre de l'entraînement, lui, ne sépare rien — elles en viennent
 * toutes — et n'allongerait la ligne que pour rien.
 */
function identity(serie: Discipline): string {
  const takenAt = serie.first_result_at ?? serie.metadata?.training_date;

  return [
    serie.distance_m ? `${serie.distance_m} m` : null,
    `${serie.results_count ?? 0} résultat(s)`,
    takenAt ? stampFormatter.format(new Date(takenAt)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function DisciplinesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const disciplines = await withSession(
    `/dashboard/events/${id}/disciplines`,
    () => apiJson<Paginated<Discipline>>(`/events/${id}/disciplines`),
  );

  const all = disciplines.data;

  const programme = all.filter((d) => d.origin === "program");
  const pending = all.filter(
    (d) => d.origin === "ingested" && d.merged_into_discipline_id === null,
  );
  const attached = all.filter(
    (d) => d.origin === "ingested" && d.merged_into_discipline_id !== null,
  );

  // Sans programme écrit, les séries reçues sont le contenu de l'événement :
  // c'est le cas d'un entraînement diffusé depuis l'app VSRUN.
  const hasProgramme = programme.length > 0;
  const listed = hasProgramme ? programme : pending;

  // L'API rend déjà les épreuves dans l'ordre des départs ; il ne reste qu'à
  // les couper en journées.
  const days = new Map<string, Discipline[]>();

  for (const discipline of listed) {
    const key = discipline.scheduled_at
      ? dayFormatter.format(new Date(discipline.scheduled_at))
      : "Sans horaire";

    days.set(key, [...(days.get(key) ?? []), discipline]);
  }

  const nameOf = (disciplineId: string) =>
    all.find((d) => d.id === disciplineId)?.name ?? "épreuve inconnue";

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <AutoRefresh />

          <FormDialog
            trigger="Nouvelle épreuve"
            title="Nouvelle épreuve"
            description="Elle prend place dans le programme à l'heure indiquée."
            submitLabel="Ajouter"
            action={createDiscipline}
          >
            <input type="hidden" name="event_id" value={id} />

            <Field label="Nom" htmlFor="discipline-name">
              <Input
                id="discipline-name"
                name="name"
                required
                maxLength={160}
                placeholder="100 m Haies (84cm)"
              />
            </Field>

            <Field
              label="Type"
              hint="Il détermine les unités acceptées et se fige dès qu'un résultat existe."
            >
              <FormSelect
                name="type"
                defaultValue="time"
                options={Object.entries(DISCIPLINE_TYPE_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </Field>

            <Field
              label="Heure de départ"
              htmlFor="discipline-scheduled-at"
              hint="Heure française. Elle range l'épreuve dans le programme, par journée."
            >
              <Input
                id="discipline-scheduled-at"
                type="datetime-local"
                name="scheduled_at"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Catégorie"
                htmlFor="discipline-category"
                hint="Le code de la fédération : CA, JU, TC…"
              >
                <Input
                  id="discipline-category"
                  name="category"
                  maxLength={8}
                  placeholder="CA"
                />
              </Field>

              <Field label="Genre">
                <FormSelect
                  name="gender"
                  placeholder="Non précisé"
                  options={Object.entries(DISCIPLINE_GENDER_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  )}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tour" hint="Vide pour un concours.">
                <FormSelect
                  name="round"
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
                />
              </Field>
            </div>
          </FormDialog>
        </div>

        {listed.length === 0 ? (
          <EmptyState>
            Aucune épreuve. Composez le programme ici, ou laissez les
            applications VSRUN transmettre leurs résultats lors de la diffusion.
          </EmptyState>
        ) : (
          [...days.entries()].map(([day, dayDisciplines]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-muted-foreground text-sm font-medium capitalize">
                {day}
              </h2>

              {dayDisciplines.map((discipline) => (
                <Card key={discipline.id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <span className="text-muted-foreground w-12 shrink-0 font-mono text-sm tabular-nums">
                        {discipline.scheduled_at
                          ? timeFormatter.format(
                              new Date(discipline.scheduled_at),
                            )
                          : "—"}
                      </span>

                      <div>
                        <Link
                          href={`/dashboard/disciplines/${discipline.id}`}
                          className="font-medium hover:underline"
                        >
                          {discipline.name}
                        </Link>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                          {discipline.origin === "ingested"
                            ? identity(discipline)
                            : [
                                qualifiers(discipline),
                                DISCIPLINE_TYPE_LABELS[discipline.type],
                                `${discipline.results_count ?? 0} résultat(s)`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          discipline.status === "live"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {discipline.status_label}
                      </Badge>

                      <form action={deleteDiscipline}>
                        <input
                          type="hidden"
                          name="discipline_id"
                          value={discipline.id}
                        />
                        <input type="hidden" name="event_id" value={id} />
                        <Button variant="outline" size="sm" type="submit">
                          Supprimer
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </section>
          ))
        )}

        {hasProgramme && pending.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Résultats à rattacher</h2>
            <p className="text-muted-foreground text-sm">
              Ces résultats viennent d&apos;une application VSRUN et n&apos;ont
              pas été programmés. Ils restent invisibles du public tant
              qu&apos;ils ne sont pas rangés dans une épreuve du programme.
            </p>

            {pending.map((serie) => {
              // Un chrono ne peut pas rejoindre une Longueur : les unités d'un
              // résultat dépendent du type de son épreuve.
              const targets = programme.filter((d) => d.type === serie.type);

              return (
                <Card key={serie.id}>
                  <CardContent className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <Link
                        href={`/dashboard/disciplines/${serie.id}`}
                        className="font-medium hover:underline"
                      >
                        {serie.name}
                      </Link>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {identity(serie)}
                      </p>
                    </div>

                    <div className="flex items-end gap-2">
                      {targets.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Aucune épreuve de type «{" "}
                          {DISCIPLINE_TYPE_LABELS[serie.type]} » au programme.
                        </p>
                      ) : (
                        <form action={attachDiscipline} className="flex gap-2">
                          <input
                            type="hidden"
                            name="discipline_id"
                            value={serie.id}
                          />
                          <input type="hidden" name="event_id" value={id} />
                          <FormSelect
                            name="target_discipline_id"
                            placeholder="Choisir une épreuve"
                            required
                            options={targets.map((target) => ({
                              value: target.id,
                              label: [
                                target.scheduled_at
                                  ? timeFormatter.format(
                                      new Date(target.scheduled_at),
                                    )
                                  : null,
                                target.name,
                                target.category_code,
                              ]
                                .filter(Boolean)
                                .join(" "),
                            }))}
                          />
                          <Button size="sm" type="submit">
                            Rattacher
                          </Button>
                        </form>
                      )}

                      {/* Une série qu'on ne veut pas diffuser doit pouvoir
                          disparaître sans passer par un rattachement. */}
                      <form action={deleteDiscipline}>
                        <input
                          type="hidden"
                          name="discipline_id"
                          value={serie.id}
                        />
                        <input type="hidden" name="event_id" value={id} />
                        <Button variant="outline" size="sm" type="submit">
                          Supprimer
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}

        {attached.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Résultats rattachés</h2>

            {attached.map((serie) => (
              <Card key={serie.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    <Link
                      href={`/dashboard/disciplines/${serie.id}`}
                      className="font-medium hover:underline"
                    >
                      {serie.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {" → "}
                      <Link
                        href={`/dashboard/disciplines/${serie.merged_into_discipline_id}`}
                        className="hover:underline"
                      >
                        {nameOf(serie.merged_into_discipline_id as string)}
                      </Link>
                    </span>
                  </p>

                  <div className="flex items-center gap-2">
                    <form action={detachDiscipline}>
                      <input
                        type="hidden"
                        name="discipline_id"
                        value={serie.id}
                      />
                      <input type="hidden" name="event_id" value={id} />
                      <Button variant="outline" size="sm" type="submit">
                        Détacher
                      </Button>
                    </form>

                    <form action={deleteDiscipline}>
                      <input
                        type="hidden"
                        name="discipline_id"
                        value={serie.id}
                      />
                      <input type="hidden" name="event_id" value={id} />
                      <Button variant="outline" size="sm" type="submit">
                        Supprimer
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>

    </div>
  );
}
