import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePlotThreads,
  togglePlotThreadAtLine,
  addPlotThreadToMarkdown,
  getPlotThreadsStats,
  DEFAULT_DM_NOTES_TEMPLATE,
} from './dmNotesLogic.ts';

test('parsePlotThreads extracts checklist items and categorizes correctly', () => {
  const sample = `
# Campaña
### 🎯 Trama Principal
- [ ] Recuperar el orbe estelar
- [x] Cruzar el sendero silvano

### 🗝️ Pistas y Secretos
- [ ] [PISTA] Medallón con runas
- [ ] [PELIGRO] Emboscada en la caverna
- [x] [BOTÍN] 100 monedas de oro
`;

  const threads = parsePlotThreads(sample);
  assert.equal(threads.length, 5);

  assert.equal(threads[0].text, 'Recuperar el orbe estelar');
  assert.equal(threads[0].completed, false);
  assert.equal(threads[0].category, 'main');

  assert.equal(threads[1].text, 'Cruzar el sendero silvano');
  assert.equal(threads[1].completed, true);
  assert.equal(threads[1].category, 'main');

  assert.equal(threads[2].tag, 'PISTA');
  assert.equal(threads[2].category, 'secret');

  assert.equal(threads[3].tag, 'PELIGRO');
  assert.equal(threads[3].category, 'quest');

  assert.equal(threads[4].tag, 'BOTÍN');
  assert.equal(threads[4].completed, true);
  assert.equal(threads[4].category, 'loot');
});

test('togglePlotThreadAtLine flips between checked and unchecked', () => {
  const sample = `- [ ] Tarea 1\n- [x] Tarea 2\n- [ ] Tarea 3`;

  // Toggle line 0 from [ ] to [x]
  const updated1 = togglePlotThreadAtLine(sample, 0);
  assert.ok(updated1.includes('- [x] Tarea 1'));

  // Toggle line 1 from [x] to [ ]
  const updated2 = togglePlotThreadAtLine(updated1, 1);
  assert.ok(updated2.includes('- [ ] Tarea 2'));

  // Invalid line number returns original
  const unchanged = togglePlotThreadAtLine(sample, 99);
  assert.equal(unchanged, sample);
});

test('addPlotThreadToMarkdown appends new thread under section or end', () => {
  const sample = `### 🎯 Hilos Argumentales\n- [ ] Hilo 1\n`;
  const added = addPlotThreadToMarkdown(sample, 'Nuevo Hilo Clave', 'PISTA');

  assert.ok(added.includes('- [ ] [PISTA] Nuevo Hilo Clave'));

  // When empty
  const fromEmpty = addPlotThreadToMarkdown('', 'Primer Hilo');
  assert.ok(fromEmpty.includes('- [ ] Primer Hilo'));
});

test('getPlotThreadsStats calculates percentages and counts accurately', () => {
  const threads = parsePlotThreads(DEFAULT_DM_NOTES_TEMPLATE);
  const stats = getPlotThreadsStats(threads);

  assert.ok(stats.total > 0);
  assert.ok(stats.completed >= 1);
  assert.equal(stats.total, stats.completed + stats.pending);
  assert.ok(stats.percent >= 0 && stats.percent <= 100);
});
