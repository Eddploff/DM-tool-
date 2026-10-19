import React from 'react';
import { InitiativeRollResult } from '../types/combat.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { Dices, Sparkles, X, Check, Award, AlertCircle } from 'lucide-react';

interface InitiativeRollModalProps {
  isOpen: boolean;
  results: InitiativeRollResult[];
  onClose: () => void;
}

export const InitiativeRollModal: React.FC<InitiativeRollModalProps> = ({
  isOpen,
  results,
  onClose,
}) => {
  if (!isOpen || results.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-5 text-slate-100 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181926] rounded-xl border border-purple-500/30 text-purple-300">
              <Dices className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-100 font-mono flex items-center gap-2">
                <span>Tirada Automática de Iniciativa (1d20 + Bon.)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                El orden de turnos se ha actualizado de mayor a menor resultado.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playMenuBlip();
              onClose();
            }}
            aria-label="Cerrar resultados"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] border border-transparent hover:border-[#282d40] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
          {results.map((r, index) => {
            const isEnemy = r.type === 'enemy';
            return (
              <div
                key={r.combatantId}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  index === 0
                    ? 'bg-gradient-to-r from-amber-950/50 via-[#181a28] to-[#12141f] border-amber-500/50 ring-1 ring-amber-500/30 shadow-md'
                    : 'bg-[#12141e]/90 border-[#232635]'
                }`}
              >
                {/* Position & Avatar */}
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                      index === 0
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : index === 1
                        ? 'bg-slate-300 text-slate-950'
                        : index === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-[#1a1c29] text-slate-400 border border-[#2a2f42]'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <img
                    src={r.avatar}
                    alt={r.combatantName}
                    className={`w-9 h-9 rounded-full object-cover border shrink-0 ${
                      isEnemy ? 'border-red-500/80 ring-1 ring-red-950' : 'border-purple-400 ring-1 ring-purple-950'
                    }`}
                  />

                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5 flex-wrap">
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">{r.combatantName}</span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow">
                          <Award className="w-2.5 h-2.5" />
                          1º en Actuar
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {r.jobClass} • {isEnemy ? 'Enemigo' : 'Héroe'}
                    </span>
                  </div>
                </div>

                {/* Math breakdown: d20 + bonus = total */}
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-300 bg-[#0c0d14] px-2 py-1 rounded-lg border border-[#242838]">
                    <span
                      className={`font-black ${
                        r.isCrit
                          ? 'text-amber-400 animate-pulse'
                          : r.isFumble
                          ? 'text-red-400'
                          : 'text-purple-300'
                      }`}
                      title={r.isCrit ? '¡Crítico Natural 20!' : r.isFumble ? 'Pifia Natural 1' : 'Tirada de dado'}
                    >
                      d20({r.d20})
                    </span>
                    <span className="text-slate-500">+</span>
                    <span className="text-slate-400">{r.bonus}</span>
                    <span className="text-slate-500">=</span>
                    <strong className="text-sm font-bold text-white text-right min-w-[20px]">{r.total}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#232635]">
          <span className="text-xs font-mono text-slate-400">
            {results.length} combatientes sorteados
          </span>
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4 text-purple-200" />
            <span>Aceptar Orden y Comenzar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
