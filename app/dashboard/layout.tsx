import Link from "next/link";
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

  return (
    <div className="min-h-screen">
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              aria-label="VSRUN LIVE"
              className="flex items-center"
            >
              <VsrunLogo live size="sm" />
            </Link>
            <nav className="text-muted-foreground flex gap-4 text-sm">
              <Link href="/dashboard" className="hover:text-foreground">
                Organisations
              </Link>
              <Link href="/dashboard/events" className="hover:text-foreground">
                Événements
              </Link>
              <Link href="/dashboard/branding" className="hover:text-foreground">
                Identité visuelle
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {me.data.display_name ?? me.data.email ?? "Compte VSRUN"}
            </span>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
