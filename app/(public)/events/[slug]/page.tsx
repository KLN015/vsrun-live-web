import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ButtonLink, EmptyState, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Branded } from "@/components/branded";
import { brandIcons } from "@/lib/favicon";
import { publicJsonOrNull } from "@/lib/public-api";
import type { PublicDiscipline, PublicEvent, Wrapped } from "@/lib/types";

async function loadEvent(slug: string) {
  return publicJsonOrNull<Wrapped<PublicEvent>>(`/events/${slug}`);
}

/**
 * Les horaires d'une compétition française se lisent à l'heure française, quel
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

/**
 * Découpe le programme en journées.
 *
 * L'API rend déjà les épreuves dans l'ordre des départs : il ne reste qu'à
 * poser les titres de journée. Les épreuves sans horaire — un entraînement
 * diffusé n'en a pas — sont regroupées à la fin sous un titre neutre.
 */
function byDay(disciplines: PublicDiscipline[]): Map<string, PublicDiscipline[]> {
  const days = new Map<string, PublicDiscipline[]>();

  for (const discipline of disciplines) {
    const key = discipline.scheduled_at
      ? dayFormatter.format(new Date(discipline.scheduled_at))
      : "Épreuves";

    days.set(key, [...(days.get(key) ?? []), discipline]);
  }

  return days;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);

  if (!event) return { title: "Événement introuvable — VSRUN LIVE" };

  return {
    title: `${event.data.name} — VSRUN LIVE`,
    description:
      event.data.description ??
      `Résultats en direct de ${event.data.name}.`,
    icons: brandIcons(event.data.brand),
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const response = await loadEvent(slug);

  // Événement privé, brouillon ou slug inconnu : l'API renvoie 404 dans les
  // trois cas et le frontend ne cherche pas à les distinguer.
  if (!response) notFound();

  const event = response.data;
  const disciplines = event.disciplines ?? [];
  const videos = event.videos ?? [];
  const published = disciplines.reduce(
    (sum, discipline) => sum + (discipline.results_count ?? 0),
    0,
  );

  return (
    // La charte de l'organisateur habille le contenu ; l'en-tête reste VSRUN,
    // pour que le spectateur sache toujours où il se trouve.
    <Branded brand={event.brand} className="rounded-xl p-6 sm:p-8">
      {event.brand.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.brand.logo_url}
          alt={event.brand.name}
          className="mb-6 h-12 w-auto object-contain"
        />
      ) : null}

      <PageHeader
        title={event.name}
        description={[
          event.organization?.name,
          event.location,
          formatPeriod(event.start_at, event.end_at),
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={event.status === "live" ? "destructive" : "secondary"}
            >
              {event.status_label}
            </Badge>
            {published > 0 ? (
              <ButtonLink href={`/events/${event.slug}/results`}>
                Voir les résultats
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      {event.description ? (
        <p className="mb-8 max-w-2xl text-sm leading-relaxed">
          {event.description}
        </p>
      ) : null}

      <h2
        style={{ fontFamily: "var(--brand-font-heading)" }}
        className="mb-3 text-sm font-medium"
      >
        Programme
      </h2>

      {disciplines.length === 0 ? (
        <EmptyState>
          Le programme n&apos;a pas encore été publié.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {[...byDay(disciplines).entries()].map(([day, dayDisciplines]) => (
            <section key={day} className="space-y-2">
              <h3 className="text-muted-foreground text-sm font-medium capitalize">
                {day}
              </h3>

              {dayDisciplines.map((discipline) => {
                const count = discipline.results_count ?? 0;

                return (
                  <Card key={discipline.id}>
                    <CardContent className="flex items-center justify-between gap-3">
                      {/* `min-w-0` : c'est la ligne de précisions qui se replie
                          quand l'écran rétrécit, pas la pastille de statut qui
                          descend sous la colonne des horaires. */}
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <span className="text-muted-foreground w-12 shrink-0 font-mono text-sm tabular-nums">
                          {discipline.scheduled_at
                            ? timeFormatter.format(
                                new Date(discipline.scheduled_at),
                              )
                            : "—"}
                        </span>

                        <div>
                          {count > 0 ? (
                            <Link
                              href={`/events/${event.slug}/results?discipline=${discipline.id}`}
                              className="font-medium hover:underline"
                            >
                              {discipline.name}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {discipline.name}
                            </span>
                          )}
                          <p className="text-muted-foreground mt-0.5 text-sm">
                            {[
                              discipline.category_code,
                              discipline.round_label,
                              discipline.distance_m
                                ? `${discipline.distance_m} m`
                                : null,
                              count > 0
                                ? `${count} résultat${count > 1 ? "s" : ""}`
                                : "En attente de résultats",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>

                      <Badge
                        className="shrink-0"
                        variant={
                          discipline.status === "live"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {discipline.status_label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {videos.length > 0 ? (
        <section className="mt-10">
          <h2
            style={{ fontFamily: "var(--brand-font-heading)" }}
            className="mb-3 text-sm font-medium"
          >
            Vidéos
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden py-0">
                <CardContent className="px-0">
                  {/* `preload="none"` : une fiche d'événement peut porter
                      plusieurs vidéos, et un spectateur en tribune n'a pas à
                      les télécharger toutes pour lire le programme. */}
                  <video
                    src={video.source_url}
                    poster={video.thumbnail_url ?? undefined}
                    controls
                    preload="none"
                    playsInline
                    className="aspect-video w-full bg-black"
                  />
                  <p className="p-3 text-sm font-medium">{video.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </Branded>
  );
}

function formatPeriod(start: string | null, end: string | null): string | null {
  if (!start) return null;

  const format = (value: string) =>
    new Date(value).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const from = format(start);

  // Une compétition d'un seul jour n'a pas à afficher deux fois la même date.
  if (!end || format(end) === from) return from;

  return `du ${from} au ${format(end)}`;
}
