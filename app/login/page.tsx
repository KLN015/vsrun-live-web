import Link from "next/link";
import { VsrunLogo } from "@/components/vsrun-logo";

/**
 * Page de connexion.
 *
 * Il n'y a délibérément aucun champ de mot de passe : VSRUN LIVE ne détient
 * aucune identité. Le bouton renvoie vers le flux OAuth d'api.vsrun.com, où la
 * connexion a réellement lieu — par mot de passe, Apple ou Google.
 *
 * Fond sombre, comme les écrans de diffusion : c'est la même famille visuelle,
 * et c'est la première page que voit un organisateur. Le texte qui expliquait
 * le mécanisme a été retiré — personne ne se connecte pour lire d'où vient son
 * identité, et le bouton le dit déjà.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const { error, returnTo } = await searchParams;

  const loginHref = returnTo
    ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/api/auth/login";

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-10 p-6 text-neutral-50"
      style={{
        // Le dégradé du prototype : une lueur haute aux couleurs VSRUN, sur un
        // fond qui s'assombrit vers le bas.
        background: `
          radial-gradient(1100px 550px at 50% -10%, color-mix(in srgb, var(--vsrun-orange) 22%, transparent), transparent 62%),
          linear-gradient(180deg, #0a0a0a 0%, #000 100%)
        `,
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <VsrunLogo variant="dark" live size="lg" />

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Diffusez vos résultats en direct
        </h1>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        {error ? (
          <div
            role="alert"
            className="w-full rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200"
          >
            {error}
          </div>
        ) : null}

        <Link
          href={loginHref}
          className="flex h-12 w-full items-center justify-center rounded-full px-6 font-medium text-neutral-950 transition-transform hover:scale-[1.02]"
          style={{
            background: "var(--vsrun-orange)",
            boxShadow:
              "0 10px 40px color-mix(in srgb, var(--vsrun-orange) 35%, transparent)",
          }}
        >
          Se connecter avec VSRUN
        </Link>

        <Link
          href="/events"
          className="text-sm text-neutral-300 underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Voir les compétitions en direct
        </Link>
      </div>
    </main>
  );
}
