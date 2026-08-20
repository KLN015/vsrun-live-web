import { redirect } from "next/navigation";
import { UnauthenticatedError } from "./api";

/**
 * Traduit une session manquante ou périmée en redirection.
 *
 * Un jeton expiré part vers /api/auth/refresh, qui le renouvelle et ramène
 * l'utilisateur sur la page demandée ; une session absente part vers le login.
 * Dans les deux cas l'utilisateur ne voit qu'un aller-retour, jamais une erreur.
 */
export async function withSession<T>(
  currentPath: string,
  load: () => Promise<T>,
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      const target = error.needsRefresh ? "/api/auth/refresh" : "/login";

      redirect(`${target}?returnTo=${encodeURIComponent(currentPath)}`);
    }

    throw error;
  }
}
