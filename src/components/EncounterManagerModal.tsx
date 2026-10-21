import React, { useState } from 'react';
import { EncounterState, BattleEnvironment, Combatant } from '../types/combat.ts';
import { INITIAL_COMBATANTS, PRESET_AVATARS } from '../utils/defaultData.ts';
import { playMenuBlip } from '../utils/soundEffects.ts';
import {
  FolderOpen,
  Download,
  Upload,
  Save,
  Trash2,
  X,
  Check,
  Sparkles,
  Swords,
  Layers,
  FileJson,
  AlertTriangle,
} from 'lucide-react';

interface EncounterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEncounter: EncounterState;
  onLoadEncounter: (newEncounter: EncounterState) => void;
}

interface EncounterPreset {
  id: string;
  title: string;
  environment: BattleEnvironment;
  description: string;
  combatantsCount: number;
  combatants: Combatant[];
  dmNotes?: string;
}

const PRESET_ENCOUNTERS: EncounterPreset[] = [
  {
    id: 'enc-forest-ambush',
    title: '🌲 Emboscada en el Sendero Silvano',
    environment: 'forest',
    description: 'Tres héroes son emboscados por un escuadrón de hostigadores goblins entre la maleza.',
    combatantsCount: 5,
    combatants: [
      ...INITIAL_COMBATANTS.filter((c) => c.type === 'player'),
      {
        id: 'goblin-scout-1',
        name: 'Goblin Acechador A',
        type: 'enemy',
        avatar: PRESET_AVATARS.goblin,
        currentHp: 28,
        maxHp: 28,
        attackBonus: 4,
        jobClass: 'Tirador Emboscador',
        level: 3,
        actions: [
          { id: 'act-ga1', name: 'Arco Corto Oxidado', type: 'attack', diceFormula: '1d6+2', description: 'Disparo traicionero.' },
        ],
        statusEffects: [],
        gridPosition: { col: 3, row: 2 },
      },
      {
        id: 'goblin-scout-2',
        name: 'Goblin Acechador B',
        type: 'enemy',
        avatar: PRESET_AVATARS.goblin,
        currentHp: 28,
        maxHp: 28,
        attackBonus: 4,
        jobClass: 'Hostigador Salvaje',
        level: 3,
        actions: [
          { id: 'act-ga2', name: 'Cimitarra Mellada', type: 'attack', diceFormula: '1d6+2', description: 'Tajo rápido.' },
        ],
        statusEffects: [],
        gridPosition: { col: 3, row: 4 },
      },
    ],
  },
  {
    id: 'enc-boss-behemoth',
    title: '🌋 La Cólera del Gran Behemoth',
    environment: 'volcano',
    description: 'Enfrentamiento épico en las calderas de lava contra una bestia alfa ancestral.',
    combatantsCount: 5,
    combatants: INITIAL_COMBATANTS,
  },
  {
    id: 'enc-dungeon-sorcerer',
    title: '💀 La Cripta del Nigromante del Vacío',
    environment: 'dungeon',
    description: 'Un hechicero oscuro y sus bestias alteradas realizan un ritual profano en las catacumbas.',
    combatantsCount: 5,
    combatants: [
      ...INITIAL_COMBATANTS.filter((c) => c.type === 'player'),
      {
        id: 'boss-sorcerer',
        name: 'Malakor (Nigromante)',
        type: 'enemy',
        avatar: PRESET_AVATARS.darkSorcerer,
        currentHp: 110,
        maxHp: 110,
        attackBonus: 7,
        jobClass: 'Taumaturgo del Vacío',
        level: 8,
        damageResistances: ['necrotico', 'frio'],
        resources: [
          { id: 'res-m1', name: 'Espacios Hechizo Niv. 3', current: 3, max: 3, category: 'spell', color: '#c084fc' },
        ],
        actions: [
          { id: 'act-s1', name: 'Rayo del Vacío', type: 'attack', diceFormula: '3d8+4', description: 'Energía nigromántica punzante.' },
          { id: 'act-s2', name: 'Explosión Umbría', type: 'attack', diceFormula: '2d10+3', description: 'Onda expansiva de oscuridad.' },
        ],
        statusEffects: [],
        gridPosition: { col: 2, row: 3 },
      },
      {
        id: 'behemoth-thrall',
        name: 'Behemoth Poseído',
        type: 'enemy',
        avatar: PRESET_AVATARS.behemoth,
        currentHp: 130,
        maxHp: 130,
        attackBonus: 6,
        jobClass: 'Bruto No-Muerto',
        level: 7,
        damageResistances: ['veneno'],
        actions: [
          { id: 'act-bt1', name: 'Embestida Titánica', type: 'attack', diceFormula: '2d8+4', description: 'Carga demoledora.' },
        ],
        statusEffects: [],
        gridPosition: { col: 4, row: 2 },
      },
    ],
  },
];

const LOCAL_STORAGE_KEY = 'eidolon_custom_encounters_v1';

export const EncounterManagerModal: React.FC<EncounterManagerModalProps> = ({
  isOpen,
  onClose,
  currentEncounter,
  onLoadEncounter,
}) => {
  const [customEncounters, setCustomEncounters] = useState<EncounterPreset[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [saveTitle, setSaveTitle] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'saved' | 'import_export'>('presets');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // 1. Guardar encuentro actual localmente
  const handleSaveCurrentEncounter = () => {
    if (!saveTitle.trim()) return;
    playMenuBlip();

    const newPreset: EncounterPreset = {
      id: `saved-${Date.now()}`,
      title: saveTitle.trim(),
      environment: currentEncounter.environment,
      description: saveDescription.trim() || `Encuentro con ${currentEncounter.combatants.length} combatientes.`,
      combatantsCount: currentEncounter.combatants.length,
      combatants: JSON.parse(JSON.stringify(currentEncounter.combatants)),
    };

    const nextList = [newPreset, ...customEncounters];
    setCustomEncounters(nextList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Storage quota or error
    }

    setSaveTitle('');
    setSaveDescription('');
    showStatus('¡Encuentro guardado exitosamente en tus plantillas locales!');
  };

  const handleDeleteSaved = (id: string) => {
    playMenuBlip();
    const nextList = customEncounters.filter((e) => e.id !== id);
    setCustomEncounters(nextList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }
  };

  // 2. Exportar encuentro actual a archivo .json
  const handleExportJSON = () => {
    playMenuBlip();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      encounter: currentEncounter,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = currentEncounter.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    a.href = url;
    a.download = `encuentro-${safeTitle || 'ttrpg'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('Archivo JSON descargado correctamente a tu equipo.');
  };

  // 3. Importar encuentro desde archivo .json
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const importedEncounter: EncounterState = parsed.encounter || parsed;

        if (!importedEncounter.combatants || !Array.isArray(importedEncounter.combatants)) {
          throw new Error('El archivo JSON no contiene combatientes válidos.');
        }

        // Apply imported encounter
        playMenuBlip();
        onLoadEncounter(importedEncounter);
        showStatus(`¡Encuentro "${importedEncounter.title || 'Importado'}" cargado con éxito en la sala!`);
        onClose();
      } catch (err) {
        showStatus(`Error al importar JSON: ${(err as Error).message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // 4. Cargar un preset o encuentro guardado
  const handleLoadPreset = (preset: EncounterPreset) => {
    playMenuBlip();
    const nextEncounter: EncounterState = {
      ...currentEncounter,
      title: preset.title,
      environment: preset.environment,
      round: 1,
      turnPhase: 'start',
      combatPhase: 'prep',
      activeTurnIndex: 0,
      victoryAchieved: false,
      combatants: JSON.parse(JSON.stringify(preset.combatants)),
      turnOrder: preset.combatants.map((c) => c.id),
      lastUpdated: Date.now(),
    };

    onLoadEncounter(nextEncounter);
    showStatus(`¡Encuentro "${preset.title}" cargado en la sala!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0e1017]/98 border border-purple-500/30 rounded-2xl shadow-[0_25px_65px_rgba(0,0,0,0.95)] ring-1 ring-white/10 p-4 sm:p-5 text-slate-100 max-h-[92vh] overflow-y-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232635]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#181926] rounded-xl border border-purple-500/30 text-purple-300">
              <FolderOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-100 font-mono flex items-center gap-2">
                <span>Gestión de Encuentros &amp; Escenarios</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-600/50">
                  Panel DM
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Carga plantillas predefinidas, guarda tus propios encuentros o importa/exporta en JSON.
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

        {/* Status notification */}
        {statusMsg && (
          <div
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2 animate-fade-in border ${
              statusMsg.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#232635] pb-2">
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setActiveTab('presets');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Catálogo de Presets ({PRESET_ENCOUNTERS.length})
          </button>
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setActiveTab('saved');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💾 Mis Plantillas ({customEncounters.length})
          </button>
          <button
            type="button"
            onClick={() => {
              playMenuBlip();
              setActiveTab('import_export');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'import_export'
                ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📁 Archivos JSON
          </button>
        </div>

        {/* Tab 1: Presets Catalog */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
            {PRESET_ENCOUNTERS.map((preset) => (
              <div
                key={preset.id}
                className="bg-[#111320] p-3.5 rounded-xl border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-100">{preset.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#181a28] text-amber-300 border border-amber-500/30">
                      Entorno: {preset.environment}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-950/70 text-purple-300 border border-purple-700/40">
                      {preset.combatantsCount} combatientes
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{preset.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Cargar en Sala</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Saved Encounters */}
        {activeTab === 'saved' && (
          <div className="flex flex-col gap-3">
            {/* Save current form */}
            <div className="p-3 bg-[#0d0f1a] rounded-xl border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-mono font-bold text-purple-300">
                Guardar estado del encuentro actual como nueva plantilla:
              </span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Título (ej. Guardia de la Puerta del Castillo)"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="bg-[#141624] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex-1"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentEncounter}
                  disabled={!saveTitle.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Plantilla</span>
                </button>
              </div>
            </div>

            {/* List */}
            {customEncounters.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No tienes plantillas guardadas aún. Asigna un nombre arriba para guardar el encuentro actual.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {customEncounters.map((enc) => (
                  <div
                    key={enc.id}
                    className="bg-[#111320] p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-100">{enc.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {enc.environment} • {enc.combatantsCount} combatientes
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoadPreset(enc)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1"
                      >
                        <Swords className="w-3 h-3" />
                        <span>Cargar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSaved(enc.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Import / Export JSON */}
        {activeTab === 'import_export' && (
          <div className="flex flex-col gap-4">
            {/* Export Card */}
            <div className="bg-[#111320] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                    Exportar Encuentro Activo (.json)
                  </h4>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Descarga un archivo con todos los héroes, monstruos, posiciones tácticas y acciones para respaldarlo o usarlo en otra partida.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Descargar JSON</span>
              </button>
            </div>

            {/* Import Card */}
            <div className="bg-[#111320] p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                    Importar Encuentro desde Archivo (.json)
                  </h4>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Sube cualquier archivo de encuentro .json exportado previamente para cargarlo de inmediato en tu sala de juego.
                </p>
              </div>

              <label className="cursor-pointer px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow transition-all shrink-0">
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo...</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
