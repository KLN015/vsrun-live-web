"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { athleteName } from "@/lib/athlete";
import type { Participant } from "@/lib/types";

/**
 * Choisir qui court, parmi les engagés.
 *
 * Deux cents engagés, trois catégories, deux sexes : cocher un à un des noms
 * n'est pas un geste de compétition. On filtre — catégorie, sexe, un bout de
 * nom — puis on coche tout ce qui reste d'un clic, et on affine si besoin.
 *
 * La sélection survit aux filtres : ce qui est coché reste coché quand on
 * change de catégorie pour en ajouter une autre. Ce sont donc des champs
 * cachés qui partent avec le formulaire, un par engagé retenu, et non les
 * cases elles-mêmes — celles-ci ne montrent que ce que le filtre laisse voir.
 */
export function DuelParticipantsPicker({
  participants,
}: {
  participants: Participant[];
}) {
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const categories = useMemo(
    () =>
      [...new Set(participants.map((p) => p.category).filter(Boolean))]
        .map(String)
        .sort(),
    [participants],
  );

  const genders = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of participants) {
      if (p.gender) seen.set(p.gender, p.gender_label ?? p.gender);
    }
    return [...seen.entries()];
  }, [participants]);

  const needle = search.trim().toLowerCase();

  const visible = participants.filter(
    (p) =>
      (!category || p.category === category) &&
      (!gender || p.gender === gender) &&
      (!needle ||
        athleteName(p).toLowerCase().includes(needle) ||
        (p.bib ?? "").toLowerCase().includes(needle) ||
        (p.club ?? "").toLowerCase().includes(needle)),
  );

  const visibleIds = visible.map((p) => p.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: string, on: boolean) =>
    setSelected((was) => {
      const next = new Set(was);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const selectVisible = (on: boolean) =>
    setSelected((was) => {
      const next = new Set(was);
      for (const id of visibleIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const select =
    "border-input bg-background h-9 rounded-md border px-2 text-sm shadow-xs outline-none";

  return (
    <div className="space-y-2">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="participant_ids" value={id} />
      ))}

      <div className="flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={select}
          aria-label="Catégorie"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className={select}
          aria-label="Sexe"
        >
          <option value="">Tous sexes</option>
          {genders.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, dossard, club…"
          className={`${select} min-w-0 flex-1`}
          aria-label="Rechercher"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={visibleIds.length === 0}
          onClick={() => selectVisible(!allVisibleSelected)}
        >
          {allVisibleSelected ? "Tout décocher" : "Tout cocher"} (
          {visible.length})
        </Button>
        <span className="text-muted-foreground text-xs">
          {selected.size} retenu{selected.size > 1 ? "s" : ""}
          {selected.size === 0 ? " — personne de coché : tous les engagés" : ""}
        </span>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
        {visible.length === 0 ? (
          <p className="text-muted-foreground p-2 text-xs">
            Aucun engagé ne correspond.
          </p>
        ) : (
          visible.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={(e) => toggle(p.id, e.target.checked)}
              />
              <span className="text-muted-foreground w-8 shrink-0 tabular-nums">
                {p.bib ?? ""}
              </span>
              <span className="truncate">{athleteName(p)}</span>
              <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                {[p.category, p.gender_label, p.club]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
