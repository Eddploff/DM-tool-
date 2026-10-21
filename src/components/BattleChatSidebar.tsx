import React, { useState, useRef, useEffect } from 'react';
import { CombatLogEntry } from '../types/combat.ts';
import {
  MessageSquare,
  ScrollText,
  Dices,
  Swords,
  Heart,
  Trash2,
  X,
  Send,
  Info,
  Pin,
  PinOff,
} from 'lucide-react';
import { parseAndRollDiceString } from '../utils/diceLogic.ts';
import { playDiceRollSound, playMenuBlip } from '../utils/soundEffects.ts';
import {
  filterCombatLogs,
  isCombatLogDiceRoll,
  CombatLogFilterType,
} from '../utils/combatLogic.ts';

interface BattleChatSidebarProps {
  log: CombatLogEntry[];
  onClearLog: () => void;
  onSendMessage: (text: string) => void;
  onBroadcastRoll: (rollText: string) => void;
  isDMView: boolean;
  senderName: string;
  isOpen: boolean;
  onClose: () => void;
  onToggleOpen: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const BattleChatSidebar: React.FC<BattleChatSidebarProps> = ({
  log,
  onClearLog,
  onSendMessage,
  onBroadcastRoll,
  isDMView,
  senderName,
  isOpen,
  onClose,
  onToggleOpen,
  isPinned = false,
  onTogglePin,
}) => {
  const [filter, setFilter] = useState<CombatLogFilterType>('all');
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs appear or when drawer opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, isOpen, filter]);

  // Close on Escape key press when drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const counts = {
    all: log.length,
    damage: log.filter((e) => e.type === 'damage').length,
    rolls: log.filter(isCombatLogDiceRoll).length,
    chat: log.filter((e) => e.type === 'chat').length,
    heal: log.filter((e) => e.type === 'heal').length,
  };

  const filteredLogs = filterCombatLogs(log, filter);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // Check if it's a dice roll formula (e.g. /r 1d20+3 or 2d6+4)
    const diceResult = parseAndRollDiceString(text);
    if (diceResult) {
      playDiceRollSound();
      onBroadcastRoll(diceResult.logText);
    } else {
      playMenuBlip();
      onSendMessage(text);
    }
    setInputText('');
  };

  const handleQuickD20 = () => {
    playDiceRollSound();
    const roll = Math.floor(Math.random() * 20) + 1;
    const critTag = roll === 20 ? ' ⭐ ¡CRÍTICO NATURAL!' : roll === 1 ? ' 💀 ¡PIFIA!' : '';
    onBroadcastRoll(`d20 ➔ [${roll}] = **${roll}**${critTag}`);
  };

  // 1. When closed: render the floating vertical sticker on the right screen edge
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          playMenuBlip();
          onToggleOpen();
        }}
        className={`fixed right-0 ${
          isDMView ? 'top-[58%]' : 'top-1/2'
        } -translate-y-1/2 z-30 bg-gradient-to-l from-sky-950/90 via-[#161826]/95 to-[#10121c]/95 hover:from-sky-900/90 text-sky-300 border-l border-t border-b border-sky-500/50 py-3 px-2 rounded-l-xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 group transition-all cursor-pointer hover:pl-3`}
        title="Abrir Chat de Batalla y Registro de Tiradas/Daño"
        aria-label="Abrir Chat y Registro"
      >
        <MessageSquare className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
        <span className="[writing-mode:vertical-rl] text-[10px] font-mono font-bold tracking-wider uppercase text-sky-200/90">
          Chat & Tiradas
        </span>
        {log.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-sky-500/30 border border-sky-400/60 text-sky-200 text-[9px] font-mono font-bold">
            {log.length > 99 ? '99+' : log.length}
          </span>
        )}
      </button>
    );
  }

  // 2. When open: render backdrop (if unpinned) and full slide-out lateral drawer
  return (
    <>
      {/* Subtle backdrop when unpinned */}
      {!isPinned && (
        <div
          className="fixed inset-0 bg-black/40 z-30 transition-opacity backdrop-blur-[2px]"
          onClick={() => {
            playMenuBlip();
            onClose();
          }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-40 bg-[#0e1017]/98 border-l border-[#222532] shadow-2xl flex flex-col transition-all duration-300 backdrop-blur-xl ${
          isPinned ? 'w-full sm:w-[440px] lg:w-[480px]' : 'w-full sm:w-[440px] md:w-[480px]'
        }`}
        aria-label="Panel de Chat y Registro de Batalla"
      >
        {/* Drawer Header */}
        <div className="p-3 border-b border-[#222532] bg-[#12141f] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/40 flex items-center justify-center shrink-0 text-sky-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
                <span>Registro & Chat</span>
                <span className="px-1.5 py-0.2 rounded bg-[#1e2230] text-[#e5a93c] text-[10px] font-mono">
                  {log.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Tiradas en vivo, daño, curación y mesa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onTogglePin && (
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  onTogglePin();
                }}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  isPinned
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-[#181a26] border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
                title={isPinned ? 'Desacoplar panel lateral' : 'Fijar panel al lateral'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 text-sky-400" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {log.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playMenuBlip();
                  onClearLog();
                }}
                title="Vaciar registro de batalla"
                className="p-1.5 rounded-lg bg-[#201518] hover:bg-[#311c21] text-[#f87171] border border-[#482028] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playMenuBlip();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-[#181a26] hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Ocultar chat de batalla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-2 py-1.5 bg-[#11131c] border-b border-[#202330] flex items-center gap-1 text-[11px] font-mono shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setFilter('all');
            }}
            title="Ver todos los registros de combate"
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              filter === 'all'
                ? 'bg-[#222638] text-slate-100 font-bold border border-[#343b56] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161824]'
            }`}
          >
            <span>Todos</span>
            <span
              className={`px-1 py-0.2 rounded-full text-[9px] ${
                filter === 'all' ? 'bg-[#343b56] text-white' : 'bg-[#181a26] text-slate-500'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setFilter('damage');
            }}
            title="Visualizar solo Daños"
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              filter === 'damage'
                ? 'bg-[#281518] text-[#f87171] font-bold border border-[#52232a] shadow-sm'
                : 'text-slate-400 hover:text-[#f87171] hover:bg-[#1a1418]'
            }`}
          >
            <Swords className="w-3 h-3 text-[#f87171]" />
            <span>Daños</span>
            <span
              className={`px-1 py-0.2 rounded-full text-[9px] ${
                filter === 'damage' ? 'bg-[#52232a] text-[#fca5a5]' : 'bg-[#181a26] text-slate-500'
              }`}
            >
              {counts.damage}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setFilter('rolls');
            }}
            title="Visualizar solo Tiradas de dados"
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              filter === 'rolls'
                ? 'bg-[#281e13] text-[#fbbf24] font-bold border border-[#523e1c] shadow-sm'
                : 'text-slate-400 hover:text-[#fbbf24] hover:bg-[#1b1814]'
            }`}
          >
            <Dices className="w-3 h-3 text-[#e5a93c]" />
            <span>Tiradas de dados</span>
            <span
              className={`px-1 py-0.2 rounded-full text-[9px] ${
                filter === 'rolls' ? 'bg-[#523e1c] text-[#fde68a]' : 'bg-[#181a26] text-slate-500'
              }`}
            >
              {counts.rolls}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setFilter('chat');
            }}
            title="Visualizar solo Mensajes de chat"
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              filter === 'chat'
                ? 'bg-[#14202e] text-[#38bdf8] font-bold border border-[#1e3a5f] shadow-sm'
                : 'text-slate-400 hover:text-[#38bdf8] hover:bg-[#131922]'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-[#38bdf8]" />
            <span>Mensajes de chat</span>
            <span
              className={`px-1 py-0.2 rounded-full text-[9px] ${
                filter === 'chat' ? 'bg-[#1e3a5f] text-[#bae6fd]' : 'bg-[#181a26] text-slate-500'
              }`}
            >
              {counts.chat}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setFilter('heal');
            }}
            title="Visualizar solo Curación"
            className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
              filter === 'heal'
                ? 'bg-[#13261d] text-[#34d399] font-bold border border-[#1e4835] shadow-sm'
                : 'text-slate-400 hover:text-[#34d399] hover:bg-[#131d18]'
            }`}
          >
            <Heart className="w-3 h-3 text-[#34d399]" />
            <span>Curación</span>
            <span
              className={`px-1 py-0.2 rounded-full text-[9px] ${
                filter === 'heal' ? 'bg-[#1e4835] text-[#a7f3d0]' : 'bg-[#181a26] text-slate-500'
              }`}
            >
              {counts.heal}
            </span>
          </button>
        </div>

        {/* Messages Stream */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0 divide-y divide-[#181a24]"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ScrollText className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <p className="font-mono text-xs font-semibold text-slate-300">
                {filter === 'damage' && 'Sin registros de daño'}
                {filter === 'rolls' && 'Sin tiradas de dados registradas'}
                {filter === 'chat' && 'Sin mensajes de chat en la mesa'}
                {filter === 'heal' && 'Sin curaciones registradas'}
                {filter === 'all' && 'Sin registros de batalla'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                {filter === 'damage' && 'Los ataques y daño de héroes o enemigos aparecerán aquí al combatir.'}
                {filter === 'rolls' && 'Lanza dados con la bandeja rápida o escribe fórmulas como 2d6+4.'}
                {filter === 'chat' && 'Escribe un mensaje en el campo inferior para comunicarte con la mesa.'}
                {filter === 'heal' && 'Las curaciones y puntos de vida temporales aparecerán aquí.'}
                {filter === 'all' && 'Las tiradas de dados, ataques y curaciones aparecerán aquí en vivo.'}
              </p>
              {filter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    playMenuBlip();
                    setFilter('all');
                  }}
                  className="mt-3 px-2.5 py-1 rounded bg-[#181a26] hover:bg-[#222538] text-xs font-mono text-slate-300 border border-[#2c3146] transition-colors cursor-pointer"
                >
                  Ver todos los registros ({counts.all})
                </button>
              )}
            </div>
          ) : (
            /* Render from oldest to newest so it reads naturally downwards like a chat */
            [...filteredLogs].reverse().map((entry) => {
              const isDiceRoll = isCombatLogDiceRoll(entry);

              if (isDiceRoll) {
                const showActionTag =
                  entry.actionName &&
                  entry.actionName !== 'Tirada de Dados' &&
                  entry.actionName !== entry.notes &&
                  (!entry.notes || !entry.notes.includes(entry.actionName));

                const displayText = entry.notes || (entry.amount > 0 ? `${entry.amount}` : '');

                return (
                  <div key={entry.id} className="pt-2 first:pt-0">
                    <div className="bg-[#18161b] border border-[#2d2422] rounded-lg p-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-[#e5a93c] flex items-center gap-1">
                          <Dices className="w-3 h-3 text-[#e5a93c]" />
                          <span>{entry.actorName}</span>
                        </span>
                        <span className="text-slate-500">{entry.timestamp}</span>
                      </div>

                      <div className="text-xs font-mono text-slate-200 font-semibold break-words">
                        {showActionTag && (
                          <span className="text-slate-400 mr-1">[{entry.actionName}]</span>
                        )}
                        <span>
                          {displayText.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <span key={i} className="text-[#fbbf24] font-black font-mono">
                                  {part.slice(2, -2)}
                                </span>
                              );
                            }
                            return <span key={i}>{part}</span>;
                          })}
                        </span>
                      </div>

                      {entry.isCrit && (
                        <span className="self-start px-1.5 py-0.2 rounded bg-[#292012] border border-[#e5a93c] text-[#fbbf24] text-[9px] font-black uppercase font-mono">
                          ⭐ ¡Crítico Natural!
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              if (entry.type === 'damage') {
                return (
                  <div key={entry.id} className="pt-2 first:pt-0">
                    <div className="bg-[#1b1417] border border-[#381e23] rounded-lg p-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-[#f87171] flex items-center gap-1 truncate">
                          <Swords className="w-3 h-3 text-[#f87171]" />
                          <span>{entry.actorName}</span>
                          <span className="text-slate-500 font-normal">➔</span>
                          <span className="text-slate-300">{entry.targetName}</span>
                        </span>
                        <span className="text-slate-500 shrink-0 ml-1">{entry.timestamp}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 text-xs font-mono">
                        <span className="text-slate-300 text-[11px] truncate">{entry.actionName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#261519] border border-[#52232a] text-[#f87171] font-black shrink-0">
                          -{entry.amount} HP
                        </span>
                      </div>

                      {entry.notes && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (entry.type === 'heal') {
                return (
                  <div key={entry.id} className="pt-2 first:pt-0">
                    <div className="bg-[#121c17] border border-[#1b3d2b] rounded-lg p-2.5 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-[#34d399] flex items-center gap-1 truncate">
                          <Heart className="w-3 h-3 text-[#34d399]" />
                          <span>{entry.actorName}</span>
                          <span className="text-slate-500 font-normal">➔</span>
                          <span className="text-slate-300">{entry.targetName}</span>
                        </span>
                        <span className="text-slate-500 shrink-0 ml-1">{entry.timestamp}</span>
                      </div>

                      <div className="flex items-center justify-between gap-1 text-xs font-mono">
                        <span className="text-slate-300 text-[11px] truncate">{entry.actionName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#13261d] border border-[#1e4835] text-[#34d399] font-black shrink-0">
                          +{entry.amount} HP
                        </span>
                      </div>

                      {entry.notes && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              if (entry.type === 'chat') {
                return (
                  <div key={entry.id} className="pt-2 first:pt-0">
                    <div className="bg-[#161824] border border-[#272c40] rounded-lg p-2.5 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold text-[#38bdf8]">{entry.actorName}</span>
                        <span className="text-slate-500">{entry.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-200 break-words">{entry.notes}</p>
                    </div>
                  </div>
                );
              }

              // System log default
              return (
                <div key={entry.id} className="pt-2 first:pt-0">
                  <div className="bg-[#13151f] border border-[#222636] rounded-lg p-2.5 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-slate-400 flex items-center gap-1">
                        <Info className="w-3 h-3 text-slate-400" />
                        <span>{entry.actorName}</span>
                      </span>
                      <span className="text-slate-500">{entry.timestamp}</span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono font-medium">
                      {entry.actionName}: {entry.notes || ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Chat / Roll Input */}
        <form
          onSubmit={handleSend}
          className="p-3 bg-[#12141c] border-t border-[#222532] flex flex-col gap-1.5 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Mensaje o fórmula (ej. /r 1d20+3, 2d6+4)..."
              className="flex-1 bg-[#1a1c28] border border-[#2c3144] focus:border-[#e5a93c] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none font-mono"
            />

            <button
              type="button"
              onClick={handleQuickD20}
              title="Lanzar 1d20 rápido al chat"
              className="p-1.5 rounded-lg bg-[#202434] hover:bg-[#2b3046] text-[#e5a93c] border border-[#333b54] transition-colors cursor-pointer"
            >
              <Dices className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!inputText.trim()}
              title="Enviar mensaje al registro"
              className="p-1.5 rounded-lg bg-[#e5a93c] hover:bg-[#d97706] disabled:opacity-40 text-[#0d0e12] font-bold transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-0.5">
            <span>Usa /r 1d20+3 o 2d6 para tirar</span>
            <span>{senderName}</span>
          </div>
        </form>
      </aside>
    </>
  );
};
