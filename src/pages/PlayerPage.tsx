import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { JoinScreen } from '../components/player/JoinScreen';
import { PlayerGame } from '../components/player/PlayerGame';
import { clearPlayerInfo, readPlayerInfo, savePlayerInfo, setPlayerPaused, shouldResumePlayer, type PlayerInfo } from '../services/playerIdentityService';

export function PlayerPage() {
  const [params, setParams] = useSearchParams();
  const initialCode = params.get('code') ?? '';
  const initialSessionId = params.get('session') ?? '';
  const [savedInfo, setSavedInfo] = useState(readPlayerInfo);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(() => shouldResumePlayer(savedInfo, initialCode, initialSessionId) ? savedInfo : null);

  const handleJoined = useCallback((info: PlayerInfo) => {
    savePlayerInfo(info); setPlayerPaused(false);
    setSavedInfo(info); setPlayerInfo(info);
    setParams({ session: info.sessionId, ...(info.joinCode ? { code: info.joinCode } : {}) }, { replace: true });
    window.scrollTo(0, 0);
  }, [setParams]);

  function exit(forget = false) {
    if (forget) { clearPlayerInfo(); setSavedInfo(null); }
    else {
      const cached = readPlayerInfo();
      const current = cached?.sessionId === playerInfo?.sessionId && cached?.playerId === playerInfo?.playerId ? cached : playerInfo;
      if (current) savePlayerInfo(current);
      setSavedInfo(current);
    }
    setPlayerPaused(true); setPlayerInfo(null);
    setParams({}, { replace: true });
    window.scrollTo(0, 0);
  }

  if (!playerInfo) return <JoinScreen initialCode={initialCode} initialSessionId={initialSessionId} onJoined={handleJoined} savedPlayer={savedInfo} onResume={() => { if (savedInfo) handleJoined(savedInfo); }} />;
  return <PlayerGame key={`${playerInfo.sessionId}:${playerInfo.playerId}`} sessionId={playerInfo.sessionId} playerId={playerInfo.playerId} nickname={playerInfo.nickname} onLeave={() => exit()} onForget={() => exit(true)} />;
}
