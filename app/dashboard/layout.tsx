import Link from "next/link";
import { DashboardMenu, DashboardNav } from "@/components/dashboard-nav";
import { VsrunLogo } from "@/components/vsrun-logo";
import { Button } from "@/components/ui/button";
import { apiJson } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { UserReference, Wrapped } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await withSession("/dashboard", () =>
    apiJson<Wrapped<UserReference>>("/me"),
  );

  const account = me.data.display_name ?? me.data.email ?? "Compte VSRUN";

  return (
    <div className="min-h-screen">
      {/* `relative` : le panneau du menu se pose sous l'en-tête, dont il prend
          toute la largeur. */}
      <header className="bg-card relative border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              aria-label="VSRUN LIVE"
              className="flex items-center"
            >
              <VsrunLogo live size="sm" />
            </Link>

            <DashboardNav />
          </div>

          {/* Au téléphone, ces deux-là passent dans le menu : le nom d'un
              compte et un bouton de déconnexion n'ont pas à disputer la largeur
              au logo. */}
          <div className="hidden items-center gap-2 text-sm sm:flex">
            <span className="text-muted-foreground">{account}</span>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>

          <DashboardMenu account={account} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
