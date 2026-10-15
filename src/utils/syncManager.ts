import { EncounterState, FloatingNumber } from '../types/combat.ts';
import { INITIAL_ENCOUNTER } from './defaultData.ts';

const STORAGE_KEY = 'jrpg_encounter_state_v1';
const CHANNEL_NAME = 'jrpg_encounter_sync_channel';

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
 * Saves encounter state to localStorage and broadcasts to all other tabs
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
 * Subscribes to updates from other tabs and local changes
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
