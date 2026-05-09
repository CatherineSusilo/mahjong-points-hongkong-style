import { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface HandSubmissionProps {
  playerName: string;
  position: string;
  claimedBy: string;
  currentTiles: string[];
  hasSubmitted: boolean;
  onSubmit: (tiles: string[]) => void;
}

const TILE_TYPES = {
  '萬子': ['一萬', '二萬', '三萬', '四萬', '五萬', '六萬', '七萬', '八萬', '九萬'],
  '筒子': ['一筒', '二筒', '三筒', '四筒', '五筒', '六筒', '七筒', '八筒', '九筒'],
  '索子': ['一索', '二索', '三索', '四索', '五索', '六索', '七索', '八索', '九索'],
  '字牌': ['東', '南', '西', '北', '中', '發', '白']
};

export function HandSubmission({ playerName, position, claimedBy, currentTiles, hasSubmitted, onSubmit }: HandSubmissionProps) {
  const [tiles, setTiles] = useState<string[]>(currentTiles);
  const [selectedCategory, setSelectedCategory] = useState<string>('萬子');

  const addTile = (tile: string) => {
    if (tiles.length < 14) {
      setTiles([...tiles, tile]);
    }
  };

  const removeTile = (index: number) => {
    setTiles(tiles.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    onSubmit(tiles);
  };

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
            <p className="text-sm font-semibold text-gray-700 mb-2">Your Hand</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {tiles.map((tile, index) => (
                <div key={index} className="bg-white px-3 py-1 rounded border border-gray-200 text-sm">
                  {tile}
                </div>
              ))}
            </div>
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
                <span className="font-semibold">{claimedBy}</span> claimed a win.
                Please submit your current hand for scoring.
              </p>
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{playerName}</h2>
              <p className="text-sm text-gray-600">Submit your hand</p>
            </div>
            <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold text-lg">
              {position}
            </div>
          </div>
        </div>

        {/* Current Hand */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-900">Your Hand ({tiles.length}/14)</p>
            {tiles.length > 0 && (
              <button
                onClick={() => setTiles([])}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="min-h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-200">
            {tiles.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-4">Add your tiles below</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tiles.map((tile, index) => (
                  <button
                    key={index}
                    onClick={() => removeTile(index)}
                    className="bg-white px-3 py-2 rounded-lg shadow border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors font-medium text-sm"
                  >
                    {tile}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tile Selector */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <p className="font-semibold text-gray-900 mb-3">Add Tiles</p>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {Object.keys(TILE_TYPES).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedCategory === category
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {TILE_TYPES[selectedCategory as keyof typeof TILE_TYPES].map((tile) => (
              <button
                key={tile}
                onClick={() => addTile(tile)}
                disabled={tiles.length >= 14}
                className="bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border-2 border-gray-200 hover:border-blue-400 rounded-lg py-3 font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tile}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
        >
          Submit Hand
        </button>

        <p className="text-center text-xs text-gray-500 mt-3">
          This will be used for final scoring
        </p>
      </div>
    </div>
  );
}
