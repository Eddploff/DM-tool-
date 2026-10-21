import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Combatant,
  EncounterState,
  FloatingNumber,
  DamageType,
  AoETemplate,
  CombatLogEntry,
  RoomData,
  InitiativeRollResult,
} from './types/combat.ts';
import {
  loadEncounterState,
  saveAndBroadcastEncounter,
  subscribeToSync,
  broadcastFloatingEffect,
  resetEncounterState,
  createRoomInFirestore,
  fetchRoomFromFirestore,
  subscribeToRoom,
  syncEncounterToRoom,
  claimTokenInRoom,
  releaseTokenInRoom,
  createAndClaimPlayerTokenInRoom,
  getOrCreatePlayerSessionId,
  getStoredPlayerName,
  setStoredPlayerName,
  getStoredRoomCode,
  setStoredRoomCode,
} from './utils/syncManager.ts';
import { testFirestoreConnection } from './utils/firebase.ts';
import {
  advanceTurn,
  retreatTurn,
  applyDamage,
  applyHeal,
  applyTempHp,
  createCombatLog,
  isEncounterWon,
  isPartyWiped,
  resetEncounterToFull,
} from './utils/combatLogic.ts';
import {
  toggleGlobalEffectInEncounter,
  clearAllGlobalEffectsInEncounter,
} from './utils/environmentalEffects.ts';
import { INITIAL_COMBATANTS } from './utils/defaultData.ts';
import {
  playSlashSound,
  playAttackSoundByDamageType,
  playHealSound,
  playVictoryFanfare,
  playMenuBlip,
} from './utils/soundEffects.ts';

import { HeaderBar } from './components/HeaderBar.tsx';
import { TurnOrderRibbon } from './components/TurnOrderRibbon.tsx';
import { JRPGEncounterArena } from './components/JRPGEncounterArena.tsx';
import { PlayerCombatPanel } from './components/PlayerCombatPanel.tsx';
import { DMScreenPanel } from './components/DMScreenPanel.tsx';
import { CharacterCardModal } from './components/CharacterCardModal.tsx';
import { AddEnemyModal } from './components/AddEnemyModal.tsx';
import { ThreeDigitCounterModal } from './components/ThreeDigitCounterModal.tsx';
import { CombatOrderModal } from './components/CombatOrderModal.tsx';
import { StatusPickerModal } from './components/StatusPickerModal.tsx';
import { CombatLogDrawer } from './components/CombatLogDrawer.tsx';
import { RoomLobbyModal } from './components/RoomLobbyModal.tsx';
import { PlayerTokenSelectionModal } from './components/PlayerTokenSelectionModal.tsx';
import { InitiativeRollModal } from './components/InitiativeRollModal.tsx';
import { GlobalEffectsModal } from './components/GlobalEffectsModal.tsx';
import { QuickDiceRoller } from './components/QuickDiceRoller.tsx';
import { QuickDiceBar } from './components/QuickDiceBar.tsx';
import { EncounterManagerModal } from './components/EncounterManagerModal.tsx';
import { DMNotesDrawer } from './components/DMNotesDrawer.tsx';
import { BattleChatSidebar } from './components/BattleChatSidebar.tsx';

import { Trophy, Skull, RotateCcw, Check, Radio, BookOpen } from 'lucide-react';

export default function App() {
  const [encounter, setEncounter] = useState<EncounterState>(loadEncounterState);
  const [currentRole, setCurrentRole] = useState<'dm' | 'player'>('dm');
  const [activePlayerId, setActivePlayerId] = useState<string>('char-1');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('enemy-1');
  const [splitView, setSplitView] = useState<boolean>(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [soundActive, setSoundActiveState] = useState<boolean>(true);

  // Room Management & Player Identity
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(getStoredRoomCode);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [playerId] = useState<string>(getOrCreatePlayerSessionId);
  const [playerName, setPlayerName] = useState<string>(getStoredPlayerName);
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('autostart=1')) {
      return false;
    }
    return !getStoredRoomCode();
  });
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState<boolean>(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Modals
  const [cardModalCombatant, setCardModalCombatant] = useState<Combatant | null>(null);
  const [isAddEnemyOpen, setIsAddEnemyOpen] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [counterModalData, setCounterModalData] = useState<{
    actor: Combatant;
    target?: Combatant;
    targets?: Combatant[];
    template?: AoETemplate;
  } | null>(null);
  const [statusPickerTarget, setStatusPickerTarget] = useState<Combatant | null>(null);
  const [initiativeModalResults, setInitiativeModalResults] = useState<InitiativeRollResult[]>([]);
  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState<boolean>(false);
  const [isGlobalEffectsOpen, setIsGlobalEffectsOpen] = useState<boolean>(false);
  const [isDiceRollerOpen, setIsDiceRollerOpen] = useState<boolean>(false);
  const [isEncounterManagerOpen, setIsEncounterManagerOpen] = useState<boolean>(false);
  const [isDMNotesOpen, setIsDMNotesOpen] = useState<boolean>(false);
  const [isDMNotesPinned, setIsDMNotesPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jrpg_dm_notes_pinned') === 'true';
    } catch {
      return false;
    }
  });
  const [isBattleChatOpen, setIsBattleChatOpen] = useState<boolean>(false);
  const [isBattleChatPinned, setIsBattleChatPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jrpg_battle_chat_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDMNotesPin = () => {
    setIsDMNotesPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('jrpg_dm_notes_pinned', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleBattleChatPin = () => {
    setIsBattleChatPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('jrpg_battle_chat_pinned', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Victory fanfare ref guard
  const victoryCelebratedRef = useRef(false);
  const activeRoomCodeRef = useRef<string | null>(activeRoomCode);
  activeRoomCodeRef.current = activeRoomCode;

  // Startup verification of Firestore
  useEffect(() => {
    testFirestoreConnection().catch((err) => {
      console.warn('Firestore initialization notice:', err);
    });
  }, []);

  // Central persistence helper: updates local state, broadcast channel, and Firestore room
  const persistEncounter = (nextState: EncounterState) => {
    setEncounter(nextState);
    saveAndBroadcastEncounter(nextState, true);
    if (activeRoomCodeRef.current) {
      syncEncounterToRoom(activeRoomCodeRef.current, nextState).catch((err) => {
        console.error('Failed to sync encounter to Firestore room:', err);
      });
    }
  };

  // Broadcast dice rolls to battle log
  const handleBroadcastDiceRoll = (rollText: string) => {
    const author = currentRole === 'dm' ? 'Dungeon Master' : (activePlayer?.name || playerName || 'Jugador');
    const log = createCombatLog(author, 'Mesa', 'Tirada de Dados', 'roll', 0, false, rollText);
    persistEncounter({
      ...encounter,
      log: [log, ...encounter.log],
    });
  };

  // Broadcast chat message to battle log
  const handleSendChatMessage = (text: string) => {
    const author = currentRole === 'dm' ? 'Dungeon Master' : (activePlayer?.name || playerName || 'Jugador');
    const log = createCombatLog(author, 'Mesa', text, 'chat', 0, false, text);
    persistEncounter({
      ...encounter,
      log: [log, ...encounter.log],
    });
  };

  // Load custom or preset encounter
  const handleLoadEncounter = (newEncounter: EncounterState) => {
    persistEncounter(newEncounter);
    setIsEncounterManagerOpen(false);
    setBannerNotice(`Encuentro "${newEncounter.title}" cargado con éxito`);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  // Save DM rich text notes synchronized in real-time with encounter state
  const handleSaveDMNotes = (newNotes: string) => {
    persistEncounter({
      ...encounter,
      dmNotes: newNotes,
      lastUpdated: Date.now(),
    });
  };

  // Reconnect to active room if stored
  useEffect(() => {
    if (activeRoomCode) {
      fetchRoomFromFirestore(activeRoomCode)
        .then((fetched) => {
          if (fetched) {
            setRoomData(fetched);
            setEncounter(fetched.encounter);
          } else {
            // Room no longer exists
            setActiveRoomCode(null);
            setStoredRoomCode(null);
          }
        })
        .catch((err) => {
          console.error('Error fetching room on load:', err);
        });
    }
  }, [activeRoomCode]);

  // Real-time Firestore room subscription
  useEffect(() => {
    if (!activeRoomCode) return;

    const unsubscribe = subscribeToRoom(
      activeRoomCode,
      (updatedRoom) => {
        setRoomData(updatedRoom);
        if (updatedRoom.encounter) {
          setEncounter(updatedRoom.encounter);
        }

        // Automatic token claim resolution for players
        if (currentRole === 'player' && updatedRoom.claimedTokens) {
          const myClaim = Object.entries(updatedRoom.claimedTokens).find(
            ([_, claim]) => claim.playerId === playerId
          );

          if (myClaim) {
            setActivePlayerId(myClaim[0]);
          } else {
            // Prompt token selection if player has no token yet
            setIsTokenSelectOpen(true);
          }
        }
      },
      (err) => {
        console.error('Room subscription error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeRoomCode, currentRole, playerId]);

  // Subscribe to local BroadcastChannel and storage events
  useEffect(() => {
    const unsubscribe = subscribeToSync(
      (nextState) => {
        setEncounter(nextState);
      },
      (floatEffect) => {
        setFloatingNumbers((prev) => [...prev, floatEffect]);
        if (floatEffect.type === 'damage') {
          playAttackSoundByDamageType(floatEffect.damageType);
        } else if (floatEffect.type === 'heal') {
          playHealSound();
        }
        setTimeout(() => {
          setFloatingNumbers((prev) => prev.filter((f) => f.id !== floatEffect.id));
        }, 1600);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync activePlayerId if combatants change and no claim is enforcing it
  const players = encounter.combatants.filter((c) => c.type === 'player');
  useEffect(() => {
    if (!players.some((p) => p.id === activePlayerId) && players.length > 0) {
      setActivePlayerId(players[0].id);
    }
  }, [players, activePlayerId]);

  // Check victory celebration
  useEffect(() => {
    const won = isEncounterWon(encounter.combatants);
    if (won && !victoryCelebratedRef.current) {
      victoryCelebratedRef.current = true;
      playVictoryFanfare();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // confetti fallback
      }
    } else if (!won) {
      victoryCelebratedRef.current = false;
    }
  }, [encounter.combatants]);

  // Room actions: Create, Join, Leave
  const handleCreateRoom = async (code: string) => {
    playMenuBlip();
    const created = await createRoomInFirestore(code, playerId, encounter);
    setRoomData(created);
    setActiveRoomCode(created.code);
    setCurrentRole('dm');
    setBannerNotice(`¡Sala ${created.code} creada con éxito! Comparte el código con tus jugadores.`);
    setTimeout(() => setBannerNotice(null), 5000);
  };

  const handleJoinRoom = async (code: string, nickname: string) => {
    playMenuBlip();
    const fetched = await fetchRoomFromFirestore(code);
    if (!fetched) {
      throw new Error(`La sala "${code}" no existe en Firestore. Verifica el código con tu DM.`);
    }

    setStoredRoomCode(code);
    setStoredPlayerName(nickname);
    setPlayerName(nickname);
    setActiveRoomCode(code);
    setRoomData(fetched);
    setEncounter(fetched.encounter);
    setCurrentRole('player');

    // Check if player already has a claimed token
    const myClaim = Object.entries(fetched.claimedTokens || {}).find(
      ([_, claim]) => claim.playerId === playerId
    );

    if (myClaim) {
      setActivePlayerId(myClaim[0]);
    } else {
      setIsTokenSelectOpen(true);
    }

    setBannerNotice(`¡Conectado a la sala ${code} en Modo Jugador!`);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleLeaveRoom = () => {
    playMenuBlip();
    setActiveRoomCode(null);
    setStoredRoomCode(null);
    setRoomData(null);
    setBannerNotice('Has salido de la sala. Ahora estás en modo local.');
    setTimeout(() => setBannerNotice(null), 3500);
  };

  // Player token claim handlers (1 token per player)
  const handleSelectToken = async (combatantId: string) => {
    playMenuBlip();
    setActivePlayerId(combatantId);
    if (activeRoomCode) {
      await claimTokenInRoom(activeRoomCode, combatantId, playerId, playerName || 'Jugador');
    }
    const token = encounter.combatants.find((c) => c.id === combatantId);
    setBannerNotice(`¡Ficha ${token?.name || combatantId} seleccionada!`);
    setTimeout(() => setBannerNotice(null), 3500);
  };

  const handleCreateAndClaimToken = async (newCombatant: Combatant) => {
    playMenuBlip();
    setActivePlayerId(newCombatant.id);
    if (activeRoomCode) {
      await createAndClaimPlayerTokenInRoom(
        activeRoomCode,
        newCombatant,
        playerId,
        playerName || newCombatant.name
      );
    } else {
      const nextCombatants = [...encounter.combatants, newCombatant];
      const nextTurnOrder = [...encounter.turnOrder, newCombatant.id];
      persistEncounter({
        ...encounter,
        combatants: nextCombatants,
        turnOrder: nextTurnOrder,
      });
    }
    setBannerNotice(`¡Ficha "${newCombatant.name}" creada y lista para el combate!`);
    setTimeout(() => setBannerNotice(null), 3500);
  };

  // Turn management handlers (Controlled manually by DM / host)
  const handleAdvanceTurn = () => {
    playMenuBlip();
    const nextState = advanceTurn(encounter);
    persistEncounter(nextState);
  };

  const handleRetreatTurn = () => {
    playMenuBlip();
    const nextState = retreatTurn(encounter);
    persistEncounter(nextState);
  };

  // Save custom combat order with manual initiative values from the DM
  const handleSaveOrder = (
    newOrder: string[],
    surpriseSide: 'players' | 'enemies' | null,
    updatedInitiatives?: Record<string, number>
  ) => {
    playMenuBlip();
    const nextCombatants = encounter.combatants.map((c) => {
      if (updatedInitiatives && updatedInitiatives[c.id] !== undefined) {
        return { ...c, initiative: updatedInitiatives[c.id] };
      }
      return c;
    });

    const log = createCombatLog(
      'DM (Mesa)',
      'Iniciativa',
      'El DM ha registrado manualmente las iniciativas de la mesa y ordenado los turnos',
      'system',
      0
    );

    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      turnOrder: newOrder,
      activeTurnIndex: 0,
      round: 1,
      isSurpriseRound: surpriseSide !== null,
      surpriseSide,
      log: [log, ...encounter.log],
      lastUpdated: Date.now(),
    };
    persistEncounter(nextState);
    setBannerNotice('¡Iniciativas registradas manualmente por el DM! Orden de combate actualizado.');
    setTimeout(() => setBannerNotice(null), 4500);
  };

  // Add enemy handler
  const handleAddEnemy = (newEnemy: Combatant) => {
    const nextCombatants = [...encounter.combatants, newEnemy];
    const nextTurnOrder = [...encounter.turnOrder, newEnemy.id];
    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      turnOrder: nextTurnOrder,
      lastUpdated: Date.now(),
    };
    persistEncounter(nextState);
  };

  // Save edited character card (HP actual, HP máximo, resistencias)
  const handleSaveCard = (updated: Combatant) => {
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === updated.id ? updated : c
    );
    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      lastUpdated: Date.now(),
    };
    persistEncounter(nextState);
  };

  // Apply damage from 3-digit counter (Supports physical/magical damage types, resistances, and multi-target AoE)
  const handleApplyDamageFromCounter = (
    amount: number,
    damageType: DamageType = 'cortante',
    targetIds?: string[]
  ) => {
    if (!counterModalData) return;
    const { actor, target, targets } = counterModalData;
    const activeTargets = targets && targets.length > 0 ? targets : target ? [target] : [];
    if (activeTargets.length === 0) return;

    const targetCombatants = encounter.combatants.filter((c) =>
      targetIds && targetIds.length > 0
        ? targetIds.includes(c.id)
        : activeTargets.some((at) => at.id === c.id)
    );

    playAttackSoundByDamageType(damageType);
    const newLogs: CombatLogEntry[] = [];
    let nextCombatants = [...encounter.combatants];

    targetCombatants.forEach((t) => {
      const { updated, actualDamage, isResisted } = applyDamage(t, amount, damageType, encounter.activeGlobalEffects);

      broadcastFloatingEffect({
        id: `float-${Date.now()}-${t.id}`,
        targetId: t.id,
        amount: actualDamage,
        playerDisplayAmount: amount, // Daño completo para los jugadores sin revelar resistencia
        type: 'damage',
        damageType,
      });

      const actionTitle = targets && targets.length > 1
        ? `Daño en Área (${damageType})`
        : `Daño (${damageType})`;

      const resistanceNote = isResisted ? '🛡️ Resistencia: Recibe solo la mitad del daño' : undefined;

      const log = createCombatLog(
        actor.name,
        t.name,
        actionTitle,
        'damage',
        actualDamage,
        false,
        resistanceNote,
        damageType,
        isResisted,
        amount // playerAmount
      );

      newLogs.push(log);
      nextCombatants = nextCombatants.map((c) => (c.id === t.id ? updated : c));
    });

    persistEncounter({
      ...encounter,
      combatants: nextCombatants,
      log: [...newLogs, ...encounter.log],
    });
  };

  // Apply heal from 3-digit counter (Supports single target and multi-target AoE)
  const handleApplyHealFromCounter = (amount: number, targetIds?: string[]) => {
    if (!counterModalData) return;
    const { actor, target, targets } = counterModalData;
    const activeTargets = targets && targets.length > 0 ? targets : target ? [target] : [];
    if (activeTargets.length === 0) return;

    const targetCombatants = encounter.combatants.filter((c) =>
      targetIds && targetIds.length > 0
        ? targetIds.includes(c.id)
        : activeTargets.some((at) => at.id === c.id)
    );

    playHealSound();
    const newLogs: CombatLogEntry[] = [];
    let nextCombatants = [...encounter.combatants];

    targetCombatants.forEach((t) => {
      const { updated, actualHealed } = applyHeal(t, amount, encounter.activeGlobalEffects);

      broadcastFloatingEffect({
        id: `float-${Date.now()}-${t.id}`,
        targetId: t.id,
        amount: actualHealed,
        type: 'heal',
      });

      const actionTitle = targets && targets.length > 1
        ? `Curación en Área`
        : `Curación (${amount} HP)`;

      const log = createCombatLog(
        actor.name,
        t.name,
        actionTitle,
        'heal',
        actualHealed,
        false
      );

      newLogs.push(log);
      nextCombatants = nextCombatants.map((c) => (c.id === t.id ? updated : c));
    });

    persistEncounter({
      ...encounter,
      combatants: nextCombatants,
      log: [...newLogs, ...encounter.log],
    });
  };

  // Apply temporary HP from 3-digit counter
  const handleApplyTempHpFromCounter = (amount: number, targetIds?: string[]) => {
    if (!counterModalData) return;
    const { actor, target, targets } = counterModalData;
    const activeTargets = targets && targets.length > 0 ? targets : target ? [target] : [];
    if (activeTargets.length === 0) return;

    const targetCombatants = encounter.combatants.filter((c) =>
      targetIds && targetIds.length > 0
        ? targetIds.includes(c.id)
        : activeTargets.some((at) => at.id === c.id)
    );

    playHealSound();
    const newLogs: CombatLogEntry[] = [];
    let nextCombatants = [...encounter.combatants];

    targetCombatants.forEach((t) => {
      const { updated } = applyTempHp(t, amount);

      broadcastFloatingEffect({
        id: `float-${Date.now()}-${t.id}`,
        targetId: t.id,
        amount,
        type: 'heal',
      });

      const log = createCombatLog(
        actor.name,
        t.name,
        `+${amount} HP Temporal`,
        'heal',
        amount,
        false,
        '🛡️ Los puntos de vida temporales absorben daño primero'
      );

      newLogs.push(log);
      nextCombatants = nextCombatants.map((c) => (c.id === t.id ? updated : c));
    });

    persistEncounter({
      ...encounter,
      combatants: nextCombatants,
      log: [...newLogs, ...encounter.log],
    });
  };

  // Save Altered Statuses
  const handleSaveStatuses = (targetId: string, updatedStatuses: string[]) => {
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === targetId ? { ...c, statusEffects: updatedStatuses } : c
    );
    persistEncounter({
      ...encounter,
      combatants: nextCombatants,
    });
  };

  // Clear combat log
  const handleClearLog = () => {
    persistEncounter({
      ...encounter,
      log: [],
    });
  };

  // Reset entire encounter:
  // - Fully restores all combatants to 100% max health
  // - Restores positions and resets round to 1
  // - Prompts DM to enter physical tabletop initiative rolls manually
  const handleResetEncounter = () => {
    playMenuBlip();
    const currentList =
      encounter.combatants && encounter.combatants.length > 0
        ? encounter.combatants
        : INITIAL_COMBATANTS;

    const baseEncounter: EncounterState = {
      ...encounter,
      combatants: currentList,
    };

    // Auto-roll is disabled: DM will set tabletop initiatives manually
    const { nextEncounter } = resetEncounterToFull(baseEncounter, {
      autoRollInitiative: false,
      resetFormation: true,
      clearStatuses: false,
    });

    persistEncounter(nextEncounter);

    // Open the manual initiative entry modal so the DM can input the players' tabletop rolls
    setIsOrderModalOpen(true);

    setBannerNotice('¡Encuentro reiniciado al 100% de HP! Introduce las iniciativas de la mesa presencial.');
    setTimeout(() => setBannerNotice(null), 4500);
  };

  // Update token position on grid
  const handleUpdateCombatantPosition = (combatantId: string, col: number, row: number) => {
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === combatantId ? { ...c, gridPosition: { col, row } } : c
    );
    persistEncounter({
      ...encounter,
      combatants: nextCombatants,
    });
  };

  // Batch update combatants (Tactical Formation Reset, Concentration toggles, etc.)
  const handleBatchUpdateCombatants = (updatedCombatants: Combatant[]) => {
    persistEncounter({
      ...encounter,
      combatants: updatedCombatants,
    });
  };

  // Open character sheet card modal (DM can open any; player can only open their own claimed token)
  const handleOpenCard = (c: Combatant) => {
    if (currentRole === 'dm' || c.id === activePlayerId) {
      setCardModalCombatant(c);
    }
  };

  const activePlayer = encounter.combatants.find((c) => c.id === activePlayerId);
  const isWon = isEncounterWon(encounter.combatants);
  const isWiped = isPartyWiped(encounter.combatants);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-200 flex flex-col font-sans selection:bg-purple-600 selection:text-white overflow-x-hidden">
      {/* Header Bar */}
      <HeaderBar
        currentRole={currentRole}
        activePlayerId={activePlayerId}
        encounter={encounter}
        players={players}
        splitView={splitView}
        activeRoomCode={activeRoomCode}
        onSelectRole={(role) => setCurrentRole(role)}
        onSelectPlayer={(id) => setActivePlayerId(id)}
        onToggleSplitView={() => setSplitView((prev) => !prev)}
        onResetEncounter={handleResetEncounter}
        onSoundToggle={() => setSoundActiveState((prev) => !prev)}
        soundActive={soundActive}
        onOpenRoomLobby={() => setIsRoomLobbyOpen(true)}
        onOpenTokenSelect={() => setIsTokenSelectOpen(true)}
        onOpenCharacterSheet={() => {
          if (activePlayer) handleOpenCard(activePlayer);
        }}
        onOpenGlobalEffects={() => setIsGlobalEffectsOpen(true)}
        onOpenDiceRoller={() => setIsDiceRollerOpen(true)}
        onOpenEncounterManager={() => setIsEncounterManagerOpen(true)}
        onOpenDMNotes={() => setIsDMNotesOpen((prev) => !prev)}
        isDMNotesOpen={isDMNotesOpen}
        onToggleChat={() => setIsBattleChatOpen((prev) => !prev)}
        isChatOpen={isBattleChatOpen}
        chatCount={encounter.log.length}
      />

      {/* Real-time Banner Notice */}
      {bannerNotice && (
        <div className="bg-[#121422] border-b border-purple-500/30 py-1.5 px-4 text-center text-xs font-mono font-bold text-purple-200 flex items-center justify-center gap-2 shadow-md animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-4 pb-28 overflow-x-hidden transition-all duration-300 ${
          isDMNotesOpen && isDMNotesPinned
            ? 'xl:mr-[540px]'
            : isBattleChatOpen && isBattleChatPinned
            ? 'xl:mr-[490px]'
            : ''
        }`}
      >
        {/* Victory or Party Wipe Banner */}
        {isWon && (
          <div className="bg-[#151208]/95 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-200 shadow-xl shadow-amber-950/40 ring-1 ring-amber-500/20 animate-fade-in">
            <div className="flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase font-mono">
                  ¡Victoria! ¡El encuentro ha concluido!
                </h2>
                <p className="text-xs text-amber-300/80 font-mono">
                  Todos los enemigos han caído. Fanfarria de victoria activada.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetEncounter}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>
        )}

        {isWiped && (
          <div className="bg-[#160d0f]/95 border border-red-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 text-red-200 shadow-xl shadow-red-950/40 ring-1 ring-red-500/20 animate-fade-in">
            <div className="flex items-center gap-3">
              <Skull className="w-7 h-7 text-red-400 shrink-0 animate-pulse" />
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase font-mono">
                  ¡Derrota! El grupo ha sido abatido
                </h2>
                <p className="text-xs text-red-300/80 font-mono">
                  Todos los personajes jugadores han caído a 0 HP.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetEncounter}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>
        )}

        {/* Turn Order Ribbon (Always Visible at Top of Battle) */}
        <TurnOrderRibbon
          encounter={encounter}
          onAdvanceTurn={handleAdvanceTurn}
          onRetreatTurn={handleRetreatTurn}
          onOpenOrderModal={() => setIsOrderModalOpen(true)}
          isDMView={currentRole === 'dm'}
          activePlayerId={activePlayerId}
          onOpenGlobalEffects={() => setIsGlobalEffectsOpen(true)}
        />

        {/* Quick Dice Bar directly underneath Turn Order Ribbon */}
        <QuickDiceBar
          onOpenDiceRoller={() => setIsDiceRollerOpen(true)}
          onBroadcastRoll={handleBroadcastDiceRoll}
          senderName={currentRole === 'dm' ? 'Dungeon Master' : (activePlayer?.name || playerName)}
        />

        {/* Main Combat Stage: Split Screen or Single Role View */}
        {splitView ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <div className="px-3 py-1 bg-[#14121a] border border-amber-600/40 rounded-lg text-amber-200 text-xs font-mono font-bold flex items-center justify-between">
                <span>Pantalla del DM (Control Total)</span>
                <span className="text-[10px] text-amber-400">Host / Árbitro</span>
              </div>
              <JRPGEncounterArena
                combatants={encounter.combatants}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
                floatingNumbers={floatingNumbers}
                isDMView={true}
                activePlayerId={activePlayerId}
                activeTurnCombatantId={encounter.turnOrder[encounter.activeTurnIndex]}
                currentTurnPhase={encounter.turnPhase || 'start'}
                environment={encounter.environment}
                onOpenCard={handleOpenCard}
                onInitiateAction={(actor, target) => setCounterModalData({ actor, target })}
                onInitiateAoEAction={(actor, targets, template) => setCounterModalData({ actor, targets, template })}
                onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                onUpdateCombatantPosition={handleUpdateCombatantPosition}
                onBatchUpdateCombatants={handleBatchUpdateCombatants}
                onAdvanceTurn={handleAdvanceTurn}
                onResetEncounter={handleResetEncounter}
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
              />
              <DMScreenPanel
                encounter={encounter}
                onOpenAddEnemyModal={() => setIsAddEnemyOpen(true)}
                onOpenCharacterSheet={handleOpenCard}
                onSelectTarget={setSelectedTargetId}
                selectedTargetId={selectedTargetId}
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
                onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                onOpenDMNotes={() => setIsDMNotesOpen(true)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="px-3 py-1 bg-[#12131d] border border-purple-500/30 rounded-lg text-purple-200 text-xs font-mono font-bold flex items-center justify-between">
                <span>Vista del Jugador ({activePlayer?.name})</span>
                <span className="text-[10px] text-purple-400">Modo Jugador</span>
              </div>
              <JRPGEncounterArena
                combatants={encounter.combatants}
                selectedTargetId={selectedTargetId}
                onSelectTarget={setSelectedTargetId}
                floatingNumbers={floatingNumbers}
                isDMView={false}
                activePlayerId={activePlayerId}
                activeTurnCombatantId={encounter.turnOrder[encounter.activeTurnIndex]}
                currentTurnPhase={encounter.turnPhase || 'start'}
                environment={encounter.environment}
                onOpenCard={handleOpenCard}
                onInitiateAction={(actor, target) => setCounterModalData({ actor, target })}
                onInitiateAoEAction={(actor, targets, template) => setCounterModalData({ actor, targets, template })}
                onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                onUpdateCombatantPosition={handleUpdateCombatantPosition}
                onBatchUpdateCombatants={handleBatchUpdateCombatants}
                onAdvanceTurn={handleAdvanceTurn}
                onResetEncounter={handleResetEncounter}
              />
              {activePlayer && (
                <PlayerCombatPanel
                  player={activePlayer}
                  encounter={encounter}
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={setSelectedTargetId}
                  onOpenCharacterSheet={handleOpenCard}
                  onAdvanceTurn={handleAdvanceTurn}
                  onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                  onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                  onOpenTokenSelect={() => setIsTokenSelectOpen(true)}
                  onUpdateEncounter={persistEncounter}
                />
              )}
            </div>
          </div>
        ) : (
          /* Normal Single Role View */
          <div className="flex flex-col gap-4">
            {/* Visual Arena Map */}
            <JRPGEncounterArena
              combatants={encounter.combatants}
              selectedTargetId={selectedTargetId}
              onSelectTarget={setSelectedTargetId}
              floatingNumbers={floatingNumbers}
              isDMView={currentRole === 'dm'}
              activePlayerId={activePlayerId}
              activeTurnCombatantId={encounter.turnOrder[encounter.activeTurnIndex]}
              currentTurnPhase={encounter.turnPhase || 'start'}
              environment={encounter.environment}
              onOpenCard={handleOpenCard}
              onInitiateAction={(actor, target) => setCounterModalData({ actor, target })}
              onInitiateAoEAction={(actor, targets, template) => setCounterModalData({ actor, targets, template })}
              onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
              onUpdateCombatantPosition={handleUpdateCombatantPosition}
              onBatchUpdateCombatants={handleBatchUpdateCombatants}
              onAdvanceTurn={handleAdvanceTurn}
              onResetEncounter={handleResetEncounter}
              onOpenOrderModal={() => setIsOrderModalOpen(true)}
            />

            {/* Role Specific Command Panel */}
            {currentRole === 'dm' ? (
              <DMScreenPanel
                encounter={encounter}
                onOpenAddEnemyModal={() => setIsAddEnemyOpen(true)}
                onOpenCharacterSheet={handleOpenCard}
                onSelectTarget={setSelectedTargetId}
                selectedTargetId={selectedTargetId}
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
                onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                onOpenDMNotes={() => setIsDMNotesOpen(true)}
              />
            ) : (
              activePlayer && (
                <PlayerCombatPanel
                  player={activePlayer}
                  encounter={encounter}
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={setSelectedTargetId}
                  onOpenCharacterSheet={handleOpenCard}
                  onAdvanceTurn={handleAdvanceTurn}
                  onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                  onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                  onOpenTokenSelect={() => setIsTokenSelectOpen(true)}
                  onUpdateEncounter={persistEncounter}
                />
              )
            )}
          </div>
        )}
      </main>

      {/* Room Lobby Modal (DM room creation, player room joining) */}
      <RoomLobbyModal
        isOpen={isRoomLobbyOpen}
        activeRoom={roomData}
        currentRole={currentRole}
        playerName={playerName}
        onClose={() => setIsRoomLobbyOpen(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onLeaveRoom={handleLeaveRoom}
        onPlayLocal={() => {
          handleLeaveRoom();
          setIsRoomLobbyOpen(false);
        }}
      />

      {/* Player Token Selection Modal (Choose existing or create new token: 1 per player) */}
      <PlayerTokenSelectionModal
        isOpen={isTokenSelectOpen}
        combatants={encounter.combatants}
        claimedTokens={roomData?.claimedTokens}
        playerId={playerId}
        playerName={playerName || 'Jugador'}
        activePlayerId={activePlayerId}
        onSelectToken={handleSelectToken}
        onCreateAndClaimToken={handleCreateAndClaimToken}
        onOpenCharacterSheet={(c) => {
          setCardModalCombatant(c);
          setIsTokenSelectOpen(false);
        }}
        onClose={() => setIsTokenSelectOpen(false)}
      />

      {/* 3-Digit Damage & Heal Counter Modal (Triggered by Hearthstone Arrow or Target Action or AoE Detonation) */}
      {counterModalData && (
        <ThreeDigitCounterModal
          isOpen={true}
          actor={counterModalData.actor}
          target={counterModalData.target}
          targets={counterModalData.targets}
          isDM={currentRole === 'dm'}
          onApplyDamage={handleApplyDamageFromCounter}
          onApplyHeal={handleApplyHealFromCounter}
          onApplyTempHp={handleApplyTempHpFromCounter}
          onClose={() => setCounterModalData(null)}
        />
      )}

      {/* Altered Status Effects Picker Modal */}
      {statusPickerTarget && (
        <StatusPickerModal
          isOpen={true}
          actorName={currentRole === 'dm' ? 'DM' : activePlayer?.name || 'Jugador'}
          target={statusPickerTarget}
          isDM={currentRole === 'dm'}
          onSaveStatuses={handleSaveStatuses}
          onClose={() => setStatusPickerTarget(null)}
        />
      )}

      {/* Combat Order Configuration Modal */}
      {isOrderModalOpen && (
        <CombatOrderModal
          isOpen={true}
          encounter={encounter}
          onSaveOrder={handleSaveOrder}
          onClose={() => setIsOrderModalOpen(false)}
        />
      )}

      {/* Character Sheet Modal (Editable HP & Resistances) */}
      {cardModalCombatant && (
        <CharacterCardModal
          combatant={cardModalCombatant}
          isOpen={true}
          onClose={() => setCardModalCombatant(null)}
          onSave={handleSaveCard}
          isDM={currentRole === 'dm'}
        />
      )}

      {/* Add Enemy Modal */}
      {isAddEnemyOpen && (
        <AddEnemyModal
          isOpen={true}
          onClose={() => setIsAddEnemyOpen(false)}
          onAddEnemy={handleAddEnemy}
        />
      )}

      {/* Modal de Tiradas de Iniciativa Automáticas */}
      <InitiativeRollModal
        isOpen={isInitiativeModalOpen}
        results={initiativeModalResults}
        onClose={() => setIsInitiativeModalOpen(false)}
      />

      {/* Modal de Efectos Ambientales Globales */}
      <GlobalEffectsModal
        isOpen={isGlobalEffectsOpen}
        activeEffects={encounter.activeGlobalEffects || []}
        isDM={currentRole === 'dm'}
        onToggleEffect={(effectId) => {
          const updated = toggleGlobalEffectInEncounter(encounter, effectId);
          persistEncounter(updated);
        }}
        onClearAll={() => {
          const updated = clearAllGlobalEffectsInEncounter(encounter);
          persistEncounter(updated);
        }}
        onClose={() => setIsGlobalEffectsOpen(false)}
      />

      {/* Bandeja de Dados Rápida Universal */}
      <QuickDiceRoller
        isOpen={isDiceRollerOpen}
        onClose={() => setIsDiceRollerOpen(false)}
        onBroadcastRoll={handleBroadcastDiceRoll}
        senderName={currentRole === 'dm' ? 'Dungeon Master' : (activePlayer?.name || playerName)}
      />

      {/* Gestor de Múltiples Encuentros (Plantillas, Guardar, Exportar e Importar JSON) */}
      <EncounterManagerModal
        isOpen={isEncounterManagerOpen}
        onClose={() => setIsEncounterManagerOpen(false)}
        currentEncounter={encounter}
        onLoadEncounter={handleLoadEncounter}
      />

      {/* Floating DM Notes Tab on right screen edge */}
      {currentRole === 'dm' && !isDMNotesOpen && (
        <button
          type="button"
          onClick={() => {
            playMenuBlip();
            setIsDMNotesOpen(true);
          }}
          className="fixed right-0 top-[38%] -translate-y-1/2 z-30 bg-gradient-to-l from-amber-950/90 via-[#181926]/95 to-[#12131b]/95 hover:from-amber-900/90 text-amber-300 border-l border-t border-b border-amber-500/50 py-3 px-2 rounded-l-xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 group transition-all cursor-pointer hover:pl-3"
          title="Abrir cuaderno de Notas del DM (Hilos argumentales y secretos)"
          aria-label="Abrir Notas del DM"
        >
          <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-mono font-bold tracking-wider uppercase text-amber-200/90">
            Notas DM
          </span>
          {encounter.dmNotes && encounter.dmNotes.trim().length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      )}

      {/* DM Notes Lateral Drawer */}
      {currentRole === 'dm' && (
        <DMNotesDrawer
          isOpen={isDMNotesOpen}
          onClose={() => setIsDMNotesOpen(false)}
          encounterTitle={encounter.title}
          notes={encounter.dmNotes || ''}
          onSaveNotes={handleSaveDMNotes}
          isPinned={isDMNotesPinned}
          onTogglePin={handleToggleDMNotesPin}
        />
      )}

      {/* Battle Chat & Damage Log Lateral Drawer (with right edge sticker when closed) */}
      <BattleChatSidebar
        log={encounter.log}
        onClearLog={handleClearLog}
        onSendMessage={handleSendChatMessage}
        onBroadcastRoll={handleBroadcastDiceRoll}
        isDMView={currentRole === 'dm'}
        senderName={currentRole === 'dm' ? 'Dungeon Master' : (activePlayer?.name || playerName || 'Jugador')}
        isOpen={isBattleChatOpen}
        onClose={() => setIsBattleChatOpen(false)}
        onToggleOpen={() => setIsBattleChatOpen((prev) => !prev)}
        isPinned={isBattleChatPinned}
        onTogglePin={handleToggleBattleChatPin}
      />
    </div>
  );
}
