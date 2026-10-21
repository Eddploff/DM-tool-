import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  Edit3,
  Eye,
  ListTodo,
  Download,
  RotateCcw,
  Plus,
  CheckCircle2,
  Circle,
  Sparkles,
  Save,
  Radio,
  Pin,
  PinOff,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Tag,
  AlertCircle,
  HelpCircle,
  Users,
  KeyRound,
  Coins,
  Swords,
} from 'lucide-react';
import {
  parsePlotThreads,
  togglePlotThreadAtLine,
  addPlotThreadToMarkdown,
  getPlotThreadsStats,
  DEFAULT_DM_NOTES_TEMPLATE,
  PlotThreadItem,
} from '../utils/dmNotesLogic.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';

interface DMNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  encounterTitle: string;
  notes: string;
  onSaveNotes: (newNotes: string) => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

type TabType = 'editor' | 'preview' | 'threads';
type ThreadFilter = 'all' | 'pending' | 'completed';

export const DMNotesDrawer: React.FC<DMNotesDrawerProps> = ({
  isOpen,
  onClose,
  encounterTitle,
  notes,
  onSaveNotes,
  isPinned = false,
  onTogglePin,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [content, setContent] = useState<string>(notes || '');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('saved');
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>('all');
  const [newThreadText, setNewThreadText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('PISTA');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalChangeRef = useRef<boolean>(false);

  // Sync internal content with external notes if updated from Firestore
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (notes !== undefined && notes !== content) {
      setContent(notes);
      setSaveStatus('synced');
    }
  }, [notes]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Close on Escape key press when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced auto-save to Firestore and encounter state
  const handleContentChange = (newText: string) => {
    setContent(newText);
    setSaveStatus('saving');
    isInternalChangeRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSaveNotes(newText);
      setSaveStatus('saved');
    }, 400);
  };

  // Immediate save helper
  const handleImmediateSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    playMenuBlip();
    onSaveNotes(content);
    setSaveStatus('saved');
  };

  // Text insertion helper for toolbar
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    playMenuBlip();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || defaultText;

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleContentChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const insertLinePrefix = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    playMenuBlip();

    const start = textarea.selectionStart;
    const currentText = textarea.value;

    // Find the beginning of the current line
    const lastNewline = currentText.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newText =
      currentText.substring(0, lineStart) +
      linePrefix +
      currentText.substring(lineStart);

    handleContentChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + linePrefix.length, start + linePrefix.length);
    }, 10);
  };

  // Plot threads logic
  const plotThreads = parsePlotThreads(content);
  const threadStats = getPlotThreadsStats(plotThreads);

  const filteredThreads = plotThreads.filter((t) => {
    if (threadFilter === 'pending') return !t.completed;
    if (threadFilter === 'completed') return t.completed;
    return true;
  });

  const handleToggleThread = (thread: PlotThreadItem) => {
    playMenuBlip();
    const updated = togglePlotThreadAtLine(content, thread.lineNumber);
    handleContentChange(updated);
  };

  const handleAddThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadText.trim()) return;
    playMenuBlip();
    const updated = addPlotThreadToMarkdown(content, newThreadText, selectedTag);
    handleContentChange(updated);
    setNewThreadText('');
  };

  // Export notes to markdown file
  const handleExportMarkdown = () => {
    playMenuBlip();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notas_dm_${encounterTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset to default template
  const handleResetToTemplate = () => {
    if (window.confirm('¿Deseas restaurar la plantilla predeterminada de notas del DM? Las notas actuales se sobrescribirán.')) {
      playMenuBlip();
      handleContentChange(DEFAULT_DM_NOTES_TEMPLATE);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {!isPinned && (
        <div
          className="fixed inset-0 bg-black/45 z-39 backdrop-blur-[2px] transition-opacity"
          onClick={() => {
            playMenuBlip();
            onClose();
          }}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full z-40 bg-[#0e1017]/98 border-l border-[#292d3f] shadow-2xl flex flex-col transition-all duration-300 backdrop-blur-xl ${
          isPinned ? 'w-full sm:w-[480px] lg:w-[540px]' : 'w-full sm:w-[480px] md:w-[520px]'
        }`}
        aria-label="Panel de Notas del DM"
      >
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-[#232635] bg-[#12141f] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-amber-200 tracking-tight flex items-center gap-1.5 truncate">
                <span>Cuaderno de Notas del DM</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {encounterTitle}
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
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-[#181a26] border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
                title={isPinned ? 'Desacoplar panel' : 'Fijar panel al lateral'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 text-amber-400" /> : <PinOff className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playMenuBlip();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-[#181a26] hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Cerrar notas del DM"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Status Bar & Action Tools */}
        <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-400 font-semibold animate-pulse">
                <Radio className="w-3 h-3 text-amber-400 animate-spin" />
                <span>Sincronizando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Sincronizado en tiempo real</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImmediateSave}
              className="hover:text-amber-300 text-slate-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Guardar cambios inmediatamente"
            >
              <Save className="w-3 h-3 text-amber-400" />
              <span>Guardar</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="hover:text-amber-300 text-slate-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Exportar archivo Markdown (.md)"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Exportar</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleResetToTemplate}
              className="hover:text-rose-400 text-slate-400 flex items-center gap-1 transition-colors cursor-pointer"
              title="Restaurar plantilla base"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#090a10] p-1 rounded-xl border border-[#232635] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setActiveTab('editor');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Editor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setActiveTab('preview');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Vista Previa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setActiveTab('threads');
            }}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === 'threads'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-amber-400" />
            <span>Hilos de Trama</span>
            {threadStats.total > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold">
                {threadStats.completed}/{threadStats.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* TAB 1: RICH TEXT EDITOR */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col min-h-0 p-3 gap-2.5">
            {/* Formatting Toolbar */}
            <div className="bg-[#12141f] p-2 rounded-xl border border-[#232635] flex flex-wrap items-center gap-1 shrink-0 text-slate-300">
              {/* Headings */}
              <div className="flex items-center gap-0.5 border-r border-[#292d3f] pr-1.5">
                <button
                  type="button"
                  onClick={() => insertLinePrefix('# ')}
                  className="px-1.5 py-1 rounded bg-[#181a26] hover:bg-[#222538] text-[11px] font-mono font-bold hover:text-amber-300 transition-colors"
                  title="Título Principal (H1)"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix('### ')}
                  className="px-1.5 py-1 rounded bg-[#181a26] hover:bg-[#222538] text-[11px] font-mono font-bold hover:text-amber-300 transition-colors"
                  title="Subtítulo de Sección (H3)"
                >
                  H3
                </button>
              </div>

              {/* Inline Formats */}
              <div className="flex items-center gap-0.5 border-r border-[#292d3f] pr-1.5">
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**', 'negrita')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Negrita (**texto**)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*', 'cursiva')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Cursiva (*texto*)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('~~', '~~', 'tachado')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Tachado (~~texto~~)"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('`', '`', 'código')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Código / Término clave (`texto`)"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lists and Checkboxes */}
              <div className="flex items-center gap-0.5 border-r border-[#292d3f] pr-1.5">
                <button
                  type="button"
                  onClick={() => insertLinePrefix('- ')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Lista con viñetas (- elemento)"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix('1. ')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Lista numerada (1. elemento)"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix('- [ ] ')}
                  className="p-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors"
                  title="Casilla de verificación / Hilo argumental (- [ ] tarea)"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Block elements */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => insertLinePrefix('> ')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Cita en bloque / Pistas narrativas (> texto)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertLinePrefix('---\n')}
                  className="p-1 rounded bg-[#181a26] hover:bg-[#222538] text-slate-300 hover:text-white transition-colors"
                  title="Línea divisoria (---)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick TTRPG Tags row */}
            <div className="flex items-center gap-1.5 flex-wrap bg-[#10121b] p-2 rounded-xl border border-[#232635] text-[11px] font-mono">
              <span className="text-slate-500 font-bold flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>Etiquetas:</span>
              </span>
              <button
                type="button"
                onClick={() => insertFormatting('[PELIGRO] ', '', '')}
                className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-600/50 text-rose-300 transition-colors"
                title="Etiqueta de Peligro / Combate"
              >
                🔴 PELIGRO
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[PISTA] ', '', '')}
                className="px-2 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-amber-300 transition-colors"
                title="Etiqueta de Pista / Rumor"
              >
                🟡 PISTA
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[NPC] ', '', '')}
                className="px-2 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 transition-colors"
                title="Etiqueta de Personaje / PNJ"
              >
                🟢 NPC
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[MISTERIO] ', '', '')}
                className="px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-600/50 text-purple-300 transition-colors"
                title="Etiqueta de Magia / Misterio"
              >
                🟣 MISTERIO
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[BOTÍN] ', '', '')}
                className="px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/50 text-cyan-300 transition-colors"
                title="Etiqueta de Tesoro / Recompensa"
              >
                🔵 BOTÍN
              </button>
            </div>

            {/* Main Textarea */}
            <div className="flex-1 flex flex-col relative min-h-[300px]">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Escribe aquí las notas secretas del DM, ganchos de trama, secretos por descubrir, tácticas de monstruos y recompensas..."
                className="flex-1 w-full p-3.5 bg-[#0a0b12] text-slate-200 border border-[#232635] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 rounded-xl resize-none font-mono text-xs sm:text-[13px] leading-relaxed outline-none shadow-inner"
                spellCheck={false}
              />
              <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center justify-between px-1">
                <span>{content.length} caracteres • {content.split('\n').length} líneas</span>
                <span>Atajos: - [ ] para hilos • H1-H3 para títulos</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RICH PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="bg-[#0b0c13] p-4 sm:p-5 rounded-2xl border border-[#232635] text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3 font-sans shadow-inner">
              {content ? (
                renderFormattedMarkdown(content, handleToggleThread)
              ) : (
                <div className="py-12 text-center text-slate-500 italic">
                  No hay notas escritas aún. Cambia al Editor para comenzar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PLOT THREADS DASHBOARD */}
        {activeTab === 'threads' && (
          <div className="flex-1 p-3.5 flex flex-col gap-3 overflow-y-auto">
            {/* Progress Card */}
            <div className="bg-gradient-to-r from-amber-950/60 via-[#181926] to-purple-950/40 p-3.5 rounded-2xl border border-amber-500/30 flex flex-col gap-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Progreso de Hilos Argumentales:</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {threadStats.completed} de {threadStats.total} completados ({threadStats.percent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-[#090a10] rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  style={{ width: `${threadStats.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span>Pendientes: {threadStats.pending}</span>
                <span>Resueltos: {threadStats.completed}</span>
              </div>
            </div>

            {/* Quick Add Thread Form */}
            <form onSubmit={handleAddThread} className="bg-[#12141f] p-2.5 rounded-xl border border-[#232635] flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Añadir Nuevo Hilo Argumental:</span>
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="bg-[#181a26] border border-slate-700 text-[11px] text-amber-300 rounded-lg px-2 py-1.5 font-mono outline-none shrink-0"
                  >
                    <option value="TRAMA">🎯 Trama</option>
                    <option value="PISTA">🟡 Pista</option>
                    <option value="PELIGRO">🔴 Peligro</option>
                    <option value="NPC">🟢 NPC</option>
                    <option value="MISTERIO">🟣 Misterio</option>
                    <option value="BOTÍN">🔵 Botín</option>
                  </select>
                  <input
                    type="text"
                    value={newThreadText}
                    onChange={(e) => setNewThreadText(e.target.value)}
                    placeholder="Ej: Encontrar la llave en el nido de la gárgola..."
                    className="flex-1 min-w-0 bg-[#0a0b12] border border-[#232635] text-xs text-white rounded-lg px-3 py-1.5 outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newThreadText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </form>

            {/* Filters */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setThreadFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                  threadFilter === 'all'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50'
                    : 'bg-[#12141f] text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Todos ({threadStats.total})
              </button>
              <button
                type="button"
                onClick={() => setThreadFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                  threadFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50'
                    : 'bg-[#12141f] text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Pendientes ({threadStats.pending})
              </button>
              <button
                type="button"
                onClick={() => setThreadFilter('completed')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                  threadFilter === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50'
                    : 'bg-[#12141f] text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Resueltos ({threadStats.completed})
              </button>
            </div>

            {/* Thread Cards List */}
            <div className="flex-1 flex flex-col gap-2">
              {filteredThreads.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs italic">
                  No hay hilos en esta categoría. Puedes añadir uno arriba o en el editor con "- [ ]".
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    onClick={() => handleToggleThread(thread)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                      thread.completed
                        ? 'bg-[#101419]/70 border-emerald-900/40 text-slate-400'
                        : 'bg-[#141624] border-[#292d3f] hover:border-amber-500/40 text-slate-200 shadow-sm'
                    }`}
                  >
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 transition-transform active:scale-90"
                    >
                      {thread.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-amber-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {thread.tag && renderTagBadge(thread.tag)}
                        <span className="text-[10px] font-mono text-slate-500">
                          Línea {thread.lineNumber + 1}
                        </span>
                      </div>
                      <p
                        className={`text-xs font-medium leading-snug ${
                          thread.completed ? 'line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {thread.text.replace(/\[(PELIGRO|PISTA|NPC|MISTERIO|BOTÍN|SECRETO|LORE|COMBATE|TRAMA)\]/i, '').trim()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  </>
  );
};

// Helper to render colored badges for TTRPG tags
function renderTagBadge(tag: string) {
  const upper = tag.toUpperCase();
  if (upper === 'PELIGRO' || upper === 'COMBATE') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-600/50">
        🔴 {upper}
      </span>
    );
  }
  if (upper === 'PISTA' || upper === 'SECRETO') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600/50">
        🟡 {upper}
      </span>
    );
  }
  if (upper === 'NPC') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/50">
        🟢 {upper}
      </span>
    );
  }
  if (upper === 'MISTERIO' || upper === 'LORE') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-600/50">
        🟣 {upper}
      </span>
    );
  }
  if (upper === 'BOTÍN') {
    return (
      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-600/50">
        🔵 {upper}
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-600">
      🏷️ {upper}
    </span>
  );
}

// Formatted Markdown Renderer with clickable checkboxes and themed headers
function renderFormattedMarkdown(
  markdown: string,
  onToggleThread: (thread: PlotThreadItem) => void
): React.ReactNode {
  const lines = markdown.split('\n');

  return lines.map((line, index) => {
    // Empty line
    if (!line.trim()) {
      return <div key={index} className="h-2" />;
    }

    // Horizontal Rule
    if (/^---|\*\*\*|___$/.test(line.trim())) {
      return <hr key={index} className="border-[#232635] my-3" />;
    }

    // Heading 1 (# ...)
    if (line.startsWith('# ')) {
      return (
        <h1
          key={index}
          className="text-base sm:text-lg font-bold text-amber-300 border-b border-amber-500/30 pb-1.5 mt-3 mb-2 font-mono flex items-center gap-2"
        >
          {line.replace(/^#\s+/, '')}
        </h1>
      );
    }

    // Heading 2 (## ...)
    if (line.startsWith('## ')) {
      return (
        <h2
          key={index}
          className="text-sm sm:text-base font-bold text-amber-200 mt-3 mb-1.5 font-mono"
        >
          {line.replace(/^##\s+/, '')}
        </h2>
      );
    }

    // Heading 3 (### ...)
    if (line.startsWith('### ')) {
      return (
        <h3
          key={index}
          className="text-xs sm:text-sm font-bold text-slate-200 mt-2.5 mb-1 font-mono text-purple-300 flex items-center gap-1.5"
        >
          {line.replace(/^###\s+/, '')}
        </h3>
      );
    }

    // Checklist Item (- [ ] or - [x])
    const taskMatch = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const text = taskMatch[2];
      const tagMatch = text.match(/\[(PELIGRO|PISTA|NPC|MISTERIO|BOTÍN|SECRETO|LORE|COMBATE|TRAMA)\]/i);
      const tag = tagMatch ? tagMatch[1] : undefined;
      const cleanText = tag ? text.replace(tagMatch![0], '').trim() : text;

      const threadItem: PlotThreadItem = {
        id: `thread-${index}`,
        lineNumber: index,
        text,
        completed: isChecked,
      };

      return (
        <div
          key={index}
          onClick={() => onToggleThread(threadItem)}
          className={`flex items-start gap-2 py-1 px-1.5 rounded-lg transition-colors cursor-pointer select-none ${
            isChecked ? 'bg-[#0f121a]/60 text-slate-500' : 'hover:bg-amber-500/10 text-slate-200'
          }`}
        >
          <button type="button" className="mt-0.5 shrink-0">
            {isChecked ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-amber-400" />
            )}
          </button>
          <div className="flex-1 text-xs">
            {tag && <span className="mr-1.5">{renderTagBadge(tag)}</span>}
            <span className={isChecked ? 'line-through text-slate-500' : 'text-slate-200'}>
              {renderInlineStyles(cleanText)}
            </span>
          </div>
        </div>
      );
    }

    // Bullet list item (- ...)
    if (/^\s*[-*]\s+(.*)$/.test(line)) {
      const bulletText = line.replace(/^\s*[-*]\s+/, '');
      return (
        <div key={index} className="flex items-start gap-2 pl-2 text-xs text-slate-300">
          <span className="text-amber-400 shrink-0">•</span>
          <span className="flex-1">{renderInlineStyles(bulletText)}</span>
        </div>
      );
    }

    // Numbered list (1. ...)
    if (/^\s*\d+\.\s+(.*)$/.test(line)) {
      const numMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
      return (
        <div key={index} className="flex items-start gap-2 pl-2 text-xs text-slate-300 font-mono">
          <span className="text-amber-400 shrink-0">{numMatch?.[1]}.</span>
          <span className="flex-1 font-sans">{renderInlineStyles(numMatch?.[2] || '')}</span>
        </div>
      );
    }

    // Blockquote (> ...)
    if (line.startsWith('> ')) {
      return (
        <blockquote
          key={index}
          className="border-l-2 border-amber-500/60 pl-3 py-1 my-1 bg-amber-950/20 text-amber-200/90 text-xs italic font-serif rounded-r"
        >
          {renderInlineStyles(line.replace(/^>\s+/, ''))}
        </blockquote>
      );
    }

    // Regular paragraph
    return (
      <p key={index} className="text-xs text-slate-300">
        {renderInlineStyles(line)}
      </p>
    );
  });
}

// Inline styling parser for **bold**, *italic*, `code`, ~~strike~~
function renderInlineStyles(text: string): React.ReactNode {
  // Simple regex-based inline parser
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(
        <strong key={keyIdx++} className="font-bold text-amber-200">
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
      continue;
    }

    // Code: `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(
        <code key={keyIdx++} className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-purple-300 font-mono text-[11px]">
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    // Italic: *text*
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(
        <em key={keyIdx++} className="italic text-slate-300">
          {italicMatch[2]}
        </em>
      );
      remaining = italicMatch[3];
      continue;
    }

    // Strikethrough: ~~text~~
    const strikeMatch = remaining.match(/^(.*?)~~(.+?)~~(.*)$/);
    if (strikeMatch) {
      if (strikeMatch[1]) parts.push(strikeMatch[1]);
      parts.push(
        <span key={keyIdx++} className="line-through text-slate-500">
          {strikeMatch[2]}
        </span>
      );
      remaining = strikeMatch[3];
      continue;
    }

    // No more formatting matches
    parts.push(remaining);
    break;
  }

  return parts;
}
