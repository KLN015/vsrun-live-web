# VSRUN LIVE — Frontend

Interface de [vsrun.live](https://vsrun.live). Next.js 16 · React 19 · TypeScript · Tailwind 4.

> Ce dépôt ne contient **aucune logique métier**. Les validations, les autorisations et les
> décisions de publication appartiennent à `vsrun-live-api`. Le frontend affiche et transmet.

---

## Le BFF, et pourquoi

Les jetons OAuth d'`api.vsrun.com` n'atteignent jamais le navigateur.

```
Navigateur                Next.js (serveur)              api.vsrun.com
    │                            │                              │
    │ /login                     │                              │
    ├───────────────────────────►│ génère state + code_verifier │
    │                            │ cookie chiffré, 10 min       │
    │◄──────── 302 ──────────────┤                              │
    ├─── GET /oauth/authorize ──────────────────────────────────►│
    │◄──────────── 302 /api/auth/callback?code=… ────────────────┤
    ├───────────────────────────►│ vérifie state                │
    │                            ├─ POST /oauth/token ─────────►│
    │                            │◄─── access + refresh token ──┤
    │◄─── cookie httpOnly ───────┤                              │
    │                            │
    │ appels dashboard           │      VSRUN LIVE API
    ├───────────────────────────►├─────────────────────►
    │   (aucun jeton)            │  Authorization: Bearer
```

Un XSS sur vsrun.live ne donne donc accès à aucun jeton VSRUN : ils vivent dans la charge
chiffrée d'un cookie `httpOnly` que seul le serveur peut lire.

| Fichier | Rôle |
|---|---|
| [`lib/session.ts`](lib/session.ts) | Cookie chiffré AES-256-GCM, `crypto` natif de Node |
| [`lib/oauth.ts`](lib/oauth.ts) | PKCE S256, échange du code, rafraîchissement |
| [`app/api/auth/*`](app/api/auth) | Démarrage, callback, rafraîchissement, déconnexion |
| [`app/api/vsrun/[...path]`](app/api/vsrun) | Proxy fin vers l'API, pour les composants client |

Le chiffrement de session utilise le `crypto` de Node plutôt qu'une bibliothèque tierce :
soixante lignes lisibles, aucune surface d'approvisionnement à surveiller sur la pièce la plus
sensible du système.

Deux détails qui ont leur importance dans le flux d'autorisation :

- **`scope` est vide.** Aucun scope n'est défini sur `api.vsrun.com` ; en demander un ferait
  échouer l'autorisation. Les applications iOS et Android font de même.
- **`view` n'est pas envoyé.** Le middleware `AuthViewRedirect` d'`api.vsrun.com` exécute
  `Auth::logout()` dès que ce paramètre est présent, ce qui casserait la session partagée
  avec vsrun.com.

---

## Démarrage

```bash
cp .env.example .env.local
# renseigner VSRUN_OAUTH_CLIENT_ID, VSRUN_OAUTH_CLIENT_SECRET
# et SESSION_SECRET (openssl rand -base64 32)

npm install
npm run dev
```

L'interface répond sur `http://localhost:3000` et attend l'API sur `http://localhost:8080`
(voir le README de `vsrun-live-api`).

### Créer le client OAuth

Sur `api.vsrun.com` :

```bash
php artisan passport:client
#   Nom          : VSRUN LIVE
#   Redirect URI : https://vsrun.live/api/auth/callback,http://localhost:3000/api/auth/callback
```

Un client **confidentiel** (avec secret) : ce frontend a un serveur, il n'y a pas de raison
d'utiliser un client public. Le secret ne doit exister que dans `.env.local`.

---

## Routes

### Spectateurs — sans compte

| Route | Contenu |
|---|---|
| `/` | Redirige vers `/events` : la racine appartient aux spectateurs |
| `/events` | Compétitions publiques, celles en direct d'abord |
| `/events/[slug]` | Fiche : programme, épreuves, nombre de résultats publiés |
| `/events/[slug]/results` | Résultats publiés, groupés par épreuve |

Ces pages passent par [`lib/public-api.ts`](lib/public-api.ts), **délibérément séparé** de
`lib/api.ts` : aucune session n'y est lue, aucun en-tête `Authorization` n'y est posé. Un appel
public ne peut donc pas emprunter par accident l'identité de l'utilisateur connecté et
rapporter des données qu'un spectateur anonyme ne verrait pas.

La page de résultats lit sans cache (`revalidate: 0`) : consultée en tribune pendant une
compétition, elle ne doit pas servir une version périmée. Le temps réel arrive en phase 8.

### Organisateurs

| Route | Contenu |
|---|---|
| `/login` | Aucun champ de mot de passe — renvoi vers le flux OAuth VSRUN |
| `/dashboard` | Organisations, création |
| `/dashboard/events` | Événements de toutes vos organisations |
| `/dashboard/events/new` | Création — brouillon et privé par défaut |
| `/dashboard/events/[id]` | Réglages : statut, visibilité, mode de publication |
| `/dashboard/events/[id]/disciplines` | Épreuves |
| `/dashboard/events/[id]/participants` | Concurrents |
| `/dashboard/events/[id]/ingestion` | Secrets de diffusion |
| `/dashboard/disciplines/[id]` | Résultats, publication unitaire ou en série |

Écart assumé par rapport au plan initial : `/dashboard/events/[id]/activities` est devenu
`/disciplines`. Dans `api.vsrun.com`, « activity » désigne un temps mesuré — soit un
*résultat* ici. Réutiliser le mot aurait garanti des confusions durables.

Les pages publiques (`/events`, `/events/[slug]`, `/display/[token]`) arrivent en phases 7 et 9.

---

## Conventions

- **Server Components** pour les lectures, **server actions** pour les écritures. Le
  navigateur ne fait pratiquement aucun appel réseau lui-même.
- **Les messages d'erreur viennent de Laravel.** Le frontend ne revalide pas les règles
  métier : il ne ferait que dupliquer une vérité qui vit ailleurs, et finirait par en diverger.
- **Un 404 de l'API reste un 404.** Une ressource appartenant à une organisation dont on n'est
  pas membre est indiscernable d'une ressource inexistante — c'est délibéré côté backend, et
  le frontend ne cherche pas à faire la différence.
- **shadcn/ui** pour les contrôles (`components/ui/`), copiés dans le dépôt et donc modifiables.
  [`components/layout.tsx`](components/layout.tsx) ajoute ce qui relève de l'agencement des
  pages, et [`components/form-select.tsx`](components/form-select.tsx) adapte le `Select` de
  Radix aux formulaires à server action — le composant rend un champ natif masqué dès qu'on lui
  donne un `name`, les valeurs arrivent donc normalement dans le `FormData`.
- **Les formulaires se vident après un enregistrement réussi.** Un chronométreur saisit les
  résultats à la chaîne : lui laisser la valeur précédente l'expose à la renvoyer par
  inadvertance.
