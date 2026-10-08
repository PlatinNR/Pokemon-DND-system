/**
 * Pokémon Pen & Paper - Live Real-Time Server
 * Unterstützt Echtzeit-Synchronisation zwischen DM (Spielleiter) und allen Trainern (Spielern).
 * Zero-Dependency: Verwendet reines Node.js mit Server-Sent Events (SSE) & REST API!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const isVercel = Boolean(process.env.VERCEL);
const BUNDLED_STATE_FILE = path.join(__dirname, 'data', 'game_state.json');
const RUNTIME_STATE_FILE = isVercel ? path.join(os.tmpdir(), 'pokemon_game_state.json') : BUNDLED_STATE_FILE;

// --- INITIAL DEFAULT STATE ---
let gameState = {
  trainers: [],
  itemsCatalog: [],
  diceHistory: [],
  activeEvents: [],
  pendingRequests: [],
  battleState: {
    active: true,
    gridWidth: 20,
    gridHeight: 14,
    turnNumber: 1,
    tokens: []
  },
  enemyPresets: []
};

const ENEMY_FILE = path.join(__dirname, 'data', 'enemy_presets.json');
const POKEDEX_FILE = path.join(__dirname, 'data', 'pokedex_gen1_5.json');
let POKEDEX_DATA = null;
if (fs.existsSync(POKEDEX_FILE)) {
  try {
    POKEDEX_DATA = JSON.parse(fs.readFileSync(POKEDEX_FILE, 'utf8'));
    console.log(`[Server] Pokédex-Daten geladen (${POKEDEX_DATA.pokemon?.length || 0} Pokémon, ${Object.keys(POKEDEX_DATA.moves || {}).length} Attacken).`);
  } catch (e) {
    console.error('[Server] Fehler beim Laden von pokedex_gen1_5.json:', e);
  }
}

let isStateLoaded = false;

function loadState() {
  if (isStateLoaded && gameState && gameState.trainers && gameState.trainers.length > 0) {
    if (fs.existsSync(RUNTIME_STATE_FILE)) {
      try {
        const raw = fs.readFileSync(RUNTIME_STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && (!gameState.version || (parsed.version && parsed.version >= gameState.version))) {
          gameState = parsed;
        }
      } catch (e) {}
    }
    return;
  }

  const target = (isVercel && fs.existsSync(RUNTIME_STATE_FILE)) ? RUNTIME_STATE_FILE : BUNDLED_STATE_FILE;
  if (fs.existsSync(target)) {
    try {
      const raw = fs.readFileSync(target, 'utf8');
      gameState = JSON.parse(raw);
      if (!gameState.version) gameState.version = 1;
      if (!gameState.battleState) {
        gameState.battleState = { active: true, gridWidth: 20, gridHeight: 14, turnNumber: 1, tokens: [] };
      }
      if (!gameState.battleState.turnNumber) gameState.battleState.turnNumber = 1;
      if (!gameState.pendingRequests) gameState.pendingRequests = [];
      if (!gameState.enemyPresets || gameState.enemyPresets.length === 0) {
        if (fs.existsSync(ENEMY_FILE)) {
          try { gameState.enemyPresets = JSON.parse(fs.readFileSync(ENEMY_FILE, 'utf8')); } catch (e) {}
        }
      }
      // Clean up negative or corrupt APs from earlier bug
      if (gameState.battleState?.tokens) {
        gameState.battleState.tokens.forEach(t => {
          if (t.moveAps) {
            Object.keys(t.moveAps).forEach(k => {
              if (t.moveAps[k] <= 0) delete t.moveAps[k];
            });
          }
        });
      }
      isStateLoaded = true;
    } catch (e) {
      console.error('[Server] Fehler beim Laden des Spielstands:', e);
    }
  } else {
    // Try to load initial trainers from pnp_trainers or default
    gameState.trainers = [
      {
        id: 'trainer_rot',
        name: 'Rot',
        role: 'Pokémon-Trainer',
        items: [
          { id: 'poke_ball', name_de: 'Pokéball', count: 5, icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
          { id: 'potion', name_de: 'Trank', count: 3, icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png' }
        ],
        pokemon: []
      }
    ];
    gameState.version = 1;
    isStateLoaded = true;
    saveState();
  }
}

function saveState() {
  try {
    gameState.version = (gameState.version || 1) + 1;
    gameState.lastModified = Date.now();
    fs.writeFileSync(RUNTIME_STATE_FILE, JSON.stringify(gameState, null, 2), 'utf8');
    if (!isVercel) {
      try {
        fs.writeFileSync(BUNDLED_STATE_FILE, JSON.stringify(gameState, null, 2), 'utf8');
      } catch (e) {}
    }
  } catch (e) {
    console.error('[Server] Fehler beim Speichern des Spielstands:', e);
  }
}

// Initial load
loadState();

// --- SSE CLIENTS REGISTRY ---
const sseClients = new Set();

function broadcastEvent(eventType, payload) {
  const data = JSON.stringify({ type: eventType, payload, timestamp: Date.now() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// --- GET LOCAL NETWORK IP ADDRESS ---
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// --- REQUEST HANDLER (WORKS LOCALLY AND ON VERCEL SERVERLESS) ---
function handleRequest(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const endpoint = url.searchParams.get('endpoint') || '';

  const isEvents = pathname === '/api/events' || pathname.endsWith('/events') || endpoint === 'events';
  const isState = pathname === '/api/state' || pathname.endsWith('/state') || endpoint === 'state';
  const isNetwork = pathname === '/api/network' || pathname.endsWith('/network') || endpoint === 'network';
  const isAction = pathname === '/api/action' || pathname.endsWith('/action') || endpoint === 'action';

  // 1. API: Server-Sent Events (Live Sync Stream)
  if (isEvents) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', isOnline: Boolean(process.env.VERCEL) })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. API: Get Game State
  if (isState && req.method === 'GET') {
    loadState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(gameState));
    return;
  }

  // 3. API: Network info (for QR code & links)
  if (isNetwork && req.method === 'GET') {
    const isVercelEnv = Boolean(process.env.VERCEL);
    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
    const protoHeader = req.headers['x-forwarded-proto'] || (isVercelEnv ? 'https' : 'http');
    const localIp = getLocalIp();
    const origin = isVercelEnv ? `${protoHeader}://${hostHeader}` : `http://${localIp}:${PORT}`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      localIp: isVercelEnv ? hostHeader : localIp,
      port: isVercelEnv ? 443 : PORT,
      isOnline: isVercelEnv,
      origin: origin,
      dmUrl: `${origin}/dm.html`,
      trainerUrl: `${origin}/trainer.html`,
      downloadUrl: `${origin}/download.html`
    }));
    return;
  }

  // 4. API: Post Action (State Updates)
  if (isAction && req.method === 'POST') {
    const executeAction = (action) => {
      try {
        loadState();
        handleAction(action);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, gameState: gameState }));
      } catch (err) {
        console.error('[Server] Fehler bei Action:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    };

    if (req.body) {
      let action = req.body;
      if (typeof action === 'string') {
        try { action = JSON.parse(action); } catch (e) {}
      }
      executeAction(action);
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const action = JSON.parse(body || '{}');
        executeAction(action);
      } catch (err) {
        console.error('[Server] Fehler beim Parsen von Action:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'download.html' : pathname);

  // Normalize path & security check
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Prevent caching for live updates
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.writeHead(200, { 'Content-Type': contentType });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// Helper: Identify status conditions inflicted by status moves
function getStatusFromMove(move) {
  if (!move) return null;
  const name = (move.name_de || '').toLowerCase();
  const desc = (move.desc_de || '').toLowerCase();

  // Confusion (Verwirrung)
  if (name.includes('konfus') || name.includes('superschall') || name.includes('taumeltanz') || name.includes('verwirr') || desc.includes('verwirrt')) {
    return { type: 'confusion', isConfused: true, confusionTurns: Math.floor(Math.random() * 3) + 2, label: '🌀 Verwirrung' };
  }
  // Sleep (Schlaf)
  if (name.includes('hypnose') || name.includes('schlafpuder') || name.includes('gesang') || name.includes('gähner') || desc.includes('schlaf')) {
    return { type: 'sleep', status: 'sleep', sleepTurns: Math.floor(Math.random() * 3) + 1, label: '💤 Schlaf' };
  }
  // Toxic (Schwere Vergiftung)
  if (name.includes('toxin') || desc.includes('schwer vergiftet')) {
    return { type: 'toxic', status: 'toxic', statusTurns: 1, label: '☠️ Schwere Vergiftung' };
  }
  // Poison (Vergiftung)
  if (name.includes('giftpuder') || name.includes('giftwolke') || name.includes('gifthauch') || (move.damage_class === 'status' && desc.includes('vergiftet'))) {
    return { type: 'poison', status: 'poison', label: '🟣 Vergiftung' };
  }
  // Paralysis (Paralyse)
  if (name.includes('donnerwelle') || name.includes('stachelspore') || name.includes('schlingen') || (move.damage_class === 'status' && desc.includes('paralysiert'))) {
    return { type: 'paralysis', status: 'paralysis', label: '⚡ Paralyse' };
  }
  // Burn (Verbrennung)
  if (name.includes('irrlicht') || (move.damage_class === 'status' && desc.includes('verbrennt'))) {
    return { type: 'burn', status: 'burn', label: '🔥 Verbrennung' };
  }
  return null;
}

function isProtectMove(move) {
  if (!move) return false;
  const mid = Number(move.id);
  if (mid === 182 || mid === 197) return true; // Schutzschild, Scanner
  const name = (move.name_de || '').toLowerCase();
  return name.includes('schutzschild') || name.includes('scanner');
}

function isEndureMove(move) {
  if (!move) return false;
  const mid = Number(move.id);
  if (mid === 203) return true; // Ausdauer
  const name = (move.name_de || '').toLowerCase();
  return name.includes('ausdauer');
}

function isCounterMove(move) {
  if (!move) return false;
  const mid = Number(move.id);
  if (mid === 68) return true; // Konter / Counter
  const name = (move.name_de || '').toLowerCase();
  return name.includes('konter');
}

function isPriorityMove(move) {
  if (!move) return false;
  const mid = Number(move.id);
  if ([98, 183, 245, 252, 389, 410, 418, 420, 425, 453].includes(mid)) return true;
  if (move.priority && move.priority > 0 && move.category !== 'status') return true;
  if (move.is_hit_and_run) return true;
  const nameDe = (move.name_de || '').toLowerCase();
  return /ruckzuckhieb|turbotempo|tempohieb|patronenhieb|wasserdüse|eissplitter|schattenstoß|tiefschlag|mogelhieb/.test(nameDe);
}

// Ability lookup helpers
function getPokemonDefaultAbility(pokemonId) {
  if (!pokemonId || !POKEDEX_DATA?.pokemon) return null;
  const pData = POKEDEX_DATA.pokemon.find(p => p.id === pokemonId);
  if (pData?.abilities && pData.abilities.length > 0) {
    return pData.abilities[0];
  }
  return null;
}

function getPokemonAbility(tokenOrPoke) {
  if (!tokenOrPoke) return null;
  if (tokenOrPoke.ability && typeof tokenOrPoke.ability === 'object' && tokenOrPoke.ability.name_de) {
    return tokenOrPoke.ability;
  }
  if (typeof tokenOrPoke.ability === 'string' && tokenOrPoke.ability.trim()) {
    return { name_de: tokenOrPoke.ability, name_en: tokenOrPoke.ability };
  }
  return getPokemonDefaultAbility(tokenOrPoke.pokemonId);
}

function getPokemonAbilityName(tokenOrPoke) {
  const ab = getPokemonAbility(tokenOrPoke);
  return (ab?.name_de || ab?.name_en || '').toLowerCase().trim();
}

// Authentic Gen 5 Stat Stage Multipliers (-6 to +6)
function getStatStageMultiplier(stage) {
  stage = Math.max(-6, Math.min(6, stage || 0));
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function getAccuracyStageMultiplier(stage) {
  stage = Math.max(-6, Math.min(6, stage || 0));
  if (stage >= 0) return (3 + stage) / 3;
  return 3 / (3 - stage);
}

// Move Debuff Classifier
function getDebuffFromMove(move) {
  if (!move) return null;
  const mid = Number(move.id);
  const name = (move.name_de || '').toLowerCase();
  const desc = (move.desc_de || '').toLowerCase();

  // ATK Debuffs:
  if (mid === 45 || name.includes('heuler')) return { stat: 'atk', delta: -1, isAoe: true, label: '📉 Angriff -1 (Fläche)' };
  if (mid === 204 || name.includes('charme')) return { stat: 'atk', delta: -2, isAoe: false, label: '📉 Angriff -2' };
  if (mid === 297 || name.includes('daunenreigen')) return { stat: 'atk', delta: -2, isAoe: false, label: '📉 Angriff -2' };
  if (mid === 62 || name.includes('aurorastrahl')) return { stat: 'atk', delta: -1, isAoe: false, label: '📉 Angriff -1' };

  // DEF Debuffs:
  if (mid === 39 || name.includes('rutenschlag')) return { stat: 'def', delta: -1, isAoe: true, label: '🛡️⬇️ Verteidigung -1 (Fläche)' };
  if (mid === 43 || name.includes('silberblick')) return { stat: 'def', delta: -1, isAoe: true, label: '🛡️⬇️ Verteidigung -1 (Fläche)' };
  if (mid === 103 || name.includes('kreideschrei')) return { stat: 'def', delta: -2, isAoe: false, label: '🛡️⬇️ Verteidigung -2' };
  if (mid === 231 || name.includes('eisenschweif')) return { stat: 'def', delta: -1, isAoe: false, label: '🛡️⬇️ Verteidigung -1' };
  if (mid === 242 || name.includes('knirscher')) return { stat: 'def', delta: -1, isAoe: false, label: '🛡️⬇️ Verteidigung -1' };
  if (mid === 534 || name.includes('kalkklinge')) return { stat: 'def', delta: -1, isAoe: false, label: '🛡️⬇️ Verteidigung -1' };

  // SPE Debuffs:
  if (mid === 81 || name.includes('fadenschuss')) return { stat: 'spe', delta: -2, isAoe: true, label: '👟⬇️ Initiative -2 (Fläche)' };
  if (mid === 184 || name.includes('grimasse')) return { stat: 'spe', delta: -2, isAoe: false, label: '👟⬇️ Initiative -2' };
  if (mid === 178 || name.includes('baumwollsaat')) return { stat: 'spe', delta: -2, isAoe: true, label: '👟⬇️ Initiative -2 (Fläche)' };
  if (mid === 196 || name.includes('eissturm')) return { stat: 'spe', delta: -1, isAoe: true, label: '👟⬇️ Initiative -1 (Kegel)' };
  if (mid === 523 || name.includes('dampfwalze')) return { stat: 'spe', delta: -1, isAoe: true, label: '👟⬇️ Initiative -1 (Fläche)' };
  if (mid === 527 || name.includes('elektronetz')) return { stat: 'spe', delta: -1, isAoe: true, label: '👟⬇️ Initiative -1 (Kegel)' };
  if (mid === 317 || name.includes('felsgrab')) return { stat: 'spe', delta: -1, isAoe: false, label: '👟⬇️ Initiative -1' };
  if (mid === 341 || name.includes('lehmschuss')) return { stat: 'spe', delta: -1, isAoe: false, label: '👟⬇️ Initiative -1' };
  if (mid === 490 || name.includes('fußtritt')) return { stat: 'spe', delta: -1, isAoe: false, label: '👟⬇️ Initiative -1' };

  // ACC Debuffs:
  if (mid === 28 || name.includes('sandwirbel')) return { stat: 'acc', delta: -1, isAoe: false, label: '🎯⬇️ Genauigkeit -1' };
  if (mid === 108 || name.includes('rauchwolke')) return { stat: 'acc', delta: -1, isAoe: false, label: '🎯⬇️ Genauigkeit -1' };
  if (mid === 148 || name.includes('blitz')) return { stat: 'acc', delta: -1, isAoe: false, label: '🎯⬇️ Genauigkeit -1' };
  if (mid === 134 || name.includes('psykraft')) return { stat: 'acc', delta: -1, isAoe: false, label: '🎯⬇️ Genauigkeit -1' };
  if (mid === 189 || name.includes('lehmschelle')) return { stat: 'acc', delta: -1, isAoe: false, label: '🎯⬇️ Genauigkeit -1' };
  if (mid === 330 || name.includes('lehmbrühe')) return { stat: 'acc', delta: -1, isAoe: true, label: '🎯⬇️ Genauigkeit -1 (Kegel)' };

  // SPA / SPD Debuffs:
  if (mid === 319 || name.includes('metallsound')) return { stat: 'spd', delta: -2, isAoe: false, label: '🔮⬇️ Sp.-Vert. -2' };
  if (mid === 313 || name.includes('trugträne')) return { stat: 'spd', delta: -2, isAoe: false, label: '🔮⬇️ Sp.-Vert. -2' };
  if (mid === 491 || name.includes('säurespeier')) return { stat: 'spd', delta: -2, isAoe: false, label: '🔮⬇️ Sp.-Vert. -2' };
  if (mid === 51 || name.includes('säure')) return { stat: 'spd', delta: -1, isAoe: true, label: '🔮⬇️ Sp.-Vert. -1 (Kegel)' };
  if (mid === 247 || name.includes('spukball')) return { stat: 'spd', delta: -1, isAoe: false, label: '🔮⬇️ Sp.-Vert. -1' };
  if (mid === 412 || name.includes('energieball')) return { stat: 'spd', delta: -1, isAoe: false, label: '🔮⬇️ Sp.-Vert. -1' };
  if (mid === 414 || name.includes('erdkräfte')) return { stat: 'spd', delta: -1, isAoe: false, label: '🔮⬇️ Sp.-Vert. -1' };
  if (mid === 430 || name.includes('lichtkanone')) return { stat: 'spd', delta: -1, isAoe: false, label: '🔮⬇️ Sp.-Vert. -1' };
  if (mid === 555 || name.includes('standpauke')) return { stat: 'spa', delta: -1, isAoe: true, label: '🧠⬇️ Sp.-Angriff -1 (Kegel)' };
  if (mid === 522 || name.includes('käfertrutz')) return { stat: 'spa', delta: -1, isAoe: true, label: '🧠⬇️ Sp.-Angriff -1 (Kegel)' };
  if (mid === 296 || name.includes('nebelball')) return { stat: 'spa', delta: -1, isAoe: false, label: '🧠⬇️ Sp.-Angriff -1' };

  // Fallback by description parsing:
  const isAoe = (move.range_type === 'circle' || move.range_type === 'cone' || move.range_type === 'line');
  if (desc.includes('senkt') || desc.includes('sinkt') || desc.includes('reduziert')) {
    const isStrong = desc.includes('stark');
    const delta = isStrong ? -2 : -1;
    if (desc.includes('spezial-angriff')) return { stat: 'spa', delta, isAoe, label: `🧠⬇️ Sp.-Angriff ${delta}` };
    if (desc.includes('spezial-verteidigung')) return { stat: 'spd', delta, isAoe, label: `🔮⬇️ Sp.-Vert. ${delta}` };
    if (desc.includes('angriff') && !desc.includes('spezial-angriff')) return { stat: 'atk', delta, isAoe, label: `📉 Angriff ${delta}` };
    if (desc.includes('verteidigung') && !desc.includes('spezial-verteidigung')) return { stat: 'def', delta, isAoe, label: `🛡️⬇️ Verteidigung ${delta}` };
    if (desc.includes('initiative')) return { stat: 'spe', delta, isAoe, label: `👟⬇️ Initiative ${delta}` };
    if (desc.includes('genauigkeit')) return { stat: 'acc', delta, isAoe, label: `🎯⬇️ Genauigkeit ${delta}` };
  }
  return null;
}

// Move Buff Classifier
function getBuffFromMove(move) {
  if (!move) return null;
  const mid = Number(move.id);
  const name = (move.name_de || '').toLowerCase();
  const desc = (move.desc_de || '').toLowerCase();

  if (mid === 14 || name.includes('schwerttanz')) return { stat: 'atk', delta: 2, isSelf: true, label: '⚔️🔺 Angriff +2' };
  if (mid === 97 || name.includes('agilität')) return { stat: 'spe', delta: 2, isSelf: true, label: '👟🔺 Initiative +2' };
  if (mid === 110 || name.includes('panzerschutz') || mid === 106 || name.includes('härtner') || mid === 111 || name.includes('einigler')) {
    return { stat: 'def', delta: 1, isSelf: true, label: '🛡️🔺 Verteidigung +1' };
  }
  if (mid === 334 || name.includes('eisenabwehr')) return { stat: 'def', delta: 2, isSelf: true, label: '🛡️🔺 Verteidigung +2' };
  if (mid === 347 || name.includes('gedankengut')) return { stat: 'spa', delta: 1, secondaryStat: 'spd', secondaryDelta: 1, isSelf: true, label: '🧠🔺 Sp.-Angriff & Sp.-Vert. +1' };
  if (mid === 349 || name.includes('drachentanz')) return { stat: 'atk', delta: 1, secondaryStat: 'spe', secondaryDelta: 1, isSelf: true, label: '🐉🔺 Angriff & Initiative +1' };
  if (mid === 417 || name.includes('ränkeschmied')) return { stat: 'spa', delta: 2, isSelf: true, label: '🧠🔺 Sp.-Angriff +2' };

  if (desc.includes('erhöht') || desc.includes('steigt')) {
    const isStrong = desc.includes('stark') || desc.includes('drastisch');
    const delta = isStrong ? 2 : 1;
    if (desc.includes('spezial-angriff')) return { stat: 'spa', delta, isSelf: true, label: `🧠🔺 Sp.-Angriff +${delta}` };
    if (desc.includes('spezial-verteidigung')) return { stat: 'spd', delta, isSelf: true, label: `🔮🔺 Sp.-Vert. +${delta}` };
    if (desc.includes('angriff') && !desc.includes('spezial-angriff')) return { stat: 'atk', delta, isSelf: true, label: `⚔️🔺 Angriff +${delta}` };
    if (desc.includes('verteidigung') && !desc.includes('spezial-verteidigung')) return { stat: 'def', delta, isSelf: true, label: `🛡️🔺 Verteidigung +${delta}` };
    if (desc.includes('initiative')) return { stat: 'spe', delta, isSelf: true, label: `👟🔺 Initiative +${delta}` };
  }
  return null;
}

// Apply stat stage change with abilities (Contrary, Clear Body, Hyper Cutter, Big Pecks, Keen Eye, Defiant, Competitive)
function applyStatStageChange(target, stat, delta, sourceName = '', isFromOpponent = true) {
  if (!target) return { applied: false, message: '' };
  target.statStages = target.statStages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
  const abilityName = getPokemonAbilityName(target);
  const statLabels = { atk: 'Angriff', def: 'Verteidigung', spa: 'Spezial-Angriff', spd: 'Spezial-Verteidigung', spe: 'Initiative', acc: 'Genauigkeit' };
  const statName = statLabels[stat] || stat;

  // 1. Umkehrung (Contrary): Dreht alle Werteänderungen um
  if (abilityName === 'umkehrung') {
    delta = -delta;
  }

  // 2. Debuff-Blocker durch Fähigkeiten (nur wenn vom Gegner ausgelöst und delta < 0)
  if (isFromOpponent && delta < 0) {
    if (abilityName === 'neutraltorso' || abilityName === 'pulverrauch' || abilityName === 'weissrauch' || abilityName === 'weißrauch') {
      return { applied: false, blocked: true, message: `🛡️ Neutraltorso/Pulverrauch von ${target.nickname} verhindert das Senken von ${statName}!` };
    }
    if (abilityName === 'scherenmacht' && stat === 'atk') {
      return { applied: false, blocked: true, message: `✂️ Scherenmacht von ${target.nickname} verhindert das Senken des Angriffs!` };
    }
    if (abilityName === 'brustbieter' && stat === 'def') {
      return { applied: false, blocked: true, message: `🦅 Brustbieter von ${target.nickname} verhindert das Senken der Verteidigung!` };
    }
    if (abilityName === 'adlerauge' && stat === 'acc') {
      return { applied: false, blocked: true, message: `👁️ Adlerauge von ${target.nickname} verhindert das Senken der Genauigkeit!` };
    }
  }

  const oldStage = target.statStages[stat] || 0;
  if ((delta > 0 && oldStage >= 6) || (delta < 0 && oldStage <= -6)) {
    return { applied: false, message: `${target.nickname}s ${statName} kann nicht weiter ${delta > 0 ? 'steigen' : 'fallen'}!` };
  }

  const newStage = Math.max(-6, Math.min(6, oldStage + delta));
  target.statStages[stat] = newStage;
  const sign = newStage > 0 ? `+${newStage}` : `${newStage}`;
  let msg = delta < 0
    ? `📉 ${target.nickname}s ${statName} fiel um ${Math.abs(delta)} Stufe(n) auf ${sign}!`
    : `🔺 ${target.nickname}s ${statName} stieg um ${delta} Stufe(n) auf ${sign}!`;

  // 3. Reaktive Fähigkeiten bei Debuffs vom Gegner (Siegeswille & Wettstreit)
  if (isFromOpponent && delta < 0) {
    if (abilityName === 'siegeswille') {
      const prevAtk = target.statStages.atk || 0;
      target.statStages.atk = Math.min(6, prevAtk + 2);
      msg += ` [⚡ Siegeswille aktiviert: Angriff stieg um +2 auf ${target.statStages.atk > 0 ? '+' : ''}${target.statStages.atk}!]`;
    } else if (abilityName === 'wettstreit') {
      const prevSpa = target.statStages.spa || 0;
      target.statStages.spa = Math.min(6, prevSpa + 2);
      msg += ` [🔥 Wettstreit aktiviert: Spezial-Angriff stieg um +2 auf ${target.statStages.spa > 0 ? '+' : ''}${target.statStages.spa}!]`;
    }
  }

  return { applied: true, delta, newStage, message: msg };
}

// Bedroher On-Entry Trigger
function triggerOnEntryAbilities(newToken) {
  if (!newToken || !gameState.battleState?.tokens) return [];
  const logs = [];
  const abName = getPokemonAbilityName(newToken);
  if (abName === 'bedroher') {
    const opponents = gameState.battleState.tokens.filter(tok => {
      if (tok.id === newToken.id || tok.currentHp <= 0) return false;
      if (newToken.isEnemy) return !tok.isEnemy;
      return tok.isEnemy || (newToken.trainerId && tok.trainerId && tok.trainerId !== newToken.trainerId);
    });
    opponents.forEach(opp => {
      const res = applyStatStageChange(opp, 'atk', -1, `${newToken.nickname} (Bedroher)`, true);
      if (res.message) logs.push(res.message);
    });
    if (opponents.length > 0) {
      logs.unshift(`🦁 Bedroher von ${newToken.nickname} wirkt auf ${opponents.length} gegnerische(s) Pokémon!`);
    }
  }
  return logs;
}

// --- AUTHENTIC POKÉMON DAMAGE CALCULATION FORMULA ---
function calculatePokemonDamage(attacker, defender, move) {
  if (!move) {
    return { damage: 0, text: '', effectiveness: 1, isImmune: false };
  }

  // Schutzschild / Schutz-Effekt: wehrt alle Angriffe vollständig ab!
  if (defender?.isProtected) {
    return {
      damage: 0,
      text: ' (🛡️ Durch Schutzschild abgewehrt! 0 Schaden)',
      effectiveness: 0,
      isProtected: true
    };
  }

  // Accuracy Check (-6 to +6 stages)
  if (attacker?.statStages?.acc && attacker.statStages.acc < 0) {
    const accMult = getAccuracyStageMultiplier(attacker.statStages.acc);
    if (Math.random() > accMult) {
      return {
        damage: 0,
        text: ' (💨 Verfehlt! Genauigkeit durch Sandwirbel/Rauchwolke gesenkt)',
        isMissed: true,
        effectiveness: 0
      };
    }
  }

  const moveId = Number(move.id);
  const moveNameDe = (move.name_de || '').toLowerCase();
  const moveNameEn = (move.name_en || '').toLowerCase();

  const attackerPData = POKEDEX_DATA?.pokemon?.find(p => p.id === attacker.pokemonId);
  const defenderPData = POKEDEX_DATA?.pokemon?.find(p => p.id === defender.pokemonId);

  const atkAbility = getPokemonAbilityName(attacker);
  const defAbility = getPokemonAbilityName(defender);

  // Type Effectiveness (Multipliers: 0x, 0.25x, 0.5x, 1x, 2x, 4x)
  let typeMult = 1.0;
  if (defenderPData?.effectiveness && typeof defenderPData.effectiveness[move.type_name] === 'number') {
    typeMult = defenderPData.effectiveness[move.type_name];
  }

  // Rauflust (Scrappy): Normal- und Kampf-Attacken treffen Geist-Pokémon!
  if (atkAbility === 'rauflust' && typeMult === 0 && (move.type_name === 'normal' || move.type_name === 'fighting')) {
    typeMult = 1.0;
  }

  // Ability Immunities
  if (defAbility === 'schwebe' && move.type_name === 'ground') {
    return { damage: 0, text: ' (🛡️ Schwebe: Boden-Attacken haben keine Wirkung! 0×)', effectiveness: 0, isImmune: true, typeMult: 0 };
  }
  if (defAbility === 'feuerfänger' && move.type_name === 'fire') {
    return { damage: 0, text: ' (🔥 Feuerfänger: Feuer-Attacken absorbiert! 0×)', effectiveness: 0, isImmune: true, typeMult: 0 };
  }
  if ((defAbility === 'voltabsorber' || defAbility === 'blitzfänger') && move.type_name === 'electric') {
    const abLabel = defAbility === 'voltabsorber' ? 'Voltabsorber' : 'Blitzfänger';
    return { damage: 0, text: ` (⚡ ${abLabel}: Elektro-Attacken absorbiert! 0×)`, effectiveness: 0, isImmune: true, typeMult: 0 };
  }
  if (defAbility === 'h2o-absorber' && move.type_name === 'water') {
    return { damage: 0, text: ' (💧 H2O-Absorber: Wasser-Attacken absorbiert! 0×)', effectiveness: 0, isImmune: true, typeMult: 0 };
  }

  // Wunderwache (Wonder Guard): Nimmt nur von sehr effektiven Attacken Schaden!
  if (defAbility === 'wunderwache' && typeMult <= 1.0 && move.damage_class !== 'status') {
    return { damage: 0, text: ' (✨ Wunderwache: Nur sehr effektive Treffer fügen Schaden zu! 0×)', effectiveness: 0, isImmune: true, typeMult: 0 };
  }

  // =========================================================================
  // SPEZIELLE FIXE SCHADENS-ATTACKEN (FIX DAMAGE)
  // =========================================================================

  // 1. Drachenwut (Dragon Rage, ID 82): IMMER 40 KP fixer Schaden!
  if (moveId === 82 || moveNameDe.includes('drachenwut') || moveNameEn.includes('dragon rage')) {
    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung! 0×)', effectiveness: 0, isImmune: true, typeMult };
    }
    return {
      damage: 40,
      text: ' (Fixer Schaden: 40 KP 🐉)',
      effectiveness: 1.0,
      isImmune: false,
      isFixed: true,
      fixedDamage: 40
    };
  }

  // 2. Ultraschall / Schallwelle (Sonic Boom, ID 49): IMMER 20 KP fixer Schaden!
  if (moveId === 49 || moveNameDe.includes('ultraschall') || (moveNameDe.includes('schallwelle') && (!move.power || move.power === 20)) || moveNameEn.includes('sonic boom')) {
    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung auf Geist! 0× 🛡️)', effectiveness: 0, isImmune: true, typeMult };
    }
    return {
      damage: 20,
      text: ' (Fixer Schaden: 20 KP 🔊)',
      effectiveness: 1.0,
      isImmune: false,
      isFixed: true,
      fixedDamage: 20
    };
  }

  // 3. Beliebige Attacke mit explizitem fixed_damage
  if (typeof move.fixed_damage === 'number' && move.fixed_damage > 0) {
    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung! 0×)', effectiveness: 0, isImmune: true, typeMult };
    }
    return {
      damage: move.fixed_damage,
      text: ` (Fixer Schaden: ${move.fixed_damage} KP)`,
      effectiveness: 1.0,
      isImmune: false,
      isFixed: true,
      fixedDamage: move.fixed_damage
    };
  }

  // 4. Geowurf (ID 69) & Nachtnebel (ID 101): Schaden = Level des Angreifers!
  if (moveId === 69 || moveId === 101 || moveNameDe.includes('geowurf') || moveNameDe.includes('nachtnebel') || moveNameEn.includes('seismic toss') || moveNameEn.includes('night shade')) {
    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung! 0×)', effectiveness: 0, isImmune: true, typeMult };
    }
    const lvlDamage = Math.max(1, attacker.level || 50);
    return {
      damage: lvlDamage,
      text: ` (Fixer Level-Schaden: ${lvlDamage} KP ⚖️)`,
      effectiveness: 1.0,
      isImmune: false,
      isFixed: true,
      fixedDamage: lvlDamage
    };
  }

  // 5. Superzahn (ID 162): Halbiert aktuelle KP des Ziels!
  if (moveId === 162 || moveNameDe.includes('superzahn') || moveNameEn.includes('super fang')) {
    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung! 0×)', effectiveness: 0, isImmune: true, typeMult };
    }
    const curHp = defender.currentHp !== undefined ? defender.currentHp : (defender.maxHp || 20);
    const halfDmg = Math.max(1, Math.floor(curHp / 2));
    return {
      damage: halfDmg,
      text: ` (KP halbiert: -${halfDmg} KP 🦷)`,
      effectiveness: 1.0,
      isImmune: false,
      isFixed: true,
      fixedDamage: halfDmg
    };
  }

  // 6. K.O.-Attacken (Guillotine 12, Hornbohrer 32, Geofissur 90, Eiseskälte 329)
  if ([12, 32, 90, 329].includes(moveId)) {
    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung! 0×)', effectiveness: 0, isImmune: true, typeMult };
    }
    const koDmg = defender.currentHp || defender.maxHp || 100;
    return {
      damage: koDmg,
      text: ' (Sofort-K.O.! 💀)',
      effectiveness: 1.0,
      isImmune: false,
      isOHKO: true
    };
  }

  // Status Moves (Debuffs, Buffs, Ailments)
  const debuff = getDebuffFromMove(move);
  const buff = getBuffFromMove(move);
  if (!move.power || move.damage_class === 'status' || move.damage_class_id === 1) {
    const statusEffect = getStatusFromMove(move);
    let descTxt = ' (Status-Attacke)';
    if (statusEffect) descTxt = ` (${statusEffect.label})`;
    else if (debuff) descTxt = ` (${debuff.label})`;
    else if (buff) descTxt = ` (${buff.label})`;
    return {
      damage: 0,
      text: descTxt,
      effectiveness: 1,
      isImmune: false,
      isStatusMove: true,
      statusEffect,
      debuff,
      buff
    };
  }

  const level = attacker.level || 50;
  let power = move.power || 40;
  const isPhysical = (move.damage_class === 'physical' || move.damage_class_id === 2);

  // Techniker (Technician): +50% Stärke bei Attacken mit Stärke <= 60
  if (atkAbility === 'techniker' && power <= 60) {
    power = Math.floor(power * 1.5);
  }

  // Notdünger, Großbrand, Sturzbach, Hexenplage: +50% bei KP <= 33%
  const atkMaxHp = attacker.maxHp || 100;
  const atkCurHp = (attacker.currentHp !== undefined) ? attacker.currentHp : atkMaxHp;
  if (atkCurHp <= Math.floor(atkMaxHp / 3)) {
    if (atkAbility === 'großbrand' && move.type_name === 'fire') power = Math.floor(power * 1.5);
    else if (atkAbility === 'notdünger' && move.type_name === 'grass') power = Math.floor(power * 1.5);
    else if (atkAbility === 'sturzbach' && move.type_name === 'water') power = Math.floor(power * 1.5);
    else if (atkAbility === 'hexenplage' && move.type_name === 'bug') power = Math.floor(power * 1.5);
  }

  let A = isPhysical ? (attacker.atk || 50) : (attacker.spa || 50);
  let D = isPhysical ? (defender.def || 50) : (defender.spd || 50);

  function calcStat(base, key, lvl, nat, custom) {
    if (key === 'hp') {
      if (base === 1) return 1;
      return Math.floor(0.01 * (2 * base + 31) * lvl) + lvl + 10 + (custom || 0);
    }
    const natureObj = POKEDEX_DATA?.natures?.find(n => n.name_de === nat);
    let mult = 1.0;
    if (natureObj) {
      if (natureObj.up === key && natureObj.down !== key) mult = 1.1;
      else if (natureObj.down === key && natureObj.up !== key) mult = 0.9;
    }
    const raw = Math.floor(0.01 * (2 * base + 31) * lvl) + 5;
    return Math.floor(raw * mult) + (custom || 0);
  }

  const isAttackerHuman = (attacker.pokemonId === 0 || attacker.isHuman || attackerPData?.id === 0 || attacker.name_de === 'Mensch');
  const isDefenderHuman = (defender.pokemonId === 0 || defender.isHuman || defenderPData?.id === 0 || defender.name_de === 'Mensch');

  if (isAttackerHuman) {
    A = 70 + (attacker.customStats?.[isPhysical ? 'atk' : 'spa'] || 0);
  } else if (attackerPData?.base_stats) {
    const key = isPhysical ? 'atk' : 'spa';
    A = calcStat(attackerPData.base_stats[key], key, level, attacker.nature, attacker.customStats?.[key]);
  }

  if (isDefenderHuman) {
    D = 70 + (defender.customStats?.[isPhysical ? 'def' : 'spd'] || 0);
  } else if (defenderPData?.base_stats) {
    const key = isPhysical ? 'def' : 'spd';
    D = calcStat(defenderPData.base_stats[key], key, defender.level || 50, defender.nature, defender.customStats?.[key]);
  }

  // Stat Stages Application (Unless ignored by Unaware / Unkenntnis)
  const defHasUnaware = defAbility === 'unkenntnis';
  const atkHasUnaware = atkAbility === 'unkenntnis';
  if (!defHasUnaware) {
    const aStage = (attacker.statStages?.[isPhysical ? 'atk' : 'spa'] || 0);
    A = Math.max(1, Math.floor(A * getStatStageMultiplier(aStage)));
  }
  if (!atkHasUnaware) {
    const dStage = (defender.statStages?.[isPhysical ? 'def' : 'spd'] || 0);
    D = Math.max(1, Math.floor(D * getStatStageMultiplier(dStage)));
  }

  A = Math.max(1, A);
  D = Math.max(1, D);

  // Official Gen 5 Pokémon formula: Math.floor(Math.floor((2 * Level / 5 + 2) * Power * A / D) / 50) + 2
  const levelPart = Math.floor((2 * level) / 5) + 2;
  const baseDmg = Math.floor((levelPart * power * (A / D)) / 50) + 2;

  // STAB (Same-Type Attack Bonus): 1.5x
  let stab = 1.0;
  const attackerTypes = attackerPData?.types?.map(t => t.identifier) || [];
  if (attackerTypes.includes(move.type_name)) {
    stab = 1.5;
  }

  if (typeMult === 0) {
    return { damage: 0, text: ' (Hat keine Wirkung auf das Ziel! 0×)', effectiveness: 0, isImmune: true, stab, typeMult, debuff, buff };
  }

  // Verbrennung (BRN): Physische Attacken richten nur 50% Schaden an!
  let burnPenalty = 1.0;
  let burnText = '';
  if (attacker.status === 'burn' && isPhysical) {
    burnPenalty = 0.5;
    burnText = ' (🔥 Verbrennung: physischer Schaden halbiert)';
  }

  // Random factor [0.85 .. 1.00]
  const randomFactor = 0.85 + (Math.random() * 0.15);
  let finalDamage = Math.max(1, Math.floor(baseDmg * stab * typeMult * randomFactor * burnPenalty));

  let effectText = '';
  if (typeMult >= 2.0) effectText = ` (Sehr effektiv! ${typeMult}× 💥)`;
  else if (typeMult <= 0.5) effectText = ` (Nicht sehr effektiv... ${typeMult}× 🛡️)`;
  if (burnText) effectText += burnText;

  // Robustheit (Sturdy): Überlebt tödlichen Treffer mit vollen KP mit mindestens 1 KP!
  if (defAbility === 'robustheit' && defender.currentHp >= (defender.maxHp || 100) && (defender.currentHp - finalDamage <= 0)) {
    finalDamage = Math.max(0, defender.currentHp - 1);
    effectText += ' (🛡️ Überlebt mit 1 KP dank Robustheit!)';
  }

  // Ausdauer (Endure): Überlebt fatale Treffer mit mindestens 1 KP!
  if (defender?.isEnduring && (defender.currentHp - finalDamage <= 0)) {
    finalDamage = Math.max(0, defender.currentHp - 1);
    effectText += ' (💪 Überlebt mit 1 KP dank Ausdauer!)';
  }

  return { damage: finalDamage, text: effectText, effectiveness: typeMult, stab, A, D, power, baseDmg, debuff, buff };
}

function executeBattleRoundReset(initiatorName = 'Spielleiter') {
  if (!gameState.battleState) return;
  gameState.battleState.tokens = gameState.battleState.tokens || [];
  gameState.battleState.turnNumber = (gameState.battleState.turnNumber || 1) + 1;
  const roundLogs = [];

  gameState.battleState.tokens.forEach(t => {
    // Schutzschild, Ausdauer und Konter laufen am Rundenende aus
    t.isProtected = false;
    t.isEnduring = false;
    t.isCountering = false;

    // 1. Verbrennung (BRN): 1/16 Max-KP Schaden am Rundenende
    if (t.status === 'burn' && t.currentHp > 0) {
      const burnDmg = Math.max(1, Math.floor((t.maxHp || 100) / 16));
      t.currentHp = Math.max(0, t.currentHp - burnDmg);
      roundLogs.push(`🔥 ${t.nickname} (-${burnDmg} KP Verbrennung)`);
    }
    // 2. Vergiftung (PSN): 1/8 Max-KP Schaden am Rundenende
    else if (t.status === 'poison' && t.currentHp > 0) {
      const psnDmg = Math.max(1, Math.floor((t.maxHp || 100) / 8));
      t.currentHp = Math.max(0, t.currentHp - psnDmg);
      roundLogs.push(`🟣 ${t.nickname} (-${psnDmg} KP Gift)`);
    }
    // 3. Schwere Vergiftung (TOX): steigender Schaden
    else if (t.status === 'toxic' && t.currentHp > 0) {
      t.statusTurns = (t.statusTurns || 1);
      const toxDmg = Math.max(1, Math.floor((t.maxHp || 100) * t.statusTurns / 16));
      t.currentHp = Math.max(0, t.currentHp - toxDmg);
      roundLogs.push(`☠️ ${t.nickname} (-${toxDmg} KP schwere Vergiftung Stufe ${t.statusTurns})`);
      t.statusTurns += 1;
    }
    // 4. Schlaf (SLP): Zähler tickt herunter
    else if (t.status === 'sleep') {
      t.sleepTurns = (t.sleepTurns !== undefined ? t.sleepTurns : 2) - 1;
      if (t.sleepTurns <= 0) {
        t.status = 'none';
        roundLogs.push(`⏰ ${t.nickname} ist aufgewacht!`);
      } else {
        roundLogs.push(`💤 ${t.nickname} schläft tief...`);
      }
    }
    // 5. Frost (FRZ): 20% Auftauchance
    else if (t.status === 'freeze') {
      if (Math.random() < 0.20) {
        t.status = 'none';
        roundLogs.push(`❄️ ${t.nickname} ist aufgetaut!`);
      } else {
        roundLogs.push(`❄️ ${t.nickname} ist weiterhin eingefroren!`);
      }
    }

    // Verwirrung (CNF): Zähler tickt herunter
    if (t.isConfused) {
      t.confusionTurns = (t.confusionTurns !== undefined ? t.confusionTurns : 3) - 1;
      if (t.confusionTurns <= 0) {
        t.isConfused = false;
        roundLogs.push(`💫 ${t.nickname} ist nicht mehr verwirrt!`);
      }
    }

    // Sync HP & Status zu Trainer-Pokémon
    if (t.trainerId && t.pokemonUid) {
      const tr = gameState.trainers.find(tr => tr.id === t.trainerId);
      const pk = tr?.pokemon.find(p => p.uid === t.pokemonUid);
      if (pk) {
        pk.currentHp = t.currentHp;
        pk.status = t.status;
        pk.isConfused = t.isConfused;
      }
    }

    // Temposchub (Speed Boost) am Rundenende
    const tAbility = getPokemonAbilityName(t);
    if (tAbility === 'temposchub' && t.currentHp > 0) {
      t.statStages = t.statStages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
      if ((t.statStages.spe || 0) < 6) {
        t.statStages.spe = (t.statStages.spe || 0) + 1;
        roundLogs.push(`💨 ${t.nickname} (+1 Initiative durch Temposchub)`);
      }
    }

    // Bewegungs- und Angriffs-Reset (Initiative-Stufen wirken auf Reichweite)
    t.hasAttacked = false;
    const baseMov = t.maxMovement || 5;
    const speStage = t.statStages?.spe || 0;
    const effectiveMov = Math.max(1, baseMov + speStage);

    if (t.status === 'sleep' || t.status === 'freeze') {
      t.remainingMovement = 0;
    } else if (t.status === 'paralysis') {
      t.remainingMovement = Math.floor(effectiveMov / 2);
    } else {
      t.remainingMovement = effectiveMov;
    }
  });

  saveState();
  broadcastEvent('BATTLE_ROUND_RESET', { turnNumber: gameState.battleState.turnNumber });
  const summaryText = roundLogs.length > 0 ? ` [Status-Effekte: ${roundLogs.join(', ')}]` : '';
  const roundLogEntry = {
    time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    character: initiatorName,
    sides: 'Runde ' + gameState.battleState.turnNumber,
    roll: `🔄 Runde ${gameState.battleState.turnNumber} begonnen! Bewegung aller Einheiten zurückgesetzt.${summaryText}`
  };
  gameState.diceHistory = gameState.diceHistory || [];
  gameState.diceHistory.unshift(roundLogEntry);
  if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
  broadcastEvent('DICE_ROLLED', roundLogEntry);
  broadcastEvent('STATE_UPDATED', gameState);
}

// --- ACTION HANDLER ---
function handleAction(action) {
  const { type, payload } = action;
  console.log(`[Action] ${type}`, payload?.trainerId || payload?.nickname || '');

  switch (type) {
    case 'SYNC_STATE':
      if (payload.trainers && Array.isArray(payload.trainers)) {
        payload.trainers.forEach(incomingTrainer => {
          const idx = gameState.trainers.findIndex(t => t.id === incomingTrainer.id);
          if (idx >= 0) {
            gameState.trainers[idx] = incomingTrainer;
          } else {
            gameState.trainers.push(incomingTrainer);
          }
        });
      }
      if (payload.battleState) gameState.battleState = payload.battleState;
      if (payload.version) gameState.version = Math.max(gameState.version || 0, payload.version);
      saveState();
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'CREATE_TRAINER':
      const newTrainer = {
        id: payload.id || 'trainer_' + Date.now(),
        name: payload.name,
        role: payload.role || 'Pokémon-Trainer',
        items: payload.items || [
          { id: 'poke_ball', name_de: 'Pokéball', count: 5, icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png' },
          { id: 'potion', name_de: 'Trank', count: 3, icon: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png' }
        ],
        pokemon: []
      };
      gameState.trainers.push(newTrainer);
      saveState();
      broadcastEvent('TRAINER_CREATED', newTrainer);
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'DELETE_TRAINER':
      gameState.trainers = gameState.trainers.filter(t => t.id !== payload.trainerId);
      saveState();
      broadcastEvent('TRAINER_DELETED', { trainerId: payload.trainerId });
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'ASSIGN_POKEMON':
      const targetTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (targetTrainer) {
        targetTrainer.pokemon.push(payload.pokemon);
        saveState();
        broadcastEvent('POKEMON_ASSIGNED', { trainerId: payload.trainerId, pokemon: payload.pokemon });
        broadcastEvent('STATE_UPDATED', gameState);
      }
      break;

    case 'EVOLVE_POKEMON':
      // DM-triggered evolution!
      const evoTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (evoTrainer) {
        const poke = evoTrainer.pokemon.find(p => p.uid === payload.pokemonUid);
        if (poke) {
          const oldName = poke.name_de;
          poke.pokemonId = payload.targetId;
          poke.name_de = payload.targetNameDe;
          // Stats & HP recalculation trigger
          if (payload.newMaxHp) {
            const hpDelta = payload.newMaxHp - poke.maxHp;
            poke.maxHp = payload.newMaxHp;
            poke.currentHp = Math.min(poke.maxHp, poke.currentHp + Math.max(0, hpDelta));
          }
          saveState();
          broadcastEvent('POKEMON_EVOLVED', {
            trainerId: payload.trainerId,
            pokemonUid: payload.pokemonUid,
            oldName: oldName,
            newName: payload.targetNameDe,
            targetId: payload.targetId,
            pokemon: poke
          });
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'UPDATE_POKEMON_HP':
      const hpTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (hpTrainer) {
        const poke = hpTrainer.pokemon.find(p => p.uid === payload.pokemonUid);
        if (poke) {
          poke.currentHp = Math.max(0, Math.min(poke.maxHp, payload.currentHp));
          saveState();
          broadcastEvent('HP_UPDATED', {
            trainerId: payload.trainerId,
            pokemonUid: payload.pokemonUid,
            currentHp: poke.currentHp
          });
        }
      }
      break;

    case 'LEVEL_UP_POKEMON':
      const lvlTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (lvlTrainer) {
        const poke = lvlTrainer.pokemon.find(p => p.uid === payload.pokemonUid);
        if (poke) {
          const delta = typeof payload.delta === 'number' ? payload.delta : 1;
          const oldMaxHp = poke.maxHp || payload.newMaxHp || 20;
          poke.level = Math.max(1, Math.min(100, poke.level + delta));
          if (delta > 0) {
            poke.freePoints = (poke.freePoints || 0) + (delta * 2);
          } else {
            poke.freePoints = Math.max(0, (poke.freePoints || 0) + (delta * 2));
          }

          let hpGain = 0;
          if (payload.newMaxHp) {
            poke.maxHp = payload.newMaxHp;
            const hpDelta = poke.maxHp - oldMaxHp;
            if (hpDelta > 0) {
              hpGain = hpDelta;
              // Heals automatically by the gained HP on level-up
              poke.currentHp = Math.min(poke.maxHp, (poke.currentHp || 0) + hpDelta);
            } else if (poke.currentHp > poke.maxHp) {
              poke.currentHp = poke.maxHp;
            }
          }

          // Also sync token on battlemap if currently placed
          if (gameState.battleState && gameState.battleState.tokens) {
            const mapToken = gameState.battleState.tokens.find(t => t.pokemonUid === payload.pokemonUid);
            if (mapToken) {
              mapToken.level = poke.level;
              mapToken.maxHp = poke.maxHp;
              mapToken.currentHp = poke.currentHp;
              mapToken.customStats = poke.customStats;
            }
          }

          saveState();
          broadcastEvent('POKEMON_LEVELED_UP', {
            trainerId: payload.trainerId,
            pokemonUid: payload.pokemonUid,
            level: poke.level,
            freePoints: poke.freePoints,
            hpGain: hpGain,
            currentHp: poke.currentHp,
            maxHp: poke.maxHp,
            pokemon: poke
          });
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'ALLOCATE_STAT_POINT':
      const statTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (statTrainer) {
        const poke = statTrainer.pokemon.find(p => p.uid === payload.pokemonUid);
        if (poke) {
          if ((poke.freePoints || 0) > 0) {
            poke.freePoints = (poke.freePoints || 0) - 1;
          }
          poke.customStats = poke.customStats || {};
          poke.customStats[payload.statKey] = (poke.customStats[payload.statKey] || 0) + 1;
          if (payload.statKey === 'hp') {
            poke.maxHp = (poke.maxHp || 0) + 1;
            poke.currentHp = Math.min(poke.maxHp, (poke.currentHp || 0) + 1);
          }
          if (gameState.battleState && gameState.battleState.tokens) {
            const mapToken = gameState.battleState.tokens.find(t => t.pokemonUid === payload.pokemonUid);
            if (mapToken) {
              mapToken.customStats = poke.customStats;
              if (payload.statKey === 'hp') {
                mapToken.maxHp = poke.maxHp;
                mapToken.currentHp = poke.currentHp;
              }
            }
          }
          saveState();
          broadcastEvent('STAT_ALLOCATED', {
            trainerId: payload.trainerId,
            pokemonUid: payload.pokemonUid,
            pokemon: poke
          });
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'UPDATE_POKEMON_MOVES':
      const movesTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (movesTrainer) {
        const poke = movesTrainer.pokemon.find(p => p.uid === payload.pokemonUid);
        if (poke) {
          poke.selectedMoves = payload.moves.slice(0, 4);
          saveState();
          broadcastEvent('MOVES_UPDATED', {
            trainerId: payload.trainerId,
            pokemonUid: payload.pokemonUid,
            moves: poke.selectedMoves
          });
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'GIVE_ITEM':
      const itemTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (itemTrainer) {
        itemTrainer.items = itemTrainer.items || [];
        const existing = itemTrainer.items.find(i => i.id === payload.item.id);
        if (existing) {
          existing.count += (payload.count || 1);
        } else {
          itemTrainer.items.push({
            id: payload.item.id,
            name_de: payload.item.name_de,
            count: payload.count || 1,
            icon: payload.item.icon
          });
        }
        saveState();
        broadcastEvent('ITEM_RECEIVED', {
          trainerId: payload.trainerId,
          item: payload.item,
          count: payload.count || 1
        });
        broadcastEvent('STATE_UPDATED', gameState);
      }
      break;

    case 'USE_ITEM':
      const useTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
      if (useTrainer && useTrainer.items) {
        const existing = useTrainer.items.find(i => i.id === payload.itemId);
        if (existing) {
          existing.count -= 1;
          if (existing.count <= 0) {
            useTrainer.items = useTrainer.items.filter(i => i.id !== payload.itemId);
          }
          // Falls auf ein Pokémon angewendet
          if (payload.pokemonUid) {
            const poke = useTrainer.pokemon?.find(p => p.uid === payload.pokemonUid);
            if (poke) {
              const iid = String(payload.itemId).toLowerCase();
              if (iid.includes('potion') || iid.includes('trank')) {
                const heal = (iid.includes('super') ? 50 : (iid.includes('hyper') ? 200 : (iid.includes('top') ? poke.maxHp : 20)));
                poke.currentHp = Math.min(poke.maxHp, poke.currentHp + heal);
              } else if (iid.includes('antidote') || iid.includes('gegengift')) {
                if (poke.status === 'poison' || poke.status === 'toxic') poke.status = 'none';
              } else if (iid.includes('feuerheiler') || iid.includes('burn_heal')) {
                if (poke.status === 'burn') poke.status = 'none';
              } else if (iid.includes('aufwecker') || iid.includes('awakening')) {
                if (poke.status === 'sleep') poke.status = 'none';
              } else if (iid.includes('hyperheiler') || iid.includes('full_heal')) {
                poke.status = 'none';
                poke.isConfused = false;
              }
              // Sync mit Battle Token
              const mapToken = gameState.battleState?.tokens?.find(t => t.pokemonUid === poke.uid);
              if (mapToken) {
                mapToken.currentHp = poke.currentHp;
                mapToken.status = poke.status;
                mapToken.isConfused = poke.isConfused;
              }
            }
          }
          saveState();
          broadcastEvent('ITEM_USED', {
            trainerId: payload.trainerId,
            itemId: payload.itemId,
            pokemonUid: payload.pokemonUid
          });
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'DICE_ROLL':
      // Broadcast dice roll to DM and players live!
      gameState.diceHistory = gameState.diceHistory || [];
      gameState.diceHistory.unshift(payload);
      if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
      broadcastEvent('DICE_ROLLED', payload);
      break;

    // --- BATTLE MAP & TOKENS ---
    case 'BATTLE_SPAWN_TOKEN':
      if (!gameState.battleState) gameState.battleState = { active: true, gridWidth: 20, gridHeight: 14, turnNumber: 1, tokens: [] };
      gameState.battleState.tokens = gameState.battleState.tokens || [];
      const defaultAbility = getPokemonDefaultAbility(payload.token.pokemonId);
      const chosenAbility = payload.token.ability || defaultAbility;
      const isHumanToken = (payload.token.pokemonId === 0 || payload.token.isHuman || payload.token.name_de === 'Mensch');
      const newToken = {
        id: payload.token.id || 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        maxMovement: payload.token.maxMovement || 5,
        remainingMovement: payload.token.remainingMovement !== undefined ? payload.token.remainingMovement : (payload.token.maxMovement || 5),
        hasAttacked: false,
        statStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, ...(payload.token.statStages || {}) },
        ability: chosenAbility,
        ...payload.token,
        currentHp: isHumanToken ? (payload.token.currentHp !== undefined ? payload.token.currentHp : 50) : payload.token.currentHp,
        maxHp: isHumanToken ? (payload.token.maxHp !== undefined ? payload.token.maxHp : 50) : payload.token.maxHp,
        isHuman: isHumanToken
      };
      gameState.battleState.tokens = gameState.battleState.tokens.filter(t => t.id !== newToken.id);
      gameState.battleState.tokens.push(newToken);

      // Trigger On-Entry Abilities (Bedroher)
      const entryLogs = triggerOnEntryAbilities(newToken);
      if (entryLogs.length > 0) {
        entryLogs.forEach(elog => {
          const entryLogEntry = {
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            character: newToken.nickname,
            sides: 'Fähigkeit: Bedroher',
            roll: elog
          };
          gameState.diceHistory = gameState.diceHistory || [];
          gameState.diceHistory.unshift(entryLogEntry);
          if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
          broadcastEvent('DICE_ROLLED', entryLogEntry);
        });
      }

      saveState();
      broadcastEvent('BATTLE_TOKEN_SPAWNED', newToken);
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'BATTLE_MOVE_TOKEN':
      if (gameState.battleState && gameState.battleState.tokens) {
        const token = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        if (token) {
          const dist = payload.dist || Math.max(Math.abs(payload.x - token.x), Math.abs(payload.y - token.y));
          token.x = payload.x;
          token.y = payload.y;
          if (token.remainingMovement !== undefined) {
            token.remainingMovement = Math.max(0, token.remainingMovement - dist);
          }
          saveState();
          broadcastEvent('BATTLE_TOKEN_MOVED', { tokenId: payload.tokenId, x: payload.x, y: payload.y });
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'BATTLE_REMOVE_TOKEN':
      if (gameState.battleState && gameState.battleState.tokens) {
        const removedTokens = gameState.battleState.tokens.filter(t => {
          if (payload.tokenId && t.id === payload.tokenId) return true;
          if (payload.pokemonUid && t.pokemonUid === payload.pokemonUid) return true;
          if (payload.presetId && t.presetId === payload.presetId) return true;
          return false;
        });
        const removedIds = new Set(removedTokens.map(t => t.id));
        const removedPokes = new Set(removedTokens.map(t => t.pokemonUid).filter(Boolean));
        gameState.battleState.tokens = gameState.battleState.tokens.filter(t => !removedTokens.includes(t));
        if (gameState.pendingRequests) {
          gameState.pendingRequests = gameState.pendingRequests.filter(r => {
            if (removedIds.has(r.sourceTokenId) || removedIds.has(r.tokenId) || removedIds.has(r.attackerId) || removedIds.has(r.targetTokenId)) return false;
            if (removedPokes.has(r.sourcePokemonUid) || removedPokes.has(r.pokemonUid)) return false;
            return true;
          });
        }
        saveState();
        broadcastEvent('BATTLE_TOKEN_REMOVED', payload);
        broadcastEvent('STATE_UPDATED', gameState);
      }
      break;

    case 'BATTLE_CLEAR_TOKENS':
      if (gameState.battleState) {
        gameState.battleState.tokens = [];
        gameState.pendingRequests = [];
        saveState();
        broadcastEvent('STATE_UPDATED', gameState);
      }
      break;

    case 'BATTLE_RESET_ROUND':
      executeBattleRoundReset('Spielleiter');
      break;

    case 'BATTLE_RESET_TOKEN_MOVEMENT':
      if (gameState.battleState && gameState.battleState.tokens) {
        const t = gameState.battleState.tokens.find(tok => 
          (payload.tokenId && tok.id === payload.tokenId) || 
          (payload.pokemonUid && tok.pokemonUid === payload.pokemonUid)
        );
        if (t) {
          const baseMov = t.maxMovement || 5;
          const speStage = t.statStages?.spe || 0;
          const effectiveMov = Math.max(1, baseMov + speStage);
          if (t.status === 'sleep' || t.status === 'freeze') {
            t.remainingMovement = 0;
          } else if (t.status === 'paralysis') {
            t.remainingMovement = Math.floor(effectiveMov / 2);
          } else {
            t.remainingMovement = effectiveMov;
          }
          saveState();
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    // --- ACTION REQUESTS SYSTEM (TRAINER ANFRAGEN AN DM) ---
    case 'SUBMIT_ACTION_REQUEST':
      gameState.pendingRequests = gameState.pendingRequests || [];
      const newReq = {
        id: 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        createdAt: Date.now(),
        status: 'pending',
        ...payload
      };
      gameState.pendingRequests.push(newReq);
      saveState();
      broadcastEvent('ACTION_REQUEST_SUBMITTED', newReq);
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'RESOLVE_ACTION_REQUEST':
      gameState.pendingRequests = gameState.pendingRequests || [];
      const req = gameState.pendingRequests.find(r => r.id === payload.requestId);
      if (!req) break;

      if (payload.approved) {
        if (req.type === 'MOVE') {
          const mToken = gameState.battleState?.tokens?.find(t => t.id === req.tokenId);
          if (mToken) {
            // Schlaf oder Frost verhindert Bewegung
            if (mToken.status === 'sleep' || mToken.status === 'freeze') {
              const cantMoveEntry = {
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                character: mToken.nickname,
                sides: 'Bewegung',
                roll: `❌ ${mToken.nickname} kann sich nicht bewegen (${mToken.status === 'sleep' ? '💤 schläft' : '❄️ eingefroren'})!`
              };
              gameState.diceHistory = gameState.diceHistory || [];
              gameState.diceHistory.unshift(cantMoveEntry);
              if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
              broadcastEvent('DICE_ROLLED', cantMoveEntry);
              gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
              saveState();
              broadcastEvent('STATE_UPDATED', gameState);
              break;
            }

            mToken.x = req.toX;
            mToken.y = req.toY;
            const dist = req.dist || Math.max(Math.abs(req.toX - req.fromX), Math.abs(req.toY - req.fromY));
            mToken.remainingMovement = Math.max(0, (mToken.remainingMovement !== undefined ? mToken.remainingMovement : (mToken.maxMovement || 5)) - dist);
            saveState();
            broadcastEvent('BATTLE_TOKEN_MOVED', { tokenId: mToken.id, x: mToken.x, y: mToken.y });
            const moveLogEntry = {
              time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              character: mToken.nickname,
              sides: 'Bewegung',
              roll: `🏃 [${req.toX + 1},${req.toY + 1}] (${dist} F., ${mToken.remainingMovement} übrig)`
            };
            gameState.diceHistory = gameState.diceHistory || [];
            gameState.diceHistory.unshift(moveLogEntry);
            if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
            broadcastEvent('DICE_ROLLED', moveLogEntry);
          }
        } else if (req.type === 'ATTACK') {
          const attacker = gameState.battleState?.tokens?.find(t => t.id === req.attackerId);
          const targetIds = (Array.isArray(req.targetTokenIds) && req.targetTokenIds.length > 0)
            ? req.targetTokenIds
            : (req.targetTokenId ? [req.targetTokenId] : []);
          const move = req.move || (attacker?.moves?.find(m => m.id === req.moveId)) || POKEDEX_DATA?.moves?.[String(req.moveId)];

          if (attacker && move) {
            // Selbst-Buffs & Haltungen prüfen: Schutzschild (182), Ausdauer (203), Konter (68)
            const isProtect = isProtectMove(move) || req.buffType === 'protect';
            const isEndure = isEndureMove(move) || req.buffType === 'endure';
            const isCounter = isCounterMove(move) || req.buffType === 'counter' || req.isCounterStance;
            const isSelfBuff = req.isSelfBuff || isProtect || isEndure || isCounter || (targetIds.length === 1 && targetIds[0] === attacker.id && move.category === 'status');

            if (isSelfBuff) {
              const currentTurn = gameState.battleState?.turnNumber || 1;

              // Schutzschild Cooldown: "nur alle 2 Runden"
              if (isProtect && attacker.lastProtectRound !== undefined && (currentTurn - attacker.lastProtectRound < 2)) {
                const failEntry = {
                  time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  character: attacker.nickname,
                  sides: move.name_de || 'Schutzschild',
                  roll: `❌ Schutzschild von ${attacker.nickname} ist fehlgeschlagen! (Abklingzeit: nur alle 2 Runden – wieder ab Runde ${attacker.lastProtectRound + 2} bereit)`
                };
                gameState.diceHistory = gameState.diceHistory || [];
                gameState.diceHistory.unshift(failEntry);
                if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
                broadcastEvent('DICE_ROLLED', failEntry);
                gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
                saveState();
                broadcastEvent('STATE_UPDATED', gameState);
                break;
              }

              // Deduct 1 AP
              attacker.moveAps = attacker.moveAps || {};
              const maxPp = move.pp || (isCounter ? 20 : 10);
              const curAp = (typeof attacker.moveAps[String(move.id)] === 'number') ? attacker.moveAps[String(move.id)] : maxPp;
              attacker.moveAps[String(move.id)] = Math.max(0, curAp - 1);
              if (attacker.trainerId && attacker.pokemonUid) {
                const attTrainer = gameState.trainers.find(t => t.id === attacker.trainerId);
                const attPoke = attTrainer?.pokemon?.find(p => p.uid === attacker.pokemonUid);
                if (attPoke) {
                  attPoke.moveAps = attPoke.moveAps || {};
                  attPoke.moveAps[String(move.id)] = attacker.moveAps[String(move.id)];
                }
              }

              let buffLogText = '';
              let movementMsg = '';
              if (isProtect) {
                attacker.isProtected = true;
                attacker.lastProtectRound = currentTurn;
                buffLogText = `🛡️ ${attacker.nickname} aktiviert Schutzschild! Wehrt alle Treffer in Runde ${currentTurn} vollständig ab!`;
                attacker.remainingMovement = Math.max(1, (attacker.maxMovement || 5) + (attacker.statStages?.spe || 0));
                movementMsg = ' ⚡ Volle Bewegung zurückerhalten (Hit & Run)!';
              } else if (isEndure) {
                attacker.isEnduring = true;
                buffLogText = `💪 ${attacker.nickname} aktiviert Ausdauer! Übersteht alle fatalen Treffer in Runde ${currentTurn} mit mindestens 1 KP!`;
                attacker.remainingMovement = Math.max(1, (attacker.maxMovement || 5) + (attacker.statStages?.spe || 0));
                movementMsg = ' ⚡ Volle Bewegung zurückerhalten (Hit & Run)!';
              } else if (isCounter) {
                attacker.isCountering = true;
                buffLogText = `⚔️ ${attacker.nickname} geht in Konter-Stellung! Greift den nächsten Angreifer automatisch mit 2× Schaden an!`;
              }
              attacker.hasAttacked = true;

              const buffCombatEntry = {
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                character: attacker.nickname,
                sides: move.name_de || (isProtect ? 'Schutzschild' : (isCounter ? 'Konter' : 'Ausdauer')),
                roll: `${buffLogText}${movementMsg}`
              };
              gameState.diceHistory = gameState.diceHistory || [];
              gameState.diceHistory.unshift(buffCombatEntry);
              if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();

              saveState();
              broadcastEvent('DICE_ROLLED', buffCombatEntry);
              gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
              broadcastEvent('STATE_UPDATED', gameState);
              break;
            }

            // 1. Statusprüfungen für Angreifer
            // Schlaf
            if (attacker.status === 'sleep') {
              attacker.hasAttacked = true;
              const sleepEntry = {
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                character: attacker.nickname,
                sides: move.name_de,
                roll: `💤 ${attacker.nickname} schläft tief und fest und kann nicht angreifen!`
              };
              gameState.diceHistory = gameState.diceHistory || [];
              gameState.diceHistory.unshift(sleepEntry);
              if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
              broadcastEvent('DICE_ROLLED', sleepEntry);
              gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
              saveState();
              broadcastEvent('STATE_UPDATED', gameState);
              break;
            }

            // Frost
            if (attacker.status === 'freeze') {
              attacker.hasAttacked = true;
              const frzEntry = {
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                character: attacker.nickname,
                sides: move.name_de,
                roll: `❄️ ${attacker.nickname} ist tiefgefroren und kann nicht angreifen!`
              };
              gameState.diceHistory = gameState.diceHistory || [];
              gameState.diceHistory.unshift(frzEntry);
              if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
              broadcastEvent('DICE_ROLLED', frzEntry);
              gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
              saveState();
              broadcastEvent('STATE_UPDATED', gameState);
              break;
            }

            // Paralyse (25% Chance auszusetzen)
            if (attacker.status === 'paralysis' && Math.random() < 0.25) {
              attacker.hasAttacked = true;
              const parEntry = {
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                character: attacker.nickname,
                sides: move.name_de,
                roll: `⚡ ${attacker.nickname} ist vollkommen paralysiert und kann sich nicht rühren!`
              };
              gameState.diceHistory = gameState.diceHistory || [];
              gameState.diceHistory.unshift(parEntry);
              if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
              broadcastEvent('DICE_ROLLED', parEntry);
              gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
              saveState();
              broadcastEvent('STATE_UPDATED', gameState);
              break;
            }

            // Verwirrung (33% Chance sich selbst zu verletzen)
            let confusionNotice = '';
            if (attacker.isConfused) {
              if (Math.random() < 0.33) {
                attacker.hasAttacked = true;
                const lvl = attacker.level || 50;
                const atk = attacker.atk || 50;
                const def = attacker.def || 50;
                const selfDmg = Math.max(1, Math.floor(((Math.floor((2 * lvl) / 5) + 2) * 40 * (atk / def)) / 50) + 2);
                attacker.currentHp = Math.max(0, attacker.currentHp - selfDmg);
                if (attacker.trainerId && attacker.pokemonUid) {
                  const attTrainer = gameState.trainers.find(t => t.id === attacker.trainerId);
                  const attPoke = attTrainer?.pokemon.find(p => p.uid === attacker.pokemonUid);
                  if (attPoke) attPoke.currentHp = attacker.currentHp;
                }
                const cnfLogEntry = {
                  time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  character: attacker.nickname,
                  sides: move.name_de,
                  roll: `🌀 ${attacker.nickname} ist verwirrt und verletzt sich vor Verwirrung selbst! (-${selfDmg} KP)`
                };
                gameState.diceHistory = gameState.diceHistory || [];
                gameState.diceHistory.unshift(cnfLogEntry);
                if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
                broadcastEvent('BATTLE_DAMAGE_APPLIED', {
                  hits: [{ tokenId: attacker.id, damage: selfDmg }],
                  attackerName: attacker.nickname,
                  moveName: 'Verwirrung'
                });
                broadcastEvent('DICE_ROLLED', cnfLogEntry);
                gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
                saveState();
                broadcastEvent('STATE_UPDATED', gameState);
                break;
              } else {
                confusionNotice = ' (🌀 verwirrt, griff dennoch an!)';
              }
            }

            // Deduct exactly 1 AP
            attacker.moveAps = attacker.moveAps || {};
            const maxPp = move.pp || 20;
            const curAp = (typeof attacker.moveAps[String(move.id)] === 'number') ? attacker.moveAps[String(move.id)] : maxPp;
            attacker.moveAps[String(move.id)] = Math.max(0, curAp - 1);
            if (attacker.trainerId && attacker.pokemonUid) {
              const attTrainer = gameState.trainers.find(t => t.id === attacker.trainerId);
              const attPoke = attTrainer?.pokemon?.find(p => p.uid === attacker.pokemonUid);
              if (attPoke) {
                attPoke.moveAps = attPoke.moveAps || {};
                attPoke.moveAps[String(move.id)] = attacker.moveAps[String(move.id)];
              }
            }

            const hits = [];
            const rollSummaries = [];

            targetIds.forEach(targetId => {
              const defender = gameState.battleState?.tokens?.find(t => t.id === targetId);
              if (defender) {
                // 1. Schutzschild Check (Wehrt jeglichen Schaden & Effekte ab!)
                if (defender.isProtected) {
                  hits.push({ tokenId: defender.id, damage: 0, isProtected: true, status: defender.status, isConfused: defender.isConfused });
                  rollSummaries.push(`${defender.nickname} (🛡️ Durch Schutzschild abgewehrt! 0 Schaden)`);
                  return;
                }

                // 2. Calculate authentic Pokémon damage
                const calc = calculatePokemonDamage(attacker, defender, move);
                let finalDmg = calc.damage;
                let endureText = '';

                // Verfehlt / Immun
                if (calc.isMissed) {
                  hits.push({ tokenId: defender.id, damage: 0, isMissed: true });
                  rollSummaries.push(`${defender.nickname}${calc.text}`);
                  return;
                }
                if (calc.isImmune) {
                  hits.push({ tokenId: defender.id, damage: 0, isImmune: true });
                  rollSummaries.push(`${defender.nickname}${calc.text}`);
                  return;
                }

                // 3. Ausdauer Check (Überlebt fatale Treffer mit mindestens 1 KP)
                if (defender.isEnduring && (defender.currentHp - finalDmg <= 0)) {
                  finalDmg = Math.max(0, defender.currentHp - 1);
                  endureText = ' (💪 Überlebt mit 1 KP dank Ausdauer!)';
                }

                defender.currentHp = Math.max(0, defender.currentHp - finalDmg);

                // Status-Effekt anwenden (bei Status-Attacken oder Treffern)
                const statusEff = calc.statusEffect || getStatusFromMove(move);
                let statusNotice = '';
                if (statusEff && defender.currentHp > 0) {
                  if (statusEff.isConfused) {
                    defender.isConfused = true;
                    defender.confusionTurns = statusEff.confusionTurns || 3;
                    statusNotice = ' [🌀 Verwirrt!]';
                  } else if (statusEff.status && (!defender.status || defender.status === 'none')) {
                    defender.status = statusEff.status;
                    if (statusEff.sleepTurns) defender.sleepTurns = statusEff.sleepTurns;
                    if (statusEff.statusTurns) defender.statusTurns = statusEff.statusTurns;
                    statusNotice = ` [${statusEff.label || 'Status-Effekt'}!]`;
                  }
                }

                // Frost auftauen bei Feuer-Treffer
                if (defender.status === 'freeze' && move.type_name === 'fire' && finalDmg > 0) {
                  defender.status = 'none';
                  statusNotice += ' [🔥 Aufgetaut!]';
                }

                // DEBUFF EFFEKT AUF ZIEL ANWENDEN!
                let debuffNotice = '';
                const debuff = calc.debuff || getDebuffFromMove(move);
                if (debuff && defender.currentHp > 0) {
                  const debuffRes = applyStatStageChange(defender, debuff.stat, debuff.delta, attacker.nickname, true);
                  if (debuffRes.message) {
                    debuffNotice = ` [${debuffRes.message}]`;
                  }
                }

                // BUFF EFFEKT AUF ANWENDER ANWENDEN
                const buff = calc.buff || getBuffFromMove(move);
                if (buff && buff.isSelf) {
                  const buffRes = applyStatStageChange(attacker, buff.stat, buff.delta, attacker.nickname, false);
                  if (buffRes.message) debuffNotice += ` [${buffRes.message}]`;
                  if (buff.secondaryStat) {
                    const buffRes2 = applyStatStageChange(attacker, buff.secondaryStat, buff.secondaryDelta, attacker.nickname, false);
                    if (buffRes2.message) debuffNotice += ` [${buffRes2.message}]`;
                  }
                }

                // KONTAKT-FÄHIGKEITEN BEI PHYSISCHEN TREFFERN (Statik, Flammkörper, Giftdorn)
                const isPhysical = (move.damage_class === 'physical' || move.damage_class_id === 2);
                const defAb = getPokemonAbilityName(defender);
                let contactNotice = '';
                if (isPhysical && finalDmg > 0 && defender.currentHp > 0 && (!attacker.status || attacker.status === 'none')) {
                  if (defAb === 'statik' && Math.random() < 0.30) {
                    attacker.status = 'paralysis';
                    contactNotice = ' [⚡ Statik: Angreifer paralysiert!]';
                  } else if (defAb === 'flammkörper' && Math.random() < 0.30) {
                    attacker.status = 'burn';
                    contactNotice = ' [🔥 Flammkörper: Angreifer verbrannt!]';
                  } else if (defAb === 'giftdorn' && Math.random() < 0.30) {
                    attacker.status = 'poison';
                    contactNotice = ' [🟣 Giftdorn: Angreifer vergiftet!]';
                  }
                }

                // Sync with trainer Pokémon if player-owned
                if (defender.trainerId && defender.pokemonUid) {
                  const defTrainer = gameState.trainers.find(t => t.id === defender.trainerId);
                  const defPoke = defTrainer?.pokemon.find(p => p.uid === defender.pokemonUid);
                  if (defPoke) {
                    defPoke.currentHp = defender.currentHp;
                    defPoke.status = defender.status;
                    defPoke.isConfused = defender.isConfused;
                    defPoke.statStages = defender.statStages;
                  }
                }
                if (attacker.trainerId && attacker.pokemonUid) {
                  const atkTr = gameState.trainers.find(t => t.id === attacker.trainerId);
                  const atkPk = atkTr?.pokemon?.find(p => p.uid === attacker.pokemonUid);
                  if (atkPk) {
                    atkPk.status = attacker.status;
                    atkPk.isConfused = attacker.isConfused;
                    atkPk.statStages = attacker.statStages;
                  }
                }

                hits.push({ tokenId: defender.id, damage: finalDmg, status: defender.status, isConfused: defender.isConfused, statStages: defender.statStages });
                rollSummaries.push(`${defender.nickname} (-${finalDmg} KP${calc.text})${endureText}${statusNotice}${debuffNotice}${contactNotice}`);

                // 4. Konter Check: Greift direkt an (Reichweite egal) mit 2× Schaden, sofern nicht besiegt!
                if (defender.isCountering && finalDmg > 0) {
                  if (defender.currentHp <= 0) {
                    defender.isCountering = false;
                    rollSummaries.push(`💥 ${defender.nickname} wurde besiegt und konnte keinen Konter mehr ausführen.`);
                  } else {
                    const counterDmg = finalDmg * 2;
                    attacker.currentHp = Math.max(0, attacker.currentHp - counterDmg);
                    defender.isCountering = false;
                    if (attacker.trainerId && attacker.pokemonUid) {
                      const atkTr = gameState.trainers.find(t => t.id === attacker.trainerId);
                      const atkPk = atkTr?.pokemon?.find(p => p.uid === attacker.pokemonUid);
                      if (atkPk) atkPk.currentHp = attacker.currentHp;
                    }
                    hits.push({ tokenId: attacker.id, damage: counterDmg, isCounter: true });
                    rollSummaries.push(`💥 KONTER! ${defender.nickname} kontert ${attacker.nickname} mit ${counterDmg} KP Schaden (2× ${finalDmg} KP)!`);
                    if (attacker.currentHp <= 0) {
                      rollSummaries.push(`💀 ${attacker.nickname} wurde durch den Konter besiegt!`);
                    }
                  }
                }
              }
            });

            attacker.hasAttacked = true;

            // Ruckzuckhieb und Erstschlag-Attacken geben die Bewegung zurück!
            const isPriority = isPriorityMove(move);
            let prioMsg = '';
            if (isPriority) {
              attacker.remainingMovement = Math.max(1, (attacker.maxMovement || 5) + (attacker.statStages?.spe || 0));
              prioMsg = ' ⚡ Erstschlag! Volle Bewegung zurückerhalten (Hit & Run)!';
            }

            const combatLogEntry = {
              time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              character: attacker.nickname,
              sides: move.name_de,
              roll: `⚔️ ${rollSummaries.join(', ')}${prioMsg}`
            };
            gameState.diceHistory = gameState.diceHistory || [];
            gameState.diceHistory.unshift(combatLogEntry);
            if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();

            saveState();
            broadcastEvent('BATTLE_DAMAGE_APPLIED', {
              hits: hits,
              attackerName: attacker.nickname,
              moveName: move.name_de,
              attackerId: attacker.id,
              remainingMovement: attacker.remainingMovement
            });
            broadcastEvent('DICE_ROLLED', combatLogEntry);
          }
        } else if (req.type === 'RECALL') {
          if (gameState.battleState && gameState.battleState.tokens) {
            const targetTokenId = req.tokenId || req.sourceTokenId;
            const targetPokeUid = req.pokemonUid || req.sourcePokemonUid;
            let naturalCureText = '';
            if (targetPokeUid) {
              gameState.trainers.forEach(tr => {
                const pk = tr.pokemon.find(p => p.uid === targetPokeUid);
                if (pk) {
                  pk.statStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
                  const ab = getPokemonAbilityName(pk);
                  if (ab === 'innere kraft' && pk.status && pk.status !== 'none') {
                    pk.status = 'none';
                    pk.isConfused = false;
                    naturalCureText = ' (🌿 Innere Kraft heilte alle Statusprobleme!)';
                  }
                }
              });
            }
            gameState.battleState.tokens = gameState.battleState.tokens.filter(t => {
              if (targetTokenId && t.id === targetTokenId) return false;
              if (targetPokeUid && t.pokemonUid === targetPokeUid) return false;
              return true;
            });
            saveState();
            broadcastEvent('BATTLE_TOKEN_REMOVED', { tokenId: targetTokenId, pokemonUid: targetPokeUid });
            const pName = req.pokemonName || req.sourceName || 'Pokémon';
            const recallEntry = {
              time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              character: req.trainerName || 'Trainer',
              sides: 'Pokéball',
              roll: `🔴 ${pName} wurde vom Feld in den Pokéball zurückgerufen!${naturalCureText}`
            };
            gameState.diceHistory = gameState.diceHistory || [];
            gameState.diceHistory.unshift(recallEntry);
            if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
            broadcastEvent('DICE_ROLLED', recallEntry);
          }
        } else if (req.type === 'END_TURN' || req.type === 'RESET_ROUND') {
          executeBattleRoundReset(req.trainerName || 'Spielleiter');
        }
      } else {
        // Declined by DM
        broadcastEvent('ACTION_REQUEST_REJECTED', {
          requestId: req.id,
          trainerId: req.trainerId,
          reason: payload.reason || 'Vom Spielleiter abgelehnt'
        });
        broadcastEvent('DICE_ROLLED', {
          trainerId: req.trainerId,
          trainerName: req.trainerName,
          text: `❌ Spielleiter hat Aktion von ${req.trainerName} (${req.type === 'MOVE' ? 'Bewegung' : 'Angriff'}) abgelehnt.`,
          timestamp: Date.now()
        });
      }

      gameState.pendingRequests = gameState.pendingRequests.filter(r => r.id !== req.id);
      saveState();
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    // --- ENEMY PRESETS (GEGNER-ORDNER) ---
    case 'CREATE_ENEMY_PRESET':
      gameState.enemyPresets = gameState.enemyPresets || [];
      const preset = {
        id: payload.preset.id || 'preset_' + Date.now(),
        ...payload.preset
      };
      gameState.enemyPresets.push(preset);
      saveState();
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'DELETE_ENEMY_PRESET':
      if (gameState.enemyPresets) {
        gameState.enemyPresets = gameState.enemyPresets.filter(p => p.id !== payload.presetId);
        saveState();
        broadcastEvent('STATE_UPDATED', gameState);
      }
      break;

    // --- HEALING & AP RESTORE (DM + TRAINER ITEMS) ---
    case 'HEAL_POKEMON':
      const healAmount = payload.amount || 0;
      const isFullHeal = payload.isFull || false;
      
      // 1. If tokenId specified, heal token on battlefield
      if (gameState.battleState && gameState.battleState.tokens && payload.tokenId) {
        const bToken = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        if (bToken) {
          bToken.currentHp = isFullHeal ? bToken.maxHp : Math.min(bToken.maxHp, bToken.currentHp + healAmount);
          if (isFullHeal) {
            bToken.moveAps = {};
          }
        }
      }

      // 2. If trainerId and pokemonUid specified, heal trainer pokemon
      if (payload.trainerId && payload.pokemonUid) {
        const hTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
        if (hTrainer) {
          const hPoke = hTrainer.pokemon.find(p => p.uid === payload.pokemonUid);
          if (hPoke) {
            hPoke.currentHp = isFullHeal ? hPoke.maxHp : Math.min(hPoke.maxHp, hPoke.currentHp + healAmount);
            if (isFullHeal) {
              hPoke.moveAps = {};
            }
            if (gameState.battleState && gameState.battleState.tokens) {
              const mapToken = gameState.battleState.tokens.find(t => t.pokemonUid === payload.pokemonUid);
              if (mapToken) {
                mapToken.currentHp = hPoke.currentHp;
                if (isFullHeal) mapToken.moveAps = {};
              }
            }
          }
        }
      }
      saveState();
      broadcastEvent('POKEMON_HEALED', payload);
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'RESTORE_AP':
      const restoreAll = payload.all || false;
      const restoreAmount = (typeof payload.amount === 'number') ? payload.amount : 10;

      function applyAp(targetObj) {
        if (!targetObj) return;
        targetObj.moveAps = targetObj.moveAps || {};
        if (restoreAll) {
          targetObj.moveAps = {};
          return;
        }
        if (typeof payload.moveId !== 'undefined') {
          const mid = String(payload.moveId);
          let maxPp = 20;
          if (Array.isArray(targetObj.moves)) {
            const m = targetObj.moves.find(mv => String(mv.id || mv.moveId) === mid);
            if (m && m.pp) maxPp = m.pp;
          }
          if (POKEDEX_DATA?.moves?.[mid]?.pp) {
            maxPp = POKEDEX_DATA.moves[mid].pp;
          }
          const cur = (typeof targetObj.moveAps[mid] === 'number') ? targetObj.moveAps[mid] : maxPp;
          targetObj.moveAps[mid] = Math.max(0, Math.min(maxPp, cur + restoreAmount));
        }
      }

      if (payload.trainerId && payload.pokemonUid) {
        const apTrainer = gameState.trainers.find(t => t.id === payload.trainerId);
        const apPoke = apTrainer?.pokemon?.find(p => p.uid === payload.pokemonUid);
        applyAp(apPoke);
        if (gameState.battleState?.tokens) {
          const mapToken = gameState.battleState.tokens.find(t => t.pokemonUid === payload.pokemonUid);
          applyAp(mapToken);
        }
      }
      if (gameState.battleState && gameState.battleState.tokens && payload.tokenId) {
        const apToken = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        applyAp(apToken);
        if (apToken && apToken.trainerId && apToken.pokemonUid) {
          const apTrainer = gameState.trainers.find(t => t.id === apToken.trainerId);
          const apPoke = apTrainer?.pokemon?.find(p => p.uid === apToken.pokemonUid);
          applyAp(apPoke);
        }
      }
      saveState();
      broadcastEvent('AP_RESTORED', payload);
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'SET_POKEMON_STATUS':
      if (gameState.battleState?.tokens && payload.tokenId) {
        const token = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        if (token) {
          if (payload.status !== undefined) {
            token.status = payload.status;
            if (payload.status === 'sleep') token.sleepTurns = payload.sleepTurns || 2;
            if (payload.status === 'toxic') token.statusTurns = 1;
          }
          if (payload.isConfused !== undefined) {
            token.isConfused = payload.isConfused;
            if (token.isConfused) token.confusionTurns = payload.confusionTurns || 3;
          }
          // Sync with trainer pokemon if player-owned
          if (token.trainerId && token.pokemonUid) {
            const tr = gameState.trainers.find(tr => tr.id === token.trainerId);
            const pk = tr?.pokemon.find(p => p.uid === token.pokemonUid);
            if (pk) {
              if (payload.status !== undefined) pk.status = token.status;
              if (payload.isConfused !== undefined) pk.isConfused = token.isConfused;
            }
          }
        }
      }
      if (payload.trainerId && payload.pokemonUid) {
        const tr = gameState.trainers.find(tr => tr.id === payload.trainerId);
        const pk = tr?.pokemon.find(p => p.uid === payload.pokemonUid);
        if (pk) {
          if (payload.status !== undefined) pk.status = payload.status;
          if (payload.isConfused !== undefined) pk.isConfused = payload.isConfused;
          const mapToken = gameState.battleState?.tokens?.find(t => t.pokemonUid === pk.uid);
          if (mapToken) {
            if (payload.status !== undefined) mapToken.status = pk.status;
            if (payload.isConfused !== undefined) mapToken.isConfused = pk.isConfused;
          }
        }
      }
      saveState();
      broadcastEvent('STATE_UPDATED', gameState);
      break;

    case 'BATTLE_APPLY_DAMAGE':
      if (gameState.battleState && gameState.battleState.tokens && payload.hits) {
        if (payload.attackerId && payload.remainingMovement !== undefined) {
          const atkToken = gameState.battleState.tokens.find(t => t.id === payload.attackerId);
          if (atkToken) {
            atkToken.remainingMovement = payload.remainingMovement;
          }
        }
        const counterLogs = [];
        payload.hits.forEach(hit => {
          const targetToken = gameState.battleState.tokens.find(t => t.id === hit.tokenId);
          if (targetToken) {
            if (targetToken.isProtected) {
              hit.damage = 0;
            } else {
              if (targetToken.isEnduring && (targetToken.currentHp - hit.damage <= 0)) {
                targetToken.currentHp = 1;
              } else {
                targetToken.currentHp = Math.max(0, targetToken.currentHp - hit.damage);
              }
              if (hit.status !== undefined) {
                targetToken.status = hit.status;
                if (hit.status === 'sleep') targetToken.sleepTurns = hit.sleepTurns || 2;
                if (hit.status === 'toxic') targetToken.statusTurns = 1;
              }
              if (hit.isConfused !== undefined) {
                targetToken.isConfused = hit.isConfused;
                if (targetToken.isConfused) targetToken.confusionTurns = hit.confusionTurns || 3;
              }

              // KONTER CHECK: Greift direkt an (Reichweite egal) mit 2× Schaden, sofern nicht besiegt!
              if (targetToken.isCountering && hit.damage > 0) {
                if (targetToken.currentHp <= 0) {
                  targetToken.isCountering = false;
                  counterLogs.push(`💥 ${targetToken.nickname} wurde besiegt und konnte keinen Konter mehr ausführen.`);
                } else if (payload.attackerId) {
                  const atkToken = gameState.battleState.tokens.find(t => t.id === payload.attackerId);
                  if (atkToken) {
                    const counterDmg = hit.damage * 2;
                    atkToken.currentHp = Math.max(0, atkToken.currentHp - counterDmg);
                    targetToken.isCountering = false;
                    if (atkToken.trainerId && atkToken.pokemonUid) {
                      const atkTr = gameState.trainers.find(t => t.id === atkToken.trainerId);
                      const atkPk = atkTr?.pokemon?.find(p => p.uid === atkToken.pokemonUid);
                      if (atkPk) atkPk.currentHp = atkToken.currentHp;
                    }
                    counterLogs.push(`💥 KONTER! ${targetToken.nickname} kontert ${atkToken.nickname} mit ${counterDmg} KP Schaden (2× ${hit.damage} KP)!`);
                    if (atkToken.currentHp <= 0) {
                      counterLogs.push(`💀 ${atkToken.nickname} wurde durch den Konter besiegt!`);
                    }
                  }
                }
              }
              if (hit.statStages !== undefined) {
                targetToken.statStages = hit.statStages;
              } else if (hit.debuff) {
                applyStatStageChange(targetToken, hit.debuff.stat, hit.debuff.delta, payload.attackerName || '', true);
              }
            }
            if (targetToken.trainerId && targetToken.pokemonUid) {
              const tTrainer = gameState.trainers.find(t => t.id === targetToken.trainerId);
              const tPoke = tTrainer?.pokemon.find(p => p.uid === targetToken.pokemonUid);
              if (tPoke) {
                tPoke.currentHp = targetToken.currentHp;
                if (!targetToken.isProtected) {
                  if (hit.status !== undefined) tPoke.status = targetToken.status;
                  if (hit.isConfused !== undefined) tPoke.isConfused = targetToken.isConfused;
                  if (targetToken.statStages) tPoke.statStages = targetToken.statStages;
                }
              }
            }
          }
        });
        if (counterLogs.length > 0) {
          const counterLogEntry = {
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            character: 'Konter-Reaktion',
            sides: 'Konter (2× Schaden)',
            roll: counterLogs.join(' ')
          };
          gameState.diceHistory = gameState.diceHistory || [];
          gameState.diceHistory.unshift(counterLogEntry);
          if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();
          broadcastEvent('DICE_ROLLED', counterLogEntry);
        }
        saveState();
        broadcastEvent('BATTLE_DAMAGE_APPLIED', payload);
        broadcastEvent('STATE_UPDATED', gameState);
      }
      break;

    case 'BATTLE_ACTIVATE_SELF_BUFF':
      if (gameState.battleState && gameState.battleState.tokens && payload.tokenId) {
        const token = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        if (token) {
          const currentTurn = gameState.battleState.turnNumber || 1;
          const move = token.moves?.find(m => String(m.id) === String(payload.moveId)) || POKEDEX_DATA?.moves?.[String(payload.moveId)] || {};
          const isProtect = payload.buffType === 'protect' || isProtectMove(move);
          const isEndure = payload.buffType === 'endure' || isEndureMove(move);
          const isCounter = payload.buffType === 'counter' || isCounterMove(move);
          const moveName = move.name_de || (isProtect ? 'Schutzschild' : (isCounter ? 'Konter' : 'Ausdauer'));

          // Deduct 1 AP
          token.moveAps = token.moveAps || {};
          const maxPp = move.pp || (isCounter ? 20 : 10);
          const curAp = (typeof token.moveAps[String(payload.moveId)] === 'number') ? token.moveAps[String(payload.moveId)] : maxPp;
          token.moveAps[String(payload.moveId)] = Math.max(0, curAp - 1);
          if (token.trainerId && token.pokemonUid) {
            const attTr = gameState.trainers.find(tr => tr.id === token.trainerId);
            const attPk = attTr?.pokemon?.find(p => p.uid === token.pokemonUid);
            if (attPk) {
              attPk.moveAps = attPk.moveAps || {};
              attPk.moveAps[String(payload.moveId)] = token.moveAps[String(payload.moveId)];
            }
          }

          token.hasAttacked = true;

          let logText = '';
          let movementBonusMsg = '';
          if (isProtect) {
            token.isProtected = true;
            token.lastProtectRound = currentTurn;
            logText = `🛡️ ${token.nickname} aktiviert Schutzschild! Wehrt alle Treffer in dieser Runde vollständig ab!`;
            token.remainingMovement = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
            movementBonusMsg = ' ⚡ Volle Bewegung zurückerhalten (Hit & Run)!';
          } else if (isEndure) {
            token.isEnduring = true;
            logText = `💪 ${token.nickname} aktiviert Ausdauer! Übersteht fatale Treffer in dieser Runde mit mindestens 1 KP!`;
            token.remainingMovement = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
            movementBonusMsg = ' ⚡ Volle Bewegung zurückerhalten (Hit & Run)!';
          } else if (isCounter) {
            token.isCountering = true;
            logText = `⚔️ ${token.nickname} geht in Konter-Stellung! Greift den nächsten Angreifer automatisch mit 2× Schaden an!`;
          }

          const buffLogEntry = {
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            character: token.nickname,
            sides: moveName,
            roll: `${logText}${movementBonusMsg}`
          };
          gameState.diceHistory = gameState.diceHistory || [];
          gameState.diceHistory.unshift(buffLogEntry);
          if (gameState.diceHistory.length > 50) gameState.diceHistory.pop();

          saveState();
          broadcastEvent('DICE_ROLLED', buffLogEntry);
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'SET_POKEMON_ABILITY':
      if (payload.trainerId && payload.pokemonUid && payload.ability) {
        const tr = gameState.trainers.find(t => t.id === payload.trainerId);
        const pk = tr?.pokemon?.find(p => p.uid === payload.pokemonUid);
        if (pk) {
          pk.ability = payload.ability;
          if (gameState.battleState?.tokens) {
            const tok = gameState.battleState.tokens.find(t => t.pokemonUid === pk.uid);
            if (tok) tok.ability = payload.ability;
          }
          saveState();
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'SET_TOKEN_STAT_STAGE':
      if (gameState.battleState?.tokens && payload.tokenId && payload.stat) {
        const tok = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        if (tok) {
          tok.statStages = tok.statStages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
          if (typeof payload.stage === 'number') {
            tok.statStages[payload.stat] = Math.max(-6, Math.min(6, payload.stage));
          } else if (typeof payload.delta === 'number') {
            tok.statStages[payload.stat] = Math.max(-6, Math.min(6, (tok.statStages[payload.stat] || 0) + payload.delta));
          }
          if (tok.trainerId && tok.pokemonUid) {
            const tr = gameState.trainers.find(t => t.id === tok.trainerId);
            const pk = tr?.pokemon?.find(p => p.uid === tok.pokemonUid);
            if (pk) pk.statStages = tok.statStages;
          }
          saveState();
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    case 'RESET_TOKEN_STAT_STAGES':
      if (gameState.battleState?.tokens && payload.tokenId) {
        const tok = gameState.battleState.tokens.find(t => t.id === payload.tokenId);
        if (tok) {
          tok.statStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
          if (tok.trainerId && tok.pokemonUid) {
            const tr = gameState.trainers.find(t => t.id === tok.trainerId);
            const pk = tr?.pokemon?.find(p => p.uid === tok.pokemonUid);
            if (pk) pk.statStages = tok.statStages;
          }
          saveState();
          broadcastEvent('STATE_UPDATED', gameState);
        }
      }
      break;

    default:
      console.warn('[Server] Unbekannter Action-Typ:', type);
  }
}

// --- START SERVER ---
const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log('================================================================');
    console.log('  Pokémon Pen & Paper - Live Server (DM & Trainer Sync)');
    console.log('================================================================');
    console.log(`  Lokale Verbindung:        http://localhost:${PORT}`);
    console.log(`  Netzwerk / Spieler (WLAN): http://${localIp}:${PORT}`);
    console.log(`  🎮 DM-Screen (Spielleiter): http://${localIp}:${PORT}/dm.html`);
    console.log(`  📱 Trainer-App (Spieler):  http://${localIp}:${PORT}/trainer.html`);
    console.log(`  📥 Download & QR-Hub:     http://${localIp}:${PORT}/download.html`);
    console.log('================================================================');
  });
}

module.exports = handleRequest;
