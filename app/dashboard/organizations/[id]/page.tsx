import Link from "next/link";
import { notFound } from "next/navigation";
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
  addOrganizationMember,
  deleteOrganization,
  removeOrganizationMember,
  updateOrganizationMember,
} from "@/lib/actions";
import { apiJson, apiJsonOrNull } from "@/lib/api";
import { withSession } from "@/lib/guard";
import {
  ASSIGNABLE_ROLES,
  ORGANIZATION_ROLE_LABELS,
  type LiveEvent,
  type Organization,
  type OrganizationMember,
  type Paginated,
  type Wrapped,
} from "@/lib/types";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const path = `/dashboard/organizations/${id}`;

  const { organization, members, events } = await withSession(path, async () => {
    const organization =
      await apiJsonOrNull<Wrapped<Organization>>(`/organizations/${id}`);

    if (!organization) return { organization: null, members: [], events: 0 };

    // Les événements ne sont pas listés ici, seulement comptés : c'est ce que
    // la suppression emporterait, et le dire vaut mieux que le sous-entendre.
    const [members, events] = await Promise.all([
      apiJson<Paginated<OrganizationMember>>(`/organizations/${id}/members`),
      apiJson<Paginated<LiveEvent>>(`/organizations/${id}/events`),
    ]);

    return {
      organization: organization.data,
      members: members.data,
      events: events.data.length,
    };
  });

  if (!organization) notFound();

  return (
    <>
      <PageHeader
        title={organization.name}
        description={`${organization.slug} · ${members.length} membre${members.length > 1 ? "s" : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/events"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Ses événements
            </Link>

            <FormDialog
              trigger="Ajouter un membre"
              title="Ajouter un membre"
              description="La personne doit s'être connectée au moins une fois à vsrun.live pour être trouvée."
              submitLabel="Ajouter"
              action={addOrganizationMember}
            >
              <input type="hidden" name="organization_id" value={id} />

              <Field
                label="Nom d'utilisateur ou adresse e-mail"
                htmlFor="member-identifier"
                hint="Son compte VSRUN, tel qu'elle le connaît."
              >
                <Input
                  id="member-identifier"
                  name="identifier"
                  required
                  placeholder="lea.martin ou lea@example.com"
                />
              </Field>

              <Field
                label="Rôle"
                hint="Le rôle de propriétaire ne s'attribue pas : il se transfère."
              >
                <FormSelect
                  name="role"
                  defaultValue="organizer"
                  options={ASSIGNABLE_ROLES.map((role) => ({
                    value: role,
                    label: ORGANIZATION_ROLE_LABELS[role],
                  }))}
                />
              </Field>
            </FormDialog>
          </div>
        }
      />

      {members.length === 0 ? (
        <EmptyState>
          Aucun membre. Vous êtes seul à administrer cette organisation.
        </EmptyState>
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead className="w-48">Rôle</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  // Le propriétaire ne se rétrograde ni ne se retire depuis
                  // cet écran : le serveur le refuserait, autant ne pas
                  // proposer le geste.
                  const isOwner = member.role === "owner";
                  const formId = `member-${member.id}`;

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <span className="font-medium">
                          {member.user?.display_name ??
                            member.user?.email ??
                            "Compte VSRUN"}
                        </span>
                        {[member.user?.username, member.user?.email].filter(
                          Boolean,
                        ).length > 0 ? (
                          <p className="text-muted-foreground text-xs">
                            {[member.user?.username, member.user?.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        {isOwner ? (
                          <Badge variant="secondary">{member.role_label}</Badge>
                        ) : (
                          <>
                            <form
                              id={formId}
                              action={updateOrganizationMember}
                            >
                              <input
                                type="hidden"
                                name="organization_id"
                                value={id}
                              />
                              <input
                                type="hidden"
                                name="member_id"
                                value={member.id}
                              />
                            </form>
                            {/* <select> natif : il peut se rattacher au
                                formulaire par `form=`, ce qu'un composant
                                Radix ne sait pas faire dans un tableau. */}
                            <select
                              form={formId}
                              name="role"
                              defaultValue={member.role}
                              className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                            >
                              {ASSIGNABLE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ORGANIZATION_ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                            <Button
                              form={formId}
                              variant="outline"
                              size="sm"
                              type="submit"
                              className="ml-2"
                            >
                              OK
                            </Button>
                          </>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {isOwner ? null : (
                          <form action={removeOrganizationMember}>
                            <input
                              type="hidden"
                              name="organization_id"
                              value={id}
                            />
                            <input
                              type="hidden"
                              name="member_id"
                              value={member.id}
                            />
                            <Button variant="outline" size="sm" type="submit">
                              Retirer
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* La suppression n'est offerte qu'au propriétaire, comme la policy
          l'exige : proposer un geste que le serveur refusera n'aide personne. */}
      {organization.role === "owner" ? (
        <Card className="mt-8">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">Supprimer l&apos;organisation</p>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {events === 0
                  ? "Elle ne porte aucun événement."
                  : `Ses ${events} événement${events > 1 ? "s" : ""} partent avec elle, résultats et écrans compris.`}
              </p>
            </div>

            <FormDialog
              trigger="Supprimer"
              variant="destructive"
              title={`Supprimer « ${organization.name} » ?`}
              description="L'action la moins réversible du produit : elle efface l'organisation, ses événements, leurs résultats déjà diffusés, ses écrans et ses chartes. Rien n'est conservé."
              submitLabel="Supprimer définitivement"
              action={deleteOrganization}
            >
              <input type="hidden" name="organization_id" value={id} />
              <input type="hidden" name="name" value={organization.name} />

              <Field
                label="Recopiez le nom pour confirmer"
                htmlFor="organization-confirmation"
                hint={organization.name}
              >
                <Input
                  id="organization-confirmation"
                  name="confirmation"
                  required
                  autoComplete="off"
                  placeholder={organization.name}
                />
              </Field>
            </FormDialog>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
