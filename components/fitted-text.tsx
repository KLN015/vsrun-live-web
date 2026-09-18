"use client";

import { useLayoutEffect, useRef } from "react";

/** Part de cette taille, puis se réduit à ce que l'écran permet. */
const PROBE_SIZE = 100;

/** Marge laissée autour du texte : sans elle, les jambages touchent le bord. */
const FILL = 0.92;

/**
 * Un texte porté à la plus grande taille qui tienne dans le bloc qui le porte.
 *
 * Deux formes se succèdent ici — un chiffre, puis « GO » — et leurs largeurs
 * n'ont rien à voir. Une taille unique ne peut pas les servir : réglée pour
 * « GO », le chiffre reste petit ; réglée pour le chiffre, « GO » déborde.
 *
 * D'où la mesure plutôt qu'un calcul : on rend le texte à une taille connue, on
 * regarde la place qu'il prend, et on en déduit le facteur en une fois — les
 * dimensions d'un texte varient linéairement avec sa taille. Aucune hypothèse
 * sur la largeur des lettres, ce qui compte depuis qu'un organisateur peut
 * déposer sa propre police : ses métriques nous sont inconnues.
 *
 * La référence est le parent, jamais la fenêtre : en découpage libre, le
 * compte à rebours tient dans le rectangle de la zone, qui n'a ni la taille ni
 * les proportions de l'écran. Le parent est aussi mis à l'échelle par la
 * toile, mais les deux mesures se font dans le même repère — le rapport, lui,
 * ne dépend pas de l'échelle.
 *
 * La mesure est refaite quand la police arrive, quand le bloc change de taille,
 * et à chaque valeur affichée. `useLayoutEffect` la place avant l'affichage :
 * on ne voit jamais le texte à la taille d'essai.
 */
export function FittedText({
  children,
  className,
  style,
}: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const span = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = span.current;

    if (!element) return;

    const host = element.parentElement;

    if (!host) return;

    const fit = () => {
      const box = host.getBoundingClientRect();

      if (box.width === 0 || box.height === 0) return;

      element.style.fontSize = `${PROBE_SIZE}px`;

      const { width, height } = element.getBoundingClientRect();

      if (width === 0 || height === 0) return;

      const factor = Math.min(
        (box.width * FILL) / width,
        (box.height * FILL) / height,
      );

      element.style.fontSize = `${PROBE_SIZE * factor}px`;
    };

    fit();

    // Une police déposée arrive après le premier rendu : sans cette seconde
    // mesure, la taille resterait celle calculée sur la police de repli.
    void document.fonts?.ready.then(fit);

    // Observer le bloc plutôt que la fenêtre couvre les deux cas d'un seul
    // geste : la fenêtre redimensionnée change l'échelle de la toile, donc la
    // taille du bloc.
    const observer = new ResizeObserver(fit);
    observer.observe(host);

    return () => observer.disconnect();
  }, [children]);

  return (
    // Une seule ligne, quoi qu'il arrive. La mesure se fait à une taille
    // d'essai fixe ; un texte plus large que son bloc à cette taille passait
    // à la ligne, la mesure figeait cette forme, et « Camille A. » se lisait
    // sur deux lignes dans une demi-zone. Sans retour possible, la mesure est
    // celle d'une ligne, et le facteur la fait tenir.
    <span
      ref={span}
      className={className}
      style={{ whiteSpace: "nowrap", ...style }}
    >
      {children}
    </span>
  );
}
