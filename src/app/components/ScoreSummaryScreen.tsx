import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';

interface Player { name: string; position: string; }

interface ScoreData {
  winnerName: string;
  loserName: string | null;
  fan: number;
  isSelfDrawn: boolean;
  isDraw: boolean;
  changes: { [name: string]: number };
}

interface ScoreSummaryScreenProps {
  players: Player[];
  scores: { [name: string]: number };
  round: number;
  prevailingWind: string;
  dealerName: string;
  scoreData: ScoreData;
  isHost: boolean;
  onContinue: () => void;
}

export function ScoreSummaryScreen({
  players, scores, round, prevailingWind, dealerName, scoreData, isHost, onContinue,
}: ScoreSummaryScreenProps) {
  const { winnerName, loserName, fan, isSelfDrawn, isDraw, changes } = scoreData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${isDraw ? 'bg-gray-400' : 'bg-amber-500'}`}>
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isDraw ? '流局 — Draw' : `${winnerName} wins!`}
              </h2>
              <p className="text-sm text-gray-500">{prevailingWind} round · Dealer: {dealerName}</p>
            </div>
          </div>
          {!isDraw && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-purple-700 font-medium">
                {isSelfDrawn ? '自摸 Self-Drawn' : `出銃 Discard${loserName ? ` by ${loserName}` : ''}`}
              </span>
              <span className="font-bold text-purple-800">{fan}番</span>
            </div>
          )}
          {isDraw && (
            <p className="text-sm text-gray-500">No score changes. Dealer keeps their seat and re-deals.</p>
          )}
        </div>

        {/* Score changes */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Score Changes
            {!isDraw && (
              <span className="ml-2 text-xs text-gray-400 font-normal">×2 self-pick · ×2 winner/loser East</span>
            )}
          </p>
          <div className="space-y-2">
            {players.map(player => {
              const delta = changes[player.name] ?? 0;
              const prev = scores[player.name] - delta;
              return (
                <div key={player.name} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{player.name}</span>
                      <span className="text-xs text-gray-400">{player.position}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {delta > 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
                      {delta < 0 && <TrendingDown className="w-4 h-4 text-red-600" />}
                      <span className={`font-bold text-sm ${
                        delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {prev} → <span className="font-semibold text-gray-700">{scores[player.name]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Continue */}
        {isHost ? (
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg"
          >
            Continue to Round {round}
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 font-semibold text-sm">Waiting for host to start the next round…</p>
          </div>
        )}
      </div>
    </div>
  );
}
