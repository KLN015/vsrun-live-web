import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { exchangeCode } from "@/lib/oauth";
import { setSession, takeHandshake } from "@/lib/session";

/**
 * Retour d'api.vsrun.com avec le code d'autorisation.
 *
 * Trois vérifications avant d'échanger quoi que ce soit : la demande vient bien
 * de nous (`state`), elle n'a pas déjà été consommée (le cookie est retiré à la
 * lecture), et le serveur n'a pas renvoyé d'erreur.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const handshake = await takeHandshake();

  const fail = (reason: string) =>
    NextResponse.redirect(
      `${env.appUrl()}/login?error=${encodeURIComponent(reason)}`,
    );

  if (params.get("error")) {
    return fail(params.get("error_description") ?? params.get("error")!);
  }

  if (!handshake) {
    // Cookie expiré ou déjà consommé : on renvoie vers le login plutôt que de
    // tenter un échange qu'on ne pourrait pas rattacher à une demande.
    return fail("Session d'authentification expirée. Réessayez.");
  }

  if (params.get("state") !== handshake.state) {
    // Défense contre le CSRF sur le flux d'autorisation.
    return fail("Réponse d'authentification inattendue.");
  }

  const code = params.get("code");

  if (!code) {
    return fail("Aucun code d'autorisation reçu.");
  }

  try {
    await setSession(await exchangeCode(code, handshake.codeVerifier));
  } catch (error) {
    console.error("Échec de l'échange du code OAuth", error);

    return fail("Impossible de finaliser la connexion.");
  }

  return NextResponse.redirect(`${env.appUrl()}${handshake.returnTo}`);
}
