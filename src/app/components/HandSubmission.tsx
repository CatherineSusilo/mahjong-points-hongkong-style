/// <reference types="vite/client" />
import { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { detectAllPatterns, computeWindDragonPungFaan, computeFlowerFaan, WIND_ORDER } from './hkScoring';

// ── Tile images (same directory, same glob) ────────────────────────────────
const _tileGifs = import.meta.glob('./tiles/*.gif', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const img = (f: string) => _tileGifs[`./tiles/${f}`] ?? '';

const TILE_IMAGE: Record<string, string> = {
  '一萬': img('c1.gif'), '二萬': img('c2.gif'), '三萬': img('c3.gif'),
  '四萬': img('c4.gif'), '五萬': img('c5.gif'), '六萬': img('c6.gif'),
  '七萬': img('c7.gif'), '八萬': img('c8.gif'), '九萬': img('c9.gif'),
  '一筒': img('d1.gif'), '二筒': img('d2.gif'), '三筒': img('d3.gif'),
  '四筒': img('d4.gif'), '五筒': img('d5.gif'), '六筒': img('d6.gif'),
  '七筒': img('d7.gif'), '八筒': img('d8.gif'), '九筒': img('d9.gif'),
  '一索': img('b1.gif'), '二索': img('b2.gif'), '三索': img('b3.gif'),
  '四索': img('b4.gif'), '五索': img('b5.gif'), '六索': img('b6.gif'),
  '七索': img('b7.gif'), '八索': img('b8.gif'), '九索': img('b9.gif'),
  '東': img('a4.gif'), '南': img('a7.gif'), '西': img('a5.gif'), '北': img('a6.gif'),
  '中': img('a1.gif'), '發': img('a3.gif'), '白': img('a2.gif'),
  '梅': img('f1.gif'), '蘭': img('f2.gif'), '菊': img('f3.gif'), '竹': img('f4.gif'),
  '春': img('e1.gif'), '夏': img('e2.gif'), '秋': img('e3.gif'), '冬': img('e4.gif'),
};

const TILE_TYPES: { [key: string]: string[] } = {
  '萬子': ['一萬', '二萬', '三萬', '四萬', '五萬', '六萬', '七萬', '八萬', '九萬'],
  '筒子': ['一筒', '二筒', '三筒', '四筒', '五筒', '六筒', '七筒', '八筒', '九筒'],
  '索子': ['一索', '二索', '三索', '四索', '五索', '六索', '七索', '八索', '九索'],
  '字牌': ['東', '南', '西', '北', '中', '發', '白'],
  '花': ['梅', '蘭', '菊', '竹'],
  '季': ['春', '夏', '秋', '冬'],
};

const BONUS_CATEGORIES = new Set(['花', '季']);
function TileImg({ tile, size = 'sm' }: { tile: string; size?: 'sm' | 'lg' }) {
  const src = TILE_IMAGE[tile];
  const cls = size === 'lg' ? 'h-14 w-auto mx-auto' : 'h-9 w-auto';
  if (src) return <img src={src} alt={tile} className={cls} draggable={false} />;
  return <span className="font-bold text-sm">{tile}</span>;
}

interface HandSubmissionProps {
  playerName: string;
  position: string;
  prevailingWind: string;
  claimedBy: string;
  currentTiles: string[];
  hasSubmitted: boolean;
  onSubmit: (tiles: string[], bonusTiles: string[], kongs: string[]) => void;
}

export function HandSubmission({ playerName, position, prevailingWind, claimedBy, currentTiles, hasSubmitted, onSubmit }: HandSubmissionProps) {
  const [tiles, setTiles] = useState<string[]>(currentTiles);
  const [bonusTiles, setBonusTiles] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('萬子');

  // Auto-detect kongs: any tile appearing 4+ times
  const tileCountMap: Record<string, number> = {};
  for (const t of tiles) tileCountMap[t] = (tileCountMap[t] ?? 0) + 1;
  const autoKongs = Object.entries(tileCountMap).filter(([, c]) => c >= 4).map(([t]) => t);
  const kongSet = new Set(autoKongs);
  const effectiveCount = tiles.length - autoKongs.length;

  const addTile = (tile: string) => {
    if (BONUS_CATEGORIES.has(selectedCategory)) {
      // Each flower/season tile is unique — only one of each in the set
      if (!bonusTiles.includes(tile)) setBonusTiles(prev => [...prev, tile]);
    } else {
      setTiles(prev => [...prev, tile]);
    }
  };

  const removeTile = (index: number) => setTiles(t => t.filter((_, i) => i !== index));
  const removeBonusTile = (index: number) => setBonusTiles(t => t.filter((_, i) => i !== index));

  const tileCount = TILE_TYPES[selectedCategory]?.length ?? 9;
  const gridCols = tileCount === 9 ? 'grid-cols-5' : 'grid-cols-4';

  // Live faan hint
  const seatNum = (WIND_ORDER.indexOf(position as typeof WIND_ORDER[number]) + 1) || 1;
  const hintPatterns = detectAllPatterns(tiles, autoKongs);
  const { faan: hintWdFaan, breakdown: hintWdBreakdown } = computeWindDragonPungFaan(tiles, autoKongs, position, prevailingWind);
  const bonusFaan = computeFlowerFaan(bonusTiles, seatNum);
  const hintIsCapped = hintPatterns[0]?.isCapped ?? false;
  const hintPatternFaan = hintPatterns.reduce((s, p) => s + p.faan, 0);
  const hintTotal = Math.min(13, hintPatternFaan + (hintIsCapped ? 0 : hintWdFaan + bonusFaan));
  const showHint = tiles.length > 0 || bonusTiles.length > 0;

  if (hasSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Hand Submitted!</h2>
          <p className="text-gray-600 mb-4">Waiting for other players...</p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Your Hand ({effectiveCount} tiles)</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {tiles.map((tile, i) => <TileImg key={i} tile={tile} size="sm" />)}
            </div>
            {autoKongs.length > 0 && (
              <div className="mt-1">
                <p className="text-xs text-blue-600 font-semibold">槓 {autoKongs.join(', ')}</p>
              </div>
            )}
            {bonusTiles.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {bonusTiles.map((tile, i) => <TileImg key={i} tile={tile} size="sm" />)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Alert */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 border-l-4 border-orange-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Win Claimed!</h3>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{claimedBy}</span> claimed a win. Submit your current hand for scoring.
              </p>
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{playerName}</h2>
              <p className="text-sm text-gray-600">Submit your hand ({prevailingWind} round)</p>
            </div>
            <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold text-lg">{position}</div>
          </div>
        </div>

        {/* Current Hand */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Your Hand ({effectiveCount} tiles)</p>
            {(tiles.length > 0 || bonusTiles.length > 0) && (
              <button onClick={() => { setTiles([]); setBonusTiles([]); }}
                className="text-sm text-red-600 hover:text-red-700 font-medium">Clear All</button>
            )}
          </div>

          {/* Main tiles */}
          <div className="min-h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-200">
            {tiles.length === 0
              ? <p className="text-center text-gray-500 text-sm py-4">Tap tiles below to add</p>
              : <div className="flex flex-wrap gap-1">
                  {tiles.map((tile, i) => (
                    <button key={i} onClick={() => removeTile(i)}
                      className={`rounded shadow border transition-colors p-0.5 flex items-center justify-center ${
                        kongSet.has(tile)
                          ? 'bg-blue-50 border-blue-300 hover:bg-red-50 hover:border-red-300'
                          : 'bg-white border-gray-200 hover:bg-red-50 hover:border-red-300'
                      }`}>
                      <TileImg tile={tile} size="sm" />
                    </button>
                  ))}
                </div>
            }
          </div>
          {autoKongs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {autoKongs.map(tile => (
                <div key={tile} className="flex items-center gap-0.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                  <span className="text-xs font-bold text-blue-700 mr-1">槓</span>
                  {[0,1,2,3].map(i => <TileImg key={i} tile={tile} size="sm" />)}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2 text-center mt-2">Tap to remove</p>

          {/* Live faan hint */}
          {showHint && (
            <div className={`mt-2 rounded-lg px-3 py-2 border ${
              hintIsCapped || hintTotal >= 10 ? 'bg-red-50 border-red-200'
              : hintTotal >= 3 ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  {hintPatterns.length === 0
                    ? <span className="text-xs text-gray-500">No pattern detected yet</span>
                    : hintPatterns.map(p => (
                        <span key={p.key} className={`text-xs font-semibold truncate ${p.isCapped ? 'text-red-700' : 'text-gray-800'}`}>
                          {p.zhName} {p.enName}{p.isCapped ? ' ★' : ''}
                          <span className="font-normal text-gray-500 ml-1">{p.faan}番</span>
                        </span>
                      ))
                  }
                  {!hintIsCapped && (hintWdBreakdown.length > 0 || bonusFaan > 0) && (
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 mt-0.5">
                      {hintWdBreakdown.map(b => <span key={b.label}>+{b.faan} {b.label}</span>)}
                      {bonusFaan > 0 && <span>花/季 +{bonusFaan}番</span>}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold leading-tight ${hintTotal >= 10 ? 'text-red-600' : hintTotal >= 3 ? 'text-green-700' : 'text-gray-400'}`}>
                    ~{hintTotal}番
                  </div>
                  <div className="text-xs text-gray-400">
                    {hintIsCapped ? '★ limit' : hintTotal < 3 ? `need ${3 - hintTotal} more` : '✔ ≥3番'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bonus Tiles */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Bonus Tiles (花/季)</p>
            <div className="min-h-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-dashed border-purple-200">
              {bonusTiles.length === 0
                ? <p className="text-center text-gray-400 text-xs py-1">Select 花 or 季 below to add bonus tiles</p>
                : <div className="flex flex-wrap gap-1">
                    {bonusTiles.map((tile, i) => (
                      <button key={i} onClick={() => removeBonusTile(i)}
                        className="bg-white rounded shadow border border-purple-200 hover:bg-red-50 hover:border-red-300 transition-colors p-0.5 flex items-center justify-center">
                        <TileImg tile={tile} size="sm" />
                      </button>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>

        {/* Tile Selector */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="font-semibold text-gray-900 mb-3">Add Tiles</p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {Object.keys(TILE_TYPES).map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedCategory === cat
                    ? BONUS_CATEGORIES.has(cat) ? 'bg-purple-600 text-white shadow-md' : 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>{cat}</button>
            ))}
          </div>
          <div className={`grid ${gridCols} gap-1.5`}>
            {TILE_TYPES[selectedCategory].map(tile => {
              const alreadyAdded = BONUS_CATEGORIES.has(selectedCategory) && bonusTiles.includes(tile);
              return (
                <button key={tile} onClick={() => addTile(tile)}
                  disabled={alreadyAdded}
                  className={`rounded-lg p-1 flex items-center justify-center border-2 transition-all active:scale-95 ${
                    alreadyAdded
                      ? 'border-gray-200 bg-gray-50 opacity-30 cursor-not-allowed'
                      : BONUS_CATEGORIES.has(selectedCategory)
                        ? 'border-gray-200 hover:border-orange-400 bg-gray-50 hover:bg-orange-50'
                        : 'border-gray-200 hover:border-orange-400 bg-gray-50 hover:bg-orange-50'
                  }`}>
                  <TileImg tile={tile} size="lg" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button onClick={() => onSubmit(tiles, bonusTiles, autoKongs)}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl">
          Submit Hand
        </button>
        <p className="text-center text-xs text-gray-500 mt-3">Used for reference during scoring</p>
      </div>
    </div>
  );
}

