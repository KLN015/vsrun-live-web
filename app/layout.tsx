import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { allFontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "VSRUN LIVE",
  description: "Diffusion de résultats sportifs en direct",

  /**
   * Icône déclarée ici et non par le fichier `app/favicon.ico`.
   *
   * La convention par fichier s'ajoute à toutes les pages sans qu'aucune puisse
   * s'en défaire : une page habillée par une charte se retrouvait avec deux
   * icônes, et c'est celle de VSRUN qui l'emportait. Déclarée en métadonnées,
   * elle redevient un simple défaut, que les pages de charte remplacent.
   */
  icons: { icon: [{ url: "/favicon.ico" }] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      // Les polices de marque sont déclarées une fois ici : chaque page en
      // sélectionne ensuite une par variable CSS, sans rien recharger.
      className={cn("font-sans", geist.variable, allFontVariables)}
    >
      <body className="bg-background text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
