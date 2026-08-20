"use client";

import { useEffect, useRef, useState } from "react";
import { fireGunshot } from "@/lib/gunshot";
import type { Clock } from "@/lib/types";

/** « 1:23.45 » — minutes omises tant qu'elles valent zéro, comme un chrono de piste. */
function formatMs(total: number): string {
  const ms = Math.max(0, total);
  const centiseconds = Math.floor((ms % 1000) / 10);
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000) % 60;
  const hours = Math.floor(ms / 3_600_000);

  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
  if (minutes > 0) return `${minutes}:${pad(seconds)}.${pad(centiseconds)}`;

  return `${seconds}.${pad(centiseconds)}`;
}

/**
 * Le chronomètre de l'événement, compté par l'écran.
 *
 * Le serveur envoie une origine, pas un temps qui défile : l'animation est
 * locale, à la fréquence de l'écran, et le réseau ne porte qu'un message par
 * geste de l'organisateur. Deux écrans branchés sur la même compétition
 * affichent donc la même seconde sans se parler.
 *
 * L'écart entre l'horloge du serveur et celle de la machine est mesuré à
 * chaque message et retranché : un ordinateur de tribune est rarement à
 * l'heure, et une minute de dérive ruinerait l'affichage.
 */
export function DisplayClock({ clock }: { clock: Clock }) {
  const [text, setText] = useState(() => formatMs(clock.elapsed_ms));
  const frame = useRef<number | null>(null);

  useEffect(() => {
    // Décalage d'horloge, mesuré à la réception : négatif si la machine avance.
    const skew = Date.now() - new Date(clock.server_time).getTime();
    const receivedAt = performance.now();

    if (!clock.running) {
      setText(formatMs(clock.elapsed_ms));

      return;
    }

    const tick = () => {
      const sinceReception = performance.now() - receivedAt;
      setText(formatMs(clock.elapsed_ms + sinceReception));
      frame.current = requestAnimationFrame(tick);
    };

    // `skew` n'entre pas dans le calcul du temps écoulé — il ne sert qu'au
    // compte à rebours, dont l'échéance est une date absolue.
    void skew;

    tick();

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [clock]);

  return (
    <div
      className="flex items-baseline justify-center gap-6 py-2"
      data-running={clock.running}
    >
      <span
        className="text-[clamp(3rem,9vw,7.5rem)] leading-none font-bold tabular-nums"
        style={{
          fontFamily: "var(--brand-font-numeric, var(--font-mono))",
          color: clock.running ? "var(--brand-accent)" : "var(--brand-text)",
          textShadow: clock.running
            ? "0 0 30px color-mix(in srgb, var(--brand-accent) 45%, transparent)"
            : "none",
        }}
      >
        {text}
      </span>
    </div>
  );
}

/**
 * Le compte à rebours du départ, en plein écran.
 *
 * La séquence est rejouée par l'écran à partir de l'instant où elle a été
 * lancée, et non pilotée pas à pas depuis le serveur : plusieurs écrans
 * affichent ainsi « Prêt » à la même milliseconde, même si l'un d'eux a reçu le
 * message avec du retard.
 *
 * Le coup de feu part d'ici, au passage du « Go », sans rien demander à
 * personne. Encore faut-il que le navigateur l'autorise : c'est le rôle de
 * DisplayControls, qui réclame le geste unique dont il a besoin — et le signale
 * tant qu'il ne l'a pas obtenu.
 */
export function DisplayCountdown({ clock }: { clock: Clock }) {
  const [phase, setPhase] = useState<"marks" | "set" | "go" | null>(null);
  const frame = useRef<number | null>(null);
  const fired = useRef(false);

  const countdown = clock.countdown;

  useEffect(() => {
    if (!countdown) {
      setPhase(null);

      return;
    }

    // Le rendu reprend la séquence là où elle en est : un écran allumé en
    // cours de compte à rebours ne repart pas du début.
    const anchor = performance.now() - countdown.elapsed_ms;
    const { go_ms: goMs } = countdown;
    const FLASH_MS = 2000;

    // Un écran qui rejoint la séquence après le départ ne doit pas tirer un
    // coup de feu en retard.
    fired.current = countdown.elapsed_ms >= goMs;

    const tick = () => {
      const elapsed = performance.now() - anchor;

      if (elapsed < goMs / 2) setPhase("marks");
      else if (elapsed < goMs) setPhase("set");
      else if (elapsed < goMs + FLASH_MS) {
        setPhase("go");

        if (!fired.current) {
          fired.current = true;
          fireGunshot();
        }
      }
      else {
        setPhase(null);

        return;
      }

      frame.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [countdown]);

  if (phase === null) return null;

  const labels = { marks: "À vos marques", set: "Prêt", go: "Go" } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          phase === "go" ? "var(--brand-accent)" : "var(--brand-background)",
      }}
    >
      <span
        className="px-8 text-center text-[clamp(4rem,16vw,18rem)] leading-none font-extrabold tracking-widest uppercase"
        style={{
          color: phase === "go" ? "#0a0a0a" : "var(--brand-text)",
          fontFamily: "var(--brand-font-heading)",
        }}
      >
        {labels[phase]}
      </span>
    </div>
  );
}
