import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field } from "@/components/layout";
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
import { Button } from "@/components/ui/button";
import { createParticipant, updateParticipant } from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import {
  PARTICIPANT_GENDER_LABELS,
  type Paginated,
  type Participant,
} from "@/lib/types";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const path = `/dashboard/events/${id}/participants`;

  const participants = await withSession(path, () =>
    apiJson<Paginated<Participant>>(`/events/${id}/participants`),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog
          trigger="Ajouter un participant"
          title="Ajouter un participant"
          description="Un athlète sans nom reste affichable par son dossard."
          submitLabel="Ajouter"
          action={createParticipant}
        >
          <input type="hidden" name="event_id" value={id} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" htmlFor="first-name">
              <Input id="first-name" name="first_name" maxLength={120} />
            </Field>
            <Field label="Nom" htmlFor="last-name">
              <Input id="last-name" name="last_name" maxLength={120} />
            </Field>
          </div>

          <Field label="Dossard" htmlFor="bib">
            <Input id="bib" name="bib" maxLength={32} />
          </Field>

          <Field label="Club" htmlFor="club">
            <Input id="club" name="club" maxLength={160} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Catégorie"
              htmlFor="category"
              hint="Celle de l'athlète, distincte de celle de l'épreuve."
            >
              <Input
                id="category"
                name="category"
                maxLength={8}
                placeholder="CAF"
              />
            </Field>

            <Field label="Pays" htmlFor="country">
              <Input
                id="country"
                name="country"
                maxLength={3}
                placeholder="FR"
              />
            </Field>
          </div>

          <Field label="Sexe">
            <FormSelect
              name="gender"
              placeholder="Non précisé"
              options={Object.entries(PARTICIPANT_GENDER_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Field>
        </FormDialog>
      </div>

      <div>
        {participants.data.length === 0 ? (
          <EmptyState>
            Aucun participant. Les applications VSRUN transmettent les athlètes
            en même temps que leurs résultats — cette liste se remplira d&apos;
            elle-même pendant la compétition.
          </EmptyState>
        ) : (
          <Card className="py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Dossard</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead className="w-20">Cat.</TableHead>
                    <TableHead className="w-28">Sexe</TableHead>
                    <TableHead className="w-20">Pays</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.data.map((participant) => {
                    // Le formulaire est déclaré dans une cellule et les champs
                    // s'y rattachent par `form=` : un <form> ne peut pas
                    // envelopper un <tr> en HTML.
                    const formId = `participant-${participant.id}`;

                    return (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <form id={formId} action={updateParticipant}>
                            <input
                              type="hidden"
                              name="participant_id"
                              value={participant.id}
                            />
                            <input type="hidden" name="back" value={path} />
                          </form>
                          <Input
                            form={formId}
                            name="bib"
                            maxLength={32}
                            defaultValue={participant.bib ?? ""}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            form={formId}
                            name="display_name"
                            required
                            maxLength={160}
                            defaultValue={participant.display_name}
                            className="h-8 font-medium"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            form={formId}
                            name="club"
                            maxLength={160}
                            defaultValue={participant.club ?? ""}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            form={formId}
                            name="category"
                            maxLength={8}
                            placeholder="CAF"
                            defaultValue={participant.category ?? ""}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          {/* <select> natif : il se rattache au formulaire de
                              la ligne par `form=`, ce qu'un composant Radix ne
                              sait pas faire dans un tableau. */}
                          <select
                            form={formId}
                            name="gender"
                            defaultValue={participant.gender ?? ""}
                            className="border-input bg-background h-8 w-full rounded-md border px-2 text-sm"
                          >
                            <option value="">—</option>
                            {Object.entries(PARTICIPANT_GENDER_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            form={formId}
                            name="country"
                            maxLength={3}
                            placeholder="FR"
                            defaultValue={participant.country ?? ""}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            form={formId}
                            variant="outline"
                            size="sm"
                            type="submit"
                          >
                            Enregistrer
                          </Button>
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
  );
}
