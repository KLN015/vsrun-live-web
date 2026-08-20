"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type { ChannelAuthorizationCallback } from "pusher-js/types/src/core/auth/options";

/**
 * Connexion WebSocket vers Laravel Reverb.
 *
 * Une seule instance pour tout l'onglet : chaque page qui écoute s'abonne à un
 * canal, elle n'ouvre pas sa propre connexion. Un spectateur qui navigue entre
 * deux épreuves ne doit pas accumuler les sockets.
 *
 * Seuls les canaux publics sont accessibles ainsi. Les canaux privés
 * (`organization.`, `display.`) exigent une autorisation serveur, qui passera
 * par le BFF — le navigateur n'a pas de jeton à présenter.
 */

type EchoClient = InstanceType<typeof Echo>;

let client: EchoClient | null = null;

export function echo(): EchoClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (client) {
    return client;
  }

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;

  if (!key) {
    // Sans clé, le temps réel est simplement absent : les pages restent
    // lisibles et se rafraîchissent au rechargement. Une fonctionnalité
    // d'agrément ne doit pas casser l'affichage des résultats.
    console.warn("NEXT_PUBLIC_REVERB_APP_KEY absent : temps réel désactivé.");

    return null;
  }

  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080);

  // laravel-echo attend Pusher sur l'objet global.
  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  client = new Echo({
    broadcaster: "reverb",
    key,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
  });

  return client;
}

/**
 * Connexion dédiée à un écran de diffusion.
 *
 * Instance distincte de celle des pages publiques : l'écran s'abonne à un canal
 * **privé**, autorisé par son jeton d'URL et non par une session. Le jeton
 * n'apparaît jamais dans le nom du canal — il ne se retrouve donc ni dans les
 * journaux du serveur WebSocket ni dans ses métriques.
 */
export function displayEcho(token: string): EchoClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;

  if (!key) {
    console.warn("NEXT_PUBLIC_REVERB_APP_KEY absent : temps réel désactivé.");

    return null;
  }

  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080);

  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

  return new Echo({
    broadcaster: "reverb",
    key,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    // La signature attendue par pusher-js : `callback(error, data)`, où
    // l'erreur est un Error ou null — et non un booléen, contrairement à
    // l'ancienne API que l'on trouve encore dans beaucoup d'exemples.
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: ChannelAuthorizationCallback) => {
        fetch(`/api/display-auth/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`Autorisation refusée (${response.status})`);
            }

            callback(null, await response.json());
          })
          .catch((error: Error) => callback(error, null));
      },
    }),
  });
}
