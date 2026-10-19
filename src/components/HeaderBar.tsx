import React from 'react';
import {
  Shield,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  Columns,
  Swords,
  Radio,
  Copy,
  Check,
  Edit,
  Users,
  Globe,
} from 'lucide-react';
import { Combatant, EncounterState } from '../types/combat.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';

interface HeaderBarProps {
  currentRole: 'dm' | 'player';
  activePlayerId: string;
  encounter: EncounterState;
  players: Combatant[];
  splitView: boolean;
  activeRoomCode?: string | null;
  onSelectRole: (role: 'dm' | 'player') => void;
  onSelectPlayer: (playerId: string) => void;
  onToggleSplitView: () => void;
  onResetEncounter: () => void;
  onSoundToggle: () => void;
  soundActive: boolean;
  onOpenRoomLobby: () => void;
  onOpenTokenSelect?: () => void;
  onOpenCharacterSheet?: () => void;
  onOpenGlobalEffects?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentRole,
  activePlayerId,
  encounter,
  players,
  splitView,
  activeRoomCode,
  onSelectRole,
  onSelectPlayer,
  onToggleSplitView,
  onResetEncounter,
  onSoundToggle,
  soundActive,
  onOpenRoomLobby,
  onOpenTokenSelect,
  onOpenCharacterSheet,
  onOpenGlobalEffects,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeRoomCode) return;
    playMenuBlip();
    navigator.clipboard.writeText(activeRoomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePlayerCombatant = players.find((p) => p.id === activePlayerId);

  return (
    <header className="bg-[#0b0c10]/95 border-b border-[#232635] backdrop-blur-md sticky top-0 z-40 text-slate-200 shadow-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Encounter Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#161722] border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)] p-0.5 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0e1017] rounded-[10px] flex items-center justify-center">
              <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="font-bold text-sm sm:text-lg tracking-tight text-slate-100 flex items-center gap-1">
                <span>Obsidian</span>
                <span className="hidden sm:inline">Encounter</span>
                <span className="text-purple-400 font-mono text-[10px] sm:text-xs font-semibold">• VTT</span>
              </h1>
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[10px] sm:text-xs font-mono font-bold rounded bg-[#161824] text-purple-300 border border-purple-500/25 shrink-0">
                R.{encounter.round}
              </span>

              {/* Room Badge */}
              <button
                onClick={() => {
                  playMenuBlip();
                  onOpenRoomLobby();
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                  activeRoomCode
                    ? 'bg-[#111815] border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                    : 'bg-[#141520] border-purple-500/30 text-purple-300 hover:border-purple-400'
                }`}
                title="Gestión de sala en tiempo real (Firestore)"
              >
                <Radio className={`w-3 h-3 ${activeRoomCode ? 'text-emerald-400 animate-pulse' : 'text-purple-400'}`} />
                {activeRoomCode ? (
                  <>
                    <span>SALA: {activeRoomCode}</span>
                    <span
                      onClick={handleCopy}
                      className="p-0.5 hover:text-white rounded"
                      title="Copiar código de sala"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </span>
                  </>
                ) : (
                  <span>Sala</span>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-md font-mono hidden xs:block">
              {encounter.title}
            </p>
          </div>
        </div>

        {/* Role Switcher & Player Picker */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <div className="inline-flex rounded-lg bg-[#11131a] border border-[#232635] p-0.5 sm:p-1 shadow-inner">
            <button
              onClick={() => {
                playMenuBlip();
                onSelectRole('dm');
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                currentRole === 'dm'
                  ? 'bg-amber-500/15 text-amber-200 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
              }`}
              aria-label="Cambiar a pantalla de DM"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>DM</span>
              <span className="hidden sm:inline">Screen</span>
            </button>

            <button
              onClick={() => {
                playMenuBlip();
                onSelectRole('player');
              }}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                currentRole === 'player'
                  ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
              }`}
              aria-label="Cambiar a pantalla de Jugador"
            >
              <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Jugador</span>
            </button>
          </div>

          {/* Active Character Selector for Player */}
          {currentRole === 'player' && (
            <div className="flex items-center gap-1.5 bg-[#12131b] border border-[#232635] rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">Ficha:</span>
              {activePlayerCombatant ? (
                <div className="flex items-center gap-1.5">
                  <img
                    src={activePlayerCombatant.avatar}
                    alt={activePlayerCombatant.name}
                    className="w-5 h-5 rounded-full object-cover border border-purple-400"
                  />
                  <span className="text-xs text-purple-200 font-bold max-w-[100px] truncate">
                    {activePlayerCombatant.name}
                  </span>
                </div>
              ) : null}

              {onOpenCharacterSheet && activePlayerCombatant && (
                <button
                  onClick={() => {
                    playMenuBlip();
                    onOpenCharacterSheet();
                  }}
                  className="px-2 py-0.5 rounded bg-[#1b1a2c] hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Editar tus puntos de vida (HP) y resistencias"
                >
                  <Edit className="w-3 h-3 text-purple-400" />
                  <span>Hoja</span>
                </button>
              )}

              {onOpenTokenSelect && (
                <button
                  onClick={() => {
                    playMenuBlip();
                    onOpenTokenSelect();
                  }}
                  className="px-2 py-0.5 rounded bg-[#161822] hover:bg-[#202332] border border-slate-700/60 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Seleccionar o crear ficha de personaje"
                >
                  <Users className="w-3 h-3 text-purple-400" />
                  <span>Fichas</span>
                </button>
              )}
            </div>
          )}

          {/* Utility Tools: Global Effects, Split View, Sound, Reset */}
          <div className="flex items-center gap-1">
            {onOpenGlobalEffects && (
              <button
                onClick={() => {
                  playMenuBlip();
                  onOpenGlobalEffects();
                }}
                title="Efectos Ambientales Globales del Encuentro (Terreno Difícil, Oscuridad, etc.)"
                aria-label="Efectos Ambientales Globales"
                className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer relative ${
                  encounter.activeGlobalEffects && encounter.activeGlobalEffects.length > 0
                    ? 'bg-purple-950/80 border-purple-500/60 text-purple-200 shadow-sm shadow-purple-950/50'
                    : 'bg-[#12131b] border-[#232635] text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
                }`}
              >
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="hidden lg:inline text-[11px]">Efectos Globales</span>
                {encounter.activeGlobalEffects && encounter.activeGlobalEffects.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                    {encounter.activeGlobalEffects.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onToggleSplitView}
              title="Alternar vista dividida (DM y Jugador en paralelo)"
              aria-label="Modo Pantalla Dividida"
              className={`p-2 rounded-lg border text-xs hidden sm:flex items-center gap-1 transition-colors cursor-pointer ${
                splitView
                  ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-sm'
                  : 'bg-[#12131b] border-[#232635] text-slate-400 hover:text-slate-200 hover:bg-[#181a24]'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">Dividir Pantalla</span>
            </button>

            <button
              onClick={onSoundToggle}
              title={soundActive ? 'Silenciar audio' : 'Activar audio retro JRPG'}
              aria-label="Alternar sonido retro"
              className="p-2 rounded-lg bg-[#12131b] border border-[#232635] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              {soundActive ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={() => {
                playMenuBlip();
                onResetEncounter();
              }}
              title="Reiniciar encuentro: 100% HP, tirada de iniciativas y posiciones iniciales"
              aria-label="Reiniciar encuentro"
              className="p-2 rounded-lg bg-[#12131b] border border-[#232635] text-slate-400 hover:text-red-400 hover:border-red-900/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
