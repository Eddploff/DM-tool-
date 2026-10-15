import React, { useState, useRef, useEffect } from 'react';
import {
  Combatant,
  FloatingNumber,
  BattleEnvironment,
} from '../types/combat.ts';
import { getHealthStatus } from '../utils/combatLogic.ts';
import { getStatusEffectMeta } from '../utils/statusEffects.ts';
import { StatusBadgesOverlay } from './StatusBadgesOverlay.tsx';
import { HearthstoneArrow } from './HearthstoneArrow.tsx';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  Heart,
  Shield,
  Skull,
  Crosshair,
  Target,
  Sparkles,
  Grid,
  RotateCcw,
  X,
  FileText,
  Move,
  Crown,
  Swords,
} from 'lucide-react';

interface JRPGEncounterArenaProps {
  combatants: Combatant[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  floatingNumbers: FloatingNumber[];
  isDMView: boolean;
  activePlayerId?: string;
  environment: BattleEnvironment;
  onOpenCard?: (combatant: Combatant) => void;
  onInitiateAction?: (actor: Combatant, target: Combatant) => void;
  onOpenStatusPicker?: (combatant: Combatant) => void;
  onUpdateCombatantPosition?: (combatantId: string, col: number, row: number) => void;
  onBatchUpdateCombatants?: (updatedCombatants: Combatant[]) => void;
}

const GRID_COLS = 14;
const GRID_ROWS = 8;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

export const JRPGEncounterArena: React.FC<JRPGEncounterArenaProps> = ({
  combatants,
  selectedTargetId,
  onSelectTarget,
  floatingNumbers,
  isDMView,
  activePlayerId,
  environment,
  onOpenCard,
  onInitiateAction,
  onOpenStatusPicker,
  onUpdateCombatantPosition,
  onBatchUpdateCombatants,
}) => {
  // Hearthstone arrow targeting state
  const [targetingSourceId, setTargetingSourceId] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Unfolded Token Options Popover state
  const [unfoldedCombatantId, setUnfoldedCombatantId] = useState<string | null>(null);

  // Dragging state for VTT movement
  const [draggingCombatantId, setDraggingCombatantId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ col: number; row: number } | null>(null);

  // Grid styling options (Single clean VTT tabletop grid)
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Ensure every combatant has a valid grid position
  const getPositionFor = (c: Combatant, index: number): { col: number; row: number } => {
    if (
      c.gridPosition &&
      c.gridPosition.col >= 0 &&
      c.gridPosition.col < GRID_COLS &&
      c.gridPosition.row >= 0 &&
      c.gridPosition.row < GRID_ROWS
    ) {
      return c.gridPosition;
    }
    // Default tactical placement: Enemies on left cols (1-3), Players on right cols (10-12)
    if (c.type === 'enemy') {
      const col = 1 + (index % 3);
      const row = 1 + (Math.floor(index / 3) % 6);
      return { col, row };
    } else {
      const col = 10 + (index % 2);
      const row = 1 + (index % 6);
      return { col, row };
    }
  };

  // Map of "col-row" to combatant for fast cell lookup
  const cellCombatantMap = new Map<string, Combatant>();
  combatants.forEach((c, idx) => {
    const pos = getPositionFor(c, idx);
    cellCombatantMap.set(`${pos.col}-${pos.row}`, c);
  });

  // Track mouse pointer when targeting is active
  useEffect(() => {
    if (!targetingSourceId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCurrentMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTargetingSourceId(null);
        setStartPoint(null);
        setHoveredTargetId(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetingSourceId]);

  // Close unfolded options menu with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && unfoldedCombatantId) {
        setUnfoldedCombatantId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unfoldedCombatantId]);

  // Start targeting from a combatant (aiming arrow)
  const startTargeting = (sourceCombatant: Combatant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playMenuBlip();
    setUnfoldedCombatantId(null);
    const elem = tokenRefs.current[sourceCombatant.id];
    if (elem) {
      const rect = elem.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      setStartPoint({ x: originX, y: originY });
      if (e && e.clientX && e.clientY) {
        setCurrentMousePos({ x: e.clientX, y: e.clientY });
      } else {
        setCurrentMousePos({ x: originX, y: originY });
      }
      setTargetingSourceId(sourceCombatant.id);
    }
  };

  // Click on a token on the grid
  const handleTokenClick = (c: Combatant, e: React.MouseEvent) => {
    e.stopPropagation();
    playMenuBlip();

    // If we are currently aiming with Hearthstone arrow
    if (targetingSourceId) {
      const source = combatants.find((cb) => cb.id === targetingSourceId);
      if (source && onInitiateAction) {
        onInitiateAction(source, c);
      }
      setTargetingSourceId(null);
      setStartPoint(null);
      setHoveredTargetId(null);
      return;
    }

    // Normal click: select target and ALWAYS open the unfolded options popover
    onSelectTarget(c.id);
    setUnfoldedCombatantId(c.id);
  };

  // Click on an empty grid square: if a token is unfolded, option to move there
  const handleCellClick = (col: number, row: number) => {
    if (targetingSourceId) {
      setTargetingSourceId(null);
      setStartPoint(null);
      setHoveredTargetId(null);
      return;
    }

    const occupant = cellCombatantMap.get(`${col}-${row}`);
    if (occupant) {
      // Cell is occupied, handled by token click
      return;
    }

    // If an unfolded token is selected, move it to this clicked cell!
    if (unfoldedCombatantId && onUpdateCombatantPosition) {
      playMenuBlip();
      onUpdateCombatantPosition(unfoldedCombatantId, col, row);
    } else {
      setUnfoldedCombatantId(null);
    }
  };

  // Drag and Drop support
  const handleDragStart = (combatantId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', combatantId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCombatantId(combatantId);
  };

  const handleDragOver = (col: number, row: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ col, row });
  };

  const handleDrop = (col: number, row: number, e: React.DragEvent) => {
    e.preventDefault();
    const combatantId = e.dataTransfer.getData('text/plain') || draggingCombatantId;
    setDraggingCombatantId(null);
    setDragOverCell(null);

    if (combatantId && onUpdateCombatantPosition) {
      playMenuBlip();
      onUpdateCombatantPosition(combatantId, col, row);
    }
  };

  // Reset tactical formation (Enemies rank left, Players rank right)
  const handleResetTacticalFormation = () => {
    playMenuBlip();
    if (!onBatchUpdateCombatants) return;

    const enemies = combatants.filter((c) => c.type === 'enemy');
    const players = combatants.filter((c) => c.type === 'player');

    const updated = combatants.map((c) => {
      if (c.type === 'enemy') {
        const eIdx = enemies.findIndex((e) => e.id === c.id);
        const col = 1 + (eIdx % 3);
        const row = 1 + (Math.floor(eIdx / 3) % 6);
        return { ...c, gridPosition: { col, row } };
      } else {
        const pIdx = players.findIndex((p) => p.id === c.id);
        const col = 10 + (pIdx % 2);
        const row = 1 + (pIdx % 6);
        return { ...c, gridPosition: { col, row } };
      }
    });

    onBatchUpdateCombatants(updated);
  };

  // Environment styling configurations (Smooth ambient lighting without repeating dot grid patterns)
  const envStyles: Record<
    BattleEnvironment,
    {
      name: string;
      icon: string;
      bgClass: string;
      gridBorderClass: string;
      gridCellBg: string;
      groundClass: string;
      ambientOverlay: string;
    }
  > = {
    forest: {
      name: 'Bosque Místico',
      icon: '🌲',
      bgClass: 'bg-gradient-to-b from-teal-950 via-emerald-950 to-green-950',
      gridBorderClass: 'border-emerald-500/20',
      gridCellBg: 'hover:bg-emerald-500/10',
      groundClass: 'bg-emerald-950/80 border-t border-emerald-500/30 text-emerald-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.14),transparent_70%)]',
    },
    dungeon: {
      name: 'Mazmorra Antigua',
      icon: '🏰',
      bgClass: 'bg-gradient-to-b from-zinc-950 via-stone-900 to-neutral-950',
      gridBorderClass: 'border-stone-500/25',
      gridCellBg: 'hover:bg-amber-500/10',
      groundClass: 'bg-stone-950/80 border-t border-amber-700/30 text-stone-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.10),transparent_70%)]',
    },
    volcano: {
      name: 'Volcán de Magma',
      icon: '🌋',
      bgClass: 'bg-gradient-to-b from-orange-950 via-red-950 to-zinc-950',
      gridBorderClass: 'border-orange-500/20',
      gridCellBg: 'hover:bg-red-500/15',
      groundClass: 'bg-red-950/80 border-t border-red-500/30 text-orange-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.14),transparent_70%)]',
    },
    plains: {
      name: 'Llanuras de Fabul',
      icon: '🌾',
      bgClass: 'bg-gradient-to-b from-sky-900 via-indigo-950 to-emerald-950',
      gridBorderClass: 'border-indigo-400/20',
      gridCellBg: 'hover:bg-blue-400/10',
      groundClass: 'bg-indigo-950/80 border-t border-indigo-500/30 text-sky-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_70%)]',
    },
    cave: {
      name: 'Caverna Umbría',
      icon: '🪨',
      bgClass: 'bg-gradient-to-b from-purple-950 via-slate-950 to-indigo-950',
      gridBorderClass: 'border-purple-500/20',
      gridCellBg: 'hover:bg-purple-500/10',
      groundClass: 'bg-purple-950/80 border-t border-purple-500/30 text-purple-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.14),transparent_70%)]',
    },
    castle: {
      name: 'Bastión Imperial',
      icon: '🛡️',
      bgClass: 'bg-gradient-to-b from-stone-900 via-slate-950 to-stone-950',
      gridBorderClass: 'border-amber-500/20',
      gridCellBg: 'hover:bg-amber-400/10',
      groundClass: 'bg-slate-950/80 border-t border-amber-600/30 text-amber-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.12),transparent_70%)]',
    },
    crystal: {
      name: 'Torre de Cristal',
      icon: '💎',
      bgClass: 'bg-gradient-to-b from-cyan-950 via-blue-950 to-indigo-950',
      gridBorderClass: 'border-cyan-400/20',
      gridCellBg: 'hover:bg-cyan-400/15',
      groundClass: 'bg-cyan-950/80 border-t border-cyan-400/30 text-cyan-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.14),transparent_70%)]',
    },
  };

  const currentEnv = envStyles[environment] || envStyles.plains;
  const unfoldedCombatant = combatants.find((c) => c.id === unfoldedCombatantId);

  return (
    <div
      ref={containerRef}
      onClick={() => setUnfoldedCombatantId(null)}
      className={`relative w-full rounded-2xl overflow-hidden border-2 border-indigo-800/60 shadow-2xl transition-all duration-500 ${currentEnv.bgClass} flex flex-col justify-between select-none`}
    >
      {/* Hearthstone Targeting Arrow overlay */}
      {targetingSourceId && startPoint && (
        <HearthstoneArrow
          start={startPoint}
          end={currentMousePos}
          isHoveringTarget={hoveredTargetId !== null && hoveredTargetId !== targetingSourceId}
        />
      )}

      {/* Atmospheric ambient lighting layer - clean vignette, no second dot pattern */}
      <div className={`absolute inset-0 ${currentEnv.ambientOverlay} pointer-events-none transition-all duration-500`} />

      {/* Arena Top Toolbar / Status Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 px-3 py-2 flex flex-wrap items-center justify-between gap-2 bg-black/50 backdrop-blur-xs border-b border-white/10 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase font-mono text-slate-200">
            Mapa VTT de Combate
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-amber-200 border border-white/15 flex items-center gap-1">
            <span>{currentEnv.icon}</span>
            <span>{currentEnv.name}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700">
            <span>📐 1 casilla = 1.5m / 5 pies</span>
          </span>
        </div>

        {/* Tabletop Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          {targetingSourceId ? (
            <div className="flex items-center gap-2">
              <span className="animate-pulse font-black text-amber-300 bg-red-950/90 px-3 py-1 rounded-lg border border-red-500 flex items-center gap-1.5 shadow">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>🏹 ATACANDO: Haz clic sobre el objetivo en el mapa • [ESC para cancelar]</span>
              </span>
              <button
                onClick={() => {
                  setTargetingSourceId(null);
                  setStartPoint(null);
                  setHoveredTargetId(null);
                }}
                className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800">
                14×8 Casillas (112 Espacios)
              </span>

              <button
                onClick={() => setShowCoordinates(!showCoordinates)}
                title="Mostrar/ocultar coordenadas A-N y 1-8"
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                  showCoordinates
                    ? 'bg-indigo-900/80 text-indigo-200 border-indigo-600'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Coords</span>
              </button>

              {onBatchUpdateCombatants && (
                <button
                  onClick={handleResetTacticalFormation}
                  title="Reorganizar fichas en formación inicial en la cuadrícula"
                  className="px-2 py-1 rounded text-[10px] font-medium bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden md:inline">Formación Inicial</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* VTT GRID MAP CANVAS */}
      <div className="relative z-10 p-3 sm:p-5 flex-1 flex flex-col items-center justify-center overflow-x-auto min-h-[460px]">
        <div className="inline-block min-w-max">
          {/* Top Column Coordinate Headers (A - N) */}
          {showCoordinates && (
            <div className="flex pl-6 mb-1 text-center font-mono text-[11px] font-bold text-slate-300 tracking-wider select-none">
              {COL_LABELS.map((letter) => (
                <div key={letter} className="w-13 h-5 sm:w-15 sm:h-5 md:w-16 md:h-5 flex items-center justify-center shrink-0">
                  {letter}
                </div>
              ))}
            </div>
          )}

          {/* Grid Rows Container - Clean single outer border */}
          <div className="border border-white/20 rounded-xl overflow-hidden shadow-2xl bg-slate-950/65 backdrop-blur-[2px]">
            {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex">
                {/* Left Row Coordinate Header (1 - 8) */}
                {showCoordinates && (
                  <div className="w-6 shrink-0 flex items-center justify-center font-mono text-[11px] font-bold text-slate-400 select-none bg-slate-950/50 border-r border-b border-white/10">
                    {rowIndex + 1}
                  </div>
                )}

                {/* Row Grid Cells - Single crisp internal borders (border-r border-b) */}
                <div className="flex">
                  {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
                    const cellKey = `${colIndex}-${rowIndex}`;
                    const combatant = cellCombatantMap.get(cellKey);
                    const isOver = dragOverCell?.col === colIndex && dragOverCell?.row === rowIndex;
                    const coordName = `${COL_LABELS[colIndex]}${rowIndex + 1}`;

                    return (
                      <div
                        key={colIndex}
                        onClick={() => handleCellClick(colIndex, rowIndex)}
                        onDragOver={(e) => handleDragOver(colIndex, rowIndex, e)}
                        onDrop={(e) => handleDrop(colIndex, rowIndex, e)}
                        className={`relative w-13 h-13 sm:w-15 sm:h-15 md:w-16 md:h-16 border-r border-b border-white/10 transition-colors flex items-center justify-center shrink-0 ${
                          isOver
                            ? 'bg-amber-500/25 ring-2 ring-amber-400 ring-inset'
                            : currentEnv.gridCellBg
                        }`}
                      >
                        {/* Subtle coordinate watermark in top-left of cell */}
                        {showCoordinates && (
                          <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-mono text-white/20 select-none pointer-events-none">
                            {coordName}
                          </span>
                        )}

                        {/* RENDER ONLY CIRCULAR TOKEN IF OCCUPIED */}
                        {combatant && (
                          <div
                            ref={(el) => {
                              tokenRefs.current[combatant.id] = el;
                            }}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(combatant.id, e)}
                            onClick={(e) => handleTokenClick(combatant, e)}
                            onMouseEnter={() => {
                              if (targetingSourceId) setHoveredTargetId(combatant.id);
                            }}
                            onMouseLeave={() => {
                              if (targetingSourceId) setHoveredTargetId(null);
                            }}
                            className="relative group cursor-pointer flex flex-col items-center justify-center z-20"
                          >
                            {/* Target Reticle Crosshair Indicator if Selected */}
                            {selectedTargetId === combatant.id && !targetingSourceId && (
                              <div className="absolute -top-3 z-30 bg-red-600 text-white rounded-full p-0.5 shadow-lg animate-bounce ring-2 ring-white/50">
                                <Crosshair className="w-3 h-3" />
                              </div>
                            )}

                            {/* Floating Numbers (Damage / Heal) */}
                            {floatingNumbers
                              .filter((f) => f.targetId === combatant.id)
                              .map((fl) => (
                                <div
                                  key={fl.id}
                                  className={`absolute -top-8 left-1/2 -translate-x-1/2 z-40 font-black text-sm sm:text-base pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,1)] animate-bounce ${
                                    fl.type === 'heal'
                                      ? 'text-emerald-300'
                                      : fl.type === 'crit'
                                      ? 'text-yellow-300 scale-125'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {fl.type === 'heal' ? `+${fl.amount}` : `-${fl.amount}`}
                                </div>
                              ))}

                            {/* Mini Status Effect Icons floating directly above token */}
                            {combatant.statusEffects && combatant.statusEffects.length > 0 && (
                              <div className="absolute -top-3 flex items-center gap-0.5 z-30 pointer-events-none">
                                {combatant.statusEffects.slice(0, 3).map((st) => {
                                  const meta = getStatusEffectMeta(st);
                                  return (
                                    <span
                                      key={st}
                                      title={meta.name}
                                      className="w-4 h-4 rounded-full bg-slate-950/95 border border-white/40 flex items-center justify-center text-[10px] shadow"
                                    >
                                      {meta.icon}
                                    </span>
                                  );
                                })}
                                {combatant.statusEffects.length > 3 && (
                                  <span className="w-4 h-4 rounded-full bg-indigo-950 text-indigo-200 border border-indigo-400 text-[8px] font-bold flex items-center justify-center shadow">
                                    +{combatant.statusEffects.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Circular VTT Token */}
                            <div
                              className={`relative w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full p-0.5 transition-transform duration-200 group-hover:scale-110 active:scale-95 ${
                                hoveredTargetId === combatant.id && targetingSourceId !== combatant.id
                                  ? 'ring-4 ring-red-500 scale-125 shadow-2xl'
                                  : unfoldedCombatantId === combatant.id
                                  ? 'ring-4 ring-amber-400 shadow-2xl scale-105'
                                  : selectedTargetId === combatant.id
                                  ? 'ring-3 ring-cyan-400 shadow-lg'
                                  : combatant.type === 'enemy'
                                  ? 'ring-2 ring-red-500/80 shadow-md shadow-red-950/80'
                                  : 'ring-2 ring-blue-400/80 shadow-md shadow-blue-950/80'
                              } ${combatant.currentHp <= 0 ? 'opacity-40 grayscale' : ''}`}
                            >
                              <img
                                src={combatant.avatar}
                                alt={combatant.name}
                                className="w-full h-full rounded-full object-cover bg-slate-950"
                              />

                              {/* Skull overlay if defeated */}
                              {combatant.currentHp <= 0 && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                  <Skull className="w-6 h-6 text-red-500 animate-pulse" />
                                </div>
                              )}

                              {/* Quick ATACAR button directly on token */}
                              {!targetingSourceId && combatant.currentHp > 0 && (isDMView || combatant.type === 'player') && (
                                <button
                                  onClick={(e) => startTargeting(combatant, e)}
                                  title="ATACAR (apuntar flecha hacia el objetivo)"
                                  className="absolute -bottom-1 -right-1 p-1 bg-gradient-to-br from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white rounded-full shadow-lg border-2 border-slate-950 transition-transform active:scale-90 flex items-center justify-center cursor-pointer z-30"
                                >
                                  <Swords className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Mini Compact Name Label beneath circle */}
                            <div className="mt-0.5 px-1 py-0 rounded-full bg-slate-950/85 border border-white/10 max-w-[50px] sm:max-w-[56px] text-[8px] sm:text-[9px] font-bold text-slate-200 truncate text-center pointer-events-none shadow">
                              {combatant.name.split(' ')[0]}
                            </div>

                            {/* Mini Health Status representation */}
                            {isDMView ? (
                              <div className="w-9 sm:w-10 h-1 mt-0.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 pointer-events-none">
                                <div
                                  className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(100, (combatant.currentHp / combatant.maxHp) * 100)
                                    )}%`,
                                  }}
                                />
                              </div>
                            ) : (
                              // Fog-of-war colored dot for players
                              <div
                                title={getHealthStatus(combatant.currentHp, combatant.maxHp).label}
                                className={`w-2 h-2 mt-0.5 rounded-full border border-black/50 shadow pointer-events-none ${
                                  combatant.currentHp <= 0
                                    ? 'bg-slate-600'
                                    : combatant.currentHp / combatant.maxHp > 0.5
                                    ? 'bg-emerald-400'
                                    : combatant.currentHp / combatant.maxHp > 0.25
                                    ? 'bg-amber-400'
                                    : 'bg-red-500'
                                }`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UNFOLDED TOKEN OPTIONS PANEL (Floating Card directly in viewport for instant visibility) */}
      {unfoldedCombatant && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-3xl p-3.5 sm:p-4 bg-slate-900/98 backdrop-blur-lg rounded-2xl border-2 border-amber-500 shadow-[0_15px_60px_rgba(0,0,0,0.95)] ring-2 ring-amber-400/40 animate-fade-in flex flex-col md:flex-row items-center justify-between gap-3.5"
        >
          {/* Combatant Snapshot Info */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative shrink-0">
              <img
                src={unfoldedCombatant.avatar}
                alt={unfoldedCombatant.name}
                className={`w-14 h-14 rounded-full object-cover border-2 shadow-lg ${
                  unfoldedCombatant.type === 'enemy' ? 'border-red-500 ring-2 ring-red-950' : 'border-blue-400 ring-2 ring-blue-950'
                }`}
              />
              <span
                className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase border shadow ${
                  unfoldedCombatant.type === 'enemy'
                    ? 'bg-red-950 text-red-300 border-red-700'
                    : 'bg-blue-950 text-blue-300 border-blue-700'
                }`}
              >
                {unfoldedCombatant.type === 'enemy' ? 'Enemigo' : 'Héroe'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base text-slate-100 whitespace-nowrap">
                  {unfoldedCombatant.name}
                </h3>
                {unfoldedCombatant.id === activePlayerId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center gap-1 shadow">
                    🌟 Tu Ficha
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 shrink-0">
                  🛡️ CA {unfoldedCombatant.armorClass}
                </span>
                {unfoldedCombatant.gridPosition && (
                  <span className="text-[11px] font-mono font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                    Casilla: {COL_LABELS[unfoldedCombatant.gridPosition.col]}{unfoldedCombatant.gridPosition.row + 1}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {unfoldedCombatant.jobClass} • Nivel {unfoldedCombatant.level || 1}
              </div>

              {/* HP Display */}
              {isDMView ? (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs font-mono text-red-400 font-bold">
                    <Heart className="w-3.5 h-3.5 fill-red-500" />
                    <span>
                      {unfoldedCombatant.currentHp} / {unfoldedCombatant.maxHp} HP
                    </span>
                  </div>
                  <div className="w-28 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (unfoldedCombatant.currentHp / unfoldedCombatant.maxHp) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  {(() => {
                    const hs = getHealthStatus(
                      unfoldedCombatant.currentHp,
                      unfoldedCombatant.maxHp
                    );
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${hs.badgeBg}`}
                      >
                        <Heart className="w-3 h-3" />
                        {hs.label}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Active Altered States Badge Overlay */}
          {unfoldedCombatant.statusEffects && unfoldedCombatant.statusEffects.length > 0 && (
            <div className="w-full md:w-auto">
              <StatusBadgesOverlay
                statusEffects={unfoldedCombatant.statusEffects}
                isDM={isDMView}
              />
            </div>
          )}

          {/* Unfolded Action Options Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* 1. ATACAR: Despliega la flecha estilo Hearthstone */}
            <button
              onClick={(e) => startTargeting(unfoldedCombatant, e)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-950/80 ring-2 ring-red-400/60 transition-all hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
              title="ATACAR: Haz clic para desplegar la flecha y seleccionar tu objetivo"
            >
              <Swords className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>ATACAR</span>
            </button>

            {/* 2. Aplicar Daño / Curación (+ / -) */}
            <button
              onClick={() => {
                const actor = combatants.find((c) => c.id === activePlayerId) || combatants[0];
                if (onInitiateAction) onInitiateAction(actor, unfoldedCombatant);
                setUnfoldedCombatantId(null);
              }}
              className="px-3 py-2 bg-red-950/90 hover:bg-red-900 border border-red-600 text-red-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-red-400" />
              <span>Contador (+/-)</span>
            </button>

            {/* 3. Estados Alterados */}
            {onOpenStatusPicker && (
              <button
                onClick={() => {
                  onOpenStatusPicker(unfoldedCombatant);
                  setUnfoldedCombatantId(null);
                }}
                className="px-3 py-2 bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-600 text-indigo-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Estados</span>
              </button>
            )}

            {/* 4. Ficha de Personaje */}
            {onOpenCard && (isDMView || unfoldedCombatant.id === activePlayerId) && (
              <button
                onClick={() => {
                  onOpenCard(unfoldedCombatant);
                  setUnfoldedCombatantId(null);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs sm:text-sm flex items-center gap-1.5 border border-slate-700 shadow transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Ver Ficha</span>
              </button>
            )}

            {/* Close popover */}
            <button
              onClick={() => setUnfoldedCombatantId(null)}
              title="Cerrar opciones"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Battle Ground Terrain Bar */}
      <div
        className={`relative z-20 px-3 py-2 ${currentEnv.groundClass} flex flex-wrap items-center justify-between text-[11px] gap-2`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">Objetivo seleccionado:</span>
          {(() => {
            const current = combatants.find((c) => c.id === selectedTargetId);
            if (!current)
              return <span className="text-slate-500 italic">Ninguno (haz clic en un token)</span>;
            return (
              <span className="font-bold text-amber-300 flex items-center gap-1">
                {current.name} ({current.type === 'enemy' ? 'Enemigo' : 'Aliado'})
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>
            💡 <em>Arrastra los círculos por las casillas para reflejar la mesa física</em>
          </span>
          <span className="hidden sm:inline">
            Entorno: <span className="capitalize text-slate-200">{environment}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
