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
  getCombatantsInAoE,
  rollInitiativeForAll,
  resetEncounterToFull,
  getSafeHpValues,
  calculateGridDistance,
  getPotentialTargets,
  sortCombatantsByInitiative,
  adjustCombatantResource,
  resetCombatantResources,
  recordDeathSaveRoll,
  setManualDeathSaves,
  resetDeathSaves,
  filterCombatLogs,
  isCombatLogDiceRoll,
} from './combatLogic.ts';
import { sanitizeForFirestore } from './sanitize.ts';
import { playAttackSoundByDamageType } from './soundEffects.ts';
import type { Combatant, EncounterState, CombatLogEntry } from '../types/combat.ts';

const mockPlayer: Combatant = {
  id: 'player-1',
  name: 'Cecil',
  type: 'player',
  avatar: '',
  currentHp: 100,
  maxHp: 100,
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

test('damage resistance halves effective damage (rounded down)', () => {
  const resistantEnemy: Combatant = {
    ...mockEnemy,
    damageResistances: ['physical'],
  };

  // 45 physical damage -> halved to 22
  const physDmg = applyDamage(resistantEnemy, 45, 'physical');
  assert.equal(physDmg.isResisted, true);
  assert.equal(physDmg.effectiveDamage, 22);
  assert.equal(physDmg.updated.currentHp, 178);

  // 45 magical damage -> not resisted, full 45
  const magDmg = applyDamage(resistantEnemy, 45, 'magical');
  assert.equal(magDmg.isResisted, false);
  assert.equal(magDmg.effectiveDamage, 45);
  assert.equal(magDmg.updated.currentHp, 155);
});

test('temporary HP absorbs damage first before reducing current HP', () => {
  const shieldedPlayer: Combatant = {
    ...mockPlayer,
    currentHp: 100,
    tempHp: 20,
  };

  // 15 damage absorbed entirely by tempHp
  const lightHit = applyDamage(shieldedPlayer, 15, 'physical');
  assert.equal(lightHit.updated.tempHp, 5);
  assert.equal(lightHit.updated.currentHp, 100);

  // 30 damage breaks 20 tempHp and does 10 to currentHp
  const heavyHit = applyDamage(shieldedPlayer, 30, 'physical');
  assert.equal(heavyHit.updated.tempHp, 0);
  assert.equal(heavyHit.updated.currentHp, 90);
});

test('getCombatantsInAoE accurately detects targets within circular and square templates', () => {
  const targetA: Combatant = { ...mockPlayer, id: 'a', gridPosition: { col: 5, row: 5 } };
  const targetB: Combatant = { ...mockEnemy, id: 'b', gridPosition: { col: 6, row: 5 } };
  const targetFar: Combatant = { ...mockEnemy, id: 'far', gridPosition: { col: 12, row: 7 } };

  // 20 ft square at (5, 5) => cellRadius = 2 => cols 3-7, rows 3-7
  const squareAoE = { shape: 'square' as const, sizeFeet: 20 as const, centerCol: 5, centerRow: 5 };
  const inSquare = getCombatantsInAoE([targetA, targetB, targetFar], squareAoE);
  assert.equal(inSquare.length, 2);
  assert.ok(inSquare.some((c) => c.id === 'a'));
  assert.ok(inSquare.some((c) => c.id === 'b'));

  // 10 ft circle at (5, 5)
  const circleAoE = { shape: 'circle' as const, sizeFeet: 10 as const, centerCol: 5, centerRow: 5 };
  const inCircle = getCombatantsInAoE([targetA, targetB, targetFar], circleAoE);
  assert.ok(inCircle.some((c) => c.id === 'a'));
});

test('rollInitiativeForAll correctly rolls d20 + bonus, updates combatants, and sorts turn order descending', () => {
  const heroA: Combatant = { ...mockPlayer, id: 'h1', name: 'Cecil', initiativeBonus: 3 };
  const heroB: Combatant = { ...mockPlayer, id: 'h2', name: 'Rosa', initiativeBonus: 1 };
  const enemyA: Combatant = { ...mockEnemy, id: 'e1', name: 'Behemoth', initiativeBonus: 2 };

  // Custom rolls: h1 rolls 10 (+3=13), h2 rolls 18 (+1=19), e1 rolls 12 (+2=14)
  const customRolls = { h1: 10, h2: 18, e1: 12 };
  const { results, sortedTurnOrder, updatedCombatants } = rollInitiativeForAll(
    [heroA, heroB, enemyA],
    customRolls
  );

  assert.equal(results.length, 3);
  assert.deepEqual(sortedTurnOrder, ['h2', 'e1', 'h1']); // 19, 14, 13
  assert.equal(updatedCombatants.find((c) => c.id === 'h2')?.initiative, 19);
  assert.equal(updatedCombatants.find((c) => c.id === 'e1')?.initiative, 14);
  assert.equal(updatedCombatants.find((c) => c.id === 'h1')?.initiative, 13);
});

test('resetEncounterToFull restores 100% health, rolls initiative, re-sorts turn order, and resets grid positions', () => {
  const damagedPlayer: Combatant = {
    ...mockPlayer,
    id: 'char-1', // Matches canonical Cecil
    currentHp: 12,
    maxHp: 85,
    tempHp: 15,
    gridPosition: { col: 5, row: 5 }, // moved
  };
  const damagedEnemy: Combatant = {
    ...mockEnemy,
    id: 'enemy-1', // Matches canonical Behemoth
    currentHp: 0, // defeated
    maxHp: 160,
    tempHp: 0,
    gridPosition: { col: 8, row: 8 }, // moved
  };

  const currentEncounter: EncounterState = {
    id: 'enc-1',
    title: 'Test Encounter',
    round: 4,
    combatPhase: 'active',
    environment: 'plains',
    combatants: [damagedPlayer, damagedEnemy],
    turnOrder: ['enemy-1', 'char-1'],
    activeTurnIndex: 1,
    victoryAchieved: true,
    log: [],
    lastUpdated: Date.now(),
  };

  const { nextEncounter, initiativeResults } = resetEncounterToFull(currentEncounter, {
    autoRollInitiative: true,
    resetFormation: true,
    customRolls: { 'char-1': 15, 'enemy-1': 10 },
  });

  // Verify everyone is restored to 100% max health with 0 tempHp
  const resetPlayer = nextEncounter.combatants.find((c) => c.id === 'char-1')!;
  const resetEnemy = nextEncounter.combatants.find((c) => c.id === 'enemy-1')!;

  assert.equal(resetPlayer.currentHp, resetPlayer.maxHp);
  assert.equal(resetPlayer.currentHp, 85);
  assert.equal(resetPlayer.tempHp, 0);

  assert.equal(resetEnemy.currentHp, resetEnemy.maxHp);
  assert.equal(resetEnemy.currentHp, 160);
  assert.equal(resetEnemy.tempHp, 0);

  // Verify tokens moved to initial grid positions
  assert.deepEqual(resetPlayer.gridPosition, { col: 10, row: 3 });
  assert.deepEqual(resetEnemy.gridPosition, { col: 2, row: 3 });

  // Verify initiative roll and turn order re-sorted
  assert.ok(initiativeResults && initiativeResults.length === 2);
  assert.equal(nextEncounter.turnOrder[0], 'char-1'); // char-1 had higher roll
  assert.equal(nextEncounter.round, 1);
  assert.equal(nextEncounter.activeTurnIndex, 0);
  assert.equal(nextEncounter.victoryAchieved, false);

  // Verify HP percentage calculation for token
  const safeMax = Math.max(1, resetPlayer.maxHp || 1);
  const safeCurrent = Math.max(0, Math.min(safeMax, resetPlayer.currentHp ?? 0));
  const hpPercent = Math.min(100, Math.max(0, Math.round((safeCurrent / safeMax) * 100)));
  assert.equal(hpPercent, 100);
});

test('getSafeHpValues prevents NaN and calculates exact HP ratios and percentages even on undefined or healed values', () => {
  // Undefined currentHp should safely default to max (100%)
  const resUndefined = getSafeHpValues(undefined, 85);
  assert.equal(resUndefined.current, 85);
  assert.equal(resUndefined.max, 85);
  assert.equal(resUndefined.ratio, 1);
  assert.equal(resUndefined.percent, 100);

  // Full health
  const resFull = getSafeHpValues(100, 100);
  assert.equal(resFull.current, 100);
  assert.equal(resFull.max, 100);
  assert.equal(resFull.ratio, 1);
  assert.equal(resFull.percent, 100);

  // Half health
  const resHalf = getSafeHpValues(40, 80);
  assert.equal(resHalf.current, 40);
  assert.equal(resHalf.max, 80);
  assert.equal(resHalf.ratio, 0.5);
  assert.equal(resHalf.percent, 50);

  // 0 health
  const resZero = getSafeHpValues(0, 50);
  assert.equal(resZero.current, 0);
  assert.equal(resZero.max, 50);
  assert.equal(resZero.ratio, 0);
  assert.equal(resZero.percent, 0);

  // String inputs
  const resString = getSafeHpValues('45', '90');
  assert.equal(resString.current, 45);
  assert.equal(resString.max, 90);
  assert.equal(resString.percent, 50);

  // Invalid maxHp defaults safely to 1
  const resInvalid = getSafeHpValues(-5, 0);
  assert.equal(resInvalid.max, 1);
  assert.equal(resInvalid.current, 0);
  assert.equal(resInvalid.percent, 0);
});

test('sanitizeForFirestore recursively strips undefined fields and preserves valid data', () => {
  const dirtyData = {
    id: 'room-1',
    code: '7FGUHY',
    emptyField: undefined,
    count: 42,
    active: true,
    surpriseSide: null,
    encounter: {
      combatants: [
        {
          id: 'char-1',
          name: 'Cecil',
          notes: undefined,
          tempHp: 0,
          initiative: undefined,
          actions: [
            {
              id: 'act-1',
              name: 'Ataque',
              effectType: undefined,
            },
          ],
        },
      ],
      log: [
        {
          id: 'log-1',
          notes: undefined,
          playerAmount: undefined,
          isCrit: false,
        },
      ],
    },
    arrayWithUndefined: ['ok', undefined, 'fine'],
  };

  const sanitized = sanitizeForFirestore(dirtyData);

  // Check top-level
  assert.equal('emptyField' in sanitized, false);
  assert.equal(sanitized.code, '7FGUHY');
  assert.equal(sanitized.surpriseSide, null);

  // Check nested combatant
  const sanitizedCombatant = sanitized.encounter.combatants[0];
  assert.equal('notes' in sanitizedCombatant, false);
  assert.equal('initiative' in sanitizedCombatant, false);
  assert.equal(sanitizedCombatant.name, 'Cecil');
  assert.equal(sanitizedCombatant.tempHp, 0);

  // Check nested action
  assert.equal('effectType' in sanitizedCombatant.actions[0], false);

  // Check nested log
  const sanitizedLog = sanitized.encounter.log[0];
  assert.equal('notes' in sanitizedLog, false);
  assert.equal('playerAmount' in sanitizedLog, false);
  assert.equal(sanitizedLog.isCrit, false);

  // Check array elements
  assert.deepEqual(sanitized.arrayWithUndefined, ['ok', 'fine']);

  // Ensure JSON.stringify does not have any undefined
  const str = JSON.stringify(sanitized);
  assert.ok(!str.includes('undefined'));
});

test('playAttackSoundByDamageType safely accepts all damage types without error in non-browser env', () => {
  const allTypes = [
    'fuego',
    'frio',
    'rayo',
    'trueno',
    'contundente',
    'cortante',
    'perforante',
    'acido',
    'veneno',
    'necrotico',
    'radiante',
    'psiquico',
    'fuerza',
    'magical',
    'physical',
  ] as const;

  // In Node environment, window/AudioContext is absent, so functions should return safely without throwing
  assert.doesNotThrow(() => {
    allTypes.forEach((dt) => {
      playAttackSoundByDamageType(dt);
      playAttackSoundByDamageType(dt, true); // test with crit
    });
  });
});

test('calculateGridDistance correctly calculates Chebyshev squares, feet and Euclidean distance', () => {
  const c1 = { gridPosition: { col: 2, row: 3 } };
  const c2 = { gridPosition: { col: 6, row: 3 } }; // 4 squares straight
  const distStraight = calculateGridDistance(c1, c2);
  assert.equal(distStraight.dx, 4);
  assert.equal(distStraight.dy, 0);
  assert.equal(distStraight.squares, 4);
  assert.equal(distStraight.feet, 20);
  assert.equal(distStraight.exactFeet, 20);

  // Diagonal 3 across, 4 down
  const c3 = { gridPosition: { col: 5, row: 7 } }; // dx=3, dy=4
  const distDiag = calculateGridDistance(c1, c3);
  assert.equal(distDiag.dx, 3);
  assert.equal(distDiag.dy, 4);
  assert.equal(distDiag.squares, 4); // Chebyshev is 4
  assert.equal(distDiag.feet, 20);
  assert.equal(distDiag.exactDistance, 5); // 3-4-5 triangle
  assert.equal(distDiag.exactFeet, 25);
});

test('getPotentialTargets separates hostile and friendly, sorts by proximity and selects nearest enemy', () => {
  const actor: Combatant = {
    id: 'hero-1',
    name: 'Cecil',
    type: 'player',
    avatar: '',
    currentHp: 80,
    maxHp: 80,
    jobClass: 'Paladín',
    actions: [],
    statusEffects: [],
    gridPosition: { col: 10, row: 3 },
  };

  const ally: Combatant = {
    id: 'hero-2',
    name: 'Rosa',
    type: 'player',
    avatar: '',
    currentHp: 50,
    maxHp: 50,
    jobClass: 'Clériga',
    actions: [],
    statusEffects: [],
    gridPosition: { col: 10, row: 4 }, // 1 square away
  };

  const closeEnemy: Combatant = {
    id: 'enemy-goblin',
    name: 'Goblin',
    type: 'enemy',
    avatar: '',
    currentHp: 20,
    maxHp: 20,
    jobClass: 'Monstruo',
    actions: [],
    statusEffects: [],
    gridPosition: { col: 7, row: 3 }, // dx=3, dy=0 (15 ft)
  };

  const farEnemy: Combatant = {
    id: 'enemy-behemoth',
    name: 'Behemoth',
    type: 'enemy',
    avatar: '',
    currentHp: 160,
    maxHp: 160,
    jobClass: 'Monstruo Jefe',
    actions: [],
    statusEffects: [],
    gridPosition: { col: 2, row: 3 }, // dx=8, dy=0 (40 ft)
  };

  const deadEnemy: Combatant = {
    id: 'enemy-dead',
    name: 'Esqueleto Caído',
    type: 'enemy',
    avatar: '',
    currentHp: 0,
    maxHp: 30,
    jobClass: 'Monstruo',
    actions: [],
    statusEffects: [],
    gridPosition: { col: 9, row: 3 }, // closest but dead
  };

  const result = getPotentialTargets(actor, [actor, ally, closeEnemy, farEnemy, deadEnemy]);

  // Dead enemies should not be included
  assert.equal(result.hostileTargets.length, 2);
  assert.equal(result.friendlyTargets.length, 1);

  // Friendly target is Rosa
  assert.equal(result.friendlyTargets[0].combatant.name, 'Rosa');
  assert.equal(result.friendlyTargets[0].distance.squares, 1);

  // Nearest enemy should be Goblin (15 ft)
  assert.ok(result.nearestEnemy);
  assert.equal(result.nearestEnemy.combatant.name, 'Goblin');
  assert.equal(result.nearestEnemy.distance.squares, 3);
  assert.equal(result.nearestEnemy.distance.feet, 15);

  // Far enemy is second
  assert.equal(result.hostileTargets[1].combatant.name, 'Behemoth');
  assert.equal(result.hostileTargets[1].distance.feet, 40);
});

test('sortCombatantsByInitiative sorts combatant IDs descending by initiative with tie-breaking', () => {
  const combatants: Combatant[] = [
    {
      id: 'c1',
      name: 'Cecil',
      type: 'player',
      avatar: '',
      currentHp: 80,
      maxHp: 80,
      jobClass: 'Paladín',
      actions: [],
      statusEffects: [],
      initiative: 14,
    },
    {
      id: 'c2',
      name: 'Goblin',
      type: 'enemy',
      avatar: '',
      currentHp: 20,
      maxHp: 20,
      jobClass: 'Monstruo',
      actions: [],
      statusEffects: [],
      initiative: 22,
    },
    {
      id: 'c3',
      name: 'Rosa',
      type: 'player',
      avatar: '',
      currentHp: 50,
      maxHp: 50,
      jobClass: 'Clériga',
      actions: [],
      statusEffects: [],
      initiative: 18,
    },
    {
      id: 'c4',
      name: 'Behemoth',
      type: 'enemy',
      avatar: '',
      currentHp: 160,
      maxHp: 160,
      jobClass: 'Jefe',
      actions: [],
      statusEffects: [],
      initiative: 14, // tied with Cecil
    },
  ];

  // 1. Sort using combatants' existing initiative:
  // Expected: c2 (22) -> c3 (18) -> c1 (14, player beats enemy on tie) -> c4 (14)
  const sorted = sortCombatantsByInitiative(combatants);
  assert.deepEqual(sorted, ['c2', 'c3', 'c1', 'c4']);

  // 2. Sort using an overridden initiatives map:
  const customInits: Record<string, number> = {
    c1: 25,
    c2: 10,
    c3: 5,
    c4: 30,
  };
  const sortedCustom = sortCombatantsByInitiative(combatants, customInits);
  assert.deepEqual(sortedCustom, ['c4', 'c1', 'c2', 'c3']);
});

test('adjustCombatantResource clamps values between 0 and max, and resetCombatantResources restores to max', () => {
  const combatant: Combatant = {
    id: 'c1',
    name: 'Vivi',
    type: 'player',
    avatar: '',
    currentHp: 40,
    maxHp: 40,
    jobClass: 'Mago',
    actions: [],
    statusEffects: [],
    resources: [
      { id: 'r1', name: 'Espacios Nv. 1', current: 4, max: 4, category: 'spell' },
      { id: 'r2', name: 'Puntos de Hechicería', current: 5, max: 5, category: 'class' },
    ],
  };

  // Spend 2 spell slots
  const spent = adjustCombatantResource(combatant, 'r1', -2);
  assert.equal(spent.resources?.[0].current, 2);

  // Try to spend more than available (clamp to 0)
  const empty = adjustCombatantResource(spent, 'r1', -5);
  assert.equal(empty.resources?.[0].current, 0);

  // Try to gain more than max (clamp to max 4)
  const over = adjustCombatantResource(empty, 'r1', 10);
  assert.equal(over.resources?.[0].current, 4);

  // Partially spend both and then reset
  let modified = adjustCombatantResource(combatant, 'r1', -3); // 1 / 4
  modified = adjustCombatantResource(modified, 'r2', -4); // 1 / 5
  assert.equal(modified.resources?.[0].current, 1);
  assert.equal(modified.resources?.[1].current, 1);

  const restored = resetCombatantResources(modified);
  assert.equal(restored.resources?.[0].current, 4);
  assert.equal(restored.resources?.[1].current, 5);
});

test('recordDeathSaveRoll accurately implements D&D 5e death saving throw rules', () => {
  const dyingPlayer: Combatant = {
    id: 'hero-1',
    name: 'Cecil',
    type: 'player',
    avatar: '',
    currentHp: 0,
    maxHp: 50,
    jobClass: 'Paladín',
    actions: [],
    statusEffects: ['inconsciente'],
    deathSaves: { successes: 0, failures: 0, isStable: false },
  };

  // Roll >= 10 adds 1 success
  const roll1 = recordDeathSaveRoll(dyingPlayer, 14);
  assert.equal(roll1.result, 'success');
  assert.equal(roll1.updated.deathSaves?.successes, 1);
  assert.equal(roll1.updated.deathSaves?.failures, 0);

  // Roll < 10 adds 1 failure
  const roll2 = recordDeathSaveRoll(roll1.updated, 7);
  assert.equal(roll2.result, 'failure');
  assert.equal(roll2.updated.deathSaves?.successes, 1);
  assert.equal(roll2.updated.deathSaves?.failures, 1);

  // Roll Natural 1 adds 2 failures
  const rollNat1 = recordDeathSaveRoll(roll2.updated, 1);
  assert.equal(rollNat1.result, 'dead'); // 1 + 2 = 3 failures -> Dead
  assert.equal(rollNat1.updated.deathSaves?.failures, 3);

  // Roll Natural 20 restores 1 HP and wakes up
  const revived = recordDeathSaveRoll(dyingPlayer, 20);
  assert.equal(revived.result, 'nat20_revived');
  assert.equal(revived.updated.currentHp, 1);
  assert.equal(revived.updated.deathSaves?.successes, 0);
  assert.equal(revived.updated.deathSaves?.failures, 0);
  assert.ok(!revived.updated.statusEffects.includes('inconsciente'));

  // 3 Successes stabilizes
  let st = dyingPlayer;
  st = recordDeathSaveRoll(st, 12).updated; // 1
  st = recordDeathSaveRoll(st, 15).updated; // 2
  const finalRoll = recordDeathSaveRoll(st, 18); // 3
  assert.equal(finalRoll.result, 'stabilized');
  assert.equal(finalRoll.updated.deathSaves?.isStable, true);

  // Manual death saves overrides
  const manual = setManualDeathSaves(dyingPlayer, 2, 1);
  assert.equal(manual.deathSaves?.successes, 2);
  assert.equal(manual.deathSaves?.failures, 1);

  // Reset death saves
  const clean = resetDeathSaves(manual);
  assert.equal(clean.deathSaves?.successes, 0);
  assert.equal(clean.deathSaves?.failures, 0);
});

test('filterCombatLogs filters by damage, rolls, chat, heal and all', () => {
  const sampleLogs: CombatLogEntry[] = [
    {
      id: 'log-1',
      timestamp: '10:00:00',
      actorName: 'Cecil',
      targetName: 'Behemoth',
      actionName: 'Espada Reluciente',
      type: 'damage',
      amount: 15,
    },
    {
      id: 'log-2',
      timestamp: '10:01:00',
      actorName: 'Cecil',
      targetName: 'Mesa',
      actionName: 'Tirada de Dados',
      type: 'roll',
      amount: 0,
      notes: 'd20 ➔ [18] = **18**',
    },
    {
      id: 'log-3',
      timestamp: '10:02:00',
      actorName: 'Rosa',
      targetName: 'Cecil',
      actionName: 'Curar Heridas',
      type: 'heal',
      amount: 12,
    },
    {
      id: 'log-4',
      timestamp: '10:03:00',
      actorName: 'Vivi',
      targetName: 'Mesa',
      actionName: 'Mensaje',
      type: 'chat',
      amount: 0,
      notes: '¡Preparo Bola de Fuego!',
    },
    {
      id: 'log-5',
      timestamp: '10:04:00',
      actorName: 'DM',
      targetName: 'Mesa',
      actionName: 'Tirada de Ataque',
      type: 'roll',
      amount: 0,
      notes: 'd20 ➔ [14] = **14**',
    },
  ];

  // Test 'all'
  assert.equal(filterCombatLogs(sampleLogs, 'all').length, 5);

  // Test 'damage'
  const damageLogs = filterCombatLogs(sampleLogs, 'damage');
  assert.equal(damageLogs.length, 1);
  assert.equal(damageLogs[0].id, 'log-1');

  // Test 'rolls'
  const rollLogs = filterCombatLogs(sampleLogs, 'rolls');
  assert.equal(rollLogs.length, 2);
  assert.equal(rollLogs[0].id, 'log-2');
  assert.equal(rollLogs[1].id, 'log-5');

  // Test 'chat'
  const chatLogs = filterCombatLogs(sampleLogs, 'chat');
  assert.equal(chatLogs.length, 1);
  assert.equal(chatLogs[0].id, 'log-4');

  // Test 'heal'
  const healLogs = filterCombatLogs(sampleLogs, 'heal');
  assert.equal(healLogs.length, 1);
  assert.equal(healLogs[0].id, 'log-3');

  // Test isCombatLogDiceRoll
  assert.equal(isCombatLogDiceRoll(sampleLogs[1]), true);
  assert.equal(isCombatLogDiceRoll(sampleLogs[4]), true);
  assert.equal(isCombatLogDiceRoll(sampleLogs[0]), false);
});





