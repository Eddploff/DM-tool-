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
  playHealSound,
  playMenuBlip,
} from '../utils/soundEffects.ts';
import { StatusBadgesOverlay } from './StatusBadgesOverlay.tsx';
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
      playSlashSound();
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
    <div className="bg-[#0e1017]/95 rounded-2xl border border-purple-500/25 shadow-2xl p-4 sm:p-5 text-slate-200 flex flex-col gap-4 backdrop-blur-xl ring-1 ring-white/5">
      {/* DM Master Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232635]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#181926] border border-purple-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-300" />
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
            className="px-3 py-1.5 rounded-lg bg-[#201014] hover:bg-red-950 border border-red-700/60 text-red-200 text-xs font-mono font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-red-400" />
            <span>Añadir Monstruo</span>
          </button>

          <button
            onClick={onOpenOrderModal}
            className="px-3 py-1.5 rounded-lg bg-[#181926] hover:bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Pedir e introducir manualmente las iniciativas de los participantes"
          >
            <Dices className="w-4 h-4 text-purple-400" />
            <span>Pedir Iniciativas</span>
          </button>

          {/* Entorno de Batalla selector */}
          <div className="flex items-center gap-1.5 bg-[#12131b] border border-[#232635] rounded-lg px-2.5 py-1 shadow-inner">
            <span className="text-xs text-purple-300 font-mono font-semibold flex items-center gap-1">
              <Mountain className="w-3.5 h-3.5 text-purple-400" />
              <span>Entorno:</span>
            </span>
            <select
              value={encounter.environment}
              onChange={(e) => handleChangeEnv(e.target.value as BattleEnvironment)}
              className="bg-[#0b0c10] text-xs text-slate-200 font-mono font-bold px-2 py-1 rounded border border-slate-700/60 focus:outline-none focus:border-purple-400 cursor-pointer"
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
        <div className="bg-slate-900/60 rounded-xl p-3 border border-red-900/50 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-red-950 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-red-300">
              <Skull className="w-4 h-4 text-red-400" />
              <span>Enemigos ({enemies.length})</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Controlados por el DM
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {enemies.map((enemy) => {
              const isSelected = selectedTargetId === enemy.id;
              const isDefeated = enemy.currentHp <= 0;

              return (
                <div
                  key={enemy.id}
                  onClick={() => onSelectTarget(enemy.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-950/80 border-red-500 ring-1 ring-red-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-red-900'
                  } ${isDefeated ? 'opacity-40' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Token & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={enemy.avatar}
                        alt={enemy.name}
                        className="w-10 h-10 rounded-full object-cover border border-red-500/80 shrink-0"
                      />
                      <div className="truncate min-w-0">
                        <h4 className="font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                          <span>{enemy.name}</span>
                        </h4>
                        <div className="text-[11px] text-slate-400 truncate">
                          {enemy.jobClass}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {enemy.tempHp && enemy.tempHp > 0 ? (
                            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-600 flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5 fill-cyan-400" />
                              +{enemy.tempHp} Temp
                            </span>
                          ) : null}
                          {enemy.damageResistances && enemy.damageResistances.length > 0 ? (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-600 flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5 text-amber-400" />
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
                      </div>
                    </div>

                    {/* Numeric HP Direct Editor */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-red-400">
                          {enemy.currentHp} / {enemy.maxHp} HP
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={enemy.maxHp}
                          value={enemy.currentHp}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDirectHp(enemy, parseInt(e.target.value, 10))}
                          className="w-20 h-1.5 accent-red-500 cursor-pointer"
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
                        className="p-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40"
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
                          className="p-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40"
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
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveEnemy(enemy.id, enemy.name);
                        }}
                        title="Eliminar enemigo"
                        className="p-1 rounded bg-slate-800 hover:bg-red-900/60 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick delta buttons */}
                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-slate-500 font-mono">Modificar HP:</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => adjustHp(enemy, -10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, -5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, -1)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, 5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => adjustHp(enemy, 10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded"
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
        <div className="bg-slate-900/60 rounded-xl p-3 border border-blue-900/50 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-blue-950 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-blue-300">
              <User className="w-4 h-4 text-blue-400" />
              <span>Personajes de Jugadores ({players.length})</span>
            </div>
            <span className="text-[11px] text-slate-400">
              El DM ve la salud de todos en vivo
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {players.map((hero) => {
              const isSelected = selectedTargetId === hero.id;
              const isDefeated = hero.currentHp <= 0;

              return (
                <div
                  key={hero.id}
                  onClick={() => onSelectTarget(hero.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/80 border-blue-400 ring-1 ring-blue-300'
                      : 'bg-slate-950/70 border-slate-800 hover:border-blue-900'
                  } ${isDefeated ? 'opacity-40' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Token & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={hero.avatar}
                        alt={hero.name}
                        className="w-10 h-10 rounded-full object-cover border border-blue-400/80 shrink-0"
                      />
                      <div className="truncate min-w-0">
                        <h4 className="font-bold text-sm text-slate-100 truncate flex items-center gap-1.5">
                          <span>{hero.name}</span>
                        </h4>
                        <div className="text-[11px] text-slate-400 truncate">
                          {hero.jobClass} • Nivel {hero.level || 1}
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
                      </div>
                    </div>

                    {/* Numeric HP Direct Editor */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-400">
                          {hero.currentHp} / {hero.maxHp} HP
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={hero.maxHp}
                          value={hero.currentHp}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDirectHp(hero, parseInt(e.target.value, 10))}
                          className="w-20 h-1.5 accent-emerald-500 cursor-pointer"
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
                        className="p-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40"
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
                          className="p-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40"
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
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick delta buttons */}
                  <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-slate-500 font-mono">Modificar HP:</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => adjustHp(hero, -10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded"
                      >
                        -10
                      </button>
                      <button
                        onClick={() => adjustHp(hero, -5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => adjustHp(hero, 5)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => adjustHp(hero, 10)}
                        className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded"
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
      </div>
    </div>
  );
};
