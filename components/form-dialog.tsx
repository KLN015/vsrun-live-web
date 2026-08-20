"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { ActionForm, type ActionState } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Un bouton qui ouvre un formulaire, plutôt qu'un formulaire posé sur la page.
 *
 * Les écrans de compétition portent d'abord des données — un programme, des
 * résultats. Les formulaires de saisie occupaient une colonne entière en
 * permanence pour un geste occasionnel ; ils s'ouvrent maintenant à la demande.
 *
 * La fenêtre se ferme d'elle-même après un enregistrement réussi. Sur une
 * erreur elle reste ouverte, avec le message de Laravel et les valeurs saisies
 * — les perdre obligerait à tout retaper.
 */
export function FormDialog({
  trigger,
  title,
  description,
  submitLabel,
  action,
  variant = "default",
  submitVariant,
  children,
}: {
  trigger: string;
  title: string;
  description?: string;
  submitLabel: string;
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  variant?: "default" | "outline" | "destructive";
  /** Par défaut, celle du déclencheur : une fenêtre de suppression confirme
   *  une suppression, et son bouton ne doit pas ressembler à « Enregistrer ». */
  submitVariant?: "default" | "destructive";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} size="sm" type="button">
            {trigger}
          </Button>
        }
      />

      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}

        <ActionForm
          action={action}
          submitLabel={submitLabel}
          submitVariant={
            submitVariant ?? (variant === "destructive" ? "destructive" : "default")
          }
          onSuccess={close}
        >
          {children}
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
