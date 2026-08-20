"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Redemande la page au serveur à intervalle régulier.
 *
 * Une série enregistrée sur le téléphone doit apparaître sur le dashboard sans
 * que l'organisateur ait à recharger. Le temps réel par WebSocket passerait par
 * le canal privé `organization.{id}`, dont l'autorisation par le BFF n'existe
 * pas encore (voir `lib/echo.ts`) : en attendant, une relecture périodique rend
 * le même service sans rien exiger de l'infrastructure.
 *
 * `router.refresh()` ne re-monte pas la page : il rejoue le rendu serveur et
 * réconcilie. Les champs en cours de saisie et le défilement sont préservés,
 * ce qui compte sur un écran où l'on tape des noms d'athlètes.
 */
export function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const timer = setInterval(() => {
      // Onglet en arrière-plan : inutile de solliciter le serveur, la page
      // sera relue au retour.
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalMs, paused]);

  return (
    <button
      type="button"
      onClick={() => setPaused((current) => !current)}
      className="text-muted-foreground hover:text-foreground text-xs underline"
    >
      {paused
        ? "Mise à jour automatique en pause — reprendre"
        : "Mise à jour automatique active — suspendre"}
    </button>
  );
}
