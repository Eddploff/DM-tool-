import type { BattleEnvironment, EncounterState } from '../types/combat.ts';
import { createCombatLog } from './combatLogic.ts';

export interface EnvironmentMeta {
  key: BattleEnvironment;
  name: string;
  icon: string;
  tagline: string;
  bgClass: string;
  groundClass: string;
  ambientGlow: string;
  accentColor: string;
  badgeClass: string;
}

export const BATTLE_ENVIRONMENTS: Record<BattleEnvironment, EnvironmentMeta> = {
  forest: {
    key: 'forest',
    name: 'Bosque Místico',
    icon: '🌲',
    tagline: 'Árboles ancestrales y luciérnagas titilantes',
    bgClass: 'bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950',
    groundClass: 'bg-gradient-to-t from-emerald-950 via-emerald-900/40 to-transparent border-t border-emerald-500/30',
    ambientGlow: 'from-emerald-500/10 via-transparent to-transparent',
    accentColor: '#10b981',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
  },
  dungeon: {
    key: 'dungeon',
    name: 'Mazmorra Antigua',
    icon: '🗝️',
    tagline: 'Paredes de piedra húmeda y antorchas titilantes',
    bgClass: 'bg-gradient-to-b from-stone-950 via-zinc-950 to-neutral-950',
    groundClass: 'bg-gradient-to-t from-zinc-950 via-stone-900/50 to-transparent border-t border-stone-600/30',
    ambientGlow: 'from-amber-600/10 via-transparent to-transparent',
    accentColor: '#d97706',
    badgeClass: 'bg-stone-900/80 text-stone-300 border-stone-700',
  },
  volcano: {
    key: 'volcano',
    name: 'Cráter Volcánico',
    icon: '🌋',
    tagline: 'Fisuras de magma hirviente y humo de azufre',
    bgClass: 'bg-gradient-to-b from-red-950 via-amber-950 to-stone-950',
    groundClass: 'bg-gradient-to-t from-red-950 via-orange-950/60 to-transparent border-t border-red-500/40',
    ambientGlow: 'from-red-600/15 via-transparent to-transparent',
    accentColor: '#ef4444',
    badgeClass: 'bg-red-950/80 text-red-300 border-red-700',
  },
  plains: {
    key: 'plains',
    name: 'Llanuras de Fabul',
    icon: '🌾',
    tagline: 'Colinas abiertas bajo un cielo azul infinito',
    bgClass: 'bg-gradient-to-b from-sky-900 via-indigo-950 to-emerald-950',
    groundClass: 'bg-gradient-to-t from-emerald-900/80 via-emerald-950/50 to-transparent border-t border-emerald-500/20',
    ambientGlow: 'from-sky-500/10 via-transparent to-transparent',
    accentColor: '#38bdf8',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-700',
  },
  cave: {
    key: 'cave',
    name: 'Caverna Umbría',
    icon: '🪨',
    tagline: 'Estalactitas oscuras y cristales subterráneos',
    bgClass: 'bg-gradient-to-b from-purple-950 via-slate-950 to-indigo-950',
    groundClass: 'bg-gradient-to-t from-slate-950 via-purple-950/50 to-transparent border-t border-purple-500/20',
    ambientGlow: 'from-purple-600/10 via-transparent to-transparent',
    accentColor: '#a855f7',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-700',
  },
  castle: {
    key: 'castle',
    name: 'Fortaleza Imperial',
    icon: '🏰',
    tagline: 'Salón de trono de piedra con estandartes reales',
    bgClass: 'bg-gradient-to-b from-slate-900 via-stone-950 to-blue-950',
    groundClass: 'bg-gradient-to-t from-stone-950 via-slate-900/60 to-transparent border-t border-amber-500/20',
    ambientGlow: 'from-amber-500/10 via-transparent to-transparent',
    accentColor: '#f59e0b',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700',
  },
  crystal: {
    key: 'crystal',
    name: 'Santuario de Cristal',
    icon: '💎',
    tagline: 'Prismas etéreos y luz astral radiante',
    bgClass: 'bg-gradient-to-b from-cyan-950 via-blue-950 to-indigo-950',
    groundClass: 'bg-gradient-to-t from-cyan-950 via-blue-950/60 to-transparent border-t border-cyan-400/30',
    ambientGlow: 'from-cyan-400/15 via-transparent to-transparent',
    accentColor: '#06b6d4',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-700',
  },
};

/**
 * Pure function: updates the encounter's environment and records a combat log entry
 */
export function setEncounterEnvironment(
  state: EncounterState,
  newEnvironment: BattleEnvironment,
  actorName: string = 'DM'
): EncounterState {
  if (state.environment === newEnvironment) {
    return state;
  }

  const envMeta = BATTLE_ENVIRONMENTS[newEnvironment] || BATTLE_ENVIRONMENTS.plains;
  const log = createCombatLog(
    actorName,
    'Escenario',
    'Cambio de Entorno',
    'system',
    0,
    false,
    `El entorno de combate cambió a: ${envMeta.icon} ${envMeta.name}`
  );

  return {
    ...state,
    environment: newEnvironment,
    log: [log, ...state.log],
    lastUpdated: Date.now(),
  };
}
