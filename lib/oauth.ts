import { createHash, randomBytes } from "node:crypto";
import { env, redirectUri } from "./env";
import type { Session } from "./session";

/**
 * Flux OAuth 2.0 Authorization Code + PKCE contre api.vsrun.com.
 *
 * L'échange du code a lieu ici, côté serveur, avec un client confidentiel :
 * le `client_secret` ne quitte jamais le processus Node, et le navigateur ne
 * voit ni code_verifier ni jeton.
 */

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

export function createCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function codeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function createState(): string {
  return base64url(randomBytes(16));
}

export function authorizationUrl(state: string, verifier: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.oauthClientId(),
    redirect_uri: redirectUri(),
    state,
    code_challenge: codeChallenge(verifier),
    code_challenge_method: "S256",

    // Aucun scope n'est défini sur api.vsrun.com : en demander un ferait
    // échouer l'autorisation. Les applications iOS et Android font de même.
    scope: "",
  });

  // `view` est délibérément absent : le middleware AuthViewRedirect
  // d'api.vsrun.com exécute Auth::logout() dès qu'il est présent, ce qui
  // casserait la session partagée avec vsrun.com.
  return `${env.vsrunApiUrl()}/oauth/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function requestToken(body: Record<string, string>): Promise<Session> {
  const response = await fetch(`${env.vsrunApiUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: env.oauthClientId(),
      client_secret: env.oauthClientSecret(),
      ...body,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Échange de jeton refusé (${response.status}) : ${detail}`);
  }

  const token = (await response.json()) as TokenResponse;

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    // Marge de 60 s : mieux vaut rafraîchir un peu tôt qu'envoyer une requête
    // avec un jeton expiré entre-temps.
    expiresAt: Date.now() + (token.expires_in - 60) * 1000,
  };
}

export function exchangeCode(code: string, verifier: string): Promise<Session> {
  return requestToken({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
  });
}

export function refreshSession(refreshToken: string): Promise<Session> {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: "",
  });
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt;
}
