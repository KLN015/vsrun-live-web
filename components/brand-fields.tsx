import { FormSelect } from "@/components/form-select";
import { Field } from "@/components/layout";
import { Input } from "@/components/ui/input";
import type { BrandFont } from "@/lib/brand";
import {
  BRAND_FONT_LABELS,
  type ManagedBrand,
  type ManagedFont,
} from "@/lib/types";

/**
 * La valeur d'un `<select>` de police.
 *
 * Une seule liste pour deux provenances : le catalogue embarqué et les polices
 * déposées par l'organisation. Le préfixe dit laquelle, et `lib/actions` le
 * traduit en deux champs distincts pour l'API — l'organisateur, lui, n'a qu'un
 * choix à faire.
 */
function fontChoice(font: BrandFont | undefined, fallback: string): string {
  if (!font) return `lib:${fallback}`;

  return font.source === "custom" ? `custom:${font.id}` : `lib:${font.key}`;
}

/**
 * Les champs d'une charte, partagés par la création et la modification.
 *
 * Un seul jeu de champs pour les deux fenêtres : deux formulaires séparés
 * finiraient par ne plus proposer les mêmes réglages, et l'organisateur
 * découvrirait qu'une couleur n'est modifiable qu'à la création.
 */
export function BrandFields({
  brand,
  fonts = [],
}: {
  brand?: ManagedBrand;
  /** Les polices déposées par l'organisation, proposées avec le catalogue. */
  fonts?: ManagedFont[];
}) {
  const colors = [
    ["primary_color", "Principale", brand?.colors.primary ?? "#1d4ed8"],
    ["secondary_color", "Secondaire", brand?.colors.secondary ?? "#64748b"],
    ["background_color", "Fond", brand?.colors.background ?? "#0f172a"],
    ["text_color", "Texte", brand?.colors.text ?? "#f8fafc"],
    ["accent_color", "Accent", brand?.colors.accent ?? "#f59e0b"],
  ] as const;

  const slots = [
    ["heading", "Titres", fontChoice(brand?.fonts.heading, "oswald"), undefined],
    ["body", "Texte", fontChoice(brand?.fonts.body, "inter"), undefined],
    [
      "numeric",
      "Chiffres",
      fontChoice(brand?.fonts.numeric, "barlow-condensed"),
      "Chronos, distances, rangs : elle se lit à trente mètres.",
    ],
  ] as const;

  const options = [
    ...Object.entries(BRAND_FONT_LABELS).map(([key, label]) => ({
      value: `lib:${key}`,
      label,
    })),
    ...fonts.map((font) => ({
      value: `custom:${font.id}`,
      label: `${font.name} (déposée)`,
    })),
  ];

  return (
    <>
      <Field label="Nom" htmlFor="brand-name">
        <Input
          id="brand-name"
          name="name"
          required
          maxLength={120}
          defaultValue={brand?.name}
          placeholder="Ligue d'Île-de-France"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {colors.map(([field, label, value]) => (
          <Field key={field} label={label} htmlFor={`brand-${field}`}>
            <Input
              id={`brand-${field}`}
              type="color"
              name={field}
              defaultValue={value}
              className="h-10 p-1"
            />
          </Field>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {slots.map(([slot, label, value, hint]) => (
          <Field key={slot} label={label} hint={hint}>
            <FormSelect
              name={`${slot}_font_choice`}
              defaultValue={value}
              options={options}
            />
          </Field>
        ))}
      </div>
    </>
  );
}

/**
 * Logo et favicon.
 *
 * Proposés dès la création : déposer le logo qu'on a déjà sous la main ne doit
 * pas demander de créer la charte puis de la rouvrir. `brand` est absent dans
 * ce cas — il n'y a alors rien à prévisualiser.
 */
export function BrandMediaFields({ brand }: { brand?: ManagedBrand }) {
  return (
    <>
      <Field
        label="Logo"
        htmlFor="brand-logo"
        hint="Affiché en haut des écrans de diffusion, à la place du logo VSRUN. PNG, JPEG ou WebP — la transparence d'un PNG est conservée. 4 Mo au plus."
      >
        <Input id="brand-logo" type="file" name="logo" accept="image/*" />
      </Field>

      {brand?.logo_url ? (
        <div className="rounded-md border bg-neutral-950 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logo_url}
            alt="Logo actuel"
            className="h-12 w-auto object-contain"
          />
        </div>
      ) : null}

      <Field
        label="Favicon"
        htmlFor="brand-favicon"
        hint="L'icône de l'onglet, sur la page publique. 1 Mo au plus."
      >
        <Input id="brand-favicon" type="file" name="favicon" accept="image/*" />
      </Field>

      {brand?.favicon_url ? (
        <div className="rounded-md border bg-neutral-950 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.favicon_url}
            alt="Favicon actuel"
            className="h-8 w-8 object-contain"
          />
        </div>
      ) : null}
    </>
  );
}
