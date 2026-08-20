import Link from "next/link";
import { FormDialog } from "@/components/form-dialog";
import { EmptyState, Field, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createOrganization } from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { Organization, Paginated } from "@/lib/types";

export default async function OrganizationsPage() {
  const organizations = await withSession("/dashboard", () =>
    apiJson<Paginated<Organization>>("/organizations"),
  );

  // Une organisation par compte : le serveur refuse la seconde, autant ne pas
  // proposer le geste. Être invité chez un confrère ne compte pas — la limite
  // porte sur ce qu'on fonde, pas sur ce à quoi on appartient.
  const ownsOne = organizations.data.some(
    (organization) => organization.role === "owner",
  );

  return (
    <>
      <PageHeader
        title="Organisations"
        description="Vos organisations, leurs membres et les événements qu'elles diffusent."
        action={
          ownsOne ? null : (
          <FormDialog
            trigger="Nouvelle organisation"
            title="Nouvelle organisation"
            description="Vous en devenez propriétaire."
            submitLabel="Créer"
            action={createOrganization}
          >
            <Field label="Nom" htmlFor="organization-name">
              <Input
                id="organization-name"
                name="name"
                required
                minLength={2}
                maxLength={120}
              />
            </Field>
          </FormDialog>
          )
        }
      />

      <div>
        <div className="space-y-3">
          {organizations.data.length === 0 ? (
            <EmptyState>
              Vous n&apos;appartenez à aucune organisation. Créez-en une pour
              commencer à diffuser des événements.
            </EmptyState>
          ) : (
            organizations.data.map((organization) => (
              <Card key={organization.id}>
                <CardContent className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/dashboard/organizations/${organization.id}`}
                      className="font-medium hover:underline"
                    >
                      {organization.name}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {organization.slug}
                      {organization.members_count !== undefined
                        ? ` · ${organization.members_count} membre${organization.members_count > 1 ? "s" : ""}`
                        : null}
                    </p>
                  </div>
                  {organization.role ? (
                    <Badge variant="secondary">{organization.role}</Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </>
  );
}
