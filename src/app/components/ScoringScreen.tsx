import { useState } from 'react';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

// ── Static scoring data ───────────────────────────────────────────────────────

interface HandDef  { key: string; zh: string; en: string; faan: number; capped: boolean; }
interface ExtraDef { key: string; label: string; faan: number; }

const HANDS: HandDef[] = [
  { key: 'none',          zh: '雞胡',     en: 'Chicken Hand',        faan: 0,  capped: false },
  { key: 'common',        zh: '平和',     en: 'Common Hand',         faan: 1,  capped: false },
  { key: 'all_triplets',  zh: '對對胡',   en: 'All Triplets',        faan: 3,  capped: false },
  { key: 'mixed_suit',    zh: '混一色',   en: 'Mixed One Suit',      faan: 3,  capped: false },
  { key: 'mix_orphans',   zh: '全帶么',   en: 'Mixed Orphans',       faan: 4,  capped: false },
  { key: 'seven_pairs',   zh: '七對子',   en: 'Seven Pairs',         faan: 4,  capped: false },
  { key: 'sm_dragons',    zh: '小三元',   en: 'Small Three Dragons', faan: 5,  capped: false },
  { key: 'sm_winds',      zh: '小四喜',   en: 'Small Four Winds',    faan: 6,  capped: false },
  { key: 'all_suit',      zh: '清一色',   en: 'All One Suit',        faan: 7,  capped: false },
  { key: 'gt_dragons',    zh: '大三元',   en: 'Great Dragons',       faan: 8,  capped: false },
  { key: 'all_honour',    zh: '字一色',   en: 'All Honours',         faan: 10, capped: true  },
  { key: 'self_triplets', zh: '全暗刻',   en: 'Self Triplets',       faan: 10, capped: true  },
  { key: 'orphans',       zh: '清老頭',   en: 'Orphans (1s & 9s)',   faan: 10, capped: true  },
  { key: 'nine_gates',    zh: '九蓮寶燈', en: 'Nine Gates',          faan: 10, capped: true  },
  { key: 'gt_winds',      zh: '大四喜',   en: 'Great Winds',         faan: 13, capped: true  },
  { key: 'thirteen',      zh: '十三么',   en: 'Thirteen Orphans',    faan: 13, capped: true  },
  { key: 'all_kongs',     zh: '四槓子',   en: 'All Kongs',           faan: 13, capped: true  },
  { key: 'heavenly',      zh: '天和',     en: 'Heavenly Hand',       faan: 13, capped: true  },
  { key: 'earthly',       zh: '地和',     en: 'Earthly Hand',        faan: 13, capped: true  },
];

const EXTRA_OPTIONS: ExtraDef[] = [
  { key: 'pung_zhong',   label: '中 Red Dragon Pung',         faan: 1 },
  { key: 'pung_fa',      label: '發 Green Dragon Pung',       faan: 1 },
  { key: 'pung_bai',     label: '白 White Dragon Pung',       faan: 1 },
  { key: 'pung_seat',    label: '座風刻 Seat Wind Pung',     faan: 1 },
  { key: 'pung_prev',    label: '圈風刻 Prevailing Wind Pung', faan: 1 },
  { key: 'concealed',    label: '門前清 Concealed Hand',     faan: 1 },
  { key: 'last_tile',    label: '最後一張 Last Tile',         faan: 1 },
  { key: 'robbing_kong', label: '搶槓 Robbing Kong',          faan: 1 },
  { key: 'win_by_kong',  label: '嶺上 Win by Kong',           faan: 1 },
];

interface Player {
  name: string;
  position: string;
}

interface ScoringScreenProps {
  players: Player[];
  claimedBy: string;
  currentScores: { [name: string]: number };
  round: number;
  prevailingWind: string;
  dealerName: string;
  onScoreSubmit: (winnerName: string, loserName: string | null, fan: number, isSelfDrawn: boolean, isDraw: boolean) => void;
}

export function ScoringScreen({ players, claimedBy, currentScores, round, prevailingWind, dealerName, onScoreSubmit }: ScoringScreenProps) {
  const [winnerName, setWinnerName] = useState(claimedBy);
  const [loserName, setLoserName] = useState<string | null>(null);
  const [isSelfDrawn, setIsSelfDrawn] = useState(false);
  const [isDraw, setIsDraw] = useState(false);

  // Fan breakdown state
  const [selectedHandKey, setSelectedHandKey] = useState('none');
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [flowerBonus, setFlowerBonus] = useState(0);

  // Derived fan + breakdown
  const selectedHand = HANDS.find(h => h.key === selectedHandKey) ?? HANDS[0];
  const isCapped = selectedHand.capped;
  const activeExtras = EXTRA_OPTIONS.filter(e => extras.has(e.key));
  const extraFaan = isCapped ? 0 : activeExtras.reduce((s, e) => s + e.faan, 0) + flowerBonus;
  const fan = Math.min(13, selectedHand.faan + extraFaan);

  const breakdown: { label: string; faan: number; capped: boolean }[] = [
    ...(selectedHand.key !== 'none'
      ? [{ label: `${selectedHand.zh} ${selectedHand.en}`, faan: selectedHand.faan, capped: selectedHand.capped }]
      : []),
    ...(!isCapped ? activeExtras.map(e => ({ label: e.label, faan: e.faan, capped: false })) : []),
    ...(!isCapped && flowerBonus > 0 ? [{ label: '花/季 Flowers / Seasons', faan: flowerBonus, capped: false }] : []),
  ];

  const calculatePoints = (fan: number): number => {
    if (fan < 3) return 0;
    if (fan <= 3) return 1;
    if (fan <= 6) return 2;
    if (fan <= 9) return 4;
    return 8;
  };

  const previewScoreChange = () => {
    const changes: { [key: string]: number } = {};
    if (isDraw) return changes;

    const basePoints = calculatePoints(fan);
    const winner = players.find(p => p.name === winnerName);
    const winnerIsEast = winner?.position === '東';
    const winnerMult = winnerIsEast ? 2 : 1;

    if (isSelfDrawn) {
      let winnerTotal = 0;
      players.forEach(player => {
        if (player.name !== winnerName) {
          const loserMult = player.position === '東' ? 2 : 1;
          const amount = basePoints * 2 * winnerMult * loserMult;
          changes[player.name] = -amount;
          winnerTotal += amount;
        }
      });
      changes[winnerName] = winnerTotal;
    } else if (loserName) {
      const loser = players.find(p => p.name === loserName);
      const loserMult = loser?.position === '東' ? 2 : 1;
      const amount = basePoints * 2 * winnerMult * loserMult;
      changes[winnerName] = amount;
      changes[loserName] = -amount;
    }

    return changes;
  };

  const handleSubmit = () => {
    if (!isDraw && !isSelfDrawn && !loserName) return;
    onScoreSubmit(winnerName, loserName, fan, isSelfDrawn, isDraw);
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
              <p className="text-sm text-gray-600">Round {round} · {prevailingWind} round · Dealer: {dealerName}</p>
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
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setIsSelfDrawn(true); setLoserName(null); setIsDraw(false); }}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelfDrawn && !isDraw
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="font-semibold text-gray-900">自摸</div>
              <div className="text-xs text-gray-500">Self-Drawn</div>
            </button>
            <button
              onClick={() => { setIsSelfDrawn(false); setIsDraw(false); }}
              className={`p-3 rounded-lg border-2 transition-all ${
                !isSelfDrawn && !isDraw
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-semibold text-gray-900">出銃</div>
              <div className="text-xs text-gray-500">From Discard</div>
            </button>
            <button
              onClick={() => { setIsDraw(true); setLoserName(null); }}
              className={`p-3 rounded-lg border-2 transition-all ${
                isDraw
                  ? 'border-gray-500 bg-gray-100 shadow-md'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="font-semibold text-gray-900">流局</div>
              <div className="text-xs text-gray-500">Draw</div>
            </button>
          </div>
        </div>

        {/* Loser Selection */}
        {!isDraw && !isSelfDrawn && (
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

        {/* Fan Breakdown Builder */}
        {!isDraw && (
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Fan Breakdown (番)
            {fan > 0 && (
              <span className={`ml-2 font-bold ${isCapped ? 'text-red-600' : 'text-purple-600'}`}>
                {fan}番 → {calculatePoints(fan)} pt{calculatePoints(fan) !== 1 ? 's' : ''}
                {isCapped ? ' ★' : ''}
              </span>
            )}
          </p>

          {/* Hand selector */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Base Hand</p>
          <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-56 overflow-y-auto pr-1">
            {HANDS.map(h => (
              <button
                key={h.key}
                onClick={() => setSelectedHandKey(h.key)}
                className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border text-sm transition-all text-left ${
                  selectedHandKey === h.key
                    ? h.capped
                      ? 'border-red-400 bg-red-50 text-red-900 font-semibold'
                      : 'border-purple-500 bg-purple-50 text-purple-900 font-semibold'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{h.zh} {h.en}</span>
                <span className={`ml-1 text-xs shrink-0 font-bold ${
                  selectedHandKey === h.key
                    ? h.capped ? 'text-red-600' : 'text-purple-600'
                    : 'text-gray-400'
                }`}>
                  {h.faan > 0 ? `${h.faan}番` : ''}{h.capped ? '★' : ''}
                </span>
              </button>
            ))}
          </div>

          {/* Bonus extras (hidden when capped) */}
          {!isCapped && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bonus</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {EXTRA_OPTIONS.map(e => {
                  const active = extras.has(e.key);
                  return (
                    <button
                      key={e.key}
                      onClick={() => {
                        const next = new Set(extras);
                        if (active) next.delete(e.key); else next.add(e.key);
                        setExtras(next);
                      }}
                      className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                        active
                          ? 'border-blue-400 bg-blue-50 text-blue-800'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {e.label} +{e.faan}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">花/季 Flowers/Seasons:</span>
                <button onClick={() => setFlowerBonus(b => Math.max(0, b - 1))} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">−</button>
                <span className="w-5 text-center font-bold text-gray-800 text-sm">{flowerBonus}</span>
                <button onClick={() => setFlowerBonus(b => Math.min(8, b + 1))} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-sm">+</button>
                <span className="text-xs text-gray-400">+{flowerBonus}番</span>
              </div>
            </>
          )}

          {/* Breakdown summary */}
          {breakdown.length > 0 && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <div className="space-y-1 mb-2">
                {breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.label}</span>
                    <span className={`font-semibold ${item.capped ? 'text-red-600' : 'text-gray-800'}`}>
                      {item.faan} 番{item.capped ? ' (capped ★)' : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline font-bold">
                <span className={`text-lg ${isCapped ? 'text-red-700' : 'text-gray-900'}`}>
                  Base Faan = {fan}
                </span>
                <span className="text-purple-700">{calculatePoints(fan)} base pt{calculatePoints(fan) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Draw notice */}
        {isDraw && (
          <div className="bg-gray-50 rounded-xl shadow-lg p-4 mb-4 border-2 border-gray-200 text-center">
            <p className="font-bold text-gray-700 text-lg">流局 — Draw</p>
            <p className="text-sm text-gray-500 mt-1">No score changes. Dealer keeps their seat and deals again.</p>
          </div>
        )}

        {/* Score Preview */}
        {!isDraw && (
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Score Changes
            <span className="ml-2 text-xs text-gray-400 font-normal">(×2 self-pick · ×2 winner/loser East)</span>
          </p>
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
        </div>        )}
        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isDraw && !isSelfDrawn && !loserName}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
