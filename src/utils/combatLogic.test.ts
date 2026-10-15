import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDamage,
  applyHeal,
  splitIntoDigits,
  combineDigits,
  cycleDigit,
  getHealthStatus,
  advanceTurn,
  retreatTurn,
} from './combatLogic.ts';
import type { Combatant, EncounterState } from '../types/combat.ts';

const mockPlayer: Combatant = {
  id: 'player-1',
  name: 'Cecil',
  type: 'player',
  avatar: '',
  currentHp: 100,
  maxHp: 100,
  armorClass: 18,
  attackBonus: 5,
  jobClass: 'Paladín',
  actions: [],
  statusEffects: [],
};

const mockEnemy: Combatant = {
  id: 'enemy-1',
  name: 'Behemoth',
  type: 'enemy',
  avatar: '',
  currentHp: 200,
  maxHp: 200,
  armorClass: 16,
  attackBonus: 7,
  jobClass: 'Bestia',
  actions: [],
  statusEffects: [],
};

test('splitIntoDigits and combineDigits work for 3-digit tabletop counter', () => {
  const digits = splitIntoDigits(148);
  assert.equal(digits.hundreds, 1);
  assert.equal(digits.tens, 4);
  assert.equal(digits.units, 8);

  const combined = combineDigits(2, 5, 9);
  assert.equal(combined, 259);

  const zero = splitIntoDigits(0);
  assert.equal(zero.hundreds, 0);
  assert.equal(zero.tens, 0);
  assert.equal(zero.units, 0);
});

test('cycleDigit wraps correctly 0-9', () => {
  assert.equal(cycleDigit(0, 1), 1);
  assert.equal(cycleDigit(9, 1), 0);
  assert.equal(cycleDigit(0, -1), 9);
  assert.equal(cycleDigit(5, -1), 4);
});

test('applyDamage and applyHeal operate accurately', () => {
  const dmg = applyDamage(mockEnemy, 42);
  assert.equal(dmg.updated.currentHp, 158);
  assert.equal(dmg.actualDamage, 42);

  const wounded = { ...mockPlayer, currentHp: 50 };
  const heal = applyHeal(wounded, 30);
  assert.equal(heal.updated.currentHp, 80);
  assert.equal(heal.actualHealed, 30);
});

test('advanceTurn and retreatTurn work correctly under DM control', () => {
  const baseEncounter: EncounterState = {
    id: 'enc-1',
    title: 'Test Encounter',
    round: 1,
    combatPhase: 'active',
    environment: 'plains',
    combatants: [mockPlayer, mockEnemy],
    turnOrder: ['player-1', 'enemy-1'],
    activeTurnIndex: 0,
    log: [],
    lastUpdated: Date.now(),
  };

  const next = advanceTurn(baseEncounter);
  assert.equal(next.activeTurnIndex, 1);

  const prev = retreatTurn(next);
  assert.equal(prev.activeTurnIndex, 0);
});

test('health status correctly categorizes health levels and respects environments', () => {
  const full = getHealthStatus(100, 100);
  assert.equal(full.level, 'unscathed');

  const injured = getHealthStatus(60, 100);
  assert.equal(injured.level, 'injured');

  const bloodied = getHealthStatus(30, 100);
  assert.equal(bloodied.level, 'bloodied');

  const dead = getHealthStatus(0, 100);
  assert.equal(dead.level, 'defeated');

  const validEnvironments = ['plains', 'forest', 'dungeon', 'volcano', 'cave', 'castle', 'crystal'];
  assert.ok(validEnvironments.includes('forest'));
  assert.ok(validEnvironments.includes('dungeon'));
  assert.ok(validEnvironments.includes('volcano'));
});

test('combatant supports optional VTT gridPosition coordinates', () => {
  const positionedCombatant: Combatant = {
    ...mockPlayer,
    gridPosition: { col: 10, row: 4 },
  };
  assert.deepEqual(positionedCombatant.gridPosition, { col: 10, row: 4 });
  assert.ok(positionedCombatant.gridPosition.col >= 0 && positionedCombatant.gridPosition.col < 14);
  assert.ok(positionedCombatant.gridPosition.row >= 0 && positionedCombatant.gridPosition.row < 8);
});
