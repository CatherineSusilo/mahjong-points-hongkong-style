// ─── HK Mahjong Scoring Logic ────────────────────────────────────────────────
// Based on: Old HK Simplified rules
// Scoring unit = faan. Min to win = 3 faan. Hard cap = 13 faan.

export const WIND_ORDER = ['東', '南', '西', '北'] as const;

/** Flower tile → seat wind number it belongs to */
export const FLOWER_POSITION: Record<string, number> = { 梅: 1, 蘭: 2, 菊: 3, 竹: 4 };
/** Season tile → seat wind number it belongs to */
export const SEASON_POSITION: Record<string, number> = { 春: 1, 夏: 2, 秋: 3, 冬: 4 };

export const HONOUR_TILES = new Set(['東', '南', '西', '北', '中', '發', '白']);
export const DRAGON_TILES = new Set(['中', '發', '白']);
export const WIND_TILES = new Set(['東', '南', '西', '北']);

/** Terminals (1 and 9 of each suit) */
export const TERMINAL_TILES = new Set([
  '一萬', '九萬', '一筒', '九筒', '一索', '九索',
]);

/** Terminal-or-honour tiles (used for ORPHANS detection) */
export const TERMINAL_OR_HONOUR = new Set([
  '一萬', '九萬', '一筒', '九筒', '一索', '九索',
  '東', '南', '西', '北', '中', '發', '白',
]);

/** Maps each numbered tile to its suit character */
export const SUIT_MAP: Record<string, '萬' | '筒' | '索'> = {};
const SUIT_CHARS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
for (const [i, n] of SUIT_CHARS.entries()) {
  SUIT_MAP[`${n}萬`] = '萬';
  SUIT_MAP[`${n}筒`] = '筒';
  SUIT_MAP[`${n}索`] = '索';
}

// ─── Faan → Base Points (Old HK Simplified) ──────────────────────────────────
export function faanToBasePoints(faan: number): number {
  if (faan < 3) return 0;         // below minimum — caller should flag this
  if (faan <= 3) return 1;
  if (faan <= 6) return 2;
  if (faan <= 9) return 4;
  return 8;                        // 10+ → limit = 8 base points
}

// ─── Flower / Season Faan ─────────────────────────────────────────────────────
/**
 * Compute faan earned from bonus tiles (花/季).
 * Rules:
 *   - No bonus tiles at all         → +1 (NO_FLOWERS)
 *   - All 4 flowers                 → +2
 *   - Own flower (matches seatNum)  → +1
 *   - All 4 seasons                 → +2
 *   - Own season (matches seatNum)  → +1
 */
export function computeFlowerFaan(bonusTiles: string[], seatWindNum: number): number {
  if (bonusTiles.length === 0) return 1; // NO_FLOWERS bonus

  const flowers = bonusTiles.filter(t => t in FLOWER_POSITION);
  const seasons = bonusTiles.filter(t => t in SEASON_POSITION);

  const flowerFaan =
    flowers.length === 4 ? 2
    : flowers.filter(t => FLOWER_POSITION[t] === seatWindNum).length;

  const seasonFaan =
    seasons.length === 4 ? 2
    : seasons.filter(t => SEASON_POSITION[t] === seatWindNum).length;

  return flowerFaan + seasonFaan;
}

// ─── Auto-detect suit/composition pattern ────────────────────────────────────
export type SuitPatternKey =
  | 'ALL_KONGS'
  | 'THIRTEEN_ORPHANS'
  | 'ALL_HONOUR'
  | 'GREAT_WINDS'   // detected from kongs/tiles but user picks in UI
  | 'ORPHANS'
  | 'ALL_ONE_SUIT'
  | 'MIXED_ONE_SUIT'
  | null;

export interface DetectedSuitPattern {
  key: SuitPatternKey;
  zhName: string;
  enName: string;
  faan: number;
  isCapped: boolean;
  desc: string;
}

/**
 * Detect the best matching suit/composition pattern from the player's tiles.
 * Checked in priority order; returns the first match or null.
 * @param tiles   Main hand tiles (up to 14)
 * @param kongs   Kong tile names (each represents 4 of that tile)
 */
export function autoDetectSuitPattern(
  tiles: string[],
  kongs: string[],
): DetectedSuitPattern | null {
  // Build a combined flat tile list for pattern analysis
  const allTiles = [
    ...tiles,
    ...kongs.flatMap(k => [k, k, k, k]),
  ];

  if (allTiles.length === 0) return null;

  // 1. ALL_KONGS: exactly 4 kongs declared (no other hand content needed beyond pair)
  if (kongs.length === 4) {
    return {
      key: 'ALL_KONGS', faan: 13, isCapped: true,
      zhName: '四槓子', enName: 'All Kongs',
      desc: 'All four sets are kongs.',
    };
  }

  // 2. THIRTEEN_ORPHANS: exactly one each of the 13 unique terminals/honours + one duplicate
  const orphanSet = new Set([
    '一萬', '九萬', '一筒', '九筒', '一索', '九索',
    '東', '南', '西', '北', '中', '發', '白',
  ]);
  if (tiles.length === 14 && kongs.length === 0) {
    const counts = countTiles(tiles);
    const keys = Object.keys(counts);
    const allOrphan = keys.every(t => orphanSet.has(t));
    const hasPair = keys.some(t => counts[t] === 2);
    const uniqueOrphans = keys.filter(t => orphanSet.has(t)).length;
    if (allOrphan && hasPair && uniqueOrphans === 13) {
      return {
        key: 'THIRTEEN_ORPHANS', faan: 13, isCapped: true,
        zhName: '十三么', enName: 'Thirteen Orphans',
        desc: 'One each of every terminal and honour, plus a duplicate.',
      };
    }
  }

  // 3. ALL_HONOUR: every tile is an honour (wind or dragon)
  if (allTiles.every(t => HONOUR_TILES.has(t))) {
    return {
      key: 'ALL_HONOUR', faan: 10, isCapped: true,
      zhName: '字一色', enName: 'All Honours',
      desc: 'Every tile is an honour tile (wind or dragon).',
    };
  }

  // 4. ORPHANS: every tile is a terminal or honour (1s, 9s, winds, dragons)
  if (allTiles.every(t => TERMINAL_OR_HONOUR.has(t))) {
    return {
      key: 'ORPHANS', faan: 10, isCapped: true,
      zhName: '清老頭', enName: 'Orphans',
      desc: 'All pungs are ones, nines, or honour tiles.',
    };
  }

  // 5. ALL_ONE_SUIT: all tiles same suit, no honours
  const suits = new Set(allTiles.map(t => SUIT_MAP[t]).filter(Boolean));
  const hasHonour = allTiles.some(t => HONOUR_TILES.has(t));
  if (suits.size === 1 && !hasHonour) {
    return {
      key: 'ALL_ONE_SUIT', faan: 7, isCapped: false,
      zhName: '清一色', enName: 'All One Suit',
      desc: 'All tiles from one suit, no honour tiles.',
    };
  }

  // 6. MIXED_ONE_SUIT: exactly one suit + at least one honour, no cross-suit mix
  if (suits.size === 1 && hasHonour) {
    return {
      key: 'MIXED_ONE_SUIT', faan: 3, isCapped: false,
      zhName: '混一色', enName: 'Mixed One Suit',
      desc: 'One suit plus honour tiles.',
    };
  }

  return null;
}

// ─── Score computation ────────────────────────────────────────────────────────

export interface ScoreInput {
  /** Faan from the hand type the user selected */
  handFaan: number;
  /** Whether the selected hand is a capped/limit type */
  isCapped: boolean;
  /** Faan from wind/dragon pungs (seat wind, prevailing wind, dragons) */
  windDragonFaan: number;
  /** Faan from bonus tiles, from computeFlowerFaan() */
  flowerFaan: number;
  /** Faan from winning conditions (self-pick, concealed, robbing, last tile, kong win) */
  winConditionFaan: number;
  /** Whether the winning tile came from a discard (vs self-pick) */
  winByDiscard: boolean;
  /** Whether the winner is East */
  winnerIsEast: boolean;
}

export interface PlayerPayment {
  label: string;   // e.g. "East loser", "Non-East losers"
  perPlayer: number;
  count: number;   // how many players pay this amount
}

export interface ScoreResult {
  handFaan: number;
  windDragonFaan: number;  // 0 when capped
  flowerFaan: number;      // 0 when capped
  winConditionFaan: number;
  totalFaan: number;
  basePoints: number;
  belowMinimum: boolean;
  payments: PlayerPayment[];
}

export function computeTotalFaan(input: ScoreInput): ScoreResult {
  const {
    handFaan, isCapped,
    windDragonFaan, flowerFaan, winConditionFaan,
    winByDiscard, winnerIsEast,
  } = input;

  // Capped hands don't add wind/dragon/flower
  const effectiveWindDragon = isCapped ? 0 : windDragonFaan;
  const effectiveFlower = isCapped ? 0 : flowerFaan;

  const rawTotal = handFaan + effectiveWindDragon + effectiveFlower + winConditionFaan;
  const totalFaan = Math.min(rawTotal, 13);
  const basePoints = faanToBasePoints(totalFaan);
  const belowMinimum = totalFaan < 3;

  // Payment modifiers — each applicable condition doubles what that player pays
  // Start from basePoints; multiply per applicable condition
  const payments: PlayerPayment[] = [];

  if (!belowMinimum) {
    if (winByDiscard) {
      // Discarder pays double base; others pay base
      // Winner East → all losers ×2; Loser East (discarder) → ×2 on top; non-East → ×1
      // Non-East losers [2 of them]:
      //   base × (winnerIsEast ? 2 : 1)
      // Discarder:
      //   base × 2 (discard) × (winnerIsEast ? 2 : 1) × (discarderIsEast — handled separately via UI)
      const nonEastLoserAmount = basePoints * (winnerIsEast ? 2 : 1);
      const discarderAmount = basePoints * 2 * (winnerIsEast ? 2 : 1);
      payments.push({ label: 'Discarder pays', perPlayer: discarderAmount, count: 1 });
      payments.push({ label: 'Each other player pays', perPlayer: nonEastLoserAmount, count: 2 });
    } else {
      // Self-pick: all losers pay double
      // base × 2 (self-pick) × (winnerIsEast ? 2 : 1) = per non-East loser
      const baseEach = basePoints * 2 * (winnerIsEast ? 2 : 1);
      payments.push({ label: 'Each player pays (self-pick)', perPlayer: baseEach, count: 3 });
    }
  }

  return {
    handFaan,
    windDragonFaan: effectiveWindDragon,
    flowerFaan: effectiveFlower,
    winConditionFaan,
    totalFaan,
    basePoints,
    belowMinimum,
    payments,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countTiles(tiles: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tiles) counts[t] = (counts[t] ?? 0) + 1;
  return counts;
}

// ─── Multi-pattern detection ──────────────────────────────────────────────────

export interface DetectedPattern {
  key: string;
  zhName: string;
  enName: string;
  faan: number;
  isCapped: boolean;
}

/**
 * Detect ALL applicable scoring patterns from the player's tiles.
 * Unlike autoDetectSuitPattern (single best match), this returns every
 * stackable pattern that applies. Capped hands are returned alone.
 */
export function detectAllPatterns(tiles: string[], kongs: string[]): DetectedPattern[] {
  const allTiles = [...tiles, ...kongs.flatMap(k => [k, k, k, k])];
  if (allTiles.length === 0) return [];

  // Check for capped composition first — these never stack
  const capped = autoDetectSuitPattern(tiles, kongs);
  if (capped?.isCapped) {
    return [{ ...capped, key: capped.key as string }];
  }

  const patterns: DetectedPattern[] = [];
  const allCounts = countTiles(allTiles);

  // ── Dragon patterns (Great or Small Dragons) ────────────────────────────────
  const dragonCounts = ['中', '發', '白'].map(d => allCounts[d] ?? 0);
  const punggedDragons = dragonCounts.filter(c => c >= 3).length;
  const pairedDragons  = dragonCounts.filter(c => c === 2).length;

  if (punggedDragons === 3) {
    patterns.push({ key: 'GREAT_DRAGONS', faan: 8, isCapped: false, zhName: '大三元', enName: 'Great Dragons' });
  } else if (punggedDragons === 2 && pairedDragons >= 1) {
    patterns.push({ key: 'SMALL_DRAGONS', faan: 5, isCapped: false, zhName: '小三元', enName: 'Small Dragons' });
  }

  // ── All Triplets (對對胡) ──────────────────────────────────────────────────
  // ALL_KONGS (kongs.length === 4) is a capped hand caught above
  if (kongs.length < 4) {
    const tileCounts = countTiles(tiles);
    const vals = Object.values(tileCounts);
    const pairCount = vals.filter(v => v === 2).length;
    if (vals.length > 0 && vals.every(v => v === 2 || v === 3) && pairCount === 1) {
      patterns.push({ key: 'ALL_TRIPLETS', faan: 3, isCapped: false, zhName: '對對胡', enName: 'All Triplets' });
    }
  }

  // ── Seven Pairs (七對子) ───────────────────────────────────────────────────
  if (tiles.length === 14 && kongs.length === 0) {
    const tc = countTiles(tiles);
    if (Object.keys(tc).length === 7 && Object.values(tc).every(v => v === 2)) {
      patterns.push({ key: 'SEVEN_PAIRS', faan: 4, isCapped: false, zhName: '七對子', enName: 'Seven Pairs' });
    }
  }

  // ── Non-capped suit patterns (stack with dragon/triplet patterns) ───────────
  if (capped && !capped.isCapped) {
    patterns.push({ ...capped, key: capped.key as string });
  }

  return patterns.sort((a, b) => b.faan - a.faan);
}

/**
 * Compute faan earned from individual wind/dragon pungs.
 * Dragon pung = +1 each. Wind pung = +1 seat, +1 prevailing (cumulative).
 */
export function computeWindDragonPungFaan(
  tiles: string[],
  kongs: string[],
  seatWind: string,
  prevailingWind: string,
): { faan: number; breakdown: Array<{ label: string; faan: number }> } {
  const allTiles = [...tiles, ...kongs.flatMap(k => [k, k, k, k])];
  const counts = countTiles(allTiles);
  const breakdown: Array<{ label: string; faan: number }> = [];

  const DRAGON_LABELS: Record<string, string> = {
    '中': '中 (Red Dragon)', '發': '發 (Green Dragon)', '白': '白 (White Dragon)',
  };
  for (const dragon of ['中', '發', '白']) {
    if ((counts[dragon] ?? 0) >= 3) {
      breakdown.push({ label: DRAGON_LABELS[dragon], faan: 1 });
    }
  }

  for (const wind of ['東', '南', '西', '北']) {
    if ((counts[wind] ?? 0) >= 3) {
      const isSeat = wind === seatWind;
      const isPrev = wind === prevailingWind;
      const f = (isSeat ? 1 : 0) + (isPrev ? 1 : 0);
      if (f > 0) {
        const tag = isSeat && isPrev ? 'Seat+Prevailing' : isSeat ? 'Seat Wind' : 'Prevailing Wind';
        breakdown.push({ label: `${wind} (${tag})`, faan: f });
      }
    }
  }

  return { faan: breakdown.reduce((s, b) => s + b.faan, 0), breakdown };
}
