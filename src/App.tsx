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

import { Trophy, Skull, RotateCcw, Check, Radio } from 'lucide-react';

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
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState<boolean>(() => !getStoredRoomCode());
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

    playSlashSound();
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
      />

      {/* Real-time Banner Notice */}
      {bannerNotice && (
        <div className="bg-[#121422] border-b border-purple-500/30 py-1.5 px-4 text-center text-xs font-mono font-bold text-purple-200 flex items-center justify-center gap-2 shadow-md animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-4 pb-28 overflow-x-hidden">
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

        {/* Split Screen Mode: Render both DM Screen and Player Panel in parallel */}
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

        {/* Live Combat Log Drawer at bottom */}
        <CombatLogDrawer
          log={encounter.log}
          onClearLog={handleClearLog}
          isDMView={currentRole === 'dm'}
        />
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
    </div>
  );
}
