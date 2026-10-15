import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Combatant,
  EncounterState,
  FloatingNumber,
} from './types/combat.ts';
import {
  loadEncounterState,
  saveAndBroadcastEncounter,
  subscribeToSync,
  broadcastFloatingEffect,
  resetEncounterState,
} from './utils/syncManager.ts';
import {
  advanceTurn,
  retreatTurn,
  applyDamage,
  applyHeal,
  createCombatLog,
  isEncounterWon,
  isPartyWiped,
} from './utils/combatLogic.ts';
import {
  isSoundEnabled,
  setSoundEnabled,
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

import { Trophy, Skull, RotateCcw } from 'lucide-react';

export default function App() {
  const [encounter, setEncounter] = useState<EncounterState>(loadEncounterState);
  const [currentRole, setCurrentRole] = useState<'dm' | 'player'>('dm');
  const [activePlayerId, setActivePlayerId] = useState<string>('char-1');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('enemy-1');
  const [splitView, setSplitView] = useState<boolean>(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [soundActive, setSoundActiveState] = useState<boolean>(true);

  // Modals
  const [cardModalCombatant, setCardModalCombatant] = useState<Combatant | null>(null);
  const [isAddEnemyOpen, setIsAddEnemyOpen] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [counterModalData, setCounterModalData] = useState<{ actor: Combatant; target: Combatant } | null>(null);
  const [statusPickerTarget, setStatusPickerTarget] = useState<Combatant | null>(null);

  // Victory fanfare ref guard
  const victoryCelebratedRef = useRef(false);

  // Subscribe to real-time BroadcastChannel and storage events
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

  // Sync activePlayerId if combatants change
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

  // Turn management handlers (Controlled manually by DM / host)
  const handleAdvanceTurn = () => {
    playMenuBlip();
    const nextState = advanceTurn(encounter);
    saveAndBroadcastEncounter(nextState, true);
  };

  const handleRetreatTurn = () => {
    playMenuBlip();
    const nextState = retreatTurn(encounter);
    saveAndBroadcastEncounter(nextState, true);
  };

  // Save custom combat order
  const handleSaveOrder = (newOrder: string[], surpriseSide: 'players' | 'enemies' | null) => {
    const nextState: EncounterState = {
      ...encounter,
      turnOrder: newOrder,
      activeTurnIndex: 0,
      round: 1,
      isSurpriseRound: surpriseSide !== null,
      surpriseSide,
      lastUpdated: Date.now(),
    };
    saveAndBroadcastEncounter(nextState, true);
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
    saveAndBroadcastEncounter(nextState, true);
  };

  // Save edited character card
  const handleSaveCard = (updated: Combatant) => {
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === updated.id ? updated : c
    );
    const nextState: EncounterState = {
      ...encounter,
      combatants: nextCombatants,
      lastUpdated: Date.now(),
    };
    saveAndBroadcastEncounter(nextState, true);
  };

  // Apply damage from 3-digit counter
  const handleApplyDamageFromCounter = (amount: number) => {
    if (!counterModalData) return;
    const { actor, target } = counterModalData;

    const { updated, actualDamage } = applyDamage(target, amount);
    playSlashSound();

    broadcastFloatingEffect({
      id: `float-${Date.now()}`,
      targetId: target.id,
      amount: actualDamage,
      type: 'damage',
    });

    const log = createCombatLog(
      actor.name,
      target.name,
      'Daño Presencial',
      'damage',
      actualDamage,
      false
    );

    const nextCombatants = encounter.combatants.map((c) =>
      c.id === target.id ? updated : c
    );

    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        log: [log, ...encounter.log],
      },
      true
    );
  };

  // Apply heal from 3-digit counter
  const handleApplyHealFromCounter = (amount: number) => {
    if (!counterModalData) return;
    const { actor, target } = counterModalData;

    const { updated, actualHealed } = applyHeal(target, amount);
    playHealSound();

    broadcastFloatingEffect({
      id: `float-${Date.now()}`,
      targetId: target.id,
      amount: actualHealed,
      type: 'heal',
    });

    const log = createCombatLog(
      actor.name,
      target.name,
      'Curación Presencial',
      'heal',
      actualHealed,
      false
    );

    const nextCombatants = encounter.combatants.map((c) =>
      c.id === target.id ? updated : c
    );

    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        log: [log, ...encounter.log],
      },
      true
    );
  };

  // Save updated altered status effects
  const handleSaveStatuses = (targetId: string, updatedStatuses: string[], notes: string) => {
    const target = encounter.combatants.find((c) => c.id === targetId);
    if (!target) return;

    playMenuBlip();
    const actorName = currentRole === 'dm' ? 'DM' : activePlayer?.name || 'Jugador';
    const log = createCombatLog(
      actorName,
      target.name,
      'Estados Alterados',
      'status',
      0,
      false,
      notes || `Estados: ${updatedStatuses.join(', ') || 'Ninguno'}`
    );

    const nextCombatants = encounter.combatants.map((c) =>
      c.id === targetId ? { ...c, statusEffects: updatedStatuses } : c
    );

    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        log: [log, ...encounter.log],
      },
      true
    );
  };

  // Clear combat log
  const handleClearLog = () => {
    playMenuBlip();
    saveAndBroadcastEncounter(
      {
        ...encounter,
        log: [],
      },
      true
    );
  };

  // Sound toggle
  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundEnabled(next);
    setSoundActiveState(next);
    if (next) playMenuBlip();
  };

  // Reset encounter
  const handleResetEncounter = () => {
    const fresh = resetEncounterState();
    setEncounter(fresh);
    if (fresh.combatants.length > 0) {
      setSelectedTargetId(fresh.combatants.find((c) => c.type === 'enemy')?.id || fresh.combatants[0].id);
    }
  };

  // Update combatant grid position on VTT map
  const handleUpdateCombatantPosition = (combatantId: string, col: number, row: number) => {
    const nextCombatants = encounter.combatants.map((c) =>
      c.id === combatantId ? { ...c, gridPosition: { col, row } } : c
    );
    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: nextCombatants,
        lastUpdated: Date.now(),
      },
      true
    );
  };

  // Batch update combatants (e.g. tactical formation reset)
  const handleBatchUpdateCombatants = (updatedCombatants: Combatant[]) => {
    saveAndBroadcastEncounter(
      {
        ...encounter,
        combatants: updatedCombatants,
        lastUpdated: Date.now(),
      },
      true
    );
  };

  const activePlayer = encounter.combatants.find((c) => c.id === activePlayerId) || players[0];
  const encounterWon = isEncounterWon(encounter.combatants);
  const partyWiped = isPartyWiped(encounter.combatants);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation & Role Bar */}
      <HeaderBar
        currentRole={currentRole}
        activePlayerId={activePlayerId}
        encounter={encounter}
        players={players}
        splitView={splitView}
        onSelectRole={setCurrentRole}
        onSelectPlayer={setActivePlayerId}
        onToggleSplitView={() => {
          playMenuBlip();
          setSplitView(!splitView);
        }}
        onResetEncounter={handleResetEncounter}
        onSoundToggle={handleToggleSound}
        soundActive={soundActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Victory / Defeat Banners */}
        {encounterWon && (
          <div className="bg-gradient-to-r from-amber-600/90 via-yellow-500/90 to-amber-700/90 border-2 border-yellow-300 rounded-2xl p-4 sm:p-5 text-slate-950 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-950 rounded-xl text-yellow-400 shadow">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-wide uppercase">
                  ¡VICTORIA! ¡El enemigo ha sido derrotado!
                </h3>
                <p className="text-sm font-medium text-slate-900">
                  Todos los monstruos han caído en el combate de la mesa.
                </p>
              </div>
            </div>
            <button
              onClick={handleResetEncounter}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-yellow-300 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nuevo Encuentro</span>
            </button>
          </div>
        )}

        {partyWiped && (
          <div className="bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-2 border-red-600 rounded-2xl p-4 sm:p-5 text-red-200 shadow-2xl flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <Skull className="w-8 h-8 text-red-500 shrink-0" />
              <div>
                <h3 className="font-black text-xl tracking-wide uppercase text-red-400">
                  DERROTA... El grupo ha caído
                </h3>
                <p className="text-sm text-slate-400">
                  Todos los héroes están inconscientes. ¡El DM puede revivirlos o reiniciar!
                </p>
              </div>
            </div>
            <button
              onClick={handleResetEncounter}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reiniciar</span>
            </button>
          </div>
        )}

        {/* Turn Order Tracker Ribbon */}
        <TurnOrderRibbon
          encounter={encounter}
          isDMView={currentRole === 'dm'}
          activePlayerId={activePlayerId}
          onAdvanceTurn={handleAdvanceTurn}
          onRetreatTurn={handleRetreatTurn}
          onOpenOrderModal={() => setIsOrderModalOpen(true)}
        />

        {/* Normal Single View or Split View Mode */}
        {splitView ? (
          /* Split View */
          <div className="flex flex-col gap-4">
            <div className="bg-indigo-950/60 border border-indigo-700/60 rounded-xl px-4 py-2 text-xs text-indigo-300 flex items-center justify-between">
              <span>
                <strong>Modo Dividido:</strong> Arrastra la flecha estilo Hearthstone desde cualquier token para abrir el contador de 3 dígitos (+/-).
              </span>
              <span className="font-mono text-[11px] text-indigo-400">Sincronizado</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {/* Left Column: DM VIEW */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  👑 Pantalla del DM (HP Visible de Todos)
                </span>
                <JRPGEncounterArena
                  combatants={encounter.combatants}
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={setSelectedTargetId}
                  floatingNumbers={floatingNumbers}
                  isDMView={true}
                  environment={encounter.environment}
                  onOpenCard={(c) => setCardModalCombatant(c)}
                  onInitiateAction={(actor, target) => setCounterModalData({ actor, target })}
                  onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                  onUpdateCombatantPosition={handleUpdateCombatantPosition}
                  onBatchUpdateCombatants={handleBatchUpdateCombatants}
                />
                <DMScreenPanel
                  encounter={encounter}
                  onOpenAddEnemyModal={() => setIsAddEnemyOpen(true)}
                  onOpenCharacterSheet={(c) => setCardModalCombatant(c)}
                  onSelectTarget={setSelectedTargetId}
                  selectedTargetId={selectedTargetId}
                  onOpenOrderModal={() => setIsOrderModalOpen(true)}
                  onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                  onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                />
              </div>

              {/* Right Column: PLAYER VIEW */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  ⚔️ Pantalla del Jugador: {activePlayer?.name} (HP Oculto)
                </span>
                <JRPGEncounterArena
                  combatants={encounter.combatants}
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={setSelectedTargetId}
                  floatingNumbers={floatingNumbers}
                  isDMView={false}
                  activePlayerId={activePlayerId}
                  environment={encounter.environment}
                  onOpenCard={(c) => setCardModalCombatant(c)}
                  onInitiateAction={(actor, target) => setCounterModalData({ actor, target })}
                  onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                  onUpdateCombatantPosition={handleUpdateCombatantPosition}
                  onBatchUpdateCombatants={handleBatchUpdateCombatants}
                />
                {activePlayer && (
                  <PlayerCombatPanel
                    player={activePlayer}
                    encounter={encounter}
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={setSelectedTargetId}
                    onOpenCharacterSheet={(c) => setCardModalCombatant(c)}
                    onAdvanceTurn={handleAdvanceTurn}
                    onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                    onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Single View */
          <div className="flex flex-col gap-5">
            {/* JRPG Arena Battlefield with Hearthstone Arrow Targeting */}
            <JRPGEncounterArena
              combatants={encounter.combatants}
              selectedTargetId={selectedTargetId}
              onSelectTarget={setSelectedTargetId}
              floatingNumbers={floatingNumbers}
              isDMView={currentRole === 'dm'}
              activePlayerId={activePlayerId}
              environment={encounter.environment}
              onOpenCard={(c) => setCardModalCombatant(c)}
              onInitiateAction={(actor, target) => setCounterModalData({ actor, target })}
              onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
              onUpdateCombatantPosition={handleUpdateCombatantPosition}
              onBatchUpdateCombatants={handleBatchUpdateCombatants}
            />

            {/* Role Specific Command Panel */}
            {currentRole === 'dm' ? (
              <DMScreenPanel
                encounter={encounter}
                onOpenAddEnemyModal={() => setIsAddEnemyOpen(true)}
                onOpenCharacterSheet={(c) => setCardModalCombatant(c)}
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
                  onOpenCharacterSheet={(c) => setCardModalCombatant(c)}
                  onAdvanceTurn={handleAdvanceTurn}
                  onOpenCounterModal={(actor, target) => setCounterModalData({ actor, target })}
                  onOpenStatusPicker={(c) => setStatusPickerTarget(c)}
                />
              )
            )}
          </div>
        )}

        {/* Live Combat Log Drawer at bottom */}
        <CombatLogDrawer log={encounter.log} onClearLog={handleClearLog} />
      </main>

      {/* 3-Digit Damage & Heal Counter Modal (Triggered by Hearthstone Arrow or Target Action) */}
      {counterModalData && (
        <ThreeDigitCounterModal
          isOpen={true}
          actor={counterModalData.actor}
          target={counterModalData.target}
          isDM={currentRole === 'dm'}
          onApplyDamage={handleApplyDamageFromCounter}
          onApplyHeal={handleApplyHealFromCounter}
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

      {/* Character Sheet Modal */}
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
    </div>
  );
}
