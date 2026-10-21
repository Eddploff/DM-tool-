import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rollSingleDie,
  rollD20,
  rollDiceFormula,
  formatD20Log,
  formatFormulaLog,
  parseAndRollDiceString,
} from './diceLogic.ts';

test('rollSingleDie clamps within bounds 1..sides', () => {
  const mockRandom = () => 0.9999;
  const result = rollSingleDie(20, mockRandom);
  assert.equal(result, 20);

  const mockMin = () => 0.0;
  assert.equal(rollSingleDie(6, mockMin), 1);
});

test('rollD20 normal, advantage and disadvantage correctly picks maximum and minimum', () => {
  // Test normal
  const normalResult = rollD20('normal', () => 0.95); // gives 20
  assert.equal(normalResult.result, 20);
  assert.equal(normalResult.isCrit, true);
  assert.equal(normalResult.isFumble, false);

  // Test advantage: first roll 5, second roll 18
  let call = 0;
  const advRandom = () => {
    call++;
    return call === 1 ? 0.2 : 0.85; // 5 and 18
  };
  const advResult = rollD20('advantage', advRandom);
  assert.equal(advResult.result, 18);
  assert.equal(advResult.dropped, 5);

  // Test disadvantage: first roll 15, second roll 4
  call = 0;
  const disRandom = () => {
    call++;
    return call === 1 ? 0.7 : 0.15; // 15 and 4
  };
  const disResult = rollD20('disadvantage', disRandom);
  assert.equal(disResult.result, 4);
  assert.equal(disResult.dropped, 15);
});

test('rollDiceFormula aggregates sum and applies modifier', () => {
  const fixedRoll = () => 0.5; // for d6: floor(0.5 * 6) + 1 = 4
  const res = rollDiceFormula(2, 6, 3, fixedRoll);
  assert.equal(res.rolls.length, 2);
  assert.equal(res.rolls[0], 4);
  assert.equal(res.rolls[1], 4);
  assert.equal(res.sum, 8);
  assert.equal(res.total, 11);
  assert.equal(res.formula, '2d6+3');
});

test('formatD20Log formats natural crit and natural 1 appropriately', () => {
  const crit = formatD20Log({
    mode: 'normal',
    rolls: [20],
    result: 20,
    isCrit: true,
    isFumble: false,
  }, 5);
  assert.ok(crit.includes('CRÍTICO NATURAL'));
  assert.ok(crit.includes('**25**'));

  const fumble = formatD20Log({
    mode: 'normal',
    rolls: [1],
    result: 1,
    isCrit: false,
    isFumble: true,
  }, 0);
  assert.ok(fumble.includes('PIFIA'));
});

test('parseAndRollDiceString handles valid formulas and rejects invalid ones', () => {
  const fixedRoll = () => 0.5; // for d6 -> 4; for d20 -> 11
  const roll1 = parseAndRollDiceString('2d6+3', fixedRoll);
  assert.ok(roll1);
  assert.equal(roll1.total, 11);
  assert.equal(roll1.formula, '2d6+3');

  const roll2 = parseAndRollDiceString('/r 1d20+5', fixedRoll);
  assert.ok(roll2);
  assert.equal(roll2.total, 16);

  const roll3 = parseAndRollDiceString('d8', fixedRoll);
  assert.ok(roll3);
  assert.equal(roll3.formula, '1d8');

  assert.equal(parseAndRollDiceString('hola que tal'), null);
  assert.equal(parseAndRollDiceString('1d1'), null);
});
