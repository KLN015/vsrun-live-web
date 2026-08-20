"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { QrCode } from "@/components/qr-code";
import { issueIngestionSecret } from "@/lib/actions";

/**
 * Le formulaire, dans une fenêtre qui ne se referme pas toute seule.
 *
 * Contrairement aux autres, celle-ci reste ouverte après l'enregistrement : le
 * QR code n'apparaît qu'en réponse et ne sera plus jamais affiché. La fermer au
 * succès ferait disparaître la seule chose qu'on venait chercher.
 */
export function IngestionSecretDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Fermer la fenêtre oublie le jeton : il n'existe nulle part ailleurs, et le
  // rouvrir sur un QR code périmé laisserait croire qu'il vaut encore.
  const close = (next: boolean) => {
    setOpen(next);

    if (!next) setToken(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger
        render={
          <Button size="sm" type="button">
            Générer un secret
          </Button>
        }
      />

      <DialogContent>
        <DialogTitle>
          {token ? "Secret de diffusion" : "Générer un secret de diffusion"}
        </DialogTitle>
        <DialogDescription>
          {token
            ? "Scannez-le maintenant : il ne sera plus jamais affiché."
            : "Un secret par appareil, pour pouvoir en révoquer un sans couper les autres."}
        </DialogDescription>

        {/* Le formulaire disparaît une fois le secret créé : le laisser sous le
            QR code inviterait à en générer un second avant d'avoir scanné le
            premier. */}
        {token ? (
          <IssuedSecret
            eventId={eventId}
            token={token}
            onDone={() => close(false)}
          />
        ) : (
          <IngestionSecretForm eventId={eventId} onIssued={setToken} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Le QR code, affiché une seule fois.
 *
 * Le jeton n'existe que dans l'état renvoyé par la server action, jamais en
 * base sous forme lisible : rechargez la page et il est définitivement perdu.
 */
function IssuedSecret({
  eventId,
  token,
  onDone,
}: {
  eventId: string;
  token: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
        <QrCode
          value={qrPayload(eventId, token)}
          label="QR code de diffusion à scanner depuis l'application VSRUN"
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Dans l&apos;application VSRUN : ouvrez l&apos;entraînement, menu{" "}
        <strong>«&nbsp;Diffuser en direct&nbsp;»</strong>, puis scannez.
      </p>

      <details>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Saisie manuelle
        </summary>
        <code className="mt-2 block font-mono text-xs break-all">{token}</code>
      </details>

      <Button type="button" onClick={onDone}>
        J&apos;ai scanné
      </Button>
    </div>
  );
}

/**
 * Le formulaire de génération.
 *
 * Il ne montre rien du résultat : c'est la fenêtre qui décide quoi afficher une
 * fois le secret créé.
 */
function IngestionSecretForm({
  eventId,
  onIssued,
}: {
  eventId: string;
  onIssued: (token: string) => void;
}) {
  return (
    <ActionForm
      action={issueIngestionSecret}
      submitLabel="Générer"
      onSuccess={(state) => {
        if (state.token) onIssued(state.token);
      }}
    >
      <input type="hidden" name="event_id" value={eventId} />
      <Field
        label="Nom de l'appareil"
        htmlFor="secret-label"
        hint="Par exemple « Chronomètre piste »."
      >
        <Input id="secret-label" name="label" maxLength={120} />
      </Field>
    </ActionForm>
  );
}

/**
 * Contenu encodé dans le QR code.
 *
 * L'adresse du serveur n'y figure volontairement pas : elle est fixée à la
 * compilation dans l'application mobile. Un QR code se photographie et se
 * rediffuse ; s'il pouvait désigner l'hôte, un code affiché sur un écran
 * suffirait à détourner des résultats vers un tiers.
 */
function qrPayload(eventId: string, token: string): string {
  return JSON.stringify({ v: 1, event: eventId, s: token });
}
