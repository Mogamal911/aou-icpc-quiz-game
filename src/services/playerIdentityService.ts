export interface PlayerInfo { sessionId: string; playerId: string; nickname: string; joinCode: string; }
const key = 'aou_player_info';
const pauseKey = 'aou_player_paused';

export function readPlayerInfo(): PlayerInfo | null {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try {
      const value = JSON.parse(window[storageName].getItem(key) || 'null');
      if (value && ['sessionId', 'playerId', 'nickname'].every((field) => typeof value[field] === 'string' && value[field]) && typeof value.joinCode === 'string') return value;
    } catch { /* Try the other cache if storage is blocked or damaged. */ }
  }
  return null;
}
export function savePlayerInfo(info: PlayerInfo) {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try { window[storageName].setItem(key, JSON.stringify(info)); } catch { /* Joining still works without storage. */ }
  }
}
export function clearPlayerInfo() {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try { window[storageName].removeItem(key); } catch { /* Joining still works without storage. */ }
  }
}
export function setPlayerPaused(paused: boolean) {
  try { if (paused) sessionStorage.setItem(pauseKey, 'true'); else sessionStorage.removeItem(pauseKey); } catch { /* Current-page navigation still works. */ }
}
export function shouldResumePlayer(info: PlayerInfo | null, code: string, sessionId: string): boolean {
  try { if (sessionStorage.getItem(pauseKey) === 'true') return false; } catch { /* Fall back to route matching. */ }
  return Boolean(info && (!code || info.joinCode === code.toUpperCase()) && (!sessionId || info.sessionId === sessionId));
}
