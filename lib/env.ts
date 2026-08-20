/**
 * Configuration serveur.
 *
 * Ces valeurs ne doivent jamais porter le préfixe NEXT_PUBLIC_ : le
 * `client_secret` et la clé de session sont lus exclusivement côté serveur, dans
 * les route handlers. Rien de tout cela n'atteint le navigateur.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    // Échouer au démarrage plutôt que de laisser une authentification
    // silencieusement inopérante en production.
    throw new Error(
      `Variable d'environnement manquante : ${name}. Voir .env.example.`,
    );
  }

  return value;
}

export const env = {
  /** api.vsrun.com — autorité d'identité. */
  vsrunApiUrl: () => process.env.VSRUN_API_URL ?? "https://api.vsrun.com",

  /** Client OAuth confidentiel de vsrun.live, créé sur api.vsrun.com. */
  oauthClientId: () => required("VSRUN_OAUTH_CLIENT_ID"),
  oauthClientSecret: () => required("VSRUN_OAUTH_CLIENT_SECRET"),

  /** Backend VSRUN LIVE, jamais appelé directement par le navigateur. */
  liveApiUrl: () => process.env.LIVE_API_URL ?? "http://localhost:8080",

  /** Origine publique de ce frontend, pour construire la redirect_uri. */
  appUrl: () => process.env.APP_URL ?? "http://localhost:3000",

  /** Clé de chiffrement du cookie de session (32 octets en base64). */
  sessionSecret: () => required("SESSION_SECRET"),

  isProduction: () => process.env.NODE_ENV === "production",
};

export function redirectUri(): string {
  return `${env.appUrl()}/api/auth/callback`;
}
