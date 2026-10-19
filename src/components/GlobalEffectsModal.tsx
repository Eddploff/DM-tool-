import React from 'react';
import { GlobalEffectId } from '../types/combat.ts';
import {
  GLOBAL_ENVIRONMENTAL_EFFECTS,
  calculateNetGlobalModifiers,
} from '../utils/environmentalEffects.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import { Sparkles, Globe, X, Check, ShieldAlert, Trash2 } from 'lucide-react';

interface GlobalEffectsModalProps {
  isOpen: boolean;
  activeEffects: GlobalEffectId[];
  isDM: boolean;
  onToggleEffect: (effectId: GlobalEffectId) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export const GlobalEffectsModal: React.FC<GlobalEffectsModalProps> = ({
  isOpen,
  activeEffects,
  isDM,
  onToggleEffect,
  onClearAll,
  onClose,
}) => {
  if (!isOpen) return null;

  const netMods = calculateNetGlobalModifiers(activeEffects);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-5 text-slate-100 max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181926] rounded-xl border border-purple-500/30 text-purple-300">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-100 font-mono flex items-center gap-2">
                <span>Efectos Ambientales Globales del Encuentro</span>
                {activeEffects.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                    {activeEffects.length} activos
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {isDM
                  ? 'Activa o desactiva condiciones que aplican bonos o penalizaciones pasivas a todos los combatientes.'
                  : 'Condiciones de campo activas que modifican tiradas, velocidad y elementos mágicos.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playMenuBlip();
              onClose();
            }}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181a26] border border-transparent hover:border-[#282d40] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Net Modifiers Summary Banner if any are active */}
        {activeEffects.length > 0 ? (
          <div className="p-3 rounded-xl bg-[#141624] border border-purple-500/30 flex flex-col gap-1.5 font-mono text-xs">
            <div className="flex items-center justify-between font-bold text-purple-300">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                Resumen de Modificadores Pasivos Aplicados:
              </span>
              {isDM && (
                <button
                  type="button"
                  onClick={() => {
                    playMenuBlip();
                    onClearAll();
                  }}
                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Desactivar Todos
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-300 mt-1">
              {netMods.movementPenalty && (
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/50 text-amber-200">
                  🏔️ Movimiento a la mitad (Terreno Difícil)
                </span>
              )}
              {netMods.netAttackBonusDelta !== 0 && (
                <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-600/50 text-purple-200">
                  ⚔️ {netMods.netAttackBonusDelta > 0 ? `+${netMods.netAttackBonusDelta}` : netMods.netAttackBonusDelta} a todas las tiradas de ataque
                </span>
              )}
              {netMods.healBonus > 0 && (
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/50 text-emerald-200">
                  ☀️ +{netMods.healBonus} HP extra a todas las curaciones
                </span>
              )}
              {Object.entries(netMods.damageMultipliers).map(([dmg, mult]) => (
                <span
                  key={dmg}
                  className="px-2 py-0.5 rounded bg-[#1b1c2b] border border-slate-700 text-slate-200 capitalize"
                >
                  ✨ {dmg}: {mult}x daño
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#10121a] border border-[#232635] text-xs font-mono text-slate-400 italic text-center">
            Ningún efecto ambiental activo en este momento. El campo de batalla se encuentra en condiciones estándar.
          </div>
        )}

        {/* Global Environmental Effects Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {GLOBAL_ENVIRONMENTAL_EFFECTS.map((eff) => {
            const isActive = activeEffects.includes(eff.id);
            return (
              <div
                key={eff.id}
                onClick={() => {
                  if (isDM) {
                    playMenuBlip();
                    onToggleEffect(eff.id);
                  }
                }}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isDM ? 'cursor-pointer select-none active:scale-[0.99]' : ''
                } ${
                  isActive
                    ? 'bg-[#161828] border-purple-500/60 ring-1 ring-purple-500/40 shadow-md'
                    : 'bg-[#11131c] border-[#232635] hover:border-[#35394e]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label={eff.name}>
                        {eff.icon}
                      </span>
                      <h4 className="font-bold text-sm text-slate-100 font-mono">
                        {eff.name}
                      </h4>
                    </div>

                    {/* Active Switch Indicator */}
                    {isDM ? (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white border-purple-400 shadow'
                            : 'bg-[#181a26] text-slate-400 border-slate-700'
                        }`}
                      >
                        {isActive ? '✓ ACTIVO' : 'INACTIVO'}
                      </span>
                    ) : (
                      isActive && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white border border-purple-400 shadow">
                          ACTIVO
                        </span>
                      )
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                    {eff.description}
                  </p>
                </div>

                {/* Mechanical Effect Badge */}
                <div
                  className={`mt-1 text-[11px] font-mono p-1.5 rounded-lg border flex items-center gap-1.5 ${eff.badgeClass}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 opacity-80" />
                  <span className="leading-snug">{eff.mechanicalDebuffOrBonus}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#232635]">
          <span className="text-xs font-mono text-slate-400">
            {isDM
              ? '💡 Haz clic sobre cualquier efecto para activarlo o desactivarlo al instante.'
              : 'Efectos transmitidos en tiempo real por el DM.'}
          </span>
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#191b28] hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 hover:text-white font-mono font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
