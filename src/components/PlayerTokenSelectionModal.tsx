import React, { useState } from 'react';
import {
  Combatant,
  DamageType,
  RoomClaimInfo,
  PHYSICAL_DAMAGE_TYPES,
  MAGICAL_DAMAGE_TYPES,
} from '../types/combat.ts';
import { PRESET_AVATARS } from '../utils/defaultData.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  User,
  Users,
  Plus,
  Shield,
  Heart,
  Check,
  Lock,
  Edit,
  Sparkles,
  X,
  Upload,
} from 'lucide-react';

interface PlayerTokenSelectionModalProps {
  isOpen: boolean;
  combatants: Combatant[];
  claimedTokens?: Record<string, RoomClaimInfo>;
  playerId: string;
  playerName: string;
  activePlayerId: string;
  onSelectToken: (combatantId: string) => Promise<void>;
  onCreateAndClaimToken: (newCombatant: Combatant) => Promise<void>;
  onOpenCharacterSheet: (combatant: Combatant) => void;
  onClose: () => void;
}

export const PlayerTokenSelectionModal: React.FC<PlayerTokenSelectionModalProps> = ({
  isOpen,
  combatants,
  claimedTokens = {},
  playerId,
  playerName,
  activePlayerId,
  onSelectToken,
  onCreateAndClaimToken,
  onOpenCharacterSheet,
  onClose,
}) => {
  const [tab, setTab] = useState<'existing' | 'create'>('existing');

  // New character form state
  const [name, setName] = useState('');
  const [jobClass, setJobClass] = useState('Guerrero');
  const [level, setLevel] = useState(1);
  const [hp, setHp] = useState(60);
  const [attackBonus, setAttackBonus] = useState(5);
  const [avatar, setAvatar] = useState(PRESET_AVATARS.paladin || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=150&h=150&fit=crop&crop=face');
  const [selectedResistances, setSelectedResistances] = useState<DamageType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const playerTokens = combatants.filter((c) => c.type === 'player');

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

  const toggleResistance = (type: DamageType) => {
    playMenuBlip();
    setSelectedResistances((prev) =>
      prev.includes(type) ? prev.filter((r) => r !== type) : [...prev, type]
    );
  };

  const handleSelectExisting = async (combatantId: string) => {
    playMenuBlip();
    try {
      setIsSubmitting(true);
      await onSelectToken(combatantId);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al seleccionar la ficha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Por favor ingresa un nombre para tu personaje.');
      return;
    }

    const newCombatant: Combatant = {
      id: `player-custom-${Date.now()}`,
      name: name.trim(),
      type: 'player',
      avatar,
      currentHp: hp,
      maxHp: hp,
      tempHp: 0,
      attackBonus,
      jobClass: jobClass.trim() || 'Aventurero',
      level,
      actions: [
        {
          id: `act-${Date.now()}-1`,
          name: 'Ataque con Arma',
          type: 'attack',
          diceFormula: '1d8+3',
          damageType: 'cortante',
          description: 'Ataque principal de tu personaje',
        },
      ],
      statusEffects: [],
      damageResistances: selectedResistances,
      notes: `Personaje creado por ${playerName || 'Jugador'}`,
      gridPosition: { col: 10, row: 2 + (playerTokens.length % 5) },
    };

    try {
      setIsSubmitting(true);
      await onCreateAndClaimToken(newCombatant);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear la ficha en Firestore');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#181926] border border-purple-500/30 shadow flex items-center justify-center">
              <User className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-100">
                Selecciona tu Ficha de Personaje
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Solo 1 ficha por jugador • Con tu ficha seleccionada podrás editar tu hoja (HP y resistencias)
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

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-950/60 border border-red-700/60 rounded-xl text-red-200 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Tab switch */}
        <div className="mt-4 grid grid-cols-2 p-1 bg-[#10121a] border border-[#232635] rounded-xl">
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setTab('existing');
            }}
            className={`py-2 text-xs font-mono font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tab === 'existing'
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Elegir Token Existente ({playerTokens.length})</span>
          </button>

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
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Crear Nueva Ficha</span>
          </button>
        </div>

        {/* TAB 1: EXISTING TOKENS */}
        {tab === 'existing' && (
          <div className="mt-4 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300">
              Fichas de héroe disponibles en la partida:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playerTokens.map((hero) => {
                const claim = claimedTokens[hero.id];
                const isClaimedByMe = claim && claim.playerId === playerId;
                const isClaimedByOther = claim && claim.playerId !== playerId;
                const isSelected = hero.id === activePlayerId;

                return (
                  <div
                    key={hero.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      isClaimedByMe || isSelected
                        ? 'bg-blue-950/70 border-blue-400 ring-2 ring-blue-500/50'
                        : isClaimedByOther
                        ? 'bg-slate-900/30 border-slate-800 opacity-60'
                        : 'bg-slate-900/80 border-slate-800 hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={hero.avatar}
                        alt={hero.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 bg-slate-950 shrink-0"
                      />
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-100 truncate">
                            {hero.name}
                          </h4>
                          {isClaimedByMe && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500">
                              Tu Ficha
                            </span>
                          )}
                          {isClaimedByOther && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-400 bg-slate-950 border border-slate-700 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              {claim.playerName}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {hero.jobClass} • Nivel {hero.level || 1}
                        </div>

                        {/* HP info (Solo visible si no está reclamado por otro jugador) */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-emerald-500" />
                            {isClaimedByOther ? 'Salud: Privada (Jugador)' : `${hero.currentHp} / ${hero.maxHp} HP`}
                          </span>
                        </div>

                        {/* Resistances */}
                        {hero.damageResistances && hero.damageResistances.length > 0 && (
                          <div className="text-[10px] text-amber-300 mt-1 truncate">
                            🛡️ Resiste: {hero.damageResistances.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                      {isClaimedByOther ? (
                        <div className="w-full text-center py-1.5 text-xs text-slate-500 italic">
                          Ocupado por otro jugador
                        </div>
                      ) : isClaimedByMe ? (
                        <div className="flex items-center gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              playMenuBlip();
                              onOpenCharacterSheet(hero);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-600 text-indigo-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar Hoja (HP &amp; Resistencias)</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSelectExisting(hero.id)}
                          className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Seleccionar este Personaje</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CREATE NEW CHARACTER TOKEN */}
        {tab === 'create' && (
          <form onSubmit={handleCreateNew} className="mt-4 flex flex-col gap-4">
            {/* Avatar & Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <img
                src={avatar}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 bg-slate-950 shadow shrink-0"
              />
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Avatar del Token:
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir imagen...</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">o elige uno abajo:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(PRESET_AVATARS).map(([role, svgUrl]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setAvatar(svgUrl)}
                      className="p-1 rounded-full border border-slate-700 hover:border-amber-400 bg-slate-950 transition-colors"
                      title={role}
                    >
                      <img src={svgUrl} alt={role} className="w-6 h-6 rounded-full" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Inputs: Name, Job, Level, HP (NO CA!) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de tu Personaje:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  placeholder="Ej. Kaelen Sombrablanquecina"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Clase / Rol:
                </label>
                <input
                  type="text"
                  value={jobClass}
                  onChange={(e) => setJobClass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  placeholder="Ej. Pícaro, Guerrero, Mago"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Puntos de Vida (HP):
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={hp}
                  onChange={(e) => setHp(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-900 border border-emerald-700 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Resistencias al Daño (13 Tipos) */}
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Resistencias de Daño (Recibe la mitad del daño):</span>
              </label>
              <span className="text-[11px] text-slate-400 block mb-2">
                Selecciona los tipos de daño a los que tu personaje es resistente:
              </span>

              {/* Físico */}
              <div className="mb-2">
                <span className="text-[10px] uppercase font-bold text-amber-400">
                  ⚔️ Daños Físicos:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {PHYSICAL_DAMAGE_TYPES.map((dt) => {
                    const isChecked = selectedResistances.includes(dt.key);
                    return (
                      <button
                        key={dt.key}
                        type="button"
                        onClick={() => toggleResistance(dt.key)}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-all ${
                          isChecked
                            ? 'bg-amber-950 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {dt.icon} {dt.name} {isChecked && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mágico y Elemental */}
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400">
                  ✨ Daños Mágicos y Elementales:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MAGICAL_DAMAGE_TYPES.map((dt) => {
                    const isChecked = selectedResistances.includes(dt.key);
                    return (
                      <button
                        key={dt.key}
                        type="button"
                        onClick={() => toggleResistance(dt.key)}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-all ${
                          isChecked
                            ? 'bg-blue-950 border-blue-500 text-blue-200 ring-1 ring-blue-500/50'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {dt.icon} {dt.name} {isChecked && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/60 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creando Ficha...' : 'Crear y Reclamar mi Personaje (1 por jugador)'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
