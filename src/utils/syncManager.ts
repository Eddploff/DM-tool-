import {
  EncounterState,
  FloatingNumber,
  RoomData,
  RoomClaimInfo,
  Combatant,
} from '../types/combat.ts';
import { INITIAL_ENCOUNTER } from './defaultData.ts';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

const STORAGE_KEY = 'jrpg_encounter_state_v1';
const CHANNEL_NAME = 'jrpg_encounter_sync_channel';
const ACTIVE_ROOM_KEY = 'jrpg_active_room_code';
const PLAYER_SESSION_KEY = 'jrpg_player_session_id';
const PLAYER_NAME_KEY = 'jrpg_player_session_name';

type SyncMessage =
  | { type: 'STATE_UPDATE'; state: EncounterState; sender: string }
  | { type: 'FLOATING_NUMBER'; payload: FloatingNumber; sender: string };

let broadcastChannel: BroadcastChannel | null = null;
const instanceId = Math.random().toString(36).substring(2, 9);

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel unavailable
    }
  }
  return broadcastChannel;
}

/**
 * Gets or creates a persistent unique player session ID for this browser tab/device
 */
export function getOrCreatePlayerSessionId(): string {
  if (typeof window === 'undefined') return `player-${instanceId}`;
  let id = sessionStorage.getItem(PLAYER_SESSION_KEY);
  if (!id) {
    id = `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem(PLAYER_SESSION_KEY, id);
  }
  return id;
}

export function getStoredPlayerName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function setStoredPlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function getStoredRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_ROOM_KEY);
}

export function setStoredRoomCode(code: string | null): void {
  if (typeof window === 'undefined') return;
  if (code) {
    localStorage.setItem(ACTIVE_ROOM_KEY, code.toUpperCase().trim());
  } else {
    localStorage.removeItem(ACTIVE_ROOM_KEY);
  }
}

/**
 * Loads current encounter state from localStorage or initializes with defaults
 */
export function loadEncounterState(): EncounterState {
  if (typeof window === 'undefined') return INITIAL_ENCOUNTER;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.combatants)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading encounter state:', e);
  }
  return INITIAL_ENCOUNTER;
}

/**
 * Saves encounter state to localStorage and broadcasts to local channel
 */
export function saveAndBroadcastEncounter(
  state: EncounterState,
  notifySelf: boolean = false
): void {
  if (typeof window === 'undefined') return;
  const stateWithTimestamp: EncounterState = {
    ...state,
    lastUpdated: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTimestamp));
  } catch (e) {
    console.error('Error persisting encounter:', e);
  }

  // Broadcast to other tabs
  const channel = getChannel();
  if (channel) {
    channel.postMessage({
      type: 'STATE_UPDATE',
      state: stateWithTimestamp,
      sender: instanceId,
    } as SyncMessage);
  }

  if (notifySelf) {
    window.dispatchEvent(
      new CustomEvent('jrpg-encounter-local-update', {
        detail: stateWithTimestamp,
      })
    );
  }

  // Auto-sync to Firestore room if active
  const activeRoom = getStoredRoomCode();
  if (activeRoom) {
    syncEncounterToRoom(activeRoom, stateWithTimestamp).catch((err) => {
      console.warn('Auto-sync encounter to Firestore room failed:', err);
    });
  }
}

/**
 * Broadcasts a visual floating number effect to all active screens
 */
export function broadcastFloatingEffect(effect: FloatingNumber): void {
  const channel = getChannel();
  if (channel) {
    channel.postMessage({
      type: 'FLOATING_NUMBER',
      payload: effect,
      sender: instanceId,
    } as SyncMessage);
  }

  // Also trigger locally
  window.dispatchEvent(
    new CustomEvent('jrpg-floating-effect', {
      detail: effect,
    })
  );
}

/**
 * Subscribes to local broadcast and window events
 */
export function subscribeToSync(
  onStateUpdate: (state: EncounterState) => void,
  onFloatingEffect?: (effect: FloatingNumber) => void
): () => void {
  const channel = getChannel();

  const handleMessage = (event: MessageEvent<SyncMessage>) => {
    const msg = event.data;
    if (!msg) return;

    if (msg.type === 'STATE_UPDATE' && msg.state) {
      onStateUpdate(msg.state);
    } else if (msg.type === 'FLOATING_NUMBER' && msg.payload && onFloatingEffect) {
      onFloatingEffect(msg.payload);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed) onStateUpdate(parsed);
      } catch {
        // ignore
      }
    }
  };

  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent<EncounterState>;
    if (custom.detail) {
      onStateUpdate(custom.detail);
    }
  };

  const handleLocalFloating = (e: Event) => {
    const custom = e as CustomEvent<FloatingNumber>;
    if (custom.detail && onFloatingEffect) {
      onFloatingEffect(custom.detail);
    }
  };

  if (channel) {
    channel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);
  window.addEventListener('jrpg-encounter-local-update', handleLocalUpdate);
  window.addEventListener('jrpg-floating-effect', handleLocalFloating);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('jrpg-encounter-local-update', handleLocalUpdate);
    window.removeEventListener('jrpg-floating-effect', handleLocalFloating);
  };
}

/**
 * Resets encounter back to default
 */
export function resetEncounterState(): EncounterState {
  const fresh: EncounterState = {
    ...INITIAL_ENCOUNTER,
    id: `encounter-${Date.now()}`,
    lastUpdated: Date.now(),
  };
  saveAndBroadcastEncounter(fresh, true);
  return fresh;
}

// ==========================================
// FIRESTORE ROOM MANAGEMENT & SYNCHRONIZATION
// ==========================================

import { sanitizeForFirestore } from './sanitize.ts';
export { sanitizeForFirestore };

export function generateRoomCode(): string {
  // Generate memorable 6-character room code (e.g. DRAGON, WYVERN, K9F7W2)
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

/**
 * Creates a new room in Firestore for the DM
 */
export async function createRoomInFirestore(
  rawCode: string,
  dmSessionId: string,
  initialEncounter: EncounterState
): Promise<RoomData> {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;

  const roomData: RoomData = {
    code,
    createdAt: Date.now(),
    dmSessionId,
    encounter: initialEncounter,
    claimedTokens: {},
    lastUpdated: Date.now(),
  };

  try {
    const roomRef = doc(db, 'rooms', code);
    await setDoc(roomRef, sanitizeForFirestore(roomData));
    setStoredRoomCode(code);
    saveAndBroadcastEncounter(initialEncounter, false);
    return roomData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }
}

/**
 * Fetches an existing room from Firestore
 */
export async function fetchRoomFromFirestore(rawCode: string): Promise<RoomData | null> {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;

  try {
    const roomRef = doc(db, 'rooms', code);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as RoomData;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, roomPath);
  }
}

/**
 * Subscribes to real-time room updates from Firestore
 */
export function subscribeToRoom(
  rawCode: string,
  onRoomUpdate: (data: RoomData) => void,
  onError?: (err: Error) => void
): () => void {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);

  const unsubscribe = onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as RoomData;
        onRoomUpdate(data);
      }
    },
    (error) => {
      console.error('Room snapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, roomPath);
    }
  );

  return unsubscribe;
}

/**
 * Syncs the entire encounter to the Firestore room
 */
export async function syncEncounterToRoom(
  rawCode: string,
  encounter: EncounterState
): Promise<void> {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);

  try {
    await updateDoc(
      roomRef,
      sanitizeForFirestore({
        encounter,
        lastUpdated: Date.now(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

/**
 * Claims a specific token for a player (1 token per player)
 */
export async function claimTokenInRoom(
  rawCode: string,
  combatantId: string,
  playerId: string,
  playerName: string
): Promise<void> {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);

  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) throw new Error('La sala no existe.');

    const currentData = snap.data() as RoomData;
    const currentClaims: Record<string, RoomClaimInfo> = currentData.claimedTokens || {};

    // Remove any previous token claim by this same player (1 token per player rule)
    const cleanedClaims: Record<string, RoomClaimInfo> = {};
    Object.entries(currentClaims).forEach(([cId, claim]) => {
      if (claim.playerId !== playerId) {
        cleanedClaims[cId] = claim;
      }
    });

    // Assign token to this player
    cleanedClaims[combatantId] = {
      playerId,
      playerName: playerName || 'Jugador',
      claimedAt: Date.now(),
    };

    await updateDoc(
      roomRef,
      sanitizeForFirestore({
        claimedTokens: cleanedClaims,
        lastUpdated: Date.now(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

/**
 * Releases a player's claimed token
 */
export async function releaseTokenInRoom(
  rawCode: string,
  playerId: string
): Promise<void> {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);

  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;

    const currentData = snap.data() as RoomData;
    const currentClaims: Record<string, RoomClaimInfo> = currentData.claimedTokens || {};

    const updatedClaims: Record<string, RoomClaimInfo> = {};
    Object.entries(currentClaims).forEach(([cId, claim]) => {
      if (claim.playerId !== playerId) {
        updatedClaims[cId] = claim;
      }
    });

    await updateDoc(
      roomRef,
      sanitizeForFirestore({
        claimedTokens: updatedClaims,
        lastUpdated: Date.now(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

/**
 * Creates a brand new custom character token and claims it for the player
 */
export async function createAndClaimPlayerTokenInRoom(
  rawCode: string,
  newCombatant: Combatant,
  playerId: string,
  playerName: string
): Promise<void> {
  const code = rawCode.toUpperCase().trim();
  const roomPath = `rooms/${code}`;
  const roomRef = doc(db, 'rooms', code);

  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) throw new Error('La sala no existe.');

    const currentData = snap.data() as RoomData;
    const currentEncounter = currentData.encounter;
    const currentClaims: Record<string, RoomClaimInfo> = currentData.claimedTokens || {};

    // Remove any previous claim for this player (1 token per player)
    const cleanedClaims: Record<string, RoomClaimInfo> = {};
    Object.entries(currentClaims).forEach(([cId, claim]) => {
      if (claim.playerId !== playerId) {
        cleanedClaims[cId] = claim;
      }
    });

    // Add new combatant to encounter list and turn order
    const nextCombatants = [...currentEncounter.combatants, newCombatant];
    const nextTurnOrder = [...currentEncounter.turnOrder, newCombatant.id];

    // Assign new token to player
    cleanedClaims[newCombatant.id] = {
      playerId,
      playerName: playerName || newCombatant.name,
      claimedAt: Date.now(),
    };

    const nextEncounter: EncounterState = {
      ...currentEncounter,
      combatants: nextCombatants,
      turnOrder: nextTurnOrder,
      lastUpdated: Date.now(),
    };

    await updateDoc(
      roomRef,
      sanitizeForFirestore({
        encounter: nextEncounter,
        claimedTokens: cleanedClaims,
        lastUpdated: Date.now(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}
