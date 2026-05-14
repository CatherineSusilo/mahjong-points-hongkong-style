/// <reference types="vite/client" />
import { useState, useRef, useEffect } from 'react';
import { Trophy, Menu, X, Flag, BookOpen, BarChart2 } from 'lucide-react';
import { computeWindDragonPungFaan, WIND_ORDER, FLOWER_POSITION, SEASON_POSITION } from './hkScoring';
import { InfoPage } from './InfoPage';

// Load all tile GIFs at build time via Vite glob
const _tileGifs = import.meta.glob('./tiles/*.gif', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const img = (file: string): string => _tileGifs[`./tiles/${file}`] ?? '';

/** Map from tile name → image URL */
const TILE_IMAGE: Record<string, string> = {
  // 萬子 (Characters) — c1‑c9
  '一萬': img('c1.gif'), '二萬': img('c2.gif'), '三萬': img('c3.gif'),
  '四萬': img('c4.gif'), '五萬': img('c5.gif'), '六萬': img('c6.gif'),
  '七萬': img('c7.gif'), '八萬': img('c8.gif'), '九萬': img('c9.gif'),
  // 筒子 (Circles) — d1‑d9
  '一筒': img('d1.gif'), '二筒': img('d2.gif'), '三筒': img('d3.gif'),
  '四筒': img('d4.gif'), '五筒': img('d5.gif'), '六筒': img('d6.gif'),
  '七筒': img('d7.gif'), '八筒': img('d8.gif'), '九筒': img('d9.gif'),
  // 索子 (Bamboo) — b1‑b9
  '一索': img('b1.gif'), '二索': img('b2.gif'), '三索': img('b3.gif'),
  '四索': img('b4.gif'), '五索': img('b5.gif'), '六索': img('b6.gif'),
  '七索': img('b7.gif'), '八索': img('b8.gif'), '九索': img('b9.gif'),
  // 字牌 (Honours)
  '東': img('a4.gif'), '南': img('a7.gif'), '西': img('a5.gif'), '北': img('a6.gif'),
  '中': img('a1.gif'), '發': img('a3.gif'), '白': img('a2.gif'),
  // 花 (Flowers)
  '梅': img('f1.gif'), '蘭': img('f2.gif'), '菊': img('f3.gif'), '竹': img('f4.gif'),
  // 季 (Seasons)
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

const TILE_SORT_ORDER: Record<string, number> = Object.fromEntries(
  [
    ...TILE_TYPES['萬子'],
    ...TILE_TYPES['筒子'],
    ...TILE_TYPES['索子'],
    '東', '南', '西', '北', '中', '發', '白',
  ].map((t, i) => [t, i])
);

interface TileInputProps {
  playerName: string;
  position: string;
  prevailingWind: string;
  isHost: boolean;
  onWinClaimed: () => void;
  onTilesUpdate: (tiles: string[]) => void;
  onEndGame: () => void;
  currentTiles: string[];
  scores: { [name: string]: number };
  players: { name: string; position: string }[];
}

/** Small image used in "Your Hand"; large for the picker */
function TileImg({ tile, size = 'sm' }: { tile: string; size?: 'sm' | 'lg' }) {
  const src = TILE_IMAGE[tile];
  const cls = size === 'lg' ? 'h-14 w-auto mx-auto' : 'h-9 w-auto';
  if (src) return <img src={src} alt={tile} className={cls} draggable={false} />;
  return <span className="font-bold text-sm">{tile}</span>;
}

export function TileInput({ playerName, position, prevailingWind, isHost, onWinClaimed, onTilesUpdate, onEndGame, currentTiles, scores, players }: TileInputProps) {
  const [tiles, setTiles] = useState<string[]>(currentTiles);
  const [bonusTiles, setBonusTiles] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('萬子');
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Touch drag refs (no stale-closure issues in non-passive listener)
  const touchDraggingRef = useRef(false);
  const justDraggedRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartInfo = useRef<{ index: number; x: number; y: number } | null>(null);
  const tilesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-detect kongs: any tile appearing 4+ times is a kong
  const tileCountMap: Record<string, number> = {};
  for (const t of tiles) tileCountMap[t] = (tileCountMap[t] ?? 0) + 1;
  const autoKongs = Object.entries(tileCountMap).filter(([, c]) => c >= 4).map(([t]) => t);
  const kongSet = new Set(autoKongs);
  // Each kong uses 4 tiles but counts as 3 (4th is the extra drawn tile)
  const effectiveCount = tiles.length - autoKongs.length;

  const addTile = (tile: string) => {
    if (BONUS_CATEGORIES.has(selectedCategory)) {
      // Each flower/season tile is unique — only one of each in the set
      if (!bonusTiles.includes(tile)) setBonusTiles(prev => [...prev, tile]);
    } else if (effectiveCount < 14) {
      const newTiles = [...tiles, tile];
      setTiles(newTiles);
      onTilesUpdate(newTiles);
    }
  };

  const removeTile = (index: number) => {
    const newTiles = tiles.filter((_, i) => i !== index);
    setTiles(newTiles);
    onTilesUpdate(newTiles);
  };

  const removeBonusTile = (index: number) => {
    setBonusTiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setTiles([]);
    setBonusTiles([]);
    onTilesUpdate([]);
  };

  const sortHand = () => {
    const sorted = [...tiles].sort(
      (a, b) => (TILE_SORT_ORDER[a] ?? 99) - (TILE_SORT_ORDER[b] ?? 99)
    );
    setTiles(sorted);
    onTilesUpdate(sorted);
  };

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newTiles = [...tiles];
    const dragged = newTiles[dragIndex];
    newTiles.splice(dragIndex, 1);
    newTiles.splice(index, 0, dragged);
    setTiles(newTiles);
    onTilesUpdate(newTiles);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Non-passive touchmove so we can preventDefault (block scroll) during active drag
  useEffect(() => {
    const el = tilesContainerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartInfo.current) return;
      const touch = e.touches[0];
      if (!touchDraggingRef.current) {
        // Cancel long-press if finger moves before timer fires
        const dx = touch.clientX - touchStartInfo.current.x;
        const dy = touch.clientY - touchStartInfo.current.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
          touchStartInfo.current = null;
        }
        return;
      }
      e.preventDefault();
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const tileEl = target?.closest('[data-tile-idx]');
      if (tileEl) {
        const idx = parseInt(tileEl.getAttribute('data-tile-idx') ?? '', 10);
        if (!isNaN(idx)) setDragOverIndex(idx);
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const handleTileTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartInfo.current = { index, x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      touchDraggingRef.current = true;
      setDragIndex(index);
      setDragOverIndex(index);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 250);
  };

  const handleTilesTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (touchDraggingRef.current && dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newTiles = [...tiles];
      const dragged = newTiles[dragIndex];
      newTiles.splice(dragIndex, 1);
      newTiles.splice(dragOverIndex, 0, dragged);
      setTiles(newTiles);
      onTilesUpdate(newTiles);
    }
    if (touchDraggingRef.current) {
      justDraggedRef.current = true;
      setTimeout(() => { justDraggedRef.current = false; }, 200);
    }
    touchDraggingRef.current = false;
    touchStartInfo.current = null;
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleMenuIWon = () => {
    setMenuOpen(false);
    onWinClaimed();
  };

  const handleMenuEndGame = () => {
    setMenuOpen(false);
    if (window.confirm('End the game for everyone? All players will see the final scores.')) {
      onEndGame();
    }
  };

  // Suits get 5 cols (2 rows of 9); honours/bonus get 4
  const tileCount = TILE_TYPES[selectedCategory].length;
  const gridCols = tileCount === 9 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 p-4">
      {infoOpen && <InfoPage onClose={() => setInfoOpen(false)} />}

      {/* Leaderboard modal */}
      {leaderboardOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setLeaderboardOpen(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-40 bg-white rounded-2xl shadow-2xl p-5 max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Standings</h3>
              <button onClick={() => setLeaderboardOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {[...players]
                .sort((a, b) => (scores[b.name] ?? 0) - (scores[a.name] ?? 0))
                .map((p, idx) => {
                  const score = scores[p.name] ?? 0;
                  const isMe = p.name === playerName;
                  return (
                    <div
                      key={p.name}
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
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {isMe && <span className="text-xs text-green-600 font-semibold">You</span>}
                        <span className="text-xs text-gray-400">{p.position}</span>
                      </div>
                      <span className={`font-bold text-sm ${score >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{playerName}</h2>
              <p className="text-sm text-gray-600">Position: {position}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-600 px-4 py-2 rounded-full font-bold text-lg">
                {position}
              </div>

              {/* Hamburger Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(prev => !prev)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Menu"
                >
                  {menuOpen
                    ? <X className="w-6 h-6 text-gray-700" />
                    : <Menu className="w-6 h-6 text-gray-700" />}
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-52 z-20">
                      <button
                        onClick={handleMenuIWon}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 text-left transition-colors"
                      >
                        <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                        <span className="font-semibold text-gray-800">I Won! (胡)</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); setLeaderboardOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left transition-colors"
                      >
                        <BarChart2 className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="font-semibold text-gray-800">Leaderboard</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); setInfoOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors"
                      >
                        <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-gray-800">Mahjong Guide</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={isHost ? handleMenuEndGame : undefined}
                        disabled={!isHost}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isHost
                            ? 'hover:bg-red-50 text-red-600 cursor-pointer'
                            : 'opacity-40 cursor-not-allowed text-gray-500'
                        }`}
                      >
                        <Flag className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-semibold">End Game</div>
                          {!isHost && <div className="text-xs">Host only</div>}
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Current Hand */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Your Hand ({effectiveCount}/14)</p>
            <div className="flex items-center gap-2">
              {tiles.length > 0 && (
                <button onClick={sortHand} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Sort
                </button>
              )}
              {(tiles.length > 0 || bonusTiles.length > 0) && (
                <button onClick={clearAll} className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Main tiles — draggable image buttons */}
          <div
            ref={tilesContainerRef}
            onTouchEnd={handleTilesTouchEnd}
            className="min-h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-200"
          >
            {tiles.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Tap tiles below to add</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tiles.map((tile, index) => (
                  <div
                    key={index}
                    data-tile-idx={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={(e) => handleTileTouchStart(e, index)}
                    className={`transition-all ${dragIndex === index ? 'opacity-40 scale-95' : ''} ${
                      dragOverIndex === index && dragIndex !== index ? 'ring-2 ring-blue-400 rounded' : ''
                    }`}
                  >
                    <button
                      onClick={() => { if (justDraggedRef.current) return; removeTile(index); }}
                      className={`rounded shadow border transition-colors cursor-move select-none p-0.5 flex items-center justify-center ${
                        kongSet.has(tile)
                          ? 'bg-blue-50 border-blue-300 hover:bg-red-50 hover:border-red-300'
                          : 'bg-white border-gray-200 hover:bg-red-50 hover:border-red-300'
                      }`}
                    >
                      <TileImg tile={tile} size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

          <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2 text-center mt-2">
            Tap to remove • Hold & drag to reorder
          </p>

          {/* Live Bonus Faan Hint */}
          {(() => {
            if (tiles.length === 0 && bonusTiles.length === 0) return null;
            const seatNum = (WIND_ORDER.indexOf(position as typeof WIND_ORDER[number]) + 1) || 1;
            const { faan: wdFaan, breakdown: wdBreakdown } = computeWindDragonPungFaan(tiles, autoKongs, position, prevailingWind);

            // Flower/season breakdown
            const flowers = bonusTiles.filter(t => t in FLOWER_POSITION);
            const seasons = bonusTiles.filter(t => t in SEASON_POSITION);
            const flowerLines: Array<{ label: string; faan: number }> = [];
            if (flowers.length === 4) {
              flowerLines.push({ label: '梅蘭菊竹 (All Flowers)', faan: 2 });
            } else {
              for (const t of flowers.filter(f => FLOWER_POSITION[f] === seatNum)) {
                flowerLines.push({ label: `${t} (Own Flower)`, faan: 1 });
              }
            }
            if (seasons.length === 4) {
              flowerLines.push({ label: '春夏秋冬 (All Seasons)', faan: 2 });
            } else {
              for (const t of seasons.filter(s => SEASON_POSITION[s] === seatNum)) {
                flowerLines.push({ label: `${t} (Own Season)`, faan: 1 });
              }
            }
            const noFlowerFaan = tiles.length > 0 && bonusTiles.length === 0 ? 1 : 0;
            if (noFlowerFaan > 0) {
              flowerLines.push({ label: '無花 (No Bonus Tiles)', faan: 1 });
            }

            const bonusFaan = flowerLines.reduce((s, l) => s + l.faan, 0);
            const total = wdFaan + bonusFaan;
            const allLines = [...wdBreakdown, ...flowerLines];

            return (
              <div className={`mt-2 rounded-lg px-3 py-2 border ${
                total >= 3 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    {allLines.length === 0
                      ? <span className="text-xs text-gray-400">No wind/dragon pungs or matching flowers yet</span>
                      : allLines.map(b => (
                          <div key={b.label} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{b.label}</span>
                            <span className="font-semibold text-green-700 ml-2">+{b.faan}番</span>
                          </div>
                        ))
                    }
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className={`text-lg font-bold leading-tight ${
                      total >= 3 ? 'text-green-700' : 'text-gray-400'
                    }`}>
                      {total}番
                    </div>
                    <div className="text-xs text-gray-400">bonus</div>
                  </div>
                </div>
                {total > 0 && allLines.length > 1 && (
                  <div className="border-t border-gray-200 mt-1.5 pt-1 flex justify-between text-xs font-semibold text-gray-600">
                    <span>Total bonus faan</span>
                    <span>{total}番</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bonus Tiles */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Bonus Tiles (花/季)</p>
            <div className="min-h-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-dashed border-purple-200">
              {bonusTiles.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-1">Select 花 or 季 below to add bonus tiles</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {bonusTiles.map((tile, index) => (
                    <button
                      key={index}
                      onClick={() => removeBonusTile(index)}
                      className="bg-white rounded shadow border border-purple-200 hover:bg-red-50 hover:border-red-300 transition-colors p-0.5 flex items-center justify-center"
                    >
                      <TileImg tile={tile} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Tiles */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="font-semibold text-gray-900 mb-3">Add Tiles</p>

          {/* Category Tabs — 3 per row so all 6 fit in 2 rows */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.keys(TILE_TYPES).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedCategory === category
                    ? BONUS_CATEGORIES.has(category)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Tile Image Grid */}
          <div className={`grid ${gridCols} gap-2`}>
            {TILE_TYPES[selectedCategory].map((tile) => {
              const alreadyAdded = BONUS_CATEGORIES.has(selectedCategory) && bonusTiles.includes(tile);
              return (
                <button
                  key={tile}
                  onClick={() => addTile(tile)}
                  disabled={alreadyAdded || (!BONUS_CATEGORIES.has(selectedCategory) && effectiveCount >= 14)}
                  className={`rounded-lg p-1 flex items-center justify-center border-2 transition-all disabled:cursor-not-allowed active:scale-95 ${
                    alreadyAdded
                      ? 'border-gray-200 bg-gray-50 opacity-30'
                      : BONUS_CATEGORIES.has(selectedCategory)
                        ? 'border-purple-200 hover:border-purple-400 bg-purple-50 hover:bg-purple-100'
                        : 'border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 disabled:opacity-50'
                  }`}
                >
                  <TileImg tile={tile} size="lg" />
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-3 mb-6">
          Track your current tiles • Use ☰ menu to declare a win or end the game
        </p>
      </div>
    </div>
  );
}
