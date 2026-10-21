import React, { useState } from 'react';
import { Combatant, CombatAction, DamageType, CombatantResource } from '../types/combat.ts';
import { PRESET_AVATARS } from '../utils/defaultData.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { DeathSavesWidget } from './DeathSavesWidget.tsx';
import {
  X,
  Upload,
  Heart,
  Shield,
  Swords,
  Plus,
  Minus,
  Trash2,
  Check,
  Sparkles,
  RotateCcw,
  Zap,
  Layers,
  CircleDot,
} from 'lucide-react';

interface CharacterCardModalProps {
  combatant: Combatant;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Combatant) => void;
  isDM: boolean;
}

const RESOURCE_PRESETS: Array<{
  name: string;
  max: number;
  category: 'spell' | 'class' | 'item' | 'other';
  color: string;
  icon: string;
}> = [
  { name: 'Espacios Hechizo Niv. 1', max: 4, category: 'spell', color: '#38bdf8', icon: '🔮' },
  { name: 'Espacios Hechizo Niv. 2', max: 3, category: 'spell', color: '#818cf8', icon: '🔮' },
  { name: 'Espacios Hechizo Niv. 3', max: 2, category: 'spell', color: '#c084fc', icon: '🔮' },
  { name: 'Puntos de Ki', max: 5, category: 'class', color: '#facc15', icon: '☯️' },
  { name: 'Flechas / Munición', max: 20, category: 'item', color: '#4ade80', icon: '🏹' },
  { name: 'Furia Bárbara', max: 3, category: 'class', color: '#ef4444', icon: '🩸' },
  { name: 'Dados Superioridad', max: 4, category: 'class', color: '#fb923c', icon: '🎲' },
  { name: 'Imposición de Manos', max: 25, category: 'class', color: '#fbbf24', icon: '✨' },
];

export const CharacterCardModal: React.FC<CharacterCardModalProps> = ({
  combatant,
  isOpen,
  onClose,
  onSave,
  isDM,
}) => {
  const [form, setForm] = useState<Combatant>({
    ...combatant,
    resources: combatant.resources ? [...combatant.resources] : [],
  });
  const [newActionName, setNewActionName] = useState('');
  const [newActionType, setNewActionType] = useState<'attack' | 'heal' | 'spell'>('attack');
  const [newActionDice, setNewActionDice] = useState('1d8+2');
  const [newActionDesc, setNewActionDesc] = useState('');

  // New Resource pool form state
  const [newResName, setNewResName] = useState('');
  const [newResMax, setNewResMax] = useState<number>(4);
  const [newResCategory, setNewResCategory] = useState<'spell' | 'class' | 'item' | 'other'>('spell');
  const [newResColor, setNewResColor] = useState<string>('#38bdf8');

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

  // Resource Pool helpers
  const handleAddResource = (
    name: string,
    max: number,
    category: 'spell' | 'class' | 'item' | 'other' = 'spell',
    color: string = '#38bdf8'
  ) => {
    if (!name.trim()) return;
    playMenuBlip();
    const safeMax = Math.max(1, max || 1);
    const newRes: CombatantResource = {
      id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      current: safeMax,
      max: safeMax,
      category,
      color,
    };
    setForm((prev) => ({
      ...prev,
      resources: [...(prev.resources || []), newRes],
    }));
    setNewResName('');
  };

  const handleRemoveResource = (id: string) => {
    playMenuBlip();
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).filter((r) => r.id !== id),
    }));
  };

  const handleResourceDelta = (id: string, delta: number) => {
    playMenuBlip();
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          current: Math.max(0, Math.min(r.max, r.current + delta)),
        };
      }),
    }));
  };

  const handleResourceCurrentChange = (id: string, val: number) => {
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          current: Math.max(0, Math.min(r.max, isNaN(val) ? 0 : val)),
        };
      }),
    }));
  };

  const handleResourceMaxChange = (id: string, val: number) => {
    const safeMax = Math.max(1, isNaN(val) ? 1 : val);
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          max: safeMax,
          current: Math.min(r.current, safeMax),
        };
      }),
    }));
  };

  const handleReplenishAllResources = () => {
    playMenuBlip();
    setForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).map((r) => ({
        ...r,
        current: r.max,
      })),
    }));
  };

  const handleSave = () => {
    playMenuBlip();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0e1017]/95 border border-purple-500/30 rounded-2xl shadow-2xl p-5 text-slate-200 max-h-[90vh] overflow-y-auto ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100 font-mono">
              Tarjeta de Personaje: {form.name}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-[#161824] text-purple-300 border border-purple-500/30">
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
              <label className="block text-xs text-cyan-300 font-medium mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>HP Temporal:</span>
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={form.tempHp || 0}
                onChange={(e) =>
                  setForm({ ...form, tempHp: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                title="Puntos de vida temporales que absorben daño antes de reducir el HP actual"
                className="w-full bg-slate-900 border border-cyan-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
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

          {/* Death Saves (Salvaciones de Muerte) */}
          {(form.currentHp === 0 ||
            (form.deathSaves &&
              ((form.deathSaves.successes || 0) > 0 ||
                (form.deathSaves.failures || 0) > 0 ||
                form.deathSaves.isStable))) && (
            <div className="bg-slate-900/60 p-3 rounded-xl border border-rose-900/50">
              <div className="text-xs font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                <span>💀 Salvaciones contra la Muerte (Personaje a 0 HP)</span>
              </div>
              <DeathSavesWidget
                combatant={form}
                onUpdateCombatant={(updated) => setForm(updated)}
                isDM={true}
              />
            </div>
          )}

          {/* Resistencias a Daño (Mitad de daño efectivo) */}
          <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Resistencias de Daño (Recibe solo la mitad del daño):</span>
              </label>
              <span className="text-[10px] text-amber-400">Regla D&D 5e</span>
            </div>

            {/* Daños Físicos */}
            <div className="mb-2">
              <span className="text-[10px] font-bold uppercase text-amber-400">⚔️ Daños Físicos:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  { key: 'contundente', label: '🔨 Contundente' },
                  { key: 'cortante', label: '⚔️ Cortante' },
                  { key: 'perforante', label: '🏹 Perforante' },
                ].map((item) => {
                  const isChecked = form.damageResistances?.includes(item.key as DamageType);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        playMenuBlip();
                        const current = form.damageResistances || [];
                        const next = current.includes(item.key as DamageType)
                          ? current.filter((r) => r !== item.key)
                          : [...current, item.key as DamageType];
                        setForm({ ...form, damageResistances: next });
                      }}
                      className={`px-2 py-1 rounded text-xs font-bold border transition-all ${
                        isChecked
                          ? 'bg-amber-950 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label} {isChecked && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daños Mágicos y Elementales */}
            <div>
              <span className="text-[10px] font-bold uppercase text-cyan-400">🔮 Daños Mágicos y Elementales:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  { key: 'acido', label: '🧪 Ácido' },
                  { key: 'frio', label: '❄️ Frío' },
                  { key: 'fuego', label: '🔥 Fuego' },
                  { key: 'fuerza', label: '🌀 Fuerza' },
                  { key: 'rayo', label: '⚡ Rayo' },
                  { key: 'trueno', label: '📢 Trueno' },
                  { key: 'necrotico', label: '💀 Necrótico' },
                  { key: 'psiquico', label: '🧠 Psíquico' },
                  { key: 'radiante', label: '☀️ Radiante' },
                  { key: 'veneno', label: '☠️ Veneno' },
                ].map((item) => {
                  const isChecked = form.damageResistances?.includes(item.key as DamageType);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        playMenuBlip();
                        const current = form.damageResistances || [];
                        const next = current.includes(item.key as DamageType)
                          ? current.filter((r) => r !== item.key)
                          : [...current, item.key as DamageType];
                        setForm({ ...form, damageResistances: next });
                      }}
                      className={`px-2 py-1 rounded text-xs font-bold border transition-all ${
                        isChecked
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label} {isChecked && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resources & Replenishable Pools (Spell Slots, Ki Points, Ammunition, etc.) */}
          <div className="bg-[#10121d]/90 p-3.5 rounded-xl border border-indigo-500/30 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#232635]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                    <span>Recursos Gastables &amp; Espacios (Pools)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-600/40 font-mono">
                      {(form.resources || []).length} pools
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Rastrea pools reabastecibles como espacios de conjuro, puntos de ki, furia o munición.
                  </p>
                </div>
              </div>

              {(form.resources && form.resources.length > 0) && (
                <button
                  type="button"
                  onClick={handleReplenishAllResources}
                  className="px-2.5 py-1 rounded-lg bg-[#181a28] hover:bg-emerald-950/70 border border-emerald-600/40 hover:border-emerald-500 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                  title="Restablece todos los recursos al máximo (Descanso Largo / Long Rest)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Descanso Largo (Recargar Todo)</span>
                </button>
              )}
            </div>

            {/* Existing Resources List */}
            {(!form.resources || form.resources.length === 0) ? (
              <div className="text-center py-3 px-2 bg-slate-950/40 rounded-lg border border-dashed border-slate-800 text-xs text-slate-400 font-mono">
                No hay pools de recursos registrados para este combatiente. Puedes añadir uno abajo o hacer clic en un preset rápido:
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {form.resources.map((res) => {
                  const percent = res.max > 0 ? Math.round((res.current / res.max) * 100) : 0;
                  const resColor = res.color || '#38bdf8';

                  return (
                    <div
                      key={res.id}
                      className="bg-[#0b0d14] p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2"
                      style={{ borderLeftWidth: '4px', borderLeftColor: resColor }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Resource Label & Category */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wide shrink-0"
                            style={{
                              backgroundColor: `${resColor}20`,
                              color: resColor,
                              border: `1px solid ${resColor}50`,
                            }}
                          >
                            {res.category === 'spell'
                              ? '🔮 Magia'
                              : res.category === 'class'
                              ? '⚔️ Clase'
                              : res.category === 'item'
                              ? '🏹 Objeto'
                              : '✨ Recurso'}
                          </span>
                          <span className="font-bold text-xs text-slate-100 truncate">
                            {res.name}
                          </span>
                        </div>

                        {/* Counter Controls */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResourceDelta(res.id, -1)}
                            disabled={res.current <= 0}
                            className="w-6 h-6 rounded bg-[#161824] hover:bg-slate-800 disabled:opacity-30 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Gastar 1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5">
                            <input
                              type="number"
                              min="0"
                              max={res.max}
                              value={res.current}
                              onChange={(e) =>
                                handleResourceCurrentChange(res.id, parseInt(e.target.value, 10))
                              }
                              className="w-9 text-center bg-transparent font-mono font-bold text-xs focus:outline-none"
                              style={{ color: resColor }}
                            />
                            <span className="text-slate-500 font-mono text-xs">/</span>
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={res.max}
                              onChange={(e) =>
                                handleResourceMaxChange(res.id, parseInt(e.target.value, 10))
                              }
                              className="w-9 text-center bg-transparent font-mono text-slate-400 text-xs focus:outline-none"
                              title="Máximo de este pool"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleResourceDelta(res.id, 1)}
                            disabled={res.current >= res.max}
                            className="w-6 h-6 rounded bg-[#161824] hover:bg-slate-800 disabled:opacity-30 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                            title="Recuperar 1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {res.current < res.max && (
                            <button
                              type="button"
                              onClick={() => {
                                playMenuBlip();
                                handleResourceCurrentChange(res.id, res.max);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 transition-colors"
                              title="Rellenar pool al máximo"
                            >
                              Max
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveResource(res.id)}
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors ml-1"
                            title="Eliminar este recurso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Visual Pips or Progress Bar */}
                      {res.max <= 12 ? (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {Array.from({ length: res.max }).map((_, pipIdx) => {
                            const isFilled = pipIdx < res.current;
                            return (
                              <button
                                key={pipIdx}
                                type="button"
                                onClick={() => {
                                  playMenuBlip();
                                  if (res.current === pipIdx + 1) {
                                    handleResourceCurrentChange(res.id, pipIdx);
                                  } else {
                                    handleResourceCurrentChange(res.id, pipIdx + 1);
                                  }
                                }}
                                className="w-4 h-4 rounded-full border transition-all cursor-pointer flex items-center justify-center active:scale-90"
                                style={{
                                  backgroundColor: isFilled ? resColor : 'transparent',
                                  borderColor: isFilled ? resColor : '#475569',
                                  boxShadow: isFilled ? `0 0 6px ${resColor}80` : 'none',
                                }}
                                title={
                                  isFilled
                                    ? `Espacio #${pipIdx + 1} disponible (clic para gastar)`
                                    : `Espacio #${pipIdx + 1} agotado (clic para recargar)`
                                }
                              />
                            );
                          })}
                          <span className="text-[10px] font-mono text-slate-400 ml-1">
                            {res.current} de {res.max} disponibles
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: resColor,
                                boxShadow: `0 0 8px ${resColor}60`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {percent}% ({res.current}/{res.max})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Presets Row */}
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block mb-1">
                ⚡ Presets Rápidos D&amp;D 5e:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RESOURCE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleAddResource(preset.name, preset.max, preset.category, preset.color)}
                    className="px-2 py-1 rounded-lg bg-[#141724] hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-500/60 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title={`Añadir ${preset.name} (${preset.max}/${preset.max})`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                    <span className="text-[10px] text-indigo-300 font-bold">({preset.max})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Resource Row */}
            <div className="pt-2 border-t border-[#232635] flex flex-wrap items-center gap-2 bg-[#090b10] p-2.5 rounded-xl border border-slate-800">
              <input
                type="text"
                placeholder="Nombre del pool (ej. Puntos de Hechicería, Flechas +1)"
                value={newResName}
                onChange={(e) => setNewResName(e.target.value)}
                className="bg-[#121420] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1 min-w-[140px]"
              />

              <select
                value={newResCategory}
                onChange={(e) =>
                  setNewResCategory(e.target.value as 'spell' | 'class' | 'item' | 'other')
                }
                className="bg-[#121420] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 cursor-pointer"
              >
                <option value="spell">🔮 Hechizo / Magia</option>
                <option value="class">⚔️ Rasgo de Clase / Ki / Furia</option>
                <option value="item">🏹 Munición / Objeto</option>
                <option value="other">✨ Otro Pool</option>
              </select>

              <div className="flex items-center gap-1 bg-[#121420] border border-slate-700 rounded-lg px-2 py-1">
                <span className="text-[10px] text-slate-400 font-mono">Max:</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={newResMax}
                  onChange={(e) => setNewResMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="bg-transparent font-mono text-xs text-white w-12 text-center focus:outline-none"
                />
              </div>

              {/* Color picker swatches */}
              <div className="flex items-center gap-1 bg-[#121420] border border-slate-700 rounded-lg px-1.5 py-1">
                {[
                  { color: '#38bdf8', label: 'Azul' },
                  { color: '#818cf8', label: 'Índigo' },
                  { color: '#c084fc', label: 'Púrpura' },
                  { color: '#facc15', label: 'Dorado' },
                  { color: '#4ade80', label: 'Verde' },
                  { color: '#f87171', label: 'Rojo' },
                ].map((swatch) => (
                  <button
                    key={swatch.color}
                    type="button"
                    onClick={() => setNewResColor(swatch.color)}
                    className={`w-3.5 h-3.5 rounded-full transition-transform ${
                      newResColor === swatch.color ? 'ring-2 ring-white scale-125' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: swatch.color }}
                    title={swatch.label}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddResource(newResName, newResMax, newResCategory, newResColor)}
                disabled={!newResName.trim()}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Pool</span>
              </button>
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
