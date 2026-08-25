import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/layout";
import { Input } from "@/components/ui/input";
import {
  deleteEventImage,
  showDisplayImage,
  showEventEmote,
  uploadEventImage,
} from "@/lib/actions";
import type { EventImage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Les visuels prédéfinis d'un événement, et leur mise à l'écran.
 *
 * Deux gestes qui n'ont pas le même rythme :
 *
 *   - **déposer** un visuel se fait la veille, au calme, dans une fenêtre ;
 *   - **l'afficher** se fait entre deux séries, d'un clic, sans rien rouvrir.
 *
 * D'où deux composants et deux placements : la bibliothèque en haut de page,
 * une fois pour l'événement ; le sélecteur dans chaque écran, puisque c'est
 * l'écran qui montre — deux écrans du même événement peuvent montrer deux
 * choses différentes.
 */
export function EventImageLibrary({
  eventId,
  images,
  back,
}: {
  eventId: string;
  images: EventImage[];
  back: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Visuels</p>
          <p className="text-muted-foreground text-xs">
            Déposés à l&apos;avance, affichés d&apos;un clic depuis
            n&apos;importe lequel de vos écrans.
          </p>
        </div>

        <FormDialog
          trigger="Déposer un visuel"
          variant="outline"
          title="Nouveau visuel"
          description="Une image PNG, JPEG ou WebP, réduite à 1920 px si elle dépasse. Un GIF, un WebP ou un PNG animé garde son animation et sa taille d'origine — de quoi servir d'emote. 16 Mo au plus."
          submitLabel="Déposer"
          action={uploadEventImage}
        >
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="back" value={back} />

          <Field
            label="Nom"
            htmlFor="image-name"
            hint="Pour le reconnaître dans la liste ; il n'apparaît pas à l'écran."
          >
            <Input
              id="image-name"
              name="name"
              required
              maxLength={120}
              placeholder="Qualification"
            />
          </Field>

          <Field label="Image" htmlFor="image-file">
            <Input
              id="image-file"
              type="file"
              name="file"
              required
              accept="image/png,image/jpeg,image/webp,image/gif"
            />
          </Field>
        </FormDialog>
      </div>

      {images.length === 0 ? null : (
        <ul className="flex flex-wrap gap-3">
          {images.map((image) => (
            <li key={image.id} className="w-40 space-y-1">
              <div className="bg-muted overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt=""
                  className="aspect-video w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs" title={image.name}>
                  {image.name}
                </span>

                <form action={deleteEventImage}>
                  <input type="hidden" name="image_id" value={image.id} />
                  <input type="hidden" name="back" value={back} />
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive text-xs underline"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Ce que montre cet écran, à cet instant.
 *
 * La première vignette est la composition — les épreuves et leurs résultats.
 * Les suivantes sont les visuels. Un clic bascule de l'une à l'autre : mettre
 * un carton et le retirer sont le même geste, et rien n'est à reconfigurer
 * ensuite.
 */
export function DisplayImagePicker({
  displayId,
  images,
  active,
  back,
}: {
  displayId: string;
  images: EventImage[];
  /** Le visuel affiché, ou null si l'écran montre sa composition. */
  active: EventImage | null;
  back: string;
}) {
  if (images.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Aucun visuel déposé pour cet événement.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      <Tile
        action={showDisplayImage}
        fields={{ display_id: displayId, image_id: "", back }}
        label="Composition"
        selected={active === null}
      />

      {images.map((image) => (
        <Tile
          key={image.id}
          action={showDisplayImage}
          fields={{ display_id: displayId, image_id: image.id, back }}
          label={image.name}
          url={image.url}
          selected={active?.id === image.id}
        />
      ))}
    </ul>
  );
}

/**
 * L'emote de l'événement : un visuel sur tous les écrans à la fois.
 *
 * Le même geste que le sélecteur d'un écran, mais collectif — ce qui mérite
 * d'interrompre les quatre murs d'un stade ensemble : un record, une chute, une
 * remise de prix. Sur chaque écran, l'emote occupe toute la zone, comme un
 * carton.
 *
 * Elle **passe devant** sans rien effacer : les écrans qui montraient déjà
 * quelque chose le retrouvent dès qu'on la retire. C'est ce qui permet de la
 * lancer sans réfléchir à ce qui était affiché sur les huit écrans, au moment
 * précis où personne n'a le temps d'y réfléchir.
 */
/**
 * Durées proposées pour une emote.
 *
 * Une liste fermée : ce réglage se prend d'un coup d'œil entre deux courses,
 * pas au dixième près. Trois secondes suffisent à un logo de partenaire, dix à
 * une photo qu'on veut laisser regarder ; au-delà d'une minute, ce n'est plus
 * une emote mais un écran de remplacement, qui a déjà son propre réglage.
 *
 * « Jusqu'au retrait » reste dans la liste et non ailleurs : c'est une durée
 * parmi les autres du point de vue de celui qui choisit.
 */
const DURATIONS = [
  { value: "3000", label: "3 secondes" },
  { value: "5000", label: "5 secondes" },
  { value: "10000", label: "10 secondes" },
  { value: "15000", label: "15 secondes" },
  { value: "30000", label: "30 secondes" },
  { value: "60000", label: "1 minute" },
  { value: "", label: "Jusqu'au retrait" },
];

/**
 * L'emote de l'événement : un visuel sur tous les écrans à la fois.
 *
 * Le même geste que le sélecteur d'un écran, mais collectif — ce qui mérite
 * d'interrompre les quatre murs d'un stade ensemble : un record, une chute, une
 * remise de prix. Sur chaque écran, l'emote occupe toute la zone, comme un
 * carton.
 *
 * Elle **passe devant** sans rien effacer : les écrans qui montraient déjà
 * quelque chose le retrouvent dès qu'elle cesse. C'est ce qui permet de la
 * lancer sans réfléchir à ce qui était affiché sur les huit écrans, au moment
 * précis où personne n'a le temps d'y réfléchir.
 *
 * Un seul formulaire pour toute la grille, et non un par vignette : la durée
 * est un réglage commun, et un `<button>` porte son propre `name`/`value`. Un
 * clic envoie donc la vignette choisie **et** la durée en cours, sans état à
 * tenir.
 */
export function EventEmote({
  eventId,
  images,
  active,
  duration,
  back,
}: {
  eventId: string;
  images: EventImage[];
  /** L'emote en cours, ou null si les écrans montrent ce qu'ils montraient. */
  active: EventImage | null;
  /**
   * La durée de l'emote en cours, en millisecondes.
   *
   * Nulle avec une emote en cours : elle tient jusqu'au retrait. Nulle sans
   * emote : rien n'est lancé, la liste retombe sur son défaut.
   */
  duration: number | null;
  back: string;
}) {
  // Une emote qui a une durée s'en va toute seule : proposer de la retirer
  // n'aurait servi qu'à la reprendre en main pour rien. Le bouton n'apparaît
  // donc que là où il agit — « jusqu'au retrait », où il est la seule sortie.
  const removable = active !== null && duration === null;
  return (
    <form action={showEventEmote} className="space-y-3">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="back" value={back} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Emote</p>
          <p className="text-muted-foreground text-xs">
            Un visuel sur tous les écrans à la fois, en pleine zone. Il passe
            devant ce qu&apos;ils montrent ; sa durée écoulée, chacun retrouve sa
            composition ou son propre carton. Chaque écran la décompte à partir
            du moment où il l&apos;affiche.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="w-44">
            <Field label="Durée">
              {/* La durée en cours reste sélectionnée : relancer une emote se
                  fait d'un clic, sans avoir à re-choisir ce qu'on vient de
                  choisir. Sans emote lancée, cinq secondes. */}
              <FormSelect
                name="duration_ms"
                defaultValue={active ? String(duration ?? "") : "5000"}
                options={DURATIONS}
              />
            </Field>
          </div>

          {removable ? (
            <Button
              type="submit"
              name="image_id"
              value=""
              size="sm"
              variant="secondary"
            >
              Retirer
            </Button>
          ) : null}
        </div>
      </div>

      {images.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Aucun visuel déposé pour cet événement.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {images.map((image) => (
            <li key={image.id}>
              <button
                type="submit"
                name="image_id"
                value={image.id}
                className={tileClass(active?.id === image.id)}
              >
                <TilePreview url={image.url} label={image.name} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/**
 * Une vignette cliquable : ce qu'on met à l'écran, d'un seul geste.
 *
 * Elle ne sait pas si elle commande un écran ou tous : l'action et les champs
 * cachés lui sont donnés. Le contour marque ce qui est affiché en ce moment —
 * la seule information dont on a besoin en pleine compétition.
 */
function Tile({
  action,
  fields,
  label,
  url,
  selected,
}: {
  action: (form: FormData) => Promise<void>;
  /** Les champs du formulaire ; un `image_id` vide retire ce qui est affiché. */
  fields: Record<string, string>;
  label: string;
  url?: string;
  selected: boolean;
}) {
  return (
    <li>
      <form action={action}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <button type="submit" className={tileClass(selected)}>
          <TilePreview url={url} label={label} />
        </button>
      </form>
    </li>
  );
}

/**
 * Le contour marque ce qui est à l'écran en ce moment : la seule information
 * dont on a besoin en pleine compétition.
 */
function tileClass(selected: boolean): string {
  return cn(
    "w-28 overflow-hidden rounded-md border-2 text-left transition",
    selected
      ? "border-primary"
      : "border-transparent hover:border-muted-foreground/40",
  );
}

/** L'aperçu d'une vignette : le visuel, ou la mention de la composition. */
function TilePreview({ url, label }: { url?: string; label: string }) {
  return (
    <>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="bg-muted aspect-video w-full object-contain"
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex aspect-video w-full items-center justify-center text-[10px]">
          Résultats
        </span>
      )}

      <span className="block truncate px-1.5 py-1 text-[11px]" title={label}>
        {label}
      </span>
    </>
  );
}
