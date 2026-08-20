import { ManagedFontFaces } from "@/components/brand-faces";
import { BrandFields, BrandMediaFields } from "@/components/brand-fields";
import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field, PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createBrand,
  deleteBrand,
  deleteFont,
  updateBrand,
  updateOrganizationBranding,
  uploadFont,
} from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import { Input } from "@/components/ui/input";
import {
  type ManagedBrand,
  type ManagedFont,
  type Organization,
  type Paginated,
} from "@/lib/types";

export default async function BrandingPage() {
  const groups = await withSession("/dashboard/branding", async () => {
    const organizations = await apiJson<Paginated<Organization>>(
      "/organizations",
    );

    return Promise.all(
      organizations.data.map(async (organization) => {
        const [brands, fonts] = await Promise.all([
          apiJson<Paginated<ManagedBrand>>(
            `/organizations/${organization.id}/brands`,
          ),
          apiJson<Paginated<ManagedFont>>(
            `/organizations/${organization.id}/fonts`,
          ),
        ]);

        return { organization, brands: brands.data, fonts: fonts.data };
      }),
    );
  });

  return (
    <>
      <PageHeader
        title="Identité visuelle"
        description="Couleurs, polices et logo appliqués aux fiches publiques et aux écrans de diffusion."
      />

      {groups.length === 0 ? (
        <EmptyState>Créez d&apos;abord une organisation.</EmptyState>
      ) : (
        <div className="space-y-10">
          {groups.map(({ organization, brands, fonts }) => (
            <section key={organization.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-muted-foreground text-sm font-medium">
                  {organization.name}
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  {brands.length > 0 ? (
                    <FormDialog
                      trigger="Charte par défaut"
                      variant="outline"
                      title="Charte par défaut"
                      description="Celle qu'appliquent les événements qui n'en choisissent pas une eux-mêmes. Sans choix ici, c'est l'identité VSRUN qui sert."
                      submitLabel="Enregistrer"
                      action={updateOrganizationBranding}
                    >
                      <input
                        type="hidden"
                        name="organization_id"
                        value={organization.id}
                      />

                      <Field label="Charte">
                        <FormSelect
                          name="default_brand_id"
                          defaultValue={organization.default_brand_id ?? ""}
                          placeholder="Identité VSRUN"
                          options={brands.map((brand) => ({
                            value: brand.id,
                            label: brand.name,
                          }))}
                        />
                      </Field>
                    </FormDialog>
                  ) : null}

                  <FormDialog
                    trigger="Nouvelle charte"
                    title="Nouvelle charte"
                    description="Couleurs, polices, logo et favicon."
                    submitLabel="Créer"
                    action={createBrand}
                  >
                    <input
                      type="hidden"
                      name="organization_id"
                      value={organization.id}
                    />
                    <BrandFields fonts={fonts} />
                    <BrandMediaFields />
                  </FormDialog>
                </div>
              </div>

              {brands.length === 0 ? (
                <EmptyState>
                  Aucune charte. Les écrans et les pages publiques utilisent
                  l&apos;identité VSRUN par défaut.
                </EmptyState>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {brands.map((brand) => (
                    <Card key={brand.id}>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {brand.logo_url ? (
                              <span className="rounded bg-neutral-950 p-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={brand.logo_url}
                                  alt=""
                                  className="h-8 w-auto object-contain"
                                />
                              </span>
                            ) : null}

                            <div>
                              <p className="font-medium">{brand.name}</p>
                              <p className="text-muted-foreground mt-0.5 text-xs">
                                {brand.fonts.heading.name} ·{" "}
                                {brand.fonts.body.name} ·{" "}
                                {brand.fonts.numeric.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {organization.default_brand_id === brand.id ? (
                              <Badge>Par défaut</Badge>
                            ) : null}

                            <FormDialog
                              trigger="Modifier"
                              variant="outline"
                              title={brand.name}
                              description="Couleurs, polices, logo et favicon."
                              submitLabel="Enregistrer"
                              action={updateBrand}
                            >
                              <input
                                type="hidden"
                                name="brand_id"
                                value={brand.id}
                              />
                              <BrandFields brand={brand} fonts={fonts} />
                              <BrandMediaFields brand={brand} />
                            </FormDialog>

                            <form action={deleteBrand}>
                              <input
                                type="hidden"
                                name="brand_id"
                                value={brand.id}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                type="submit"
                              >
                                Supprimer
                              </Button>
                            </form>
                          </div>
                        </div>

                        {/* Aperçu des couleurs : la charte se juge à l'œil,
                            pas à la lecture de cinq codes hexadécimaux. */}
                        <div className="flex gap-1.5">
                          {Object.entries(brand.colors).map(([key, value]) => (
                            <div key={key} className="flex-1">
                              <div
                                className="h-10 rounded border"
                                style={{ backgroundColor: value }}
                              />
                              <p className="text-muted-foreground mt-1 text-[10px]">
                                {key}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <FontLibrary organization={organization} fonts={fonts} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Les polices déposées par une organisation.
 *
 * Rattachées à l'organisation et non à une charte : on dépose la police de sa
 * marque une fois, et elle sert dans toutes les chartes de la maison. C'est
 * aussi pour cela qu'elle apparaît ici, sous les chartes, plutôt que dans le
 * formulaire de chacune.
 *
 * Chaque nom est écrit dans sa propre police : c'est ainsi qu'on choisit une
 * typographie, pas en lisant une liste de noms de fichiers.
 */
function FontLibrary({
  organization,
  fonts,
}: {
  organization: Organization;
  fonts: ManagedFont[];
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <ManagedFontFaces fonts={fonts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Polices</p>
          <p className="text-muted-foreground text-xs">
            Déposées une fois, disponibles dans toutes les chartes de
            l&apos;organisation.
          </p>
        </div>

        <FormDialog
          trigger="Importer une police"
          variant="outline"
          title="Importer une police"
          description="Le fichier de la police de votre marque. Il sera proposé dans les chartes de l'organisation, à côté du catalogue."
          submitLabel="Importer"
          action={uploadFont}
        >
          <input type="hidden" name="organization_id" value={organization.id} />

          <Field label="Nom" htmlFor="font-name">
            <Input
              id="font-name"
              name="name"
              required
              maxLength={120}
              placeholder="Fédé Display Bold"
            />
          </Field>

          <Field
            label="Fichier"
            htmlFor="font-file"
            hint="WOFF2, WOFF, TTF ou OTF — 2 Mo au plus. Le WOFF2 est le plus léger : à privilégier pour un écran qui charge par le réseau du stade."
          >
            <Input
              id="font-file"
              type="file"
              name="file"
              required
              accept=".woff2,.woff,.ttf,.otf"
            />
          </Field>
        </FormDialog>
      </div>

      {fonts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune police déposée. Les chartes utilisent le catalogue VSRUN.
        </p>
      ) : (
        <ul className="divide-y">
          {fonts.map((font) => (
            <li
              key={font.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2"
            >
              <div>
                <p
                  className="text-lg"
                  style={{ fontFamily: `"${font.family}", sans-serif` }}
                >
                  {font.name}
                </p>
                <p className="text-muted-foreground text-xs uppercase">
                  {font.format} · {Math.round(font.bytes / 1024)} Ko
                </p>
              </div>

              <form action={deleteFont}>
                <input type="hidden" name="font_id" value={font.id} />
                <Button variant="outline" size="sm" type="submit">
                  Supprimer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
