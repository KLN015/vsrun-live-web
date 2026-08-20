import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { refreshSession } from "@/lib/oauth";
import { clearSession, getSession, setSession } from "@/lib/session";

/**
 * Renouvelle l'access token, puis renvoie l'utilisateur d'où il venait.
 *
 * Cette route existe parce qu'un Server Component ne peut pas écrire de cookie :
 * quand une page découvre que le jeton a expiré, elle redirige ici, on
 * rafraîchit, et la page est rejouée. L'utilisateur ne voit qu'un aller-retour.
 */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("returnTo") ?? "/dashboard";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/dashboard";

  const session = await getSession();

  if (!session?.refreshToken) {
    await clearSession();

    return NextResponse.redirect(
      `${env.appUrl()}/login?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  try {
    await setSession(await refreshSession(session.refreshToken));
  } catch (error) {
    // Refresh token expiré ou révoqué : il n'y a plus rien à sauver, on
    // repart d'une authentification complète.
    console.error("Échec du rafraîchissement de session", error);
    await clearSession();

    return NextResponse.redirect(
      `${env.appUrl()}/login?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return NextResponse.redirect(`${env.appUrl()}${returnTo}`);
}
