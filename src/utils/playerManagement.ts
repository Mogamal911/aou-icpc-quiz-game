import type { GameSession, Player } from '../types/game';

export function normalizeNickname(value: string): string {
  if (typeof value !== 'string') throw new Error('Enter a name between 2 and 20 characters.');
  const name = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 20) throw new Error('Enter a name between 2 and 20 characters.');
  return name;
}

/** Join and rename both check the current session inside its atomic update. */
export function availableNickname(players: Record<string, Player>, value: string, exceptId?: string): string {
  const name = normalizeNickname(value);
  const key = name.toLowerCase();
  if (Object.entries(players || {}).some(([id, player]) => id !== exceptId
    && player.nickname.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase() === key)) {
    throw new Error('That name is already in use in this contest. Choose another name.');
  }
  return name;
}

export function addContestPlayer(session: GameSession, player: Player): GameSession {
  if (session.phase === 'finished') throw new Error('This contest has finished. Ask the host for the next code.');
  const nickname = availableNickname(session.players, player.nickname);
  return { ...session, players: { ...session.players, [player.id]: { ...player, nickname } } };
}

export function renameContestPlayer(session: GameSession, playerId: string, value: string): GameSession {
  if (session.phase === 'finished') throw new Error('This contest has finished. Its results are saved.');
  if (!Object.prototype.hasOwnProperty.call(session.players || {}, playerId)) throw new Error('This player is no longer in the contest.');
  const nickname = availableNickname(session.players, value, playerId);
  return { ...session, players: { ...session.players, [playerId]: { ...session.players[playerId], nickname } } };
}

export function removeContestPlayer(session: GameSession, playerId: string): GameSession {
  if (session.phase === 'finished') throw new Error('This contest has finished. Its results are saved.');
  if (!Object.prototype.hasOwnProperty.call(session.players || {}, playerId)) {
    if (session.removedPlayerIds?.[playerId]) return session;
    throw new Error('This player is no longer in the contest.');
  }
  const players = { ...session.players };
  delete players[playerId];
  return { ...session, players, removedPlayerIds: { ...session.removedPlayerIds, [playerId]: true } };
}
