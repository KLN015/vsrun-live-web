"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DisplayCanvas } from "@/components/display-canvas";
import { DisplayChrome } from "@/components/display-chrome";
import { DisplayClock, DisplayCountdown } from "@/components/display-clock";
import { DisplayControls } from "@/components/display-controls";
import { BrandFontFaces } from "@/components/brand-faces";
import { brandStyle } from "@/lib/brand";
import { displayEcho } from "@/lib/echo";
import type { Clock, RenderedDisplay } from "@/lib/types";

/**
 * Écran de diffusion, en direct.
 *
 * Un écran vit sans surveillance pendant des heures. Trois conséquences sur sa
 * conception :
 *
 *   - il redemande sa configuration complète au serveur à chaque signal, plutôt
 *     que d'interpréter les messages reçus. Une seule logique de résolution du
 *     contenu, côté serveur, qui ne peut pas dériver ;
 *   - il continue d'afficher la dernière version connue si le réseau tombe.
 *     Un écran figé sur des résultats justes vaut mieux qu'un écran vide ;
 *   - il se rafraîchit périodiquement en secours, au cas où le WebSocket se
 *     serait interrompu sans que personne ne s'en aperçoive.
 */
export function LiveDisplay({
  token,
  initial,
}: {
  token: string;
  initial: RenderedDisplay;
}) {
  const [display, setDisplay] = useState(initial);
  const [clock, setClock] = useState<Clock>(initial.clock);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    // Les signaux arrivent parfois en rafale — publication d'une série
    // entière. Une seule requête à la fois suffit.
    if (inFlight.current) return;

    inFlight.current = true;

    try {
      const response = await fetch(`/api/display/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });

      if (response.ok) {
        const fresh = ((await response.json()) as { data: RenderedDisplay }).data;
        setDisplay(fresh);
        setClock(fresh.clock);
      }
    } catch {
      // Réseau indisponible : on garde l'affichage précédent.
    } finally {
      inFlight.current = false;
    }
  }, [token]);

  useEffect(() => {
    const client = displayEcho(token);

    if (!client) return;

    // Toute notification déclenche le même rafraîchissement, quel qu'en soit
    // le motif : nouveau résultat, correction, retrait, reconfiguration.
    const channel = client.private(`display.${display.id}`);

    for (const name of [
      ".result.published",
      ".result.updated",
      ".result.unpublished",
      ".display.configuration-updated",
    ]) {
      channel.listen(name, () => void refresh());
    }

    // Le chronomètre fait exception à la règle du « tout redemander » : son
    // état tient dans le message, et un aller-retour HTTP au coup de feu se
    // verrait à l'écran.
    // Les canaux d'un événement portent tous ses écrans : chacun ne retient
    // que son propre chronomètre.
    channel.listen(
      ".clock.updated",
      (payload: { display_id: string; clock: Clock }) => {
        if (payload.display_id === display.id) setClock(payload.clock);
      },
    );

    return () => {
      client.leave(`display.${display.id}`);
      client.disconnect();
    };
  }, [token, display.id, refresh]);

  useEffect(() => {
    // Filet de sécurité : si le WebSocket se coupe sans se signaler, l'écran
    // se remet à jour tout seul dans la minute.
    const timer = setInterval(() => void refresh(), 60_000);

    return () => clearInterval(timer);
  }, [refresh]);

  // Le chronomètre n'occupe la hauteur que lorsqu'il sert : hors course, les
  // résultats reprennent tout l'écran.
  const showsClock = clock.running || clock.elapsed_ms > 0;

  return (
    <div
      className="flex h-full w-full flex-col gap-4 p-6"
      style={{
        ...brandStyle(display.brand),
        color: "var(--brand-text)",
        fontFamily: "var(--brand-font-body)",
        // Dégradé repris du prototype : une lueur haute aux couleurs de
        // l'organisateur, sur un fond qui s'assombrit vers le bas.
        background: `
          radial-gradient(1200px 600px at 50% -12%, color-mix(in srgb, var(--brand-accent) 22%, transparent), transparent 62%),
          linear-gradient(180deg, var(--brand-background) 0%, color-mix(in srgb, var(--brand-background) 82%, #000) 100%)
        `,
      }}
    >
      <BrandFontFaces brand={display.brand} />

      <DisplayChrome
        eventName={display.event.name}
        live={display.event.status === "live"}
        logoUrl={display.brand.logo_url}
      />

      {showsClock ? <DisplayClock clock={clock} /> : null}

      <div className="min-h-0 flex-1">
        <DisplayCanvas
          layout={display.layout}
          zones={display.zones}
          brand={display.brand}
        />
      </div>

      <DisplayCountdown clock={clock} />

      <DisplayControls />
    </div>
  );
}
