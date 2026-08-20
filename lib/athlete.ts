import type { Participant, PublicParticipant } from "@/lib/types";

type Athlete = Partial<Participant & PublicParticipant>;

/**
 * Drapeau d'un code pays.
 *
 * Les lettres régionales Unicode ne composent un drapeau qu'à partir d'un code
 * à deux lettres. Un code à trois — « FRA » — est rendu tel quel plutôt que
 * transformé en deux caractères sans signification.
 */
export function flag(country: string | null | undefined): string | null {
  if (!country) return null;
  if (country.length !== 2) return country;

  return String.fromCodePoint(
    ...[...country.toUpperCase()].map(
      (letter) => 0x1f1e6 + letter.charCodeAt(0) - 65,
    ),
  );
}

/**
 * La première ligne : prénom puis nom.
 *
 * `display_name` ne sert que de repli — il peut valoir « Couloir 2 » ou un
 * pseudo, quand l'athlète n'a pas encore été identifié.
 */
export function athleteName(athlete: Athlete | null | undefined): string {
  if (!athlete) return "—";

  const full = [athlete.first_name, athlete.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return full || athlete.display_name || "—";
}

/**
 * La seconde ligne : tout le reste, dans l'ordre où une feuille de résultats le
 * présente — dossard, catégorie, sexe, club, pays.
 */
export function athleteDetails(athlete: Athlete | null | undefined): string {
  if (!athlete) return "";

  return [
    athlete.bib ? `Dossard ${athlete.bib}` : null,
    athlete.category,
    athlete.gender_label,
    athlete.club,
    flag(athlete.country),
  ]
    .filter(Boolean)
    .join(" · ");
}
