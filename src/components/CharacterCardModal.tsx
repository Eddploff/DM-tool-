import React, { useState } from 'react';
import { Combatant, CombatAction } from '../types/combat.ts';
import { PRESET_AVATARS } from '../utils/defaultData.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  X,
  Upload,
  Heart,
  Shield,
  Swords,
  Plus,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';

interface CharacterCardModalProps {
  combatant: Combatant;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Combatant) => void;
  isDM: boolean;
}

export const CharacterCardModal: React.FC<CharacterCardModalProps> = ({
  combatant,
  isOpen,
  onClose,
  onSave,
  isDM,
}) => {
  const [form, setForm] = useState<Combatant>({ ...combatant });
  const [newActionName, setNewActionName] = useState('');
  const [newActionType, setNewActionType] = useState<'attack' | 'heal' | 'spell'>('attack');
  const [newActionDice, setNewActionDice] = useState('1d8+2');
  const [newActionDesc, setNewActionDesc] = useState('');

  if (!isOpen) return null;

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setForm((prev) => ({ ...prev, avatar: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addAction = () => {
    if (!newActionName.trim()) return;
    const action: CombatAction = {
      id: `act-${Date.now()}`,
      name: newActionName.trim(),
      type: newActionType,
      diceFormula: newActionDice.trim() || '1d8',
      description: newActionDesc.trim() || 'Habilidad personalizada',
    };
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, action],
    }));
    setNewActionName('');
    setNewActionDesc('');
  };

  const removeAction = (id: string) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== id),
    }));
  };

  const handleSave = () => {
    playMenuBlip();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-950 border-2 border-indigo-700/80 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-indigo-950">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-amber-200">
              Tarjeta de Personaje: {form.name}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              {form.type === 'enemy' ? 'Monstruo' : 'Héroe'}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {/* Avatar & Token Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative shrink-0">
              <img
                src={form.avatar}
                alt={form.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 bg-slate-950 shadow"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Subir Token / Imagen Personalizada:
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir archivo...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400">
                  (PNG, JPG, SVG o WebP)
                </span>
              </div>

              {/* Preset avatar picker */}
              <div className="mt-2">
                <span className="text-[11px] text-slate-400 mr-2">O elige un preset:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Object.entries(PRESET_AVATARS).map(([key, svgUrl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, avatar: svgUrl }))}
                      className="p-1 rounded-full border border-slate-700 hover:border-amber-400 bg-slate-950 transition-colors"
                      title={key}
                    >
                      <img src={svgUrl} alt={key} className="w-6 h-6 rounded-full" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Basic Stats Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Nombre del Personaje:
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Clase / Rol / Tipo:
              </label>
              <input
                type="text"
                value={form.jobClass}
                onChange={(e) => setForm({ ...form, jobClass: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Nivel:
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={form.level || 1}
                onChange={(e) => setForm({ ...form, level: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Vitals Form */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                HP Actual:
              </label>
              <input
                type="number"
                min="0"
                max={form.maxHp}
                value={form.currentHp}
                onChange={(e) =>
                  setForm({ ...form, currentHp: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                HP Máximo:
              </label>
              <input
                type="number"
                min="1"
                max="9999"
                value={form.maxHp}
                onChange={(e) =>
                  setForm({ ...form, maxHp: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                CA (Defensa):
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={form.armorClass}
                onChange={(e) =>
                  setForm({ ...form, armorClass: parseInt(e.target.value, 10) || 10 })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Bono Ataque (+):
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={form.attackBonus}
                onChange={(e) =>
                  setForm({ ...form, attackBonus: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Actions & Skills Management */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Habilidades y Ataques ({form.actions.length}):
            </label>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {form.actions.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200 mr-2">{act.name}</span>
                    <span className="font-mono text-amber-400 mr-2">({act.diceFormula})</span>
                    <span className="text-[10px] text-slate-400 capitalize">[{act.type}]</span>
                  </div>
                  <button
                    onClick={() => removeAction(act.id)}
                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800"
                    title="Eliminar habilidad"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add action row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <input
                type="text"
                placeholder="Nombre (ej. Espadazo)"
                value={newActionName}
                onChange={(e) => setNewActionName(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white flex-1 min-w-[120px]"
              />
              <select
                value={newActionType}
                onChange={(e) => setNewActionType(e.target.value as 'attack' | 'heal' | 'spell')}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="attack">Ataque Físico</option>
                <option value="spell">Magia / Hechizo</option>
                <option value="heal">Curación / Sanación</option>
              </select>
              <input
                type="text"
                placeholder="Dados (ej. 2d6+3)"
                value={newActionDice}
                onChange={(e) => setNewActionDice(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-400 font-mono w-24"
              />
              <button
                type="button"
                onClick={addAction}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-indigo-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Tarjeta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
