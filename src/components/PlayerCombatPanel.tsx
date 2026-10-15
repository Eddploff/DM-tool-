import React, { useState } from 'react';
import {
  Combatant,
  EncounterState,
} from '../types/combat.ts';
import {
  applyDamage,
  applyHeal,
  getHealthStatus,
  splitIntoDigits,
  combineDigits,
  cycleDigit,
  createCombatLog,
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
  Swords,
  Heart,
  ChevronUp,
  ChevronDown,
  Target,
  Crosshair,
  User,
  Shield,
  Zap,
  Edit,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface PlayerCombatPanelProps {
  player: Combatant;
  encounter: EncounterState;
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  onOpenCharacterSheet: (combatant: Combatant) => void;
  onAdvanceTurn?: () => void;
  onOpenCounterModal?: (actor: Combatant, target: Combatant) => void;
  onOpenStatusPicker?: (combatant: Combatant) => void;
}

export const PlayerCombatPanel: React.FC<PlayerCombatPanelProps> = ({
  player,
  encounter,
  selectedTargetId,
  onSelectTarget,
  onOpenCharacterSheet,
  onAdvanceTurn,
  onOpenCounterModal,
  onOpenStatusPicker,
}) => {
  // 3-digit counter dials
  const [hundreds, setHundreds] = useState<number>(0);
  const [tens, setTens] = useState<number>(1);
  const [units, setUnits] = useState<number>(2);
  const [recentActionMsg, setRecentActionMsg] = useState<string | null>(null);

  const target = encounter.combatants.find((c) => c.id === selectedTargetId) || encounter.combatants.find((c) => c.type === 'enemy');
  const targetHealth = target ? getHealthStatus(target.currentHp, target.maxHp) : null;
  const totalAmount = combineDigits(hundreds, tens, units);

  const adjustDigit = (digit: 'hundreds' | 'tens' | 'units', delta: number) => {
    playMenuBlip();
    if (digit === 'hundreds') {
      setHundreds((prev) => cycleDigit(prev, delta));
    } else if (digit === 'tens') {
      setTens((prev) => cycleDigit(prev, delta));
    } else {
      setUnits((prev) => cycleDigit(prev, delta));
    }
  };

  const setTotal = (val: number) => {
    playMenuBlip();
    const d = splitIntoDigits(val);
    setHundreds(d.hundreds);
    setTens(d.tens);
    setUnits(d.units);
  };

  const handleApplyDamage = () => {
    if (!target || totalAmount <= 0) return;

    const { updated, actualDamage } = applyDamage(target, totalAmount);
    playSlashSound();

    broadcastFloatingEffect({
      id: `float-${Date.now()}`,
      targetId: target.id,
      amount: actualDamage,
      type: 'damage',
    });

    const log = createCombatLog(
      player.name,
      target.name,
      'Daño de Mesa Presencial',
      'damage',
      actualDamage,
      false
    );

    const nextCombatants = encounter.combatants.map((c) => (c.id === target.id ? updated : c));
    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        log: [log, ...encounter.log],
      },
      true
    );

    setRecentActionMsg(`¡Infligiste ${actualDamage} de daño a ${target.name}!`);
    setTimeout(() => setRecentActionMsg(null), 4500);
  };

  const handleApplyHeal = () => {
    if (!target || totalAmount <= 0) return;

    const { updated, actualHealed } = applyHeal(target, totalAmount);
    playHealSound();

    broadcastFloatingEffect({
      id: `float-${Date.now()}`,
      targetId: target.id,
      amount: actualHealed,
      type: 'heal',
    });

    const log = createCombatLog(
      player.name,
      target.name,
      'Curación de Mesa Presencial',
      'heal',
      actualHealed,
      false
    );

    const nextCombatants = encounter.combatants.map((c) => (c.id === target.id ? updated : c));
    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        log: [log, ...encounter.log],
      },
      true
    );

    setRecentActionMsg(`¡Curaste ${actualHealed} puntos de vida a ${target.name}!`);
    setTimeout(() => setRecentActionMsg(null), 4500);
  };

  return (
    <div className="bg-gradient-to-b from-blue-950 via-slate-900 to-indigo-950 rounded-2xl border-2 border-blue-400/80 shadow-2xl p-4 sm:p-5 text-slate-100 flex flex-col gap-4">
      {/* Top Banner: Player Identity & ONLY Own HP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-800/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={player.avatar}
              alt={player.name}
              className="w-14 h-14 rounded-full border-2 border-amber-400 shadow-md object-cover bg-slate-950"
            />
            <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-blue-300">
              Lv.{player.level || 1}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base sm:text-lg text-amber-200">{player.name}</h2>
              <span className="text-xs text-blue-300 font-mono bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50">
                {player.jobClass}
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
              <span>Defensa/CA: <strong className="text-white">{player.armorClass}</strong></span>
              <span>•</span>
              <span className="text-amber-300">Ataques en mesa presencial</span>
            </p>
          </div>
        </div>

        {/* Player's Own HP */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-blue-500/40 min-w-[210px] shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 fill-emerald-500" />
              TU SALUD (HP)
            </span>
            <span className="font-bold text-sm text-slate-100">
              {player.currentHp} / {player.maxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-300 ${
                player.currentHp / player.maxHp > 0.5
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : player.currentHp / player.maxHp > 0.25
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
              }`}
              style={{
                width: `${Math.max(0, Math.min(100, (player.currentHp / player.maxHp) * 100))}%`,
              }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-slate-400">
              {player.currentHp <= 0 ? '¡Inconsciente!' : 'En combate'}
            </span>
            <button
              onClick={() => onOpenCharacterSheet(player)}
              className="text-[11px] text-blue-300 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <Edit className="w-3 h-3" />
              Editar Tarjeta
            </button>
          </div>
        </div>
      </div>

      {/* Target Selector & Fog-of-War Status */}
      <div className="bg-slate-950/60 rounded-xl p-3 border border-indigo-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-red-400" />
            <span>Objetivo Actual Seleccionado</span>
          </div>
          <span className="text-[11px] text-slate-400">
            (O arrastra la flecha 🎯 desde tu token)
          </span>
        </div>

        {/* Quick Target Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {encounter.combatants.map((c) => {
            const isTarget = c.id === target?.id;
            const isEnemy = c.type === 'enemy';
            return (
              <button
                key={c.id}
                onClick={() => {
                  playMenuBlip();
                  onSelectTarget(c.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border transition-all ${
                  isTarget
                    ? isEnemy
                      ? 'bg-red-950 border-red-500 text-red-200 ring-2 ring-red-500/40 shadow-sm'
                      : 'bg-blue-950 border-blue-400 text-blue-200 ring-2 ring-blue-400/40 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-5 h-5 rounded-full object-cover border border-slate-700"
                />
                <span>{c.name}</span>
                <span className={`text-[10px] px-1 rounded ${isEnemy ? 'bg-red-900/60 text-red-300' : 'bg-blue-900/60 text-blue-300'}`}>
                  {isEnemy ? 'Enemigo' : 'Aliado'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Target Details (Fog of War) */}
        {target && targetHealth && (
          <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2.5">
              <img
                src={target.avatar}
                alt={target.name}
                className="w-10 h-10 rounded-full border border-slate-600 object-cover"
              />
              <div>
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <span>{target.name}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (CA: {target.armorClass})
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded border ${targetHealth.badgeBg}`}>
                    {targetHealth.label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    HP actual: <strong className="text-amber-400 font-mono">??? / ???</strong>
                  </span>
                </div>

                {/* Status Badges Overlay for Target */}
                {target.statusEffects && target.statusEffects.length > 0 && (
                  <div className="mt-1.5">
                    <StatusBadgesOverlay statusEffects={target.statusEffects} isDM={false} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenStatusPicker && (
                <button
                  onClick={() => onOpenStatusPicker(target)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 text-xs font-bold flex items-center gap-1"
                  title="Asignar estado alterado (Veneno, Parálisis, Bendición...)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Estados</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (onOpenCounterModal) onOpenCounterModal(player, target);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Contador Flotante</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Notification Message */}
      {recentActionMsg && (
        <div className="bg-gradient-to-r from-amber-950/90 to-blue-950/90 border border-amber-500/60 text-amber-200 text-xs sm:text-sm font-semibold p-2.5 rounded-lg shadow-md flex items-center gap-2 animate-pulse">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{recentActionMsg}</span>
        </div>
      )}

      {/* Interactive 3-Digit Counter on Panel */}
      <div className="bg-slate-950/90 rounded-xl p-4 border border-blue-900/70 flex flex-col items-center gap-3">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Contador de Daño y Curación (3 Dígitos)</span>
          </span>
          <span className="text-[11px] text-slate-400">
            Aplica el resultado de tu mesa presencial
          </span>
        </div>

        {/* 3 Dials */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[300px]">
          {/* Centenas */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Centenas
            </span>
            <button
              onClick={() => adjustDigit('hundreds', 1)}
              aria-label="Aumentar centenas"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-slate-700 active:scale-95"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full py-3 bg-slate-900 border-x border-slate-700 text-center font-mono text-3xl sm:text-4xl font-black text-amber-200 select-none shadow-inner">
              {hundreds}
            </div>
            <button
              onClick={() => adjustDigit('hundreds', -1)}
              aria-label="Disminuir centenas"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-slate-700 active:scale-95"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Decenas */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Decenas
            </span>
            <button
              onClick={() => adjustDigit('tens', 1)}
              aria-label="Aumentar decenas"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-slate-700 active:scale-95"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full py-3 bg-slate-900 border-x border-slate-700 text-center font-mono text-3xl sm:text-4xl font-black text-amber-200 select-none shadow-inner">
              {tens}
            </div>
            <button
              onClick={() => adjustDigit('tens', -1)}
              aria-label="Disminuir decenas"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-slate-700 active:scale-95"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Unidades */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Unidades
            </span>
            <button
              onClick={() => adjustDigit('units', 1)}
              aria-label="Aumentar unidades"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-slate-700 active:scale-95"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full py-3 bg-slate-900 border-x border-slate-700 text-center font-mono text-3xl sm:text-4xl font-black text-amber-200 select-none shadow-inner">
              {units}
            </div>
            <button
              onClick={() => adjustDigit('units', -1)}
              aria-label="Disminuir unidades"
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-slate-700 active:scale-95"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => setTotal(1)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:border-amber-400"
          >
            1
          </button>
          <button
            onClick={() => setTotal(5)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:border-amber-400"
          >
            5
          </button>
          <button
            onClick={() => setTotal(10)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:border-amber-400"
          >
            10
          </button>
          <button
            onClick={() => setTotal(25)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:border-amber-400"
          >
            25
          </button>
          <button
            onClick={() => setTotal(0)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-red-400 hover:border-red-400 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            0
          </button>
        </div>

        {/* Action Buttons: [-] Daño and [+] Curación */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md pt-1">
          <button
            onClick={handleApplyDamage}
            disabled={totalAmount <= 0 || !target}
            className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              totalAmount > 0 && target
                ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white active:scale-95 shadow-red-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Swords className="w-5 h-5" />
            <span>- {totalAmount} BAJAR HP</span>
          </button>

          <button
            onClick={handleApplyHeal}
            disabled={totalAmount <= 0 || !target}
            className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              totalAmount > 0 && target
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white active:scale-95 shadow-emerald-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Heart className="w-5 h-5 fill-emerald-300" />
            <span>+ {totalAmount} CURAR HP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
