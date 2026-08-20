import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { apiJsonOrNull } from "@/lib/api";
import { withSession } from "@/lib/guard";
import type { LiveEvent, Wrapped } from "@/lib/types";

const tabs = [
  { href: "", label: "Réglages" },
  { href: "/disciplines", label: "Épreuves" },
  { href: "/participants", label: "Participants" },
  { href: "/videos", label: "Vidéos" },
  { href: "/displays", label: "Écrans" },
  { href: "/ingestion", label: "Diffusion" },
];

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await withSession(`/dashboard/events/${id}`, () =>
    apiJsonOrNull<Wrapped<LiveEvent>>(`/events/${id}`),
  );

  // 404 côté API : soit l'événement n'existe pas, soit il appartient à une
  // organisation dont on n'est pas membre. Le frontend n'a pas à faire la
  // différence — et ne le peut pas, c'est voulu.
  if (!event) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={event.data.name}
        description={
          [event.data.location, event.data.slug].filter(Boolean).join(" · ") ||
          undefined
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                event.data.status === "live" ? "destructive" : "secondary"
              }
            >
              {event.data.status_label}
            </Badge>
            {event.data.visibility === "private" ? (
              <Badge variant="outline">Privé</Badge>
            ) : null}
          </div>
        }
      />

      <nav className="mb-6 flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/dashboard/events/${id}${tab.href}`}
            className="text-muted-foreground hover:text-foreground hover:border-border -mb-px border-b-2 border-transparent px-3 py-2 text-sm"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </>
  );
}
