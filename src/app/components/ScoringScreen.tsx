import { useState } from 'react';
import { Trophy, Minus, Plus, TrendingUp, TrendingDown } from 'lucide-react';

interface Player {
  name: string;
  position: string;
}

interface ScoringScreenProps {
  players: Player[];
  claimedBy: string;
  currentScores: { [name: string]: number };
  round: number;
  onScoreSubmit: (winnerName: string, loserName: string | null, fan: number, isSelfDrawn: boolean) => void;
}

export function ScoringScreen({ players, claimedBy, currentScores, round, onScoreSubmit }: ScoringScreenProps) {
  const [winnerName, setWinnerName] = useState(claimedBy);
  const [loserName, setLoserName] = useState<string | null>(null);
  const [fan, setFan] = useState(3);
  const [isSelfDrawn, setIsSelfDrawn] = useState(false);

  const calculatePoints = (fan: number): number => {
    return Math.min(512, Math.pow(2, fan - 1));
  };

  const previewScoreChange = () => {
    const basePoints = calculatePoints(fan);
    const changes: { [key: string]: number } = {};

    if (isSelfDrawn) {
      players.forEach((player) => {
        if (player.name === winnerName) {
          changes[player.name] = basePoints * (players.length - 1);
        } else {
          changes[player.name] = -basePoints;
        }
      });
    } else if (loserName) {
      changes[winnerName] = basePoints;
      changes[loserName] = -basePoints;
    }

    return changes;
  };

  const handleSubmit = () => {
    if (!isSelfDrawn && !loserName) return;
    onScoreSubmit(winnerName, loserName, fan, isSelfDrawn);
  };

  const scoreChanges = previewScoreChange();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-600 p-3 rounded-xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Score This Round</h2>
              <p className="text-sm text-gray-600">Round {round} • All hands submitted</p>
            </div>
          </div>
        </div>

        {/* Winner Selection */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Winner</label>
          <div className="grid grid-cols-2 gap-2">
            {players.map((player) => (
              <button
                key={player.name}
                onClick={() => setWinnerName(player.name)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  winnerName === player.name
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="font-semibold text-gray-900">{player.name}</div>
                <div className="text-xs text-gray-500">{player.position}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Win Type */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Win Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsSelfDrawn(true);
                setLoserName(null);
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelfDrawn
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="font-semibold text-gray-900">自摸</div>
              <div className="text-xs text-gray-500">Self-Drawn</div>
            </button>
            <button
              onClick={() => setIsSelfDrawn(false)}
              className={`p-3 rounded-lg border-2 transition-all ${
                !isSelfDrawn
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-semibold text-gray-900">出銃</div>
              <div className="text-xs text-gray-500">From Discard</div>
            </button>
          </div>
        </div>

        {/* Loser Selection */}
        {!isSelfDrawn && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Loser (Who Discarded)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {players.map((player) => (
                player.name !== winnerName && (
                  <button
                    key={player.name}
                    onClick={() => setLoserName(player.name)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      loserName === player.name
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{player.name}</div>
                    <div className="text-xs text-gray-500">{player.position}</div>
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Fan Counter */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Fan (番) • Points: {calculatePoints(fan)}
          </label>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setFan(Math.max(1, fan - 1))}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="flex-1 text-center">
              <div className="text-4xl font-bold text-gray-900">{fan}</div>
              <div className="text-sm text-gray-500">Fan</div>
            </div>
            <button
              onClick={() => setFan(Math.min(13, fan + 1))}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[1, 3, 5, 8, 10].map((f) => (
              <button
                key={f}
                onClick={() => setFan(f)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  fan === f
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f}番
              </button>
            ))}
          </div>
        </div>

        {/* Score Preview */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Score Changes</p>
          <div className="space-y-2">
            {players.map((player) => {
              const change = scoreChanges[player.name] || 0;
              const newScore = currentScores[player.name] + change;
              return (
                <div key={player.name} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{player.name}</span>
                    <div className="flex items-center gap-2">
                      {change > 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {change < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
                      <span className={`font-bold ${
                        change > 0 ? 'text-green-600' :
                        change < 0 ? 'text-red-600' :
                        'text-gray-400'
                      }`}>
                        {change > 0 ? '+' : ''}{change || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {currentScores[player.name]} → {newScore}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isSelfDrawn && !loserName}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
