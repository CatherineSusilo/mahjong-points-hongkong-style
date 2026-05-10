import { useState } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';
import {
  detectAllPatterns,
  computeWindDragonPungFaan,
  computeFlowerFaan,
  WIND_ORDER,
  faanToBasePoints,
} from './hkScoring';

interface Player { name: string; position: string; }
interface Submission { tiles: string[]; bonusTiles: string[]; kongs: string[]; }

interface ScoringScreenProps {
  players: Player[];
  claimedBy: string;
  submissions: { [name: string]: Submission };
  currentScores: { [name: string]: number };
  round: number;
  prevailingWind: string;
  dealerName: string;
  isHost: boolean;
  playerName: string;
  onScoreSubmit: (winnerName: string, loserName: string | null, fan: number, isSelfDrawn: boolean, isDraw: boolean) => void;
}

export function ScoringScreen({
  players, claimedBy, submissions, currentScores, round, prevailingWind,
  dealerName, isHost, playerName, onScoreSubmit,
}: ScoringScreenProps) {
  const [loserName, setLoserName] = useState<string | null>(null);
  const [isSelfDrawn, setIsSelfDrawn] = useState(false);
  const [isConcealed, setIsConcealed] = useState(false);

  // Auto-detect from winner's submitted hand
  const winner = players.find(p => p.name === claimedBy);
  const winnerPos = winner?.position ?? '東';
  const seatNum = (WIND_ORDER.indexOf(winnerPos as typeof WIND_ORDER[number]) + 1) || 1;
  const sub = submissions[claimedBy] ?? { tiles: [], bonusTiles: [], kongs: [] };
  const patterns = detectAllPatterns(sub.tiles, sub.kongs);
  const { faan: wdFaan, breakdown: wdBreakdown } = computeWindDragonPungFaan(
    sub.tiles, sub.kongs, winnerPos, prevailingWind,
  );
  const bonusFaan = computeFlowerFaan(sub.bonusTiles, seatNum);
  const isCapped = patterns[0]?.isCapped ?? false;
  const patternFaan = patterns.reduce((s, p) => s + p.faan, 0);
  const concealedFaan = !isCapped && isConcealed ? 1 : 0;
  const fan = Math.min(13, patternFaan + (isCapped ? 0 : wdFaan + bonusFaan + concealedFaan));
  const hasNoTiles = sub.tiles.length === 0 && sub.kongs.length === 0;
  const allPlayersSubmitted = players.every(p => !!submissions[p.name]);

  const handleSubmit = () => {
    if (!isSelfDrawn && !loserName) return;
    if (!allPlayersSubmitted) return;
    onScoreSubmit(claimedBy, loserName, fan, isSelfDrawn, false);
  };

  // ── Shared: hand breakdown card ─────────────────────────────────────────────
  const HandBreakdown = () => (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-sm">{claimedBy}</span>
        <span className="text-sm text-gray-500">{winnerPos} seat</span>
        <span className="ml-auto text-xs text-gray-400 font-semibold uppercase tracking-wide">Winner</span>
      </div>
      {hasNoTiles ? (
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Winner's tiles not yet submitted</span>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
          {patterns.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No special hand pattern detected</p>
          ) : (
            patterns.map(p => (
              <div key={p.key} className="flex justify-between text-sm">
                <span className={`font-semibold ${p.isCapped ? 'text-red-700' : 'text-gray-800'}`}>
                  {p.zhName} {p.enName}{p.isCapped ? ' ★' : ''}
                </span>
                <span className={`font-bold ${p.isCapped ? 'text-red-600' : 'text-purple-700'}`}>{p.faan}番</span>
              </div>
            ))
          )}
          {!isCapped && wdBreakdown.map(b => (
            <div key={b.label} className="flex justify-between text-sm text-gray-600">
              <span>{b.label}</span>
              <span>+{b.faan}番</span>
            </div>
          ))}
          {!isCapped && bonusFaan > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>花/季 Flowers / Seasons</span>
              <span>+{bonusFaan}番</span>
            </div>
          )}
          {!isCapped && isConcealed && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>門前清 Concealed Hand</span>
              <span>+1番</span>
            </div>
          )}
          {isCapped && (bonusFaan > 0 || wdFaan > 0 || isConcealed) && (
            <p className="text-xs text-gray-400 italic">Wind / dragon / flower bonuses not added (capped hand)</p>
          )}
          <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
            <span className={isCapped ? 'text-red-700' : 'text-gray-900'}>
              Total{isCapped ? ' (capped ★)' : ''}
            </span>
            <span className={`text-lg ${isCapped ? 'text-red-600' : 'text-purple-700'}`}>
              {fan}番 → {faanToBasePoints(fan)} pt{faanToBasePoints(fan) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  // ── Non-host: waiting view ───────────────────────────────────────────────────
  if (!isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2.5 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Score Round {round}</h2>
                <p className="text-sm text-gray-500">{prevailingWind} round · Dealer: {dealerName}</p>
              </div>
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
              <p className="text-amber-800 font-semibold text-sm">Waiting for host to confirm the score…</p>
            </div>
          </div>
          <HandBreakdown />
        </div>
      </div>
    );
  }

  // ── Host: scoring form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2.5 rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Score Round {round}</h2>
              <p className="text-sm text-gray-500">{prevailingWind} round · Dealer: {dealerName}</p>
            </div>
          </div>
        </div>

        {/* Winner + Auto-detected hand */}
        <HandBreakdown />

        {/* Concealed toggle */}
        {!isCapped && !hasNoTiles && (
          <div className="bg-white rounded-xl shadow-lg px-4 py-3 mb-4">
            <button
              onClick={() => setIsConcealed(c => !c)}
              className="w-full flex items-center justify-between"
            >
              <span className="text-sm font-medium text-gray-700">
                門前清 Concealed Hand <span className="text-gray-400 font-normal">(+1番)</span>
              </span>
              <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isConcealed ? 'bg-blue-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </button>
          </div>
        )}

        {/* Win Type */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Win Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setIsSelfDrawn(true); setLoserName(null); }}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelfDrawn ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm">自摸</div>
              <div className="text-xs text-gray-500">Self-Drawn</div>
            </button>
            <button
              onClick={() => { setIsSelfDrawn(false); }}
              className={`p-3 rounded-lg border-2 transition-all ${
                !isSelfDrawn
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm">出銃</div>
              <div className="text-xs text-gray-500">From Discard</div>
            </button>
          </div>

          {/* Loser picker — inside win type card, discard only */}
          {!isSelfDrawn && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Who Discarded?{' '}
                <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {players.filter(p => p.name !== claimedBy).map(player => (
                  <button
                    key={player.name}
                    onClick={() => setLoserName(loserName === player.name ? null : player.name)}
                    className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                      loserName === player.name
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-red-200'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 text-sm">{player.name}</div>
                    <div className="text-xs text-gray-500">{player.position}</div>
                  </button>
                ))}
              </div>
              {!loserName && (
                <p className="text-xs text-gray-400 mt-1.5">If not set, winner's hand is recorded with no penalty charged.</p>
              )}
            </div>
          )}
        </div>

        {/* Not all submitted warning */}
        {!allPlayersSubmitted && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">Waiting for all players to submit their hands…</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!allPlayersSubmitted}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
