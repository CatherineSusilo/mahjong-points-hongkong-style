import { useState, useEffect, useCallback } from 'react';
import { PartyEntry } from './components/PartyEntry';
import { PartyLobby } from './components/PartyLobby';
import { TileInput } from './components/TileInput';
import { HandSubmission } from './components/HandSubmission';
import { ScoringScreen } from './components/ScoringScreen';
import { ScoreSummaryScreen } from './components/ScoreSummaryScreen';
import { RoundStartScreen } from './components/RoundStartScreen';
import { FinalScoresScreen } from './components/FinalScoresScreen';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Player {
  name: string;
  position: string;
  ready: boolean;
  tiles: string[];
}

interface Party {
  code: string;
  host: string;
  players: Player[];
  state: 'lobby' | 'playing' | 'submitting' | 'scoring' | 'score_summary' | 'round_start' | 'ended' | 'disbanded';
  round: number;
  scores: { [name: string]: number };
  winData: { claimedBy: string; timestamp: number } | null;
  submissions: { [name: string]: { tiles: string[]; bonusTiles: string[]; kongs: string[]; timestamp: number } };
  prevailingWind: string;
  dealerChanges: number;
  scoreData: {
    winnerName: string;
    loserName: string | null;
    fan: number;
    isSelfDrawn: boolean;
    isDraw: boolean;
    changes: { [name: string]: number };
  } | null;
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a83e0fd9`;

// Safe JSON parse: returns parsed data or throws with readable message
async function safeJson(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error ${response.status}: ${text.substring(0, 120)}`);
  }
}

export default function App() {
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  const [isDisbanded, setIsDisbanded] = useState(false);

  // Fetch party state
  const fetchParty = useCallback(async () => {
    if (!partyCode) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();

      if (data.success) {
        // Detect if current player was kicked from the lobby
        if (playerName && data.party.state === 'lobby') {
          const stillInParty = data.party.players.some((p: Player) => p.name === playerName);
          if (!stillInParty) {
            setPartyCode(null);
            setParty(null);
            setIsKicked(true);
            return;
          }
        }
        // Detect if the lobby was disbanded (host left)
        if (data.party.state === 'disbanded') {
          setPartyCode(null);
          setParty(null);
          setIsDisbanded(true);
          return;
        }
        setParty(data.party);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error fetching party:', err);
      setError('Failed to fetch party state');
    }
  }, [partyCode]);

  // Poll for updates
  useEffect(() => {
    if (!partyCode) return;

    fetchParty();
    const interval = setInterval(fetchParty, 2000);

    return () => clearInterval(interval);
  }, [partyCode, fetchParty]);

  // Create party
  const handleCreateParty = async (hostName: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/party/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ hostName })
      });

      const data = await response.json();

      if (data.success) {
        setPartyCode(data.partyCode);
        setPlayerName(hostName);
        setParty(data.party);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error creating party:', err);
      setError('Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  // Join party
  const handleJoinParty = async (code: string, name: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/party/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ partyCode: code, playerName: name })
      });

      const data = await response.json();

      if (data.success) {
        setPartyCode(code);
        setPlayerName(name);
        setParty(data.party);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Error joining party:', err);
      setError('Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  // Start game
  const handleStartGame = async () => {
    if (!partyCode) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();

      if (data.success) {
        setParty(data.party);
      }
    } catch (err) {
      console.error('Error starting game:', err);
    }
  };

  // Update tiles
  const handleTilesUpdate = async (tiles: string[]) => {
    if (!partyCode || !playerName) return;

    try {
      await fetch(`${API_URL}/party/${partyCode}/tiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ playerName, tiles })
      });
    } catch (err) {
      console.error('Error updating tiles:', err);
    }
  };

  // Claim win
  const handleWinClaimed = async () => {
    if (!partyCode || !playerName) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/win`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ playerName })
      });

      const data = await response.json();

      if (data.success) {
        setParty(data.party);
      }
    } catch (err) {
      console.error('Error claiming win:', err);
    }
  };

  // Submit hand
  const handleHandSubmit = async (tiles: string[], bonusTiles: string[], kongs: string[]) => {
    if (!partyCode || !playerName) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ playerName, tiles, bonusTiles, kongs })
      });

      const data = await response.json();

      if (data.success) {
        setParty(data.party);
      }
    } catch (err) {
      console.error('Error submitting hand:', err);
    }
  };

  // Disband lobby (host only) — writes disbanded state directly to KV store via REST API
  const handleDisbandLobby = async () => {
    if (!partyCode || !party) return;

    try {
      const disbanded = { ...party, state: 'disbanded' };
      const response = await fetch(
        `https://${projectId}.supabase.co/rest/v1/kv_store_a83e0fd9?key=eq.party:${partyCode}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: publicAnonKey,
            Authorization: `Bearer ${publicAnonKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ value: disbanded }),
        }
      );

      if (response.ok) {
        setIsDisbanded(true);
        setPartyCode(null);
        setParty(null);
        setPlayerName(null);
      } else {
        alert('Could not disband lobby — please try again.');
      }
    } catch (err) {
      console.error('Error disbanding lobby:', err);
      alert('Could not disband lobby — please check your connection.');
    }
  };

  // Swap positions of two non-host players (host only, lobby)
  const handleSwapPositions = async (playerA: string, playerB: string) => {
    if (!partyCode || !playerName) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/swap-positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ hostName: playerName, playerA, playerB })
      });

      const data = await response.json();
      if (data.success) setParty(data.party);
    } catch (err) {
      console.error('Error swapping positions:', err);
    }
  };

  // Continue to round-start lobby (host only)
  const handleContinueRound = async () => {
    if (!partyCode || !playerName) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ hostName: playerName })
      });

      const data = await response.json();
      if (data.success) setParty(data.party);
    } catch (err) {
      console.error('Error continuing round:', err);
    }
  };

  // Start the round (host only, from round-start lobby)
  const handleStartRound = async () => {
    if (!partyCode || !playerName) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/start-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ hostName: playerName })
      });

      const data = await response.json();
      if (data.success) setParty(data.party);
    } catch (err) {
      console.error('Error starting round:', err);
    }
  };

  // End the game (host only)
  const handleEndGame = async () => {
    if (!partyCode || !playerName) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ hostName: playerName })
      });

      const data = await response.json();

      if (data.success) {
        setParty(data.party);
      }
    } catch (err) {
      console.error('Error ending game:', err);
    }
  };

  // Record score
  const handleScoreSubmit = async (winnerName: string, loserName: string | null, fan: number, isSelfDrawn: boolean, isDraw: boolean) => {
    if (!partyCode) return;

    try {
      const response = await fetch(`${API_URL}/party/${partyCode}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ winnerName, loserName, fan, isSelfDrawn, isDraw })
      });

      const data = await response.json();

      if (data.success) {
        setParty(data.party);
      }
    } catch (err) {
      console.error('Error recording score:', err);
    }
  };

  // Kicked screen — shown before error so it takes priority
  if (isKicked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="bg-red-100 p-4 rounded-full inline-block mb-4">
            <span className="text-4xl">🚪</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You were kicked</h2>
          <p className="text-gray-600 mb-6">The host removed you from the party.</p>
          <button
            onClick={() => {
              setIsKicked(false);
              setPartyCode(null);
              setPlayerName(null);
              setParty(null);
            }}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Disbanded screen
  if (isDisbanded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="bg-gray-100 p-4 rounded-full inline-block mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lobby disbanded</h2>
          <p className="text-gray-600 mb-6">The host left, so the party has been closed.</p>
          <button
            onClick={() => {
              setIsDisbanded(false);
              setPartyCode(null);
              setPlayerName(null);
              setParty(null);
            }}
            className="w-full bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-red-100 p-4 rounded-full inline-block mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setPartyCode(null);
              setPlayerName(null);
              setParty(null);
            }}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // No party - show entry screen
  if (!party || !playerName) {
    return <PartyEntry onCreateParty={handleCreateParty} onJoinParty={handleJoinParty} />;
  }

  const currentPlayer = party.players.find(p => p.name === playerName);
  const isHost = party.host === playerName;

  // Ended state — show final scores to everyone
  if (party.state === 'ended') {
    return (
      <FinalScoresScreen
        players={party.players}
        scores={party.scores}
        round={party.round}
      />
    );
  }

  // Lobby state
  if (party.state === 'lobby') {
    return (
      <PartyLobby
        partyCode={party.code}
        players={party.players}
        hostName={party.host}
        isHost={isHost}
        onStartGame={handleStartGame}
        onSwapPositions={handleSwapPositions}
        onDisbandLobby={handleDisbandLobby}
      />
    );
  }

  // Playing state
  if (party.state === 'playing' && currentPlayer) {
    return (
      <TileInput
        playerName={playerName}
        position={currentPlayer.position}
        prevailingWind={party.prevailingWind || '東'}
        isHost={isHost}
        onWinClaimed={handleWinClaimed}
        onTilesUpdate={handleTilesUpdate}
        onEndGame={handleEndGame}
        currentTiles={currentPlayer.tiles}
      />
    );
  }

  // Submitting state
  if (party.state === 'submitting' && currentPlayer && party.winData) {
    const serverHasSubmitted = !!party.submissions[playerName];

    return (
      <HandSubmission
        playerName={playerName}
        position={currentPlayer.position}
        prevailingWind={party.prevailingWind || '東'}
        claimedBy={party.winData.claimedBy}
        currentTiles={currentPlayer.tiles}
        hasSubmitted={serverHasSubmitted}
        onSubmit={handleHandSubmit}
      />
    );
  }

  // Scoring state
  if (party.state === 'scoring' && party.winData) {
    return (
      <ScoringScreen
        players={party.players}
        claimedBy={party.winData.claimedBy}
        submissions={party.submissions}
        currentScores={party.scores}
        round={party.round}
        prevailingWind={party.prevailingWind || '東'}
        dealerName={party.players.find(p => p.position === '東')?.name || party.host}
        isHost={isHost}
        playerName={playerName}
        onScoreSubmit={handleScoreSubmit}
      />
    );
  }

  // Round-start lobby
  if (party.state === 'round_start') {
    return (
      <RoundStartScreen
        players={party.players}
        scores={party.scores}
        round={party.round}
        prevailingWind={party.prevailingWind || '東'}
        dealerName={party.players.find(p => p.position === '東')?.name || party.host}
        isHost={isHost}
        playerName={playerName}
        onStartRound={handleStartRound}
      />
    );
  }

  // Score summary state
  if (party.state === 'score_summary' && party.scoreData) {
    return (
      <ScoreSummaryScreen
        players={party.players}
        scores={party.scores}
        round={party.round}
        prevailingWind={party.prevailingWind || '東'}
        dealerName={party.players.find(p => p.position === '東')?.name || party.host}
        scoreData={party.scoreData}
        isHost={isHost}
        onContinue={handleContinueRound}
      />
    );
  }

  // Loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Loading...</p>
      </div>
    </div>
  );
}