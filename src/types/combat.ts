export type CombatantType = 'player' | 'enemy';

// Tipos de Daño Físico (D&D 5e)
export type PhysicalDamageType = 'contundente' | 'cortante' | 'perforante';

// Tipos de Daño Mágico y Elemental (D&D 5e)
export type MagicalDamageType =
  | 'acido'
  | 'frio'
  | 'fuego'
  | 'fuerza'
  | 'rayo'
  | 'trueno'
  | 'necrotico'
  | 'psiquico'
  | 'radiante'
  | 'veneno';

export type DamageType = PhysicalDamageType | MagicalDamageType | 'physical' | 'magical';

export interface DamageTypeMeta {
  key: DamageType;
  name: string;
  category: 'physical' | 'magical';
  icon: string;
  description: string;
  color: string;
}

export const PHYSICAL_DAMAGE_TYPES: DamageTypeMeta[] = [
  {
    key: 'contundente',
    name: 'Contundente',
    category: 'physical',
    icon: '🔨',
    description: 'Golpes con objetos pesados, martillos, caídas o puñetazos.',
    color: '#f97316',
  },
  {
    key: 'cortante',
    name: 'Cortante',
    category: 'physical',
    icon: '⚔️',
    description: 'Ataques con objetos afilados como espadas o hachas.',
    color: '#ef4444',
  },
  {
    key: 'perforante',
    name: 'Perforante',
    category: 'physical',
    icon: '🏹',
    description: 'Impactos con lanzas, flechas o estoques.',
    color: '#eab308',
  },
];

export const MAGICAL_DAMAGE_TYPES: DamageTypeMeta[] = [
  {
    key: 'acido',
    name: 'Ácido',
    category: 'magical',
    icon: '🧪',
    description: 'Sustancias corrosivas o alientos de ciertos monstruos.',
    color: '#84cc16',
  },
  {
    key: 'frio',
    name: 'Frío',
    category: 'magical',
    icon: '❄️',
    description: 'Temperaturas gélidas o magia de hielo.',
    color: '#38bdf8',
  },
  {
    key: 'fuego',
    name: 'Fuego',
    category: 'magical',
    icon: '🔥',
    description: 'Llamas y calor extremo (resistencia común).',
    color: '#f97316',
  },
  {
    key: 'fuerza',
    name: 'Fuerza',
    category: 'magical',
    icon: '🌀',
    description: 'Energía mágica pura (ej. Descarga de Eldritch).',
    color: '#a855f7',
  },
  {
    key: 'rayo',
    name: 'Rayo',
    category: 'magical',
    icon: '⚡',
    description: 'Electricidad y descargas voltaicas.',
    color: '#eab308',
  },
  {
    key: 'trueno',
    name: 'Trueno',
    category: 'magical',
    icon: '📢',
    description: 'Daño acústico basado en ondas de sonido y estruendos.',
    color: '#06b6d4',
  },
  {
    key: 'necrotico',
    name: 'Necrótico',
    category: 'magical',
    icon: '💀',
    description: 'Energía oscura que drena la fuerza vital.',
    color: '#64748b',
  },
  {
    key: 'psiquico',
    name: 'Psíquico',
    category: 'magical',
    icon: '🧠',
    description: 'Ataques dirigidos directamente a la mente y la psique.',
    color: '#ec4899',
  },
  {
    key: 'radiante',
    name: 'Radiante',
    category: 'magical',
    icon: '☀️',
    description: 'Luz divina o energía sagrada.',
    color: '#fde047',
  },
  {
    key: 'veneno',
    name: 'Veneno',
    category: 'magical',
    icon: '☠️',
    description: 'Toxinas que alteran el funcionamiento del cuerpo.',
    color: '#22c55e',
  },
];

export const ALL_DAMAGE_TYPES: DamageTypeMeta[] = [
  ...PHYSICAL_DAMAGE_TYPES,
  ...MAGICAL_DAMAGE_TYPES,
];

export function getDamageTypeMeta(key: string = 'cortante'): DamageTypeMeta {
  const found = ALL_DAMAGE_TYPES.find((d) => d.key === key.toLowerCase());
  return (
    found || {
      key: 'cortante',
      name: 'Cortante',
      category: 'physical',
      icon: '⚔️',
      description: 'Ataques cortantes.',
      color: '#ef4444',
    }
  );
}

export type AoEShape = 'circle' | 'square';
export type AoESizeFeet = 10 | 15 | 20 | 30;

export interface AoETemplate {
  shape: AoEShape;
  sizeFeet: AoESizeFeet;
  centerCol: number;
  centerRow: number;
}

export interface CombatAction {
  id: string;
  name: string;
  type: 'attack' | 'heal' | 'spell';
  damageType?: DamageType;
  diceFormula?: string;
  baseAmount?: number;
  description: string;
  effectType?: string;
  aoe?: {
    shape: AoEShape;
    sizeFeet: AoESizeFeet;
  };
}

export interface Combatant {
  id: string;
  name: string;
  type: CombatantType;
  avatar: string; // URL or base64 data URL
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  attackBonus?: number;
  initiativeBonus?: number;
  initiative?: number;
  jobClass: string;
  level?: number;
  actions: CombatAction[];
  statusEffects: string[];
  damageResistances?: DamageType[]; // Resistencias a tipos de daño (mitad de daño)
  isDefending?: boolean;
  isConcentrating?: boolean; // Concentración activa en un hechizo (D&D 5e)
  notes?: string;
  gridPosition?: { col: number; row: number };
}

export type HealthStatusLevel = 'unscathed' | 'healthy' | 'injured' | 'bloodied' | 'critical' | 'defeated';

export interface HealthStatusInfo {
  level: HealthStatusLevel;
  label: string;
  color: string;
  badgeBg: string;
  relativePercentBand: string;
}

export interface CombatLogEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  targetId?: string;
  targetName: string;
  actionName: string;
  type: 'damage' | 'heal' | 'status' | 'system';
  damageType?: DamageType;
  amount: number;
  playerAmount?: number; // Daño completo mostrado a los jugadores para no revelar resistencias
  isCrit?: boolean;
  isResisted?: boolean;
  notes?: string;
}

export type BattleEnvironment =
  | 'plains'
  | 'forest'
  | 'dungeon'
  | 'volcano'
  | 'cave'
  | 'castle'
  | 'crystal';
export type CombatPhase = 'prep' | 'active' | 'victory' | 'defeat';
export type GlobalEffectId =
  | 'difficult-terrain'
  | 'darkness'
  | 'heavy-rain'
  | 'blizzard'
  | 'toxic-miasma'
  | 'holy-ground'
  | 'extreme-heat'
  | 'wild-magic';

export interface GlobalEnvironmentalEffect {
  id: GlobalEffectId;
  name: string;
  icon: string;
  summary: string;
  description: string;
  mechanicalDebuffOrBonus: string;
  badgeClass: string;
  modifiers: {
    attackBonusDelta?: number;
    movementPenalty?: boolean;
    healBonus?: number;
    damageMultipliers?: Partial<Record<DamageType, number>>;
    disadvantageOnAttacks?: boolean;
    disadvantageOnSaves?: boolean;
  };
}

export interface InitiativeRollResult {
  combatantId: string;
  combatantName: string;
  type: CombatantType;
  avatar: string;
  jobClass: string;
  d20: number;
  bonus: number;
  total: number;
  isCrit: boolean; // Natural 20
  isFumble: boolean; // Natural 1
}

export type TurnPhase = 'start' | 'action' | 'movement' | 'end';

export interface EncounterState {
  id: string;
  title: string;
  round: number;
  combatPhase: CombatPhase;
  turnPhase?: TurnPhase;
  environment: BattleEnvironment;
  activeGlobalEffects?: GlobalEffectId[]; // IDs de efectos ambientales globales activos
  combatants: Combatant[];
  turnOrder: string[]; // List of combatant IDs in turn sequence
  activeTurnIndex: number;
  isSurpriseRound?: boolean;
  surpriseSide?: 'players' | 'enemies' | null;
  autoProcessEnemyTurns?: boolean;
  log: CombatLogEntry[];
  victoryAchieved?: boolean;
  lastUpdated: number;
}

export interface FloatingNumber {
  id: string;
  targetId: string;
  amount: number;
  playerDisplayAmount?: number; // Daño sin mitigar para jugadores
  type: 'damage' | 'heal' | 'crit' | 'miss';
  damageType?: DamageType; // Tipo de daño para animar espadazo, fuego, rayo, etc.
  x?: number;
  y?: number;
}

export interface RoomClaimInfo {
  playerId: string;
  playerName: string;
  claimedAt: number;
}

export interface RoomData {
  code: string;
  createdAt: number;
  dmSessionId: string;
  encounter: EncounterState;
  claimedTokens?: Record<string, RoomClaimInfo>;
  lastUpdated: number;
}
