import { Trophy } from 'lucide-react';

interface Player {
  name: string;
  position: string;
}

interface FinalScoresScreenProps {
  players: Player[];
  scores: { [name: string]: number };
  round: number;
}

export function FinalScoresScreen({ players, scores, round }: FinalScoresScreenProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0)
  );

  const rankColors = [
    'bg-amber-400 text-white',
    'bg-gray-300 text-gray-700',
    'bg-amber-700/70 text-white',
    'bg-gray-200 text-gray-500',
  ];

  const rankBg = [
    'bg-amber-50 border-2 border-amber-400',
    'bg-gray-50 border border-gray-200',
    'bg-gray-50 border border-gray-200',
    'bg-gray-50 border border-gray-200',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="bg-amber-500 p-4 rounded-xl inline-block mb-3">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Game Over!</h2>
          <p className="text-sm text-gray-500">
            Final scores after {round - 1} round{round - 1 !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-3">
          {sortedPlayers.map((player, index) => {
            const score = scores[player.name] ?? 0;
            return (
              <div key={player.name} className={`flex items-center justify-between rounded-xl p-4 ${rankBg[index] ?? rankBg[3]}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${rankColors[index] ?? rankColors[3]}`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{player.name}</div>
                    <div className="text-xs text-gray-500">{player.position}</div>
                  </div>
                </div>
                <div className={`text-xl font-bold ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {score > 0 ? '+' : ''}{score}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          The host has ended the game. Thanks for playing!
        </p>
      </div>
    </div>
  );
}
