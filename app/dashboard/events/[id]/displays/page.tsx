import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { ClockControls } from "@/components/clock-controls";
import { FormDialog } from "@/components/form-dialog";
import { DisplayZoneEditor } from "@/components/display-zone-editor";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createDisplay,
  deleteDisplay,
  rotateDisplayToken,
  updateDisplayLayout,
  updateDisplayZones,
} from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import {
  DISPLAY_LAYOUT_LABELS,
  type Discipline,
  type Display,
  type DisplayLayout,
  type ManagedVideo,
  type Paginated,
} from "@/lib/types";

export default async function DisplaysPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const path = `/dashboard/events/${id}/displays`;

  const { displays, disciplines, videos } = await withSession(path, async () => {
    const [displays, disciplines, videos] = await Promise.all([
      apiJson<Paginated<Display>>(`/events/${id}/displays`),
      apiJson<Paginated<Discipline>>(`/events/${id}/disciplines`),
      apiJson<Paginated<ManagedVideo>>(`/events/${id}/videos`),
    ]);

    return {
      displays: displays.data,
      disciplines: disciplines.data,
      videos: videos.data,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <FormDialog
          trigger="Nouvel écran"
          title="Nouvel écran"
          description="Une fois créé, ouvrez son adresse sur l'ordinateur qui pilote l'affichage."
          submitLabel="Créer l'écran"
          action={createDisplay}
        >
          <input type="hidden" name="event_id" value={id} />

          <Field label="Nom" htmlFor="display-name">
            <Input
              id="display-name"
              name="name"
              required
              maxLength={120}
              placeholder="Écran tribune"
            />
          </Field>

          <Field label="Disposition">
            <FormSelect
              name="layout"
              defaultValue="1"
              options={Object.entries(DISPLAY_LAYOUT_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Field>
        </FormDialog>
      </div>

      {displays.length === 0 ? (
        <EmptyState>
          Aucun écran. Créez-en un, puis ouvrez son adresse sur l&apos;ordinateur
          relié au vidéoprojecteur.
        </EmptyState>
      ) : (
        displays.map((display) => (
          <DisplayPanel
            key={display.id}
            display={display}
            disciplines={disciplines}
            videos={videos}
            back={path}
          />
        ))
      )}
    </div>
  );
}

function DisplayPanel({
  display,
  disciplines,
  videos,
  back,
}: {
  display: Display;
  disciplines: Discipline[];
  videos: ManagedVideo[];
  back: string;
}) {
  const zones = display.zones ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{display.name}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {display.layout_label} · {display.zone_count} zone
              {display.zone_count > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={display.is_connected ? "default" : "secondary"}>
              {display.is_connected ? "Connecté" : "Hors ligne"}
            </Badge>

            {/* L'action existait déjà ; aucun formulaire ne l'appelait, un
                écran restait donc figé sur le nom et la disposition choisis à
                sa création. */}
            <FormDialog
              trigger="Modifier"
              variant="outline"
              title="Modifier l'écran"
              description="Changer la disposition réajuste le nombre de zones."
              submitLabel="Enregistrer"
              action={updateDisplayLayout}
            >
              <input type="hidden" name="display_id" value={display.id} />
              <input type="hidden" name="back" value={back} />

              <Field label="Nom" htmlFor={`display-name-${display.id}`}>
                <Input
                  id={`display-name-${display.id}`}
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={display.name}
                />
              </Field>

              <Field label="Disposition">
                <FormSelect
                  name="layout"
                  defaultValue={display.layout}
                  options={Object.entries(DISPLAY_LAYOUT_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  )}
                />
              </Field>
            </FormDialog>

            <form action={rotateDisplayToken}>
              <input type="hidden" name="display_id" value={display.id} />
              <input type="hidden" name="back" value={back} />
              <Button variant="outline" size="sm" type="submit">
                Régénérer l&apos;adresse
              </Button>
            </form>

            <form action={deleteDisplay}>
              <input type="hidden" name="display_id" value={display.id} />
              <input type="hidden" name="back" value={back} />
              <Button variant="destructive" size="sm" type="submit">
                Supprimer
              </Button>
            </form>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-medium">Adresse de l&apos;écran</p>
          <Link
            href={`/display/${display.public_token}`}
            target="_blank"
            className="text-muted-foreground hover:text-foreground font-mono text-xs break-all underline"
          >
            /display/{display.public_token}
          </Link>
          <p className="text-muted-foreground mt-1 text-xs">
            Cette adresse ne donne accès qu&apos;à cet écran, en lecture.
            Régénérez-la pour rendre l&apos;ancienne inopérante.
          </p>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Chronomètre</p>
          <p className="text-muted-foreground mb-2 text-xs">
            Propre à cet écran. Le compte à rebours annonce « À vos marques »,
            « Prêt », puis lance le chronomètre au « Go » — le son du départ
            demande un premier clic sur la page de l&apos;écran, que les
            navigateurs exigent avant tout audio.
          </p>
          <ClockControls
            displayId={display.id}
            eventId={display.event_id}
            clock={display.clock}
          />
        </div>

        <ActionForm
          action={updateDisplayZones}
          submitLabel="Envoyer vers l'écran"
        >
          <input type="hidden" name="display_id" value={display.id} />
          <input type="hidden" name="zone_count" value={display.zone_count} />
          <input type="hidden" name="back" value={back} />

          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: display.zone_count }, (_, index) => (
              <DisplayZoneEditor
                key={index + 1}
                position={index + 1}
                zone={zones.find((zone) => zone.position === index + 1)}
                disciplines={disciplines}
                videos={videos}
              />
            ))}
          </div>
        </ActionForm>

        <div>
          <p className="mb-2 text-sm font-medium">Aperçu</p>
          <DisplayPreview layout={display.layout} zoneCount={display.zone_count} zones={zones} />
          <p className="text-muted-foreground mt-2 text-xs">
            L&apos;aperçu montre la disposition. Ouvrez l&apos;adresse
            ci-dessus pour voir le rendu réel, alimenté en direct.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Aperçu de la disposition.
 *
 * Volontairement schématique : il montre le découpage et l'affectation des
 * zones, pas leur contenu. Le contenu réel se voit sur l'écran lui-même, à
 * l'adresse indiquée — un aperçu qui prétendrait le reproduire serait une
 * seconde vérité à maintenir.
 */
function DisplayPreview({
  layout,
  zoneCount,
  zones,
}: {
  layout: DisplayLayout;
  zoneCount: number;
  zones: { position: number; content_type_label: string }[];
}) {
  const grid: Record<DisplayLayout, string> = {
    "1": "grid-cols-1 grid-rows-1",
    "2h": "grid-cols-1 grid-rows-2",
    "2v": "grid-cols-2 grid-rows-1",
    "3": "grid-cols-2 grid-rows-2",
    "4": "grid-cols-2 grid-rows-2",
  };

  return (
    <div
      className={`grid aspect-video w-full max-w-md gap-1.5 rounded-md bg-neutral-950 p-1.5 ${grid[layout]}`}
    >
      {Array.from({ length: zoneCount }, (_, index) => {
        const position = index + 1;
        const zone = zones.find((z) => z.position === position);

        return (
          <div
            key={position}
            className={`flex items-center justify-center rounded bg-neutral-800 p-2 text-center text-[11px] text-neutral-300 ${
              layout === "3" && position === 1 ? "row-span-2" : ""
            }`}
          >
            {zone?.content_type_label ?? "Vide"}
          </div>
        );
      })}
    </div>
  );
}
