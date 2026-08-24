import { FormDialog } from "@/components/form-dialog";
import { Field } from "@/components/layout";
import { Input } from "@/components/ui/input";
import {
  deleteEventImage,
  showDisplayImage,
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
          description="Une image PNG, JPEG ou WebP. Elle sera réduite à 1920 px si elle dépasse."
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
              accept="image/png,image/jpeg,image/webp"
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
        displayId={displayId}
        imageId=""
        label="Composition"
        selected={active === null}
        back={back}
      />

      {images.map((image) => (
        <Tile
          key={image.id}
          displayId={displayId}
          imageId={image.id}
          label={image.name}
          url={image.url}
          selected={active?.id === image.id}
          back={back}
        />
      ))}
    </ul>
  );
}

function Tile({
  displayId,
  imageId,
  label,
  url,
  selected,
  back,
}: {
  displayId: string;
  /** Vide : rend l'écran à sa composition. */
  imageId: string;
  label: string;
  url?: string;
  selected: boolean;
  back: string;
}) {
  return (
    <li>
      <form action={showDisplayImage}>
        <input type="hidden" name="display_id" value={displayId} />
        <input type="hidden" name="image_id" value={imageId} />
        <input type="hidden" name="back" value={back} />

        <button
          type="submit"
          // Le contour marque ce qui est à l'écran en ce moment : la seule
          // information dont on a besoin en pleine compétition.
          className={cn(
            "w-28 overflow-hidden rounded-md border-2 text-left transition",
            selected
              ? "border-primary"
              : "border-transparent hover:border-muted-foreground/40",
          )}
        >
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
        </button>
      </form>
    </li>
  );
}
