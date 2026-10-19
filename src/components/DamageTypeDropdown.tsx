import React, { useState, useRef, useEffect } from 'react';
import {
  DamageType,
  PHYSICAL_DAMAGE_TYPES,
  MAGICAL_DAMAGE_TYPES,
  getDamageTypeMeta,
} from '../types/combat.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { ChevronDown, Sparkles, Swords, Check } from 'lucide-react';

interface DamageTypeDropdownProps {
  value: DamageType;
  onChange: (val: DamageType) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export const DamageTypeDropdown: React.FC<DamageTypeDropdownProps> = ({
  value,
  onChange,
  label = 'Tipo de Daño:',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMeta = getDamageTypeMeta(value);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (key: DamageType) => {
    playMenuBlip();
    onChange(key);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <div className="flex items-center justify-between mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          <span>{label}</span>
          <span className="text-[10px] text-amber-400 font-normal">
            {selectedMeta.category === 'physical' ? '⚔️ Físico' : '✨ Mágico / Elemental'}
          </span>
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          playMenuBlip();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2.5 rounded-xl border transition-all text-left font-bold ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2.5 text-sm'
        } ${
          selectedMeta.category === 'physical'
            ? 'bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/60 border-amber-500/80 text-amber-100 hover:border-amber-400 shadow-md ring-1 ring-amber-500/30'
            : 'bg-gradient-to-r from-purple-950/80 via-slate-900 to-cyan-950/60 border-cyan-500/80 text-cyan-100 hover:border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg shrink-0">{selectedMeta.icon}</span>
          <div className="truncate">
            <span className="text-white font-extrabold tracking-wide">
              {selectedMeta.name}
            </span>
            <span className="ml-1.5 text-[10px] font-mono opacity-75">
              [{selectedMeta.category === 'physical' ? 'Físico' : 'Mágico'}]
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-300' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl bg-slate-950 border-2 border-indigo-700/80 shadow-2xl p-2 text-slate-100 backdrop-blur-md animate-fade-in divide-y divide-slate-800">
          {/* SECTION 1: DAÑOS FÍSICOS */}
          <div className="pb-2">
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Swords className="w-3 h-3 text-amber-400" />
              <span>Tipos de Daño Físico (3)</span>
            </div>
            <div className="flex flex-col gap-1 mt-0.5">
              {PHYSICAL_DAMAGE_TYPES.map((dt) => {
                const isSelected = dt.key === value;
                return (
                  <button
                    key={dt.key}
                    type="button"
                    onClick={() => handleSelect(dt.key)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-950/90 text-amber-100 border border-amber-500/80 font-bold'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{dt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{dt.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {dt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: DAÑOS MÁGICOS Y ELEMENTALES */}
          <div className="pt-2">
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Tipos de Daño Mágico y Elemental (10)</span>
            </div>
            <div className="flex flex-col gap-1 mt-0.5">
              {MAGICAL_DAMAGE_TYPES.map((dt) => {
                const isSelected = dt.key === value;
                return (
                  <button
                    key={dt.key}
                    type="button"
                    onClick={() => handleSelect(dt.key)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-purple-950/90 text-cyan-100 border border-cyan-500/80 font-bold'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{dt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{dt.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {dt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
