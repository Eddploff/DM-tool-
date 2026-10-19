import { GlobalEnvironmentalEffect, GlobalEffectId, EncounterState, DamageType } from '../types/combat.ts';

export const GLOBAL_ENVIRONMENTAL_EFFECTS: GlobalEnvironmentalEffect[] = [
  {
    id: 'difficult-terrain',
    name: 'Terreno Difícil',
    icon: '🏔️',
    summary: 'Movimiento reducido a la mitad',
    description:
      'El suelo está cubierto de escombros, lodo denso, raíces o grietas profundas. Desplazarse por el mapa requiere el doble de esfuerzo y velocidad.',
    mechanicalDebuffOrBonus: 'Penalización de movimiento: Cada casilla cuesta el doble de desplazamiento.',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-600/50',
    modifiers: {
      movementPenalty: true,
      attackBonusDelta: 0,
    },
  },
  {
    id: 'darkness',
    name: 'Oscuridad Mágica',
    icon: '🌑',
    summary: '-2 a tiradas de ataque y penalización de puntería',
    description:
      'Un manto de penumbra sobrenatural o sombras densas envuelve el campo de batalla, impidiendo ver con claridad las siluetas de aliados y enemigos.',
    mechanicalDebuffOrBonus: 'Desventaja táctica: -2 a todos los bonificadores de ataque y salvaciones de destreza.',
    badgeClass: 'bg-purple-950/80 text-purple-200 border-purple-500/50',
    modifiers: {
      attackBonusDelta: -2,
      disadvantageOnAttacks: true,
      disadvantageOnSaves: true,
    },
  },
  {
    id: 'heavy-rain',
    name: 'Lluvia Torrencial',
    icon: '🌧️',
    summary: 'Fuego reducido a la mitad (0.5x), Rayo +25% (1.25x)',
    description:
      'Un diluvio violento empapa a todos los combatientes. El agua apaga las llamas y conduce con devastación las descargas eléctricas.',
    mechanicalDebuffOrBonus: 'Daño de Fuego reducido a la mitad (0.5x). Daño de Rayo amplificado a 1.25x.',
    badgeClass: 'bg-cyan-950/70 text-cyan-200 border-cyan-600/50',
    modifiers: {
      attackBonusDelta: -1,
      damageMultipliers: {
        fuego: 0.5,
        rayo: 1.25,
      },
    },
  },
  {
    id: 'blizzard',
    name: 'Ventisca Helada',
    icon: '❄️',
    summary: 'Frío +25% (1.25x) y entumecimiento (-1 Ataque)',
    description:
      'Ráfagas gélidas y cristales de escarcha entumecen las articulaciones de los héroes y monstruos, bajando sus defensas y agilidad.',
    mechanicalDebuffOrBonus: 'Entumecimiento: -1 a tiradas de ataque. El daño de Frío se incrementa un 25% (1.25x).',
    badgeClass: 'bg-sky-950/70 text-sky-200 border-sky-500/50',
    modifiers: {
      attackBonusDelta: -1,
      damageMultipliers: {
        frio: 1.25,
      },
    },
  },
  {
    id: 'toxic-miasma',
    name: 'Miasma Tóxico',
    icon: '☠️',
    summary: '-1 general a tiradas, Veneno y Ácido +25%',
    description:
      'Niebla verde sulfurosa y vapores corrompidos flotan en el aire, debilitando los pulmones y corroendo armaduras.',
    mechanicalDebuffOrBonus: 'Toxicidad: -1 a tiradas de ataque. El daño de Veneno y Ácido aumenta un 25% (1.25x).',
    badgeClass: 'bg-emerald-950/70 text-emerald-200 border-emerald-600/50',
    modifiers: {
      attackBonusDelta: -1,
      damageMultipliers: {
        veneno: 1.25,
        acido: 1.25,
      },
    },
  },
  {
    id: 'holy-ground',
    name: 'Suelo Sagrado',
    icon: '☀️',
    summary: '+2 a toda curación, Radiante +25%',
    description:
      'Un santuario consagrado por luz divina bendice el suelo, revitalizando los hechizos reparadores y castigando la oscuridad.',
    mechanicalDebuffOrBonus: 'Bendición de campo: +2 HP a todas las curaciones recibidas. Daño Radiante incrementado a 1.25x.',
    badgeClass: 'bg-amber-950/80 text-amber-200 border-amber-400/60',
    modifiers: {
      healBonus: 2,
      damageMultipliers: {
        radiante: 1.25,
      },
    },
  },
  {
    id: 'extreme-heat',
    name: 'Calor Abrasador',
    icon: '🔥',
    summary: 'Fuego +25%, Frío reducido (0.75x)',
    description:
      'Vapores ardientes y magma subterráneo elevan la temperatura ambiental a niveles extremos.',
    mechanicalDebuffOrBonus: 'Ignición ambiental: Daño de Fuego incrementado un 25% (1.25x). El Frío se derrite rápido (0.75x).',
    badgeClass: 'bg-red-950/70 text-red-200 border-red-600/50',
    modifiers: {
      damageMultipliers: {
        fuego: 1.25,
        frio: 0.75,
      },
    },
  },
  {
    id: 'wild-magic',
    name: 'Magia Salvaje',
    icon: '🌀',
    summary: 'Fuerza y Psíquico amplificados (+25%)',
    description:
      'Una falla en el tejido arcano hace que las energías de la realidad fluctúen de forma caótica.',
    mechanicalDebuffOrBonus: 'Resonancia del Vacío: Daño de Fuerza y Psíquico incrementados un 25% (1.25x).',
    badgeClass: 'bg-fuchsia-950/70 text-fuchsia-200 border-fuchsia-500/50',
    modifiers: {
      damageMultipliers: {
        fuerza: 1.25,
        psiquico: 1.25,
      },
    },
  },
];

export function getGlobalEffectMeta(id: string): GlobalEnvironmentalEffect | undefined {
  return GLOBAL_ENVIRONMENTAL_EFFECTS.find((e) => e.id === id);
}

export interface NetGlobalModifiers {
  netAttackBonusDelta: number;
  movementPenalty: boolean;
  healBonus: number;
  damageMultipliers: Partial<Record<DamageType, number>>;
  disadvantageOnAttacks: boolean;
  disadvantageOnSaves: boolean;
  activeEffectsList: GlobalEnvironmentalEffect[];
}

/**
 * Aggregates all net bonuses and debuffs from the currently active global environmental effects.
 */
export function calculateNetGlobalModifiers(
  activeEffectIds: GlobalEffectId[] = []
): NetGlobalModifiers {
  let netAttackBonusDelta = 0;
  let movementPenalty = false;
  let healBonus = 0;
  const damageMultipliers: Partial<Record<DamageType, number>> = {};
  let disadvantageOnAttacks = false;
  let disadvantageOnSaves = false;
  const activeEffectsList: GlobalEnvironmentalEffect[] = [];

  for (const id of activeEffectIds) {
    const meta = getGlobalEffectMeta(id);
    if (!meta) continue;
    activeEffectsList.push(meta);

    if (meta.modifiers.attackBonusDelta) {
      netAttackBonusDelta += meta.modifiers.attackBonusDelta;
    }
    if (meta.modifiers.movementPenalty) {
      movementPenalty = true;
    }
    if (meta.modifiers.healBonus) {
      healBonus += meta.modifiers.healBonus;
    }
    if (meta.modifiers.disadvantageOnAttacks) {
      disadvantageOnAttacks = true;
    }
    if (meta.modifiers.disadvantageOnSaves) {
      disadvantageOnSaves = true;
    }
    if (meta.modifiers.damageMultipliers) {
      for (const [dmgType, mult] of Object.entries(meta.modifiers.damageMultipliers)) {
        const key = dmgType as DamageType;
        const current = damageMultipliers[key] ?? 1.0;
        damageMultipliers[key] = current * (mult as number);
      }
    }
  }

  return {
    netAttackBonusDelta,
    movementPenalty,
    healBonus,
    damageMultipliers,
    disadvantageOnAttacks,
    disadvantageOnSaves,
    activeEffectsList,
  };
}

/**
 * Toggles a global environmental effect on or off in an encounter state.
 */
export function toggleGlobalEffectInEncounter(
  encounter: EncounterState,
  effectId: GlobalEffectId
): EncounterState {
  const current = encounter.activeGlobalEffects || [];
  const exists = current.includes(effectId);
  const next = exists ? current.filter((id) => id !== effectId) : [...current, effectId];

  return {
    ...encounter,
    activeGlobalEffects: next,
    lastUpdated: Date.now(),
  };
}

/**
 * Clears all active global environmental effects in an encounter state.
 */
export function clearAllGlobalEffectsInEncounter(
  encounter: EncounterState
): EncounterState {
  return {
    ...encounter,
    activeGlobalEffects: [],
    lastUpdated: Date.now(),
  };
}
