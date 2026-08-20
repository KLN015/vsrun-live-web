"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * QR code rendu en SVG inline.
 *
 * SVG plutôt que `<canvas>` ou image distante : net à toutes les tailles, y
 * compris projeté ou photographié de biais en bord de piste, et rien à charger
 * depuis un serveur tiers — le contenu encodé ne quitte jamais la page.
 */
export function QrCode({
  value,
  size = 220,
  label,
}: {
  value: string;
  size?: number;
  label: string;
}) {
  const path = useMemo(() => {
    // Niveau de correction M : ~15 % du code reste lisible s'il est sali ou
    // partiellement masqué, sans gonfler la densité au point de gêner la
    // lecture par une caméra de téléphone.
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();

    const count = qr.getModuleCount();
    const segments: string[] = [];

    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (qr.isDark(row, column)) {
          segments.push(`M${column} ${row}h1v1h-1z`);
        }
      }
    }

    return { d: segments.join(""), count };
  }, [value]);

  return (
    <svg
      viewBox={`-2 -2 ${path.count + 4} ${path.count + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={label}
      // Fond blanc explicite : un QR code sombre sur fond sombre n'est plus un
      // QR code. Il ne suit donc pas le thème de la page.
      className="rounded-md bg-white p-1"
      shapeRendering="crispEdges"
    >
      <rect x={-2} y={-2} width={path.count + 4} height={path.count + 4} fill="#fff" />
      <path d={path.d} fill="#000" />
    </svg>
  );
}
