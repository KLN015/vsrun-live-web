import { env } from "./env";
import { isExpired } from "./oauth";
import { getSession } from "./session";

/**
 * Accès au backend VSRUN LIVE depuis le serveur Next.js.
 *
 * Le navigateur n'appelle jamais l'API directement : il n'a pas le jeton, et
 * c'est voulu. Ce module ajoute l'en-tête `Authorization` à partir de la
 * session chiffrée.
 *
 * Aucune logique métier ici — pas de décision d'autorisation, pas de calcul,
 * pas de filtrage. Ce sont des allers-retours, rien d'autre : Laravel reste la
 * seule autorité.
 */

/** La session est absente ou périmée : l'appelant doit relancer le flux. */
export class UnauthenticatedError extends Error {
  constructor(readonly needsRefresh: boolean) {
    super("Session VSRUN absente ou expirée");
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`VSRUN LIVE API a répondu ${status}`);
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = await getSession();

  if (!session) {
    throw new UnauthenticatedError(false);
  }

  if (isExpired(session)) {
    // Le rafraîchissement écrit un cookie, ce qu'un Server Component n'a pas le
    // droit de faire : on remonte le besoin, la route /api/auth/refresh s'en
    // charge et renvoie l'utilisateur ici.
    throw new UnauthenticatedError(Boolean(session.refreshToken));
  }

  const response = await fetch(`${env.liveApiUrl()}/api/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    // Jeton révoqué côté VSRUN, ou rejeté par le guard.
    throw new UnauthenticatedError(Boolean(session.refreshToken));
  }

  return response;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(path, init);

  if (!response.ok) {
    throw new ApiError(response.status, await safeJson(response));
  }

  return (await response.json()) as T;
}

/** Variante tolérante : renvoie null sur 404, pour les pages de détail. */
export async function apiJsonOrNull<T>(path: string): Promise<T | null> {
  const response = await apiFetch(path);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError(response.status, await safeJson(response));
  }

  return (await response.json()) as T;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
