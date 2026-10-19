import type { Combatant } from '../types/combat.ts';

export interface StatusEffectMeta {
  key: string;
  name: string;
  type: 'debuff' | 'buff';
  icon: string; // Emoji / symbol representation
  color: string;
  badgeBg: string;
  borderColor: string;
  description: string;
}

export const STATUS_EFFECTS_CATALOG: Record<string, StatusEffectMeta> = {
  veneno: {
    key: 'veneno',
    name: 'Veneno',
    type: 'debuff',
    icon: '☠️',
    color: '#4ade80',
    badgeBg: 'bg-emerald-950/90 text-emerald-300',
    borderColor: 'border-emerald-600',
    description: 'Sufre daño recurrente al inicio de cada turno.',
  },
  paralisis: {
    key: 'paralisis',
    name: 'Parálisis',
    type: 'debuff',
    icon: '⚡',
    color: '#facc15',
    badgeBg: 'bg-yellow-950/90 text-yellow-300',
    borderColor: 'border-yellow-600',
    description: 'El combatiente está aturdido o entumecido y pierde su turno.',
  },
  bendicion: {
    key: 'bendicion',
    name: 'Bendición',
    type: 'buff',
    icon: '✨',
    color: '#38bdf8',
    badgeBg: 'bg-sky-950/90 text-sky-300',
    borderColor: 'border-sky-500',
    description: 'Favor divino que otorga bonificación a tiradas y defensa.',
  },
  sueno: {
    key: 'sueno',
    name: 'Sueño',
    type: 'debuff',
    icon: '💤',
    color: '#818cf8',
    badgeBg: 'bg-indigo-950/90 text-indigo-300',
    borderColor: 'border-indigo-600',
    description: 'Dormido e indefenso hasta sufrir daño o ser despertado.',
  },
  ceguera: {
    key: 'ceguera',
    name: 'Ceguera',
    type: 'debuff',
    icon: '👁️',
    color: '#94a3b8',
    badgeBg: 'bg-slate-900/90 text-slate-300',
    borderColor: 'border-slate-600',
    description: 'Visión oscurecida, desventaja en ataques físicos y precisión.',
  },
  quemadura: {
    key: 'quemadura',
    name: 'Quemadura',
    type: 'debuff',
    icon: '🔥',
    color: '#f87171',
    badgeBg: 'bg-red-950/90 text-red-300',
    borderColor: 'border-red-600',
    description: 'Arde en llamas residuales con daño continuado.',
  },
  prisa: {
    key: 'prisa',
    name: 'Prisa (Haste)',
    type: 'buff',
    icon: '⏳',
    color: '#34d399',
    badgeBg: 'bg-teal-950/90 text-teal-300',
    borderColor: 'border-teal-500',
    description: 'Mayor velocidad y agilidad en combate.',
  },
  regeneracion: {
    key: 'regeneracion',
    name: 'Regeneración',
    type: 'buff',
    icon: '🌿',
    color: '#a3e635',
    badgeBg: 'bg-lime-950/90 text-lime-300',
    borderColor: 'border-lime-500',
    description: 'Recupera vitalidad de forma constante en cada ronda.',
  },
  escudo: {
    key: 'escudo',
    name: 'Coraza / Escudo',
    type: 'buff',
    icon: '🛡️',
    color: '#60a5fa',
    badgeBg: 'bg-blue-950/90 text-blue-300',
    borderColor: 'border-blue-500',
    description: 'Barrera protectora que mitiga el daño entrante.',
  },
  maldicion: {
    key: 'maldicion',
    name: 'Maldición',
    type: 'debuff',
    icon: '🔮',
    color: '#c084fc',
    badgeBg: 'bg-purple-950/90 text-purple-300',
    borderColor: 'border-purple-600',
    description: 'Atado por energía oscura con capacidades debilitadas.',
  },
  concentracion: {
    key: 'concentracion',
    name: 'Concentración',
    type: 'buff',
    icon: '🎯',
    color: '#38bdf8',
    badgeBg: 'bg-cyan-950/90 text-cyan-300',
    borderColor: 'border-cyan-500',
    description: 'Manteniendo un hechizo que requiere concentración activa (D&D 5e).',
  },
};

/**
 * Pure function: adds a status effect if not already present
 */
export function addStatusEffect(combatant: Combatant, effectKey: string): Combatant {
  const normalized = effectKey.trim().toLowerCase();
  if (combatant.statusEffects.includes(normalized)) {
    return combatant;
  }
  return {
    ...combatant,
    statusEffects: [...combatant.statusEffects, normalized],
  };
}

/**
 * Pure function: removes a status effect
 */
export function removeStatusEffect(combatant: Combatant, effectKey: string): Combatant {
  const normalized = effectKey.trim().toLowerCase();
  return {
    ...combatant,
    statusEffects: combatant.statusEffects.filter((s) => s.toLowerCase() !== normalized),
  };
}

/**
 * Pure function: toggles a status effect on/off
 */
export function toggleStatusEffect(combatant: Combatant, effectKey: string): Combatant {
  const normalized = effectKey.trim().toLowerCase();
  if (combatant.statusEffects.includes(normalized)) {
    return removeStatusEffect(combatant, normalized);
  }
  return addStatusEffect(combatant, normalized);
}

/**
 * Resolves metadata for an effect key (handles custom strings cleanly)
 */
export function getStatusEffectMeta(effectKey: string): StatusEffectMeta {
  const key = effectKey.trim().toLowerCase();
  if (STATUS_EFFECTS_CATALOG[key]) {
    return STATUS_EFFECTS_CATALOG[key];
  }
  // Generic fallback
  return {
    key,
    name: effectKey,
    type: 'debuff',
    icon: '✨',
    color: '#e2e8f0',
    badgeBg: 'bg-slate-800 text-slate-200',
    borderColor: 'border-slate-600',
    description: `Estado alterado: ${effectKey}`,
  };
}
