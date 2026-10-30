import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { JoinScreen } from '../components/player/JoinScreen';
import { PlayerGame } from '../components/player/PlayerGame';

interface PlayerInfo {
  sessionId: string;
  playerId: string;
  nickname: string;
  joinCode: string;
}

export function PlayerPage() {
  const [params] = useSearchParams();
  const initialCode = params.get('code') ?? '';
  const initialSessionId = params.get('session') ?? '';
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);

  const handleJoined = useCallback((info: PlayerInfo) => {
    setPlayerInfo(info);
  }, []);

  const handleLeave = useCallback(() => {
    setPlayerInfo(null);
  }, []);

  if (!playerInfo) {
    return (
      <JoinScreen
        initialCode={initialCode}
        initialSessionId={initialSessionId}
        onJoined={handleJoined}
      />
    );
  }

  return (
    <PlayerGame
      sessionId={playerInfo.sessionId}
      playerId={playerInfo.playerId}
      nickname={playerInfo.nickname}
      onLeave={handleLeave}
    />
  );
}

