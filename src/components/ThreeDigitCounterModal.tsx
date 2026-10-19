import React, { useState } from 'react';
import { Combatant, DamageType, getDamageTypeMeta } from '../types/combat.ts';
import {
  splitIntoDigits,
  combineDigits,
  cycleDigit,
  getHealthStatus,
} from '../utils/combatLogic.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { DamageTypeDropdown } from './DamageTypeDropdown.tsx';
import {
  ChevronUp,
  ChevronDown,
  Swords,
  Heart,
  X,
  Target,
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface ThreeDigitCounterModalProps {
  isOpen: boolean;
  actor: Combatant;
  target?: Combatant;
  targets?: Combatant[]; // Supported for Area of Effect (AoE) damage
  isDM: boolean;
  onApplyDamage: (amount: number, damageType: DamageType, targetIds?: string[]) => void;
  onApplyHeal: (amount: number, targetIds?: string[]) => void;
  onApplyTempHp?: (amount: number, targetIds?: string[]) => void;
  onClose: () => void;
}

export const ThreeDigitCounterModal: React.FC<ThreeDigitCounterModalProps> = ({
  isOpen,
  actor,
  target,
  targets,
  isDM,
  onApplyDamage,
  onApplyHeal,
  onApplyTempHp,
  onClose,
}) => {
  const [hundreds, setHundreds] = useState<number>(0);
  const [tens, setTens] = useState<number>(1);
  const [units, setUnits] = useState<number>(5);
  const [damageType, setDamageType] = useState<DamageType>('cortante');

  if (!isOpen) return null;

  // Normalize targets array
  const activeTargets: Combatant[] = targets && targets.length > 0 ? targets : target ? [target] : [];
  const isAoE = activeTargets.length > 1;
  const primaryTarget = activeTargets[0];

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
    if (totalAmount <= 0 || activeTargets.length === 0) return;
    const targetIds = activeTargets.map((t) => t.id);
    onApplyDamage(totalAmount, damageType, targetIds);
    onClose();
  };

  const handleApplyHeal = () => {
    if (totalAmount <= 0 || activeTargets.length === 0) return;
    const targetIds = activeTargets.map((t) => t.id);
    onApplyHeal(totalAmount, targetIds);
    onClose();
  };

  const handleApplyTempHp = () => {
    if (totalAmount <= 0 || activeTargets.length === 0) return;
    const targetIds = activeTargets.map((t) => t.id);
    if (onApplyTempHp) {
      onApplyTempHp(totalAmount, targetIds);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-4 sm:p-5 text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181926] rounded-xl border border-purple-500/30 shadow-inner">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 font-mono flex items-center gap-2">
                <span>{isAoE ? `Daño en Área (AoE) - ${activeTargets.length} Objetivos` : 'Contador de Daño / Salud'}</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {actor.name} →{' '}
                <strong className="text-purple-300">
                  {isAoE ? `${activeTargets.length} combatientes en el área` : primaryTarget?.name || 'Objetivo'}
                </strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar contador"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] border border-transparent hover:border-[#282d40] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Targets List & Resistances */}
        <div className="flex flex-col gap-2 bg-[#12141e]/90 p-3 rounded-xl border border-[#232635]">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            {isAoE ? '🎯 Combatientes Afectados en el Área:' : '🎯 Objetivo Seleccionado:'}
          </span>

          <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
            {activeTargets.map((t) => {
              const targetHealth = getHealthStatus(t.currentHp, t.maxHp);
              const hasResistance = Boolean(
                t.damageResistances && t.damageResistances.includes(damageType)
              );
              const effectiveValue = hasResistance ? Math.floor(totalAmount / 2) : totalAmount;

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-8 h-8 rounded-full object-cover border border-amber-400 bg-slate-900 shadow"
                    />
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{t.name}</span>
                        {t.tempHp && t.tempHp > 0 ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" />
                            +{t.tempHp} Temp
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {isDM || t.id === actor.id ? (
                          <span className="font-mono text-red-400 font-bold">
                            HP: {t.currentHp}/{t.maxHp}
                          </span>
                        ) : (
                          <span className={`px-1.5 py-0.2 rounded border ${targetHealth.badgeBg}`}>
                            {targetHealth.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resistance Badge: visible ONLY to DM if enemy, players are never informed of enemy resistance */}
                  <div className="text-right">
                    {(isDM || t.type === 'player') && hasResistance ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-600 shadow animate-pulse">
                        <Shield className="w-3 h-3 text-amber-400" />
                        <span>Resiste (½: {effectiveValue} dmg)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">
                        {isDM ? `Daño íntegro (${totalAmount})` : `Objetivo`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1. SELECCIÓN DE TIPO DE DAÑO: DROPDOWN CON LOS 13 TIPOS */}
        <div className="bg-[#12141e]/90 p-3 rounded-xl border border-[#232635]">
          <DamageTypeDropdown
            value={damageType}
            onChange={setDamageType}
            label="Tipo de Daño:"
          />
        </div>

        {/* 3-Digit Counter Dials: Centenas, Decenas, Unidades */}
        <div className="bg-[#10121b] p-3.5 rounded-xl border border-[#232635] shadow-inner flex flex-col items-center gap-2.5">
          <span className="text-xs font-mono uppercase tracking-wider text-purple-300 font-bold">
            Contador de 3 Dígitos
          </span>

          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {/* HUNDREDS */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
                Centenas
              </span>
              <button
                onClick={() => adjustDigit('hundreds', 1)}
                aria-label="Aumentar centenas"
                className="w-full py-1.5 bg-[#171926] hover:bg-[#222538] text-purple-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-[#282d40] active:scale-95 cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-full py-2 bg-[#0d0e15] border-x border-[#282d40] text-center font-mono text-2xl sm:text-3xl font-black text-purple-200 select-none shadow-inner">
                {hundreds}
              </div>
              <button
                onClick={() => adjustDigit('hundreds', -1)}
                aria-label="Disminuir centenas"
                className="w-full py-1.5 bg-[#171926] hover:bg-[#222538] text-purple-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-[#282d40] active:scale-95 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* TENS */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
                Decenas
              </span>
              <button
                onClick={() => adjustDigit('tens', 1)}
                aria-label="Aumentar decenas"
                className="w-full py-1.5 bg-[#171926] hover:bg-[#222538] text-purple-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-[#282d40] active:scale-95 cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-full py-2 bg-[#0d0e15] border-x border-[#282d40] text-center font-mono text-2xl sm:text-3xl font-black text-purple-200 select-none shadow-inner">
                {tens}
              </div>
              <button
                onClick={() => adjustDigit('tens', -1)}
                aria-label="Disminuir decenas"
                className="w-full py-1.5 bg-[#171926] hover:bg-[#222538] text-purple-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-[#282d40] active:scale-95 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* UNITS */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
                Unidades
              </span>
              <button
                onClick={() => adjustDigit('units', 1)}
                aria-label="Aumentar unidades"
                className="w-full py-1.5 bg-[#171926] hover:bg-[#222538] text-purple-300 rounded-t-xl flex items-center justify-center transition-colors border-t border-x border-[#282d40] active:scale-95 cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-full py-2 bg-[#0d0e15] border-x border-[#282d40] text-center font-mono text-2xl sm:text-3xl font-black text-purple-200 select-none shadow-inner">
                {units}
              </div>
              <button
                onClick={() => adjustDigit('units', -1)}
                aria-label="Disminuir unidades"
                className="w-full py-1.5 bg-[#171926] hover:bg-[#222538] text-purple-300 rounded-b-xl flex items-center justify-center transition-colors border-b border-x border-[#282d40] active:scale-95 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Value Preview */}
          <div className="text-center font-mono">
            <span className="text-xs text-slate-400">Valor Base a Aplicar: </span>
            <strong className="text-lg font-bold text-purple-300">{totalAmount} Puntos</strong>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-0.5">
            {[1, 5, 10, 15, 25, 50].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTotal(v)}
                className="px-2 py-0.5 rounded bg-[#161824] hover:bg-purple-950/60 border border-[#262a3c] hover:border-purple-400 text-[11px] font-mono text-slate-300 hover:text-purple-200 transition-colors cursor-pointer"
              >
                {v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTotal(0)}
              className="px-2 py-0.5 rounded bg-[#1a1317] hover:bg-red-950/60 border border-red-900/50 text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              0
            </button>
          </div>
        </div>

        {/* Action Buttons: [-] Daño, [+] Curación, [🛡️] HP Temporal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* 1. Botón Daño (con nombre del tipo de daño seleccionado) */}
          {(() => {
            const meta = getDamageTypeMeta(damageType);
            const isPhysical = meta.category === 'physical';
            return (
              <button
                type="button"
                onClick={handleApplyDamage}
                disabled={totalAmount <= 0}
                className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                  totalAmount > 0
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

          {/* 2. Botón Curación */}
          <button
            type="button"
            onClick={handleApplyHeal}
            disabled={totalAmount <= 0}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all ${
              totalAmount > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white active:scale-95 shadow-emerald-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Heart className="w-4 h-4 fill-emerald-300" />
            <span>+ {totalAmount} CURACIÓN</span>
          </button>

          {/* 3. Botón HP Temporal */}
          <button
            type="button"
            onClick={handleApplyTempHp}
            disabled={totalAmount <= 0}
            className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all ${
              totalAmount > 0
                ? 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white active:scale-95 shadow-cyan-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title="Asignar puntos de vida temporales (absorben daño primero)"
          >
            <Shield className="w-4 h-4 fill-cyan-300" />
            <span>🛡️ + {totalAmount} HP TEMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
