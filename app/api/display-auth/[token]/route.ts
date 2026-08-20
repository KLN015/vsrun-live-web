import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Autorisation d'abonnement pour un écran de diffusion.
 *
 * Un écran ne détient qu'un jeton d'URL : pas de session, pas de compte. Cette
 * route relaie sa demande vers Laravel, qui échange le jeton contre une
 * signature valable pour le canal de cet écran, et d'aucun autre.
 *
 * Elle passe par Next plutôt que d'appeler l'API directement depuis le
 * navigateur : cela évite d'ouvrir CORS sur l'API et garde son origine hors de
 * portée du client, comme pour le reste du produit.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const body = await request.text();

  const upstream = await fetch(
    `${env.liveApiUrl()}/api/v1/public/displays/${encodeURIComponent(token)}/channel-auth`,
    {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    },
  );

  return NextResponse.json(await upstream.json().catch(() => ({})), {
    status: upstream.status,
  });
}
