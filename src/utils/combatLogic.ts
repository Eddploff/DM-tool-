import type {
  Combatant,
  HealthStatusInfo,
  CombatLogEntry,
  EncounterState,
  FloatingNumber,
} from '../types/combat.ts';

/**
 * Pure logic for applying damage to a combatant.
 * Respects tempHp if available, clamps at 0.
 */
export function applyDamage(
  combatant: Combatant,
  damage: number
): { updated: Combatant; actualDamage: number; wasKilled: boolean } {
  const safeDamage = Math.max(0, Math.round(damage));
  const previousHp = combatant.currentHp;
  let remainingDamage = safeDamage;
  let newTempHp = combatant.tempHp || 0;

  if (newTempHp > 0) {
    if (newTempHp >= remainingDamage) {
      newTempHp -= remainingDamage;
      remainingDamage = 0;
    } else {
      remainingDamage -= newTempHp;
      newTempHp = 0;
    }
  }

  const newHp = Math.max(0, combatant.currentHp - remainingDamage);
  const actualDamage = (combatant.tempHp || 0) - newTempHp + (previousHp - newHp);
  const wasKilled = previousHp > 0 && newHp === 0;

  return {
    updated: {
      ...combatant,
      currentHp: newHp,
      tempHp: newTempHp,
    },
    actualDamage,
    wasKilled,
  };
}

/**
 * Pure logic for applying healing to a combatant.
 * Clamps to maxHp, cannot exceed maxHp.
 */
export function applyHeal(
  combatant: Combatant,
  heal: number
): { updated: Combatant; actualHealed: number; wasRevived: boolean } {
  const safeHeal = Math.max(0, Math.round(heal));
  const previousHp = combatant.currentHp;
  const newHp = Math.min(combatant.maxHp, combatant.currentHp + safeHeal);
  const actualHealed = newHp - previousHp;
  const wasRevived = previousHp === 0 && newHp > 0;

  return {
    updated: {
      ...combatant,
      currentHp: newHp,
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
  notes?: string
): CombatLogEntry {
  const now = new Date();
  const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    actorName,
    targetName,
    actionName,
    type,
    amount,
    isCrit,
    notes,
  };
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
