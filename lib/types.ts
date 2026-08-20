import type { Brand } from "./brand";

/**
 * Miroir des Resources de l'API VSRUN LIVE.
 *
 * Écrit à la main plutôt que généré : la surface est petite, et une définition
 * lisible vaut mieux ici qu'un schéma dérivé. À tenir à jour avec
 * `app/Http/Resources` côté Laravel.
 */

export type Paginated<T> = { data: T[] };
export type Wrapped<T> = { data: T };

export type OrganizationRole = "owner" | "admin" | "organizer" | "viewer";

export type UserReference = {
  id: string;
  vsrun_user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  picture_url: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  role?: OrganizationRole;
  members_count?: number;
  default_brand_id?: string | null;
};

/** Deux valeurs : une épreuve peut être mixte, une personne ne l'est pas. */
export type ParticipantGender = "M" | "F";

export const PARTICIPANT_GENDER_LABELS: Record<ParticipantGender, string> = {
  M: "Homme",
  F: "Femme",
};

export type OrganizationMember = {
  id: string;
  role: OrganizationRole;
  role_label: string;
  user?: UserReference;
  created_at: string | null;
};

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  organizer: "Organisateur",
  viewer: "Observateur",
};

/**
 * Rôles qu'on peut attribuer. `owner` en est absent : il ne se donne pas, il se
 * transfère — c'est la règle du serveur (`OrganizationRole::assignable`).
 */
export const ASSIGNABLE_ROLES: OrganizationRole[] = [
  "admin",
  "organizer",
  "viewer",
];

export type EventVisibility = "public" | "private";
export type EventStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "finished"
  | "archived";
export type PublicationMode = "manual" | "auto";

export type LiveEvent = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
  visibility: EventVisibility;
  status: EventStatus;
  status_label: string;
  publication_mode: PublicationMode;
  /** Nul : l'événement suit la charte par défaut de son organisation. */
  brand_id: string | null;
  is_publicly_visible: boolean;
  disciplines_count?: number;
  participants_count?: number;
};

export type DisciplineType =
  | "time"
  | "distance"
  | "height"
  | "points"
  | "custom";

export type Discipline = {
  id: string;
  event_id: string;
  source_id: string | null;
  name: string;
  type: DisciplineType;
  type_label: string;
  distance_m: number | null;
  /** Vent de la course, commun à tous ses concurrents. */
  wind: number | null;
  position: number;
  status: "pending" | "live" | "finished";
  status_label: string;

  scheduled_at: string | null;
  category: string | null;
  gender: DisciplineGender | null;
  gender_label: string | null;
  round: DisciplineRound | null;
  round_label: string | null;

  /** « CAF », « JUM », « TCX » : catégorie et genre recomposés. */
  category_code: string | null;

  /** Ce qui réunit les tours d'une même épreuve : nom, catégorie, genre. */
  group_key: string;
  /** Le titre du bloc : « Triple Saut TCM ». */
  group_label: string;

  origin: DisciplineOrigin;
  origin_label: string;
  merged_into_discipline_id: string | null;

  /**
   * Contexte transmis par l'application émettrice : `training`,
   * `training_date`, `training_id`. C'est ce qui distingue quatre séries
   * homonymes venues de quatre entraînements.
   */
  metadata: Record<string, string> | null;

  results_count?: number;

  /** Fenêtre de temps des chronos, pour reconnaître une série. */
  first_result_at?: string | null;
  last_result_at?: string | null;
};

export type DisciplineGender = "M" | "F" | "X";

export type DisciplineRound = "qualification" | "heat" | "semifinal" | "final";

/**
 * D'où vient une épreuve : écrite par l'organisateur, ou reçue d'une
 * application VSRUN et en attente de rattachement.
 */
export type DisciplineOrigin = "program" | "ingested";

export type Participant = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  bib: string | null;
  club: string | null;
  category: string | null;
  gender: ParticipantGender | null;
  gender_label: string | null;
  country: string | null;
};

export type Result = {
  id: string;
  discipline_id: string;
  participant_id: string | null;
  value: number;
  unit: string;
  display_value: string;
  rank: number | null;
  attempt: number | null;
  lane: number | null;
  wind: number | null;
  outcome: ResultOutcome;
  outcome_code: string;
  outcome_label: string;
  occurred_at: string | null;
  status: "draft" | "published";
  status_label: string;
  published_at: string | null;
  participant?: Participant;
};

export type IngestionSecret = {
  id: string;
  label: string | null;
  prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string | null;
};

/* ------------------------------------------------------------------ public */

export type PublicParticipant = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  bib: string | null;
  club: string | null;
  category: string | null;
  gender: ParticipantGender | null;
  gender_label: string | null;
  country: string | null;
};

export type PublicResult = {
  id: string;
  discipline_id: string;
  value: number;
  unit: string;
  display_value: string;
  rank: number | null;
  attempt: number | null;
  lane: number | null;
  wind: number | null;
  outcome: ResultOutcome;
  outcome_code: string;
  outcome_label: string;
  occurred_at: string | null;
  published_at: string | null;
  participant?: PublicParticipant;
};

export type PublicDiscipline = {
  id: string;
  name: string;
  type: DisciplineType;
  type_label: string;
  distance_m: number | null;
  /** Vent de la course, commun à tous ses concurrents. */
  wind: number | null;
  position: number;
  status: "pending" | "live" | "finished";
  status_label: string;

  scheduled_at: string | null;
  /** « CAF », « JUM », « TCX ». */
  category_code: string | null;

  /** Ce qui réunit les tours d'une même épreuve : nom, catégorie, genre. */
  group_key: string;
  /** Le titre du bloc : « Triple Saut TCM ». */
  group_label: string;
  gender_label: string | null;
  round_label: string | null;

  results_count?: number;
};

export type PublicVideo = {
  id: string;
  discipline_id: string | null;
  title: string;
  source_url: string;
  thumbnail_url: string | null;
  duration_ms: number | null;
};

export type PublicEvent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  start_at: string | null;
  end_at: string | null;
  status: EventStatus;
  status_label: string;
  organization?: { name: string; slug: string };
  disciplines?: PublicDiscipline[];
  disciplines_count?: number;
  videos?: PublicVideo[];
  /** Toujours présente : résolue événement → organisation → VSRUN. */
  brand: Brand;
};

/** Marque telle que la voit l'organisateur — avec son identifiant. */
export type ManagedBrand = Brand & { id: string; organization_id: string };

/**
 * Une police déposée par une organisation, vue du dashboard.
 *
 * `family` et `css_format` viennent du serveur : ce sont eux qu'écrit la règle
 * `@font-face`, jamais `name` — qui n'est qu'une étiquette pour s'y retrouver
 * dans la liste.
 */
export type ManagedFont = {
  id: string;
  organization_id: string;
  name: string;
  format: string;
  family: string;
  css_format: string;
  url: string;
  bytes: number;
  created_at: string | null;
};

/** Le catalogue embarqué, celui qu'on propose à côté des polices déposées. */
export const BRAND_FONT_LABELS: Record<string, string> = {
  inter: "Inter",
  geist: "Geist",
  roboto: "Roboto",
  montserrat: "Montserrat",
  oswald: "Oswald",
  "barlow-condensed": "Barlow Condensed",
  "bebas-neue": "Bebas Neue",
  "source-sans-3": "Source Sans 3",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmé",
  live: "En direct",
  finished: "Terminé",
  archived: "Archivé",
};

/**
 * Ce que vaut une performance : mesurée, ou empêchée.
 *
 * Vocabulaire des feuilles de résultats de la fédération — NM pour un essai
 * nul, DNF pour un abandon, DNS pour un absent, DQ pour une disqualification.
 */
export type ResultOutcome = "valid" | "nm" | "dnf" | "dns" | "dq" | "u";

export const RESULT_OUTCOME_LABELS: Record<ResultOutcome, string> = {
  valid: "Valide",
  nm: "Sans mesure (X ou NM)",
  dnf: "Abandon (DNF)",
  dns: "Absent (DNS)",
  dq: "Disqualifié (DQ)",
  u: "Non défini (U)",
};

export const DISCIPLINE_GENDER_LABELS: Record<DisciplineGender, string> = {
  M: "Hommes",
  F: "Femmes",
  X: "Mixte",
};

export const DISCIPLINE_ROUND_LABELS: Record<DisciplineRound, string> = {
  qualification: "Qualification",
  heat: "Série(s)",
  semifinal: "Demi-finale(s)",
  final: "Finale(s)",
};

export const DISCIPLINE_TYPE_LABELS: Record<DisciplineType, string> = {
  time: "Temps",
  distance: "Distance",
  height: "Hauteur",
  points: "Points",
  custom: "Personnalisé",
};

export type ManagedVideo = {
  id: string;
  event_id: string;
  discipline_id: string | null;
  title: string;
  source_url: string;
  is_hosted: boolean;
  thumbnail_url: string | null;
  duration_ms: number | null;
  status: "pending" | "ready" | "failed";
  status_label: string;
  visibility: "public" | "private";
  position: number;
};

/* ----------------------------------------------------------------- écrans */

export type DisplayLayout = "1" | "2h" | "2v" | "3" | "4";
export type DisplayContentType =
  | "discipline"
  | "latest_results"
  | "video"
  | "empty";

export type DisplayZoneConfig = {
  discipline_id?: string | null;
  video_id?: string | null;
  limit?: number;
  loop?: boolean;
  muted?: boolean;
};

export type DisplayZone = {
  position: number;
  content_type: DisplayContentType;
  content_type_label: string;
  config: DisplayZoneConfig;
};

export type Display = {
  id: string;
  event_id: string;
  name: string;
  layout: DisplayLayout;
  layout_label: string;
  zone_count: number;
  public_token: string;
  is_connected: boolean;
  last_seen_at: string | null;
  zones?: DisplayZone[];
  clock: Clock;
};

/** Zone telle que la reçoit l'écran : configuration *et* contenu résolu. */
export type RenderedZone = {
  position: number;
  content_type: DisplayContentType;
  config: DisplayZoneConfig;
  content:
    | { discipline: PublicDiscipline; results: PublicResult[] }
    | { results: PublicResult[] }
    | { video: PublicVideo; loop: boolean; muted: boolean }
    | null;
};

export type RenderedDisplay = {
  id: string;
  name: string;
  layout: DisplayLayout;
  event: { name: string; status: EventStatus };
  brand: Brand;
  zones: RenderedZone[];
  clock: Clock;
};

/**
 * L'état du chronomètre, tel que le serveur le transmet.
 *
 * Il ne porte pas le temps courant mais son **origine** : `elapsed_ms` est
 * daté de `server_time`, et l'écran poursuit le décompte lui-même. C'est ce qui
 * donne un affichage au centième sans qu'aucune image ne transite par le
 * réseau, et ce qui garde deux écrans d'accord entre eux.
 */
export type Clock = {
  running: boolean;
  elapsed_ms: number;
  countdown: {
    started_at: string;
    elapsed_ms: number;
    go_ms: number;
  } | null;
  /** Horloge du serveur à l'émission, pour corriger celle de l'écran. */
  server_time: string;
};

export const DISPLAY_LAYOUT_LABELS: Record<DisplayLayout, string> = {
  "1": "Plein écran",
  "2h": "Deux lignes",
  "2v": "Deux colonnes",
  "3": "Trois zones",
  "4": "Quatre zones",
};

export const DISPLAY_CONTENT_LABELS: Record<DisplayContentType, string> = {
  discipline: "Épreuve",
  latest_results: "Derniers résultats",
  video: "Vidéo",
  empty: "Vide",
};

/**
 * Grille CSS de chaque layout.
 *
 * Le découpage vit ici, en un seul endroit : l'écran réel et l'aperçu du
 * panneau de contrôle partagent le même composant, donc la même grille. Deux
 * définitions divergeraient au premier changement.
 */
export const DISPLAY_LAYOUT_GRID: Record<DisplayLayout, string> = {
  "1": "grid-cols-1 grid-rows-1",
  "2h": "grid-cols-1 grid-rows-2",
  "2v": "grid-cols-2 grid-rows-1",
  "3": "grid-cols-2 grid-rows-2",
  "4": "grid-cols-2 grid-rows-2",
};

/** En layout « 3 », la première zone occupe toute la hauteur de gauche. */
export const DISPLAY_ZONE_SPAN: Partial<Record<DisplayLayout, Record<number, string>>> = {
  "3": { 1: "row-span-2" },
};
