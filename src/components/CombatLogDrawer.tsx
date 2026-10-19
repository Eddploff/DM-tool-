import React, { useState } from 'react';
import { CombatLogEntry } from '../types/combat.ts';
import {
  ScrollText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Swords,
  Heart,
  Zap,
} from 'lucide-react';

interface CombatLogDrawerProps {
  log: CombatLogEntry[];
  onClearLog: () => void;
  isDMView?: boolean;
}

export const CombatLogDrawer: React.FC<CombatLogDrawerProps> = ({
  log,
  onClearLog,
  isDMView = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'damage' | 'heal'>('all');

  const filteredLog = log.filter((entry) => {
    if (filter === 'damage') return entry.type === 'damage';
    if (filter === 'heal') return entry.type === 'heal';
    return true;
  });

  return (
    <div className="bg-[#0e1017]/95 border border-[#232635] rounded-xl overflow-hidden shadow-xl text-slate-200 ring-1 ring-white/5">
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer bg-[#12131b] hover:bg-[#161824] transition-colors border-b border-[#232635] select-none"
      >
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">
            Registro de Batalla ({log.length})
          </span>
          {log.length > 0 && !isExpanded && (
            <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-md hidden xs:inline">
              Último: {log[0]?.actorName} → {log[0]?.targetName} ({log[0]?.actionName})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="p-3 flex flex-col gap-2">
          {/* Filter and Clear controls */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#232635]">
            <div className="flex items-center gap-1 font-mono">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-purple-900/70 text-purple-200 border border-purple-500/50 font-bold'
                    : 'bg-[#141520] text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('damage')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  filter === 'damage'
                    ? 'bg-red-950 text-red-200 border border-red-700/60 font-bold'
                    : 'bg-[#141520] text-slate-400 hover:text-white'
                }`}
              >
                Daño
              </button>
              <button
                onClick={() => setFilter('heal')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  filter === 'heal'
                    ? 'bg-emerald-950 text-emerald-200 border border-emerald-700/60 font-bold'
                    : 'bg-[#141520] text-slate-400 hover:text-white'
                }`}
              >
                Curación
              </button>
            </div>

            <button
              onClick={onClearLog}
              className="text-[11px] text-slate-500 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Limpiar
            </button>
          </div>

          {/* Log list */}
          <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredLog.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                No hay eventos registrados aún.
              </div>
            ) : (
              filteredLog.map((entry) => (
                <div
                  key={entry.id}
                  className="text-xs font-mono p-1.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {entry.timestamp}
                    </span>
                    {entry.type === 'damage' ? (
                      <Swords className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : entry.type === 'heal' ? (
                      <Heart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">
                      <strong className="text-slate-200">{entry.actorName}</strong>{' '}
                      <span className="text-slate-400">usó</span>{' '}
                      <strong className="text-blue-300">{entry.actionName}</strong>{' '}
                      <span className="text-slate-400">contra</span>{' '}
                      <strong className="text-slate-200">{entry.targetName}</strong>
                    </span>
                  </div>

                  <div className="shrink-0 font-bold">
                    {entry.type === 'damage' && (
                      <span className="text-red-400">
                        -{(!isDMView && entry.playerAmount !== undefined ? entry.playerAmount : entry.amount)} HP {entry.isCrit && '★'}
                        {isDMView && entry.isResisted && (
                          <span className="text-[10px] text-amber-300 ml-1 font-normal bg-amber-950/80 px-1 py-0.2 rounded border border-amber-600">
                            ½ resistido
                          </span>
                        )}
                      </span>
                    )}
                    {entry.type === 'heal' && (
                      <span className="text-emerald-400">+{entry.amount} HP</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
