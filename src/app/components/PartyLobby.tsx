import { Users, Crown, Copy, Check, X } from 'lucide-react';
import { useState } from 'react';

interface Player {
  name: string;
  position: string;
  ready: boolean;
}

interface PartyLobbyProps {
  partyCode: string;
  players: Player[];
  isHost: boolean;
  onStartGame: () => void;
  onKickPlayer: (name: string) => void;
}

export function PartyLobby({ partyCode, players, isHost, onStartGame, onKickPlayer }: PartyLobbyProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(partyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canStart = players.length >= 3;

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
            {players.map((player, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold text-sm">
                    {player.position}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {player.name}
                      {index === 0 && <Crown className="w-4 h-4 text-amber-500" />}
                    </div>
                    {index === 0 && <div className="text-xs text-gray-500">Host</div>}
                  </div>
                </div>
                {isHost && index > 0 && (
                  <button
                    onClick={() => onKickPlayer(player.name)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Kick
                  </button>
                )}
              </div>
            ))}

            {/* Empty Slots */}
            {Array.from({ length: 4 - players.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-200"
              >
                <div className="bg-gray-200 text-gray-400 px-3 py-1 rounded-full font-bold text-sm">
                  {['東', '南', '西', '北'][players.length + index]}
                </div>
                <div className="text-sm text-gray-400">Waiting for player...</div>
              </div>
            ))}
          </div>
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
      </div>
    </div>
  );
}
