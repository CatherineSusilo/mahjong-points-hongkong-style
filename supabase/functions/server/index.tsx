// @ts-nocheck — Deno runtime file; type-checked by Deno LS, not tsc
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a83e0fd9/health", (c) => {
  return c.json({ status: "ok" });
});

// Generate 6-digit party code
function generatePartyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a new party
app.post("/make-server-a83e0fd9/party/create", async (c) => {
  try {
    const { hostName } = await c.req.json();
    const partyCode = generatePartyCode();

    // Check if code already exists, regenerate if needed
    let existing = await kv.get(`party:${partyCode}`);
    let attempts = 0;
    while (existing && attempts < 10) {
      const newCode = generatePartyCode();
      existing = await kv.get(`party:${newCode}`);
      if (!existing) {
        break;
      }
      attempts++;
    }

    const party = {
      code: partyCode,
      host: hostName,
      players: [{ name: hostName, position: '東', ready: false, tiles: [] }],
      state: 'lobby', // lobby, playing, submitting, scoring
      round: 1,
      scores: { [hostName]: 0 },
      winData: null,
      submissions: {},
      prevailingWind: '東',
      dealerChanges: 0,
      createdAt: Date.now()
    };

    await kv.set(`party:${partyCode}`, party);
    console.log(`Party created: ${partyCode} by ${hostName}`);

    return c.json({ success: true, partyCode, party });
  } catch (error) {
    console.error('Error creating party:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Join an existing party
app.post("/make-server-a83e0fd9/party/join", async (c) => {
  try {
    const { partyCode, playerName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    // Check if player already joined
    const existingPlayer = party.players.find((p: any) => p.name === playerName);
    if (existingPlayer) {
      return c.json({ success: true, party, rejoined: true });
    }

    // Check player limit
    if (party.players.length >= 4) {
      return c.json({ success: false, error: 'Party is full' }, 400);
    }

    const positions = ['東', '南', '西', '北'];
    const position = positions[party.players.length];

    party.players.push({ name: playerName, position, ready: false, tiles: [] });
    party.scores[playerName] = 0;

    await kv.set(`party:${partyCode}`, party);
    console.log(`${playerName} joined party ${partyCode}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error joining party:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get party state
app.get("/make-server-a83e0fd9/party/:code", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const party = await kv.get(`party:${partyCode}`);

    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error getting party:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Start game
app.post("/make-server-a83e0fd9/party/:code/start", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const party = await kv.get(`party:${partyCode}`);

    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.players.length < 3) {
      return c.json({ success: false, error: 'Need at least 3 players' }, 400);
    }

    party.state = 'playing';
    await kv.set(`party:${partyCode}`, party);
    console.log(`Game started in party ${partyCode}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error starting game:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update player tiles
app.post("/make-server-a83e0fd9/party/:code/tiles", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { playerName, tiles } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    const player = party.players.find((p: any) => p.name === playerName);
    if (player) {
      player.tiles = tiles;
    }

    await kv.set(`party:${partyCode}`, party);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error updating tiles:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Trigger win notification
app.post("/make-server-a83e0fd9/party/:code/win", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { playerName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    party.state = 'submitting';
    party.winData = { claimedBy: playerName, timestamp: Date.now() };
    party.submissions = {};

    await kv.set(`party:${partyCode}`, party);
    console.log(`Win claimed by ${playerName} in party ${partyCode}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error claiming win:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Submit hand for scoring
app.post("/make-server-a83e0fd9/party/:code/submit", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { playerName, tiles, bonusTiles, kongs } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    party.submissions[playerName] = { tiles, bonusTiles: bonusTiles ?? [], kongs: kongs ?? [], timestamp: Date.now() };

    // Check if all players submitted
    const allSubmitted = party.players.every(
      (p: any) => party.submissions[p.name]
    );

    if (allSubmitted) {
      party.state = 'scoring';
    }

    await kv.set(`party:${partyCode}`, party);
    console.log(`Hand submitted by ${playerName} in party ${partyCode}`);

    return c.json({ success: true, party, allSubmitted });
  } catch (error) {
    console.error('Error submitting hand:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Un-submit hand (edit before everyone has submitted)
app.post("/make-server-a83e0fd9/party/:code/unsubmit", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { playerName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    // Only allowed while still in submitting state
    if (party.state !== 'submitting') {
      return c.json({ success: false, error: 'Cannot edit after all players have submitted' }, 400);
    }

    delete party.submissions[playerName];
    await kv.set(`party:${partyCode}`, party);
    console.log(`Hand un-submitted by ${playerName} in party ${partyCode}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error un-submitting hand:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ── Helpers for wind rotation ───────────────────────────────────────────────
function fanToBasePoints(fan: number): number {
  if (fan < 3) return 0;
  if (fan <= 3) return 1;
  if (fan <= 6) return 2;
  if (fan <= 9) return 4;
  return 8; // 10-13 limit
}

const SEAT_ORDER = ['東', '南', '西', '北'];

function rotateSeatsCCW(players: any[]): void {
  // Sort by current seat position
  const sorted = [...players].sort(
    (a, b) => SEAT_ORDER.indexOf(a.position) - SEAT_ORDER.indexOf(b.position),
  );
  // Counter-clockwise: South→East, West→South, North→West, East→North
  const rotated = [sorted[1], sorted[2], sorted[3], sorted[0]];
  rotated.forEach((rotP, i) => {
    const p = players.find((x: any) => x.name === rotP.name);
    if (p) p.position = SEAT_ORDER[i];
  });
}

// Record win and update scores
app.post("/make-server-a83e0fd9/party/:code/score", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { winnerName, loserName, fan, isSelfDrawn, isDraw } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    // Backwards-compat: ensure wind tracking fields exist
    if (!party.prevailingWind) party.prevailingWind = '東';
    if (party.dealerChanges === undefined) party.dealerChanges = 0;

    const changes: Record<string, number> = {};

    if (isDraw) {
      // Draw: no score changes, dealer keeps East seat
      party.scoreData = { winnerName: '', loserName: null, fan: 0, isSelfDrawn: false, isDraw: true, changes };
      party.round += 1;
      party.state = 'score_summary';
      await kv.set(`party:${partyCode}`, party);
      console.log(`Draw recorded in party ${partyCode}`);
      return c.json({ success: true, party });
    }

    const basePoints = fanToBasePoints(fan);

    const winner = party.players.find((p: any) => p.name === winnerName);
    const winnerIsEast = winner?.position === '東';
    const winnerMult = winnerIsEast ? 2 : 1;

    if (isSelfDrawn) {
      let winnerTotal = 0;
      party.players.forEach((player: any) => {
        if (player.name !== winnerName) {
          const loserMult = player.position === '東' ? 2 : 1;
          const amount = basePoints * 2 * winnerMult * loserMult;
          party.scores[player.name] -= amount;
          changes[player.name] = -amount;
          winnerTotal += amount;
        }
      });
      party.scores[winnerName] += winnerTotal;
      changes[winnerName] = winnerTotal;
    } else if (loserName) {
      const loser = party.players.find((p: any) => p.name === loserName);
      const loserMult = loser?.position === '東' ? 2 : 1;
      const amount = basePoints * 2 * winnerMult * loserMult;
      party.scores[winnerName] += amount;
      party.scores[loserName] -= amount;
      changes[winnerName] = amount;
      changes[loserName] = -amount;
    }

    // Wind rotation: non-dealer win → rotate seats counter-clockwise
    const winnerIsDealer = winner?.position === '東';

    if (!winnerIsDealer) {
      rotateSeatsCCW(party.players);
      party.dealerChanges += 1;
      // After all 4 players have been dealer, advance prevailing wind
      if (party.dealerChanges >= 4) {
        const idx = SEAT_ORDER.indexOf(party.prevailingWind);
        party.prevailingWind = SEAT_ORDER[(idx + 1) % 4];
        party.dealerChanges = 0;
      }
    }
    // Dealer won: seats and prevailing wind unchanged

    party.scoreData = { winnerName, loserName: loserName ?? null, fan, isSelfDrawn, isDraw: false, changes };
    party.round += 1;
    party.state = 'score_summary';

    await kv.set(`party:${partyCode}`, party);
    console.log(`Score recorded in party ${partyCode}: ${winnerName} won with ${fan} fan`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error recording score:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Advance from score summary to round-start lobby (host only)
app.post("/make-server-a83e0fd9/party/:code/continue", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { hostName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.host !== hostName) {
      return c.json({ success: false, error: 'Only host can continue to next round' }, 403);
    }

    party.state = 'round_start';
    party.winData = null;
    party.submissions = {};
    party.scoreData = null;

    await kv.set(`party:${partyCode}`, party);
    console.log(`Moved to round start lobby in party ${partyCode} by ${hostName}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error continuing round:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Start the next round — clears player tiles and transitions to playing (host only)
// Accepts both round_start and score_summary states so the intermediate lobby can be skipped
app.post("/make-server-a83e0fd9/party/:code/start-round", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { hostName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.host !== hostName) {
      return c.json({ success: false, error: 'Only host can start the round' }, 403);
    }

    if (party.state !== 'round_start' && party.state !== 'score_summary') {
      return c.json({ success: false, error: 'Cannot start round from current state' }, 400);
    }

    // Clear round data and reset player tiles
    party.winData = null;
    party.submissions = {};
    party.scoreData = null;
    party.players.forEach((p: any) => { p.tiles = []; });
    party.state = 'playing';

    await kv.set(`party:${partyCode}`, party);
    console.log(`Round started in party ${partyCode} by ${hostName}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error starting round:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Swap positions of two non-host players (host only, during lobby)
app.post("/make-server-a83e0fd9/party/:code/swap-positions", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { hostName, playerA, playerB } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.host !== hostName) {
      return c.json({ success: false, error: 'Only host can swap positions' }, 403);
    }

    if (party.state !== 'lobby') {
      return c.json({ success: false, error: 'Can only swap positions in lobby' }, 400);
    }

    const pA = party.players.find((p: any) => p.name === playerA);
    const pB = party.players.find((p: any) => p.name === playerB);

    if (!pA || !pB) {
      return c.json({ success: false, error: 'Player not found' }, 404);
    }

    // Swap the wind positions between the two players
    const tmp = pA.position;
    pA.position = pB.position;
    pB.position = tmp;

    await kv.set(`party:${partyCode}`, party);
    console.log(`Swapped positions of ${playerA} and ${playerB} in party ${partyCode}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error swapping positions:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Leave the lobby (any player, lobby state only)
app.post("/make-server-a83e0fd9/party/:code/leave", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { playerName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.state !== 'lobby') {
      return c.json({ success: false, error: 'Can only leave during lobby' }, 400);
    }

    // If host leaves, disband the entire party
    if (party.host === playerName) {
      await kv.set(`party:${partyCode}`, { ...party, state: 'disbanded' });
      console.log(`Party ${partyCode} disbanded — host ${playerName} left`);
      return c.json({ success: true, disbanded: true });
    }

    // Non-host: remove player and compact positions
    party.players = party.players.filter((p: any) => p.name !== playerName);
    delete party.scores[playerName];

    const seatOrder = ['東', '南', '西', '北'];
    party.players.sort((a: any, b: any) => seatOrder.indexOf(a.position) - seatOrder.indexOf(b.position));
    party.players.forEach((p: any, i: number) => {
      p.position = seatOrder[i];
    });

    await kv.set(`party:${partyCode}`, party);
    console.log(`${playerName} left party ${partyCode}`);

    return c.json({ success: true, disbanded: false, party });
  } catch (error) {
    console.error('Error leaving party:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Kick a player from the party (host only, during lobby)
app.post("/make-server-a83e0fd9/party/:code/kick", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { playerName, hostName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.host !== hostName) {
      return c.json({ success: false, error: 'Only host can kick players' }, 403);
    }

    if (party.state !== 'lobby') {
      return c.json({ success: false, error: 'Can only kick players in lobby' }, 400);
    }

    party.players = party.players.filter((p: any) => p.name !== playerName);
    delete party.scores[playerName];

    // Reassign positions — sort remaining players by their current ESWN order first
    // so any custom swaps are preserved as much as possible
    const seatOrder = ['東', '南', '西', '北'];
    party.players.sort((a: any, b: any) => seatOrder.indexOf(a.position) - seatOrder.indexOf(b.position));
    party.players.forEach((p: any, i: number) => {
      p.position = seatOrder[i];
    });

    await kv.set(`party:${partyCode}`, party);
    console.log(`${playerName} kicked from party ${partyCode} by ${hostName}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error kicking player:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// End the game (host only)
app.post("/make-server-a83e0fd9/party/:code/end", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { hostName } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    if (party.host !== hostName) {
      return c.json({ success: false, error: 'Only host can end the game' }, 403);
    }

    party.state = 'ended';
    await kv.set(`party:${partyCode}`, party);
    console.log(`Game ended in party ${partyCode} by ${hostName}`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error ending game:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);