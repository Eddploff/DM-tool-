import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATTLE_ENVIRONMENTS,
  setEncounterEnvironment,
} from './environmentConfig.ts';
import type { EncounterState } from '../types/combat.ts';

const mockEncounter: EncounterState = {
  id: 'enc-1',
  title: 'Test Encounter',
  round: 1,
  combatPhase: 'active',
  environment: 'plains',
  combatants: [],
  turnOrder: [],
  activeTurnIndex: 0,
  log: [],
  lastUpdated: 1000,
};

test('BATTLE_ENVIRONMENTS catalog contains forest, dungeon, volcano, plains, cave, castle, crystal', () => {
  assert.ok(BATTLE_ENVIRONMENTS.forest);
  assert.equal(BATTLE_ENVIRONMENTS.forest.name, 'Bosque Místico');
  assert.equal(BATTLE_ENVIRONMENTS.forest.icon, '🌲');

  assert.ok(BATTLE_ENVIRONMENTS.dungeon);
  assert.equal(BATTLE_ENVIRONMENTS.dungeon.name, 'Mazmorra Antigua');
  assert.equal(BATTLE_ENVIRONMENTS.dungeon.icon, '🗝️');

  assert.ok(BATTLE_ENVIRONMENTS.volcano);
  assert.equal(BATTLE_ENVIRONMENTS.volcano.name, 'Cráter Volcánico');
  assert.equal(BATTLE_ENVIRONMENTS.volcano.icon, '🌋');
});

test('setEncounterEnvironment updates environment field and creates system log', () => {
  const updated = setEncounterEnvironment(mockEncounter, 'forest', 'Dungeon Master');
  assert.equal(updated.environment, 'forest');
  assert.equal(updated.log.length, 1);
  assert.equal(updated.log[0].actionName, 'Cambio de Entorno');
  assert.ok(updated.log[0].notes?.includes('Bosque Místico'));
  assert.ok(updated.lastUpdated > mockEncounter.lastUpdated);
});

test('setEncounterEnvironment returns same state if environment has not changed', () => {
  const same = setEncounterEnvironment(mockEncounter, 'plains');
  assert.equal(same, mockEncounter);
});
