import React, { useState } from 'react';
import { Combatant, EncounterState } from '../types/combat.ts';
import { sortCombatantsByInitiative } from '../utils/combatLogic.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  X,
  ArrowUp,
  ArrowDown,
  Dices,
  Check,
  ListOrdered,
  AlertTriangle,
  Plus,
  Minus,
  Sparkles,
  Shield,
  Skull,
  User,
  GripVertical,
  Hand,
} from 'lucide-react';

interface CombatOrderModalProps {
  isOpen: boolean;
  encounter: EncounterState;
  onSaveOrder: (
    newOrder: string[],
    surpriseSide: 'players' | 'enemies' | null,
    updatedInitiatives?: Record<string, number>
  ) => void;
  onClose: () => void;
}

export const CombatOrderModal: React.FC<CombatOrderModalProps> = ({
  isOpen,
  encounter,
  onSaveOrder,
  onClose,
}) => {
  const [orderList, setOrderList] = useState<string[]>(() => {
    // Ensure all combatants are represented in the list
    const existing = encounter.turnOrder.filter((id) =>
      encounter.combatants.some((c) => c.id === id)
    );
    const missing = encounter.combatants
      .map((c) => c.id)
      .filter((id) => !existing.includes(id));
    return [...existing, ...missing];
  });

  const [initiatives, setInitiatives] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    encounter.combatants.forEach((c) => {
      map[c.id] = c.initiative ?? 10;
    });
    return map;
  });

  const [surprise, setSurprise] = useState<'players' | 'enemies' | null>(
    encounter.surpriseSide || null
  );

  const [autoSortOnSave, setAutoSortOnSave] = useState<boolean>(false);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index <= 0) return;
    playMenuBlip();
    const next = [...orderList];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setOrderList(next);
    setIsManualOverride(true);
    setAutoSortOnSave(false);
  };

  const moveDown = (index: number) => {
    if (index >= orderList.length - 1) return;
    playMenuBlip();
    const next = [...orderList];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setOrderList(next);
    setIsManualOverride(true);
    setAutoSortOnSave(false);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...orderList];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderList(next);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsManualOverride(true);
    setAutoSortOnSave(false); // Preserve user's drag override on save
    setNoticeMsg('Orden manual personalizado activo (Se respetará al guardar)');
    setTimeout(() => setNoticeMsg(null), 3500);
    playMenuBlip();
  };

  const sortByInitiative = () => {
    playMenuBlip();
    const sorted = sortCombatantsByInitiative(encounter.combatants, initiatives, orderList);
    setOrderList(sorted);
    setIsManualOverride(false);
    setAutoSortOnSave(true);
    setNoticeMsg('Ordenado automáticamente según las iniciativas');
    setTimeout(() => setNoticeMsg(null), 3500);
  };

  // Helper to roll 1d20 + bonus for enemies only (if DM wants to save time on monsters)
  const rollForEnemiesOnly = () => {
    playMenuBlip();
    const nextInits = { ...initiatives };
    encounter.combatants
      .filter((c) => c.type === 'enemy')
      .forEach((enemy) => {
        const d20 = Math.floor(Math.random() * 20) + 1;
        const bonus = enemy.attackBonus ? Math.floor(enemy.attackBonus / 2) : 0;
        nextInits[enemy.id] = d20 + bonus;
      });
    setInitiatives(nextInits);
    // Sort
    const sorted = sortCombatantsByInitiative(encounter.combatants, nextInits, orderList);
    setOrderList(sorted);
    setIsManualOverride(false);
    setAutoSortOnSave(true);
  };

  const handleAdjustInitiative = (id: string, delta: number) => {
    playMenuBlip();
    setInitiatives((prev) => {
      const current = prev[id] ?? 10;
      return { ...prev, [id]: Math.max(0, current + delta) };
    });
  };

  const handleSave = () => {
    playMenuBlip();
    let finalOrder = [...orderList];
    if (autoSortOnSave) {
      finalOrder = sortCombatantsByInitiative(encounter.combatants, initiatives, orderList);
    }
    onSaveOrder(finalOrder, surprise, initiatives);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-4 sm:p-5 text-slate-100 max-h-[92vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 bg-[#181926] rounded-xl border border-purple-500/30 text-purple-300 shadow-inner">
              <Dices className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-100 font-mono flex items-center gap-2">
                <span>Pedir e Introducir Iniciativas</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600/50">
                  Mesa Presencial
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Introduce manualmente los números sacados por los jugadores y monstruos en los dados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] border border-transparent hover:border-[#282d40] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tools row: Auto-sort & Surprise Round selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#12141f]/90 p-3 rounded-xl border border-[#232635]">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={sortByInitiative}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all active:scale-95 cursor-pointer"
              title="Ordenar automáticamente la secuencia de turnos de mayor a menor valor de iniciativa"
            >
              <ListOrdered className="w-4 h-4 text-indigo-200" />
              <span>Auto-ordenar por Iniciativas (↓)</span>
            </button>

            <button
              type="button"
              onClick={rollForEnemiesOnly}
              className="px-2.5 py-1.5 rounded-lg bg-[#181926] hover:bg-red-950/70 text-red-200 border border-red-800/40 text-xs font-mono font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Tira 1d20 automático solo para los enemigos y deja intactos a los jugadores"
            >
              <Skull className="w-3.5 h-3.5 text-red-400" />
              <span>Tirar Monstruos (1d20)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Sorpresa:</span>
            <select
              value={surprise || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSurprise(val === 'players' || val === 'enemies' ? val : null);
              }}
              className="bg-[#0c0d12] border border-slate-700 text-xs text-amber-300 font-mono font-bold rounded px-2.5 py-1.5 focus:outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value="">Normal (Sin sorpresa)</option>
              <option value="players">Emboscada Jugadores</option>
              <option value="enemies">Emboscada Enemigos</option>
            </select>
          </div>
        </div>

        {/* Notice Banner when Manual Drag Override or Sort applied */}
        {noticeMsg && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-xs font-mono animate-fade-in shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{noticeMsg}</span>
            </div>
            {isManualOverride && (
              <button
                type="button"
                onClick={sortByInitiative}
                className="text-[11px] underline text-purple-300 hover:text-white cursor-pointer ml-2 shrink-0 font-bold"
              >
                Auto-ordenar
              </button>
            )}
          </div>
        )}

        {isManualOverride && !noticeMsg && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Orden manual personalizado activo (puedes arrastrar filas para sobreescribir el orden de turno).</span>
            </div>
            <button
              type="button"
              onClick={sortByInitiative}
              className="text-[11px] underline text-amber-300 hover:text-white cursor-pointer ml-2 shrink-0 font-bold"
            >
              Re-ordenar por iniciativa
            </button>
          </div>
        )}

        {/* Drag instructions prompt */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-purple-400 inline shrink-0" />
            <span>Arrastra cualquier combatiente por el tirador para cambiar su turno manualmente</span>
          </span>
          <span className="text-slate-500">{orderList.length} combatientes</span>
        </div>

        {/* Order List */}
        <div className="flex flex-col gap-2">
          {orderList.map((id, index) => {
            const combatant = encounter.combatants.find((c) => c.id === id);
            if (!combatant) return null;
            const isEnemy = combatant.type === 'enemy';
            const initVal = initiatives[id] ?? 10;
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index && draggedIndex !== index;

            return (
              <div
                key={id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(index));
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedIndex(index);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverIndex === index) {
                    setDragOverIndex(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-xl border gap-2.5 transition-all select-none ${
                  isDragging
                    ? 'opacity-35 scale-[0.98] border-dashed border-purple-400 bg-purple-950/20'
                    : isDragOver
                    ? 'ring-2 ring-purple-400 border-purple-400 bg-purple-900/40 shadow-lg shadow-purple-950/60'
                    : isEnemy
                    ? 'bg-red-950/30 border-red-900/50 hover:border-red-700/60'
                    : 'bg-blue-950/30 border-blue-900/50 hover:border-blue-700/60'
                }`}
              >
                {/* Drag Handle + Combatant Avatar and Identity */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Grip Handle */}
                  <div
                    className="p-1 rounded text-slate-500 hover:text-purple-300 hover:bg-[#1a1c2b] cursor-grab active:cursor-grabbing transition-colors shrink-0"
                    title="Arrastrar para reordenar turno manualmente"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <span className="font-mono text-xs sm:text-sm font-black text-amber-400 w-6 shrink-0 text-center">
                    #{index + 1}
                  </span>
                  <img
                    src={combatant.avatar}
                    alt={combatant.name}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 border ${
                      isEnemy ? 'border-red-400' : 'border-blue-400'
                    }`}
                  />
                  <div className="truncate min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-100 truncate flex items-center gap-1.5">
                      <span>{combatant.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                          isEnemy ? 'bg-red-950 text-red-300' : 'bg-purple-950 text-purple-300'
                        }`}
                      >
                        {isEnemy ? 'Enemigo' : 'Héroe'}
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {combatant.jobClass} {combatant.level ? `• Nivel ${combatant.level}` : ''}
                    </span>
                  </div>
                </div>

                {/* Manual initiative input & Fine-tuning reorder */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                  {/* Manual Initiative Stepper & Field */}
                  <div className="flex items-center gap-1.5 bg-[#090b10] border border-slate-700/80 rounded-xl px-2 py-1 shadow-inner">
                    <span className="text-[11px] text-purple-300 font-mono font-bold">
                      Iniciativa:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustInitiative(id, -1)}
                      className="w-6 h-6 rounded bg-[#181926] hover:bg-[#25283a] text-slate-300 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      title="Restar 1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="99"
                      value={initVal}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setInitiatives((prev) => ({
                          ...prev,
                          [id]: isNaN(val) ? 0 : Math.max(0, val),
                        }));
                      }}
                      className="w-12 bg-transparent text-center font-mono text-sm sm:text-base font-black text-amber-300 focus:outline-none focus:ring-1 focus:ring-purple-400 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdjustInitiative(id, 1)}
                      className="w-6 h-6 rounded bg-[#181926] hover:bg-[#25283a] text-slate-300 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      title="Sumar 1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Manual Reorder Buttons (Accessibility & Touch backup) */}
                  <div className="flex items-center gap-1" title="Ajustar desempate de turno manualmente">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label={`Subir turno de ${combatant.name}`}
                      className="p-1.5 rounded-lg bg-[#141624] hover:bg-purple-900/60 disabled:opacity-25 text-slate-300 transition-colors cursor-pointer"
                      title="Subir de posición en turno"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === orderList.length - 1}
                      aria-label={`Bajar turno de ${combatant.name}`}
                      className="p-1.5 rounded-lg bg-[#141624] hover:bg-purple-900/60 disabled:opacity-25 text-slate-300 transition-colors cursor-pointer"
                      title="Bajar de posición en turno"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-2 pt-3 border-t border-[#232635] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300 select-none">
            <input
              type="checkbox"
              checked={autoSortOnSave}
              onChange={(e) => {
                setAutoSortOnSave(e.target.checked);
                if (e.target.checked) setIsManualOverride(false);
              }}
              className="accent-purple-500 rounded cursor-pointer"
            />
            <span>Forzar auto-orden por iniciativa numérica al guardar</span>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-[#161824] hover:bg-[#202234] text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar y Aplicar Orden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
