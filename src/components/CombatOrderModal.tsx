import React, { useState } from 'react';
import { Combatant, EncounterState } from '../types/combat.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  X,
  ArrowUp,
  ArrowDown,
  Dices,
  Check,
  ListOrdered,
  AlertTriangle,
} from 'lucide-react';

interface CombatOrderModalProps {
  isOpen: boolean;
  encounter: EncounterState;
  onSaveOrder: (newOrder: string[], surpriseSide: 'players' | 'enemies' | null) => void;
  onClose: () => void;
}

export const CombatOrderModal: React.FC<CombatOrderModalProps> = ({
  isOpen,
  encounter,
  onSaveOrder,
  onClose,
}) => {
  const [orderList, setOrderList] = useState<string[]>(() => {
    // Ensure all combatants are represented
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

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index <= 0) return;
    playMenuBlip();
    const next = [...orderList];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setOrderList(next);
  };

  const moveDown = (index: number) => {
    if (index >= orderList.length - 1) return;
    playMenuBlip();
    const next = [...orderList];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setOrderList(next);
  };

  const sortByInitiative = () => {
    playMenuBlip();
    const sorted = [...orderList].sort((a, b) => {
      const initA = initiatives[a] ?? 0;
      const initB = initiatives[b] ?? 0;
      return initB - initA;
    });
    setOrderList(sorted);
  };

  const handleSave = () => {
    playMenuBlip();
    onSaveOrder(orderList, surprise);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-950 border-2 border-amber-500/80 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 rounded-lg border border-amber-500/40">
              <ListOrdered className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-amber-200">
                Configurar Orden de Combate / Iniciativa
              </h3>
              <p className="text-xs text-slate-400">
                Define el turno de cada participante según las tiradas presenciales de la mesa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tools row: Auto-sort & Surprise Round selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <button
            onClick={sortByInitiative}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Ordenar por Iniciativa (Mayor a menor)</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ronda Sorpresa:</span>
            <select
              value={surprise || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSurprise(val === 'players' || val === 'enemies' ? val : null);
              }}
              className="bg-slate-950 border border-slate-700 text-xs text-amber-300 rounded px-2 py-1"
            >
              <option value="">Normal (Sin sorpresa)</option>
              <option value="players">Emboscada de Jugadores</option>
              <option value="enemies">Emboscada de Enemigos</option>
            </select>
          </div>
        </div>

        {/* Order List */}
        <div className="flex flex-col gap-2">
          {orderList.map((id, index) => {
            const combatant = encounter.combatants.find((c) => c.id === id);
            if (!combatant) return null;
            const isEnemy = combatant.type === 'enemy';

            return (
              <div
                key={id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isEnemy
                    ? 'bg-red-950/40 border-red-900/60'
                    : 'bg-blue-950/40 border-blue-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-amber-400 w-6">
                    #{index + 1}
                  </span>
                  <img
                    src={combatant.avatar}
                    alt={combatant.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-600"
                  />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                      {combatant.name}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {combatant.jobClass} • {isEnemy ? 'Enemigo' : 'Jugador'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Manual initiative input */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                      Inic:
                    </span>
                    <input
                      type="number"
                      value={initiatives[id] ?? 10}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setInitiatives((prev) => ({ ...prev, [id]: val }));
                      }}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center font-mono font-bold text-amber-300"
                    />
                  </div>

                  {/* Reorder buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label={`Subir turno de ${combatant.name}`}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === orderList.length - 1}
                      aria-label={`Bajar turno de ${combatant.name}`}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-2 pt-3 border-t border-amber-900/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Orden de Combate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
