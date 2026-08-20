import { FormDialog } from "@/components/form-dialog";
import { FormSelect } from "@/components/form-select";
import { EmptyState, Field } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createVideo, deleteVideo, updateVideoVisibility } from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { Discipline, ManagedVideo, Paginated } from "@/lib/types";

export default async function VideosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const path = `/dashboard/events/${id}/videos`;

  const { videos, disciplines } = await withSession(path, async () => {
    const [videos, disciplines] = await Promise.all([
      apiJson<Paginated<ManagedVideo>>(`/events/${id}/videos`),
      apiJson<Paginated<Discipline>>(`/events/${id}/disciplines`),
    ]);

    return { videos: videos.data, disciplines: disciplines.data };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog
          trigger="Ajouter une vidéo"
          title="Ajouter une vidéo"
          submitLabel="Ajouter"
          action={createVideo}
        >
          <input type="hidden" name="event_id" value={id} />

          <Field label="Titre" htmlFor="video-title">
            <Input id="video-title" name="title" required maxLength={200} />
          </Field>

          {disciplines.length > 0 ? (
            <Field label="Épreuve" hint="Vide : la vidéo couvre tout l'événement.">
              <FormSelect
                name="discipline_id"
                placeholder="Tout l'événement"
                options={disciplines.map((discipline) => ({
                  value: discipline.id,
                  label: discipline.name,
                }))}
              />
            </Field>
          ) : null}

          <Field
            label="Fichier"
            htmlFor="video-file"
            hint="MP4, WebM ou MOV. 500 Mo au maximum."
          >
            <Input
              id="video-file"
              type="file"
              name="file"
              accept="video/mp4,video/webm,video/quicktime"
            />
          </Field>

          <Field
            label="ou adresse externe"
            htmlFor="video-url"
            hint="Lien direct https vers un fichier vidéo, servi par votre CDN."
          >
            <Input
              id="video-url"
              type="url"
              name="url"
              placeholder="https://cdn.exemple.fr/finale.mp4"
            />
          </Field>

          <Field label="Miniature" htmlFor="video-thumb">
            <Input
              id="video-thumb"
              type="file"
              name="thumbnail"
              accept="image/png,image/jpeg,image/webp"
            />
          </Field>
        </FormDialog>
      </div>

      <div className="space-y-3">
        {videos.length === 0 ? (
          <EmptyState>
            Aucune vidéo. Ajoutez un fichier, ou l&apos;adresse d&apos;une vidéo
            déjà hébergée sur votre CDN.
          </EmptyState>
        ) : (
          videos.map((video) => (
            <Card key={video.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{video.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {[
                      video.is_hosted ? "Fichier hébergé" : "URL externe",
                      video.discipline_id
                        ? (disciplines.find((d) => d.id === video.discipline_id)
                            ?.name ?? "Épreuve")
                        : "Tout l'événement",
                      video.duration_ms
                        ? `${Math.round(video.duration_ms / 1000)} s`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{video.status_label}</Badge>
                  <Badge
                    variant={
                      video.visibility === "public" ? "default" : "outline"
                    }
                  >
                    {video.visibility === "public" ? "Publique" : "Privée"}
                  </Badge>

                  <form action={updateVideoVisibility}>
                    <input type="hidden" name="video_id" value={video.id} />
                    <input type="hidden" name="back" value={path} />
                    <input
                      type="hidden"
                      name="visibility"
                      value={video.visibility === "public" ? "private" : "public"}
                    />
                    <Button variant="outline" size="sm" type="submit">
                      {video.visibility === "public" ? "Retirer" : "Publier"}
                    </Button>
                  </form>

                  <form action={deleteVideo}>
                    <input type="hidden" name="video_id" value={video.id} />
                    <input type="hidden" name="back" value={path} />
                    <Button variant="destructive" size="sm" type="submit">
                      Supprimer
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <p className="text-muted-foreground text-xs">
          Une vidéo privée reste invisible des spectateurs, même sur un événement
          public. L&apos;inverse aussi : sur un événement privé, aucune vidéo
          n&apos;est diffusée — la plus restrictive des deux règles l&apos;emporte.
        </p>
      </div>

    </div>
  );
}
