import type { Player, LeaderboardEntry } from '../types/game';

export function buildLeaderboard(players: Record<string, Player>): LeaderboardEntry[] {
  return Object.entries(players)
    .map(([id, p]) => ({ playerId: id, nickname: p.nickname, score: p.score || 0, rank: 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.nickname.localeCompare(b.nickname); // stable tie-break
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export function countAnsweredPlayers(
  players: Record<string, Player>,
  questionId: string
): number {
  return Object.values(players).filter(
    (p) => p.answers?.[questionId] !== undefined
  ).length;
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function getRankSuffix(rank: number): string {
  if (rank === 1) return 'st';
  if (rank === 2) return 'nd';
  if (rank === 3) return 'rd';
  return 'th';
}

export const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
export const OPTION_COLORS = [
  { bg: 'bg-red-700 hover:bg-red-600', border: 'border-red-500', selected: 'bg-red-500' },
  { bg: 'bg-blue-700 hover:bg-blue-600', border: 'border-blue-500', selected: 'bg-blue-500' },
  { bg: 'bg-yellow-700 hover:bg-yellow-600', border: 'border-yellow-500', selected: 'bg-yellow-500' },
  { bg: 'bg-green-700 hover:bg-green-600', border: 'border-green-500', selected: 'bg-green-500' },
] as const;

