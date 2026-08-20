import { redirect } from "next/navigation";

export default function Home() {
  // La racine appartient aux spectateurs : c'est eux, et non les organisateurs,
  // qui arrivent sur vsrun.live sans savoir où aller.
  redirect("/events");
}
