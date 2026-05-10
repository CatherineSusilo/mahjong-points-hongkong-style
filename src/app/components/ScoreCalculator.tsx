import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  WIND_ORDER,
  FLOWER_POSITION,
  SEASON_POSITION,
  DRAGON_TILES,
  computeFlowerFaan,
  autoDetectSuitPattern,
  computeTotalFaan,
  faanToBasePoints,
  type ScoreInput,
} from './hkScoring';

// ─── Hand options data ────────────────────────────────────────────────────────

interface HandOption {
  key: string;
  zh: string;
  en: string;
  faan: number;
  isCapped: boolean;
  noConcealedBonus?: boolean; // Seven Pairs, 13 Orphans, Self Triplets, Nine Gates
}

const HAND_OPTIONS: HandOption[] = [
  // Regular hands
  { key: 'none',         zh: '無 / 雞胡',    en: 'None / Chicken',        faan: 0,  isCapped: false },
  { key: 'common',       zh: '平和',          en: 'Common Hand',           faan: 1,  isCapped: false },
  { key: 'all_triplets', zh: '對對胡',        en: 'All Triplets',          faan: 3,  isCapped: false },
  { key: 'mixed_suit',   zh: '混一色',        en: 'Mixed One Suit',        faan: 3,  isCapped: false },
  { key: 'mix_orphans',  zh: '全帶么',        en: 'Mixed Orphans',         faan: 4,  isCapped: false },
  { key: 'seven_pairs',  zh: '七對子',        en: 'Seven Pairs',           faan: 4,  isCapped: false, noConcealedBonus: true },
  { key: 'sm_dragons',   zh: '小三元',        en: 'Small Three Dragons',   faan: 5,  isCapped: false },
  { key: 'sm_winds',     zh: '小四喜',        en: 'Small Four Winds',      faan: 6,  isCapped: false },
  { key: 'all_suit',     zh: '清一色',        en: 'All One Suit',          faan: 7,  isCapped: false },
  { key: 'gt_dragons',   zh: '大三元',        en: 'Great Dragons',         faan: 8,  isCapped: false },
  // Capped hands
  { key: 'all_honour',   zh: '字一色',        en: 'All Honours',           faan: 10, isCapped: true  },
  { key: 'self_triplets',zh: '全暗刻',        en: 'Self Triplets',         faan: 10, isCapped: true, noConcealedBonus: true },
  { key: 'orphans',      zh: '清老頭',        en: 'Orphans (1s & 9s)',     faan: 10, isCapped: true  },
  { key: 'nine_gates',   zh: '九蓮寶燈',      en: 'Nine Gates',            faan: 10, isCapped: true, noConcealedBonus: true },
  { key: 'gt_winds',     zh: '大四喜',        en: 'Great Winds',           faan: 13, isCapped: true  },
  { key: 'thirteen',     zh: '十三么',        en: 'Thirteen Orphans',      faan: 13, isCapped: true, noConcealedBonus: true },
  { key: 'all_kongs',    zh: '四槓子',        en: 'All Kongs',             faan: 13, isCapped: true  },
  { key: 'heavenly',     zh: '天和',          en: 'Heavenly Hand',         faan: 13, isCapped: true  },
  { key: 'earthly',      zh: '地和',          en: 'Earthly Hand',          faan: 13, isCapped: true  },
];

const DETECTED_KEY_TO_HAND_KEY: Record<string, string> = {
  ALL_KONGS: 'all_kongs',
  THIRTEEN_ORPHANS: 'thirteen',
  ALL_HONOUR: 'all_honour',
  ORPHANS: 'orphans',
  ALL_ONE_SUIT: 'all_suit',
  MIXED_ONE_SUIT: 'mixed_suit',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface ScoreCalculatorProps {
  tiles: string[];
  bonusTiles: string[];
  kongs: string[];
  concealed: boolean;
  position: string;          // '東' | '南' | '西' | '北'
  prevailingWind?: string;   // from party state; defaults to seat position
  onClose: () => void;
}

export function ScoreCalculator({ tiles, bonusTiles, kongs, concealed, position, prevailingWind: initialPrevailingWind, onClose }: ScoreCalculatorProps) {
  const seatWindNum = (WIND_ORDER.indexOf(position as typeof WIND_ORDER[number]) + 1) || 1;

  // Auto-detect
  const detected = useMemo(() => autoDetectSuitPattern(tiles, kongs), [tiles, kongs]);
  const flowerFaan = useMemo(() => computeFlowerFaan(bonusTiles, seatWindNum), [bonusTiles, seatWindNum]);

  // Initial hand key from detection
  const initialHandKey = detected?.key ? DETECTED_KEY_TO_HAND_KEY[detected.key] ?? 'none' : 'none';
  const [handKey, setHandKey] = useState(initialHandKey);
  const [prevailingWind, setPrevailingWind] = useState<string>(initialPrevailingWind ?? position);
  const [winByDiscard, setWinByDiscard] = useState(false);
  const [winnerIsEast, setWinnerIsEast] = useState(position === '東');

  // Wind/dragon pungs
  const [pungSeatWind, setPungSeatWind] = useState(false);
  const [pungPrevailing, setPungPrevailing] = useState(false);
  const [pungZhong, setPungZhong] = useState(false);
  const [pungFa, setPungFa] = useState(false);
  const [pungBai, setPungBai] = useState(false);

  // Winning conditions
  const [concealedCheck, setConcealedCheck] = useState(false);
  const [robbingKong, setRobbingKong] = useState(false);
  const [lastTile, setLastTile] = useState(false);
  const [winByKong, setWinByKong] = useState(false);
  const [winByDoubleKong, setWinByDoubleKong] = useState(false);

  const selectedHand = HAND_OPTIONS.find(h => h.key === handKey) ?? HAND_OPTIONS[0];
  const isCapped = selectedHand.isCapped;
  const isHardLimit = selectedHand.faan >= 13;
  const concealedEligible = !selectedHand.noConcealedBonus && concealed;

  // ── Compute windDragonFaan ─────────────────────────────────────────────────
  const windDragonFaan = useMemo(() => {
    if (isCapped) return 0;
    let f = 0;
    // Double wind check
    const seatIsAlsoPrevailing = position === prevailingWind;
    if (pungSeatWind && pungPrevailing && seatIsAlsoPrevailing) {
      f += 2; // double wind replaces both +1s
    } else {
      if (pungSeatWind) f += 1;
      if (pungPrevailing && !seatIsAlsoPrevailing) f += 1;
    }
    if (pungZhong) f += 1;
    if (pungFa)    f += 1;
    if (pungBai)   f += 1;
    return f;
  }, [isCapped, pungSeatWind, pungPrevailing, pungZhong, pungFa, pungBai, position, prevailingWind]);

  // ── Compute winConditionFaan ───────────────────────────────────────────────
  const winConditionFaan = useMemo(() => {
    if (isHardLimit) return 0;
    let f = 0;
    if (!winByDiscard) f += 1; // self-pick
    if (concealedCheck && concealedEligible) f += 1;
    if (robbingKong) f += 1;
    if (lastTile) f += 1;
    if (winByKong && !winByDiscard) f += 2;      // +2 (includes self-pick already counted)
    if (winByDoubleKong && !winByDiscard) f += 9; // +9 (includes self-pick already counted)
    return f;
  }, [isHardLimit, winByDiscard, concealedCheck, concealedEligible, robbingKong, lastTile, winByKong, winByDoubleKong]);

  // ── Final score ───────────────────────────────────────────────────────────
  const result = useMemo(() => {
    const input: ScoreInput = {
      handFaan: selectedHand.faan,
      isCapped,
      windDragonFaan,
      flowerFaan,
      winConditionFaan,
      winByDiscard,
      winnerIsEast,
    };
    return computeTotalFaan(input);
  }, [selectedHand.faan, isCapped, windDragonFaan, flowerFaan, winConditionFaan, winByDiscard, winnerIsEast]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const SUIT_PILL = 'px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-bold text-lg leading-tight">Score Calculator</h2>
          <p className="text-red-200 text-xs">計分 · {position} seat</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 pb-44 space-y-4">

        {/* ── Section 1: Setup ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <p className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Setup</p>

          {/* Prevailing Wind */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Prevailing Wind (圈風)</p>
            <div className="flex gap-2">
              {WIND_ORDER.map(w => (
                <button
                  key={w}
                  onClick={() => setPrevailingWind(w)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
                    prevailingWind === w
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
                  }`}
                >{w}</button>
              ))}
            </div>
          </div>

          {/* Win type */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Winning Type</p>
            <div className="flex gap-2">
              <button
                onClick={() => setWinByDiscard(false)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                  !winByDiscard ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >自摸 Self-Pick</button>
              <button
                onClick={() => setWinByDiscard(true)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                  winByDiscard ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                }`}
              >食糊 Discard Win</button>
            </div>
          </div>

          {/* Winner is East */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={winnerIsEast}
              onChange={e => setWinnerIsEast(e.target.checked)}
              className="w-4 h-4 rounded accent-red-600"
            />
            <span className="text-sm text-gray-700">Winner is East (東家)</span>
          </label>
        </div>

        {/* ── Section 2: Auto-Detected ──────────────────────────────────── */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-2">
          <p className="font-semibold text-emerald-800 text-sm uppercase tracking-wide">Auto-Detected</p>

          {detected ? (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">{detected.zhName} · {detected.enName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{detected.desc}</p>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${
                detected.isCapped ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {detected.faan >= 13 ? '13 faan (limit)' : `${detected.faan} faan`}
              </span>
            </div>
          ) : (
            <p className="text-sm text-emerald-700 italic">No suit pattern detected — select hand below</p>
          )}

          {/* Flower/Season faan */}
          <div className="border-t border-emerald-200 pt-2 mt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Flower / Season Bonus
                  {bonusTiles.length === 0 && <span className="text-gray-500 font-normal"> (no bonus tiles)</span>}
                </p>
                {bonusTiles.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {bonusTiles.join(', ')} · {WIND_ORDER[seatWindNum - 1]} seat = #{seatWindNum}
                  </p>
                )}
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                +{flowerFaan} faan
              </span>
            </div>
            {isCapped && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                Capped hand — flower/season faan not added
              </p>
            )}
          </div>
        </div>

        {/* ── Section 3: Hand Pattern ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-3">Hand Pattern</p>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 font-medium">Regular Hands</p>
            <div className="flex flex-wrap gap-2">
              {HAND_OPTIONS.filter(h => !h.isCapped).map(h => (
                <button
                  key={h.key}
                  onClick={() => setHandKey(h.key)}
                  className={`${SUIT_PILL} ${
                    handKey === h.key
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-blue-50 border-blue-200 text-blue-800 hover:border-blue-400'
                  }`}
                >
                  {h.zh} <span className="opacity-70 text-xs">{h.faan}f</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 font-medium pt-1">Capped / Limit Hands</p>
            <div className="flex flex-wrap gap-2">
              {HAND_OPTIONS.filter(h => h.isCapped).map(h => (
                <button
                  key={h.key}
                  onClick={() => setHandKey(h.key)}
                  className={`${SUIT_PILL} ${
                    handKey === h.key
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-red-50 border-red-200 text-red-800 hover:border-red-400'
                  }`}
                >
                  {h.zh} <span className="opacity-70 text-xs">{h.faan}f</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 4: Wind & Dragon Pungs ────────────────────────────── */}
        {!isCapped && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-3">Wind & Dragon Pungs</p>
            <div className="space-y-2">
              <CheckRow
                checked={pungSeatWind}
                onChange={setPungSeatWind}
                label={`Pung of seat wind (${position})`}
                faan={position === prevailingWind && pungSeatWind && pungPrevailing ? 0 : 1}
                note={position === prevailingWind ? 'Double wind (+2 if both checked)' : undefined}
              />
              {position !== prevailingWind && (
                <CheckRow
                  checked={pungPrevailing}
                  onChange={setPungPrevailing}
                  label={`Pung of prevailing wind (${prevailingWind})`}
                  faan={1}
                />
              )}
              {position === prevailingWind && (
                <CheckRow
                  checked={pungPrevailing}
                  onChange={setPungPrevailing}
                  label={`Pung of prevailing wind (${prevailingWind}) — same as seat`}
                  faan={2}
                  note="Counts as Double Wind — replaces both +1 bonuses"
                />
              )}
              <CheckRow checked={pungZhong} onChange={setPungZhong} label="Pung of 中 (Red Dragon)" faan={1} />
              <CheckRow checked={pungFa}   onChange={setPungFa}   label="Pung of 發 (Green Dragon)" faan={1} />
              <CheckRow checked={pungBai}  onChange={setPungBai}  label="Pung of 白 (White Dragon)" faan={1} />
            </div>
          </div>
        )}

        {/* ── Section 5: Winning Conditions ────────────────────────────── */}
        {!isHardLimit && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-1">Winning Conditions</p>
            {!winByDiscard && (
              <p className="text-xs text-gray-500 mb-3">Self-pick (+1) is automatically included</p>
            )}
            <div className="space-y-2">
              {!winByDiscard && (
                <>
                  <CheckRow
                    checked={concealedCheck}
                    onChange={setConcealedCheck}
                    label="Fully Concealed 門前清"
                    faan={1}
                    disabled={!concealedEligible}
                    note={!concealed ? 'Concealed toggle is OFF'
                      : selectedHand.noConcealedBonus ? `Not applicable for ${selectedHand.zh}`
                      : undefined}
                  />
                  <CheckRow
                    checked={winByKong && !winByDoubleKong}
                    onChange={v => { setWinByKong(v); if (v) setWinByDoubleKong(false); }}
                    label="Win by Kong 槓上花"
                    faan={2}
                    note="Includes self-pick"
                    disabled={kongs.length === 0}
                  />
                  <CheckRow
                    checked={winByDoubleKong}
                    onChange={v => { setWinByDoubleKong(v); if (v) setWinByKong(false); }}
                    label="Win by Double Kong 槓上槓"
                    faan={9}
                    note="Includes self-pick"
                    disabled={kongs.length < 2}
                  />
                </>
              )}
              <CheckRow
                checked={robbingKong}
                onChange={setRobbingKong}
                label="Robbing a Kong 搶槓"
                faan={1}
                disabled={!winByDiscard}
                note={!winByDiscard ? 'Only for discard wins' : undefined}
              />
              <CheckRow checked={lastTile} onChange={setLastTile} label="Last Tile from Wall 海底撈月" faan={1} />
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Footer ─────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl p-4 space-y-2">
        {/* Faan breakdown */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>Hand: <b className="text-gray-800">{result.handFaan}f</b></span>
          {!isCapped && <span>Wind/Dragon: <b className="text-gray-800">+{result.windDragonFaan}f</b></span>}
          {!isCapped && <span>Flower: <b className="text-gray-800">+{result.flowerFaan}f</b></span>}
          <span>Conditions: <b className="text-gray-800">+{result.winConditionFaan}f</b></span>
        </div>

        {/* Total faan */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            Total: {result.totalFaan} faan
            {result.totalFaan >= 13 && <span className="ml-1 text-sm text-red-600">(Limit)</span>}
          </span>
          <span className="text-lg font-bold text-gray-900">
            {result.belowMinimum
              ? <span className="text-amber-600 text-base">Below min (≥ 3 faan to win)</span>
              : `${result.basePoints} base pt${result.basePoints !== 1 ? 's' : ''}`
            }
          </span>
        </div>

        {/* Payments */}
        {!result.belowMinimum && result.payments.length > 0 && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
            {result.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{p.label}</span>
                <span className="font-bold text-gray-900">
                  {p.perPlayer} pt{p.perPlayer !== 1 ? 's' : ''}
                  {p.count > 1 && <span className="text-gray-400 font-normal"> (×{p.count})</span>}
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-0.5">East loser doubles their payment</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CheckRow helper ─────────────────────────────────────────────────────────

function CheckRow({
  checked, onChange, label, faan, note, disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  faan: number;
  note?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2 cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 w-4 h-4 rounded accent-red-600 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-800">{label}</span>
        {note && <p className="text-xs text-gray-400">{note}</p>}
      </div>
      <span className="shrink-0 text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">+{faan}f</span>
    </label>
  );
}
