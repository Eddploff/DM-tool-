import React from 'react';
import {
  Shield,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  Columns,
  ExternalLink,
  Swords,
  Sparkles,
} from 'lucide-react';
import { Combatant, EncounterState } from '../types/combat.ts';
import { isSoundEnabled, setSoundEnabled, playMenuBlip } from '../utils/soundEffects.ts';

interface HeaderBarProps {
  currentRole: 'dm' | 'player';
  activePlayerId: string;
  encounter: EncounterState;
  players: Combatant[];
  splitView: boolean;
  onSelectRole: (role: 'dm' | 'player') => void;
  onSelectPlayer: (playerId: string) => void;
  onToggleSplitView: () => void;
  onResetEncounter: () => void;
  onSoundToggle: () => void;
  soundActive: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentRole,
  activePlayerId,
  encounter,
  players,
  splitView,
  onSelectRole,
  onSelectPlayer,
  onToggleSplitView,
  onResetEncounter,
  onSoundToggle,
  soundActive,
}) => {
  return (
    <header className="bg-slate-950/90 border-b border-indigo-900/60 backdrop-blur-md sticky top-0 z-40 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Encounter Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-amber-500 p-0.5 shadow-md shadow-blue-900/40 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Swords className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-wide bg-gradient-to-r from-amber-200 via-yellow-100 to-blue-200 bg-clip-text text-transparent">
                JRPG Encounter &amp; DM Tracker
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-950/80 text-blue-300 border border-blue-800">
                Ronda {encounter.round}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[240px] sm:max-w-md">
              {encounter.title}
            </p>
          </div>
        </div>

        {/* Role Switcher & Player Picker */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-1 shadow-inner">
            <button
              onClick={() => {
                playMenuBlip();
                onSelectRole('dm');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentRole === 'dm'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              aria-label="Cambiar a pantalla de DM"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Pantalla DM</span>
            </button>

            <button
              onClick={() => {
                playMenuBlip();
                onSelectRole('player');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                currentRole === 'player'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              aria-label="Cambiar a pantalla de Jugador"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>Vista Jugador</span>
            </button>
          </div>

          {/* Active Character Selector for Player */}
          {currentRole === 'player' && players.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-400 hidden sm:inline">Tu Personaje:</span>
              <select
                value={activePlayerId}
                onChange={(e) => {
                  playMenuBlip();
                  onSelectPlayer(e.target.value);
                }}
                className="bg-transparent text-xs text-blue-200 font-semibold focus:outline-none cursor-pointer py-0.5"
                aria-label="Seleccionar personaje activo"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Utility Tools: Split View, Sound, Reset, New Tab */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSplitView}
              title="Alternar vista dividida (DM y Jugador en paralelo)"
              aria-label="Modo Pantalla Dividida"
              className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                splitView
                  ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Dividir Pantalla</span>
            </button>

            <button
              onClick={onSoundToggle}
              title={soundActive ? 'Silenciar audio' : 'Activar audio retro JRPG'}
              aria-label="Alternar sonido retro"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {soundActive ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={() => {
                if (window.confirm('¿Deseas reiniciar el encuentro y restaurar los datos por defecto?')) {
                  onResetEncounter();
                }
              }}
              title="Reiniciar encuentro a valores iniciales"
              aria-label="Reiniciar encuentro"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900/50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
