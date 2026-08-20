import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LiveResults } from "@/components/live-results";
import { PageHeader } from "@/components/layout";
import { Branded } from "@/components/branded";
import { brandIcons } from "@/lib/favicon";
import { publicJson, publicJsonOrNull } from "@/lib/public-api";
import type {
  Paginated,
  PublicEvent,
  PublicResult,
  Wrapped,
} from "@/lib/types";

/**
 * La page de résultats lit le programme **sans cache**, contrairement à la
 * fiche de l'événement.
 *
 * Les résultats affichés sont regroupés par épreuve : servir un programme
 * périmé, ne serait-ce que quelques secondes, ferait disparaître les résultats
 * d'une épreuve créée entre-temps. Sur la page qui doit précisément rester
 * juste en direct, c'est le pire compromis possible.
 */
async function loadEvent(slug: string) {
  return publicJsonOrNull<Wrapped<PublicEvent>>(`/events/${slug}`, {
    revalidate: 0,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);

  return {
    title: event
      ? `Résultats — ${event.data.name} — VSRUN LIVE`
      : "Événement introuvable — VSRUN LIVE",
    icons: brandIcons(event?.data.brand),
  };
}

export default async function PublicResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ discipline?: string }>;
}) {
  const { slug } = await params;
  const { discipline: disciplineFilter } = await searchParams;

  const event = await loadEvent(slug);

  if (!event) notFound();

  // Rendu initial complet côté serveur : la page est lisible avant qu'aucun
  // JavaScript ne s'exécute, et reste juste si le WebSocket ne s'ouvre pas.
  // Lecture sans cache — une page consultée en tribune ne doit pas servir une
  // version périmée le temps que la connexion temps réel s'établisse.
  const results = await publicJson<Paginated<PublicResult>>(
    `/events/${slug}/results`,
    { revalidate: 0 },
  );

  const disciplines = event.data.disciplines ?? [];
  const selected = disciplineFilter
    ? disciplines.find((discipline) => discipline.id === disciplineFilter)
    : undefined;

  return (
    <Branded brand={event.data.brand} className="rounded-xl p-6 sm:p-8">
      <PageHeader
        title={event.data.name}
        description={
          selected
            ? // L'épreuve est nommée avec ce qui la distingue de ses homonymes,
              // comme sur le programme : « 15:30 · 100 m Haies · CAF · Série(s) ».
              [
                "Résultats",
                selected.scheduled_at
                  ? new Intl.DateTimeFormat("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Paris",
                    }).format(new Date(selected.scheduled_at))
                  : null,
                selected.name,
                selected.category_code,
                selected.round_label,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Résultats publiés"
        }
        action={
          <Link
            href={`/events/${slug}`}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Retour à l&apos;événement
          </Link>
        }
      />

      {disciplineFilter ? (
        <div className="mb-6">
          <Link
            href={`/events/${slug}/results`}
            className="text-muted-foreground hover:text-foreground text-sm underline"
          >
            Voir toutes les épreuves
          </Link>
        </div>
      ) : null}

      <LiveResults
        eventId={event.data.id}
        disciplines={disciplines}
        initialResults={results.data}
        disciplineFilter={disciplineFilter}
      />
    </Branded>
  );
}
