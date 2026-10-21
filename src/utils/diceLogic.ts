/**
 * Pure dice rolling utility functions for tabletop RPGs.
 */

export type D20RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface D20RollResult {
  mode: D20RollMode;
  rolls: [number, number] | [number];
  result: number;
  dropped?: number;
  isCrit: boolean;
  isFumble: boolean;
}

export interface FormulaRollResult {
  count: number;
  sides: number;
  modifier: number;
  rolls: number[];
  sum: number;
  total: number;
  formula: string;
}

/**
 * Rolls a single die with N sides.
 */
export function rollSingleDie(sides: number, randomFn = Math.random): number {
  if (sides <= 0) return 1;
  return Math.floor(randomFn() * sides) + 1;
}

/**
 * Rolls a d20 with normal, advantage, or disadvantage.
 */
export function rollD20(
  mode: D20RollMode = 'normal',
  randomFn = Math.random
): D20RollResult {
  const r1 = rollSingleDie(20, randomFn);

  if (mode === 'normal') {
    return {
      mode: 'normal',
      rolls: [r1],
      result: r1,
      isCrit: r1 === 20,
      isFumble: r1 === 1,
    };
  }

  const r2 = rollSingleDie(20, randomFn);
  if (mode === 'advantage') {
    const result = Math.max(r1, r2);
    const dropped = Math.min(r1, r2);
    return {
      mode: 'advantage',
      rolls: [r1, r2],
      result,
      dropped,
      isCrit: result === 20,
      isFumble: result === 1,
    };
  } else {
    // disadvantage
    const result = Math.min(r1, r2);
    const dropped = Math.max(r1, r2);
    return {
      mode: 'disadvantage',
      rolls: [r1, r2],
      result,
      dropped,
      isCrit: result === 20,
      isFumble: result === 1,
    };
  }
}

/**
 * Rolls multiple dice with an optional modifier: e.g. 2d6 + 3.
 */
export function rollDiceFormula(
  count: number,
  sides: number,
  modifier: number = 0,
  randomFn = Math.random
): FormulaRollResult {
  const safeCount = Math.max(1, Math.min(count, 50));
  const safeSides = Math.max(2, Math.min(sides, 1000));
  const rolls: number[] = [];

  for (let i = 0; i < safeCount; i++) {
    rolls.push(rollSingleDie(safeSides, randomFn));
  }

  const sum = rolls.reduce((acc, r) => acc + r, 0);
  const total = Math.max(0, sum + modifier);

  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  const formula = `${safeCount}d${safeSides}${modStr}`;

  return {
    count: safeCount,
    sides: safeSides,
    modifier,
    rolls,
    sum,
    total,
    formula,
  };
}

/**
 * Formats a d20 roll into a human-readable combat log string.
 */
export function formatD20Log(result: D20RollResult, modifier: number = 0): string {
  const modStr = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : '';
  const finalTotal = result.result + modifier;

  let modeTag = '';
  if (result.mode === 'advantage') {
    modeTag = ` (Ventaja: [${result.rolls.join(', ')}], descartado: ${result.dropped})`;
  } else if (result.mode === 'disadvantage') {
    modeTag = ` (Desventaja: [${result.rolls.join(', ')}], descartado: ${result.dropped})`;
  }

  let tag = '';
  if (result.isCrit) tag = ' ⭐ ¡CRÍTICO NATURAL!';
  else if (result.isFumble) tag = ' 💀 ¡PIFIA (1 NATURAL)!';

  return `d20${modStr} ➔ [${result.result}]${modStr} = **${finalTotal}**${modeTag}${tag}`;
}

/**
 * Formats a formula roll into a combat log string.
 */
export function formatFormulaLog(result: FormulaRollResult): string {
  const rollsList = result.rolls.length > 1 ? `[${result.rolls.join(' + ')}]` : `[${result.rolls[0]}]`;
  const modStr = result.modifier !== 0 ? ` ${result.modifier > 0 ? '+' : '-'} ${Math.abs(result.modifier)}` : '';
  return `${result.formula} ➔ ${rollsList}${modStr} = **${result.total}**`;
}

/**
 * Parses simple dice formulas like '1d20+5', '2d6', 'd8-1' or '/r 1d20+3'.
 * Returns roll details or null if string is not a recognized formula.
 */
export function parseAndRollDiceString(
  input: string,
  randomFn = Math.random
): { success: boolean; logText: string; total: number; formula: string } | null {
  const clean = input.trim().replace(/^\/r(?:oll)?\s+/i, '').toLowerCase();
  // Match e.g. "2d6+3", "d20", "1d10-2"
  const match = clean.match(/^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const sign = match[3];
  const modNum = match[4] ? parseInt(match[4], 10) : 0;
  const modifier = sign === '-' ? -modNum : modNum;

  if (count <= 0 || sides <= 1) return null;

  const result = rollDiceFormula(count, sides, modifier, randomFn);
  const logText = formatFormulaLog(result);
  return {
    success: true,
    logText,
    total: result.total,
    formula: result.formula,
  };
}
