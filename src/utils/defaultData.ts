import { Combatant, EncounterState } from '../types/combat.ts';

export const PRESET_AVATARS = {
  paladin: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <radialGradient id="pbg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1e3a8a" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#pbg)" stroke="#93c5fd" stroke-width="4"/>
      <!-- Silver Helmet -->
      <path d="M30 45 Q50 20 70 45 L70 70 Q50 82 30 70 Z" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
      <path d="M48 20 L52 20 L52 50 L48 50 Z" fill="#f59e0b"/>
      <!-- T-Visor -->
      <path d="M38 48 H62 V54 H53 V68 H47 V54 H38 Z" fill="#0f172a"/>
      <!-- Glowing blue eyes -->
      <circle cx="43" cy="51" r="2" fill="#60a5fa"/>
      <circle cx="57" cy="51" r="2" fill="#60a5fa"/>
      <!-- Crest -->
      <polygon points="50,14 42,24 58,24" fill="#3b82f6"/>
    </svg>
  `)}`,
  whiteMage: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <radialGradient id="wmbg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#94a3b8" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#e0e7ff" stroke="#a5b4fc" stroke-width="4"/>
      <!-- White Hood -->
      <path d="M26 65 Q50 15 74 65 Q70 85 50 80 Q30 85 26 65 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Red triangles pattern on hood (Classic FF White Mage) -->
      <polygon points="34,58 39,50 44,58" fill="#ef4444"/>
      <polygon points="46,54 50,46 54,54" fill="#ef4444"/>
      <polygon points="56,58 61,50 66,58" fill="#ef4444"/>
      <!-- Face -->
      <ellipse cx="50" cy="62" rx="14" ry="12" fill="#fed7aa"/>
      <circle cx="45" cy="62" r="2" fill="#475569"/>
      <circle cx="55" cy="62" r="2" fill="#475569"/>
      <path d="M48 68 Q50 70 52 68" stroke="#475569" stroke-width="1.5" fill="none"/>
    </svg>
  `)}`,
  blackMage: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="48" fill="#1e1b4b" stroke="#6366f1" stroke-width="4"/>
      <!-- Pointy Hat (Classic FF Black Mage) -->
      <path d="M22 48 Q50 44 78 48 Q82 52 74 54 Q50 50 26 54 Q18 52 22 48 Z" fill="#d97706" stroke="#78350f" stroke-width="2"/>
      <path d="M30 48 Q44 26 70 12 Q58 32 68 48 Z" fill="#b45309" stroke="#78350f" stroke-width="2"/>
      <!-- Shadow face -->
      <ellipse cx="50" cy="62" rx="18" ry="15" fill="#09090b"/>
      <!-- Glowing Yellow Eyes -->
      <ellipse cx="43" cy="61" rx="4" ry="3" fill="#facc15"/>
      <ellipse cx="57" cy="61" rx="4" ry="3" fill="#facc15"/>
      <ellipse cx="43" cy="61" rx="2" ry="1.5" fill="#ffffff"/>
      <ellipse cx="57" cy="61" rx="2" ry="1.5" fill="#ffffff"/>
      <!-- Blue Robe collar -->
      <path d="M32 75 Q50 68 68 75 L72 88 Q50 94 28 88 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
    </svg>
  `)}`,
  dragoon: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="48" fill="#312e81" stroke="#818cf8" stroke-width="4"/>
      <!-- Dragon Helmet Horns -->
      <path d="M25 40 Q20 20 12 24 Q24 32 28 48 Z" fill="#4338ca"/>
      <path d="M75 40 Q80 20 88 24 Q76 32 72 48 Z" fill="#4338ca"/>
      <!-- Visor -->
      <path d="M30 40 Q50 24 70 40 L68 72 Q50 82 32 72 Z" fill="#6366f1" stroke="#3730a3" stroke-width="2"/>
      <polygon points="50,18 42,32 58,32" fill="#c084fc"/>
      <!-- Eye slit -->
      <path d="M38 52 Q50 56 62 52" stroke="#f43f5e" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `)}`,
  behemoth: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <radialGradient id="bbg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#701a75" />
          <stop offset="100%" stop-color="#3b0764" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#bbg)" stroke="#d946ef" stroke-width="4"/>
      <!-- Mighty Horns -->
      <path d="M35 44 C20 30 14 14 26 12 C30 24 38 34 40 44 Z" fill="#f8fafc" stroke="#475569" stroke-width="2"/>
      <path d="M65 44 C80 30 86 14 74 12 C70 24 62 34 60 44 Z" fill="#f8fafc" stroke="#475569" stroke-width="2"/>
      <!-- Purple Beast Face -->
      <path d="M28 42 Q50 36 72 42 Q82 68 70 82 Q50 88 30 82 Q18 68 28 42 Z" fill="#86198f" stroke="#581c87" stroke-width="2"/>
      <!-- Snout & Tusks -->
      <ellipse cx="50" cy="68" rx="16" ry="12" fill="#a21caf"/>
      <polygon points="38,70 42,62 44,70" fill="#ffffff"/>
      <polygon points="62,70 58,62 56,70" fill="#ffffff"/>
      <!-- Fierce Red Eyes -->
      <polygon points="36,50 46,52 38,55" fill="#ef4444"/>
      <polygon points="64,50 54,52 62,55" fill="#ef4444"/>
      <circle cx="41" cy="52" r="1.5" fill="#fef08a"/>
      <circle cx="59" cy="52" r="1.5" fill="#fef08a"/>
    </svg>
  `)}`,
  goblin: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="48" fill="#14532d" stroke="#4ade80" stroke-width="4"/>
      <!-- Big Pointy Ears -->
      <polygon points="28,45 6,30 22,60" fill="#16a34a" stroke="#15803d" stroke-width="2"/>
      <polygon points="72,45 94,30 78,60" fill="#16a34a" stroke="#15803d" stroke-width="2"/>
      <!-- Face -->
      <ellipse cx="50" cy="56" rx="22" ry="20" fill="#22c55e" stroke="#16a34a" stroke-width="2"/>
      <!-- Big Yellow Eyes -->
      <circle cx="42" cy="50" r="6" fill="#facc15"/>
      <circle cx="58" cy="50" r="6" fill="#facc15"/>
      <ellipse cx="42" cy="50" rx="1.5" ry="5" fill="#1e293b"/>
      <ellipse cx="58" cy="50" rx="1.5" ry="5" fill="#1e293b"/>
      <!-- Wicked Grin with sharp teeth -->
      <path d="M38 66 Q50 76 62 66 Z" fill="#7f1d1d"/>
      <polygon points="42,66 45,71 47,66" fill="#ffffff"/>
      <polygon points="53,66 55,71 58,66" fill="#ffffff"/>
    </svg>
  `)}`,
  redDragon: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <radialGradient id="rbg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#991b1b" />
          <stop offset="100%" stop-color="#450a0a" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#rbg)" stroke="#f87171" stroke-width="4"/>
      <!-- Horns -->
      <path d="M34 38 Q18 20 18 10 Q30 18 40 32 Z" fill="#1e293b"/>
      <path d="M66 38 Q82 20 82 10 Q70 18 60 32 Z" fill="#1e293b"/>
      <!-- Scaly Head -->
      <polygon points="50,25 30,50 36,80 50,86 64,80 70,50" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
      <ellipse cx="50" cy="72" rx="10" ry="6" fill="#ea580c"/>
      <!-- Burning eyes -->
      <polygon points="40,48 48,50 42,56" fill="#fef08a"/>
      <polygon points="60,48 52,50 58,56" fill="#fef08a"/>
      <!-- Fire smoke nostrils -->
      <circle cx="46" cy="73" r="2" fill="#450a0a"/>
      <circle cx="54" cy="73" r="2" fill="#450a0a"/>
    </svg>
  `)}`,
  darkSorcerer: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="48" fill="#18181b" stroke="#a855f7" stroke-width="4"/>
      <!-- Dark Cowl -->
      <path d="M22 75 Q50 16 78 75 Q50 86 22 75 Z" fill="#2e1065" stroke="#581c87" stroke-width="2"/>
      <!-- Void Center -->
      <ellipse cx="50" cy="56" rx="16" ry="18" fill="#09090b"/>
      <!-- Glowing Runes / Eyes -->
      <circle cx="43" cy="54" r="3" fill="#c084fc"/>
      <circle cx="57" cy="54" r="3" fill="#c084fc"/>
      <circle cx="43" cy="54" r="1" fill="#ffffff"/>
      <circle cx="57" cy="54" r="1" fill="#ffffff"/>
      <circle cx="50" cy="40" r="2" fill="#a855f7"/>
    </svg>
  `)}`,
};

export const INITIAL_COMBATANTS: Combatant[] = [
  {
    id: 'char-1',
    name: 'Cecil (Paladín)',
    type: 'player',
    avatar: PRESET_AVATARS.paladin,
    currentHp: 85,
    maxHp: 85,
    tempHp: 0,
    attackBonus: 6,
    jobClass: 'Paladín Sagrado',
    level: 7,
    actions: [
      {
        id: 'act-c1',
        name: 'Espada Luminosa',
        type: 'attack',
        diceFormula: '1d10+4',
        baseAmount: 9,
        description: 'Tajo celestial que purga al enemigo con acero bendito.',
        effectType: 'physical',
      },
      {
        id: 'act-c2',
        name: 'Imposición de Manos',
        type: 'heal',
        diceFormula: '2d8+3',
        baseAmount: 12,
        description: 'Canaliza luz divina para restaurar la vitalidad de un aliado o de sí mismo.',
        effectType: 'curative',
      },
      {
        id: 'act-c3',
        name: 'Golpe Escudo Justiciero',
        type: 'attack',
        diceFormula: '1d8+3',
        baseAmount: 7,
        description: 'Impacto aturdidor con el broquel de plata.',
        effectType: 'physical',
      },
    ],
    statusEffects: ['bendicion'],
    notes: 'Defensor principal del grupo. Alta resistencia.',
    gridPosition: { col: 10, row: 3 },
  },
  {
    id: 'char-2',
    name: 'Rosa (Maga Blanca)',
    type: 'player',
    avatar: PRESET_AVATARS.whiteMage,
    currentHp: 52,
    maxHp: 52,
    tempHp: 0,
    attackBonus: 4,
    jobClass: 'Clériga Blanca',
    level: 7,
    actions: [
      {
        id: 'act-r1',
        name: 'Curaga Mayor',
        type: 'heal',
        diceFormula: '3d8+5',
        baseAmount: 18,
        description: 'Poderoso sortilegio curativo que renueva grandes reservas de salud.',
        effectType: 'curative',
      },
      {
        id: 'act-r2',
        name: 'Flecha Sagrada (Arco)',
        type: 'attack',
        diceFormula: '1d8+2',
        baseAmount: 6,
        description: 'Disparo a distancia impregnado de luz contra los adversarios.',
        effectType: 'holy',
      },
      {
        id: 'act-r3',
        name: 'Rezo de Alivio',
        type: 'heal',
        diceFormula: '1d8+4',
        baseAmount: 8,
        description: 'Oración veloz para estabilizar a un compañero caído o herido.',
        effectType: 'curative',
      },
    ],
    statusEffects: [],
    notes: 'Sanadora principal. Mantiene al grupo con vida en los momentos críticos.',
    gridPosition: { col: 12, row: 2 },
  },
  {
    id: 'char-3',
    name: 'Vivi (Mago Negro)',
    type: 'player',
    avatar: PRESET_AVATARS.blackMage,
    currentHp: 44,
    maxHp: 44,
    tempHp: 0,
    attackBonus: 5,
    jobClass: 'Taumaturgo Elemental',
    level: 7,
    actions: [
      {
        id: 'act-v1',
        name: 'Piro ++ (Firaga)',
        type: 'attack',
        diceFormula: '3d6+4',
        baseAmount: 14,
        description: 'Invoca una llamarada infernal sobre el objetivo.',
        effectType: 'fire',
      },
      {
        id: 'act-v2',
        name: 'Electro ++ (Thundaga)',
        type: 'attack',
        diceFormula: '2d10+3',
        baseAmount: 14,
        description: 'Rayo fulminante caído del cielo que sacude al enemigo.',
        effectType: 'thunder',
      },
      {
        id: 'act-v3',
        name: 'Báculo de Roble',
        type: 'attack',
        diceFormula: '1d6+1',
        baseAmount: 4,
        description: 'Golpe físico de emergencia con el báculo.',
        effectType: 'physical',
      },
    ],
    statusEffects: [],
    notes: 'Especialista en daño masivo a distancia.',
    gridPosition: { col: 12, row: 5 },
  },
  {
    id: 'enemy-1',
    name: 'Gran Behemoth',
    type: 'enemy',
    avatar: PRESET_AVATARS.behemoth,
    currentHp: 160,
    maxHp: 160,
    attackBonus: 7,
    jobClass: 'Bestia Alfa Temible',
    level: 8,
    actions: [
      {
        id: 'act-b1',
        name: 'Zarpazo Desgarrador',
        type: 'attack',
        diceFormula: '2d8+5',
        baseAmount: 14,
        description: 'Garras titánicas que desgarran armaduras.',
        effectType: 'physical',
      },
      {
        id: 'act-b2',
        name: 'Meteo Menor',
        type: 'attack',
        diceFormula: '2d10+4',
        baseAmount: 15,
        description: 'Invoca una roca llameante contra los combatientes.',
        effectType: 'fire',
      },
    ],
    statusEffects: [],
    damageResistances: ['cortante', 'contundente'],
    notes: 'Jefe del encuentro. Piel titánica: ¡Resiste daño cortante y contundente (recibe solo la mitad de daño)! Enfurece bajo el 50% HP.',
    gridPosition: { col: 2, row: 3 },
  },
  {
    id: 'enemy-2',
    name: 'Goblin Asaltante',
    type: 'enemy',
    avatar: PRESET_AVATARS.goblin,
    currentHp: 38,
    maxHp: 38,
    attackBonus: 4,
    jobClass: 'Hostigador Salvaje',
    level: 4,
    actions: [
      {
        id: 'act-g1',
        name: 'Daga Oxidada',
        type: 'attack',
        diceFormula: '1d6+2',
        baseAmount: 5,
        description: 'Apuñalamiento traicionero.',
        effectType: 'physical',
      },
    ],
    statusEffects: ['veneno'],
    notes: 'Escolta veloz y molesta.',
    gridPosition: { col: 3, row: 5 },
  },
];

export const INITIAL_ENCOUNTER: EncounterState = {
  id: 'encounter-1',
  title: '¡Emboscada en las Llanuras de Fabul!',
  round: 1,
  combatPhase: 'active',
  environment: 'plains',
  combatants: INITIAL_COMBATANTS,
  turnOrder: ['char-1', 'enemy-1', 'char-2', 'char-3', 'enemy-2'],
  activeTurnIndex: 0,
  isSurpriseRound: false,
  surpriseSide: null,
  autoProcessEnemyTurns: true,
  log: [
    {
      id: 'log-init-1',
      timestamp: '10:45:00',
      actorName: 'Sistema',
      targetName: 'Todos',
      actionName: 'Inicio de Encuentro',
      type: 'system',
      amount: 0,
      notes: '¡Un poderoso Behemoth y su escolta Goblin han bloqueado el paso!',
    },
  ],
  victoryAchieved: false,
  lastUpdated: Date.now(),
};
