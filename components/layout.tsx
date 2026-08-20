import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Primitives de mise en page qui ne relèvent pas de shadcn/ui.
 *
 * shadcn fournit les contrôles (boutons, champs, tableaux) ; ce qui suit
 * concerne l'agencement des pages et la restitution des messages venus de
 * Laravel.
 */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1
          // Suit la police de titrage quand la page porte une charte ; ailleurs,
          // la variable est absente et l'héritage s'applique.
          style={{ fontFamily: "var(--brand-font-heading, inherit)" }}
          className="text-2xl font-semibold tracking-tight"
        >
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Lien stylé comme un bouton — `<Button asChild>` ne traverse pas la frontière serveur/client. */
export function ButtonLink({
  variant = "default",
  size = "default",
  className,
  ...props
}: ComponentProps<typeof Link> &
  Pick<Parameters<typeof buttonVariants>[0] & object, never> & {
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg";
  }) {
  return (
    <Link
      {...props}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
      {children}
    </div>
  );
}

export function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
    >
      {children}
    </div>
  );
}

export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
      {children}
    </div>
  );
}
