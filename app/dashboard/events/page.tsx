import Link from "next/link";
import { ButtonLink, EmptyState, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { LiveEvent, Organization, Paginated } from "@/lib/types";

export default async function EventsPage() {
  const { organizations, groups } = await withSession(
    "/dashboard/events",
    async () => {
      const organizations = await apiJson<Paginated<Organization>>(
        "/organizations",
      );

      // Une requête par organisation : l'API expose les événements sous leur
      // organisation propriétaire, ce qui est le bon découpage côté
      // autorisation. Le nombre d'organisations par utilisateur reste petit.
      const groups = await Promise.all(
        organizations.data.map(async (organization) => ({
          organization,
          events: (
            await apiJson<Paginated<LiveEvent>>(
              `/organizations/${organization.id}/events`,
            )
          ).data,
        })),
      );

      return { organizations: organizations.data, groups };
    },
  );

  const total = groups.reduce((sum, group) => sum + group.events.length, 0);

  return (
    <>
      <PageHeader
        title="Événements"
        description="Toutes les compétitions de vos organisations."
        action={
          organizations.length > 0 ? (
            <ButtonLink href="/dashboard/events/new">
              Nouvel événement
            </ButtonLink>
          ) : undefined
        }
      />

      {total === 0 ? (
        <EmptyState>
          {organizations.length === 0
            ? "Créez d'abord une organisation."
            : "Aucun événement pour le moment."}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {groups
            .filter((group) => group.events.length > 0)
            .map((group) => (
              <section key={group.organization.id}>
                <h2 className="text-muted-foreground mb-3 text-sm font-medium">
                  {group.organization.name}
                </h2>
                <div className="space-y-3">
                  {group.events.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/dashboard/events/${event.id}`}
                            className="font-medium hover:underline"
                          >
                            {event.name}
                          </Link>
                          <p className="text-muted-foreground mt-0.5 text-sm">
                            {[
                              event.location,
                              event.start_at
                                ? new Date(event.start_at).toLocaleDateString(
                                    "fr-FR",
                                  )
                                : null,
                              `${event.disciplines_count ?? 0} épreuve(s)`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              event.status === "live" ? "destructive" : "secondary"
                            }
                          >
                            {event.status_label}
                          </Badge>
                          {event.visibility === "private" ? (
                            <Badge variant="outline">Privé</Badge>
                          ) : null}
                          {event.publication_mode === "auto" ? (
                            <Badge variant="outline">Publication auto</Badge>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </>
  );
}
