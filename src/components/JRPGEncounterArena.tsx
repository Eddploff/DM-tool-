import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Combatant,
  BattleEnvironment,
  FloatingNumber,
  DamageType,
  AoEShape,
  AoESizeFeet,
  AoETemplate,
  TurnPhase,
} from '../types/combat.ts';
import {
  getHealthStatus,
  getCombatantsInAoE,
  canCombatantActInTurn,
  getSafeHpValues,
  calculateGridDistance,
  getPotentialTargets,
  PotentialTarget,
  DistanceInfo,
} from '../utils/combatLogic.ts';
import { getStatusEffectMeta } from '../utils/statusEffects.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { HearthstoneArrow } from './HearthstoneArrow.tsx';
import { StatusBadgesOverlay } from './StatusBadgesOverlay.tsx';
import { TokenAttackEffect } from './TokenAttackEffect.tsx';
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
  Circle,
  Square,
  Flame,
  Zap,
  ChevronRight,
  Smartphone,
  Dices,
  Ruler,
} from 'lucide-react';

interface JRPGEncounterArenaProps {
  combatants: Combatant[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  floatingNumbers: FloatingNumber[];
  isDMView: boolean;
  activePlayerId?: string;
  activeTurnCombatantId?: string;
  currentTurnPhase?: TurnPhase;
  environment: BattleEnvironment;
  onOpenCard?: (combatant: Combatant) => void;
  onInitiateAction?: (actor: Combatant, target: Combatant) => void;
  onInitiateAoEAction?: (actor: Combatant, targets: Combatant[], aoe: AoETemplate) => void;
  onOpenStatusPicker?: (combatant: Combatant) => void;
  onUpdateCombatantPosition?: (combatantId: string, col: number, row: number) => void;
  onBatchUpdateCombatants?: (updatedCombatants: Combatant[]) => void;
  onAdvanceTurn?: () => void;
  onResetEncounter?: () => void;
  onOpenOrderModal?: () => void;
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
  activeTurnCombatantId,
  currentTurnPhase = 'action',
  environment,
  onOpenCard,
  onInitiateAction,
  onInitiateAoEAction,
  onOpenStatusPicker,
  onUpdateCombatantPosition,
  onBatchUpdateCombatants,
  onAdvanceTurn,
  onResetEncounter,
  onOpenOrderModal,
}) => {
  // Mobile responsive layout view mode ('fit' scales entire grid into mobile portrait viewport)
  const [isMobileFit, setIsMobileFit] = useState<boolean>(false);

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

  // Turn notice toast when someone tries to act out of turn
  const [turnNotice, setTurnNotice] = useState<string | null>(null);

  // AoE Tool state
  const [isAoEMode, setIsAoEMode] = useState<boolean>(false);
  const [aoeShape, setAoeShape] = useState<AoEShape>('circle');
  const [aoeSizeFeet, setAoeSizeFeet] = useState<AoESizeFeet>(20);
  const [aoeHoverCenter, setAoeHoverCenter] = useState<{ col: number; row: number } | null>(null);

  // Ruler / Cinta Métrica tool state
  const [isRulerMode, setIsRulerMode] = useState<boolean>(false);
  const [rulerOrigin, setRulerOrigin] = useState<{ col: number; row: number } | null>(null);
  const [rulerTarget, setRulerTarget] = useState<{ col: number; row: number } | null>(null);
  const [rulerPinned, setRulerPinned] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Current turn combatant
  const currentTurnActor = combatants.find((c) => c.id === activeTurnCombatantId);
  const permCheck = canCombatantActInTurn({
    isDM: isDMView,
    activePlayerId,
    currentTurnCombatantId: activeTurnCombatantId,
    currentTurnActorType: currentTurnActor?.type,
  });
  const canInteract = permCheck.allowed;

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

  // Selected actor for targeting and actions (priority: targeting source -> unfolded menu -> active turn -> active player)
  const currentActor: Combatant | undefined = useMemo(() => {
    if (targetingSourceId) {
      return combatants.find((c) => c.id === targetingSourceId);
    }
    if (unfoldedCombatantId) {
      return combatants.find((c) => c.id === unfoldedCombatantId);
    }
    if (activeTurnCombatantId) {
      return combatants.find((c) => c.id === activeTurnCombatantId);
    }
    if (!isDMView && activePlayerId) {
      return combatants.find((c) => c.id === activePlayerId);
    }
    return combatants.find((c) => c.currentHp > 0) || combatants[0];
  }, [targetingSourceId, unfoldedCombatantId, activeTurnCombatantId, activePlayerId, isDMView, combatants]);

  // Potential targets calculated for currentActor
  const { hostileTargets, friendlyTargets, nearestEnemy } = useMemo(() => {
    if (!currentActor) {
      return { hostileTargets: [], friendlyTargets: [], nearestEnemy: null };
    }
    return getPotentialTargets(currentActor, combatants, (c) =>
      getPositionFor(c, combatants.indexOf(c))
    );
  }, [currentActor, combatants]);

  const nearestEnemyTarget = nearestEnemy?.combatant;
  const nearestEnemyDistance = nearestEnemy?.distance;

  // Helper to get distance info between any two combatants
  const getDistanceBetween = (c1: Combatant, c2: Combatant): DistanceInfo => {
    const pos1 = getPositionFor(c1, combatants.indexOf(c1));
    const pos2 = getPositionFor(c2, combatants.indexOf(c2));
    return calculateGridDistance({ gridPosition: pos1 }, { gridPosition: pos2 });
  };

  // Quick-select Nearest Enemy handler
  const handleSelectNearestEnemy = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!nearestEnemyTarget) {
      setTurnNotice('No hay enemigos vivos en el encuentro.');
      setTimeout(() => setTurnNotice(null), 3000);
      return;
    }
    playMenuBlip();
    onSelectTarget(nearestEnemyTarget.id);
    setHoveredTargetId(nearestEnemyTarget.id);
    setTurnNotice(
      `🎯 Objetivo fijado: ${nearestEnemyTarget.name} (${nearestEnemyDistance?.feet} ft / ${nearestEnemyDistance?.squares} casillas de ${currentActor?.name})`
    );
    setTimeout(() => setTurnNotice(null), 3500);
  };

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
        setIsAoEMode(false);
        setAoeHoverCenter(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetingSourceId]);

  // Close unfolded options menu, AoE, or Ruler with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (unfoldedCombatantId) setUnfoldedCombatantId(null);
        if (isAoEMode) {
          setIsAoEMode(false);
          setAoeHoverCenter(null);
        }
        if (isRulerMode) {
          setIsRulerMode(false);
          setRulerOrigin(null);
          setRulerTarget(null);
          setRulerPinned(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unfoldedCombatantId, isAoEMode, isRulerMode]);

  // Start targeting from a combatant (aiming arrow)
  const startTargeting = (sourceCombatant: Combatant, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!canInteract) {
      setTurnNotice(permCheck.reason || 'No es tu turno para atacar.');
      setTimeout(() => setTurnNotice(null), 3500);
      return;
    }

    playMenuBlip();
    setUnfoldedCombatantId(null);
    setIsAoEMode(false);
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

    // If Ruler mode is active, clicking a token measures to or from that token
    if (isRulerMode) {
      const pos = getPositionFor(c, combatants.indexOf(c));
      handleCellClick(pos.col, pos.row);
      return;
    }

    // If AoE mode is active, clicking detonates AoE
    if (isAoEMode && aoeHoverCenter) {
      handleAoEDetonate(aoeHoverCenter.col, aoeHoverCenter.row);
      return;
    }

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

  // Click on a grid cell
  const handleCellClick = (col: number, row: number) => {
    // If Ruler mode is active, set origin or lock target
    if (isRulerMode) {
      playMenuBlip();
      if (!rulerOrigin) {
        setRulerOrigin({ col, row });
        setRulerTarget({ col, row });
        setRulerPinned(false);
      } else if (!rulerPinned) {
        setRulerTarget({ col, row });
        setRulerPinned(true);
      } else {
        // Reset and start new measurement from this cell
        setRulerOrigin({ col, row });
        setRulerTarget({ col, row });
        setRulerPinned(false);
      }
      return;
    }

    // If AoE mode is active, detonate the spell in this cell
    if (isAoEMode) {
      handleAoEDetonate(col, row);
      return;
    }

    if (targetingSourceId) {
      setTargetingSourceId(null);
      setStartPoint(null);
      setHoveredTargetId(null);
      return;
    }

    const occupant = cellCombatantMap.get(`${col}-${row}`);
    if (occupant) {
      return;
    }

    // If an unfolded token is selected, move it to this clicked cell!
    if (unfoldedCombatantId && onUpdateCombatantPosition) {
      if (!canInteract) {
        setTurnNotice(permCheck.reason || 'No es tu turno para moverte.');
        setTimeout(() => setTurnNotice(null), 3500);
        return;
      }
      playMenuBlip();
      onUpdateCombatantPosition(unfoldedCombatantId, col, row);
    } else {
      setUnfoldedCombatantId(null);
    }
  };

  // Handle AoE Detonation
  const handleAoEDetonate = (col: number, row: number) => {
    playMenuBlip();
    const template: AoETemplate = {
      shape: aoeShape,
      sizeFeet: aoeSizeFeet,
      centerCol: col,
      centerRow: row,
    };
    const targets = getCombatantsInAoE(combatants, template);
    const actor =
      combatants.find((c) => c.id === activeTurnCombatantId) ||
      combatants.find((c) => c.id === activePlayerId) ||
      combatants[0];

    if (onInitiateAoEAction && targets.length > 0) {
      onInitiateAoEAction(actor, targets, template);
    } else if (targets.length === 0) {
      setTurnNotice('Ningún combatiente se encontraba dentro del área seleccionada.');
      setTimeout(() => setTurnNotice(null), 3000);
    }

    setIsAoEMode(false);
    setAoeHoverCenter(null);
  };

  // Drag and Drop support
  const handleDragStart = (combatantId: string, e: React.DragEvent) => {
    if (!canInteract) {
      e.preventDefault();
      setTurnNotice(permCheck.reason || 'No es tu turno para moverte.');
      setTimeout(() => setTurnNotice(null), 3500);
      return;
    }
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
      if (!canInteract) {
        setTurnNotice(permCheck.reason || 'No es tu turno para moverte.');
        setTimeout(() => setTurnNotice(null), 3500);
        return;
      }
      playMenuBlip();
      onUpdateCombatantPosition(combatantId, col, row);
    }
  };

  // Reset tactical formation (Enemies rank left, Players rank right) AND reset HP of everyone to 100%
  const handleResetTacticalFormation = () => {
    playMenuBlip();
    if (!onBatchUpdateCombatants) return;

    const enemies = combatants.filter((c) => c.type === 'enemy');
    const players = combatants.filter((c) => c.type === 'player');

    const updated = combatants.map((c) => {
      let gridPos = c.gridPosition;
      if (c.type === 'enemy') {
        const eIdx = enemies.findIndex((e) => e.id === c.id);
        const col = 1 + (eIdx % 3);
        const row = 1 + (Math.floor(eIdx / 3) % 6);
        gridPos = { col, row };
      } else {
        const pIdx = players.findIndex((p) => p.id === c.id);
        const col = 10 + (pIdx % 2);
        const row = 1 + (pIdx % 6);
        gridPos = { col, row };
      }

      return {
        ...c,
        gridPosition: gridPos,
        currentHp: c.maxHp, // HP al 100% para todos!
        tempHp: 0,
      };
    });

    onBatchUpdateCombatants(updated);
  };

  // Toggle concentration status on a combatant
  const handleToggleConcentration = (targetCombatant: Combatant) => {
    playMenuBlip();
    if (!onBatchUpdateCombatants) return;
    const nextState = !targetCombatant.isConcentrating;
    const updated = combatants.map((c) =>
      c.id === targetCombatant.id ? { ...c, isConcentrating: nextState } : c
    );
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
      bgClass: 'bg-gradient-to-b from-[#0c1210] via-[#101815] to-[#0a0f0d]',
      gridBorderClass: 'border-emerald-500/15',
      gridCellBg: 'hover:bg-emerald-500/10',
      groundClass: 'bg-[#0f1512]/90 border-t border-emerald-500/20 text-slate-300',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_70%)]',
    },
    dungeon: {
      name: 'Mazmorra Antigua',
      icon: '🏰',
      bgClass: 'bg-gradient-to-b from-[#0d0e12] via-[#121319] to-[#090a0d]',
      gridBorderClass: 'border-slate-500/15',
      gridCellBg: 'hover:bg-slate-400/10',
      groundClass: 'bg-[#101117]/90 border-t border-slate-700/30 text-slate-300',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(148,163,184,0.08),transparent_70%)]',
    },
    volcano: {
      name: 'Volcán de Magma',
      icon: '🌋',
      bgClass: 'bg-gradient-to-b from-[#160d0f] via-[#1a0f12] to-[#0d0809]',
      gridBorderClass: 'border-rose-500/15',
      gridCellBg: 'hover:bg-rose-500/10',
      groundClass: 'bg-[#150d0f]/90 border-t border-rose-500/20 text-slate-300',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.09),transparent_70%)]',
    },
    plains: {
      name: 'Llanuras de Fabul',
      icon: '🌾',
      bgClass: 'bg-gradient-to-b from-[#0d1017] via-[#121520] to-[#0c0f16]',
      gridBorderClass: 'border-purple-500/15',
      gridCellBg: 'hover:bg-purple-500/10',
      groundClass: 'bg-[#11131b]/90 border-t border-purple-500/20 text-slate-300',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.10),transparent_70%)]',
    },
    cave: {
      name: 'Caverna Umbría',
      icon: '🪨',
      bgClass: 'bg-gradient-to-b from-[#110e19] via-[#151121] to-[#0c0914]',
      gridBorderClass: 'border-purple-500/20',
      gridCellBg: 'hover:bg-purple-500/10',
      groundClass: 'bg-[#13101d]/90 border-t border-purple-500/20 text-purple-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.12),transparent_70%)]',
    },
    castle: {
      name: 'Bastión Imperial',
      icon: '🛡️',
      bgClass: 'bg-gradient-to-b from-[#111216] via-[#16171e] to-[#0c0d11]',
      gridBorderClass: 'border-slate-500/20',
      gridCellBg: 'hover:bg-amber-400/10',
      groundClass: 'bg-[#14151b]/90 border-t border-amber-600/20 text-amber-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_70%)]',
    },
    crystal: {
      name: 'Torre de Cristal',
      icon: '💎',
      bgClass: 'bg-gradient-to-b from-[#0f111c] via-[#131728] to-[#0b0d16]',
      gridBorderClass: 'border-cyan-400/20',
      gridCellBg: 'hover:bg-cyan-400/10',
      groundClass: 'bg-[#111522]/90 border-t border-cyan-400/20 text-cyan-200',
      ambientOverlay: 'bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.10),transparent_70%)]',
    },
  };

  const currentEnv = envStyles[environment] || envStyles.plains;
  const unfoldedCombatant = combatants.find((c) => c.id === unfoldedCombatantId);

  // Targets currently caught inside AoE preview
  const affectedAoECombatants =
    isAoEMode && aoeHoverCenter
      ? getCombatantsInAoE(combatants, {
          shape: aoeShape,
          sizeFeet: aoeSizeFeet,
          centerCol: aoeHoverCenter.col,
          centerRow: aoeHoverCenter.row,
        })
      : [];

  // Ruler Distance and Line Calculation
  const rulerLineCells = useMemo(() => {
    if (!isRulerMode || !rulerOrigin || !rulerTarget) return new Map<string, number>();
    const map = new Map<string, number>();
    const p0 = rulerOrigin;
    const p1 = rulerTarget;
    const dx = Math.abs(p1.col - p0.col);
    const dy = Math.abs(p1.row - p0.row);
    const sx = p0.col < p1.col ? 1 : -1;
    const sy = p0.row < p1.row ? 1 : -1;
    let err = dx - dy;

    let currCol = p0.col;
    let currRow = p0.row;
    let step = 0;

    while (true) {
      const distSquares = Math.max(Math.abs(currCol - p0.col), Math.abs(currRow - p0.row));
      map.set(`${currCol}-${currRow}`, distSquares * 5);
      if (currCol === p1.col && currRow === p1.row) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currCol += sx;
      }
      if (e2 < dx) {
        err += dx;
        currRow += sy;
      }
      step++;
      if (step > 60) break;
    }
    return map;
  }, [isRulerMode, rulerOrigin, rulerTarget]);

  const rulerDistance = useMemo(() => {
    if (!rulerOrigin || !rulerTarget) return null;
    const dx = Math.abs(rulerTarget.col - rulerOrigin.col);
    const dy = Math.abs(rulerTarget.row - rulerOrigin.row);
    const squares = Math.max(dx, dy);
    const feet = squares * 5;
    const exactFeet = Math.round(Math.hypot(dx, dy) * 5 * 10) / 10;
    return { dx, dy, squares, feet, exactFeet };
  }, [rulerOrigin, rulerTarget]);

  const rulerOriginCombatant = rulerOrigin
    ? combatants.find((c, idx) => {
        const p = getPositionFor(c, idx);
        return p.col === rulerOrigin.col && p.row === rulerOrigin.row;
      })
    : null;

  const rulerTargetCombatant = rulerTarget
    ? combatants.find((c, idx) => {
        const p = getPositionFor(c, idx);
        return p.col === rulerTarget.col && p.row === rulerTarget.row;
      })
    : null;

  return (
    <div
      ref={containerRef}
      onClick={() => {
        setUnfoldedCombatantId(null);
      }}
      className={`relative w-full rounded-2xl overflow-hidden border border-[#222532] shadow-xl transition-all duration-500 ${currentEnv.bgClass} flex flex-col justify-between select-none`}
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

      {/* Turn Out-of-turn Notification Toast */}
      {turnNotice && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-[#1e1710] border border-[#e5a93c] text-[#fbbf24] px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-2">
          <span>⚠️ {turnNotice}</span>
          <button
            onClick={() => setTurnNotice(null)}
            className="text-amber-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Arena Top Toolbar / Status Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-20 px-3 py-2 flex flex-wrap items-center justify-between gap-2 bg-[#10121a]/90 backdrop-blur-md border-b border-[#222532] text-xs"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-2 h-2 rounded-full bg-[#10b981]" />
          <span className="font-bold tracking-wider uppercase font-mono text-slate-200">
            Mapa VTT de Combate
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1a1d28] text-amber-200 border border-[#2a2f42] flex items-center gap-1">
            <span>{currentEnv.icon}</span>
            <span>{currentEnv.name}</span>
          </span>

          {/* Current Turn Indicator in Toolbar */}
          {currentTurnActor && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase flex items-center gap-1 border ${
                canInteract
                  ? 'bg-[#241f14] text-[#e5a93c] border-[#523d1c]'
                  : 'bg-[#161822] text-slate-400 border-[#262a3a]'
              }`}
            >
              <span>👑 Turno: {currentTurnActor.name.split(' ')[0]}</span>
              <span className="font-mono text-[9px] opacity-80">
                ({currentTurnPhase === 'start' ? 'Inicio' : currentTurnPhase === 'end' ? 'Fin' : 'Acción'})
              </span>
            </span>
          )}
        </div>

        {/* Tabletop & AoE Controls */}
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
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
          ) : isAoEMode ? (
            /* 2. ÁREA DE EFECTO (AoE) ACTIVE TOOLBAR */
            <div className="flex items-center gap-1.5 bg-purple-950/90 border border-purple-500/80 rounded-xl px-2.5 py-1 shadow-lg text-white animate-fade-in flex-wrap">
              <span className="font-black text-amber-300 flex items-center gap-1 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>PLANTILLA AoE:</span>
              </span>

              {/* Forma: Círculo vs Cuadrado */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-purple-700">
                <button
                  type="button"
                  onClick={() => setAoeShape('circle')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    aoeShape === 'circle'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Circle className="w-3 h-3" />
                  <span>Círculo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAoeShape('square')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    aoeShape === 'square'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-3 h-3" />
                  <span>Cuadrado</span>
                </button>
              </div>

              {/* Tamaño: 10, 15, 20, 30 ft */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-purple-700">
                {[10, 15, 20, 30].map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setAoeSizeFeet(ft as AoESizeFeet)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                      aoeSizeFeet === ft
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ft} ft
                  </button>
                ))}
              </div>

              {/* Conteo de objetivos en el área */}
              <span className="px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/50 text-[10px] font-bold">
                🎯 {affectedAoECombatants.length} en área
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsAoEMode(false);
                  setAoeHoverCenter(null);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
              >
                ✕ Cancelar
              </button>
            </div>
          ) : isRulerMode ? (
            /* 3. REGLA / CINTA MÉTRICA ACTIVE TOOLBAR */
            <div className="flex items-center gap-1.5 bg-cyan-950/95 border border-cyan-500/80 rounded-xl px-2.5 py-1 shadow-lg text-white animate-fade-in flex-wrap">
              <span className="font-black text-cyan-300 flex items-center gap-1 text-[11px]">
                <Ruler className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>CINTA MÉTRICA:</span>
              </span>

              {rulerOrigin ? (
                <div className="flex items-center gap-1.5 text-xs font-mono flex-wrap">
                  <span className="bg-[#0b1320] px-2 py-0.5 rounded text-cyan-200 border border-cyan-800 flex items-center gap-1">
                    <span className="text-[10px] text-cyan-400">Origen:</span>
                    <b>{COL_LABELS[rulerOrigin.col]}{rulerOrigin.row + 1}</b>
                    {rulerOriginCombatant && (
                      <span className="text-[10px] text-cyan-300">({rulerOriginCombatant.name.split(' ')[0]})</span>
                    )}
                  </span>

                  <span className="text-cyan-400 font-bold">➔</span>

                  <span className="bg-[#0b1320] px-2 py-0.5 rounded text-cyan-200 border border-cyan-800 flex items-center gap-1">
                    <span className="text-[10px] text-cyan-400">Destino:</span>
                    <b>{rulerTarget ? `${COL_LABELS[rulerTarget.col]}${rulerTarget.row + 1}` : '...'}</b>
                    {rulerTargetCombatant && (
                      <span className="text-[10px] text-cyan-300">({rulerTargetCombatant.name.split(' ')[0]})</span>
                    )}
                  </span>

                  {rulerDistance && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-black text-xs shadow flex items-center gap-1">
                      <span>📏 {rulerDistance.feet} ft</span>
                      <span className="text-[10px] font-bold text-slate-800 font-sans">({rulerDistance.squares} casillas)</span>
                    </span>
                  )}

                  {rulerDistance && (
                    <span className="text-[10px] text-cyan-300/80 hidden md:inline">
                      Euclídea: {rulerDistance.exactFeet} ft
                    </span>
                  )}

                  {rulerPinned && (
                    <span className="text-[10px] bg-cyan-900/80 text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-600/60 font-sans font-bold">
                      Fijada 📌
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      playMenuBlip();
                      setRulerOrigin(null);
                      setRulerTarget(null);
                      setRulerPinned(false);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 cursor-pointer"
                  >
                    Nueva Medición
                  </button>
                </div>
              ) : (
                <span className="text-xs text-cyan-200/90 italic">
                  Haz clic en una casilla o ficha para fijar el origen
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsRulerMode(false);
                  setRulerOrigin(null);
                  setRulerTarget(null);
                  setRulerPinned(false);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 ml-auto cursor-pointer"
              >
                ✕ Salir
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick-select Nearest Enemy Button */}
              {nearestEnemyTarget && (
                <button
                  type="button"
                  onClick={handleSelectNearestEnemy}
                  title={`Fijar como objetivo al enemigo más cercano (${nearestEnemyTarget.name}) a ${currentActor?.name} (${nearestEnemyDistance?.feet} ft)`}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#261619] hover:bg-[#341b20] text-[#f87171] border border-[#52232a] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 text-[#f87171]" />
                  <span>Enemigo cercano</span>
                  <span className="text-[9px] font-mono text-[#fca5a5] bg-[#1a0f12] px-1 py-0.2 rounded border border-[#52232a]">
                    {nearestEnemyDistance?.feet}ft
                  </span>
                </button>
              )}

              {/* Botón para activar Daño en Área (AoE) */}
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  if (!canInteract) {
                    setTurnNotice(permCheck.reason || 'No es tu turno para usar daño en área.');
                    setTimeout(() => setTurnNotice(null), 3500);
                    return;
                  }
                  setIsAoEMode(true);
                  setIsRulerMode(false);
                  setUnfoldedCombatantId(null);
                  setTargetingSourceId(null);
                }}
                title="Habilitar plantilla de daño en área (Círculos y Cuadrados 10ft a 30ft estilo D&D)"
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#1d1b2e] hover:bg-[#28253f] text-[#c084fc] border border-[#3d3761] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#c084fc]" />
                <span>Daño en Área (AoE)</span>
              </button>

              {/* Botón Herramienta de Medición / Cinta Métrica (Ruler) */}
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  setIsRulerMode(true);
                  setIsAoEMode(false);
                  setUnfoldedCombatantId(null);
                  setTargetingSourceId(null);
                  setRulerOrigin(null);
                  setRulerTarget(null);
                  setRulerPinned(false);
                }}
                title="Herramienta de Medición / Cinta Métrica para medir distancias en casillas y pies (Regla D&D 5e)"
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#14222c] hover:bg-[#1a2f3d] text-[#38bdf8] border border-[#23485f] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ruler className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Cinta Métrica</span>
              </button>

              <button
                onClick={() => setShowCoordinates(!showCoordinates)}
                title="Mostrar/ocultar coordenadas A-N y 1-8"
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  showCoordinates
                    ? 'bg-[#1e2333] text-[#93c5fd] border-[#374463]'
                    : 'bg-[#171922] text-slate-400 border-[#262938]'
                }`}
              >
                <Grid className="w-3 h-3" />
                <span>Coords</span>
              </button>

              {/* Botón para alternar ajuste móvil de cuadrícula completa */}
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  setIsMobileFit((prev) => !prev);
                }}
                title={
                  isMobileFit
                    ? 'Modo móvil: Haz clic para volver a tamaño normal deslizable (100%)'
                    : 'Modo móvil: Ajustar toda la cuadrícula en la pantalla vertical del celular'
                }
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                  isMobileFit
                    ? 'bg-purple-900/90 text-purple-200 border-purple-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700'
                }`}
              >
                <Smartphone className="w-3 h-3 text-purple-400" />
                <span>{isMobileFit ? 'Zoom 100%' : 'Ajustar Celular'}</span>
              </button>

              {isDMView && onOpenOrderModal && (
                <button
                  type="button"
                  onClick={() => {
                    playMenuBlip();
                    onOpenOrderModal();
                  }}
                  title="Pedir e ingresar manualmente las iniciativas de la mesa presencial"
                  className="px-2 py-1 rounded text-[10px] font-bold bg-[#1d1b32] hover:bg-[#2c274a] text-purple-200 border border-purple-500/40 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Dices className="w-3 h-3 text-purple-400" />
                  <span>Pedir Iniciativas</span>
                </button>
              )}

              {(onResetEncounter || onBatchUpdateCombatants) && (
                <button
                  onClick={() => {
                    playMenuBlip();
                    if (onResetEncounter) {
                      onResetEncounter();
                    } else if (handleResetTacticalFormation) {
                      handleResetTacticalFormation();
                    }
                  }}
                  title="Reiniciar encuentro: 100% HP, abrir iniciativas manuales y posiciones iniciales"
                  className="px-2 py-1 rounded text-[10px] font-bold bg-amber-950/70 hover:bg-amber-900 text-amber-200 border border-amber-600/60 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Reiniciar Encuentro</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Swipe Guide on Portrait Mobile View */}
      {!isMobileFit && (
        <div className="sm:hidden w-full px-3 py-1 bg-[#10121c]/95 border-b border-[#232635] text-[10px] font-mono text-purple-300 flex items-center justify-between">
          <span className="flex items-center gap-1">↔️ Desliza horizontalmente (Cols A - N)</span>
          <button
            onClick={() => setIsMobileFit(true)}
            className="text-amber-400 font-bold underline cursor-pointer"
          >
            Ajustar a pantalla
          </button>
        </div>
      )}

      {/* VTT GRID MAP CANVAS */}
      <div
        className={`relative z-10 p-2 sm:p-5 flex-1 flex flex-col items-start sm:items-center overflow-x-auto min-h-[420px] w-full overscroll-x-contain touch-pan-x ${
          isMobileFit ? 'overflow-x-hidden' : ''
        }`}
      >
        <div
          className={`w-fit min-w-max pb-3 transition-transform duration-200 origin-top-left sm:origin-top ${
            isMobileFit ? 'scale-[0.50] sm:scale-100' : 'mx-auto'
          }`}
        >
          {/* Top Column Coordinate Headers (A - N) */}
          {showCoordinates && (
            <div className="flex pl-6 mb-1 text-center font-mono text-[11px] font-bold text-slate-300 tracking-wider select-none">
              {COL_LABELS.map((letter) => (
                <div key={letter} className="w-12 h-5 sm:w-14 sm:h-5 md:w-16 md:h-5 flex items-center justify-center shrink-0">
                  {letter}
                </div>
              ))}
            </div>
          )}

          {/* Grid Rows Container - Clean single outer border */}
          <div className="border border-white/20 rounded-xl overflow-hidden shadow-2xl bg-slate-950/70 backdrop-blur-[2px]">
            {Array.from({ length: GRID_ROWS }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex">
                {/* Left Row Coordinate Header (1 - 8) */}
                {showCoordinates && (
                  <div className="w-6 shrink-0 flex items-center justify-center font-mono text-[11px] font-bold text-slate-400 select-none bg-slate-950/50 border-r border-b border-white/10">
                    {rowIndex + 1}
                  </div>
                )}

                {/* Row Grid Cells */}
                <div className="flex">
                  {Array.from({ length: GRID_COLS }).map((_, colIndex) => {
                    const cellKey = `${colIndex}-${rowIndex}`;
                    const combatant = cellCombatantMap.get(cellKey);
                    const isOver = dragOverCell?.col === colIndex && dragOverCell?.row === rowIndex;
                    const coordName = `${COL_LABELS[colIndex]}${rowIndex + 1}`;

                    // Check if this cell is inside active AoE template
                    const cellRadius = aoeSizeFeet / 10;
                    const dx = aoeHoverCenter ? colIndex - aoeHoverCenter.col : 999;
                    const dy = aoeHoverCenter ? rowIndex - aoeHoverCenter.row : 999;
                    const isCellInAoE = Boolean(
                      isAoEMode &&
                        aoeHoverCenter &&
                        (aoeShape === 'square'
                          ? Math.abs(dx) <= cellRadius && Math.abs(dy) <= cellRadius
                          : Math.sqrt(dx * dx + dy * dy) <= cellRadius + 0.35)
                    );
                    const isAoEEpicenter =
                      isAoEMode &&
                      aoeHoverCenter &&
                      aoeHoverCenter.col === colIndex &&
                      aoeHoverCenter.row === rowIndex;

                    const isActiveTurn = combatant && combatant.id === activeTurnCombatantId;
                    const isCombatantInAoE = Boolean(combatant && isCellInAoE);

                    // Potential Target Calculations for combatant in this cell
                    const targetInfo = combatant
                      ? hostileTargets.find((h) => h.combatant.id === combatant.id)
                      : null;
                    const isPotentialTarget = Boolean(targetInfo && combatant && combatant.currentHp > 0);
                    const isNearestTarget = Boolean(
                      nearestEnemyTarget && combatant && nearestEnemyTarget.id === combatant.id
                    );
                    const isSelectedTarget = Boolean(combatant && selectedTargetId === combatant.id);

                    // Ruler cell states
                    const isRulerOrigin = Boolean(
                      isRulerMode && rulerOrigin && rulerOrigin.col === colIndex && rulerOrigin.row === rowIndex
                    );
                    const isRulerTarget = Boolean(
                      isRulerMode && rulerTarget && rulerTarget.col === colIndex && rulerTarget.row === rowIndex
                    );
                    const rulerStepDist = rulerLineCells.get(cellKey);
                    const isCellOnRulerLine = rulerStepDist !== undefined;

                    return (
                      <div
                        key={colIndex}
                        onClick={() => handleCellClick(colIndex, rowIndex)}
                        onMouseEnter={() => {
                          if (isAoEMode) {
                            setAoeHoverCenter({ col: colIndex, row: rowIndex });
                          }
                          if (isRulerMode && rulerOrigin && !rulerPinned) {
                            setRulerTarget({ col: colIndex, row: rowIndex });
                          }
                        }}
                        onDragOver={(e) => handleDragOver(colIndex, rowIndex, e)}
                        onDrop={(e) => handleDrop(colIndex, rowIndex, e)}
                        className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-r border-b transition-colors flex items-center justify-center shrink-0 ${
                          isCellInAoE
                            ? 'bg-purple-600/35 border-purple-400/80 ring-1 ring-purple-400/60'
                            : isRulerOrigin
                            ? 'bg-cyan-600/40 border-cyan-400 ring-2 ring-cyan-400 ring-inset shadow-inner'
                            : isRulerTarget
                            ? 'bg-cyan-500/35 border-cyan-300 ring-2 ring-cyan-300 ring-inset shadow-inner'
                            : isCellOnRulerLine
                            ? 'bg-cyan-500/20 border-cyan-400/50 ring-1 ring-cyan-400/30'
                            : isOver
                            ? 'bg-amber-500/25 ring-2 ring-amber-400 ring-inset border-white/10'
                            : isSelectedTarget
                            ? 'bg-cyan-950/35 border-cyan-500/50 ring-1 ring-cyan-400/30'
                            : isNearestTarget
                            ? 'bg-rose-950/35 border-rose-500/50 ring-1 ring-rose-500/30'
                            : isPotentialTarget
                            ? 'bg-rose-950/20 border-rose-500/25'
                            : `border-white/10 ${currentEnv.gridCellBg}`
                        }`}
                      >
                        {/* Target Reticle Corner Accents on Cell */}
                        {isPotentialTarget && !isCellInAoE && !isCellOnRulerLine && (
                          <div className="absolute inset-0 pointer-events-none z-5">
                            <div className={`absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l ${isSelectedTarget ? 'border-cyan-400' : isNearestTarget ? 'border-rose-400' : 'border-rose-500/40'}`} />
                            <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r ${isSelectedTarget ? 'border-cyan-400' : isNearestTarget ? 'border-rose-400' : 'border-rose-500/40'}`} />
                            <div className={`absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l ${isSelectedTarget ? 'border-cyan-400' : isNearestTarget ? 'border-rose-400' : 'border-rose-500/40'}`} />
                            <div className={`absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r ${isSelectedTarget ? 'border-cyan-400' : isNearestTarget ? 'border-rose-400' : 'border-rose-500/40'}`} />
                          </div>
                        )}

                        {/* Subtle coordinate watermark in top-left of cell */}
                        {showCoordinates && !isCellInAoE && (
                          <span className="absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-mono text-white/20 select-none pointer-events-none">
                            {coordName}
                          </span>
                        )}

                        {/* AoE Epicenter Marker */}
                        {isAoEEpicenter && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <span className="text-[10px] font-black font-mono text-amber-300 bg-purple-950/90 px-1 py-0.5 rounded border border-amber-400 shadow animate-pulse">
                              {aoeSizeFeet}ft
                            </span>
                          </div>
                        )}

                        {/* Ruler Origin Badge */}
                        {isRulerOrigin && (
                          <div className="absolute top-0.5 right-0.5 z-10 pointer-events-none">
                            <span className="text-[8px] font-black font-mono text-cyan-200 bg-cyan-950/90 px-1 py-0.2 rounded border border-cyan-400 shadow">
                              ORIGEN
                            </span>
                          </div>
                        )}

                        {/* Ruler Target Distance Badge */}
                        {isRulerTarget && !isRulerOrigin && rulerDistance && (
                          <div className="absolute -bottom-1.5 z-20 pointer-events-none">
                            <span className="text-[9px] font-black font-mono text-slate-950 bg-cyan-400 px-1.5 py-0.5 rounded-full shadow-lg border border-white animate-bounce">
                              {rulerDistance.feet}ft
                            </span>
                          </div>
                        )}

                        {/* Ruler Intermediate Step Label on Line */}
                        {isCellOnRulerLine && !isRulerOrigin && !isRulerTarget && !combatant && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-80">
                            <span className="text-[8px] font-mono font-bold text-cyan-300 bg-black/60 px-1 rounded border border-cyan-500/40">
                              {rulerStepDist}ft
                            </span>
                          </div>
                        )}

                        {/* RENDER ONLY CIRCULAR TOKEN IF OCCUPIED - MATHEMATICALLY CENTERED */}
                        {combatant && (
                          <div
                            ref={(el) => {
                              tokenRefs.current[combatant.id] = el;
                            }}
                            draggable={canInteract}
                            onDragStart={(e) => handleDragStart(combatant.id, e)}
                            onClick={(e) => handleTokenClick(combatant, e)}
                            onMouseEnter={() => {
                              if (targetingSourceId) setHoveredTargetId(combatant.id);
                            }}
                            onMouseLeave={() => {
                              if (targetingSourceId) setHoveredTargetId(null);
                            }}
                            className="relative group cursor-pointer flex items-center justify-center w-full h-full z-20"
                          >
                            {/* Active Attack Visual Animation on Target Token (Espadazo, Fueguito, Rayo, etc. + Brillo) */}
                            {floatingNumbers
                              .filter((f) => f.targetId === combatant.id && f.type === 'damage')
                              .map((fl) => (
                                <TokenAttackEffect
                                  key={`fx-${fl.id}`}
                                  damageType={fl.damageType}
                                  amount={fl.amount}
                                />
                              ))}

                            {/* Floating Numbers (Damage / Heal) */}
                            {floatingNumbers
                              .filter((f) => f.targetId === combatant.id)
                              .map((fl) => {
                                // Para jugadores: siempre mostrar el daño completo sin mitigar para no revelar si el enemigo es resistente
                                const displayNum =
                                  !isDMView && fl.playerDisplayAmount !== undefined
                                    ? fl.playerDisplayAmount
                                    : fl.amount;

                                return (
                                  <div
                                    key={fl.id}
                                    className={`absolute -top-8 left-1/2 -translate-x-1/2 z-50 font-black text-sm sm:text-base pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,1)] animate-bounce flex items-center gap-1 ${
                                      fl.type === 'heal'
                                        ? 'text-emerald-300'
                                        : fl.type === 'crit'
                                        ? 'text-yellow-300 scale-125'
                                        : 'text-red-400'
                                    }`}
                                  >
                                    <span>{fl.type === 'heal' ? `+${displayNum}` : `-${displayNum}`}</span>
                                    {isDMView &&
                                      fl.playerDisplayAmount !== undefined &&
                                      fl.playerDisplayAmount !== fl.amount && (
                                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-600">
                                          ½
                                        </span>
                                      )}
                                  </div>
                                );
                              })}

                            {/* Mini Status Effect Icons floating directly above token */}
                            {combatant.statusEffects && combatant.statusEffects.length > 0 && (
                              <div className="absolute -top-3.5 flex items-center gap-0.5 z-30 pointer-events-none">
                                {combatant.statusEffects.slice(0, 2).map((st) => {
                                  const meta = getStatusEffectMeta(st);
                                  return (
                                    <span
                                      key={st}
                                      title={meta.name}
                                      className="w-3.5 h-3.5 rounded-full bg-slate-950/95 border border-white/40 flex items-center justify-center text-[9px] shadow"
                                    >
                                      {meta.icon}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {/* Potential Target Distance & Selection Indicator */}
                            {targetInfo && combatant.currentHp > 0 && (
                              <div
                                title={`Distancia a ${currentActor?.name}: ${targetInfo.distance.feet} ft (${targetInfo.distance.squares} casillas)`}
                                className={`absolute -top-3.5 z-35 px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold flex items-center gap-0.5 shadow-md pointer-events-none select-none transition-all ${
                                  isSelectedTarget
                                    ? 'bg-cyan-500 text-slate-950 border border-cyan-200 ring-2 ring-cyan-400/60 scale-105'
                                    : isNearestTarget
                                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border border-rose-300 ring-1 ring-rose-400/60 animate-bounce'
                                    : 'bg-red-950/90 text-red-200 border border-red-700/70'
                                }`}
                              >
                                <Crosshair className="w-2.5 h-2.5 shrink-0" />
                                <span>{targetInfo.distance.feet}ft</span>
                                {isNearestTarget && (
                                  <span className="text-[7px] text-amber-200 font-sans font-black ml-0.5 uppercase tracking-tighter">
                                    CERCA
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Circular VTT Token - DEAD CENTER IN CELL */}
                            <div
                              className={`relative w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full p-0.5 transition-all duration-150 group-hover:scale-105 active:scale-95 flex items-center justify-center ${
                                floatingNumbers.some((f) => f.targetId === combatant.id && f.type === 'damage')
                                  ? 'animate-token-shake'
                                  : ''
                              } ${
                                isActiveTurn
                                  ? 'ring-2 ring-[#e5a93c]'
                                  : isCombatantInAoE
                                  ? 'ring-2 ring-[#f87171]'
                                  : hoveredTargetId === combatant.id && targetingSourceId !== combatant.id
                                  ? 'ring-2 ring-[#f87171] scale-110'
                                  : unfoldedCombatantId === combatant.id
                                  ? 'ring-2 ring-[#e5a93c] scale-105'
                                  : isSelectedTarget
                                  ? 'ring-2 ring-[#38bdf8] scale-105'
                                  : isNearestTarget
                                  ? 'ring-2 ring-[#f87171]'
                                  : isPotentialTarget
                                  ? 'ring-1.5 ring-[#f87171]/80'
                                  : combatant.type === 'enemy'
                                  ? 'ring-1.5 ring-[#ef4444]/80'
                                  : 'ring-1.5 ring-[#38bdf8]/80'
                              } ${combatant.currentHp <= 0 ? 'opacity-40 grayscale' : ''}`}
                            >
                              {/* Pulsing targeting reticle dashed border for potential targets */}
                              {isPotentialTarget && combatant.currentHp > 0 && (
                                <div
                                  className={`absolute -inset-1 rounded-full pointer-events-none transition-all ${
                                    isSelectedTarget
                                      ? 'border-2 border-[#38bdf8] border-dashed'
                                      : isNearestTarget
                                      ? 'border-2 border-[#f87171] border-dotted'
                                      : 'border border-[#f87171]/60 border-dashed'
                                  }`}
                                />
                              )}
                              <img
                                src={combatant.avatar}
                                alt={combatant.name}
                                className="w-full h-full rounded-full object-cover bg-slate-950 pointer-events-none"
                              />

                              {/* Skull overlay if defeated */}
                              {combatant.currentHp <= 0 && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                  <Skull className="w-5 h-5 text-red-500" />
                                </div>
                              )}

                              {/* Temp HP Shield Badge if tempHp > 0 */}
                              {combatant.tempHp && combatant.tempHp > 0 ? (
                                <span
                                  title={`Puntos de Vida Temporales: +${combatant.tempHp}`}
                                  className="absolute -top-1.5 -left-1.5 z-35 bg-[#0284c7] text-white font-black text-[7.5px] sm:text-[8px] px-1 py-0.2 rounded-full border border-sky-300 shadow flex items-center gap-0.5"
                                >
                                  <Shield className="w-2 h-2 fill-white" />
                                  <span>+{combatant.tempHp}</span>
                                </span>
                              ) : null}

                              {/* Concentration indicator badge on token if concentrating */}
                              {combatant.isConcentrating && (
                                <span
                                  title={`${combatant.name} está concentrado/a en un hechizo`}
                                  className="absolute -top-2 -right-1 z-35 bg-[#251f14] text-[#e5a93c] font-mono text-[7px] font-black px-1.5 py-0.2 rounded-full border border-[#5c441c] shadow flex items-center gap-0.5"
                                >
                                  <span>🧘 Conc.</span>
                                </span>
                              )}

                              {/* Resistance indicator badge on token: ONLY if isDMView or friendly player */}
                              {(isDMView || combatant.type === 'player') && combatant.damageResistances && combatant.damageResistances.length > 0 && (
                                <span
                                  title={`Resistencias: ${combatant.damageResistances.join(', ')}`}
                                  className="absolute -bottom-1 -left-1 z-35 bg-[#171922] text-[#e5a93c] font-mono text-[7px] px-1 rounded-full border border-[#3b3220] shadow"
                                >
                                  🛡️½
                                </span>
                              )}

                              {/* Quick ATACAR button directly on token (only if canInteract) */}
                              {canInteract && !targetingSourceId && !isAoEMode && combatant.currentHp > 0 && (isDMView || combatant.type === 'player') && (
                                <button
                                  onClick={(e) => startTargeting(combatant, e)}
                                  title="ATACAR (apuntar flecha hacia el objetivo)"
                                  className="absolute -bottom-1 -right-1 p-1 bg-[#e5a93c] hover:bg-[#d97706] text-[#0d0e12] rounded-full shadow border border-[#171922] transition-colors flex items-center justify-center cursor-pointer z-30"
                                >
                                  <Swords className="w-2.5 h-2.5 text-[#0d0e12]" />
                                </button>
                              )}
                            </div>

                            {/* Active Turn Floating Crown Tag */}
                            {isActiveTurn && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40 bg-[#e5a93c] text-[#0d0e12] font-black text-[7.5px] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider flex items-center gap-0.5 pointer-events-none whitespace-nowrap shadow">
                                <Sparkles className="w-2.5 h-2.5 text-[#0d0e12]" />
                                <span>TURNO</span>
                              </div>
                            )}

                            {/* Mini Name Label & Health Status: Absolutely positioned at bottom so it DOES NOT disturb vertical centering */}
                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none">
                              <div className="px-1 py-0 rounded bg-[#10121a] border border-[#232737] max-w-[50px] sm:max-w-[56px] text-[7.5px] sm:text-[8px] font-bold text-slate-200 truncate text-center shadow">
                                {combatant.name.split(' ')[0]}
                              </div>
                              {/* Mini Health Bar representation - Solo visible para el DM o para el propio jugador asignado */}
                              {(() => {
                                const canSeeHpBar = isDMView || Boolean(activePlayerId && combatant.id === activePlayerId);
                                if (!canSeeHpBar) return null;

                                const { current: safeCurrent, max: safeMax, percent: hpPercent } = getSafeHpValues(
                                  combatant.currentHp,
                                  combatant.maxHp
                                );

                                return (
                                  <div
                                    className="w-9 sm:w-11 h-1.5 mt-0.5 bg-[#090b10] rounded-full overflow-hidden border border-[#232737]"
                                    title={`Salud: ${safeCurrent} / ${safeMax} (${hpPercent}%)`}
                                  >
                                    <div
                                      className={`h-full transition-all duration-300 ${
                                        hpPercent > 50
                                          ? 'bg-[#10b981]'
                                          : hpPercent > 25
                                          ? 'bg-[#e5a93c]'
                                          : 'bg-[#ef4444]'
                                      }`}
                                      style={{ width: `${hpPercent}%` }}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
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

      {/* RIGHT-SIDE TURN ADVANCE ARROW (Visible en tablet/desktop al lado derecho del mapa VTT) */}
      {onAdvanceTurn && (
        <aside
          className="hidden sm:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex-col items-center pointer-events-auto select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              onAdvanceTurn();
            }}
            title="Pasar al Siguiente Turno en el combate"
            aria-label="Pasar Turno"
            className="group flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-2xl bg-[#0e1017]/95 hover:bg-[#181a26] border border-purple-500/30 hover:border-purple-400 shadow-[0_8px_32px_rgba(0,0,0,0.85)] hover:shadow-[0_0_28px_rgba(168,85,247,0.45)] backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer text-slate-200 hover:text-white ring-1 ring-white/5 hover:ring-purple-500/30"
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 font-bold hidden sm:block">
              Turno
            </span>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-950/70 group-hover:bg-purple-600 border border-purple-500/40 flex items-center justify-center transition-all group-hover:scale-110 shadow-inner">
              <ChevronRight className="w-6 h-6 text-purple-200 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
            </div>
            <span className="text-[9px] font-mono text-slate-400 group-hover:text-purple-200 font-medium hidden sm:block">
              Pasar ➔
            </span>
          </button>
        </aside>
      )}

      {/* UNFOLDED TOKEN OPTIONS PANEL (Sleek Obsidian Floating Card in viewport) */}
      {unfoldedCombatant && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-3xl max-h-[85vh] overflow-y-auto p-3 sm:p-4 bg-[#0e1017]/98 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.95)] ring-1 ring-white/10 animate-fade-in flex flex-col md:flex-row items-center justify-between gap-3"
        >
          {/* Combatant Snapshot Info */}
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <div className="relative shrink-0">
              <img
                src={unfoldedCombatant.avatar}
                alt={unfoldedCombatant.name}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 shadow-lg ${
                  unfoldedCombatant.type === 'enemy' ? 'border-red-500/80 ring-2 ring-red-950/60' : 'border-purple-400 ring-2 ring-purple-950/60'
                }`}
              />
              <span
                className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold uppercase border shadow font-mono ${
                  unfoldedCombatant.type === 'enemy'
                    ? 'bg-red-950 text-red-300 border-red-700/60'
                    : 'bg-purple-950 text-purple-300 border-purple-700/60'
                }`}
              >
                {unfoldedCombatant.type === 'enemy' ? 'Enemigo' : 'Héroe'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                  {unfoldedCombatant.name}
                </h3>
                {unfoldedCombatant.id === activePlayerId && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow shrink-0">
                    <span>🌟 Tu Ficha</span>
                  </span>
                )}
                {unfoldedCombatant.isConcentrating && (
                  <span className="text-[10px] font-bold text-amber-300 bg-purple-950/90 px-2 py-0.5 rounded border border-purple-500/60 shadow flex items-center gap-1 animate-pulse shrink-0">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Concentración</span>
                  </span>
                )}
                {unfoldedCombatant.tempHp && unfoldedCombatant.tempHp > 0 ? (
                  <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-600/60 shrink-0 flex items-center gap-1">
                    <Shield className="w-3 h-3 fill-cyan-400" />
                    +{unfoldedCombatant.tempHp} Temp
                  </span>
                ) : null}
                {(isDMView || unfoldedCombatant.type === 'player') && unfoldedCombatant.damageResistances && unfoldedCombatant.damageResistances.length > 0 && (
                  <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-600/50 shrink-0">
                    🛡️ Resiste: {unfoldedCombatant.damageResistances.join(', ')}
                  </span>
                )}
                {unfoldedCombatant.gridPosition && (
                  <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-400 bg-[#161822] px-2 py-0.5 rounded border border-slate-700/50 shrink-0">
                    Casilla: {COL_LABELS[unfoldedCombatant.gridPosition.col]}{unfoldedCombatant.gridPosition.row + 1}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                {unfoldedCombatant.jobClass} • Nivel {unfoldedCombatant.level || 1}
              </div>

              {/* HP Display */}
              {(() => {
                const { current: safeCurrent, max: safeMax, percent: hpPercent } = getSafeHpValues(
                  unfoldedCombatant.currentHp,
                  unfoldedCombatant.maxHp
                );

                const isOwnToken = Boolean(activePlayerId && unfoldedCombatant.id === activePlayerId);
                const canSeeExactHp = isDMView || isOwnToken;

                if (canSeeExactHp) {
                  return (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                        <Heart className="w-3.5 h-3.5 fill-red-500" />
                        <span>
                          {safeCurrent} / {safeMax} HP ({hpPercent}%)
                        </span>
                      </div>
                      <div className="w-28 sm:w-36 h-2 bg-[#090a0f] rounded-full overflow-hidden border border-slate-700">
                        <div
                          className={`h-full transition-all duration-300 ${
                            hpPercent > 50
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : hpPercent > 25
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                          }`}
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                }

                // Enemy or other token in player view: show ONLY condition label without any HP bar
                const hs = getHealthStatus(
                  safeCurrent,
                  safeMax
                );
                return (
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${hs.badgeBg}`}
                    >
                      <Heart className="w-3 h-3" />
                      {hs.label}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Salud: <strong className="text-amber-400 font-mono">??? / ???</strong>
                    </span>
                  </div>
                );
              })()}

              {/* Botón Pasar Turno directamente abajo del estado del personaje en la mini barra de acción */}
              {onAdvanceTurn && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playMenuBlip();
                      onAdvanceTurn();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#181926] hover:bg-purple-900/60 text-purple-200 hover:text-white border border-purple-500/30 hover:border-purple-400 shadow-sm transition-all cursor-pointer active:scale-95"
                    title="Pasar al siguiente turno en la iniciativa"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pasar Turno</span>
                  </button>
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
            {/* Quick-select Nearest Enemy inside Unfolded Menu */}
            {nearestEnemyTarget && (
              <button
                type="button"
                onClick={handleSelectNearestEnemy}
                className="px-3 py-2 bg-gradient-to-r from-rose-950 via-red-950 to-rose-900 hover:from-rose-900 hover:to-red-800 border border-rose-500/50 text-rose-200 hover:text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-all cursor-pointer ring-1 ring-rose-500/30"
                title={`Fijar como objetivo al enemigo más cercano (${nearestEnemyTarget.name})`}
              >
                <Crosshair className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Enemigo más cercano ({nearestEnemyDistance?.feet} ft)</span>
              </button>
            )}

            {/* 1. ATACAR: Despliega la flecha estilo Hearthstone */}
            <button
              onClick={(e) => startTargeting(unfoldedCombatant, e)}
              disabled={!canInteract}
              className={`px-4 py-2 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all uppercase tracking-wider ${
                canInteract
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-red-950/80 ring-1 ring-red-400/60 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-[#181922] text-slate-500 cursor-not-allowed opacity-60'
              }`}
              title={canInteract ? 'ATACAR: Haz clic para desplegar la flecha y seleccionar tu objetivo' : permCheck.reason}
            >
              <Swords className="w-4 h-4 text-amber-200" />
              <span>ATACAR</span>
            </button>

            {/* 2. Aplicar Daño / Curación / HP Temp (+ / -) */}
            <button
              onClick={() => {
                const actor = combatants.find((c) => c.id === activePlayerId) || combatants[0];
                if (onInitiateAction) onInitiateAction(actor, unfoldedCombatant);
                setUnfoldedCombatantId(null);
              }}
              className="px-3 py-2 bg-[#1b1922] hover:bg-[#251f2f] border border-purple-500/30 text-purple-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 fill-red-400" />
              <span>Contador (+/-)</span>
            </button>

            {/* 3. Botón de Concentración (D&D 5e) */}
            <button
              onClick={() => handleToggleConcentration(unfoldedCombatant)}
              className={`px-3 py-2 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-all cursor-pointer border ${
                unfoldedCombatant.isConcentrating
                  ? 'bg-purple-900/80 text-amber-200 border-amber-400 ring-1 ring-amber-400/50 shadow-purple-950/80 scale-105'
                  : 'bg-[#161822] hover:bg-[#1f2230] text-slate-300 border-slate-700/60'
              }`}
              title="Alternar estado de Concentración en un hechizo (D&D 5e)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Concentración</span>
              {unfoldedCombatant.isConcentrating && (
                <span className="text-[9px] px-1 bg-amber-400 text-slate-950 font-black rounded-full">
                  ✓
                </span>
              )}
            </button>

            {/* 4. Estados Alterados */}
            {onOpenStatusPicker && (
              <button
                onClick={() => {
                  onOpenStatusPicker(unfoldedCombatant);
                  setUnfoldedCombatantId(null);
                }}
                className="px-3 py-2 bg-[#171626] hover:bg-[#201e36] border border-purple-500/40 text-purple-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Estados</span>
              </button>
            )}

            {/* 5. Ficha de Personaje */}
            {onOpenCard && (isDMView || unfoldedCombatant.id === activePlayerId) && (
              <button
                onClick={() => {
                  onOpenCard(unfoldedCombatant);
                  setUnfoldedCombatantId(null);
                }}
                className="px-3 py-2 bg-[#161822] hover:bg-[#202330] text-slate-200 font-medium rounded-xl text-xs sm:text-sm flex items-center gap-1.5 border border-slate-700/60 shadow transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Ver Ficha</span>
              </button>
            )}

            {/* 6. Pasar Turno también en fila de botones de acción */}
            {onAdvanceTurn && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playMenuBlip();
                  onAdvanceTurn();
                }}
                className="px-3 py-2 bg-[#1e1d2c] hover:bg-purple-900/60 text-purple-200 hover:text-white border border-purple-500/40 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow transition-colors cursor-pointer active:scale-95"
                title="Pasar al siguiente turno en la iniciativa"
              >
                <span>Pasar Turno</span>
                <ChevronRight className="w-4 h-4 text-purple-300" />
              </button>
            )}

            {/* Close popover */}
            <button
              onClick={() => setUnfoldedCombatantId(null)}
              title="Cerrar opciones"
              className="p-2 bg-[#161822] hover:bg-[#202330] text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer border border-slate-700/40"
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-400">Objetivo seleccionado:</span>
          {(() => {
            const current = combatants.find((c) => c.id === selectedTargetId);
            if (!current) {
              return (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 italic">Ninguno</span>
                  {nearestEnemyTarget && (
                    <button
                      type="button"
                      onClick={handleSelectNearestEnemy}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/50 flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Fijar como objetivo al enemigo más cercano (${nearestEnemyTarget.name})`}
                    >
                      <Crosshair className="w-3 h-3 text-rose-400" />
                      <span>Fijar más cercano ({nearestEnemyDistance?.feet} ft)</span>
                    </button>
                  )}
                </div>
              );
            }
            const dist = currentActor && current.id !== currentActor.id ? getDistanceBetween(currentActor, current) : null;
            return (
              <span className="font-bold text-amber-300 flex items-center gap-1.5 flex-wrap">
                <span>{current.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({current.type === 'enemy' ? 'Enemigo' : 'Aliado'})
                </span>
                {dist && (
                  <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-600/50 flex items-center gap-1">
                    <Crosshair className="w-2.5 h-2.5 text-cyan-400" />
                    <span>{dist.feet} ft ({dist.squares} casillas de {currentActor?.name})</span>
                  </span>
                )}
                {(isDMView || current.type === 'player') && current.damageResistances && current.damageResistances.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono bg-black/40 px-1 rounded">
                    [Resist: {current.damageResistances.join(', ')}]
                  </span>
                )}
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
