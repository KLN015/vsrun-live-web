import { NextRequest, NextResponse } from "next/server";
import { authorizationUrl, createCodeVerifier, createState } from "@/lib/oauth";
import { setHandshake } from "@/lib/session";

/**
 * Démarre l'authentification.
 *
 * Le `code_verifier` et le `state` sont conservés dans un cookie chiffré de
 * courte durée : le navigateur les transporte sans pouvoir les lire, et le
 * callback peut ainsi vérifier que la réponse correspond bien à la demande
 * qu'il a lui-même émise.
 */
export async function GET(request: NextRequest) {
  const state = createState();
  const verifier = createCodeVerifier();

  // Où revenir après authentification. Restreint aux chemins internes : une
  // redirection ouverte transformerait le login en tremplin vers un site tiers.
  const requested = request.nextUrl.searchParams.get("returnTo") ?? "/dashboard";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/dashboard";

  await setHandshake({ state, codeVerifier: verifier, returnTo });

  return NextResponse.redirect(authorizationUrl(state, verifier));
}
