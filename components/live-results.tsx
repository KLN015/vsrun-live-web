"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { echo } from "@/lib/echo";
import { athleteDetails, athleteName } from "@/lib/athlete";
import {
  athletesWithAMark,
  hasAMark,
  isFieldEvent,
  outcomeCode,
} from "@/lib/result";
import type { PublicDiscipline, PublicResult } from "@/lib/types";

/**
 * Tableau des résultats, mis à jour en direct.
 *
 * Le rendu initial vient du serveur : la page est complète et lisible avant
 * qu'aucun JavaScript ne s'exécute. Le WebSocket ne fait que la maintenir à
 * jour — s'il ne se connecte pas, on perd la fraîcheur, pas le contenu.
 */
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** « 15:30 · CAF · Série(s) » : ce qui désigne une épreuve après son nom. */
function qualifiers(discipline: PublicDiscipline): string {
  return [
    discipline.scheduled_at
      ? timeFormatter.format(new Date(discipline.scheduled_at))
      : null,
    discipline.category_code,
    discipline.round_label,
    // Une course a un vent et un seul : il s'annonce ici, pas sur chaque ligne.
    !isFieldEvent(discipline.type) && discipline.wind !== null
      ? `vent ${discipline.wind > 0 ? "+" : ""}${discipline.wind} m/s`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function LiveResults({
  eventId,
  disciplines,
  initialResults,
  disciplineFilter,
}: {
  eventId: string;
  disciplines: PublicDiscipline[];
  initialResults: PublicResult[];
  disciplineFilter?: string;
}) {
  const [results, setResults] = useState(initialResults);
  const [connected, setConnected] = useState(false);
  const router = useRouter();

  // Le serveur reste la source de vérité : si la page est re-rendue (filtre,
  // navigation), on repart de ses données plutôt que d'un état local dérivé.
  useEffect(() => setResults(initialResults), [initialResults]);

  useEffect(() => {
    const client = echo();

    if (!client) return;

    const channel = client.channel(`event.${eventId}`);

    const known = new Set(disciplines.map((discipline) => discipline.id));

    const upsert = (incoming: PublicResult) => {
      // Une application VSRUN peut créer une épreuve en pleine compétition.
      // Son résultat arriverait alors pour une épreuve absente du rendu
      // serveur, et serait silencieusement ignoré : on redemande la page au
      // serveur plutôt que de perdre un temps réel.
      if (!known.has(incoming.discipline_id)) {
        router.refresh();

        return;
      }

      setResults((current) => [
        ...current.filter((result) => result.id !== incoming.id),
        incoming,
      ]);
    };

    channel.listen(".result.published", (payload: { result: PublicResult }) =>
      upsert(payload.result),
    );
    channel.listen(".result.updated", (payload: { result: PublicResult }) =>
      upsert(payload.result),
    );
    channel.listen(".result.unpublished", (payload: { result_id: string }) =>
      setResults((current) =>
        current.filter((result) => result.id !== payload.result_id),
      ),
    );

    const connection = (
      client.connector as unknown as {
        pusher?: { connection?: { bind: (e: string, cb: () => void) => void } };
      }
    ).pusher?.connection;

    connection?.bind("connected", () => setConnected(true));
    connection?.bind("disconnected", () => setConnected(false));
    connection?.bind("unavailable", () => setConnected(false));

    return () => {
      client.leaveChannel(`event.${eventId}`);
    };
  }, [eventId, disciplines, router]);

  const groups = useMemo(() => {
    const visible = disciplineFilter
      ? results.filter((result) => result.discipline_id === disciplineFilter)
      : results;

    return disciplines
      .map((discipline) => ({
        discipline,
        rows: visible
          .filter((result) => result.discipline_id === discipline.id)
          // Le classement d'abord, puis l'ordre de passage : c'est ainsi qu'un
          // résultat arrivant en direct se place à la bonne ligne, et non en
          // bas du tableau.
          .sort(compareResults),
      }))
      .filter((group) => group.rows.length > 0);
  }, [results, disciplines, disciplineFilter]);

  /**
   * Les tours d'une même épreuve, réunis sous un titre commun.
   *
   * Les séries et la finale d'un « 100 m CAF » se lisent ensemble : c'est une
   * épreuve, pas trois. Le programme, lui, garde ses tours séparés à leur heure
   * de départ — ce sont deux lectures différentes du même objet.
   */
  const events = useMemo(() => {
    const byGroup = new Map<string, typeof groups>();

    for (const group of groups) {
      const key = group.discipline.group_key;
      byGroup.set(key, [...(byGroup.get(key) ?? []), group]);
    }

    return [...byGroup.entries()].map(([key, rounds]) => ({
      key,
      label: rounds[0].discipline.group_label,
      rounds,
    }));
  }, [groups]);

  if (groups.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        Aucun résultat publié pour le moment. Les temps apparaissent ici dès que
        l&apos;organisateur les valide.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {connected ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-red-500" />
          </span>
          Mise à jour en direct
        </p>
      ) : null}

      {events.map((event) => (
        <section key={event.key} className="space-y-4">
          {/* Le titre de l'épreuve n'apparaît que s'il réunit plusieurs tours :
              sur une épreuve unique il ferait doublon avec le sien. */}
          {event.rounds.length > 1 ? (
            <h2 className="text-base font-semibold">{event.label}</h2>
          ) : null}

          {event.rounds.map(({ discipline, rows }) => {
        // Un concours se prend en essais, une course dans un couloir : les
        // deux colonnes ne coexistent jamais.
        const showAttempt = isFieldEvent(discipline.type);
        const showLane =
          !showAttempt && rows.some((row) => row.lane !== null);

        // Qui a réussi au moins un essai : c'est ce qui sépare un X d'un NM.
        const marked = athletesWithAMark(rows);

        return (
          <section key={discipline.id}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="font-medium">
                {discipline.round_label ?? discipline.name}
              </h3>
              {/* Sans ces précisions, six « 100 m » se ressemblent tous. */}
              {qualifiers(discipline) ? (
                <span className="text-muted-foreground text-sm">
                  {qualifiers(discipline)}
                </span>
              ) : null}
              <Badge
                variant={
                  discipline.status === "live" ? "destructive" : "secondary"
                }
              >
                {discipline.status_label}
              </Badge>
            </div>

            <Card className="py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rang</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead className="w-32">Performance</TableHead>
                      {showAttempt ? (
                        <TableHead className="w-24">Essai</TableHead>
                      ) : null}
                      {showLane ? (
                        <TableHead className="w-24">Couloir</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="tabular-nums">
                          {result.rank ?? "—"}
                        </TableCell>
                        <TableCell>
                          {/* Prénom et nom sur la première ligne, dossard,
                              catégorie, sexe, club et pays sur la seconde. */}
                          <span className="font-medium">
                            {athleteName(result.participant)}
                          </span>
                          {athleteDetails(result.participant) ? (
                            <p className="text-muted-foreground text-xs">
                              {athleteDetails(result.participant)}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono font-medium tabular-nums">
                          {result.outcome === "valid" ? (
                            result.display_value
                          ) : (
                            <span title={result.outcome_label}>
                              {outcomeCode(
                                result,
                                discipline.type,
                                hasAMark(result, marked),
                              )}
                            </span>
                          )}
                          {/* Le vent d'une course est annoncé une fois pour
                              l'épreuve ; celui d'un concours appartient à
                              l'essai et se lit sur sa ligne. */}
                          {isFieldEvent(discipline.type) && result.wind !== null ? (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {result.wind > 0 ? "+" : ""}
                              {result.wind} m/s
                            </span>
                          ) : null}
                        </TableCell>
                        {showAttempt ? (
                          <TableCell className="text-muted-foreground tabular-nums">
                            {result.attempt ?? "—"}
                          </TableCell>
                        ) : null}
                        {showLane ? (
                          <TableCell className="text-muted-foreground tabular-nums">
                            {result.lane ?? "—"}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        );
          })}
        </section>
      ))}

      {/* La légende n'apparaît que si elle sert : sur une épreuve où tout le
          monde a une mesure, elle n'apprendrait rien. */}
      {groups.some(({ rows }) => rows.some((row) => row.outcome !== "valid")) ? (
        <p className="text-muted-foreground text-xs">
          X : essai nul · NM : aucune mesure sur l&apos;épreuve · DNF : abandon ·
          DNS : engagé absent · DQ : disqualifié · U : non défini
        </p>
      ) : null}
    </div>
  );
}

function compareResults(a: PublicResult, b: PublicResult): number {
  if (a.rank !== null && b.rank !== null && a.rank !== b.rank) {
    return a.rank - b.rank;
  }

  // Un résultat sans classement passe après ceux qui en ont un : le jury ne
  // l'a pas encore tranché.
  if (a.rank !== null && b.rank === null) return -1;
  if (a.rank === null && b.rank !== null) return 1;

  // À classement égal — y compris deux fois le même rang, ce qui arrive quand
  // la source se contredit — l'ordre doit rester stable : un résultat arrivant
  // en direct ne doit pas faire sauter les lignes déjà affichées.
  return (
    (a.occurred_at ?? "").localeCompare(b.occurred_at ?? "") ||
    a.id.localeCompare(b.id)
  );
}
