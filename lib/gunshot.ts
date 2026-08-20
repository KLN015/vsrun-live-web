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
let buffer: AudioBuffer | null = null;
let loading = false;

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

  if (!buffer && !loading) {
    loading = true;
    void load();
  }

  return audioIsReady();
}

async function load(): Promise<void> {
  if (!context) return;

  try {
    const response = await fetch("/audio/gunshot.mp3");

    if (response.ok) {
      buffer = await context.decodeAudioData(await response.arrayBuffer());
    }
  } catch {
    // Fichier absent ou illisible : la synthèse prendra le relais.
  }
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
