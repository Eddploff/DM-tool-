import React, { useState } from 'react';
import { Combatant, DeathSaves } from '../types/combat.ts';
import { recordDeathSaveRoll, setManualDeathSaves, resetDeathSaves } from '../utils/combatLogic.ts';
import { playDiceRollSound, playHealSound, playCritSound, playMenuBlip } from '../utils/soundEffects.ts';
import {
  Skull,
  Heart,
  CheckCircle2,
  XCircle,
  Dices,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface DeathSavesWidgetProps {
  combatant: Combatant;
  onUpdateCombatant: (updated: Combatant, logMessage?: string) => void;
  isDM?: boolean;
  compact?: boolean;
}

export const DeathSavesWidget: React.FC<DeathSavesWidgetProps> = ({
  combatant,
  onUpdateCombatant,
  isDM = false,
  compact = false,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const saves: DeathSaves = combatant.deathSaves || {
    successes: 0,
    failures: 0,
    isStable: false,
  };

  const isDead = (saves.failures || 0) >= 3;
  const isStable = Boolean(saves.isStable || (saves.successes || 0) >= 3);
  const isDying = combatant.currentHp === 0 && !isDead && !isStable;

  const handleRoll = () => {
    if (isDead || combatant.currentHp > 0) return;
    playDiceRollSound();
    setIsRolling(true);

    setTimeout(() => {
      const d20 = Math.floor(Math.random() * 20) + 1;
      setLastRoll(d20);

      const { updated, result, message } = recordDeathSaveRoll(combatant, d20);
      setLastMessage(message);
      setIsRolling(false);

      if (result === 'nat20_revived') {
        playHealSound();
        playCritSound();
      } else if (result === 'dead' || result === 'nat1_double_failure') {
        playCritSound();
      } else if (result === 'stabilized') {
        playHealSound();
      } else {
        playMenuBlip();
      }

      onUpdateCombatant(updated, message);
    }, 450);
  };

  const handleToggleSuccess = (idx: number) => {
    playMenuBlip();
    const current = saves.successes || 0;
    const next = current === idx + 1 ? idx : idx + 1;
    const updated = setManualDeathSaves(combatant, next, saves.failures || 0);
    onUpdateCombatant(updated);
  };

  const handleToggleFailure = (idx: number) => {
    playMenuBlip();
    const current = saves.failures || 0;
    const next = current === idx + 1 ? idx : idx + 1;
    const updated = setManualDeathSaves(combatant, saves.successes || 0, next);
    onUpdateCombatant(updated);
  };

  const handleReset = () => {
    playMenuBlip();
    const updated = resetDeathSaves(combatant);
    setLastRoll(null);
    setLastMessage(null);
    onUpdateCombatant(updated, `${combatant.name}: Salvaciones de muerte reiniciadas.`);
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        isDead
          ? 'bg-rose-950/60 border-rose-600/70 shadow-lg shadow-rose-950/50'
          : isStable
          ? 'bg-emerald-950/40 border-emerald-600/50'
          : 'bg-[#140e1b]/95 border-purple-500/40 shadow-md ring-1 ring-purple-500/20'
      } ${compact ? 'p-2.5' : 'p-3.5 sm:p-4'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          {isDead ? (
            <div className="p-1.5 rounded-lg bg-rose-900/80 text-rose-300">
              <Skull className="w-4 h-4 animate-bounce" />
            </div>
          ) : isStable ? (
            <div className="p-1.5 rounded-lg bg-emerald-900/80 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-purple-900/80 text-purple-300 animate-pulse">
              <ShieldAlert className="w-4 h-4" />
            </div>
          )}
          <div>
            <h4 className="text-xs sm:text-sm font-bold font-mono text-slate-100 flex items-center gap-1.5">
              <span>Salvación contra la Muerte</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                  isDead
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                    : isStable
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                    : 'bg-purple-950 text-purple-300 border border-purple-500/50'
                }`}
              >
                {isDead ? 'Fallecido (3 Fallos)' : isStable ? 'Estabilizado' : 'Agonizando (0 HP)'}
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              Regla D&amp;D 5e: 3 Éxitos estabilizan • 3 Fallos matan • 20 Nat restaura 1 HP • 1 Nat suma 2 fallos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reiniciar contador de salvaciones"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main interactive tracker rows */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Successes tracker */}
        <div className="bg-[#0b0d14] p-2.5 rounded-xl border border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/30" />
            <span className="text-xs font-mono font-bold text-emerald-300">
              Éxitos ({saves.successes || 0}/3):
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((idx) => {
              const active = (saves.successes || 0) > idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleToggleSuccess(idx)}
                  className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                    active
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                      : 'bg-slate-950/70 border-slate-700 text-transparent hover:border-emerald-500/50'
                  }`}
                  title={`Éxito #${idx + 1}`}
                >
                  {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Failures tracker */}
        <div className="bg-[#0b0d14] p-2.5 rounded-xl border border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5 text-rose-400 fill-rose-500/30" />
            <span className="text-xs font-mono font-bold text-rose-300">
              Fallos ({saves.failures || 0}/3):
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((idx) => {
              const active = (saves.failures || 0) > idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleToggleFailure(idx)}
                  className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                    active
                      ? 'bg-rose-600 border-rose-300 text-white shadow-[0_0_10px_rgba(244,63,94,0.7)]'
                      : 'bg-slate-950/70 border-slate-700 text-transparent hover:border-rose-500/50'
                  }`}
                  title={`Fallo #${idx + 1}`}
                >
                  {active && <XCircle className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action button & Last roll display */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={handleRoll}
          disabled={isRolling || isDead || isStable}
          className={`w-full sm:w-auto px-4 py-2 rounded-xl font-mono text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
            isDead
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : isStable
              ? 'bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 cursor-default'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-purple-950/70'
          }`}
        >
          <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
          <span>{isRolling ? 'Tirando 1d20...' : 'Tirar Salvación de Muerte (1d20)'}</span>
        </button>

        {lastRoll !== null && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Última tirada:</span>
            <span
              className={`px-2 py-0.5 rounded font-black text-sm border ${
                lastRoll === 20
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400 animate-pulse'
                  : lastRoll === 1
                  ? 'bg-rose-950 text-rose-300 border-rose-400 animate-pulse'
                  : lastRoll >= 10
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-500/60'
                  : 'bg-red-950 text-red-300 border-red-500/60'
              }`}
            >
              {lastRoll} {lastRoll === 20 ? '🌟 (Nat 20!)' : lastRoll === 1 ? '💀 (Pifia!)' : ''}
            </span>
          </div>
        )}
      </div>

      {lastMessage && (
        <div className="mt-2 text-[11px] font-mono p-2 rounded-lg bg-black/40 border border-white/10 text-slate-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>{lastMessage}</span>
        </div>
      )}
    </div>
  );
};
