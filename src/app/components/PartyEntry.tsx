import { useState } from 'react';
import { Users, LogIn, UserPlus } from 'lucide-react';

interface PartyEntryProps {
  onCreateParty: (hostName: string) => void;
  onJoinParty: (partyCode: string, playerName: string) => void;
}

export function PartyEntry({ onCreateParty, onJoinParty }: PartyEntryProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [playerName, setPlayerName] = useState('');
  const [partyCode, setPartyCode] = useState('');

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateParty(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && partyCode.trim().length === 6) {
      onJoinParty(partyCode.trim(), playerName.trim());
    }
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="bg-red-600 p-4 rounded-2xl inline-block mb-4">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">HK Mahjong Counter</h1>
            <p className="text-gray-600">Multi-device score tracking</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <UserPlus className="w-6 h-6" />
              Host New Game
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full bg-white border-2 border-red-600 text-red-600 py-4 rounded-xl font-semibold text-lg hover:bg-red-50 transition-all flex items-center justify-center gap-3"
            >
              <LogIn className="w-6 h-6" />
              Join Game
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Each player uses their own device
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <button
            onClick={() => setMode('select')}
            className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
          >
            ← Back
          </button>

          <div className="mb-6">
            <div className="bg-red-100 p-3 rounded-xl inline-block mb-3">
              <UserPlus className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Host New Game</h2>
            <p className="text-sm text-gray-600 mt-1">You'll get a 6-digit code to share</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
              maxLength={20}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!playerName.trim()}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            Create Party
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <button
          onClick={() => setMode('select')}
          className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="mb-6">
          <div className="bg-blue-100 p-3 rounded-xl inline-block mb-3">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Join Game</h2>
          <p className="text-sm text-gray-600 mt-1">Enter the 6-digit code from the host</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Party Code
            </label>
            <input
              type="text"
              value={partyCode}
              onChange={(e) => setPartyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-center text-2xl font-bold tracking-wider"
              maxLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              maxLength={20}
            />
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={!playerName.trim() || partyCode.length !== 6}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          Join Party
        </button>
      </div>
    </div>
  );
}
