import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

/**
 * Session chiffrée, stockée dans un cookie httpOnly.
 *
 * Les jetons d'api.vsrun.com n'atteignent jamais le navigateur : ils vivent
 * dans la charge chiffrée d'un cookie que seul le serveur peut lire, et sont
 * ajoutés aux requêtes par le proxy. Un XSS sur vsrun.live ne donne donc accès
 * à aucun jeton VSRUN.
 *
 * AES-256-GCM avec le `crypto` de Node plutôt qu'une bibliothèque tierce :
 * soixante lignes lisibles, aucune dépendance à surveiller sur la pièce la plus
 * sensible du système.
 */

const COOKIE_NAME = "vsrun_live_session";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export type Session = {
  accessToken: string;
  refreshToken?: string;
  /** Expiration de l'access token, en millisecondes epoch. */
  expiresAt: number;
};

/** État transitoire du flux OAuth, entre /login et le callback. */
export type OAuthHandshake = {
  state: string;
  codeVerifier: string;
  returnTo: string;
};

const HANDSHAKE_COOKIE = "vsrun_live_oauth";

function key(): Buffer {
  const secret = Buffer.from(env.sessionSecret(), "base64");

  if (secret.length !== 32) {
    throw new Error(
      "SESSION_SECRET doit être 32 octets encodés en base64 (openssl rand -base64 32).",
    );
  }

  return secret;
}

export function seal(payload: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);

  // iv | tag d'authentification | chiffré — le tag garantit qu'un cookie
  // altéré est rejeté plutôt que déchiffré en données douteuses.
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted].map(Buffer.from))
    .toString("base64url");
}

export function unseal<T>(value: string): T | null {
  try {
    const raw = Buffer.from(value, "base64url");
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(IV_BYTES, IV_BYTES + 16);
    const encrypted = raw.subarray(IV_BYTES + 16);

    const decipher = createDecipheriv(ALGORITHM, key(), iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    // Cookie forgé, tronqué, ou chiffré avec une ancienne clé : on traite la
    // session comme absente plutôt que de propager une erreur.
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction(),
  sameSite: "lax" as const,
  path: "/",
};

export async function getSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(COOKIE_NAME);

  return cookie ? unseal<Session>(cookie.value) : null;
}

export async function setSession(session: Session): Promise<void> {
  (await cookies()).set(COOKIE_NAME, seal(session), {
    ...cookieOptions,
    // Le cookie survit au-delà de l'access token : c'est le refresh token
    // qu'il transporte qui prolonge la session.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(HANDSHAKE_COOKIE);
}

export async function setHandshake(handshake: OAuthHandshake): Promise<void> {
  (await cookies()).set(HANDSHAKE_COOKIE, seal(handshake), {
    ...cookieOptions,
    // Le temps d'aller s'authentifier, pas davantage.
    maxAge: 60 * 10,
  });
}

export async function takeHandshake(): Promise<OAuthHandshake | null> {
  const store = await cookies();
  const cookie = store.get(HANDSHAKE_COOKIE);

  // À usage unique : un code d'autorisation ne se rejoue pas.
  store.delete(HANDSHAKE_COOKIE);

  return cookie ? unseal<OAuthHandshake>(cookie.value) : null;
}
