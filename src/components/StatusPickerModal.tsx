import React, { useState } from 'react';
import { Combatant } from '../types/combat.ts';
import {
  STATUS_EFFECTS_CATALOG,
  toggleStatusEffect,
  addStatusEffect,
} from '../utils/statusEffects.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  X,
  Sparkles,
  Check,
  Plus,
  Shield,
  Skull,
} from 'lucide-react';

interface StatusPickerModalProps {
  isOpen: boolean;
  actorName: string;
  target: Combatant;
  isDM: boolean;
  onSaveStatuses: (targetId: string, updatedStatuses: string[], notes: string) => void;
  onClose: () => void;
}

export const StatusPickerModal: React.FC<StatusPickerModalProps> = ({
  isOpen,
  actorName,
  target,
  isDM,
  onSaveStatuses,
  onClose,
}) => {
  const [currentStatuses, setCurrentStatuses] = useState<string[]>([...target.statusEffects]);
  const [customStatusName, setCustomStatusName] = useState<string>('');

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    playMenuBlip();
    const normalized = key.trim().toLowerCase();
    if (currentStatuses.includes(normalized)) {
      setCurrentStatuses(currentStatuses.filter((s) => s !== normalized));
    } else {
      setCurrentStatuses([...currentStatuses, normalized]);
    }
  };

  const handleAddCustom = () => {
    if (!customStatusName.trim()) return;
    playMenuBlip();
    const clean = customStatusName.trim().toLowerCase();
    if (!currentStatuses.includes(clean)) {
      setCurrentStatuses([...currentStatuses, clean]);
    }
    setCustomStatusName('');
  };

  const handleSave = () => {
    playMenuBlip();
    const added = currentStatuses.filter((s) => !target.statusEffects.includes(s));
    const removed = target.statusEffects.filter((s) => !currentStatuses.includes(s));
    let summary = '';
    if (added.length > 0) summary += `Agregó [${added.join(', ')}] `;
    if (removed.length > 0) summary += `Quitó [${removed.join(', ')}]`;

    onSaveStatuses(target.id, currentStatuses, summary.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-950 border-2 border-indigo-600/80 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-indigo-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/40">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-indigo-200">
                Asignar Estados Alterados
              </h3>
              <p className="text-xs text-slate-400">
                Objetivo: <strong className="text-white">{target.name}</strong> ({target.type === 'enemy' ? 'Enemigo' : 'Aliado'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal de estados"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target summary chip */}
        <div className="flex items-center gap-3 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <img
            src={target.avatar}
            alt={target.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/80 bg-slate-950 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>{target.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {target.jobClass}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Estados activos actuales: {currentStatuses.length > 0 ? (
                <span className="text-amber-300 font-semibold">{currentStatuses.join(', ')}</span>
              ) : (
                <span className="text-slate-500 italic">Ninguno</span>
              )}
            </div>
          </div>
        </div>

        {/* Preset altered states selection grid */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Catálogo de Estados (Haz clic para activar / desactivar):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(STATUS_EFFECTS_CATALOG).map(([key, meta]) => {
              const isActive = currentStatuses.includes(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleToggle(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 select-none ${
                    isActive
                      ? `${meta.badgeBg} ${meta.borderColor} ring-2 ring-indigo-400/60 shadow-md`
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                        {meta.name}
                      </span>
                      {isActive && (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                      {meta.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom status input */}
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-300">
            Añadir Estado Personalizado de la Mesa:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ej: Derribado, Asustado, Enredado..."
              value={customStatusName}
              onChange={(e) => setCustomStatusName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 pt-3 border-t border-indigo-950 flex justify-end gap-2">
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
            <span>Guardar Estados Alterados</span>
          </button>
        </div>
      </div>
    </div>
  );
};
