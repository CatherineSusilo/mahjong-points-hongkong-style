import { Users, Crown, Copy, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const SEAT_ORDER = ['東', '南', '西', '北'] as const;

interface Player {
  name: string;
  position: string;
  ready: boolean;
}

interface PartyLobbyProps {
  partyCode: string;
  players: Player[];
  hostName: string;
  isHost: boolean;
  prevailingWind: string;
  onStartGame: () => void;
  onSwapPositions: (playerA: string, playerB: string) => void;
  onDisbandLobby: () => void;
  onSetPrevailingWind: (wind: string) => void;
}

const WIND_OPTIONS = [
  { zh: '東', en: 'East' },
  { zh: '南', en: 'South' },
  { zh: '西', en: 'West' },
  { zh: '北', en: 'North' },
];

export function PartyLobby({ partyCode, players, hostName, isHost, prevailingWind, onStartGame, onSwapPositions, onDisbandLobby, onSetPrevailingWind }: PartyLobbyProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(partyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = players.length >= 3;

  // Sort by ESWN seat order for display
  const sortedPlayers = [...players].sort(
    (a, b) => SEAT_ORDER.indexOf(a.position as typeof SEAT_ORDER[number]) - SEAT_ORDER.indexOf(b.position as typeof SEAT_ORDER[number])
  );
  // Non-host players in seat order (host is always 東 / first)
  const nonHostPlayers = sortedPlayers.filter(p => p.name !== hostName);

  const filledPositions = sortedPlayers.length;
  const emptyPositions = SEAT_ORDER.slice(filledPositions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-red-600 p-3 rounded-xl inline-block mb-3">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Game Lobby</h2>
          <p className="text-sm text-gray-600">Waiting for players...</p>
        </div>

        {/* Party Code */}
        <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl p-6 mb-6">
          <p className="text-sm font-semibold text-amber-900 mb-2 text-center">Party Code</p>
          <div className="flex items-center justify-center gap-3">
            <div className="text-4xl font-bold text-amber-900 tracking-wider">{partyCode}</div>
            <button
              onClick={copyCode}
              className="p-2 bg-white/50 hover:bg-white/80 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-amber-900" />}
            </button>
          </div>
          <p className="text-xs text-amber-800 text-center mt-2">Share this code with others</p>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Players ({players.length}/4)
          </p>
          <div className="space-y-2">
            {sortedPlayers.map((player) => {
              const isThisHost = player.name === hostName;
              const nonHostIdx = nonHostPlayers.indexOf(player);
              const canMoveUp = !isThisHost && nonHostIdx > 0;
              const canMoveDown = !isThisHost && nonHostIdx < nonHostPlayers.length - 1;

              return (
                <div
                  key={player.name}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    {/* Reorder arrows for non-host players (host view only) */}
                    {isHost && !isThisHost && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => canMoveUp && onSwapPositions(player.name, nonHostPlayers[nonHostIdx - 1].name)}
                          disabled={!canMoveUp}
                          className={`p-0.5 rounded transition-colors ${
                            canMoveUp ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => canMoveDown && onSwapPositions(player.name, nonHostPlayers[nonHostIdx + 1].name)}
                          disabled={!canMoveDown}
                          className={`p-0.5 rounded transition-colors ${
                            canMoveDown ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-200 cursor-not-allowed'
                          }`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold text-sm">
                      {player.position}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {player.name}
                        {isThisHost && <Crown className="w-4 h-4 text-amber-500" />}
                      </div>
                      {isThisHost && <div className="text-xs text-gray-500">Host</div>}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {emptyPositions.map((pos) => (
              <div
                key={pos}
                className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-200"
              >
                <div className="bg-gray-200 text-gray-400 px-3 py-1 rounded-full font-bold text-sm">
                  {pos}
                </div>
                <div className="text-sm text-gray-400">Waiting for player...</div>
              </div>
            ))}
          </div>
        </div>

        {/* Prevailing Wind */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-2">Prevailing Wind</p>
          {isHost ? (
            <select
              value={prevailingWind}
              onChange={(e) => onSetPrevailingWind(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none bg-white text-gray-900 font-medium"
            >
              {WIND_OPTIONS.map((w) => (
                <option key={w.zh} value={w.zh}>
                  {w.zh} ({w.en})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-gray-900 font-medium">
              {prevailingWind} ({WIND_OPTIONS.find(w => w.zh === prevailingWind)?.en ?? ''})
            </div>
          )}
        </div>

        {/* Start Button (Host Only) */}
        {isHost && (
          <div>
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {canStart ? 'Start Game' : 'Need at least 3 players'}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              {!canStart && `Waiting for ${3 - players.length} more player${3 - players.length !== 1 ? 's' : ''}...`}
            </p>
          </div>
        )}

        {!isHost && (
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-blue-900 font-medium">Waiting for host to start...</p>
          </div>
        )}

        {/* Disband Lobby (host only) */}
        {isHost && (
          <button
            onClick={onDisbandLobby}
            className="w-full mt-3 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-xl transition-colors"
          >
            Disband Lobby
          </button>
        )}
      </div>
    </div>
  );
}
