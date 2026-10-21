import React, { useState } from 'react';
import {
  Dices,
  Sparkles,
  Zap,
  Skull,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import {
  rollD20,
  rollDiceFormula,
  formatD20Log,
  formatFormulaLog,
  D20RollResult,
} from '../utils/diceLogic.ts';
import { playDiceRollSound, playMenuBlip } from '../utils/soundEffects.ts';

interface QuickDiceBarProps {
  onOpenDiceRoller: () => void;
  onBroadcastRoll: (rollText: string) => void;
  senderName: string;
}

export const QuickDiceBar: React.FC<QuickDiceBarProps> = ({
  onOpenDiceRoller,
  onBroadcastRoll,
  senderName,
}) => {
  const [modifier, setModifier] = useState<number>(0);
  const [lastRoll, setLastRoll] = useState<{
    text: string;
    isCrit?: boolean;
    isFumble?: boolean;
  } | null>(null);

  const handleQuickD20 = (mode: 'normal' | 'advantage' | 'disadvantage') => {
    playDiceRollSound();
    const result: D20RollResult = rollD20(mode);
    const logText = formatD20Log(result, modifier);
    onBroadcastRoll(logText);

    const total = result.result + modifier;
    const modeLabel = mode === 'advantage' ? ' (Vent.)' : mode === 'disadvantage' ? ' (Desv.)' : '';
    setLastRoll({
      text: `d20${modeLabel}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''} = ${total}`,
      isCrit: result.isCrit,
      isFumble: result.isFumble,
    });
  };

  const handleQuickDie = (sides: number) => {
    playDiceRollSound();
    const result = rollDiceFormula(1, sides, modifier);
    const logText = formatFormulaLog(result);
    onBroadcastRoll(logText);

    setLastRoll({
      text: `d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''} = ${result.total}`,
    });
  };

  return (
    <div
      className="bg-[#12141c] border border-[#222532] rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2.5 transition-colors"
      aria-label="Barra de Lanzamiento Rápido de Dados"
    >
      {/* Left side: Prominent Open Modal Button & Label */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            playMenuBlip();
            onOpenDiceRoller();
          }}
          className="px-3.5 py-1.5 rounded-lg bg-[#e5a93c] hover:bg-[#d97706] text-[#0d0e12] font-black text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Abrir Bandeja 3D Completa de Dados"
        >
          <Dices className="w-4 h-4 text-[#0d0e12]" />
          <span>Tirar Dados</span>
          <Maximize2 className="w-3 h-3 text-[#0d0e12] ml-0.5 opacity-80" />
        </button>

        {/* Quick d20 Buttons */}
        <div className="flex items-center gap-1 bg-[#171922] p-1 rounded-lg border border-[#262938]">
          <button
            type="button"
            onClick={() => handleQuickD20('normal')}
            className="px-2 py-1 rounded bg-[#202330] hover:bg-[#2b2f42] text-slate-200 text-xs font-mono font-bold border border-[#2f3345] transition-colors cursor-pointer flex items-center gap-1"
            title="Tirar 1d20 Normal con modificador actual"
          >
            <span>d20</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickD20('advantage')}
            className="px-2 py-1 rounded bg-[#13261e] hover:bg-[#1b362a] text-[#34d399] text-[11px] font-mono font-bold border border-[#1e4835] transition-colors cursor-pointer flex items-center gap-0.5"
            title="Tirar d20 con Ventaja (2d20 y quedarse con el mayor)"
          >
            <Zap className="w-3 h-3 text-[#34d399]" />
            <span>Ventaja</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickD20('disadvantage')}
            className="px-2 py-1 rounded bg-[#281519] hover:bg-[#381c22] text-[#f87171] text-[11px] font-mono font-bold border border-[#4e222b] transition-colors cursor-pointer flex items-center gap-0.5"
            title="Tirar d20 con Desventaja (2d20 y quedarse con el menor)"
          >
            <Skull className="w-3 h-3 text-[#f87171]" />
            <span>Desv.</span>
          </button>
        </div>

        {/* Quick Common Polyhedral Dice */}
        <div className="hidden sm:flex items-center gap-1 bg-[#171922] p-1 rounded-lg border border-[#262938]">
          {[4, 6, 8, 10, 12, 100].map((sides) => (
            <button
              key={sides}
              type="button"
              onClick={() => handleQuickDie(sides)}
              className="px-2 py-1 rounded bg-[#202330] hover:bg-[#2b2f42] text-slate-300 hover:text-[#e5a93c] text-xs font-mono font-bold border border-[#2f3345] transition-colors cursor-pointer"
              title={`Lanzar 1d${sides} con modificador`}
            >
              d{sides}
            </button>
          ))}
        </div>
      </div>

      {/* Right side: Modifier input and Last Roll Pill */}
      <div className="flex items-center gap-2">
        {/* Modifier selector */}
        <div className="flex items-center gap-1 bg-[#171922] px-2 py-1 rounded-lg border border-[#262938] text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Mod:</span>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value, 10) || 0)}
            className="w-12 bg-[#202330] text-[#e5a93c] font-bold text-center px-1 py-0.5 rounded border border-[#2f3345] outline-none text-xs focus:border-[#e5a93c]"
            title="Modificador numérico sumado a la tirada (+/-)"
          />
        </div>

        {/* Last Roll Display */}
        {lastRoll && (
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 ${
              lastRoll.isCrit
                ? 'bg-[#292012] border-[#e5a93c] text-[#fbbf24]'
                : lastRoll.isFumble
                ? 'bg-[#2b1418] border-[#ef4444] text-[#fca5a5]'
                : 'bg-[#1a1d27] border-[#2e3346] text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e5a93c]" />
            <span>{lastRoll.text}</span>
            {lastRoll.isCrit && <span className="text-[10px] text-[#fbbf24] font-black uppercase">¡Crítico!</span>}
            {lastRoll.isFumble && <span className="text-[10px] text-[#f87171] font-black uppercase">¡Pifia!</span>}
          </div>
        )}
      </div>
    </div>
  );
};
