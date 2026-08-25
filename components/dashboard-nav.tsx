"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Les destinations du dashboard, en un seul endroit.
 *
 * La barre large et le menu du portable les lisent toutes deux ici : deux
 * listes finiraient par ne plus proposer les mêmes pages, et c'est le portable
 * qu'on oublierait.
 */
const LINKS = [
  { href: "/dashboard", label: "Organisations" },
  { href: "/dashboard/events", label: "Événements" },
  { href: "/dashboard/branding", label: "Identité visuelle" },
];

/**
 * La navigation du dashboard, sur écran large.
 *
 * Elle disparaît sous 640 px, où elle poussait le nom du compte et le bouton de
 * déconnexion sur une deuxième puis une troisième ligne : l'en-tête occupait le
 * tiers d'un écran de téléphone avant même que la page ne commence.
 */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="text-muted-foreground hidden gap-4 text-sm sm:flex">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "hover:text-foreground",
            isCurrent(pathname, link.href) && "text-foreground font-medium",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Le même contenu au téléphone, replié derrière un bouton.
 *
 * Le panneau tombe sous l'en-tête plutôt que de recouvrir l'écran : on y vient
 * pour changer de page, pas pour s'y installer, et une fenêtre modale demande
 * un geste de plus pour en sortir.
 *
 * Le nom du compte et la déconnexion y descendent aussi. Ils ne sont pas de la
 * navigation, mais ce sont les deux derniers éléments de l'en-tête, et les
 * laisser dehors aurait rendu le repli inutile.
 */
export function DashboardMenu({ account }: { account: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Le menu se referme quand la page change : sans cela, il resterait ouvert
  // par-dessus la page qu'on vient de demander.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sm:hidden">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls="menu-dashboard"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((was) => !was)}
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </Button>

      {open ? (
        <div
          id="menu-dashboard"
          className="bg-card absolute inset-x-0 top-full z-40 flex flex-col border-b px-6 py-3 shadow-lg"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "py-2 text-sm",
                isCurrent(pathname, link.href)
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}

          <div className="mt-2 flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-muted-foreground truncate text-sm">
              {account}
            </span>

            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="ghost" size="sm">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * La page ouverte est-elle celle de ce lien ?
 *
 * `/dashboard` est le préfixe de toutes les autres : il ne vaut que pour
 * lui-même, sans quoi « Organisations » resterait surligné partout.
 */
function isCurrent(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}
