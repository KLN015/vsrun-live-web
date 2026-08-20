import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Configuration et contenu d'un écran, relayés depuis Laravel.
 *
 * Cette route existe pour que le navigateur de l'écran n'ait pas à connaître
 * l'origine de l'API — même raison que le proxy du dashboard, sans jeton à
 * ajouter puisque le jeton d'écran voyage dans l'URL.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const upstream = await fetch(
    `${env.liveApiUrl()}/api/v1/public/displays/${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );

  return NextResponse.json(await upstream.json().catch(() => ({})), {
    status: upstream.status,
  });
}
