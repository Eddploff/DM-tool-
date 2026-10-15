export type CombatantType = 'player' | 'enemy';

export interface CombatAction {
  id: string;
  name: string;
  type: 'attack' | 'heal' | 'spell';
  diceFormula?: string;
  baseAmount?: number;
  description: string;
  effectType?: string;
}

export interface Combatant {
  id: string;
  name: string;
  type: CombatantType;
  avatar: string; // URL or base64 data URL
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  armorClass: number; // Defensa / CA
  attackBonus: number;
  initiativeBonus?: number;
  initiative?: number;
  jobClass: string;
  level?: number;
  actions: CombatAction[];
  statusEffects: string[];
  isDefending?: boolean;
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
  amount: number;
  isCrit?: boolean;
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
export type TurnPhase = 'start' | 'action' | 'end';

export interface EncounterState {
  id: string;
  title: string;
  round: number;
  combatPhase: CombatPhase;
  turnPhase?: TurnPhase;
  environment: BattleEnvironment;
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
  type: 'damage' | 'heal' | 'crit' | 'miss';
  x?: number;
  y?: number;
}
