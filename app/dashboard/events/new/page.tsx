import { ActionForm } from "@/components/action-form";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field, PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { Organization, Paginated } from "@/lib/types";

export default async function NewEventPage() {
  const organizations = await withSession("/dashboard/events/new", () =>
    apiJson<Paginated<Organization>>("/organizations"),
  );

  if (organizations.data.length === 0) {
    return (
      <EmptyState>
        Créez d&apos;abord une organisation pour y rattacher un événement.
      </EmptyState>
    );
  }

  return (
    <>
      <PageHeader
        title="Nouvel événement"
        description="Il sera créé en brouillon : rien n'est exposé tant que vous ne l'avez pas décidé."
      />

      <Card className="max-w-2xl">
        <CardContent>
          <ActionForm action={createEvent} submitLabel="Créer l'événement">
            <Field label="Organisation">
              <FormSelect
                name="organization_id"
                required
                defaultValue={organizations.data[0].id}
                options={organizations.data.map((organization) => ({
                  value: organization.id,
                  label: organization.name,
                }))}
              />
            </Field>

            <Field label="Nom" htmlFor="event-name">
              <Input
                id="event-name"
                name="name"
                required
                minLength={2}
                maxLength={160}
              />
            </Field>

            <Field label="Description" htmlFor="event-description">
              <Textarea id="event-description" name="description" rows={3} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lieu" htmlFor="event-location">
                <Input id="event-location" name="location" maxLength={255} />
              </Field>
              <Field
                label="Visibilité"
                hint="Un événement privé n'apparaît dans aucune liste publique."
              >
                <FormSelect
                  name="visibility"
                  defaultValue="private"
                  options={[
                    { value: "private", label: "Privé" },
                    { value: "public", label: "Public" },
                  ]}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Début" htmlFor="event-start">
                <Input id="event-start" type="datetime-local" name="start_at" />
              </Field>
              <Field label="Fin" htmlFor="event-end">
                <Input id="event-end" type="datetime-local" name="end_at" />
              </Field>
            </div>

            <Field
              label="Mode de publication"
              hint="En automatique, les résultats reçus des applications VSRUN deviennent visibles immédiatement."
            >
              <FormSelect
                name="publication_mode"
                defaultValue="manual"
                options={[
                  { value: "manual", label: "Manuel" },
                  { value: "auto", label: "Automatique" },
                ]}
              />
            </Field>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
