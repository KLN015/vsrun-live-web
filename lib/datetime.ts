/**
 * Heures de terrain.
 *
 * Un champ `datetime-local` ne transporte aucun fuseau : « 2026-07-04T15:30 »
 * ne dit pas 15:30 où. Laravel le lirait dans le fuseau du serveur — UTC en
 * conteneur — et l'horaire se décalerait de deux heures. Ces deux fonctions
 * fixent la convention aux deux bouts : ce qu'on saisit et ce qu'on relit est
 * l'heure du stade.
 */
export const TIME_ZONE = "Europe/Paris";

/** Décalage de Paris à cet instant : « +02:00 » l'été, « +01:00 » l'hiver. */
function offsetAt(date: Date): string {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")
      ?.value.replace("GMT", "") || "+00:00"
  );
}

/** Saisie d'un `datetime-local` → instant ISO ancré à l'heure française. */
export function fromLocalInput(local: string | undefined): string | null {
  if (!local) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return local;

  const [, year, month, day, hour, minute] = match;
  const wallClock = `${year}-${month}-${day}T${hour}:${minute}`;

  return `${wallClock}:00${offsetAt(new Date(`${wallClock}:00Z`))}`;
}

/**
 * Instant ISO → valeur d'un `datetime-local`, en heure française.
 *
 * Le champ attend « YYYY-MM-DDTHH:mm » ; on le reconstruit pièce par pièce
 * plutôt que par un `toISOString()`, qui rendrait l'heure UTC et afficherait
 * 13:30 dans un champ où l'organisateur avait saisi 15:30.
 */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";

  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((all, part) => {
      all[part.type] = part.value;
      return all;
    }, {});

  if (!parts.year) return "";

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
