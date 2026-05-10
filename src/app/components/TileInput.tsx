/// <reference types="vite/client" />
import { useState } from 'react';
import { Trophy, Menu, X, Flag, BookOpen, Calculator } from 'lucide-react';
import { detectAllPatterns, computeWindDragonPungFaan, computeFlowerFaan, WIND_ORDER } from './hkScoring';
import { InfoPage } from './InfoPage';
import { ScoreCalculator } from './ScoreCalculator';

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

interface TileInputProps {
  playerName: string;
  position: string;
  prevailingWind: string;
  isHost: boolean;
  onWinClaimed: () => void;
  onTilesUpdate: (tiles: string[]) => void;
  onEndGame: () => void;
  currentTiles: string[];
}

/** Small image used in "Your Hand"; large for the picker */
function TileImg({ tile, size = 'sm' }: { tile: string; size?: 'sm' | 'lg' }) {
  const src = TILE_IMAGE[tile];
  const cls = size === 'lg' ? 'h-14 w-auto mx-auto' : 'h-9 w-auto';
  if (src) return <img src={src} alt={tile} className={cls} draggable={false} />;
  return <span className="font-bold text-sm">{tile}</span>;
}

export function TileInput({ playerName, position, prevailingWind, isHost, onWinClaimed, onTilesUpdate, onEndGame, currentTiles }: TileInputProps) {
  const [tiles, setTiles] = useState<string[]>(currentTiles);
  const [bonusTiles, setBonusTiles] = useState<string[]>([]);
  const [kongs, setKongs] = useState<string[]>([]);
  const [concealed, setConcealed] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('萬子');
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [kongPickerOpen, setKongPickerOpen] = useState(false);
  const [kongPickerCategory, setKongPickerCategory] = useState<string>('萬子');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addTile = (tile: string) => {
    if (BONUS_CATEGORIES.has(selectedCategory)) {
      setBonusTiles(prev => [...prev, tile]);
    } else if (tiles.length < 14) {
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
    setKongs([]);
    onTilesUpdate([]);
  };

  const addKong = (tile: string) => {
    if (kongs.length < 4) {
      setKongs(prev => [...prev, tile]);
    }
    setKongPickerOpen(false);
  };

  const removeKong = (index: number) => {
    setKongs(prev => prev.filter((_, i) => i !== index));
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

  // Kong picker categories (no bonus tiles)
  const KONG_CATEGORIES = Object.keys(TILE_TYPES).filter(c => !BONUS_CATEGORIES.has(c));

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 p-4">
      {infoOpen && <InfoPage onClose={() => setInfoOpen(false)} />}
      {calcOpen && (
        <ScoreCalculator
          tiles={tiles}
          bonusTiles={bonusTiles}
          kongs={kongs}
          concealed={concealed}
          position={position}
          prevailingWind={prevailingWind}
          onClose={() => setCalcOpen(false)}
        />
      )}

      {/* Kong Picker Modal */}
      {kongPickerOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-900">Add Kong (槓) — pick tile</p>
              <button onClick={() => setKongPickerOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-4 gap-1.5">
                {KONG_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setKongPickerCategory(cat)}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      kongPickerCategory === cat
                        ? 'bg-red-600 text-white shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >{cat}</button>
                ))}
              </div>
              <div className={`grid ${TILE_TYPES[kongPickerCategory].length === 9 ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5`}>
                {TILE_TYPES[kongPickerCategory].map(tile => (
                  <button
                    key={tile}
                    onClick={() => addKong(tile)}
                    className="rounded-lg p-1 flex items-center justify-center border-2 border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 transition-all active:scale-95"
                  >
                    <TileImg tile={tile} size="lg" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
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
                        onClick={() => { setMenuOpen(false); setInfoOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left transition-colors"
                      >
                        <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
                        <span className="font-semibold text-gray-800">Mahjong Guide</span>
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); setCalcOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 text-left transition-colors"
                      >
                        <Calculator className="w-5 h-5 text-green-600 shrink-0" />
                        <span className="font-semibold text-gray-800">Calculate Score (計分)</span>
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
            <p className="font-semibold text-gray-900">Your Hand ({tiles.length}/14)</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConcealed(prev => !prev)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                  concealed
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                門前清 {concealed ? 'ON' : 'OFF'}
              </button>
              {(tiles.length > 0 || bonusTiles.length > 0 || kongs.length > 0) && (
                <button onClick={clearAll} className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Main tiles — draggable image buttons */}
          <div className="min-h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-200">
            {tiles.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Tap tiles below to add</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {tiles.map((tile, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all ${dragIndex === index ? 'opacity-40 scale-95' : ''} ${
                      dragOverIndex === index && dragIndex !== index ? 'ring-2 ring-blue-400 rounded' : ''
                    }`}
                  >
                    <button
                      onClick={() => removeTile(index)}
                      className="bg-white rounded shadow border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors cursor-move select-none p-0.5 flex items-center justify-center"
                    >
                      <TileImg tile={tile} size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-3 py-2 text-center mt-2">
            Tap to remove • Drag to reorder
          </p>

          {/* Live Faan Hint */}
          {(() => {
            if (tiles.length === 0 && kongs.length === 0 && bonusTiles.length === 0) return null;
            const patterns = detectAllPatterns(tiles, kongs);
            const { faan: wdFaan, breakdown: wdBreakdown } = computeWindDragonPungFaan(tiles, kongs, position, prevailingWind);
            const seatNum = (WIND_ORDER.indexOf(position as typeof WIND_ORDER[number]) + 1) || 1;
            const bonusFaan = computeFlowerFaan(bonusTiles, seatNum);
            const isCapped = patterns[0]?.isCapped ?? false;
            const patternFaan = patterns.reduce((s, p) => s + p.faan, 0);
            const total = Math.min(13, patternFaan + (isCapped ? 0 : wdFaan + bonusFaan));
            return (
              <div className={`mt-2 rounded-lg px-3 py-2 border ${
                isCapped || total >= 10
                  ? 'bg-red-50 border-red-200'
                  : total >= 3
                  ? 'bg-green-50 border-green-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    {patterns.length === 0 && wdBreakdown.length === 0 && bonusFaan === 0
                      ? <span className="text-xs text-gray-500">Add more tiles to detect a pattern</span>
                      : patterns.length === 0
                      ? <span className="text-xs text-gray-400 italic">No base hand pattern yet</span>
                      : patterns.map(p => (
                          <span key={p.key} className={`text-xs font-semibold ${
                            p.isCapped ? 'text-red-700' : 'text-gray-800'
                          }`}>
                            {p.zhName} {p.enName}{p.isCapped ? ' ★' : ''}
                            <span className="font-normal text-gray-500 ml-1">{p.faan}番</span>
                          </span>
                        ))
                    }
                    {!isCapped && (wdBreakdown.length > 0 || bonusFaan > 0) && (
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 mt-0.5">
                        {wdBreakdown.map(b => <span key={b.label}>+{b.faan} {b.label}</span>)}
                        {bonusFaan > 0 && <span>花/季 +{bonusFaan}番</span>}
                      </div>
                    )}
                    {isCapped && bonusFaan > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">花/季 not counted (capped hand)</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold leading-tight ${
                      total >= 10 ? 'text-red-600'
                      : total >= 3  ? 'text-green-700'
                      : 'text-gray-400'
                    }`}>
                      ~{total}番
                    </div>
                    <div className="text-xs text-gray-400">
                      {isCapped ? '★ limit hand' : total < 3 ? `need ${3 - total} more to win` : '✔ can win (≥3番)'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Declared Kongs */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600">Declared Kongs (槓) {kongs.length}/4</p>
              <button
                onClick={() => setKongPickerOpen(true)}
                disabled={kongs.length >= 4}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >+ Kong</button>
            </div>
            {kongs.length > 0 && (
              <div className="space-y-1.5">
                {kongs.map((tile, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                    <div className="flex gap-0.5 flex-1">
                      {[0, 1, 2, 3].map(i => (
                        <TileImg key={i} tile={tile} size="sm" />
                      ))}
                    </div>
                    <button onClick={() => removeKong(idx)} className="p-0.5 hover:bg-red-100 rounded text-red-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            {TILE_TYPES[selectedCategory].map((tile) => (
              <button
                key={tile}
                onClick={() => addTile(tile)}
                disabled={!BONUS_CATEGORIES.has(selectedCategory) && tiles.length >= 14}
                className={`rounded-lg p-1 flex items-center justify-center border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
                  BONUS_CATEGORIES.has(selectedCategory)
                    ? 'border-purple-200 hover:border-purple-400 bg-purple-50 hover:bg-purple-100'
                    : 'border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50'
                }`}
              >
                <TileImg tile={tile} size="lg" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-3 mb-6">
          Track your current tiles • Use ☰ menu to declare a win or end the game
        </p>
      </div>
    </div>
  );
}
