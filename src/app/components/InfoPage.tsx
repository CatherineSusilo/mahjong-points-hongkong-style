import { useState } from 'react';
import { X } from 'lucide-react';

const TABS = ['Translations', 'Hands', 'Points Table'] as const;
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
}

const HANDS: Hand[] = [
  // Bonus / modifiers
  {
    zh: '自摸', en: 'Self-Draw (Tzi Mo)',
    faan: '+1 faan',
    desc: 'Winning by drawing the tile yourself instead of claiming a discard.',
  },
  {
    zh: '門前清自摸', en: 'Concealed Self-Draw',
    faan: '+1 faan',
    desc: 'Winning by self-draw with a fully concealed hand (no claimed melds).',
  },
  {
    zh: '槓上花', en: 'After-Kong Draw',
    faan: '+1 faan',
    desc: 'Winning on the replacement tile drawn after declaring a kong.',
  },
  {
    zh: '搶槓', en: 'Robbing a Kong',
    faan: '+1 faan',
    desc: 'Winning by taking the tile an opponent uses to upgrade a pung to a kong.',
  },
  {
    zh: '海底撈月', en: 'Last Tile from the Sea',
    faan: '+1 faan',
    desc: 'Winning on the very last tile drawn from the wall.',
  },
  {
    zh: '花牌', en: 'Flower / Season Tile',
    faan: '+1 faan each',
    desc: 'Each flower or season tile scores 1 extra faan. Your own suit flower/season (e.g. East gets 春/梅) scores +1 bonus faan.',
  },

  // Standard scored hands
  {
    zh: '全求人', en: 'All from Discards',
    faan: '1 faan',
    desc: 'All four melds are claimed from opponents\' discards (no self-draws). Also known as Chicken Hand if no other patterns apply.',
  },
  {
    zh: '平和', en: 'Common Hand (Ping Wu)',
    faan: '1 faan',
    desc: 'Four sequences (chows) and a non-honour pair. Also called All Sequences.',
  },
  {
    zh: '對對胡', en: 'All Pungs (Dui Dui Wu)',
    faan: '3 faan',
    desc: 'All four sets are pungs (or kongs) — no sequences. The pair can be anything.',
  },
  {
    zh: '混一色', en: 'Half Flush (Won Yat Sik)',
    faan: '3 faan',
    desc: 'All tiles are from a single suit PLUS honour tiles (winds and/or dragons).',
  },
  {
    zh: '小三元', en: 'Small Three Dragons',
    faan: '3 faan',
    desc: 'Two pungs/kongs of dragons and a pair of the third dragon.',
  },
  {
    zh: '全帶么', en: 'All Terminals & Honours (Chut Lou)',
    faan: '4 faan',
    desc: 'Every set and the pair contain at least one terminal (1 or 9) or honour tile.',
  },
  {
    zh: '大三元', en: 'Big Three Dragons',
    faan: '8 faan',
    desc: 'Three pungs or kongs, one of each dragon tile: 中, 發, 白.',
  },
  {
    zh: '小四喜', en: 'Small Four Winds',
    faan: '8 faan',
    desc: 'Three pungs/kongs of winds and a pair of the fourth wind.',
  },
  {
    zh: '清一色', en: 'Full Flush (Ching Yat Sik)',
    faan: '7 faan',
    desc: 'All tiles are from exactly one suit — no honour tiles.',
  },
  {
    zh: '大四喜', en: 'Big Four Winds',
    faan: '10 faan (limit)',
    desc: 'Four pungs or kongs, one of each wind: 東, 南, 西, 北.',
  },
  {
    zh: '字一色', en: 'All Honours',
    faan: '10 faan (limit)',
    desc: 'Every tile is an honour — winds and/or dragons only.',
  },
  {
    zh: '清老頭', en: 'All Terminals',
    faan: '10 faan (limit)',
    desc: 'Every tile is a terminal (1 or 9 of any suit) — no honours, no middle tiles.',
  },
  {
    zh: '九蓮寶燈', en: 'Nine Gates',
    faan: '10 faan (limit)',
    desc: '1-1-1-2-3-4-5-6-7-8-9-9-9 of one suit, plus any one tile of the same suit.',
  },
  {
    zh: '天和', en: 'Heavenly Hand',
    faan: '10 faan (limit)',
    desc: 'Dealer wins on the initial deal without drawing or discarding.',
  },
  {
    zh: '地和', en: 'Earthly Hand',
    faan: '10 faan (limit)',
    desc: 'Non-dealer wins on the very first discard of the round.',
  },
  {
    zh: '十三么', en: 'Thirteen Orphans',
    faan: '10 faan (limit)',
    desc: 'One each of 1-萬, 9-萬, 1-筒, 9-筒, 1-索, 9-索, 東, 南, 西, 北, 中, 發, 白, plus a duplicate of one.',
  },
  {
    zh: '四槓子', en: 'Four Kongs',
    faan: '10 faan (limit)',
    desc: 'All four sets are kongs (declared).',
  },
];

// ─── Points table ─────────────────────────────────────────────────
const POINTS_TABLE = [
  { faan: 1, base: 1 },
  { faan: 2, base: 2 },
  { faan: 3, base: 4 },
  { faan: 4, base: 8 },
  { faan: 5, base: 16 },
  { faan: 6, base: 32 },
  { faan: 7, base: 64 },
  { faan: 8, base: 128 },
  { faan: 9, base: 256 },
  { faan: '10+ (limit)', base: 512 },
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
                : hand.faan.startsWith('+')
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
            }`}>
              {hand.faan}
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{hand.desc}</p>
        </div>
      ))}
    </div>
  );
}

function PointsTab() {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-4 bg-amber-50 rounded-xl p-3 border border-amber-200">
        Base points are paid per player. For a discard win the loser pays the winner the base points. For self-draw (自摸) each of the other three players pays the base points.
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-100 py-2 px-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fan (番)</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide text-right">Base Points</span>
        </div>
        {POINTS_TABLE.map(({ faan, base }) => (
          <div key={String(faan)} className="grid grid-cols-2 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
            <span className={`font-semibold ${String(faan).includes('limit') ? 'text-red-600' : 'text-gray-900'}`}>
              {String(faan).includes('limit') ? `${faan}` : `${faan} 番`}
            </span>
            <span className="font-bold text-right text-blue-700">{base}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">Scoring Example</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>5-faan discard win:</strong> base = 16 pts. The player who discarded pays 16 pts to the winner. Others pay nothing.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed mt-2">
          <strong>5-faan self-draw:</strong> base = 16 pts. Each of the other 3 players pays 16 pts → winner gains 48 pts total.
        </p>
        <p className="text-xs text-gray-600 leading-relaxed mt-2">
          <strong>Dealer bonus:</strong> Many tables double points when the dealer wins. Ask your host.
        </p>
      </div>
    </div>
  );
}

// ─── Main overlay ─────────────────────────────────────────────────
interface InfoPageProps {
  onClose: () => void;
}

export function InfoPage({ onClose }: InfoPageProps) {
  const [tab, setTab] = useState<Tab>('Translations');

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
        {tab === 'Translations' && <TranslationsTab />}
        {tab === 'Hands' && <HandsTab />}
        {tab === 'Points Table' && <PointsTab />}
      </div>
    </div>
  );
}
