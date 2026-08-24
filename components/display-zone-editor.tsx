"use client";

import { useState } from "react";
import { FormSelect } from "@/components/form-select";
import { Field } from "@/components/layout";
import { Input } from "@/components/ui/input";
import {
  DISPLAY_CONTENT_LABELS,
  type Discipline,
  type DisplayContentType,
  type DisplayZone,
} from "@/lib/types";

/**
 * Réglage d'une zone.
 *
 * Les champs proposés dépendent du type choisi : montrer « nombre de
 * résultats » sous une zone « Épreuve » n'aurait aucun sens, et laisserait
 * croire que le réglage a un effet.
 */
export function DisplayZoneEditor({
  position,
  zone,
  disciplines,
  videos = [],
  canvas,
}: {
  position: number;
  zone?: DisplayZone;
  disciplines: Discipline[];
  videos?: { id: string; title: string }[];
  /** Renseignée en découpage libre : la zone porte alors sa propre place. */
  canvas?: { width: number; height: number };
}) {
  const [contentType, setContentType] = useState<DisplayContentType>(
    zone?.content_type ?? "empty",
  );

  const disciplineOptions = disciplines.map((discipline) => ({
    value: discipline.id,
    label: discipline.name,
  }));

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-muted-foreground text-xs font-medium">
        Zone {position}
      </p>

      {canvas ? (
        <ZonePlacement position={position} zone={zone} canvas={canvas} />
      ) : null}

      <Field label="Contenu">
        {/* Champ natif : sa valeur pilote l'affichage des réglages ci-dessous,
            et un changement doit être immédiat. */}
        <select
          name={`zone_${position}_content_type`}
          defaultValue={contentType}
          onChange={(event) =>
            setContentType(event.target.value as DisplayContentType)
          }
          className="border-input bg-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
        >
          {Object.entries(DISPLAY_CONTENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      {contentType === "discipline" ? (
        <Field label="Épreuve">
          <FormSelect
            name={`zone_${position}_discipline_id`}
            defaultValue={zone?.config.discipline_id ?? undefined}
            placeholder="Choisir une épreuve"
            options={disciplineOptions}
          />
        </Field>
      ) : null}

      {contentType === "video" ? (
        <Field label="Vidéo" hint="Diffusée en boucle et sans son.">
          <FormSelect
            name={`zone_${position}_video_id`}
            defaultValue={zone?.config.video_id ?? undefined}
            placeholder="Choisir une vidéo"
            options={videos.map((video) => ({
              value: video.id,
              label: video.title,
            }))}
          />
        </Field>
      ) : null}

      {contentType === "latest_results" ? (
        <>
          <Field label="Épreuve" hint="Vide : toutes les épreuves.">
            <FormSelect
              name={`zone_${position}_discipline_id`}
              defaultValue={zone?.config.discipline_id ?? undefined}
              placeholder="Toutes"
              options={disciplineOptions}
            />
          </Field>
          <Field label="Nombre de lignes">
            <Input
              type="number"
              name={`zone_${position}_limit`}
              min={1}
              max={20}
              defaultValue={zone?.config.limit ?? 8}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}

/**
 * Place et dimensionne une zone, en pixels sur la toile de l'écran.
 *
 * Quatre nombres plutôt qu'un glisser-déposer : on règle un écran de tribune
 * une fois, souvent depuis un portable posé sur une table de chronométrage, et
 * on veut pouvoir aligner deux zones au pixel près — ce qu'une souris ne donne
 * jamais du premier coup.
 *
 * Les valeurs par défaut couvrent la toile entière : une zone nouvellement
 * créée s'affiche, quitte à ce qu'on la réduise ensuite. L'inverse — une zone
 * de taille nulle — donnerait un écran vide sans explication.
 */
function ZonePlacement({
  position,
  zone,
  canvas,
}: {
  position: number;
  zone?: DisplayZone;
  canvas: { width: number; height: number };
}) {
  const geometry = zone?.geometry;

  const fields = [
    ["x", "X", geometry?.x ?? 0, canvas.width],
    ["y", "Y", geometry?.y ?? 0, canvas.height],
    ["width", "Largeur", geometry?.width ?? canvas.width, canvas.width],
    ["height", "Hauteur", geometry?.height ?? canvas.height, canvas.height],
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-2">
      {fields.map(([name, label, value, max]) => (
        <Field key={name} label={label} htmlFor={`zone_${position}_${name}`}>
          <Input
            id={`zone_${position}_${name}`}
            type="number"
            name={`zone_${position}_${name}`}
            min={name === "width" || name === "height" ? 1 : 0}
            max={max}
            step={1}
            defaultValue={value}
            className="h-8"
          />
        </Field>
      ))}
    </div>
  );
}
