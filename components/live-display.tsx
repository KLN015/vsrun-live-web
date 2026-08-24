"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DisplayCanvas,
  FreeZone,
  freeGeometry,
} from "@/components/display-canvas";
import { DisplayChrome } from "@/components/display-chrome";
import { DisplayClock, DisplayCountdown } from "@/components/display-clock";
import { DisplayControls } from "@/components/display-controls";
import { FreeCanvas } from "@/components/free-canvas";
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

  // En découpage libre, la page **entière** est une toile de dimensions
  // connues, mise à l'échelle d'un seul tenant : logo, chronomètre et listes
  // de résultats grandissent ensemble. Les autres découpages restent fluides
  // et s'adaptent à la surface qu'on leur donne.
  const free = display.layout === "free";

  const surface = {
    ...brandStyle(display.brand),
    color: "var(--brand-text)",
    fontFamily: "var(--brand-font-body)",
    // Dégradé repris du prototype : une lueur haute aux couleurs de
    // l'organisateur, sur un fond qui s'assombrit vers le bas.
    background: `
      radial-gradient(1200px 600px at 50% -12%, color-mix(in srgb, var(--brand-accent) 22%, transparent), transparent 62%),
      linear-gradient(180deg, var(--brand-background) 0%, color-mix(in srgb, var(--brand-background) 82%, #000) 100%)
    `,
  };

  const chrome = (
    <>
      <DisplayChrome
        live={display.event.status === "live"}
        logoUrl={display.brand.logo_url}
      />

      {showsClock ? <DisplayClock clock={clock} /> : null}
    </>
  );

  const overlays = (
    <>
      <DisplayCountdown clock={clock} />
      <DisplayControls />
    </>
  );

  if (free) {
    const geometry = freeGeometry(display.zones[0], display.canvas);

    return (
      <div className="h-full w-full" style={surface}>
        <BrandFontFaces brand={display.brand} />

        {/* La toile est l'écran entier ; la zone y délimite tout ce qui
            s'affiche. Son rectangle porte l'habillage comme le contenu : rien
            ne déborde de ce que l'organisateur a placé. */}
        <FreeCanvas
          width={display.canvas.width}
          height={display.canvas.height}
        >
          <div className="relative h-full w-full">
            <FreeZone
              zone={display.zones[0]}
              canvas={display.canvas}
              brand={display.brand}
              header={chrome}
              image={display.image}
            />

            {/* Le compte à rebours appartient à la composition, pas à l'écran :
                il couvre le rectangle de la zone et s'y centre. Une zone posée
                dans un coin d'un mur garde son décompte au même endroit que ses
                résultats — le chercher ailleurs n'aurait aucun sens pour qui
                regarde. */}
            <div
              className="absolute"
              style={{
                left: geometry.x,
                top: geometry.y,
                width: geometry.width,
                height: geometry.height,
              }}
            >
              <DisplayCountdown clock={clock} />
            </div>
          </div>
        </FreeCanvas>

        {/* Hors de la toile : les commandes s'adressent au régisseur devant la
            machine, pas à la tribune. Leur place est le coin de l'écran réel. */}
        <DisplayControls />
      </div>
    );
  }

  // Un visuel affiché remplace toute la composition, habillage compris : en
  // grille il n'y a pas de zone unique où le confiner, et une affiche coincée
  // sous un bandeau ne dit plus rien de lisible depuis une tribune. Même
  // règle qu'en découpage libre — l'écran entier, bord à bord.
  if (display.image) {
    return (
      <div className="relative h-full w-full" style={surface}>
        <BrandFontFaces brand={display.brand} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={display.image.url}
          alt=""
          className="h-full w-full object-contain"
        />

        {overlays}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col gap-4 p-6"
      style={surface}
    >
      <BrandFontFaces brand={display.brand} />

      {chrome}

      <div className="min-h-0 flex-1">
        <DisplayCanvas
          layout={display.layout}
          zones={display.zones}
          brand={display.brand}
        />
      </div>

      {overlays}
    </div>
  );
}
