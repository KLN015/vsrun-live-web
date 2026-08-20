"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ErrorNotice, SuccessNotice } from "@/components/layout";

export type ActionState = { error?: string; success?: string; token?: string };

/**
 * Formulaire adossé à une server action.
 *
 * Les messages affichés viennent de Laravel : le frontend ne revalide pas les
 * règles métier de son côté, il ne ferait que dupliquer une vérité qui vit
 * ailleurs — et finirait par en diverger.
 */
export function ActionForm({
  action,
  submitLabel,
  submitVariant,
  children,
  onResult,
  onSuccess,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  /** « destructive » pour une suppression : le bouton doit dire ce qu'il fait. */
  submitVariant?: "default" | "destructive";
  children: ReactNode;
  onResult?: (state: ActionState) => ReactNode;
  /**
   * Appelé après un enregistrement réussi, avec l'état renvoyé par l'action.
   * Ferme la fenêtre qui l'héberge, ou récupère ce que l'action a produit —
   * un jeton de diffusion, par exemple.
   */
  onSuccess?: (state: ActionState) => void;
}) {
  const [state, formAction] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const lastState = useRef(state);

  useEffect(() => {
    // Vider les champs après un enregistrement réussi. Un chronométreur saisit
    // les résultats à la chaîne : lui laisser la valeur précédente l'expose à
    // la renvoyer par inadvertance. La comparaison porte sur l'identité de
    // l'objet d'état — deux succès consécutifs portent le même message.
    if (state !== lastState.current && state.success) {
      formRef.current?.reset();
      onSuccess?.(state);
    }

    lastState.current = state;
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error ? <ErrorNotice>{state.error}</ErrorNotice> : null}
      {state.success ? <SuccessNotice>{state.success}</SuccessNotice> : null}

      {onResult?.(state)}

      {children}

      <Submit label={submitLabel} variant={submitVariant} />
    </form>
  );
}

function Submit({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "En cours…" : label}
    </Button>
  );
}
