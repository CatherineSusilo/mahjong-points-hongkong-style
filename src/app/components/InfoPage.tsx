import { useState } from 'react';
const _handImgs = import.meta.glob('./hands/*.PNG', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const handImg = (file: string): string => _handImgs[`./hands/${file}`] ?? '';
import { X } from 'lucide-react';

const TABS = ['Tiles', 'Hands', 'Points', 'Winds'] as const;
type Tab = typeof TABS[number];

// ─── Translations data ────────────────────────────────────────────
const NUMBERS = [
  { zh: '一', en: 'One', n: 1 },
  { zh: '二', en: 'Two', n: 2 },
  { zh: '三', en: 'Three', n: 3 },
  { zh: '四', en: 'Four', n: 4 },
  { zh: '五', en: 'Five', n: 5 },
  { zh: '六', en: 'Six', n: 6 },
  { zh: '七', en: 'Seven', n: 7 },
  { zh: '八', en: 'Eight', n: 8 },
  { zh: '九', en: 'Nine', n: 9 },
];

const SUITS = [
  { zh: '萬子', rom: 'Maan', en: 'Characters' },
  { zh: '筒子', rom: 'Tung', en: 'Circles' },
  { zh: '索子', rom: 'Sok', en: 'Bamboo' },
];

const WINDS = [
  { zh: '東', rom: 'Dung', en: 'East', pos: 1 },
  { zh: '南', rom: 'Nam', en: 'South', pos: 2 },
  { zh: '西', rom: 'Sai', en: 'West', pos: 3 },
  { zh: '北', rom: 'Bak', en: 'North', pos: 4 },
];

const DRAGONS = [
  { zh: '中', rom: 'Chung', en: 'Red Dragon' },
  { zh: '發', rom: 'Faat', en: 'Green Dragon' },
  { zh: '白', rom: 'Baak', en: 'White Dragon' },
];

const FLOWERS = [
  { zh: '梅', rom: 'Mui', en: 'Plum', n: 1 },
  { zh: '蘭', rom: 'Laan', en: 'Orchid', n: 2 },
  { zh: '菊', rom: 'Guk', en: 'Chrysanthemum', n: 3 },
  { zh: '竹', rom: 'Juk', en: 'Bamboo', n: 4 },
];

const SEASONS = [
  { zh: '春', rom: 'Cheon', en: 'Spring', n: 1 },
  { zh: '夏', rom: 'Haa', en: 'Summer', n: 2 },
  { zh: '秋', rom: 'Cau', en: 'Autumn', n: 3 },
  { zh: '冬', rom: 'Dung', en: 'Winter', n: 4 },
];

// ─── Hands data ───────────────────────────────────────────────────
interface Hand {
  zh: string;
  en: string;
  faan: string;
  desc: string;
  img?: string;
}

const HANDS: Hand[] = [
  // ── Winning condition bonuses ─────────────────────────────
  { zh: '自摸', en: 'Self-Draw', faan: '+1 faan',
    desc: 'Winning by drawing the tile yourself from the wall.' },
  { zh: '門前清', en: 'Fully Concealed Hand', faan: '+1 faan',
    desc: 'No open melds until the win. Not applicable to Seven Pairs, Thirteen Orphans, Self Triplets, or Nine Gates.' },
  { zh: '槓上花', en: 'Win by Kong', faan: '+2 faan',
    desc: 'Winning on the replacement tile drawn after declaring a kong. Includes the self-pick bonus.' },
  { zh: '搶槓', en: 'Robbing a Kong', faan: '+1 faan',
    desc: 'Winning by claiming the tile an opponent adds to upgrade a pung to a kong.' },
  { zh: '海底撈月', en: 'Last Tile', faan: '+1 faan',
    desc: 'Winning on the very last tile drawn from the wall or the last discard.' },
  // ── Regular hands ────────────────────────────────────────
  { zh: '平和', en: 'Common Hand', faan: '1 faan',
    desc: 'All four melds are chows (sequences) with a non-honour pair.', img: 'common-hand.PNG' },
  { zh: '對對胡', en: 'All Triplets', faan: '3 faan',
    desc: 'All four melds are pungs or kongs.', img: 'all-triplets.PNG' },
  { zh: '混一色', en: 'Mixed One Suit', faan: '3 faan',
    desc: 'All tiles from one suit plus honour tiles (winds and/or dragons).', img: 'mixed-one-suit.PNG' },
  { zh: '全帶么', en: 'Mixed Orphans', faan: '4 faan',
    desc: 'Every meld and the pair contain at least one terminal (1 or 9) or honour tile.', img: 'mixed-orphans.PNG' },
  { zh: '七對子', en: 'Seven Pairs', faan: '4 faan',
    desc: 'The entire hand consists of exactly 7 pairs.', img: 'seven-pairs.PNG' },
  { zh: '小三元', en: 'Small Three Dragons', faan: '5 faan',
    desc: 'Pungs/kongs of two dragons and a pair of the third dragon.', img: 'small-three-dragons.PNG' },
  { zh: '小四喜', en: 'Small Four Winds', faan: '6 faan',
    desc: 'Pungs/kongs of three winds and a pair of the fourth wind.', img: 'small-four-winds.PNG' },
  { zh: '清一色', en: 'All One Suit', faan: '7 faan',
    desc: 'All tiles from exactly one suit — no honour tiles.', img: 'all-one-suit.PNG' },
  { zh: '大三元', en: 'Great Dragons', faan: '8 faan',
    desc: 'Pungs or kongs of all three dragons: 中, 發, 白.', img: 'great-dragons.PNG' },
  // ── Capped hands (no wind/flower faan added on top) ──────
  { zh: '字一色', en: 'All Honours', faan: '10 faan (capped)',
    desc: 'All tiles are honour tiles (winds and/or dragons). Wind and flower bonuses not added.', img: 'all-honours.PNG' },
  { zh: '全暗刻', en: 'Self Triplets', faan: '10 faan (capped)',
    desc: 'All four melds are concealed pungs or kongs, won by self-pick or the pair is the winning discard.', img: 'self-triplets.PNG' },
  { zh: '清老頭', en: 'Orphans', faan: '10 faan (capped)',
    desc: 'All four melds are pungs or kongs of terminals (1s and 9s only).', img: 'orphans.PNG' },
  { zh: '九蓮寶燈', en: 'Nine Gates', faan: '10 faan (capped)',
    desc: 'Fully concealed, one suit: 1-1-1-2-3-4-5-6-7-8-9-9-9 plus any tile of the same suit.', img: 'nine-gates.PNG' },
  { zh: '大四喜', en: 'Great Winds', faan: '13 faan (limit)',
    desc: 'Pungs or kongs of all four winds: 東, 南, 西, 北.', img: 'great-winds.PNG' },
  { zh: '碧和', en: 'All Green Imperial Jade', faan: '13 faan (limit)',
    desc: 'Composed entirely of green tiles, specifically the Green Dragon and the 2, 3, 4, 6, and 8 of Bamboos.', img: 'all-green-imperial-jade.PNG' },
  { zh: '十三么', en: 'Thirteen Orphans', faan: '13 faan (limit)',
    desc: 'One of each terminal and honour tile (1/9 of each suit + 4 winds + 3 dragons) plus one duplicate.', img: 'thirteen-orphans.PNG' },
  { zh: '四槓子', en: 'All Kongs', faan: '13 faan (limit)',
    desc: 'All four sets are declared kongs.', img: 'all-kongs.PNG' },
  { zh: '天和', en: 'Heavenly Hand', faan: '13 faan (limit)',
    desc: 'Dealer wins with the initial 14-tile dealt hand.' },
  { zh: '地和', en: 'Earthly Hand', faan: '13 faan (limit)',
    desc: "Non-dealer wins on the dealer's very first discard." },
];

// ─── Points table ─────────────────────────────────────────────────
const POINTS_TABLE = [
  { faan: '< 3', base: 0 },
  { faan: 3, base: 1 },
  { faan: '4 – 6', base: 2 },
  { faan: '7 – 9', base: 4 },
  { faan: '10 – 13 (limit)', base: 8 },
];

// ─── Sub-components ───────────────────────────────────────────────
function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600 text-sm">{label}</span>
      <div className="text-right">
        <span className="font-semibold text-gray-900">{value}</span>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-2">{title}</h3>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-1">
        {children}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────
function TranslationsTab() {
  return (
    <div>
      <Section title="Numbers">
        <div className="grid grid-cols-3 gap-0">
          {NUMBERS.map(({ zh, en, n }) => (
            <div key={n} className="flex flex-col items-center py-3 border-b border-gray-100 last:border-0">
              <span className="text-2xl font-bold text-gray-900">{zh}</span>
              <span className="text-lg font-bold text-red-600">{n}</span>
              <span className="text-xs text-gray-500">{en}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Suits">
        {SUITS.map(s => (
          <Row key={s.zh} label={`${s.zh}`} value={s.en} sub={s.rom} />
        ))}
      </Section>

      <Section title="Winds (位)">
        {WINDS.map(w => (
          <Row key={w.zh} label={`${w.zh} — Seat ${w.pos}`} value={w.en} sub={w.rom} />
        ))}
      </Section>

      <Section title="Dragons (三元牌)">
        {DRAGONS.map(d => (
          <Row key={d.zh} label={d.zh} value={d.en} sub={d.rom} />
        ))}
      </Section>

      <Section title="Flowers (花)">
        {FLOWERS.map(f => (
          <Row key={f.zh} label={`${f.zh} — #${f.n}`} value={f.en} sub={f.rom} />
        ))}
      </Section>

      <Section title="Seasons (季)">
        {SEASONS.map(s => (
          <Row key={s.zh} label={`${s.zh} — #${s.n}`} value={s.en} sub={s.rom} />
        ))}
      </Section>
    </div>
  );
}

function HandsTab() {
  return (
    <div className="space-y-3">
      {HANDS.map(hand => (
        <div key={hand.zh} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <span className="text-xl font-bold text-gray-900 mr-2">{hand.zh}</span>
              <span className="text-sm font-semibold text-gray-700">{hand.en}</span>
            </div>
            <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
              hand.faan.includes('limit')
                ? 'bg-red-100 text-red-700'
                : hand.faan.includes('capped')
                  ? 'bg-orange-100 text-orange-700'
                  : hand.faan.startsWith('+')
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
            }`}>
              {hand.faan}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{hand.desc}</p>
          {hand.img && (
            <img
              src={handImg(hand.img)}
              alt={hand.en}
              className="mt-3 w-full rounded-lg border border-gray-100"
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PointsTab() {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
        Minimum 3 faan to win. Base points double for self-pick (all pay ×2), winner is East (all pay ×2), or a loser is East (that loser pays ×2). Conditions stack multiplicatively.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-100 py-2 px-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fan (番)</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide text-right">Base Points</span>
        </div>
        {POINTS_TABLE.map(({ faan, base }) => (
          <div key={String(faan)} className={`grid grid-cols-2 px-4 py-3 border-b border-gray-50 last:border-0 ${String(faan) === '< 3' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
            <span className={`font-semibold ${String(faan).includes('limit') ? 'text-red-600' : String(faan) === '< 3' ? 'text-red-500' : 'text-gray-900'}`}>
              {String(faan).includes('limit') ? faan : `${faan} 番`}
            </span>
            <span className={`font-bold text-right ${base === 0 ? 'text-red-400' : 'text-blue-700'}`}>
              {base === 0 ? 'Cannot win' : base}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">Scoring Example</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>5-faan discard win:</strong> base = 2 pts. Discarder pays 2×2 = 4 pts. Others pay nothing.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed mt-2">
          <strong>5-faan self-draw:</strong> base = 2 pts. All 3 others pay 2×2 = 4 pts each → winner gains 12 pts.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed mt-2">
          <strong>East wins self-draw:</strong> add ×2 again → 4×2 = 8 pts per loser (winner gains 24 pts).
        </p>
      </div>
    </div>
  );
}
function WindsTab() {
  return (
    <div>
      <Section title="Prevailing Wind 圈風">
        <div className="py-2">
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            A full session has 4 rounds. The round advances once all 4 players have been the dealer.
          </p>
          <div className="flex items-center justify-around bg-red-50 rounded-lg p-3 mb-1">
            {['東', '南', '西', '北'].map((w, i) => (
              <span key={w} className="flex items-center gap-1">
                <span className="text-xl font-bold text-red-700">{w}</span>
                {i < 3 && <span className="text-gray-400 text-sm">→</span>}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">East → South → West → North</p>
        </div>
      </Section>

      <Section title="Dealer Change Rules">
        <div className="space-y-2 py-2">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-sm font-semibold text-green-800 mb-0.5">Dealer wins — or — Draw 流局</p>
            <p className="text-xs text-gray-600">Seats do not change. Dealer (東) keeps their seat and deals again.</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800 mb-0.5">Non-dealer wins</p>
            <p className="text-xs text-gray-600">Seats rotate <strong>counter-clockwise</strong>: South → East (new dealer) · West → South · North → West · East → North.</p>
          </div>
        </div>
      </Section>

      <Section title="Seat, Flower & Season Numbers">
        <Row label="東 East — Seat #1" value="梅 Plum · 春 Spring" />
        <Row label="南 South — Seat #2" value="蘭 Orchid · 夏 Summer" />
        <Row label="西 West — Seat #3" value="菊 Chrysanthemum · 秋 Autumn" />
        <Row label="北 North — Seat #4" value="竹 Bamboo · 冬 Winter" />
      </Section>

      <Section title="Wind & Dragon Faan Bonuses">
        <Row label="Pung of your seat wind" value="+1 faan" />
        <Row label="Pung of prevailing wind" value="+1 faan" />
        <Row label="Double wind (seat = prevailing)" value="+2 faan" sub="replaces both +1s" />
        <Row label="Pung of 中 Red Dragon" value="+1 faan" />
        <Row label="Pung of 發 Green Dragon" value="+1 faan" />
        <Row label="Pung of 白 White Dragon" value="+1 faan" />
      </Section>

      <Section title="Flower & Season Faan Bonuses">
        <Row label="No bonus tiles at all" value="+1 faan" sub="NO_FLOWERS bonus" />
        <Row label="Own flower matches your seat" value="+1 faan" sub="e.g. East → 梅" />
        <Row label="Own season matches your seat" value="+1 faan" sub="e.g. East → 春" />
        <Row label="All 4 flowers (梅蘭菊竹)" value="+2 faan" sub="flat bonus, not per-tile" />
        <Row label="All 4 seasons (春夏秋冬)" value="+2 faan" sub="flat bonus, not per-tile" />
      </Section>
    </div>
  );
}
// ─── Main overlay ─────────────────────────────────────────────────
interface InfoPageProps {
  onClose: () => void;
}

export function InfoPage({ onClose }: InfoPageProps) {
  const [tab, setTab] = useState<Tab>('Tiles');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-red-700 px-4 py-3 shrink-0">
        <h2 className="text-white font-bold text-lg">Mahjong Guide</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-red-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex bg-red-800 shrink-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-amber-50 text-red-800'
                : 'text-red-100 hover:bg-red-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {tab === 'Tiles' && <TranslationsTab />}
        {tab === 'Hands' && <HandsTab />}
        {tab === 'Points' && <PointsTab />}
        {tab === 'Winds' && <WindsTab />}
      </div>
    </div>
  );
}
