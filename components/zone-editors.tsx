"use client";

import { useState } from "react";
import { DisplayZoneEditor } from "@/components/display-zone-editor";
import { Button } from "@/components/ui/button";
import type { Discipline, DisplayZone } from "@/lib/types";

/**
 * Les réglages de zones d'un écran, en nombre.
 *
 * Une grille a ses cases : autant d'éditeurs, ni plus ni moins. Une toile
 * libre a ce qu'on y pose : on ajoute une zone, on retire la dernière, jusqu'à
 * un plafond — et `zone_count` suit, pour que l'action serveur sache combien
 * de zones lire dans le formulaire.
 *
 * Le nombre vit ici, côté navigateur, et nulle part ailleurs tant qu'on n'a
 * pas envoyé : ajouter une zone ne touche pas à l'écran avant « Envoyer ».
 */
export function ZoneEditors({
  layout,
  initialCount,
  maxZones,
  zones,
  disciplines,
  videos,
  canvas,
}: {
  layout: string;
  initialCount: number;
  maxZones: number;
  zones: DisplayZone[];
  disciplines: Discipline[];
  videos: { id: string; title: string }[];
  canvas: { width: number; height: number };
}) {
  const free = layout === "free";
  const [count, setCount] = useState(initialCount);

  return (
    <>
      <input type="hidden" name="zone_count" value={count} />

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: count }, (_, index) => (
          <DisplayZoneEditor
            key={index + 1}
            position={index + 1}
            zone={zones.find((zone) => zone.position === index + 1)}
            disciplines={disciplines}
            videos={videos}
            canvas={free ? canvas : undefined}
          />
        ))}
      </div>

      {free ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={count >= maxZones}
            onClick={() => setCount((n) => Math.min(maxZones, n + 1))}
          >
            Ajouter une zone
          </Button>
          {count > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCount((n) => Math.max(1, n - 1))}
            >
              Retirer la dernière
            </Button>
          ) : null}
          <span className="text-muted-foreground text-xs">
            {count} / {maxZones} zones
          </span>
        </div>
      ) : null}
    </>
  );
}
