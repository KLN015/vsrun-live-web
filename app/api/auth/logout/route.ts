import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearSession } from "@/lib/session";

/**
 * Déconnexion locale.
 *
 * Le cookie est détruit ; le jeton VSRUN, lui, reste valide jusqu'à son
 * expiration côté api.vsrun.com. C'est le comportement attendu d'un SSO : se
 * déconnecter de vsrun.live ne doit pas déconnecter des applications mobiles.
 */
export async function POST() {
  await clearSession();

  return NextResponse.redirect(`${env.appUrl()}/login`, { status: 303 });
}
