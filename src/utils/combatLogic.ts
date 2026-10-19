import type {
  Combatant,
  HealthStatusInfo,
  CombatLogEntry,
  EncounterState,
  FloatingNumber,
  DamageType,
  AoETemplate,
  GlobalEffectId,
  InitiativeRollResult,
} from '../types/combat.ts';
import {
  PHYSICAL_DAMAGE_TYPES,
  MAGICAL_DAMAGE_TYPES,
} from '../types/combat.ts';
import { calculateNetGlobalModifiers } from './environmentalEffects.ts';
import { INITIAL_COMBATANTS } from './defaultData.ts';

/**
 * Pure logic for applying damage to a combatant.
 * Respects damage resistances (halves damage if resisted), active global environmental effects, and tempHp.
 */
export function applyDamage(
  combatant: Combatant,
  damage: number,
  damageType: DamageType = 'cortante',
  activeGlobalEffects?: GlobalEffectId[]
): {
  updated: Combatant;
  actualDamage: number;
  wasKilled: boolean;
  isResisted: boolean;
  effectiveDamage: number;
} {
  let safeDamage = Math.max(0, Math.round(damage));

  // Apply global environmental damage multipliers (e.g. Heavy Rain halves fire damage to 0.5x, Holy Ground increases radiant)
  if (activeGlobalEffects && activeGlobalEffects.length > 0) {
    const { damageMultipliers } = calculateNetGlobalModifiers(activeGlobalEffects);
    const mult = damageMultipliers[damageType];
    if (typeof mult === 'number') {
      safeDamage = Math.max(1, Math.round(safeDamage * mult));
    }
  }

  const maxHp = Math.max(1, Number(combatant.maxHp) || 1);
  const previousHp = Math.max(0, Number(combatant.currentHp) ?? 0);
  const currentTempHp = Math.max(0, Number(combatant.tempHp) || 0);

  // D&D 5e: Resistance halves the damage received (rounded down)
  const isResisted = Boolean(
    combatant.damageResistances &&
      (combatant.damageResistances.includes(damageType) ||
        (PHYSICAL_DAMAGE_TYPES.some((p) => p.key === damageType) &&
          (combatant.damageResistances as string[]).includes('physical')) ||
        (MAGICAL_DAMAGE_TYPES.some((m) => m.key === damageType) &&
          (combatant.damageResistances as string[]).includes('magical')))
  );
  const effectiveDamage = isResisted ? Math.floor(safeDamage / 2) : safeDamage;

  let remainingDamage = effectiveDamage;
  let newTempHp = currentTempHp;

  if (newTempHp > 0) {
    if (newTempHp >= remainingDamage) {
      newTempHp -= remainingDamage;
      remainingDamage = 0;
    } else {
      remainingDamage -= newTempHp;
      newTempHp = 0;
    }
  }

  const newHp = Math.max(0, previousHp - remainingDamage);
  const actualDamage = currentTempHp - newTempHp + (previousHp - newHp);
  const wasKilled = previousHp > 0 && newHp === 0;

  return {
    updated: {
      ...combatant,
      maxHp,
      currentHp: newHp,
      tempHp: newTempHp,
    },
    actualDamage,
    wasKilled,
    isResisted,
    effectiveDamage,
  };
}

/**
 * Pure logic for applying healing to a combatant.
 * Respects global environmental heal bonuses (e.g. Holy ground +2), clamps to maxHp, cannot exceed maxHp.
 */
export function applyHeal(
  combatant: Combatant,
  heal: number,
  activeGlobalEffects?: GlobalEffectId[]
): { updated: Combatant; actualHealed: number; wasRevived: boolean } {
  let safeHeal = Math.max(0, Math.round(Number(heal) || 0));

  if (activeGlobalEffects && activeGlobalEffects.length > 0 && safeHeal > 0) {
    const { healBonus } = calculateNetGlobalModifiers(activeGlobalEffects);
    if (healBonus) {
      safeHeal += healBonus;
    }
  }

  const maxHp = Math.max(1, Number(combatant.maxHp) || 1);
  const previousHp = Math.max(0, Math.min(maxHp, Number(combatant.currentHp) ?? 0));
  const newHp = Math.min(maxHp, previousHp + safeHeal);
  const actualHealed = newHp - previousHp;
  const wasRevived = previousHp === 0 && newHp > 0;

  return {
    updated: {
      ...combatant,
      maxHp,
      currentHp: newHp,
      tempHp: Number(combatant.tempHp) || 0,
    },
    actualHealed,
    wasRevived,
  };
}

/**
 * Splits a 0-999 number into hundreds, tens, and units
 */
export function splitIntoDigits(value: number): {
  hundreds: number;
  tens: number;
  units: number;
} {
  const clamped = Math.max(0, Math.min(999, Math.round(value)));
  const hundreds = Math.floor(clamped / 100);
  const tens = Math.floor((clamped % 100) / 10);
  const units = clamped % 10;
  return { hundreds, tens, units };
}

/**
 * Combines hundreds, tens, and units into a total integer (0-999)
 */
export function combineDigits(
  hundreds: number,
  tens: number,
  units: number
): number {
  const h = Math.max(0, Math.min(9, hundreds));
  const t = Math.max(0, Math.min(9, tens));
  const u = Math.max(0, Math.min(9, units));
  return h * 100 + t * 10 + u;
}

/**
 * Cycles a digit up or down between 0 and 9
 */
export function cycleDigit(current: number, delta: number): number {
  const next = current + delta;
  if (next > 9) return 0;
  if (next < 0) return 9;
  return next;
}

/**
 * Evaluates visual health status for Fog-of-War.
 */
export function getHealthStatus(currentHp: number, maxHp: number): HealthStatusInfo {
  if (maxHp <= 0) {
    return {
      level: 'defeated',
      label: 'Derrotado',
      color: '#ef4444',
      badgeBg: 'bg-red-950/80 text-red-400 border-red-800',
      relativePercentBand: '0%',
    };
  }

  const ratio = Math.max(0, currentHp / maxHp);

  if (ratio <= 0) {
    return {
      level: 'defeated',
      label: 'Inconsciente / Caído',
      color: '#ef4444',
      badgeBg: 'bg-red-950/80 text-red-400 border-red-800',
      relativePercentBand: '0%',
    };
  }
  if (ratio === 1) {
    return {
      level: 'unscathed',
      label: 'Ileso / Pleno',
      color: '#22c55e',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-700',
      relativePercentBand: '100%',
    };
  }
  if (ratio >= 0.75) {
    return {
      level: 'healthy',
      label: 'En buen estado',
      color: '#84cc16',
      badgeBg: 'bg-lime-950/80 text-lime-300 border-lime-700',
      relativePercentBand: '75%+',
    };
  }
  if (ratio >= 0.5) {
    return {
      level: 'injured',
      label: 'Herido leve',
      color: '#eab308',
      badgeBg: 'bg-yellow-950/80 text-yellow-300 border-yellow-700',
      relativePercentBand: '50-74%',
    };
  }
  if (ratio >= 0.25) {
    return {
      level: 'bloodied',
      label: 'Gravemente herido',
      color: '#f97316',
      badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-700',
      relativePercentBand: '25-49%',
    };
  }

  return {
    level: 'critical',
    label: 'Estado crítico',
    color: '#ef4444',
    badgeBg: 'bg-red-950/80 text-red-300 border-red-700 animate-pulse',
    relativePercentBand: '<25%',
  };
}

/**
 * Creates formatted combat log entry
 */
export function createCombatLog(
  actorName: string,
  targetName: string,
  actionName: string,
  type: 'damage' | 'heal' | 'status' | 'system',
  amount: number,
  isCrit: boolean = false,
  notes?: string,
  damageType?: DamageType,
  isResisted?: boolean,
  playerAmount?: number
): CombatLogEntry {
  const now = new Date();
  const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const entry: CombatLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    actorName,
    targetName,
    actionName,
    type,
    amount,
    isCrit,
  };

  if (notes !== undefined && notes !== '') entry.notes = notes;
  if (damageType !== undefined) entry.damageType = damageType;
  if (isResisted !== undefined) entry.isResisted = isResisted;
  if (playerAmount !== undefined) entry.playerAmount = playerAmount;

  return entry;
}

/**
 * Calculates which living combatants fall inside an AoE template.
 * 1 grid cell = 5 ft.
 * - 10 ft: 2x2 cells
 * - 15 ft: 3x3 cells
 * - 20 ft: 4x4 cells
 * - 30 ft: 6x6 cells
 */
export function getCombatantsInAoE(
  combatants: Combatant[],
  aoe: AoETemplate
): Combatant[] {
  // Convert feet to grid cell radius / span
  // 1 cell = 5 ft.
  // 10ft = 2 cells diameter (radius 1)
  // 15ft = 3 cells diameter (radius 1.5)
  // 20ft = 4 cells diameter (radius 2)
  // 30ft = 6 cells diameter (radius 3)
  const cellRadius = aoe.sizeFeet / 10;

  return combatants.filter((c) => {
    if (!c.gridPosition || c.currentHp <= 0) return false;
    const dx = c.gridPosition.col - aoe.centerCol;
    const dy = c.gridPosition.row - aoe.centerRow;

    if (aoe.shape === 'square') {
      // Square AoE: Chebyshev / box distance
      return Math.abs(dx) <= cellRadius && Math.abs(dy) <= cellRadius;
    } else {
      // Circle AoE: Euclidean distance (with 0.35 padding for boundary tiles)
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= cellRadius + 0.35;
    }
  });
}

/**
 * Checks if encounter is won (all enemies defeated)
 */
export function isEncounterWon(combatants: Combatant[]): boolean {
  const enemies = combatants.filter((c) => c.type === 'enemy');
  return enemies.length > 0 && enemies.every((e) => e.currentHp <= 0);
}

/**
 * Checks if party is wiped (all players defeated)
 */
export function isPartyWiped(combatants: Combatant[]): boolean {
  const players = combatants.filter((c) => c.type === 'player');
  return players.length > 0 && players.every((p) => p.currentHp <= 0);
}

/**
 * Advances to the next turn in the turnOrder list.
 * DM/Host controls turns manually.
 */
export function advanceTurn(state: EncounterState): EncounterState {
  if (state.turnOrder.length === 0) return state;

  const livingIds = new Set(
    state.combatants.filter((c) => c.currentHp > 0).map((c) => c.id)
  );

  let nextIndex = state.activeTurnIndex + 1;
  let nextRound = state.round;

  if (nextIndex >= state.turnOrder.length) {
    nextIndex = 0;
    nextRound += 1;
  }

  // Skip dead combatants if any
  let attempts = 0;
  while (
    attempts < state.turnOrder.length &&
    !livingIds.has(state.turnOrder[nextIndex])
  ) {
    nextIndex = (nextIndex + 1) % state.turnOrder.length;
    if (nextIndex === 0) {
      nextRound += 1;
    }
    attempts++;
  }

  return {
    ...state,
    round: nextRound,
    activeTurnIndex: nextIndex,
    turnPhase: 'start',
    lastUpdated: Date.now(),
  };
}

/**
 * Reverts to previous turn
 */
export function retreatTurn(state: EncounterState): EncounterState {
  if (state.turnOrder.length === 0) return state;

  let prevIndex = state.activeTurnIndex - 1;
  let prevRound = state.round;

  if (prevIndex < 0) {
    prevIndex = state.turnOrder.length - 1;
    prevRound = Math.max(1, prevRound - 1);
  }

  return {
    ...state,
    round: prevRound,
    activeTurnIndex: prevIndex,
    turnPhase: 'start',
    lastUpdated: Date.now(),
  };
}

/**
 * Pure logic for granting Temporary Hit Points to a combatant.
 * Clamped between 0 and 999.
 */
export function applyTempHp(
  combatant: Combatant,
  tempHp: number
): { updated: Combatant; amountAdded: number } {
  const safeTempHp = Math.max(0, Math.min(999, Math.round(tempHp)));
  return {
    updated: {
      ...combatant,
      tempHp: safeTempHp,
    },
    amountAdded: safeTempHp,
  };
}

/**
 * Advances between turn phases:
 * 'start' -> 'action' -> 'end' -> wraps to next turn with 'start'
 */
export function getNextTurnPhase(
  currentPhase: 'start' | 'action' | 'end' = 'start'
): { nextPhase: 'start' | 'action' | 'end'; shouldAdvanceTurn: boolean } {
  if (currentPhase === 'start') {
    return { nextPhase: 'action', shouldAdvanceTurn: false };
  }
  if (currentPhase === 'action') {
    return { nextPhase: 'end', shouldAdvanceTurn: false };
  }
  return { nextPhase: 'start', shouldAdvanceTurn: true };
}

/**
 * Enforces interaction permissions based on DM role and turn ownership:
 * - In DM view: DM can always interact (moves, attacks, monster turns).
 * - During an enemy/monster turn: only the DM can interact (players are locked out).
 * - During a player's turn: only that specific player can interact (other players are locked out).
 */
export function canCombatantActInTurn(params: {
  isDM: boolean;
  activePlayerId?: string;
  currentTurnCombatantId?: string;
  currentTurnActorType?: 'player' | 'enemy';
}): { allowed: boolean; reason?: string } {
  if (params.isDM) {
    return { allowed: true };
  }

  // If it's an enemy turn and user is in player view
  if (params.currentTurnActorType === 'enemy') {
    return {
      allowed: false,
      reason: 'Turno de monstruos: Solo el DM puede realizar acciones en este turno.',
    };
  }

  // If it's another player's turn
  if (
    params.activePlayerId &&
    params.currentTurnCombatantId &&
    params.activePlayerId !== params.currentTurnCombatantId
  ) {
    return {
      allowed: false,
      reason: 'No es tu turno: Espera a que el jugador activo termine su turno.',
    };
  }

  return { allowed: true };
}

/**
 * Triggers an automatic initiative dice roll (1d20 + bonus) for all combatants,
 * returning the roll results and the updated combatants sorted in descending order.
 */
export function rollInitiativeForAll(
  combatants: Combatant[],
  customRolls?: Record<string, number>
): {
  results: InitiativeRollResult[];
  sortedTurnOrder: string[];
  updatedCombatants: Combatant[];
} {
  const results: InitiativeRollResult[] = combatants.map((c) => {
    const d20 =
      customRolls && customRolls[c.id] !== undefined
        ? customRolls[c.id]
        : Math.floor(Math.random() * 20) + 1;

    // Use initiativeBonus if set; else attackBonus/2 or 0
    const bonus = c.initiativeBonus ?? (c.attackBonus ? Math.floor(c.attackBonus / 2) : 0);
    const total = d20 + bonus;

    return {
      combatantId: c.id,
      combatantName: c.name,
      type: c.type,
      avatar: c.avatar,
      jobClass: c.jobClass,
      d20,
      bonus,
      total,
      isCrit: d20 === 20,
      isFumble: d20 === 1,
    };
  });

  // Sort descending by total initiative. Tie-breakers: higher bonus, then players over enemies
  results.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    if (b.bonus !== a.bonus) {
      return b.bonus - a.bonus;
    }
    if (a.type === 'player' && b.type === 'enemy') return -1;
    if (a.type === 'enemy' && b.type === 'player') return 1;
    return a.combatantName.localeCompare(b.combatantName);
  });

  const sortedTurnOrder = results.map((r) => r.combatantId);

  const updatedCombatants = combatants.map((c) => {
    const res = results.find((r) => r.combatantId === c.id);
    return {
      ...c,
      initiative: res ? res.total : c.initiative,
    };
  });

  return {
    results,
    sortedTurnOrder,
    updatedCombatants,
  };
}

/**
 * Bulletproof helper to calculate safe current HP, max HP, ratio (0 to 1), and integer percentage (0 to 100).
 * Guaranteed to never return NaN, even if currentHp or maxHp is undefined, null, or string.
 */
export function getSafeHpValues(
  currentHp: unknown,
  maxHp: unknown
): { current: number; max: number; ratio: number; percent: number } {
  const parsedMax = typeof maxHp === 'number' ? maxHp : parseFloat(String(maxHp));
  const safeMax = !isNaN(parsedMax) && parsedMax > 0 ? Math.round(parsedMax) : 1;

  const parsedCurrent = typeof currentHp === 'number' ? currentHp : parseFloat(String(currentHp));
  const validCurrent = !isNaN(parsedCurrent) ? Math.round(parsedCurrent) : safeMax;
  const safeCurrent = Math.max(0, Math.min(safeMax, validCurrent));

  const ratio = safeMax > 0 ? safeCurrent / safeMax : 0;
  const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));

  return { current: safeCurrent, max: safeMax, ratio, percent };
}

/**
 * Resets encounter completely:
 * - Restores all combatants to 100% maxHp and removes tempHp.
 * - Repositions combatants back to their initial tactical formation on the VTT grid.
 * - Clears transient altered states / concentrations.
 * - Resets round to 1, turnPhase to 'start', activeTurnIndex to 0.
 * - Optionally rolls initiative automatically for everyone.
 */
export function resetEncounterToFull(
  encounter: EncounterState,
  options?: {
    autoRollInitiative?: boolean;
    clearStatuses?: boolean;
    resetFormation?: boolean;
    customRolls?: Record<string, number>;
  }
): {
  nextEncounter: EncounterState;
  initiativeResults?: InitiativeRollResult[];
} {
  const autoRoll = options?.autoRollInitiative ?? true;
  const clearStatuses = options?.clearStatuses ?? true;
  const resetFormation = options?.resetFormation ?? true;

  const enemies = encounter.combatants.filter((c) => c.type === 'enemy');
  const players = encounter.combatants.filter((c) => c.type === 'player');

  // 1. Reset each combatant to full health, 0 tempHp, cleared states, and default tactical position
  const healedCombatants: Combatant[] = encounter.combatants.map((c) => {
    let gridPos = c.gridPosition;
    if (resetFormation) {
      const defaultInitial = INITIAL_COMBATANTS.find((x) => x.id === c.id);
      if (defaultInitial && defaultInitial.gridPosition) {
        gridPos = { ...defaultInitial.gridPosition };
      } else if (c.type === 'enemy') {
        const eIdx = enemies.findIndex((e) => e.id === c.id);
        const col = 1 + (eIdx % 3);
        const row = 1 + ((Math.floor(eIdx / 3) * 2) % 6);
        gridPos = { col, row };
      } else {
        const pIdx = players.findIndex((p) => p.id === c.id);
        const col = 10 + (pIdx % 2);
        const row = 1 + ((pIdx * 2) % 6);
        gridPos = { col, row };
      }
    }

    const maxHp = Math.max(1, Number(c.maxHp) || 1);
    return {
      ...c,
      maxHp,
      currentHp: maxHp, // Guaranteed 100% full health
      tempHp: 0,
      statusEffects: clearStatuses ? [] : (c.statusEffects || []),
      isConcentrating: false,
      isDefending: false,
      gridPosition: gridPos,
    };
  });

  // 2. Either roll fresh initiative or retain current order
  let finalTurnOrder = [...encounter.turnOrder];
  let finalCombatants = healedCombatants;
  let initiativeResults: InitiativeRollResult[] | undefined;

  if (autoRoll && healedCombatants.length > 0) {
    const rolled = rollInitiativeForAll(healedCombatants, options?.customRolls);
    initiativeResults = rolled.results;
    finalTurnOrder = rolled.sortedTurnOrder;
    finalCombatants = rolled.updatedCombatants;
  }

  // 3. Reset log entry
  const resetLog: CombatLogEntry = {
    id: `log-reset-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    actorName: 'Sistema',
    targetName: 'Todos los Combatientes',
    actionName: 'Reinicio de Encuentro',
    type: 'system',
    amount: 0,
    notes: 'Todos los combatientes han sido restaurados al 100% de HP, se han lanzado iniciativas para todos y devuelto a sus posiciones iniciales.',
  };

  const nextEncounter: EncounterState = {
    ...encounter,
    round: 1,
    activeTurnIndex: 0,
    turnPhase: 'start',
    combatPhase: 'active',
    victoryAchieved: false,
    isSurpriseRound: false,
    surpriseSide: null,
    combatants: finalCombatants,
    turnOrder: finalTurnOrder,
    log: [resetLog, ...encounter.log],
    lastUpdated: Date.now(),
  };

  return {
    nextEncounter,
    initiativeResults,
  };
}
