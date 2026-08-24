"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * La toile d'un écran à découpage libre.
 *
 * Une surface de dimensions connues — 1920 × 1080 — mise à l'échelle de la
 * surface réelle d'un seul tenant : logo, chronomètre et listes de résultats
 * grandissent ensemble.
 *
 * À l'échelle et non étirée : le facteur est le même en largeur et en hauteur.
 * Un écran composé en 16/9 projeté sur du 4/3 garde ses proportions plutôt que
 * de déformer les chiffres — ce qu'un chronomètre pardonne mal.
 *
 * Ancrée au coin supérieur gauche, jamais centrée : le haut de l'écran est le
 * haut de l'écran.
 *
 * Les deux dimensions sont **déclarées** et non mesurées. Elles l'ont été, du
 * temps où l'habillage s'ajoutait au-dessus de la toile et en changeait la
 * hauteur ; la zone porte maintenant son logo elle-même, la toile ne bouge
 * plus, et le facteur d'échelle se calcule sans rien observer du contenu.
 */
export function FreeCanvas({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const outer = host.current;

    if (!outer) return;

    const fit = () => {
      const box = outer.getBoundingClientRect();

      if (box.width === 0 || box.height === 0) return;

      setScale(Math.min(box.width / width, box.height / height));
    };

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(outer);

    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={host} className="h-full w-full overflow-hidden">
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          // Sans mesure encore prise, la toile resterait à sa taille réelle et
          // déborderait le temps d'une image.
          visibility: scale === 0 ? "hidden" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
