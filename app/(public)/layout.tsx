import Link from "next/link";
import { VsrunLogo } from "@/components/vsrun-logo";
import { ButtonLink } from "@/components/layout";
import { getSession } from "@/lib/session";

/**
 * Enveloppe des pages spectateurs.
 *
 * Consultables sans compte : le seul élément qui dépend de la session est le
 * lien d'en-tête, et son absence n'empêche rien.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/events"
            aria-label="VSRUN LIVE"
            className="flex items-center"
          >
            <VsrunLogo live size="sm" />
          </Link>

          <ButtonLink
            href={session ? "/dashboard" : "/login"}
            variant="ghost"
            size="sm"
          >
            {session ? "Tableau de bord" : "Espace organisateur"}
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
