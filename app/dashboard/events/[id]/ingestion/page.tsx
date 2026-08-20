import { EmptyState } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IngestionSecretDialog } from "@/components/ingestion-secret-form";
import { revokeIngestionSecret } from "@/lib/actions";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { IngestionSecret, Paginated } from "@/lib/types";

export default async function IngestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const secrets = await withSession(`/dashboard/events/${id}/ingestion`, () =>
    apiJson<Paginated<IngestionSecret>>(`/events/${id}/ingestion-secrets`),
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <IngestionSecretDialog eventId={id} />
      </div>

      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Un secret de diffusion autorise une application VSRUN à envoyer les
          résultats de <em>cet</em> événement. Il ne donne accès ni au tableau de
          bord, ni à votre organisation, ni à aucune autre compétition.
        </p>

        {secrets.data.length === 0 ? (
          <EmptyState>
            Aucun secret. Générez-en un et saisissez-le dans l&apos;application
            VSRUN qui chronomètre.
          </EmptyState>
        ) : (
          secrets.data.map((secret) => (
            <Card key={secret.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {secret.label ?? "Secret sans nom"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 font-mono text-sm">
                    vsl_{secret.prefix}_…
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {secret.last_used_at
                      ? `Dernière émission : ${new Date(secret.last_used_at).toLocaleString("fr-FR")}`
                      : "Jamais utilisé"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={secret.is_active ? "default" : "secondary"}>
                    {secret.is_active ? "Actif" : "Révoqué"}
                  </Badge>

                  {secret.is_active ? (
                    <form action={revokeIngestionSecret}>
                      <input type="hidden" name="event_id" value={id} />
                      <input type="hidden" name="secret_id" value={secret.id} />
                      <Button variant="destructive" size="sm" type="submit">
                        Révoquer
                      </Button>
                    </form>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <p className="text-muted-foreground text-xs">
          Plusieurs secrets peuvent rester actifs : c&apos;est ce qui permet
          d&apos;en changer en pleine compétition sans couper les appareils déjà
          en place. Révoquez l&apos;ancien une fois le nouveau distribué.
        </p>
      </div>


    </div>
  );
}
