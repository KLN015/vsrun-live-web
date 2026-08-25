import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Field } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteEvent, updateEvent } from "@/lib/actions";
import { toLocalInput } from "@/lib/datetime";
import { apiJson, apiJsonOrNull } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type {
  LiveEvent,
  ManagedBrand,
  Paginated,
  Wrapped,
} from "@/lib/types";

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { response, brands } = await withSession(
    `/dashboard/events/${id}`,
    async () => {
      const response = await apiJsonOrNull<Wrapped<LiveEvent>>(`/events/${id}`);

      if (!response) return { response: null, brands: [] };

      // Les chartes de l'organisation propriétaire : c'est entre celles-là que
      // l'événement peut basculer.
      const brands = await apiJson<Paginated<ManagedBrand>>(
        `/organizations/${response.data.organization_id}/brands`,
      );

      return { response, brands: brands.data };
    },
  );

  if (!response) notFound();

  const event = response.data;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardContent>
        <ActionForm action={updateEvent} submitLabel="Enregistrer">
          <input type="hidden" name="event_id" value={event.id} />

          <Field label="Nom" htmlFor="name">
            <Input id="name" name="name" defaultValue={event.name} required />
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={event.description ?? ""}
            />
          </Field>

          <Field label="Lieu" htmlFor="location">
            <Input
              id="location"
              name="location"
              defaultValue={event.location ?? ""}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Début"
              htmlFor="start_at"
              hint="Heure française. Elle situe l'événement et sert de repère au programme."
            >
              <Input
                id="start_at"
                type="datetime-local"
                name="start_at"
                defaultValue={toLocalInput(event.start_at)}
              />
            </Field>

            <Field label="Fin" htmlFor="end_at">
              <Input
                id="end_at"
                type="datetime-local"
                name="end_at"
                defaultValue={toLocalInput(event.end_at)}
              />
            </Field>
          </div>

          <Field
            label="Charte graphique"
            hint="Elle habille les écrans et la page publique. Vide : celle par défaut de l'organisation."
          >
            <FormSelect
              name="brand_id"
              defaultValue={event.brand_id ?? ""}
              placeholder="Charte par défaut"
              options={brands.map((brand) => ({
                value: brand.id,
                label: brand.name,
              }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Statut">
              <FormSelect
                name="status"
                defaultValue={event.status}
                options={[
                  { value: "draft", label: "Brouillon" },
                  { value: "scheduled", label: "Programmé" },
                  { value: "live", label: "En direct" },
                  { value: "finished", label: "Terminé" },
                  { value: "archived", label: "Archivé" },
                ]}
              />
            </Field>

            <Field
              label="Visibilité"
              hint="Un événement public en brouillon reste invisible : les deux réglages se combinent."
            >
              <FormSelect
                name="visibility"
                defaultValue={event.visibility}
                options={[
                  { value: "private", label: "Privé" },
                  { value: "public", label: "Public" },
                ]}
              />
            </Field>
          </div>

          <Field
            label="Mode de publication"
            hint="Le changement n'est pas rétroactif : les brouillons déjà reçus attendent toujours une publication explicite."
          >
            <FormSelect
              name="publication_mode"
              defaultValue={event.publication_mode}
              options={[
                { value: "manual", label: "Manuel" },
                { value: "auto", label: "Automatique" },
              ]}
            />
          </Field>

          <Field
            label="Rattachement des séries reçues"
            hint="En automatique, une série reçue rejoint l'épreuve du programme qui porte le même nom. Deux épreuves homonymes : la série attend, personne ne peut trancher à votre place. Contrairement à la publication, l'activer rattache aussi les séries déjà en attente — et chaque rattachement reste défaisable."
          >
            <FormSelect
              name="attachment_mode"
              defaultValue={event.attachment_mode}
              options={[
                { value: "manual", label: "Manuel" },
                { value: "auto", label: "Automatique" },
              ]}
            />
          </Field>
        </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">Supprimer l&apos;événement</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Ses épreuves, ses résultats, ses participants, ses écrans et ses
              vidéos partent avec lui. Rien n&apos;est conservé.
            </p>
          </div>

          <FormDialog
            trigger="Supprimer"
            variant="destructive"
            title={`Supprimer « ${event.name} » ?`}
            description="La suppression est définitive : contrairement à une épreuve, un événement n'est pas masqué mais effacé, avec tout ce qu'il porte. Les pages publiques et les écrans qui en dépendent cesseront de répondre."
            submitLabel="Supprimer définitivement"
            action={deleteEvent}
          >
            <input type="hidden" name="event_id" value={event.id} />

            <dl className="text-sm">
              {[
                ["Épreuves", event.disciplines_count],
                ["Participants", event.participants_count],
              ]
                .filter(([, count]) => count !== undefined)
                .map(([label, count]) => (
                  <div
                    key={label as string}
                    className="flex justify-between border-b py-1.5 last:border-0"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums">{count}</dd>
                  </div>
                ))}
            </dl>
          </FormDialog>
        </CardContent>
      </Card>
    </div>
  );
}
