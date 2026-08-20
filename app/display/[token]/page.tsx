import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LiveDisplay } from "@/components/live-display";
import { brandIcons } from "@/lib/favicon";
import { publicJsonOrNull } from "@/lib/public-api";
import type { RenderedDisplay, Wrapped } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const display = await loadDisplay(token);

  return {
    // Le nom de l'écran dans l'onglet : un régisseur en ouvre souvent
    // plusieurs, et « Écran » trois fois ne l'aide pas.
    title: display
      ? `${display.data.name} — ${display.data.event.name}`
      : "Écran — VSRUN LIVE",

    icons: brandIcons(display?.data.brand),

    // Un écran de diffusion n'a aucune raison d'être indexé, et son jeton n'a
    // aucune raison de se retrouver dans un moteur de recherche.
    robots: { index: false, follow: false },
  };
}

/**
 * La charge d'un écran, partagée entre les métadonnées et le rendu.
 *
 * Next appelle les deux : la mise en cache de la requête évite d'interroger
 * l'API deux fois pour une seule page.
 */
async function loadDisplay(token: string) {
  return publicJsonOrNull<Wrapped<RenderedDisplay>>(`/displays/${token}`, {
    revalidate: 0,
  });
}

/**
 * Écran de diffusion, en plein écran et sans habillage.
 *
 * Volontairement hors du groupe `(public)` : pas d'en-tête, pas de navigation,
 * pas de lien vers le dashboard. Cette page est destinée à un vidéoprojecteur,
 * pas à un visiteur.
 */
export default async function DisplayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const display = await loadDisplay(token);

  // Jeton inconnu ou régénéré depuis le dashboard : l'ancienne URL ne doit
  // plus rien afficher.
  if (!display) notFound();

  return (
    <main className="h-screen w-screen overflow-hidden bg-neutral-950">
      <LiveDisplay token={token} initial={display.data} />
    </main>
  );
}
