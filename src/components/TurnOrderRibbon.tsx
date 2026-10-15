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
} from 'lucide-react';

interface TurnOrderRibbonProps {
  encounter: EncounterState;
  isDMView: boolean;
  activePlayerId?: string;
  onAdvanceTurn: () => void;
  onRetreatTurn: () => void;
  onOpenOrderModal: () => void;
}

export const TurnOrderRibbon: React.FC<TurnOrderRibbonProps> = ({
  encounter,
  isDMView,
  activePlayerId,
  onAdvanceTurn,
  onRetreatTurn,
  onOpenOrderModal,
}) => {
  const currentActorId = encounter.turnOrder[encounter.activeTurnIndex];
  const currentActor = encounter.combatants.find((c) => c.id === currentActorId);
  const isMyTurn = currentActorId === activePlayerId;

  return (
    <div className="bg-slate-950/90 border border-indigo-900/60 rounded-xl p-2.5 shadow-xl text-slate-100 flex flex-col gap-2">
      {/* Top Status Bar: Round, Active Actor, and DM Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-950 pb-2">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-0.5 rounded-full bg-blue-950 border border-blue-700 text-blue-300 text-xs font-bold font-mono">
            Ronda {encounter.round}
          </div>

          {encounter.isSurpriseRound && (
            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-amber-300 text-xs font-bold flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              ¡Ronda Sorpresa ({encounter.surpriseSide === 'players' ? 'Emboscada Jugadores' : 'Emboscada Enemiga'})!
            </span>
          )}

          {/* Turn Actor Banner */}
          <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <span className="text-slate-400">Turno de:</span>
            {currentActor ? (
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  currentActor.type === 'enemy'
                    ? 'bg-red-950/80 text-red-300 border border-red-800'
                    : 'bg-blue-950/80 text-blue-300 border border-blue-800'
                }`}
              >
                {currentActor.name} ({currentActor.type === 'enemy' ? 'Enemigo • Control DM' : 'Jugador'})
              </span>
            ) : (
              <span className="text-slate-500 italic">Nadie en turno</span>
            )}

            {isMyTurn && !isDMView && (
              <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full animate-bounce shadow">
                ¡ES TU TURNO!
              </span>
            )}
          </div>
        </div>

        {/* DM Turn Progression & Order Config Controls */}
        {isDMView && (
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              onClick={onRetreatTurn}
              title="Turno anterior"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onAdvanceTurn}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow transition-colors"
            >
              <span>Siguiente Turno</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenOrderModal}
              title="Configurar y ordenar las iniciativas presenciales del combate"
              className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500 text-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Pedir / Ajustar Orden</span>
            </button>
          </div>
        )}

        {/* Player End Turn Button if it's their turn */}
        {!isDMView && isMyTurn && (
          <button
            onClick={onAdvanceTurn}
            className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-lg shadow hover:from-emerald-500 hover:to-teal-500 flex items-center gap-1 transition-all"
          >
            <span>Terminar Mi Turno</span>
            <ChevronRight className="w-4 h-4" />
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
                    ? 'bg-red-950 border-red-500 shadow-md shadow-red-900/50 scale-105 ring-2 ring-red-400'
                    : 'bg-blue-950 border-blue-400 shadow-md shadow-blue-900/50 scale-105 ring-2 ring-blue-400'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
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
