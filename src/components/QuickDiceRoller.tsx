import React, { useState } from 'react';
import { playDiceRollSound, playMenuBlip } from '../utils/soundEffects.ts';
import {
  Dices,
  X,
  Plus,
  Minus,
  Sparkles,
  Send,
  History,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface DiceRollHistoryItem {
  id: string;
  formula: string;
  rolls: number[];
  modifier: number;
  total: number;
  mode?: 'normal' | 'advantage' | 'disadvantage';
  droppedRoll?: number;
  timestamp: string;
}

interface QuickDiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
  onBroadcastRoll?: (rollText: string) => void;
  senderName?: string;
}

const DIE_TYPES = [
  { sides: 4, label: 'd4', color: '#38bdf8' },
  { sides: 6, label: 'd6', color: '#818cf8' },
  { sides: 8, label: 'd8', color: '#c084fc' },
  { sides: 10, label: 'd10', color: '#f43f5e' },
  { sides: 12, label: 'd12', color: '#f97316' },
  { sides: 20, label: 'd20', color: '#eab308' },
  { sides: 100, label: 'd100', color: '#10b981' },
];

export const QuickDiceRoller: React.FC<QuickDiceRollerProps> = ({
  isOpen,
  onClose,
  onBroadcastRoll,
  senderName = 'Aventurero',
}) => {
  const [selectedDie, setSelectedDie] = useState<number>(20);
  const [diceCount, setDiceCount] = useState<number>(1);
  const [modifier, setModifier] = useState<number>(0);
  const [d20Mode, setD20Mode] = useState<'normal' | 'advantage' | 'disadvantage'>('normal');

  const [isRolling, setIsRolling] = useState(false);
  const [currentResult, setCurrentResult] = useState<DiceRollHistoryItem | null>(null);
  const [history, setHistory] = useState<DiceRollHistoryItem[]>([]);

  if (!isOpen) return null;

  const rollDice = () => {
    playDiceRollSound();
    setIsRolling(true);

    setTimeout(() => {
      let rolls: number[] = [];
      let dropped: number | undefined = undefined;

      if (selectedDie === 20 && d20Mode !== 'normal') {
        const r1 = Math.floor(Math.random() * 20) + 1;
        const r2 = Math.floor(Math.random() * 20) + 1;
        if (d20Mode === 'advantage') {
          rolls = [Math.max(r1, r2)];
          dropped = Math.min(r1, r2);
        } else {
          rolls = [Math.min(r1, r2)];
          dropped = Math.max(r1, r2);
        }
      } else {
        for (let i = 0; i < diceCount; i++) {
          rolls.push(Math.floor(Math.random() * selectedDie) + 1);
        }
      }

      const sumRolls = rolls.reduce((acc, v) => acc + v, 0);
      const total = sumRolls + modifier;

      let formula = `${diceCount}d${selectedDie}`;
      if (selectedDie === 20 && d20Mode === 'advantage') {
        formula = `1d20 (Con Ventaja)`;
      } else if (selectedDie === 20 && d20Mode === 'disadvantage') {
        formula = `1d20 (Con Desventaja)`;
      }
      if (modifier !== 0) {
        formula += ` ${modifier > 0 ? `+${modifier}` : modifier}`;
      }

      const resultItem: DiceRollHistoryItem = {
        id: `roll-${Date.now()}`,
        formula,
        rolls,
        modifier,
        total,
        mode: d20Mode,
        droppedRoll: dropped,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setCurrentResult(resultItem);
      setHistory((prev) => [resultItem, ...prev.slice(0, 7)]);
      setIsRolling(false);
    }, 450);
  };

  const handleSendToTable = () => {
    if (!currentResult || !onBroadcastRoll) return;
    playMenuBlip();
    let text = `🎲 ${senderName} tiró ${currentResult.formula} ➔ Total: ${currentResult.total}`;
    if (currentResult.rolls.length > 1 || currentResult.droppedRoll !== undefined) {
      text += ` (Dados: [${currentResult.rolls.join(', ')}]${
        currentResult.droppedRoll !== undefined ? ` descartado: ${currentResult.droppedRoll}` : ''
      })`;
    }
    onBroadcastRoll(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-4 sm:p-5 text-slate-100 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181926] rounded-xl border border-purple-500/30 text-purple-300">
              <Dices className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-100 font-mono flex items-center gap-2">
                <span>Bandeja de Dados Universal</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600/50">
                  d4 - d100
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Tiradas libres con modificadores, ventaja y opción de compartir a la mesa.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playMenuBlip();
              onClose();
            }}
            aria-label="Cerrar bandeja"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] border border-transparent hover:border-[#282d40] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Die Selection Buttons */}
        <div>
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
            Elige el tipo de dado:
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {DIE_TYPES.map((die) => {
              const isSelected = selectedDie === die.sides;
              return (
                <button
                  key={die.sides}
                  type="button"
                  onClick={() => {
                    playMenuBlip();
                    setSelectedDie(die.sides);
                  }}
                  className={`py-2 px-1 rounded-xl font-mono text-sm font-black flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-purple-900/60 border-purple-400 text-white ring-2 ring-purple-500/50 shadow-md'
                      : 'bg-[#121420] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                  style={{ color: isSelected ? '#ffffff' : die.color }}
                >
                  <span className="text-base font-extrabold">{die.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dice Count & Modifier Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#11131e]/90 p-3 rounded-xl border border-[#232635]">
          {/* Dice Count (1 to 10) */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300">Cantidad de dados:</span>
            <div className="flex items-center gap-1.5 bg-[#090b10] border border-slate-700/80 rounded-xl px-2 py-1">
              <button
                type="button"
                onClick={() => setDiceCount((prev) => Math.max(1, prev - 1))}
                className="w-6 h-6 rounded bg-[#181926] hover:bg-[#25283a] text-slate-300 flex items-center justify-center"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-7 text-center font-mono font-black text-sm text-amber-300">
                {diceCount}
              </span>
              <button
                type="button"
                onClick={() => setDiceCount((prev) => Math.min(10, prev + 1))}
                className="w-6 h-6 rounded bg-[#181926] hover:bg-[#25283a] text-slate-300 flex items-center justify-center"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Modifier (+/-) */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300">Modificador:</span>
            <div className="flex items-center gap-1.5 bg-[#090b10] border border-slate-700/80 rounded-xl px-2 py-1">
              <button
                type="button"
                onClick={() => setModifier((prev) => prev - 1)}
                className="w-6 h-6 rounded bg-[#181926] hover:bg-[#25283a] text-slate-300 flex items-center justify-center"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center font-mono font-black text-sm text-cyan-300">
                {modifier >= 0 ? `+${modifier}` : modifier}
              </span>
              <button
                type="button"
                onClick={() => setModifier((prev) => prev + 1)}
                className="w-6 h-6 rounded bg-[#181926] hover:bg-[#25283a] text-slate-300 flex items-center justify-center"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* d20 Advantage / Disadvantage Selector */}
        {selectedDie === 20 && (
          <div className="flex items-center justify-between gap-2 p-2 bg-[#121420] rounded-xl border border-amber-500/30">
            <span className="text-xs font-mono font-bold text-amber-300">Modo d20:</span>
            <div className="flex items-center gap-1">
              {[
                { key: 'normal', label: 'Normal' },
                { key: 'advantage', label: '✨ Con Ventaja' },
                { key: 'disadvantage', label: '⚠️ Desventaja' },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    playMenuBlip();
                    setD20Mode(m.key as 'normal' | 'advantage' | 'disadvantage');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    d20Mode === m.key
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-[#181a28] text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Roll Button */}
        <button
          type="button"
          onClick={rollDice}
          disabled={isRolling}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-mono text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 transition-all active:scale-95 cursor-pointer"
        >
          <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
          <span>
            {isRolling
              ? 'Tirando dados...'
              : `¡Tirar ${diceCount > 1 ? `${diceCount}d${selectedDie}` : `1d${selectedDie}`}!`}
          </span>
        </button>

        {/* Current Result Showcase */}
        {currentResult && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121422] to-[#1c182d] border border-purple-500/40 shadow-xl flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-purple-300 font-bold">
                {currentResult.formula}:
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {currentResult.timestamp}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {currentResult.rolls.map((r, i) => (
                  <span
                    key={i}
                    className="w-10 h-10 rounded-xl bg-[#090a10] border border-purple-400/50 flex items-center justify-center text-lg font-black font-mono text-amber-300 shadow-inner"
                  >
                    {r}
                  </span>
                ))}
                {currentResult.droppedRoll !== undefined && (
                  <span
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center justify-center text-xs font-mono text-slate-500 line-through opacity-60"
                    title="Dado descartado por ventaja/desventaja"
                  >
                    {currentResult.droppedRoll}
                  </span>
                )}
                {currentResult.modifier !== 0 && (
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {currentResult.modifier > 0 ? `+${currentResult.modifier}` : currentResult.modifier}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Total</span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {currentResult.total}
                </span>
              </div>
            </div>

            {onBroadcastRoll && (
              <button
                type="button"
                onClick={handleSendToTable}
                className="mt-1 w-full py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Compartir resultado al registro de la mesa</span>
              </button>
            )}
          </div>
        )}

        {/* History preview */}
        {history.length > 0 && (
          <div className="pt-2 border-t border-[#232635]">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-2">
              <History className="w-3.5 h-3.5 text-purple-400" />
              <span>Historial reciente:</span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0c0e18] border border-slate-800 text-xs font-mono"
                >
                  <span className="text-slate-300">{h.formula}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">{h.timestamp}</span>
                    <span className="font-black text-amber-400 text-sm">{h.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
