import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { publicJson } from "@/lib/public-api";
import type { Paginated, PublicEvent } from "@/lib/types";

export const metadata = {
  title: "Événements — VSRUN LIVE",
  description: "Les compétitions diffusées en direct sur VSRUN LIVE.",
};

export default async function PublicEventsPage() {
  const events = await publicJson<Paginated<PublicEvent>>("/events");

  const live = events.data.filter((event) => event.status === "live");
  const others = events.data.filter((event) => event.status !== "live");

  return (
    <>
      <PageHeader
        title="Événements"
        description="Les compétitions diffusées en direct."
      />

      {events.data.length === 0 ? (
        <EmptyState>Aucun événement public pour le moment.</EmptyState>
      ) : (
        <div className="space-y-8">
          {live.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-red-600 dark:text-red-400">
                En direct
              </h2>
              <div className="space-y-3">
                {live.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : null}

          {others.length > 0 ? (
            <section>
              {live.length > 0 ? (
                <h2 className="text-muted-foreground mb-3 text-sm font-medium">
                  Autres compétitions
                </h2>
              ) : null}
              <div className="space-y-3">
                {others.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

function EventCard({ event }: { event: PublicEvent }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/events/${event.slug}`}
            className="font-medium hover:underline"
          >
            {event.name}
          </Link>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {[
              event.organization?.name,
              event.location,
              event.start_at
                ? new Date(event.start_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <Badge variant={event.status === "live" ? "destructive" : "secondary"}>
          {event.status_label}
        </Badge>
      </CardContent>
    </Card>
  );
}
