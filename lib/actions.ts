"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// Un module "use server" ne peut exporter que des fonctions asynchrones :
// tout le reste (types, classes) doit rester importé, jamais réexporté.
import { apiFetch, UnauthenticatedError } from "./api";
import { fromLocalInput } from "./datetime";

/**
 * Mutations du dashboard.
 *
 * Chacune se contente de relayer vers Laravel puis d'invalider le cache de la
 * page concernée. Aucune règle métier ici : les validations, les autorisations
 * et les décisions de publication appartiennent au backend. Les messages
 * d'erreur remontés sont ceux que Laravel a produits.
 */

export type ActionState = { error?: string; success?: string };

/**
 * Comme `send`, mais rend aussi le corps de la réponse.
 *
 * La plupart des mutations n'ont rien à en tirer : elles réussissent ou elles
 * échouent. L'import fait exception — son résultat est un décompte, et le
 * message affiché en dépend.
 */
async function sendForResult(
  path: string,
  init: RequestInit,
  returnTo: string,
): Promise<ActionState & { body?: unknown }> {
  const state = await send(path, init, returnTo, (body) => body);

  return state;
}

async function send(
  path: string,
  init: RequestInit,
  returnTo: string,
  capture?: (body: unknown) => unknown,
): Promise<ActionState & { body?: unknown }> {
  let response: Response;

  try {
    response = await apiFetch(path, init);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect(
        `${error.needsRefresh ? "/api/auth/refresh" : "/login"}?returnTo=${encodeURIComponent(returnTo)}`,
      );
    }

    throw error;
  }

  if (response.ok) {
    if (!capture) return {};

    try {
      return { body: capture(await response.json()) };
    } catch {
      // Réponse sans corps JSON : l'appelant s'en accommodera.
      return {};
    }
  }

  return { error: await describeFailure(response) };
}

/**
 * Traduit une réponse d'erreur de Laravel en un message affichable.
 *
 * Les erreurs de validation (422) sont aplaties : l'utilisateur veut lire ce
 * qui ne va pas, pas un objet imbriqué.
 */
async function describeFailure(response: Response): Promise<string> {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    // Réponse sans corps JSON exploitable.
  }

  const payload = body as
    | { message?: string; errors?: Record<string, string[]> }
    | null;

  if (payload?.errors) {
    return Object.values(payload.errors).flat().join(" ");
  }

  if (payload?.message) {
    return payload.message;
  }

  return `L'API a répondu ${response.status}.`;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function text(form: FormData, field: string): string | undefined {
  const value = form.get(field);

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

// ---------------------------------------------------------------- organisations

export async function createOrganization(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const result = await send(
    "/organizations",
    json({ name: text(form, "name") }),
    "/dashboard",
  );

  if (result.error) return result;

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// -------------------------------------------------------------------- événements

export async function addOrganizationMember(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const organizationId = text(form, "organization_id");
  const back = `/dashboard/organizations/${organizationId}`;

  const result = await send(
    `/organizations/${organizationId}/members`,
    json({
      identifier: text(form, "identifier"),
      role: text(form, "role") ?? "organizer",
    }),
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Membre ajouté." };
}

export async function updateOrganizationMember(form: FormData): Promise<void> {
  const organizationId = text(form, "organization_id");
  const memberId = text(form, "member_id");
  const back = `/dashboard/organizations/${organizationId}`;

  await send(
    `/organizations/${organizationId}/members/${memberId}`,
    { ...json({ role: text(form, "role") }), method: "PATCH" },
    back,
  );
  revalidatePath(back);
}

export async function removeOrganizationMember(form: FormData): Promise<void> {
  const organizationId = text(form, "organization_id");
  const memberId = text(form, "member_id");
  const back = `/dashboard/organizations/${organizationId}`;

  await send(
    `/organizations/${organizationId}/members/${memberId}`,
    { method: "DELETE" },
    back,
  );
  revalidatePath(back);
}

/**
 * Suppression d'un événement.
 *
 * Définitive : contrairement à une épreuve, un événement n'est pas seulement
 * masqué — il emporte en base ses épreuves, ses résultats, ses participants,
 * ses écrans et ses vidéos. D'où la fenêtre de confirmation qui l'ouvre, et le
 * retour à la liste : la page qu'on regardait n'existe plus.
 */
export async function deleteEvent(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");

  const result = await send(
    `/events/${eventId}`,
    { method: "DELETE" },
    `/dashboard/events/${eventId}`,
  );

  if (result.error) return result;

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function createEvent(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const organizationId = text(form, "organization_id");

  const result = await send(
    `/organizations/${organizationId}/events`,
    json({
      name: text(form, "name"),
      description: text(form, "description"),
      location: text(form, "location"),
      start_at: fromLocalInput(text(form, "start_at")),
      end_at: fromLocalInput(text(form, "end_at")),
      visibility: text(form, "visibility") ?? "private",
      publication_mode: text(form, "publication_mode") ?? "manual",
      attachment_mode: text(form, "attachment_mode") ?? "manual",
    }),
    "/dashboard/events/new",
  );

  if (result.error) return result;

  revalidatePath("/dashboard/events");
  redirect("/dashboard/events");
}

export async function updateEvent(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");

  const result = await send(
    `/events/${eventId}`,
    {
      ...json({
        name: text(form, "name"),
        description: text(form, "description") ?? null,
        location: text(form, "location") ?? null,
        start_at: fromLocalInput(text(form, "start_at")),
        end_at: fromLocalInput(text(form, "end_at")),
        visibility: text(form, "visibility"),
        status: text(form, "status"),
        publication_mode: text(form, "publication_mode"),
        attachment_mode: text(form, "attachment_mode"),
        // Vide : l'événement retombe sur la charte par défaut de son
        // organisation.
        brand_id: text(form, "brand_id") || null,
      }),
      method: "PATCH",
    },
    `/dashboard/events/${eventId}`,
  );

  if (result.error) return result;

  revalidatePath(`/dashboard/events/${eventId}`);

  return { success: "Événement mis à jour." };
}

// -------------------------------------------------------------------- épreuves

export async function createDiscipline(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");

  const result = await send(
    `/events/${eventId}/disciplines`,
    json({
      name: text(form, "name"),
      type: text(form, "type") ?? "time",
      distance_m: text(form, "distance_m")
        ? Number(text(form, "distance_m"))
        : null,

      // Les quatre champs du programme. Vides pour un entraînement diffusé,
      // qui n'a ni horaire ni catégorie.
      scheduled_at: fromLocalInput(text(form, "scheduled_at")),
      category: text(form, "category") ?? null,
      gender: text(form, "gender") ?? null,
      round: text(form, "round") ?? null,
    }),
    `/dashboard/events/${eventId}/disciplines`,
  );

  if (result.error) return result;

  revalidatePath(`/dashboard/events/${eventId}/disciplines`);

  return { success: "Épreuve créée." };
}

export async function updateDiscipline(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const disciplineId = text(form, "discipline_id");
  const back = `/dashboard/disciplines/${disciplineId}`;

  const result = await send(
    `/disciplines/${disciplineId}`,
    {
      ...json({
        name: text(form, "name"),
        distance_m: text(form, "distance_m")
          ? Number(text(form, "distance_m"))
          : null,
        wind: text(form, "wind") ? Number(text(form, "wind")) : null,
        status: text(form, "status"),
        scheduled_at: fromLocalInput(text(form, "scheduled_at")),
        category: text(form, "category") ?? null,
        gender: text(form, "gender") ?? null,
        round: text(form, "round") ?? null,
      }),
      method: "PATCH",
    },
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Épreuve mise à jour." };
}

export async function deleteDiscipline(form: FormData): Promise<void> {
  const disciplineId = text(form, "discipline_id");
  const eventId = text(form, "event_id");
  const back = `/dashboard/events/${eventId}/disciplines`;

  // Suppression réversible côté serveur : l'épreuve et ses résultats sont
  // masqués, pas effacés.
  await send(`/disciplines/${disciplineId}`, { method: "DELETE" }, back);
  revalidatePath(back);
}

export async function attachDiscipline(form: FormData): Promise<void> {
  const disciplineId = text(form, "discipline_id");
  const targetId = text(form, "target_discipline_id");
  const eventId = text(form, "event_id");
  const back = `/dashboard/events/${eventId}/disciplines`;

  await send(
    `/disciplines/${disciplineId}/attach`,
    json({ discipline_id: targetId }),
    back,
  );
  revalidatePath(back);
}

export async function detachDiscipline(form: FormData): Promise<void> {
  const disciplineId = text(form, "discipline_id");
  const eventId = text(form, "event_id");
  const back = `/dashboard/events/${eventId}/disciplines`;

  await send(`/disciplines/${disciplineId}/attach`, { method: "DELETE" }, back);
  revalidatePath(back);
}

// ---------------------------------------------------------------- participants

/**
 * Import d'une liste d'engagés depuis un tableur.
 *
 * Le fichier voyage en multipart, comme les logos : JSON ne sait pas porter un
 * fichier. L'API répond par un décompte et la liste des lignes refusées — le
 * message rend les deux, car un import à moitié réussi n'est ni un succès ni
 * un échec, et le secrétariat doit savoir quoi corriger.
 */
export async function importParticipants(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");
  const path = `/dashboard/events/${eventId}/participants`;

  const response = await sendForResult(
    `/events/${eventId}/participants/import`,
    { method: "POST", body: mediaPayload(form, ["event_id"]) },
    path,
  );

  if (response.error) return response;

  const body = response.body as
    | { imported?: number; rejected?: { line: number }[] }
    | null;

  const imported = body?.imported ?? 0;
  const rejected = body?.rejected ?? [];

  revalidatePath(path);

  if (rejected.length > 0) {
    const lines = rejected.map((row) => row.line).join(", ");

    return {
      success: `${imported} engagé(s) importé(s). Lignes non retenues : ${lines}.`,
    };
  }

  return { success: `${imported} engagé(s) importé(s).` };
}

export async function createParticipant(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");

  const result = await send(
    `/events/${eventId}/participants`,
    json({
      first_name: text(form, "first_name"),
      last_name: text(form, "last_name"),
      bib: text(form, "bib"),
      club: text(form, "club"),
      category: text(form, "category"),
      gender: text(form, "gender") || null,
      country: text(form, "country"),
    }),
    `/dashboard/events/${eventId}/participants`,
  );

  if (result.error) return result;

  revalidatePath(`/dashboard/events/${eventId}/participants`);

  return { success: "Participant ajouté." };
}

// -------------------------------------------------------------------- résultats

export async function updateParticipant(form: FormData): Promise<void> {
  const participantId = text(form, "participant_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(
    `/participants/${participantId}`,
    {
      ...json({
        display_name: text(form, "display_name"),
        bib: text(form, "bib") ?? null,
        club: text(form, "club") ?? null,
        country: text(form, "country") ?? null,
        category: text(form, "category") ?? null,
        gender: text(form, "gender") || null,
      }),
      method: "PATCH",
    },
    back,
  );

  revalidatePath(back);
}

/**
 * Suppression d'un engagé.
 *
 * Ses résultats déjà enregistrés survivent, détachés : effacer un concurrent
 * n'efface pas des performances validées. C'est le serveur qui en décide, pas
 * cette action.
 */
export async function deleteParticipant(form: FormData): Promise<void> {
  const participantId = text(form, "participant_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/participants/${participantId}`, { method: "DELETE" }, back);
  revalidatePath(back);
}

/**
 * Tout ce qui se corrige sur un résultat depuis sa ligne.
 *
 * Un seul aller-retour pour l'athlète, la performance, le couloir, le vent et
 * la validité : ce sont les gestes d'un juge en bord de piste, et les séparer
 * multiplierait les enregistrements pour une même correction.
 */
export async function updateResultDetails(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const resultId = text(form, "result_id");
  const back = text(form, "back") ?? "/dashboard";

  const result = await send(
    `/results/${resultId}`,
    {
      ...json({
        participant_id: text(form, "participant_id") || null,
        value: text(form, "value") ? Number(text(form, "value")) : undefined,
        lane: text(form, "lane") ? Number(text(form, "lane")) : null,
        attempt: text(form, "attempt") ? Number(text(form, "attempt")) : null,
        wind: text(form, "wind") ? Number(text(form, "wind")) : null,
        outcome: text(form, "outcome") ?? "valid",
      }),
      method: "PATCH",
    },
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Résultat mis à jour." };
}

export async function createResult(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const disciplineId = text(form, "discipline_id");

  const result = await send(
    `/disciplines/${disciplineId}/results`,
    json({
      participant_id: text(form, "participant_id") ?? null,
      value: Number(text(form, "value")),
      unit: text(form, "unit"),
      lane: text(form, "lane") ? Number(text(form, "lane")) : null,
      attempt: text(form, "attempt") ? Number(text(form, "attempt")) : null,
      wind: text(form, "wind") ? Number(text(form, "wind")) : null,
      outcome: text(form, "outcome") ?? "valid",
    }),
    `/dashboard/disciplines/${disciplineId}`,
  );

  if (result.error) return result;

  revalidatePath(`/dashboard/disciplines/${disciplineId}`);

  return { success: "Résultat enregistré en brouillon." };
}

export async function deleteResult(form: FormData): Promise<void> {
  const resultId = text(form, "result_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/results/${resultId}`, { method: "DELETE" }, back);
  revalidatePath(back);
}

export async function publishResult(form: FormData): Promise<void> {
  const resultId = text(form, "result_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/results/${resultId}/publish`, { method: "POST" }, back);
  revalidatePath(back);
}

export async function unpublishResult(form: FormData): Promise<void> {
  const resultId = text(form, "result_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/results/${resultId}/unpublish`, { method: "POST" }, back);
  revalidatePath(back);
}

export async function publishAllResults(form: FormData): Promise<void> {
  const disciplineId = text(form, "discipline_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(
    `/disciplines/${disciplineId}/results/publish-all`,
    { method: "POST" },
    back,
  );
  revalidatePath(back);
}

// ------------------------------------------------------- secrets de diffusion

/**
 * Le jeton en clair n'existe que dans cette réponse : il est remonté à la page
 * pour être affiché une fois, et n'est jamais stocké côté frontend.
 */
export async function issueIngestionSecret(
  _state: ActionState & { token?: string },
  form: FormData,
): Promise<ActionState & { token?: string }> {
  const eventId = text(form, "event_id");
  const back = `/dashboard/events/${eventId}/ingestion`;

  let response: Response;

  try {
    response = await apiFetch(
      `/events/${eventId}/ingestion-secrets`,
      json({ label: text(form, "label") }),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect(
        `${error.needsRefresh ? "/api/auth/refresh" : "/login"}?returnTo=${encodeURIComponent(back)}`,
      );
    }

    throw error;
  }

  if (!response.ok) {
    return { error: await describeFailure(response) };
  }

  const created = (await response.json()) as { token: string };

  revalidatePath(back);

  return {
    token: created.token,
    success: "Secret généré. Copiez-le maintenant : il ne sera plus affiché.",
  };
}

export async function revokeIngestionSecret(form: FormData): Promise<void> {
  const eventId = text(form, "event_id");
  const secretId = text(form, "secret_id");
  const back = `/dashboard/events/${eventId}/ingestion`;

  await send(
    `/events/${eventId}/ingestion-secrets/${secretId}`,
    { method: "DELETE" },
    back,
  );
  revalidatePath(back);
}

// ---------------------------------------------------------------- écrans

/**
 * Pilote le chronomètre d'un événement.
 *
 * Aucun temps n'est envoyé par le navigateur : seulement l'intention. C'est le
 * serveur qui date le geste, faute de quoi deux organisateurs aux horloges
 * différentes produiraient deux chronomètres différents.
 */
export async function driveClock(form: FormData): Promise<void> {
  const displayId = text(form, "display_id");
  const eventId = text(form, "event_id");
  const back = `/dashboard/events/${eventId}/displays`;

  await send(
    `/displays/${displayId}/clock`,
    json({
      action: text(form, "clock_action"),
      go_ms: text(form, "go_ms") ? Number(text(form, "go_ms")) : null,
    }),
    back,
  );
  revalidatePath(back);
}

export async function createDisplay(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");

  const result = await send(
    `/events/${eventId}/displays`,
    json({ name: text(form, "name"), layout: text(form, "layout") ?? "1" }),
    `/dashboard/events/${eventId}/displays`,
  );

  if (result.error) return result;

  revalidatePath(`/dashboard/events/${eventId}/displays`);

  return { success: "Écran créé." };
}

export async function updateDisplayLayout(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const displayId = text(form, "display_id");
  const back = text(form, "back") ?? "/dashboard";

  const result = await send(
    `/displays/${displayId}`,
    {
      ...json({
        name: text(form, "name"),
        layout: text(form, "layout"),
      }),
      method: "PATCH",
    },
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Écran mis à jour." };
}

/**
 * Enregistre la configuration complète des zones.
 *
 * Le formulaire envoie une entrée par zone (`zone_1_content_type`, …) : on les
 * recompose ici en un tableau, puisque l'API remplace la configuration en bloc.
 */
export async function updateDisplayZones(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const displayId = text(form, "display_id");
  const back = text(form, "back") ?? "/dashboard";
  const zoneCount = Number(text(form, "zone_count") ?? 1);

  // Le découpage libre est le seul où la zone porte sa place ; ailleurs, l'API
  // refuse ces champs plutôt que de laisser des coordonnées sans effet en base.
  const free = text(form, "layout") === "free";

  const zones = Array.from({ length: zoneCount }, (_, index) => {
    const position = index + 1;
    const contentType = text(form, `zone_${position}_content_type`) ?? "empty";
    const disciplineId = text(form, `zone_${position}_discipline_id`);
    const limit = text(form, `zone_${position}_limit`);

    const config: Record<string, unknown> = {};

    if (contentType === "discipline") {
      config.discipline_id = disciplineId ?? null;
    }

    if (contentType === "video") {
      config.video_id = text(form, `zone_${position}_video_id`) ?? null;
    }

    if (contentType === "latest_results") {
      config.discipline_id = disciplineId ?? null;
      if (limit) config.limit = Number(limit);
    }

    const geometry = free
      ? {
          x: Number(text(form, `zone_${position}_x`) ?? 0),
          y: Number(text(form, `zone_${position}_y`) ?? 0),
          width: Number(text(form, `zone_${position}_width`) ?? 0),
          height: Number(text(form, `zone_${position}_height`) ?? 0),
        }
      : {};

    return { position, content_type: contentType, config, ...geometry };
  });

  const result = await send(
    `/displays/${displayId}/zones`,
    { ...json({ zones }), method: "PUT" },
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Configuration envoyée aux écrans." };
}

// ------------------------------------------------------- visuels d'écran

/**
 * Dépose un visuel pour l'événement.
 *
 * En multipart, comme les chartes : JSON ne sait pas porter un fichier.
 */
export async function uploadEventImage(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");
  const back = text(form, "back") ?? "/dashboard";

  const result = await send(
    `/events/${eventId}/images`,
    { method: "POST", body: mediaPayload(form, ["event_id", "back"]) },
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Visuel enregistré." };
}

export async function deleteEventImage(form: FormData): Promise<void> {
  const imageId = text(form, "image_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/images/${imageId}`, { method: "DELETE" }, back);
  revalidatePath(back);
}

/**
 * Met un visuel à l'écran, ou l'en retire.
 *
 * Un seul geste, sans passer par la configuration des zones : c'est le propre
 * de cette fonction — on l'utilise pendant la compétition, entre deux séries,
 * et le carton doit apparaître au clic.
 *
 * `image_id` vide signifie « retirer » : le même formulaire sert donc au
 * bouton de chaque visuel et à celui qui rend l'écran à sa composition.
 */
export async function showDisplayImage(form: FormData): Promise<void> {
  const displayId = text(form, "display_id");
  const imageId = text(form, "image_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(
    `/displays/${displayId}/image`,
    imageId
      ? { ...json({ image_id: imageId }), method: "PUT" }
      : { method: "DELETE" },
    back,
  );

  revalidatePath(back);
}

/**
 * Lance l'emote de l'événement, ou la retire.
 *
 * Le même formulaire pour les deux : un identifiant vide retire. C'est ce qui
 * permet à la grille de vignettes de n'avoir qu'un seul geste — celle qui est
 * à l'écran comme celle qui n'y est pas se cliquent pareil.
 */
export async function showEventEmote(form: FormData): Promise<void> {
  const eventId = text(form, "event_id");
  const imageId = text(form, "image_id");
  const duration = text(form, "duration_ms");
  const back = text(form, "back") ?? "/dashboard";

  await send(
    `/events/${eventId}/emote`,
    imageId
      ? {
          // Durée vide : « jusqu'au retrait ». C'est l'absence de valeur qui
          // porte le sens, pas un zéro — l'API distingue les deux.
          ...json({
            image_id: imageId,
            duration_ms: duration ? Number(duration) : null,
          }),
          method: "PUT",
        }
      : { method: "DELETE" },
    back,
  );

  revalidatePath(back);
}

export async function rotateDisplayToken(form: FormData): Promise<void> {
  const displayId = text(form, "display_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/displays/${displayId}/rotate-token`, { method: "POST" }, back);
  revalidatePath(back);
}

export async function deleteDisplay(form: FormData): Promise<void> {
  const displayId = text(form, "display_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/displays/${displayId}`, { method: "DELETE" }, back);
  revalidatePath(back);
}

// ---------------------------------------------------------------- branding

export async function createBrand(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const organizationId = text(form, "organization_id");

  const payload = mediaPayload(form, ["organization_id"]);
  expandFontChoices(payload);

  const result = await send(
    `/organizations/${organizationId}/brands`,
    { method: "POST", body: payload },
    "/dashboard/branding",
  );

  if (result.error) return result;

  revalidatePath("/dashboard/branding");

  return { success: "Charte créée." };
}

/**
 * Recopie un formulaire pour l'envoyer tel quel, fichiers compris.
 *
 * JSON ne sait pas porter un fichier : les chartes sont donc les seules à
 * voyager en multipart. C'est aussi pour cela que Laravel les reçoit en POST —
 * PHP ne lit pas le corps multipart d'un PATCH.
 */
function mediaPayload(form: FormData, skip: string[]): FormData {
  const payload = new FormData();

  for (const [key, value] of form.entries()) {
    if (skip.includes(key)) continue;

    // Un champ fichier laissé vide arrive comme un fichier de zéro octet, que
    // la validation « image » rejetterait.
    if (value instanceof File && value.size === 0) continue;

    payload.append(key, value);
  }

  return payload;
}

/**
 * Traduit les choix de police du formulaire en champs d'API.
 *
 * Le formulaire ne propose qu'une liste par emplacement — c'est la seule
 * question que se pose un organisateur : « quelle police pour les titres ? ».
 * L'API, elle, distingue la famille de catalogue et la police déposée, parce
 * qu'elle garde la première en repli si la seconde disparaît.
 *
 * Choisir une police déposée n'écrase donc pas le repli : on ne renseigne que
 * l'identifiant. Revenir au catalogue efface l'identifiant explicitement — un
 * champ absent, en multipart, signifie « inchangé ».
 */
function expandFontChoices(payload: FormData): void {
  for (const slot of ["heading", "body", "numeric"] as const) {
    const choice = payload.get(`${slot}_font_choice`);

    payload.delete(`${slot}_font_choice`);

    if (typeof choice !== "string") continue;

    const separator = choice.indexOf(":");

    if (separator === -1) continue;

    const source = choice.slice(0, separator);
    const value = choice.slice(separator + 1);

    if (source === "custom") {
      payload.set(`${slot}_font_id`, value);
      continue;
    }

    payload.set(`${slot}_font`, value);
    payload.set(`${slot}_font_id`, "");
  }
}

export async function updateBrand(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const brandId = text(form, "brand_id");

  const payload = mediaPayload(form, ["brand_id"]);
  expandFontChoices(payload);

  const result = await send(
    `/brands/${brandId}`,
    { method: "POST", body: payload },
    "/dashboard/branding",
  );

  if (result.error) return result;

  revalidatePath("/dashboard/branding");

  return { success: "Charte mise à jour." };
}

/**
 * La charte par défaut d'une organisation.
 *
 * Celle qu'appliquent les événements qui n'en choisissent pas une eux-mêmes.
 * Vide : c'est l'identité VSRUN qui sert.
 */
/**
 * Suppression d'une organisation.
 *
 * L'action la moins réversible du produit : elle emporte tous ses événements
 * et, avec eux, les résultats déjà diffusés publiquement. Le serveur la réserve
 * au propriétaire ; on demande ici de recopier le nom, parce qu'un bouton seul
 * ne distingue pas une intention d'un clic de trop.
 *
 * Cette vérification est de l'ordre de l'interface, pas de la règle métier :
 * elle protège d'un geste, pas d'un appel d'API — que la policy, elle, garde.
 */
export async function deleteOrganization(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const organizationId = text(form, "organization_id");
  const name = text(form, "name");
  const confirmation = text(form, "confirmation");

  if (confirmation?.trim() !== name) {
    return { error: `Recopiez « ${name} » pour confirmer la suppression.` };
  }

  const result = await send(
    `/organizations/${organizationId}`,
    { method: "DELETE" },
    `/dashboard/organizations/${organizationId}`,
  );

  if (result.error) return result;

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateOrganizationBranding(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const organizationId = text(form, "organization_id");

  const result = await send(
    `/organizations/${organizationId}/branding`,
    {
      ...json({ default_brand_id: text(form, "default_brand_id") || null }),
      method: "PATCH",
    },
    "/dashboard/branding",
  );

  if (result.error) return result;

  revalidatePath("/dashboard/branding");

  return { success: "Charte par défaut enregistrée." };
}

export async function deleteBrand(form: FormData): Promise<void> {
  const brandId = text(form, "brand_id");

  await send(`/brands/${brandId}`, { method: "DELETE" }, "/dashboard/branding");
  revalidatePath("/dashboard/branding");
}

/**
 * Dépôt d'une police.
 *
 * Le fichier voyage tel quel : contrairement à un logo, une police n'est pas
 * ré-encodée au stockage — il n'existe pas d'équivalent de GD pour une fonderie.
 * Le contrôle est fait par l'API, sur les premiers octets du fichier.
 */
export async function uploadFont(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const organizationId = text(form, "organization_id");

  const result = await send(
    `/organizations/${organizationId}/fonts`,
    { method: "POST", body: mediaPayload(form, ["organization_id"]) },
    "/dashboard/branding",
  );

  if (result.error) return result;

  revalidatePath("/dashboard/branding");

  return { success: "Police déposée." };
}

export async function deleteFont(form: FormData): Promise<void> {
  const fontId = text(form, "font_id");

  // Les chartes qui l'employaient retombent sur leur police de catalogue :
  // aucune ne se retrouve sans police, aucun écran sans texte.
  await send(`/fonts/${fontId}`, { method: "DELETE" }, "/dashboard/branding");
  revalidatePath("/dashboard/branding");
}

// ----------------------------------------------------------------- vidéos

/**
 * Ajout d'une vidéo.
 *
 * Le `FormData` est transmis tel quel, sans passer par JSON : un fichier vidéo
 * peut peser des centaines de mégaoctets, il n'a rien à faire dans une chaîne
 * encodée en base64.
 */
export async function createVideo(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const eventId = text(form, "event_id");
  const back = `/dashboard/events/${eventId}/videos`;

  // Le navigateur pose lui-même le Content-Type multipart avec sa frontière ;
  // l'imposer ici casserait l'envoi.
  const payload = new FormData();

  for (const [key, value] of form.entries()) {
    if (key === "event_id") continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (value instanceof File && value.size === 0) continue;

    payload.append(key, value);
  }

  const result = await send(
    `/events/${eventId}/videos`,
    { method: "POST", body: payload },
    back,
  );

  if (result.error) return result;

  revalidatePath(back);

  return { success: "Vidéo ajoutée." };
}

export async function updateVideoVisibility(form: FormData): Promise<void> {
  const videoId = text(form, "video_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(
    `/videos/${videoId}`,
    {
      ...json({ visibility: text(form, "visibility") }),
      method: "PATCH",
    },
    back,
  );
  revalidatePath(back);
}

export async function deleteVideo(form: FormData): Promise<void> {
  const videoId = text(form, "video_id");
  const back = text(form, "back") ?? "/dashboard";

  await send(`/videos/${videoId}`, { method: "DELETE" }, back);
  revalidatePath(back);
}
