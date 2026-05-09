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
    const { playerName, tiles } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    party.submissions[playerName] = { tiles, timestamp: Date.now() };

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

// Record win and update scores
app.post("/make-server-a83e0fd9/party/:code/score", async (c) => {
  try {
    const partyCode = c.req.param('code');
    const { winnerName, loserName, fan, isSelfDrawn } = await c.req.json();

    const party = await kv.get(`party:${partyCode}`);
    if (!party) {
      return c.json({ success: false, error: 'Party not found' }, 404);
    }

    const basePoints = Math.min(512, Math.pow(2, fan - 1));

    if (isSelfDrawn) {
      party.players.forEach((player: any) => {
        if (player.name === winnerName) {
          party.scores[player.name] += basePoints * (party.players.length - 1);
        } else {
          party.scores[player.name] -= basePoints;
        }
      });
    } else if (loserName) {
      party.scores[winnerName] += basePoints;
      party.scores[loserName] -= basePoints;
    }

    party.round += 1;
    party.state = 'playing';
    party.winData = null;
    party.submissions = {};

    await kv.set(`party:${partyCode}`, party);
    console.log(`Score recorded in party ${partyCode}: ${winnerName} won with ${fan} fan`);

    return c.json({ success: true, party });
  } catch (error) {
    console.error('Error recording score:', error);
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

    // Reassign positions after kick
    const positions = ['東', '南', '西', '北'];
    party.players.forEach((p: any, i: number) => {
      p.position = positions[i];
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