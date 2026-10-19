import React, { useState } from 'react';
import { RoomData } from '../types/combat.ts';
import { generateRoomCode } from '../utils/syncManager.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  Users,
  Shield,
  User,
  KeyRound,
  Copy,
  Check,
  DoorOpen,
  LogOut,
  Sparkles,
  X,
  Radio,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface RoomLobbyModalProps {
  isOpen: boolean;
  activeRoom: RoomData | null;
  currentRole: 'dm' | 'player';
  playerName: string;
  onClose: () => void;
  onCreateRoom: (code: string) => Promise<void>;
  onJoinRoom: (code: string, nickname: string) => Promise<void>;
  onLeaveRoom: () => void;
  onPlayLocal: () => void;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  activeRoom,
  currentRole,
  playerName,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onPlayLocal,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [createCode, setCreateCode] = useState(() => generateRoomCode());
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState(playerName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    playMenuBlip();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = createCode.toUpperCase().trim();
    if (!code || code.length < 4 || code.length > 10) {
      setErrorMsg('El código debe tener entre 4 y 10 caracteres alfanuméricos.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onCreateRoom(code);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear la sala en Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = joinCode.toUpperCase().trim();
    if (!code) {
      setErrorMsg('Por favor ingresa un código de sala.');
      return;
    }
    const cleanNick = nickname.trim() || 'Jugador';

    try {
      setIsSubmitting(true);
      await onJoinRoom(code, cleanNick);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo encontrar la sala en Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e1017]/95 border border-purple-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-200 max-h-[95vh] overflow-y-auto ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#181926] border border-purple-500/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-100">
                Salas de Partida Multijugador
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Sincronización en tiempo real con Firestore
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

        {/* If user is ALREADY inside a room */}
        {activeRoom ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="bg-[#12141e]/90 border border-purple-500/30 rounded-xl p-4 shadow-inner">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] uppercase font-mono font-bold text-purple-300">
                    Estás conectado a la sala:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-3xl font-black text-purple-200 tracking-widest">
                      {activeRoom.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(activeRoom.code)}
                      className="px-2.5 py-1 rounded-lg bg-[#181926] hover:bg-purple-900/60 text-purple-200 text-xs font-mono font-bold flex items-center gap-1 transition-all border border-purple-500/30 active:scale-95 cursor-pointer"
                      title="Copiar código para compartir"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-purple-300" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block">
                    Tu rol actual
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold border mt-0.5 ${
                      currentRole === 'dm'
                        ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                        : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                    }`}
                  >
                    {currentRole === 'dm' ? (
                      <>
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dungeon Master (DM)</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>Jugador</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Claimed Tokens in this room */}
              <div className="mt-3 pt-3 border-t border-[#232635]">
                <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Fichas reclamadas en esta partida:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeRoom.claimedTokens && Object.keys(activeRoom.claimedTokens).length > 0 ? (
                    Object.entries(activeRoom.claimedTokens).map(([cId, claim]) => {
                      const combatant = activeRoom.encounter.combatants.find((c) => c.id === cId);
                      return (
                        <div
                          key={cId}
                          className="flex items-center gap-2 bg-[#0d0f17] border border-[#232635] rounded-lg px-2.5 py-1 text-xs font-mono"
                        >
                          {combatant && (
                            <img
                              src={combatant.avatar}
                              alt={combatant.name}
                              className="w-5 h-5 rounded-full object-cover border border-purple-400"
                            />
                          )}
                          <span className="font-bold text-purple-200">
                            {combatant ? combatant.name : cId}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({claim.playerName})
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs font-mono text-slate-500 italic">
                      Aún no hay fichas reclamadas por jugadores.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  playMenuBlip();
                  onLeaveRoom();
                }}
                className="px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-700/60 text-red-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Salir de la Sala</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-mono font-bold transition-all shadow-md cursor-pointer"
              >
                Volver a la Mesa
              </button>
            </div>
          </div>
        ) : (
          /* User is NOT yet in a room: Create or Join */
          <div className="mt-4 flex flex-col gap-4">
            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 bg-[#10121a] border border-[#232635] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  setTab('create');
                }}
                className={`py-2 text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tab === 'create'
                    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Crear Sala (DM)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  setTab('join');
                }}
                className={`py-2 text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  tab === 'join'
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>Unirse con Código</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-700/60 rounded-xl text-red-200 text-xs font-mono flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB: CREAR SALA (DM) */}
            {tab === 'create' && (
              <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
                <div className="bg-[#12141e]/90 p-3.5 rounded-xl border border-[#232635]">
                  <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                    Código de Sala Generado:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={createCode}
                      onChange={(e) =>
                        setCreateCode(
                          e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                        )
                      }
                      maxLength={10}
                      className="flex-1 bg-[#0b0c10] border border-[#2b2f42] rounded-xl px-3 py-2 text-base sm:text-lg font-mono font-black text-amber-300 tracking-wider text-center focus:outline-none focus:border-amber-400"
                      placeholder="DRAGON"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setCreateCode(generateRoomCode())}
                      className="px-3 py-2 bg-[#171926] hover:bg-[#222538] text-slate-200 rounded-xl text-xs font-mono font-semibold border border-[#282d40] transition-colors cursor-pointer"
                      title="Generar otro código"
                    >
                      Aleatorio
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 mt-2">
                    Comparte este código con tus jugadores para que puedan unirse y sincronizar su combate en vivo.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-mono font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creando Sala...' : 'Generar Sala y Comenzar como DM'}</span>
                </button>
              </form>
            )}

            {/* TAB: UNIRSE A SALA (JUGADOR) */}
            {tab === 'join' && (
              <form onSubmit={handleJoin} className="flex flex-col gap-3.5">
                <div className="bg-[#12141e]/90 p-3.5 rounded-xl border border-[#232635] flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                      Código de la Sala:
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) =>
                        setJoinCode(
                          e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                        )
                      }
                      maxLength={10}
                      className="w-full bg-[#0b0c10] border border-[#2b2f42] rounded-xl px-3 py-2 text-base sm:text-lg font-mono font-black text-purple-200 tracking-wider text-center focus:outline-none focus:border-purple-400"
                      placeholder="Ingresa el código (ej. DRAGON)"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-slate-300 mb-1">
                      Tu Nombre / Apodo de Jugador:
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-[#2b2f42] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                      placeholder="Ej. Lucas, Elena, Jugador 1"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-mono font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{isSubmitting ? 'Conectando...' : 'Unirse a la Partida'}</span>
                </button>
              </form>
            )}

            {/* Offline Local Option */}
            <div className="pt-2 border-t border-[#232635] text-center">
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  onPlayLocal();
                  onClose();
                }}
                className="text-xs font-mono text-slate-400 hover:text-purple-300 underline transition-colors cursor-pointer"
              >
                O jugar localmente sin sala en este navegador
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
