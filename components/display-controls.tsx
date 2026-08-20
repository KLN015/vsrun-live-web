"use client";

import { useCallback, useEffect, useState } from "react";
import { audioIsReady, unlockAudio } from "@/lib/gunshot";

/**
 * Les commandes locales d'un écran de diffusion : plein écran et son.
 *
 * Deux réglages qui n'appartiennent qu'à la machine qui affiche — un écran
 * passé en plein écran ne doit pas y faire passer les autres — et qui ne
 * transitent donc jamais par le serveur.
 *
 * Les boutons s'effacent après quelques secondes d'immobilité de la souris :
 * ce qui est projeté en tribune ne doit rien montrer d'autre que la course. Ils
 * reviennent au moindre mouvement.
 *
 * Le son fait exception et reste visible tant qu'il est bloqué. Le navigateur
 * refuse tout son à une page qui n'a reçu aucun geste — c'est une règle qu'on
 * ne contourne pas, et la seule chose utile est de la rendre visible : un clic
 * au montage de l'écran, et tous les départs de la journée partent au coup de
 * feu sans qu'on y retouche.
 */
export function DisplayControls() {
  const [fullscreen, setFullscreen] = useState(false);
  const [soundReady, setSoundReady] = useState(true);
  const [visible, setVisible] = useState(true);

  // Le navigateur peut avoir déjà accordé le son à ce domaine : on demande
  // avant de réclamer un clic, plutôt que d'afficher un avertissement inutile.
  useEffect(() => {
    void unlockAudio().then(setSoundReady);
  }, []);

  // Le plein écran se quitte aussi par Échap ou par la barre du navigateur :
  // c'est l'événement qui fait foi, jamais notre propre clic.
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null);

    document.addEventListener("fullscreenchange", sync);
    sync();

    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // Tout geste sur la page débloque le son, pas seulement le bouton : un
  // régisseur qui clique ailleurs a fait ce qu'il fallait sans le savoir.
  useEffect(() => {
    if (soundReady) return;

    const attempt = () => void unlockAudio().then(setSoundReady);

    for (const event of ["pointerdown", "keydown"] as const) {
      document.addEventListener(event, attempt);
    }

    return () => {
      for (const event of ["pointerdown", "keydown"] as const) {
        document.removeEventListener(event, attempt);
      }
    };
  }, [soundReady]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const wake = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3000);
    };

    wake();
    document.addEventListener("pointermove", wake);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointermove", wake);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    // Débloquer le son ici aussi : passer l'écran en plein écran est le geste
    // qu'on fait en installant la tribune, et c'est le bon moment pour que le
    // navigateur accorde le coup de feu.
    void unlockAudio().then(setSoundReady);

    if (document.fullscreenElement) {
      void document.exitFullscreen();

      return;
    }

    // Sur l'élément racine et non sur un conteneur : le fond de l'écran doit
    // aller jusqu'aux bords, sans bande noire du navigateur.
    void document.documentElement.requestFullscreen().catch(() => {
      // Refusé — iframe sans autorisation, ou navigateur sans l'API.
    });
  }, []);

  // Raccourci clavier : un régisseur pilote souvent l'écran au clavier, la
  // souris étant hors de portée derrière le vidéoprojecteur.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "f" || event.key === "F") toggleFullscreen();
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  return (
    <div
      // Sous le compte à rebours (z-50) : rien ne doit couvrir le « Go ».
      className="fixed right-4 bottom-4 z-40 flex items-center gap-2 transition-opacity duration-500"
      style={{ opacity: visible || !soundReady ? 1 : 0 }}
    >
      {soundReady ? null : (
        <button
          type="button"
          onClick={() => void unlockAudio().then(setSoundReady)}
          className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-neutral-900 shadow-lg"
        >
          Activer le son du départ
        </button>
      )}

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
        title={`${fullscreen ? "Quitter le plein écran" : "Plein écran"} (F)`}
        className="rounded-full bg-white/15 p-3 text-white backdrop-blur transition-colors hover:bg-white/25"
      >
        <FullscreenIcon exiting={fullscreen} />
      </button>
    </div>
  );
}

/** Quatre coins : ils s'écartent pour entrer, se referment pour sortir. */
function FullscreenIcon({ exiting }: { exiting: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {exiting ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </svg>
  );
}
