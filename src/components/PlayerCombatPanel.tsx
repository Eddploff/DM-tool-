import React, { useState } from 'react';
import {
  Combatant,
  EncounterState,
  DamageType,
  getDamageTypeMeta,
} from '../types/combat.ts';
import {
  applyDamage,
  applyHeal,
  applyTempHp,
  getHealthStatus,
  splitIntoDigits,
  combineDigits,
  cycleDigit,
  createCombatLog,
  getSafeHpValues,
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
import { DamageTypeDropdown } from './DamageTypeDropdown.tsx';
import {
  Swords,
  Heart,
  ChevronUp,
  ChevronDown,
  ChevronRight,
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
  onOpenTokenSelect?: () => void;
  onUpdateEncounter?: (state: EncounterState) => void;
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
  onOpenTokenSelect,
  onUpdateEncounter,
}) => {
  // 3-digit counter dials
  const [hundreds, setHundreds] = useState<number>(0);
  const [tens, setTens] = useState<number>(1);
  const [units, setUnits] = useState<number>(2);
  const [damageType, setDamageType] = useState<DamageType>('cortante');
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

    const { updated, actualDamage, isResisted } = applyDamage(target, totalAmount, damageType);
    playSlashSound();

    broadcastFloatingEffect({
      id: `float-${Date.now()}`,
      targetId: target.id,
      amount: actualDamage,
      playerDisplayAmount: totalAmount,
      type: 'damage',
      damageType,
    });

    const dmgMeta = getDamageTypeMeta(damageType);
    const actionTitle = `Daño ${dmgMeta.name}`;

    // Resistance note only visible to DM, never revealed to players
    const log = createCombatLog(
      player.name,
      target.name,
      actionTitle,
      'damage',
      actualDamage,
      false,
      undefined,
      damageType,
      isResisted,
      totalAmount
    );

    const nextCombatants = encounter.combatants.map((c) => (c.id === target.id ? updated : c));
    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      log: [log, ...encounter.log],
    };
    if (onUpdateEncounter) {
      onUpdateEncounter(nextState);
    } else {
      saveAndBroadcastEncounter(nextState, true);
    }

    // Player action message NEVER reveals enemy resistance - shows full damage dealt
    setRecentActionMsg(`¡Infligiste ${totalAmount} de daño ${dmgMeta.name} a ${target.name}!`);
    setTimeout(() => setRecentActionMsg(null), 4500);
  };

  const handleApplyHeal = () => {
    if (!target || totalAmount <= 0) return;

    const { updated, actualHealed } = applyHeal(target, totalAmount, encounter.activeGlobalEffects);
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
    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      log: [log, ...encounter.log],
    };
    if (onUpdateEncounter) {
      onUpdateEncounter(nextState);
    } else {
      saveAndBroadcastEncounter(nextState, true);
    }

    setRecentActionMsg(`¡Curaste ${actualHealed} HP a ${target.name}!`);
    setTimeout(() => setRecentActionMsg(null), 4500);
  };

  const handleApplyTempHp = () => {
    if (!target || totalAmount <= 0) return;

    const { updated, amountAdded } = applyTempHp(target, totalAmount);
    playHealSound();

    broadcastFloatingEffect({
      id: `float-${Date.now()}`,
      targetId: target.id,
      amount: amountAdded,
      type: 'heal',
    });

    const log = createCombatLog(
      player.name,
      target.name,
      'HP Temporales',
      'system',
      amountAdded,
      false,
      `🛡️ +${amountAdded} Puntos de Vida Temporales`
    );

    const nextCombatants = encounter.combatants.map((c) => (c.id === target.id ? updated : c));
    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      log: [log, ...encounter.log],
    };
    if (onUpdateEncounter) {
      onUpdateEncounter(nextState);
    } else {
      saveAndBroadcastEncounter(nextState, true);
    }

    setRecentActionMsg(`Asignaste +${amountAdded} HP Temporales a ${target.name}.`);
  };

  return (
    <div className="bg-[#0e1017]/95 rounded-2xl border border-purple-500/25 shadow-2xl p-3 sm:p-5 text-slate-200 flex flex-col gap-4 backdrop-blur-xl ring-1 ring-white/5">
      {/* Top Banner: Player Identity & ONLY Own HP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232635]">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={player.avatar}
              alt={player.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-purple-400 shadow-md object-cover bg-[#090a0f]"
            />
            <span className="absolute -bottom-1 -right-1 bg-purple-900/90 text-purple-200 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-purple-500/50">
              Lv.{player.level || 1}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base sm:text-lg text-slate-100 truncate">{player.name}</h2>
              <span className="text-xs text-purple-300 font-mono bg-purple-950/60 px-2 py-0.5 rounded border border-purple-700/50">
                {player.jobClass}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="text-purple-300 font-mono text-[11px] sm:text-xs">TTRPG Presencial • Hoja y Acciones</span>
            </p>
          </div>
        </div>

        {/* Player's Own HP & Resistances Card */}
        <div className="bg-[#12141d]/90 rounded-xl p-3 border border-purple-500/20 w-full sm:w-auto sm:min-w-[260px] shadow-inner flex flex-col gap-2">
          {(() => {
            const { current: safeCurrent, max: safeMax, percent: hpPercent } = getSafeHpValues(
              player.currentHp,
              player.maxHp
            );
            return (
              <>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-emerald-500" />
                    TU SALUD (HP)
                  </span>
                  <span className="font-bold text-sm text-slate-100">
                    {safeCurrent} / {safeMax} ({hpPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-[#0a0b10] rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hpPercent > 50
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                        : hpPercent > 25
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                    }`}
                    style={{
                      width: `${hpPercent}%`,
                    }}
                  />
                </div>
              </>
            );
          })()}

          {/* Active resistances if any */}
          {player.damageResistances && player.damageResistances.length > 0 && (
            <div className="text-[10px] text-purple-300 font-mono font-medium flex items-center gap-1 flex-wrap">
              <Shield className="w-2.5 h-2.5 text-purple-400 shrink-0" />
              <span>Tus Resistencias (½ daño): {player.damageResistances.join(', ')}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-[#232635] gap-2">
            {onOpenTokenSelect && (
              <button
                onClick={onOpenTokenSelect}
                className="text-[11px] text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
              >
                Cambiar Ficha
              </button>
            )}
            <button
              onClick={() => onOpenCharacterSheet(player)}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#191827] hover:bg-purple-950/70 border border-purple-500/30 text-purple-200 font-bold flex items-center gap-1 transition-all cursor-pointer shadow ml-auto"
            >
              <Edit className="w-3 h-3 text-purple-400" />
              <span>Editar Hoja (HP &amp; Resistencias)</span>
            </button>
          </div>

          {/* Botón Pasar / Finalizar Turno justo debajo del estado del personaje */}
          {onAdvanceTurn && (
            <div className="pt-2 border-t border-[#232635]">
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  onAdvanceTurn();
                }}
                className="w-full py-2 px-3 rounded-xl text-xs sm:text-sm font-bold bg-[#191b28] hover:bg-purple-900/60 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Pasar al siguiente turno en la iniciativa"
              >
                <span>Pasar / Finalizar Mi Turno</span>
                <ChevronRight className="w-4 h-4 text-purple-300" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Target Selector & Fog-of-War Status */}
      <div className="bg-[#0e1017]/95 rounded-xl p-3.5 border border-[#232635] shadow-md">
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-purple-400" />
            <span>Objetivo Actual Seleccionado</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            (O arrastra la flecha 🎯 desde tu ficha en el mapa)
          </span>
        </div>

        {/* Quick Target Chips - Scrollable horizontally on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-thin">
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
                  isTarget
                    ? isEnemy
                      ? 'bg-red-950/70 border-red-500/80 text-red-200 ring-2 ring-red-500/30 shadow-sm'
                      : 'bg-purple-950/70 border-purple-400 text-purple-200 ring-2 ring-purple-500/30 shadow-sm'
                    : 'bg-[#141622] border-[#25283a] text-slate-400 hover:text-slate-200 hover:bg-[#1a1d2c]'
                }`}
              >
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-5 h-5 rounded-full object-cover border border-[#282d40]"
                />
                <span className="truncate max-w-[90px]">{c.name}</span>
                <span className={`text-[10px] px-1 rounded font-mono ${isEnemy ? 'bg-red-900/60 text-red-300' : 'bg-purple-900/60 text-purple-300'}`}>
                  {isEnemy ? 'Enemigo' : 'Aliado'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Target Details (Fog of War) */}
        {target && targetHealth && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12141e]/90 p-3 rounded-lg border border-[#232635]">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={target.avatar}
                alt={target.name}
                className="w-10 h-10 rounded-full border border-purple-500/40 object-cover shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-sm text-slate-100 flex items-center gap-2 truncate">
                  <span>{target.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border ${targetHealth.badgeBg}`}>
                    {targetHealth.label}
                  </span>
                  {/* Fog of war: Only show exact HP if target is the player's own assigned character! */}
                  {target.id === player.id ? (
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">
                      Tu HP: {target.currentHp} / {target.maxHp}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      HP actual: <strong className="text-amber-400 font-mono">??? / ???</strong>
                    </span>
                  )}
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
      <div className="bg-[#10121a]/95 rounded-xl p-4 border border-[#262a38] flex flex-col items-center gap-3 shadow-lg">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5 font-mono">
            <Target className="w-4 h-4 text-purple-400" />
            <span>Contador de Daño, Curación y HP Temp</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Aplica el resultado de tu mesa presencial
          </span>
        </div>

        {/* 1. SELECCIÓN DE TIPO DE DAÑO PARA EL JUGADOR: DROPDOWN CON LOS 13 TIPOS */}
        <div className="w-full max-w-md bg-[#141622]/90 p-2.5 rounded-xl border border-purple-500/20">
          <DamageTypeDropdown
            value={damageType}
            onChange={setDamageType}
            label="Tipo de Daño:"
          />
        </div>

        {/* 3 Dials */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[300px]">
          {/* Centenas */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
              Centenas
            </span>
            <button
              onClick={() => adjustDigit('hundreds', 1)}
              aria-label="Aumentar centenas"
              className="w-full py-2 bg-[#181a26] hover:bg-[#222536] text-purple-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-[#2b2f42] active:scale-95 cursor-pointer"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full py-3 bg-[#0c0d12] border-x border-[#2b2f42] text-center font-mono text-3xl sm:text-4xl font-black text-purple-200 select-none shadow-inner">
              {hundreds}
            </div>
            <button
              onClick={() => adjustDigit('hundreds', -1)}
              aria-label="Disminuir centenas"
              className="w-full py-2 bg-[#181a26] hover:bg-[#222536] text-purple-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-[#2b2f42] active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Decenas */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
              Decenas
            </span>
            <button
              onClick={() => adjustDigit('tens', 1)}
              aria-label="Aumentar decenas"
              className="w-full py-2 bg-[#181a26] hover:bg-[#222536] text-purple-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-[#2b2f42] active:scale-95 cursor-pointer"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full py-3 bg-[#0c0d12] border-x border-[#2b2f42] text-center font-mono text-3xl sm:text-4xl font-black text-purple-200 select-none shadow-inner">
              {tens}
            </div>
            <button
              onClick={() => adjustDigit('tens', -1)}
              aria-label="Disminuir decenas"
              className="w-full py-2 bg-[#181a26] hover:bg-[#222536] text-purple-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-[#2b2f42] active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Unidades */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
              Unidades
            </span>
            <button
              onClick={() => adjustDigit('units', 1)}
              aria-label="Aumentar unidades"
              className="w-full py-2 bg-[#181a26] hover:bg-[#222536] text-purple-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-[#2b2f42] active:scale-95 cursor-pointer"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="w-full py-3 bg-[#0c0d12] border-x border-[#2b2f42] text-center font-mono text-3xl sm:text-4xl font-black text-purple-200 select-none shadow-inner">
              {units}
            </div>
            <button
              onClick={() => adjustDigit('units', -1)}
              aria-label="Disminuir unidades"
              className="w-full py-2 bg-[#181a26] hover:bg-[#222536] text-purple-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-[#2b2f42] active:scale-95 cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {[1, 5, 10, 25, 50].map((v) => (
            <button
              key={v}
              onClick={() => setTotal(v)}
              className="px-2.5 py-1 rounded bg-[#161822] border border-slate-700/60 text-xs font-mono text-slate-300 hover:border-purple-400 hover:text-white transition-colors cursor-pointer"
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => setTotal(0)}
            className="px-2.5 py-1 rounded bg-[#161822] border border-slate-700/60 text-xs font-mono text-red-400 hover:border-red-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            0
          </button>
        </div>

        {/* Action Buttons: [-] Daño, [+] Curación, [🛡️] HP Temp */}

        {/* Action Buttons: [-] Daño, [+] Curación, [🛡️] HP Temp */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-lg pt-1">
          {/* Daño según Tipo Seleccionado */}
          {(() => {
            const meta = getDamageTypeMeta(damageType);
            const isPhysical = meta.category === 'physical';
            return (
              <button
                onClick={handleApplyDamage}
                disabled={totalAmount <= 0 || !target}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                  totalAmount > 0 && target
                    ? isPhysical
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white active:scale-95 shadow-red-950/60'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white active:scale-95 shadow-purple-950/60'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>- {totalAmount} {meta.name.toUpperCase()}</span>
              </button>
            );
          })()}

          {/* Curar HP */}
          <button
            onClick={handleApplyHeal}
            disabled={totalAmount <= 0 || !target}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all ${
              totalAmount > 0 && target
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white active:scale-95 shadow-emerald-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Heart className="w-4 h-4 fill-emerald-300" />
            <span>+ {totalAmount} CURAR</span>
          </button>

          {/* HP Temporal */}
          <button
            onClick={handleApplyTempHp}
            disabled={totalAmount <= 0 || !target}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all ${
              totalAmount > 0 && target
                ? 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white active:scale-95 shadow-cyan-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title="Asignar puntos de vida temporales al objetivo"
          >
            <Shield className="w-4 h-4 fill-cyan-300" />
            <span>🛡️ + {totalAmount} HP TEMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
