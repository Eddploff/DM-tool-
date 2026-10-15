import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addStatusEffect,
  removeStatusEffect,
  toggleStatusEffect,
  getStatusEffectMeta,
  STATUS_EFFECTS_CATALOG,
} from './statusEffects.ts';
import type { Combatant } from '../types/combat.ts';

const mockCombatant: Combatant = {
  id: 'c-1',
  name: 'Goblin',
  type: 'enemy',
  avatar: '',
  currentHp: 30,
  maxHp: 30,
  armorClass: 12,
  attackBonus: 2,
  jobClass: 'Monstruo',
  actions: [],
  statusEffects: [],
};

test('addStatusEffect adds status and prevents duplicates', () => {
  const withPoison = addStatusEffect(mockCombatant, 'veneno');
  assert.deepEqual(withPoison.statusEffects, ['veneno']);

  const duplicate = addStatusEffect(withPoison, 'Veneno');
  assert.deepEqual(duplicate.statusEffects, ['veneno']);
});

test('removeStatusEffect deletes status cleanly', () => {
  const initial = { ...mockCombatant, statusEffects: ['veneno', 'paralisis'] };
  const removed = removeStatusEffect(initial, 'veneno');
  assert.deepEqual(removed.statusEffects, ['paralisis']);
});

test('toggleStatusEffect toggles state on and off', () => {
  const toggledOn = toggleStatusEffect(mockCombatant, 'bendicion');
  assert.deepEqual(toggledOn.statusEffects, ['bendicion']);

  const toggledOff = toggleStatusEffect(toggledOn, 'bendicion');
  assert.deepEqual(toggledOff.statusEffects, []);
});

test('getStatusEffectMeta resolves known catalog and handles unknown gracefully', () => {
  const poisonMeta = getStatusEffectMeta('veneno');
  assert.equal(poisonMeta.name, 'Veneno');
  assert.equal(poisonMeta.icon, '☠️');

  const customMeta = getStatusEffectMeta('Aturdido');
  assert.equal(customMeta.name, 'Aturdido');
});
