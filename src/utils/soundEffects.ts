// Web Audio API Retro JRPG Sound Synthesizer
// Generates authentic 16-bit sound effects tailored specifically to each damage type

import { DamageType } from '../types/combat.ts';

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function playMenuBlip(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Ignore audio errors
  }
}

// 1. ESPADAZO / CORTANTE: Blade whoosh and sharp metal slash
export function playSlashSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Noise burst for blade impact
    const noiseBuffer = createNoiseBuffer(ctx, 0.15);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);

    // Sharp blade transient
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.linearRampToValueAtTime(0.01, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    // Ignore audio errors
  }
}

// 2. FUEGO: Roaring combustion whoosh, flame burst and crackle
export function playFireSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Combustion bass roar
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(95, now);
    bass.frequency.exponentialRampToValueAtTime(35, now + 0.22);
    bassGain.gain.setValueAtTime(0.35, now);
    bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.22);

    // Roaring flame wind noise
    const noiseBuffer = createNoiseBuffer(ctx, 0.25);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(1100, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.24);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.25);

    // Crackle spark pop
    const crackle = ctx.createOscillator();
    const crackleGain = ctx.createGain();
    crackle.type = 'square';
    crackle.frequency.setValueAtTime(800, now + 0.05);
    crackle.frequency.exponentialRampToValueAtTime(180, now + 0.12);
    crackleGain.gain.setValueAtTime(0.12, now + 0.05);
    crackleGain.gain.linearRampToValueAtTime(0.001, now + 0.12);
    crackle.connect(crackleGain);
    crackleGain.connect(ctx.destination);
    crackle.start(now + 0.05);
    crackle.stop(now + 0.12);
  } catch {
    // Ignore audio errors
  }
}

// 3. FRÍO / HIELO: Freezing crystalline chime and shattering frost
export function playColdSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // High crystalline chimes
    const freqs = [1760, 2093, 2637, 3136];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + idx * 0.03 + 0.18);

      gain.gain.setValueAtTime(0.15, now + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + idx * 0.03 + 0.2);
    });

    // Glassy frost shatter noise
    const noiseBuffer = createNoiseBuffer(ctx, 0.18);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.18);
  } catch {
    // Ignore audio errors
  }
}

// 4. RAYO: Electric arc, high-voltage spark zap
export function playLightningSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Electric buzz zap (sawtooth with rapid pitch fall)
    const zap = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zap.type = 'sawtooth';
    zap.frequency.setValueAtTime(420, now);
    zap.frequency.exponentialRampToValueAtTime(75, now + 0.16);

    zapGain.gain.setValueAtTime(0.35, now);
    zapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    zap.connect(zapGain);
    zapGain.connect(ctx.destination);
    zap.start(now);
    zap.stop(now + 0.16);

    // Sharp electrostatic pop
    const noiseBuffer = createNoiseBuffer(ctx, 0.14);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.14);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.14);
  } catch {
    // Ignore audio errors
  }
}

// 5. TRUENO: Deep concussive sonic blast and booming thunderclap
export function playThunderSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Heavy sonic boom drop
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(140, now);
    boom.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    boomGain.gain.setValueAtTime(0.45, now);
    boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    boom.connect(boomGain);
    boomGain.connect(ctx.destination);
    boom.start(now);
    boom.stop(now + 0.35);

    // Low rumble noise tail
    const noiseBuffer = createNoiseBuffer(ctx, 0.38);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.36);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.3, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.36);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.38);
  } catch {
    // Ignore audio errors
  }
}

// 6. CONTUNDENTE: Heavy crushing blunt impact / warhammer thud
export function playBludgeoningSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low crushing thud
    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(160, now);
    punch.frequency.exponentialRampToValueAtTime(38, now + 0.14);

    punchGain.gain.setValueAtTime(0.42, now);
    punchGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    punch.connect(punchGain);
    punchGain.connect(ctx.destination);
    punch.start(now);
    punch.stop(now + 0.14);

    // Heavy blunt thump noise
    const noiseBuffer = createNoiseBuffer(ctx, 0.12);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.35, now);
    nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.12);
  } catch {
    // Ignore audio errors
  }
}

// 7. PERFORANTE: Whistling arrow flight & acute puncture snap
export function playPiercingSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Projectile whiz
    const whiz = ctx.createOscillator();
    const whizGain = ctx.createGain();
    whiz.type = 'sine';
    whiz.frequency.setValueAtTime(1100, now);
    whiz.frequency.exponentialRampToValueAtTime(350, now + 0.05);

    whizGain.gain.setValueAtTime(0.2, now);
    whizGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    whiz.connect(whizGain);
    whizGain.connect(ctx.destination);
    whiz.start(now);
    whiz.stop(now + 0.06);

    // Sharp puncture thwack
    const snap = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snap.type = 'triangle';
    snap.frequency.setValueAtTime(800, now + 0.03);
    snap.frequency.exponentialRampToValueAtTime(80, now + 0.09);

    snapGain.gain.setValueAtTime(0.32, now + 0.03);
    snapGain.gain.linearRampToValueAtTime(0.01, now + 0.09);

    snap.connect(snapGain);
    snapGain.connect(ctx.destination);
    snap.start(now + 0.03);
    snap.stop(now + 0.09);
  } catch {
    // Ignore audio errors
  }
}

// 8. ÁCIDO: Sizzling corrosive dissolution and burning hiss
export function playAcidSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sizzling noise burst with bandpass
    const noiseBuffer = createNoiseBuffer(ctx, 0.28);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.frequency.linearRampToValueAtTime(1800, now + 0.25);
    filter.Q.value = 4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.27);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.28);

    // Corrosive bubbling low drop
    const bubble = ctx.createOscillator();
    const bGain = ctx.createGain();
    bubble.type = 'sawtooth';
    bubble.frequency.setValueAtTime(290, now);
    bubble.frequency.linearRampToValueAtTime(110, now + 0.2);

    bGain.gain.setValueAtTime(0.18, now);
    bGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    bubble.connect(bGain);
    bGain.connect(ctx.destination);
    bubble.start(now);
    bubble.stop(now + 0.2);
  } catch {
    // Ignore audio errors
  }
}

// 9. VENENO: Toxic bubbling squelch and insidious venom drip
export function playPoisonSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Gloopy bubbles
    const bubbleFrequencies = [280, 360, 220];
    bubbleFrequencies.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.1);

      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    });

    // Wet squelch filter
    const noiseBuffer = createNoiseBuffer(ctx, 0.16);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.linearRampToValueAtTime(120, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.16);
  } catch {
    // Ignore audio errors
  }
}

// 10. NECRÓTICO: Ominous soul drain, dark curse, vampiric withering
export function playNecroticSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dark tritone dissonance (diminished 5th: C3 and F#3)
    const notes = [130.81, 185.0];
    notes.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.7, now + 0.32);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.33);
    });
  } catch {
    // Ignore audio errors
  }
}

// 11. RADIANTE: Celestial divine chime, holy smite shimmer
export function playRadiantSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Brilliant ascending celestial triad (C6 -> E6 -> G6 -> C7)
    const notes = [1046.5, 1318.51, 1567.98, 2093.0];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    });

    // High sparkling shimmer
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(2400, now);
    shimmer.frequency.linearRampToValueAtTime(3200, now + 0.25);
    sGain.gain.setValueAtTime(0.12, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    shimmer.connect(sGain);
    sGain.connect(ctx.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.26);
  } catch {
    // Ignore audio errors
  }
}

// 12. PSÍQUICO: Binaural brainwave distortion, telepathic ring
export function playPsychicSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Dual tones beating at 16Hz (psychic migraine warble)
    const f1 = 660;
    const f2 = 676;
    [f1, f2].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 1.25, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(f * 0.8, now + 0.28);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    });
  } catch {
    // Ignore audio errors
  }
}

// 13. FUERZA / MÁGICO: Arcane cosmic pulse, Eldritch blast
export function playForceSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Resonant laser-like energy pulse
    const pulse = ctx.createOscillator();
    const pGain = ctx.createGain();
    pulse.type = 'sawtooth';
    pulse.frequency.setValueAtTime(620, now);
    pulse.frequency.exponentialRampToValueAtTime(110, now + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + 0.18);
    filter.Q.value = 3;

    pGain.gain.setValueAtTime(0.35, now);
    pGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    pulse.connect(filter);
    filter.connect(pGain);
    pGain.connect(ctx.destination);
    pulse.start(now);
    pulse.stop(now + 0.19);
  } catch {
    // Ignore audio errors
  }
}

/**
 * MASTER SOUND DISPATCHER:
 * Plays the tailored audio synthesizer sound matching the specified damage type.
 */
export function playAttackSoundByDamageType(
  damageType?: DamageType,
  isCrit: boolean = false
): void {
  if (!soundEnabled) return;
  const norm = (damageType || 'cortante').toLowerCase();

  switch (norm) {
    case 'fuego':
      playFireSound();
      break;
    case 'frio':
      playColdSound();
      break;
    case 'rayo':
      playLightningSound();
      break;
    case 'trueno':
      playThunderSound();
      break;
    case 'contundente':
      playBludgeoningSound();
      break;
    case 'perforante':
      playPiercingSound();
      break;
    case 'acido':
      playAcidSound();
      break;
    case 'veneno':
      playPoisonSound();
      break;
    case 'necrotico':
      playNecroticSound();
      break;
    case 'radiante':
      playRadiantSound();
      break;
    case 'psiquico':
      playPsychicSound();
      break;
    case 'fuerza':
    case 'magical':
      playForceSound();
      break;
    case 'cortante':
    case 'physical':
    default:
      playSlashSound();
      break;
  }

  if (isCrit) {
    setTimeout(() => {
      playCritSound();
    }, 60);
  }
}

export function playHealSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Classic FF rising cure chime (E5 -> G#5 -> B5 -> E6)
    const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      const noteTime = now + idx * 0.06;
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.3);
    });
  } catch {
    // Ignore audio errors
  }
}

export function playCritSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // High shimmer
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(1200, now);
    shimmer.frequency.exponentialRampToValueAtTime(2400, now + 0.18);
    sGain.gain.setValueAtTime(0.35, now);
    sGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    shimmer.connect(sGain);
    sGain.connect(ctx.destination);
    shimmer.start(now);
    shimmer.stop(now + 0.25);

    // Deep thunder impact
    playSlashSound();
  } catch {
    // Ignore audio errors
  }
}

export function playVictoryFanfare(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // FF classic victory notes: C5, C5, C5, C5, Ab4, Bb4, C5...
    const melody = [
      { f: 523.25, d: 0.12, t: 0.0 },
      { f: 523.25, d: 0.12, t: 0.14 },
      { f: 523.25, d: 0.12, t: 0.28 },
      { f: 523.25, d: 0.32, t: 0.42 },
      { f: 415.3, d: 0.32, t: 0.76 },
      { f: 466.16, d: 0.32, t: 1.1 },
      { f: 523.25, d: 0.2, t: 1.44 },
      { f: 466.16, d: 0.14, t: 1.66 },
      { f: 523.25, d: 0.65, t: 1.82 },
    ];

    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, now + note.t);

      gain.gain.setValueAtTime(0, now + note.t);
      gain.gain.linearRampToValueAtTime(0.12, now + note.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d);
    });
  } catch {
    // Ignore audio errors
  }
}

/**
 * Synthesizes a realistic tactile dice roll sound: rattling clicks followed by a tabletop drop thud.
 */
export function playDiceRollSound(): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rattle clicks
    const rattleTimes = [0.0, 0.05, 0.11, 0.17, 0.23, 0.3];
    rattleTimes.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      // Varying pitch for dice tumbling on wood
      const pitch = 300 + (i % 3) * 120 + Math.random() * 80;
      osc.frequency.setValueAtTime(pitch, now + t);
      osc.frequency.exponentialRampToValueAtTime(100, now + t + 0.04);

      gain.gain.setValueAtTime(0.09, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.04);
    });

    // Final table thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(160, now + 0.32);
    thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

    thudGain.gain.setValueAtTime(0.15, now + 0.32);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now + 0.32);
    thudOsc.stop(now + 0.46);
  } catch {
    // Ignore audio errors
  }
}

