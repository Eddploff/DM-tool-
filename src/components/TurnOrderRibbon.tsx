import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Combatant,
  EncounterState,
} from '../types/combat.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Dices,
  Swords,
  Shield,
  Zap,
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

  const totalCombatantsInOrder = encounter.turnOrder.length;

  // Build upcoming turn carousel slots that fill the ribbon all the way to the right edge.
  // We generate 8 upcoming steps so the bar is always completely filled to the right.
  const CAROUSEL_SLOTS = 8;
  const currentGlobalTurn = (encounter.round - 1) * Math.max(1, totalCombatantsInOrder) + encounter.activeTurnIndex;

  const carouselItems = [];
  if (totalCombatantsInOrder > 0) {
    for (let offset = 0; offset < CAROUSEL_SLOTS; offset++) {
      const turnNumber = currentGlobalTurn + offset;
      const targetIndex = (encounter.activeTurnIndex + offset) % totalCombatantsInOrder;
      const combatantId = encounter.turnOrder[targetIndex];
      const combatant = encounter.combatants.find((c) => c.id === combatantId);
      if (combatant) {
        // Calculate round for this future turn
        const futureRound = encounter.round + Math.floor((encounter.activeTurnIndex + offset) / totalCombatantsInOrder);
        carouselItems.push({
          offset,
          turnNumber,
          targetIndex,
          combatant,
          futureRound,
          key: `${combatant.id}-step-${turnNumber}`,
        });
      }
    }
  }

  return (
    <div
      className="w-full bg-[#12141c] border border-[#222532] rounded-xl p-3 shadow-md text-slate-200 backdrop-blur-md flex flex-col gap-2.5 overflow-hidden"
      aria-label="Barra de Orden de Turnos"
    >
      {/* Top Status Bar: Round, Active Actor, and DM Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#202330] pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Round Capsule */}
          <div className="px-2.5 py-1 rounded-lg bg-[#27171a] border border-[#522127] text-[#f87171] text-xs font-bold font-mono shadow-sm flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-[#f87171]" />
            <span>RONDA {encounter.round}</span>
          </div>

          {encounter.isSurpriseRound && (
            <span className="px-2 py-1 rounded-lg bg-[#261f14] border border-[#5c441c] text-[#fbbf24] text-xs font-mono font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>Ronda Sorpresa ({encounter.surpriseSide === 'players' ? 'Emboscada Jugadores' : 'Emboscada Enemiga'})</span>
            </span>
          )}

          {/* Turn Actor Banner */}
          <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <span className="text-slate-400 font-mono text-xs">Turno:</span>
            {currentActor ? (
              <span
                className={`font-bold px-2.5 py-0.5 rounded-lg font-mono text-xs flex items-center gap-1.5 ${
                  currentActor.type === 'enemy'
                    ? 'bg-[#29171b] text-[#fca5a5] border border-[#6b252f]'
                    : 'bg-[#142332] text-[#7dd3fc] border border-[#1e486b]'
                }`}
              >
                <span>{currentActor.name}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  ({currentActor.type === 'enemy' ? 'Enemigo • DM' : 'Héroe'})
                </span>
              </span>
            ) : (
              <span className="text-slate-500 italic font-mono text-xs">Nadie en turno</span>
            )}

            {isMyTurn && !isDMView && (
              <span className="bg-[#e5a93c] text-slate-950 font-black font-mono text-xs px-2.5 py-0.5 rounded-md shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3 text-slate-950 fill-current" />
                <span>¡ES TU TURNO!</span>
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
              type="button"
              onClick={onRetreatTurn}
              title="Retroceder al turno anterior"
              className="p-1.5 rounded-lg bg-[#181a24] border border-[#2b2e3d] text-slate-300 hover:text-white hover:bg-[#222533] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Siguiente Turno in matte gold like the reference */}
            <button
              type="button"
              onClick={onAdvanceTurn}
              className="px-3.5 py-1.5 rounded-lg bg-[#e5a93c] hover:bg-[#d4972f] text-[#121318] text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4 text-[#121318]" />
            </button>

            <button
              type="button"
              onClick={onOpenOrderModal}
              title="Pedir e ingresar manualmente las iniciativas de la mesa"
              className="px-2.5 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#222533] border border-[#2b2e3d] text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Iniciativas</span>
            </button>
          </div>
        )}

        {/* Player End Turn Button if it's their turn */}
        {!isDMView && isMyTurn && (
          <button
            type="button"
            onClick={onAdvanceTurn}
            className="px-3.5 py-1.5 bg-[#e5a93c] hover:bg-[#d4972f] text-slate-950 font-bold font-mono text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <span>Terminar Mi Turno</span>
            <ChevronRight className="w-4 h-4 text-slate-950" />
          </button>
        )}
      </div>

      {/* JRPG Smooth Animated Carousel (flows from right to left all the way to the right edge) */}
      <div className="relative w-full overflow-hidden py-1">
        {/* Right edge subtle gradient fade for smooth entrance */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#12141c] to-transparent z-10 pointer-events-none" />

        <div className="flex items-center gap-2.5 w-full min-w-max">
          <span className="text-[10px] uppercase font-mono text-slate-500 font-bold shrink-0 tracking-wider">
            Línea:
          </span>

          <div className="flex items-center gap-2 w-full">
            <AnimatePresence initial={false} mode="popLayout">
              {carouselItems.map(({ offset, combatant, futureRound, key }) => {
                const isActive = offset === 0;
                const isDefeated = combatant.currentHp <= 0;
                const isEnemy = combatant.type === 'enemy';
                const hpPercent = combatant.maxHp > 0 ? Math.round((combatant.currentHp / combatant.maxHp) * 100) : 0;

                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, x: 60, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -60, scale: 0.9 }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 30,
                      mass: 0.85,
                    }}
                    className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl shrink-0 border select-none transition-colors ${
                      isActive
                        ? isEnemy
                          ? 'bg-[#25171a] border-[#b91c1c] text-red-100 ring-1 ring-[#ef4444]'
                          : 'bg-[#221f16] border-[#e5a93c] text-amber-100 ring-1 ring-[#e5a93c]'
                        : isEnemy
                        ? 'bg-[#18161b] border-[#292227] text-slate-400 hover:border-[#3d323a]'
                        : 'bg-[#151722] border-[#232737] text-slate-400 hover:border-[#31364b]'
                    } ${isDefeated ? 'opacity-30 grayscale' : ''}`}
                  >
                    {/* Position Label / Turn Tag */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      {isActive ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#e5a93c] text-[#121318] text-[9px] font-black font-mono uppercase tracking-tight shadow-sm">
                          ACTIVO
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          +{offset}
                        </span>
                      )}
                    </div>

                    {/* Avatar with matte border matching reference */}
                    <div className="relative shrink-0">
                      <img
                        src={combatant.avatar}
                        alt={combatant.name}
                        className={`w-8 h-8 rounded-full object-cover border ${
                          isActive
                            ? isEnemy
                              ? 'border-[#f87171]'
                              : 'border-[#e5a93c]'
                            : isEnemy
                            ? 'border-[#991b1b]'
                            : 'border-[#2563eb]'
                        }`}
                      />
                      {isEnemy ? (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#3d161a] border border-[#f87171] flex items-center justify-center text-[8px] font-bold text-[#fca5a5]">
                          E
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#172538] border border-[#38bdf8] flex items-center justify-center text-[8px] font-bold text-[#93c5fd]">
                          H
                        </div>
                      )}
                    </div>

                    {/* Combatant Info */}
                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate max-w-[110px] ${
                            isActive ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {combatant.name}
                        </span>
                        {combatant.initiative !== undefined && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#13151e] text-amber-300 font-mono font-bold border border-[#2b2f3f] shrink-0">
                            {combatant.initiative}
                          </span>
                        )}
                      </div>

                      {/* Mini HP & Round info */}
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400 mt-0.5">
                        {futureRound > encounter.round && (
                          <span className="text-amber-400/90 font-bold">
                            R.{futureRound}
                          </span>
                        )}
                        <span className={hpPercent <= 25 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                          {combatant.currentHp}/{combatant.maxHp} HP
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
