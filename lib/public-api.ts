import { env } from "./env";

/**
 * Accès à la surface publique de l'API VSRUN LIVE.
 *
 * Volontairement séparé de `lib/api.ts` : aucune session n'est lue ici, aucun
 * en-tête `Authorization` n'est posé. Un appel public ne peut donc pas emprunter
 * par accident l'identité de l'utilisateur connecté et rapporter des données
 * qu'un spectateur anonyme ne verrait pas.
 */

export class PublicApiError extends Error {
  constructor(readonly status: number) {
    super(`API publique : ${status}`);
  }
}

type FetchOptions = {
  /** Durée de mise en cache, en secondes. `0` force une lecture fraîche. */
  revalidate?: number;
};

async function get(path: string, { revalidate = 15 }: FetchOptions = {}) {
  return fetch(`${env.liveApiUrl()}/api/v1/public${path}`, {
    headers: { Accept: "application/json" },
    ...(revalidate === 0
      ? { cache: "no-store" as const }
      : { next: { revalidate } }),
  });
}

export async function publicJson<T>(
  path: string,
  options?: FetchOptions,
): Promise<T> {
  const response = await get(path, options);

  if (!response.ok) {
    throw new PublicApiError(response.status);
  }

  return (await response.json()) as T;
}

/**
 * Variante tolérante au 404.
 *
 * Un événement privé, un brouillon et un slug inexistant renvoient tous 404 :
 * le frontend ne peut pas les distinguer, et n'a pas à essayer.
 */
export async function publicJsonOrNull<T>(
  path: string,
  options?: FetchOptions,
): Promise<T | null> {
  const response = await get(path, options);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new PublicApiError(response.status);
  }

  return (await response.json()) as T;
}
