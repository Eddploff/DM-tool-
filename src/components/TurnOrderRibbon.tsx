import React from 'react';
import {
  Combatant,
  EncounterState,
} from '../types/combat.ts';
import {
  advanceTurn,
  retreatTurn,
} from '../utils/combatLogic.ts';
import { saveAndBroadcastEncounter } from '../utils/syncManager.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ListOrdered,
  Globe,
  Dices,
} from 'lucide-react';
import { GLOBAL_ENVIRONMENTAL_EFFECTS } from '../utils/environmentalEffects.ts';

interface TurnOrderRibbonProps {
  encounter: EncounterState;
  isDMView: boolean;
  activePlayerId?: string;
  onAdvanceTurn: () => void;
  onRetreatTurn: () => void;
  onOpenOrderModal: () => void;
  onOpenGlobalEffects?: () => void;
}

export const TurnOrderRibbon: React.FC<TurnOrderRibbonProps> = ({
  encounter,
  isDMView,
  activePlayerId,
  onAdvanceTurn,
  onRetreatTurn,
  onOpenOrderModal,
  onOpenGlobalEffects,
}) => {
  const currentActorId = encounter.turnOrder[encounter.activeTurnIndex];
  const currentActor = encounter.combatants.find((c) => c.id === currentActorId);
  const isMyTurn = currentActorId === activePlayerId;

  return (
    <div className="bg-[#0e1017]/95 border border-[#232635] rounded-xl p-2.5 shadow-xl text-slate-200 backdrop-blur-md ring-1 ring-white/5 flex flex-col gap-2">
      {/* Top Status Bar: Round, Active Actor, and DM Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232635] pb-2">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-0.5 rounded-lg bg-[#141624] border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
            Ronda {encounter.round}
          </div>

          {encounter.isSurpriseRound && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Ronda Sorpresa ({encounter.surpriseSide === 'players' ? 'Emboscada Jugadores' : 'Emboscada Enemiga'})</span>
            </span>
          )}

          {/* Turn Actor Banner */}
          <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">Turno:</span>
            {currentActor ? (
              <span
                className={`font-bold px-2 py-0.5 rounded-md font-mono ${
                  currentActor.type === 'enemy'
                    ? 'bg-red-950/60 text-red-200 border border-red-800/50'
                    : 'bg-purple-950/60 text-purple-200 border border-purple-700/50'
                }`}
              >
                {currentActor.name} ({currentActor.type === 'enemy' ? 'Enemigo • DM' : 'Jugador'})
              </span>
            ) : (
              <span className="text-slate-500 italic font-mono">Nadie en turno</span>
            )}

            {isMyTurn && !isDMView && (
              <span className="bg-purple-500 text-slate-950 font-bold font-mono text-xs px-2 py-0.5 rounded-md animate-pulse shadow">
                ¡ES TU TURNO!
              </span>
            )}
          </div>

          {/* Active Global Environmental Effects Tags */}
          {encounter.activeGlobalEffects && encounter.activeGlobalEffects.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap ml-1">
              {encounter.activeGlobalEffects.map((effId) => {
                const eff = GLOBAL_ENVIRONMENTAL_EFFECTS.find((e) => e.id === effId);
                if (!eff) return null;
                return (
                  <button
                    key={eff.id}
                    onClick={() => {
                      playMenuBlip();
                      if (onOpenGlobalEffects) onOpenGlobalEffects();
                    }}
                    title={`${eff.name}: ${eff.summary}. Haz clic para ver detalles.`}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border flex items-center gap-1 cursor-pointer transition-all hover:scale-105 ${eff.badgeClass}`}
                  >
                    <span>{eff.icon}</span>
                    <span>{eff.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DM Turn Progression & Order Config Controls */}
        {isDMView && (
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={onRetreatTurn}
              title="Turno anterior"
              className="p-1.5 rounded-lg bg-[#161824] border border-slate-700/60 text-slate-300 hover:text-white hover:bg-[#202334] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onAdvanceTurn}
              className="px-2.5 py-1 rounded-lg bg-[#1e1c30] hover:bg-purple-900/60 text-purple-200 hover:text-white text-xs font-mono font-bold flex items-center gap-1 shadow border border-purple-500/40 hover:border-purple-400 transition-colors cursor-pointer"
            >
              <span>Siguiente Turno</span>
              <ChevronRight className="w-4 h-4 text-purple-300" />
            </button>

            <button
              onClick={onOpenOrderModal}
              title="Pedir e ingresar manualmente las iniciativas de la mesa"
              className="px-2.5 py-1 rounded-lg bg-[#1a1829] hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            >
              <Dices className="w-3.5 h-3.5 text-purple-400" />
              <span>Pedir Iniciativas</span>
            </button>
          </div>
        )}

        {/* Player End Turn Button if it's their turn */}
        {!isDMView && isMyTurn && (
          <button
            onClick={onAdvanceTurn}
            className="px-3 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold font-mono text-xs rounded-lg shadow flex items-center gap-1 transition-all cursor-pointer"
          >
            <span>Terminar Mi Turno</span>
            <ChevronRight className="w-4 h-4 text-purple-200" />
          </button>
        )}
      </div>

      {/* Visual Turn Order Ribbon / Sequence */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-thin scrollbar-thumb-slate-700">
        <span className="text-[10px] uppercase font-mono text-slate-500 font-bold shrink-0">
          Orden:
        </span>
        {encounter.turnOrder.map((combatantId, idx) => {
          const c = encounter.combatants.find((item) => item.id === combatantId);
          if (!c) return null;
          const isActive = idx === encounter.activeTurnIndex;
          const isDefeated = c.currentHp <= 0;
          const isEnemy = c.type === 'enemy';

          return (
            <div
              key={`${c.id}-${idx}`}
              className={`relative flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0 border transition-all ${
                isActive
                  ? isEnemy
                    ? 'bg-red-950/70 border-red-500 shadow-md shadow-red-950/50 scale-105 ring-1 ring-red-400'
                    : 'bg-[#1c1a2c] border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105 ring-1 ring-purple-400'
                  : 'bg-[#111219]/90 border border-slate-800/80 text-slate-400'
              } ${isDefeated ? 'opacity-30 grayscale' : ''}`}
            >
              {/* Order number badge */}
              <span className="text-[10px] font-mono font-bold text-slate-400">
                #{idx + 1}
              </span>

              {/* Avatar */}
              <img
                src={c.avatar}
                alt={c.name}
                className={`w-7 h-7 rounded-full object-cover border ${
                  isActive ? (isEnemy ? 'border-red-400' : 'border-blue-300') : 'border-slate-700'
                }`}
              />

              {/* Name */}
              <div className="flex flex-col">
                <span className={`text-xs font-bold truncate max-w-[120px] ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {c.name}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {c.initiative !== undefined ? `Inic: ${c.initiative}` : (isEnemy ? 'Enemigo' : 'Héroe')}
                </span>
              </div>

              {/* Active Pointer */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rotate-45" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
