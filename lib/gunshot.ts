/**
 * Le coup de feu du départ.
 *
 * Deux contraintes de navigateur commandent ce fichier :
 *
 *   1. le son est bloqué tant que la page n'a pas reçu un geste de
 *      l'utilisateur. Un écran de tribune est ouvert puis laissé seul : on
 *      débloque donc l'audio au premier clic, quel qu'il soit, et on le garde
 *      débloqué ;
 *   2. `<audio>` réagit trop tard pour un départ de course. Le fichier est
 *      décodé à l'avance et joué par le graphe audio, dont la latence se compte
 *      en millisecondes.
 *
 * Faute de fichier, une synthèse prend le relais : mieux vaut une détonation
 * approximative que le silence sur la ligne de départ.
 */
let context: AudioContext | null = null;

/**
 * Les octets du fichier, puis le son décodé.
 *
 * Deux étapes séparées à dessein. Le téléchargement ne dépend pas du graphe
 * audio et peut avoir lieu dès l'ouverture de la page ; le décodage, lui,
 * réclame un contexte, et un contexte suspendu — celui d'une page qui n'a
 * encore reçu aucun geste — le rend au mieux tardif. Les confondre faisait
 * partir le premier départ à la synthèse, faute d'avoir eu le temps.
 *
 * `decodeAudioData` vide le tampon qu'on lui donne : on en décode toujours une
 * copie, sans quoi une seconde tentative n'aurait plus rien à lire.
 */
let bytes: ArrayBuffer | null = null;
let buffer: AudioBuffer | null = null;

let fetching: Promise<void> | null = null;
let decoding: Promise<void> | null = null;

/**
 * Le graphe audio est-il autorisé à sonner ?
 *
 * Faux tant que le navigateur n'a pas vu de geste sur la page. C'est ce qui
 * permet à l'écran de le **dire** plutôt que de rester silencieux au départ
 * d'une course sans que personne ne comprenne pourquoi.
 */
export function audioIsReady(): boolean {
  return context !== null && context.state === "running";
}

/**
 * Tente de débloquer le son, et rend l'état obtenu.
 *
 * À appeler sur un geste de l'utilisateur — sans quoi le navigateur refuse.
 * Appelée sans geste, elle échoue sans rien casser : c'est ainsi que l'écran
 * sait, au chargement, s'il doit réclamer un clic.
 */
export async function unlockAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  context ??= new (window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Aucun geste reçu : le navigateur refuse, et c'est son droit.
    }
  }

  void primeGunshot();

  return audioIsReady();
}

/**
 * Prépare le coup de feu : fichier téléchargé, son décodé, prêt à partir.
 *
 * À appeler dès qu'un départ se profile — au lancement du compte à rebours, et
 * non au « Go ». Cinq secondes de préavis suffisent largement, alors qu'au
 * moment du départ il ne reste rien.
 *
 * Idempotente, et surtout **réessayable** : un échec ne laisse pas de drapeau
 * qui interdirait la tentative suivante. C'est ce qui manquait — un décodage
 * refusé par un contexte encore suspendu condamnait la page à la synthèse.
 */
export async function primeGunshot(): Promise<void> {
  fetching ??= (async () => {
    try {
      const response = await fetch("/audio/gunshot.mp3");

      if (response.ok) {
        bytes = await response.arrayBuffer();
      }
    } catch {
      // Fichier absent ou illisible : la synthèse prendra le relais.
      fetching = null;
    }
  })();

  await fetching;

  if (buffer || !context || !bytes) return;

  decoding ??= (async () => {
    try {
      buffer = await context!.decodeAudioData(bytes!.slice(0));
    } catch {
      // Contexte encore suspendu, ou fichier illisible : on retentera.
      decoding = null;
    }
  })();

  await decoding;
}

export function fireGunshot(): void {
  void unlockAudio();

  if (!context) return;

  if (buffer) {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();

    return;
  }

  synthesise(context);
}

/**
 * Le bip d'un chiffre du compte à rebours.
 *
 * Synthétisé plutôt que chargé : c'est une sinusoïde de deux dixièmes de
 * seconde, et un fichier de plus à télécharger, décoder et tenir prêt n'aurait
 * rien apporté qu'une occasion supplémentaire d'arriver en retard.
 *
 * Il accompagne le chiffre affiché : le même signal, donné aux yeux et aux
 * oreilles en même temps. Un athlète en position de départ ne regarde pas
 * l'écran.
 *
 * Une seule note, identique à chaque chiffre — ce qui distingue le départ,
 * c'est le coup de feu qui suit, pas un bip plus aigu que les autres.
 */
export function beep(): void {
  void unlockAudio();

  if (!context || context.state !== "running") return;

  const now = context.currentTime;
  const duration = 0.18;

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;

  // Attaque et extinction douces : un créneau net produit un claquement qui
  // s'entend plus que la note elle-même sur une sono de stade.
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Détonation de synthèse : un bruit blanc très bref, saturé et filtré.
 *
 * Ce n'est pas un vrai pistolet, mais c'est net, sec, et cela part au bon
 * moment — les trois qualités qu'on demande à un signal de départ.
 */
function synthesise(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const duration = 0.35;

  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = noise.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = noise;

  // Enveloppe percussive : attaque immédiate, extinction rapide.
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);

  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2.2);
  }

  shaper.curve = curve;

  source.connect(shaper).connect(gain).connect(ctx.destination);
  source.start(now);
}
