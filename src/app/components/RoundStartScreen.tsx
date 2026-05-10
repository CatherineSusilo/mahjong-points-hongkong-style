import { Crown, Play } from 'lucide-react';

interface Player { name: string; position: string; }

interface RoundStartScreenProps {
  players: Player[];
  scores: { [name: string]: number };
  round: number;
  prevailingWind: string;
  dealerName: string;
  isHost: boolean;
  playerName: string;
  onStartRound: () => void;
}

export function RoundStartScreen({
  players, scores, round, prevailingWind, dealerName, isHost, playerName, onStartRound,
}: RoundStartScreenProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0),
  );

  const myPosition = players.find(p => p.name === playerName)?.position ?? '?';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-600 p-2.5 rounded-xl">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Round {round}</h2>
              <p className="text-sm text-gray-500">{prevailingWind} prevailing wind · Dealer: {dealerName}</p>
            </div>
          </div>

          {/* Wind + your seat */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs text-green-600 font-medium mb-0.5">Prevailing Wind</p>
              <p className="font-bold text-green-800 text-2xl">{prevailingWind}</p>
            </div>
            <div className={`rounded-lg px-3 py-2.5 text-center border ${
              playerName === dealerName
                ? 'bg-amber-50 border-amber-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Your Seat</p>
              <p className={`font-bold text-2xl ${playerName === dealerName ? 'text-amber-700' : 'text-gray-800'}`}>
                {myPosition}
              </p>
              {playerName === dealerName && (
                <p className="text-xs text-amber-600 font-semibold">Dealer</p>
              )}
            </div>
          </div>
        </div>

        {/* Standings */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Current Standings</p>
          <div className="space-y-2">
            {sortedPlayers.map((player, idx) => {
              const score = scores[player.name] ?? 0;
              const isMe = player.name === playerName;
              const isDealer = player.name === dealerName;
              return (
                <div
                  key={player.name}
                  className={`rounded-lg px-3 py-2.5 flex items-center justify-between ${
                    isMe ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-medium text-gray-900">{player.name}</span>
                      {isMe && <span className="ml-1.5 text-xs text-green-600 font-semibold">You</span>}
                    </div>
                    <span className="text-xs text-gray-400">{player.position}</span>
                    {isDealer && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <span className={`font-bold text-sm ${score >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start or wait */}
        {isHost ? (
          <button
            onClick={onStartRound}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
          >
            Start Round {round}
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-amber-800 font-semibold text-sm">
              Waiting for host to start round {round}…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
