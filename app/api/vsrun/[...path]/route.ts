import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isExpired, refreshSession } from "@/lib/oauth";
import { getSession, setSession } from "@/lib/session";

/**
 * Proxy fin vers l'API VSRUN LIVE, pour les composants client.
 *
 * Il transporte, il rafraîchit, il ne décide de rien : aucune règle
 * d'autorisation, aucun filtrage, aucune transformation de données. Toute
 * décision reste à Laravel. Si ce fichier devait un jour contenir un `if`
 * métier, ce serait le signe qu'une règle a fui du backend vers le frontend.
 *
 * Sa seule raison d'être : ajouter l'en-tête `Authorization` que le navigateur
 * n'a pas les moyens de fabriquer, puisqu'il n'a pas le jeton.
 */

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "idempotency-key"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "retry-after"];

async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  }

  let accessToken = session.accessToken;

  if (isExpired(session)) {
    if (!session.refreshToken) {
      return NextResponse.json({ message: "Session expirée." }, { status: 401 });
    }

    try {
      const refreshed = await refreshSession(session.refreshToken);
      await setSession(refreshed);
      accessToken = refreshed.accessToken;
    } catch {
      return NextResponse.json({ message: "Session expirée." }, { status: 401 });
    }
  }

  const { path } = await context.params;
  const target = new URL(`${env.liveApiUrl()}/api/v1/${path.join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers({ Authorization: `Bearer ${accessToken}` });

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.text(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
