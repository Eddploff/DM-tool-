import React, { useState } from 'react';
import { Combatant, CombatAction } from '../types/combat.ts';
import { PRESET_AVATARS } from '../utils/defaultData.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { X, Plus, Upload, Skull, Sparkles, Check } from 'lucide-react';

interface AddEnemyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEnemy: (enemy: Combatant) => void;
}

interface PresetMonsterTemplate {
  name: string;
  jobClass: string;
  avatar: string;
  hp: number;
  armorClass: number;
  attackBonus: number;
  level: number;
  actions: CombatAction[];
}

const MONSTER_PRESETS: PresetMonsterTemplate[] = [
  {
    name: 'Gran Behemoth',
    jobClass: 'Bestia Alfa Legendaria',
    avatar: PRESET_AVATARS.behemoth,
    hp: 160,
    armorClass: 15,
    attackBonus: 7,
    level: 8,
    actions: [
      {
        id: 'p-b1',
        name: 'Zarpazo Desgarrador',
        type: 'attack',
        diceFormula: '2d8+5',
        description: 'Zarpas titánicas que desgarran defensas.',
      },
      {
        id: 'p-b2',
        name: 'Meteo Menor',
        type: 'attack',
        diceFormula: '2d10+4',
        description: 'Lluvia ígnea devastadora.',
      },
    ],
  },
  {
    name: 'Goblin Emboscador',
    jobClass: 'Hostigador Salvaje',
    avatar: PRESET_AVATARS.goblin,
    hp: 35,
    armorClass: 13,
    attackBonus: 4,
    level: 4,
    actions: [
      {
        id: 'p-g1',
        name: 'Daga Oxidada',
        type: 'attack',
        diceFormula: '1d6+2',
        description: 'Apuñalamiento veloz.',
      },
    ],
  },
  {
    name: 'Dragón Carmesí',
    jobClass: 'Sierpe de Fuego Ancestral',
    avatar: PRESET_AVATARS.redDragon,
    hp: 210,
    armorClass: 17,
    attackBonus: 8,
    level: 10,
    actions: [
      {
        id: 'p-d1',
        name: 'Aliento Ígneo (Inferno)',
        type: 'attack',
        diceFormula: '3d8+6',
        description: 'Llamarada calcinante que cubre el campo.',
      },
      {
        id: 'p-d2',
        name: 'Mordisco Dracónico',
        type: 'attack',
        diceFormula: '2d10+5',
        description: 'Mandíbulas de acero y colmillos llameantes.',
      },
    ],
  },
  {
    name: 'Hechicero Oscuro',
    jobClass: 'Nigromante del Vacío',
    avatar: PRESET_AVATARS.darkSorcerer,
    hp: 65,
    armorClass: 13,
    attackBonus: 6,
    level: 7,
    actions: [
      {
        id: 'p-s1',
        name: 'Fulgor Sombrío',
        type: 'attack',
        diceFormula: '3d6+4',
        description: 'Rayo tenebroso que carcome la vitalidad.',
      },
      {
        id: 'p-s2',
        name: 'Drenaje Vital',
        type: 'attack',
        diceFormula: '2d6+3',
        description: 'Roba energía vital del adversario.',
      },
    ],
  },
];

export const AddEnemyModal: React.FC<AddEnemyModalProps> = ({
  isOpen,
  onClose,
  onAddEnemy,
}) => {
  const [name, setName] = useState('Nuevo Monstruo');
  const [jobClass, setJobClass] = useState('Bestia de Combate');
  const [hp, setHp] = useState(80);
  const [armorClass, setArmorClass] = useState(14);
  const [attackBonus, setAttackBonus] = useState(5);
  const [level, setLevel] = useState(6);
  const [avatar, setAvatar] = useState(PRESET_AVATARS.behemoth);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const applyPreset = (preset: PresetMonsterTemplate) => {
    playMenuBlip();
    setName(preset.name);
    setJobClass(preset.jobClass);
    setAvatar(preset.avatar);
    setHp(preset.hp);
    setArmorClass(preset.armorClass);
    setAttackBonus(preset.attackBonus);
    setLevel(preset.level);
  };

  const handleAdd = () => {
    playMenuBlip();
    const newEnemy: Combatant = {
      id: `enemy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || 'Monstruo Salvaje',
      type: 'enemy',
      avatar,
      currentHp: hp,
      maxHp: hp,
      armorClass,
      attackBonus,
      jobClass: jobClass.trim() || 'Enemigo',
      level,
      actions: [
        {
          id: `act-${Date.now()}-1`,
          name: 'Ataque Salvaje',
          type: 'attack',
          diceFormula: '1d8+3',
          description: 'Golpe agresivo contra el objetivo.',
        },
      ],
      statusEffects: [],
    };

    onAddEnemy(newEnemy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-950 border-2 border-red-800/80 rounded-2xl shadow-2xl p-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-red-950">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-950 rounded-lg border border-red-800">
              <Skull className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-red-300">
                Añadir Token de Enemigo al Combate
              </h3>
              <p className="text-xs text-slate-400">
                Crea un monstruo o elige un clásico de JRPG
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

        {/* Quick Presets Carousel */}
        <div className="mt-4">
          <span className="block text-xs font-semibold text-slate-300 mb-2">
            Plantillas JRPG Rápidas:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MONSTER_PRESETS.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => applyPreset(m)}
                className="bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-600 rounded-xl p-2.5 flex flex-col items-center text-center transition-all group"
              >
                <img
                  src={m.avatar}
                  alt={m.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-700 group-hover:border-red-400 mb-1.5"
                />
                <span className="text-xs font-bold text-slate-200 group-hover:text-red-300 leading-tight">
                  {m.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {m.hp} HP • CA {m.armorClass}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Form */}
        <div className="mt-4 flex flex-col gap-3.5 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={avatar}
              alt="Token actual"
              className="w-16 h-16 rounded-full object-cover border-2 border-red-500 bg-slate-950 shrink-0"
            />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Token / Imagen del Monstruo:
              </label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Token Propio...</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Nombre del Enemigo:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Rol / Subtipo:
              </label>
              <input
                type="text"
                value={jobClass}
                onChange={(e) => setJobClass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Puntos de Vida (HP):
              </label>
              <input
                type="number"
                min="1"
                max="9999"
                value={hp}
                onChange={(e) => setHp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-red-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Defensa / CA:
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={armorClass}
                onChange={(e) => setArmorClass(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">
                Bono de Ataque (+):
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={attackBonus}
                onChange={(e) => setAttackBonus(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-red-950 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Invocar al Combate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
