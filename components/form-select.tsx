"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Select de shadcn adapté aux formulaires à server action.
 *
 * Deux ajustements par rapport au composant brut :
 *
 *   1. le champ natif masqué que Radix rend dès qu'on lui donne un `name`
 *      permet à la valeur d'arriver dans le `FormData`, sans état à
 *      synchroniser côté serveur ;
 *   2. le libellé affiché est résolu ici, à partir des options. Laissé à
 *      `SelectValue`, Radix affiche la valeur brute tant que la liste n'a pas
 *      été ouverte — les items ne sont montés qu'à ce moment-là. On voyait donc
 *      « 1 » au lieu de « Plein écran », et un uuid au lieu d'un nom d'épreuve.
 */
export function FormSelect({
  name,
  defaultValue,
  placeholder,
  options,
  required,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  const selected = options.find((option) => option.value === value);

  return (
    <Select
      name={name}
      // `undefined` et non `""` : une chaîne vide est une valeur pour Radix,
      // alors qu'ici elle signifie « rien de choisi ».
      value={value === "" ? undefined : value}
      // Radix peut renvoyer null lorsqu'une sélection est effacée.
      onValueChange={(next) => setValue(next ?? "")}
      required={required}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selected?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
