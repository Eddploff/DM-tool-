import React, { useState } from 'react';
import {
  Combatant,
  EncounterState,
  BattleEnvironment,
  getDamageTypeMeta,
} from '../types/combat.ts';
import {
  applyDamage,
  applyHeal,
  createCombatLog,
  advanceTurn,
} from '../utils/combatLogic.ts';
import {
  saveAndBroadcastEncounter,
  broadcastFloatingEffect,
} from '../utils/syncManager.ts';
import {
  playSlashSound,
  playAttackSoundByDamageType,
  playHealSound,
  playMenuBlip,
} from '../utils/soundEffects.ts';
import { StatusBadgesOverlay } from './StatusBadgesOverlay.tsx';
import { DeathSavesWidget } from './DeathSavesWidget.tsx';
import {
  Shield,
  Heart,
  Plus,
  Trash2,
  Edit,
  Skull,
  User,
  ListOrdered,
  Target,
  Swords,
  Sparkles,
  Mountain,
  Dices,
  BookOpen,
} from 'lucide-react';

interface DMScreenPanelProps {
  encounter: EncounterState;
  onOpenAddEnemyModal: () => void;
  onOpenCharacterSheet: (combatant: Combatant) => void;
  onSelectTarget: (id: string) => void;
  selectedTargetId: string;
  onOpenOrderModal: () => void;
  onOpenCounterModal: (actor: Combatant, target: Combatant) => void;
  onOpenStatusPicker?: (combatant: Combatant) => void;
  onOpenDMNotes?: () => void;
}

export const DMScreenPanel: React.FC<DMScreenPanelProps> = ({
  encounter,
  onOpenAddEnemyModal,
  onOpenCharacterSheet,
  onSelectTarget,
  selectedTargetId,
  onOpenOrderModal,
  onOpenCounterModal,
  onOpenStatusPicker,
  onOpenDMNotes,
}) => {
  const enemies = encounter.combatants.filter((c) => c.type === 'enemy');
  const players = encounter.combatants.filter((c) => c.type === 'player');

  // Quick adjust HP (+/- amount)
  const adjustHp = (combatant: Combatant, delta: number) => {
    playMenuBlip();
    let updated: Combatant;
    if (delta < 0) {
      const res = applyDamage(combatant, Math.abs(delta));
      updated = res.updated;
      playAttackSoundByDamageType('contundente');
      broadcastFloatingEffect({
        id: `float-${Date.now()}`,
        targetId: combatant.id,
        amount: res.actualDamage,
        type: 'damage',
      });
      const log = createCombatLog('DM (Mesa)', combatant.name, 'Ajuste DM', 'damage', res.actualDamage);
      saveAndBroadcastEncounter(
        {
          ...encounter,
          combatants: encounter.combatants.map((c) => (c.id === combatant.id ? updated : c)),
          log: [log, ...encounter.log],
        },
        true
      );
    } else {
      const res = applyHeal(combatant, delta);
      updated = res.updated;
      playHealSound();
      broadcastFloatingEffect({
        id: `float-${Date.now()}`,
        targetId: combatant.id,
        amount: res.actualHealed,
        type: 'heal',
      });
      const log = createCombatLog('DM (Mesa)', combatant.name, 'Curación DM', 'heal', res.actualHealed);
      saveAndBroadcastEncounter(
        {
          ...encounter,
          combatants: encounter.combatants.map((c) => (c.id === combatant.id ? updated : c)),
          log: [log, ...encounter.log],
        },
        true
      );
    }
  };

  // Direct set current HP
  const setDirectHp = (combatant: Combatant, newHp: number) => {
    const safeHp = Math.max(0, Math.min(combatant.maxHp, newHp));
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === combatant.id ? { ...c, currentHp: safeHp } : c
    );
    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
      },
      true
    );
  };

  // Update combatant from Death Saves widget
  const handleUpdateCombatantDeathSaves = (updated: Combatant, logMessage?: string) => {
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === updated.id ? updated : c
    );
    const nextLogs = logMessage
      ? [createCombatLog('DM (Mesa)', updated.name, logMessage, 'system'), ...encounter.log]
      : encounter.log;
    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        log: nextLogs,
      },
      true
    );
  };

  // Remove enemy token
  const handleRemoveEnemy = (enemyId: string, enemyName: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar al enemigo "${enemyName}"?`)) {
      playMenuBlip();
      const nextCombatants = encounter.combatants.filter((c) => c.id !== enemyId);
      const nextTurnOrder = encounter.turnOrder.filter((id) => id !== enemyId);
      const nextTurnIndex = Math.min(encounter.activeTurnIndex, Math.max(0, nextTurnOrder.length - 1));

      const log = createCombatLog('DM', enemyName, 'Retirado del combate', 'system', 0);
      saveAndBroadcastEncounter(
        {
          ...encounter,
          combatants: nextCombatants,
          turnOrder: nextTurnOrder,
          activeTurnIndex: nextTurnIndex,
          log: [log, ...encounter.log],
        },
        true
      );
    }
  };

  // Change battle environment
  const handleChangeEnv = (env: BattleEnvironment) => {
    playMenuBlip();
    const envNames: Record<BattleEnvironment, string> = {
      forest: 'Bosque Místico',
      dungeon: 'Mazmorra Antigua',
      volcano: 'Volcán de Magma',
      plains: 'Llanuras de Fabul',
      cave: 'Caverna Umbría',
      castle: 'Bastión Imperial',
      crystal: 'Torre de Cristal',
    };
    const log = createCombatLog(
      'DM (Mesa)',
      'Escenario',
      `Cambio de entorno a ${envNames[env] || env}`,
      'system',
      0
    );
    saveAndBroadcastEncounter(
      {
        ...encounter,
        environment: env,
        log: [log, ...encounter.log],
      },
      true
    );
  };

  return (
    <div className="bg-[#0d0e12] rounded-xl border border-[#222532] shadow-xl p-4 sm:p-5 text-slate-200 flex flex-col gap-4">
      {/* DM Master Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232635]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#151722] border border-[#262938] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#e5a93c]" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-100 font-mono">
              Centro de Control del DM (Host de Mesa)
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Controla manualmente los turnos de enemigos, iniciativas y ve el HP de todos en tiempo real.
            </p>
          </div>
        </div>

        {/* DM Actions & Add Enemy */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onOpenAddEnemyModal}
            className="px-3 py-1.5 rounded-lg bg-[#241518] hover:bg-[#341b20] border border-[#52232a] text-[#f87171] text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#f87171]" />
            <span>Añadir Monstruo</span>
          </button>

          <button
            onClick={onOpenOrderModal}
            className="px-3 py-1.5 rounded-lg bg-[#181a26] hover:bg-[#232638] border border-[#2b3046] text-[#e5a93c] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
            title="Pedir e introducir manualmente las iniciativas de los participantes"
          >
            <Dices className="w-4 h-4 text-[#e5a93c]" />
            <span>Pedir Iniciativas</span>
          </button>

          {onOpenDMNotes && (
            <button
              onClick={onOpenDMNotes}
              className="px-3 py-1.5 rounded-lg bg-[#241e15] hover:bg-[#332a1e] border border-[#53412a] text-[#fbbf24] text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Abrir cuaderno de notas del DM e hilos de trama"
            >
              <BookOpen className="w-4 h-4 text-[#fbbf24]" />
              <span>Notas del DM</span>
              {encounter.dmNotes && encounter.dmNotes.trim().length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
              )}
            </button>
          )}

          {/* Entorno de Batalla selector */}
          <div className="flex items-center gap-1.5 bg-[#141620] border border-[#262938] rounded-lg px-2.5 py-1">
            <span className="text-xs text-[#e5a93c] font-mono font-semibold flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 text-[#e5a93c]" />
              <span>Entorno:</span>
            </span>
            <select
              value={encounter.environment}
              onChange={(e) => handleChangeEnv(e.target.value as BattleEnvironment)}
              className="bg-[#1c1f2b] text-xs text-slate-200 font-mono font-bold px-2 py-1 rounded border border-[#2c3144] focus:outline-none focus:border-[#e5a93c] cursor-pointer"
              title="Cambiar el fondo visual del combate"
            >
              <option value="forest">🌲 Bosque</option>
              <option value="dungeon">🏰 Mazmorra</option>
              <option value="volcano">🌋 Volcán</option>
              <option value="plains">🌾 Llanuras</option>
              <option value="cave">🪨 Caverna</option>
              <option value="castle">🛡️ Castillo</option>
              <option value="crystal">💎 Torre Cristal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grids: Enemies & Players Full HP Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* MONSTERS SECTION */}
        {/* MONSTERS SECTION */}
        <div className="bg-[#12141c] rounded-xl p-3 border border-[#2c1a1f] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#2c1a1f] pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#f87171]">
              <Skull className="w-4 h-4 text-[#f87171]" />
              <span>Enemigos ({enemies.length})</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Controlados por el DM
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {enemies.map((enemy) => {
              const isSelected = selectedTargetId === enemy.id;
              const isDefeated = enemy.currentHp <= 0;
              const hpPercent = enemy.maxHp > 0 ? Math.round((enemy.currentHp / enemy.maxHp) * 100) : 0;

              return (
                <div
                  key={enemy.id}
                  onClick={() => onSelectTarget(enemy.id)}
                  className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#221619] border-[#ef4444]'
                      : 'bg-[#171922] border-[#262938] hover:border-[#382b30]'
                  } ${isDefeated ? 'opacity-40' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Token & Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={enemy.avatar}
                        alt={enemy.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#f87171]/80 shrink-0"
                      />
                      <div className="truncate min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                          <span>{enemy.name}</span>
                        </h4>
                        <div className="text-[11px] text-slate-400 truncate font-mono">
                          {enemy.jobClass}
                        </div>

                        {/* Flat Underline HP Bar */}
                        <div className="w-full bg-[#0d0e13] h-1.5 rounded-full overflow-hidden border border-[#232737] mt-1.5">
                          <div
                            className="h-full bg-[#ef4444] transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {enemy.tempHp && enemy.tempHp > 0 ? (
                            <span className="text-[10px] font-mono font-bold text-[#38bdf8] bg-[#0c1f2d] px-1.5 py-0.2 rounded border border-[#1b3d56] flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5 fill-[#38bdf8]" />
                              +{enemy.tempHp} Temp
                            </span>
                          ) : null}
                          {enemy.damageResistances && enemy.damageResistances.length > 0 ? (
                            <span className="text-[10px] font-bold text-[#fbbf24] bg-[#221b10] px-1.5 py-0.2 rounded border border-[#483921] flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5 text-[#fbbf24]" />
                              <span>Resiste: {enemy.damageResistances.map((r) => (r === 'physical' ? 'Físico' : r === 'magical' ? 'Mágico' : getDamageTypeMeta(r).name)).join(', ')} (½)</span>
                            </span>
                          ) : null}
                        </div>
                        {enemy.statusEffects && enemy.statusEffects.length > 0 && (
                          <div className="mt-1">
                            <StatusBadgesOverlay
                              statusEffects={enemy.statusEffects}
                              isDM={true}
                              onRemoveStatus={(key) => {
                                const nextCombatants = encounter.combatants.map((c) =>
                                  c.id === enemy.id
                                    ? { ...c, statusEffects: c.statusEffects.filter((s) => s.toLowerCase() !== key.toLowerCase()) }
                                    : c
                                );
                                saveAndBroadcastEncounter({ ...encounter, combatants: nextCombatants }, true);
                              }}
                            />
                          </div>
                        )}

                        {enemy.resources && enemy.resources.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {enemy.resources.map((r) => (
                              <span
                                key={r.id}
                                className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                                style={{
                                  backgroundColor: `${r.color || '#f97316'}20`,
                                  color: r.color || '#f97316',
                                  border: `1px solid ${r.color || '#f97316'}40`,
                                }}
                                title={`${r.name}: ${r.current}/${r.max}`}
                              >
                                {r.name}: {r.current}/{r.max}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Numeric HP Direct Editor */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-[#232737] sm:border-t-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-[#f87171]">
                          {enemy.currentHp} / {enemy.maxHp} HP
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={enemy.maxHp}
                          value={enemy.currentHp}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDirectHp(enemy, parseInt(e.target.value, 10))}
                          className="w-20 h-1.5 accent-[#ef4444] cursor-pointer"
                        />
                      </div>

                      {/* 3-Digit Counter Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const actor = encounter.combatants[0];
                          onOpenCounterModal(actor, enemy);
                        }}
                        title="Abrir contador 3 dígitos (+/-)"
                        className="p-1 rounded bg-[#221c12] hover:bg-[#312718] text-[#fbbf24] border border-[#483a22] transition-colors cursor-pointer"
                      >
                        <Target className="w-3.5 h-3.5" />
                      </button>

                      {/* Status Picker Trigger for DM */}
                      {onOpenStatusPicker && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStatusPicker(enemy);
                          }}
                          title="Gestionar estados alterados (Veneno, Parálisis...)"
                          className="p-1 rounded bg-[#1c182b] hover:bg-[#28223d] text-[#c084fc] border border-[#3b3259] transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Card edit and delete buttons */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCharacterSheet(enemy);
                        }}
                        title="Editar ficha / cambiar token"
                        className="p-1 rounded bg-[#1f2230] hover:bg-[#2a2f42] text-slate-300 border border-[#2f354a] transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEnemy(enemy.id, enemy.name);
                        }}
                        title="Eliminar enemigo"
                        className="p-1 rounded bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick delta buttons */}
                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-[#232737]">
                    <span className="text-[10px] text-slate-500 font-mono">Modificar HP:</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => adjustHp(enemy, -10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] rounded transition-colors cursor-pointer"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, -5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] rounded transition-colors cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, -1)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] rounded transition-colors cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, 5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#13261d] hover:bg-[#1c382b] text-[#34d399] border border-[#1e4835] rounded transition-colors cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, 10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#13261d] hover:bg-[#1c382b] text-[#34d399] border border-[#1e4835] rounded transition-colors cursor-pointer"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PLAYERS SECTION */}
        {/* PLAYERS SECTION */}
        <div className="bg-[#12141c] rounded-xl p-3 border border-[#1b2636] flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#1b2636] pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-[#38bdf8]">
              <User className="w-4 h-4 text-[#38bdf8]" />
              <span>Personajes de Jugadores ({players.length})</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              El DM ve la salud de todos en vivo
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {players.map((hero) => {
              const isSelected = selectedTargetId === hero.id;
              const isDefeated = hero.currentHp <= 0;
              const hpPercent = hero.maxHp > 0 ? Math.round((hero.currentHp / hero.maxHp) * 100) : 0;

              return (
                <div
                  key={hero.id}
                  onClick={() => onSelectTarget(hero.id)}
                  className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#14202e] border-[#38bdf8]'
                      : 'bg-[#171922] border-[#262938] hover:border-[#22354a]'
                  } ${isDefeated ? 'opacity-40' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Token & Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={hero.avatar}
                        alt={hero.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#38bdf8]/80 shrink-0"
                      />
                      <div className="truncate min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                          <span>{hero.name}</span>
                        </h4>
                        <div className="text-[11px] text-slate-400 truncate font-mono">
                          {hero.jobClass} • Nivel {hero.level || 1}
                        </div>

                        {/* Flat Underline HP Bar */}
                        <div className="w-full bg-[#0d0e13] h-1.5 rounded-full overflow-hidden border border-[#232737] mt-1.5">
                          <div
                            className={`h-full transition-all duration-300 ${
                              hpPercent > 50
                                ? 'bg-[#10b981]'
                                : hpPercent > 25
                                ? 'bg-[#e5a93c]'
                                : 'bg-[#ef4444]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
                          />
                        </div>

                        {hero.statusEffects && hero.statusEffects.length > 0 && (
                          <div className="mt-1">
                            <StatusBadgesOverlay
                              statusEffects={hero.statusEffects}
                              isDM={true}
                              onRemoveStatus={(key) => {
                                const nextCombatants = encounter.combatants.map((c) =>
                                  c.id === hero.id
                                    ? { ...c, statusEffects: c.statusEffects.filter((s) => s.toLowerCase() !== key.toLowerCase()) }
                                    : c
                                );
                                saveAndBroadcastEncounter({ ...encounter, combatants: nextCombatants }, true);
                              }}
                            />
                          </div>
                        )}

                        {hero.resources && hero.resources.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {hero.resources.map((r) => (
                              <span
                                key={r.id}
                                className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                                style={{
                                  backgroundColor: `${r.color || '#38bdf8'}20`,
                                  color: r.color || '#38bdf8',
                                  border: `1px solid ${r.color || '#38bdf8'}40`,
                                }}
                                title={`${r.name}: ${r.current}/${r.max}`}
                              >
                                {r.name}: {r.current}/{r.max}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Numeric HP Direct Editor */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-[#232737] sm:border-t-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-[#10b981]">
                          {hero.currentHp} / {hero.maxHp} HP
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={hero.maxHp}
                          value={hero.currentHp}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDirectHp(hero, parseInt(e.target.value, 10))}
                          className="w-20 h-1.5 accent-[#10b981] cursor-pointer"
                        />
                      </div>

                      {/* 3-Digit Counter Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const actor = encounter.combatants[0];
                          onOpenCounterModal(actor, hero);
                        }}
                        title="Abrir contador 3 dígitos (+/-)"
                        className="p-1 rounded bg-[#221c12] hover:bg-[#312718] text-[#fbbf24] border border-[#483a22] transition-colors cursor-pointer"
                      >
                        <Target className="w-3.5 h-3.5" />
                      </button>

                      {/* Status Picker Trigger */}
                      {onOpenStatusPicker && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStatusPicker(hero);
                          }}
                          title="Gestionar estados alterados (Bendición, etc.)"
                          className="p-1 rounded bg-[#1c182b] hover:bg-[#28223d] text-[#c084fc] border border-[#3b3259] transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCharacterSheet(hero);
                        }}
                        title="Editar ficha del personaje"
                        className="p-1 rounded bg-[#1f2230] hover:bg-[#2a2f42] text-slate-300 border border-[#2f354a] transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick delta buttons */}
                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-[#232737]">
                    <span className="text-[10px] text-slate-500 font-mono">Modificar HP:</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => adjustHp(hero, -10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] rounded transition-colors cursor-pointer"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => adjustHp(hero, -5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] rounded transition-colors cursor-pointer"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => adjustHp(hero, 5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#13261d] hover:bg-[#1c382b] text-[#34d399] border border-[#1e4835] rounded transition-colors cursor-pointer"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => adjustHp(hero, 10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-[#13261d] hover:bg-[#1c382b] text-[#34d399] border border-[#1e4835] rounded transition-colors cursor-pointer"
                      >
                        +10
                      </button>
                    </div>
                  </div>

                  {/* Death Saves for fallen hero at 0 HP */}
                  {(hero.currentHp === 0 ||
                    (hero.deathSaves &&
                      ((hero.deathSaves.successes || 0) > 0 ||
                        (hero.deathSaves.failures || 0) > 0 ||
                        hero.deathSaves.isStable))) && (
                    <div className="mt-2 pt-2 border-t border-rose-900/60" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[10px] text-rose-400 font-mono font-bold mb-1 flex items-center gap-1">
                        <Skull className="w-3 h-3 text-rose-500" />
                        <span>Salvaciones contra la Muerte (0 HP)</span>
                      </div>
                      <DeathSavesWidget
                        combatant={hero}
                        onUpdateCombatant={handleUpdateCombatantDeathSaves}
                        isDM={true}
                        compact={true}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
