import React, { useState } from 'react';
import { Combatant } from '../types/combat.ts';
import {
  splitIntoDigits,
  combineDigits,
  cycleDigit,
  getHealthStatus,
} from '../utils/combatLogic.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  ChevronUp,
  ChevronDown,
  Swords,
  Heart,
  X,
  Target,
  RotateCcw,
} from 'lucide-react';

interface ThreeDigitCounterModalProps {
  isOpen: boolean;
  actor: Combatant;
  target: Combatant;
  isDM: boolean;
  onApplyDamage: (amount: number) => void;
  onApplyHeal: (amount: number) => void;
  onClose: () => void;
}

export const ThreeDigitCounterModal: React.FC<ThreeDigitCounterModalProps> = ({
  isOpen,
  actor,
  target,
  isDM,
  onApplyDamage,
  onApplyHeal,
  onClose,
}) => {
  const [hundreds, setHundreds] = useState<number>(0);
  const [tens, setTens] = useState<number>(1);
  const [units, setUnits] = useState<number>(5);

  if (!isOpen) return null;

  const totalAmount = combineDigits(hundreds, tens, units);
  const targetHealth = getHealthStatus(target.currentHp, target.maxHp);

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
    if (totalAmount <= 0) return;
    onApplyDamage(totalAmount);
    onClose();
  };

  const handleApplyHeal = () => {
    if (totalAmount <= 0) return;
    onApplyHeal(totalAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/40">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-200">
                Selección de Daño / Curación
              </h3>
              <p className="text-xs text-slate-400">
                {actor.name} → <strong className="text-white">{target.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar contador"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Info & Health State */}
        <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={target.avatar}
              alt={target.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 bg-slate-950 shadow"
            />
            <div>
              <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <span>{target.name}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                  CA {target.armorClass}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {isDM ? (
                  <span className="text-xs font-mono font-bold text-red-400">
                    HP: {target.currentHp} / {target.maxHp}
                  </span>
                ) : (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded border ${targetHealth.badgeBg}`}>
                      {targetHealth.label}
                    </span>
                    <span className="text-[11px] text-slate-400">HP: ??? / ???</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Digit Counter Dials: Centenas, Decenas, Unidades */}
        <div className="bg-slate-950 p-4 rounded-xl border-2 border-blue-900/60 shadow-inner flex flex-col items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Contador de 3 Dígitos
          </span>

          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {/* HUNDREDS */}
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

            {/* TENS */}
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

            {/* UNITS */}
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

          {/* Value Preview */}
          <div className="text-center">
            <span className="text-xs text-slate-400">Valor Total a Aplicar: </span>
            <strong className="text-lg font-mono text-amber-400">{totalAmount} HP</strong>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1">
            <button
              onClick={() => setTotal(1)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-amber-400"
            >
              1
            </button>
            <button
              onClick={() => setTotal(5)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-amber-400"
            >
              5
            </button>
            <button
              onClick={() => setTotal(10)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-amber-400"
            >
              10
            </button>
            <button
              onClick={() => setTotal(25)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-amber-400"
            >
              25
            </button>
            <button
              onClick={() => setTotal(50)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-amber-400"
            >
              50
            </button>
            <button
              onClick={() => setTotal(0)}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-red-400 hover:border-red-400 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              0
            </button>
          </div>
        </div>

        {/* Action Buttons: [-] Daño and [+] Curación */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleApplyDamage}
            disabled={totalAmount <= 0}
            className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              totalAmount > 0
                ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white active:scale-95 shadow-red-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Swords className="w-5 h-5" />
            <span>- {totalAmount} DAÑO</span>
          </button>

          <button
            onClick={handleApplyHeal}
            disabled={totalAmount <= 0}
            className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              totalAmount > 0
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white active:scale-95 shadow-emerald-950/60'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Heart className="w-5 h-5 fill-emerald-300" />
            <span>+ {totalAmount} CURACIÓN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
