/**
 * Pokémon Pen & Paper - Trainer App (Spieler-Client)
 * Mobile-First Web-App & PWA mit Live-Echtzeit-Synchronisation zum DM Screen.
 * Team-Verwaltung, KP-Tracker, Level-Up mit Attacken-Management (4 Attacken Regel),
 * Attributspunkte-Verteilung, 12 Fertigkeitsproben mit Wesen-Boni und Rucksack.
 */

(function () {
  'use strict';

  let ALL_POKEMON = [];
  let ALL_MOVES = {};
  let ALL_TYPES = {};
  let ALL_NATURES = [];
  let ALL_EVOLUTIONS = {};
  let ALL_ITEMS = [];

  // --- 6 P&P ATTRIBUTE CONFIG ---
  const ATTR_CONFIG = [
    { key: 'hp', code: 'KON', name_de: 'Konstitution', source: 'KP', color: '#10b981', maxBench: 255 },
    { key: 'atk', code: 'STÄ', name_de: 'Stärke', source: 'Angriff', color: '#ef4444', maxBench: 190 },
    { key: 'def', code: 'WEI', name_de: 'Weisheit', source: 'Verteidigung', color: '#f59e0b', maxBench: 230 },
    { key: 'spa', code: 'CHA', name_de: 'Charisma', source: 'Sp.-Angriff', color: '#3b82f6', maxBench: 194 },
    { key: 'spd', code: 'INT', name_de: 'Intelligenz', source: 'Sp.-Vert.', color: '#8b5cf6', maxBench: 230 },
    { key: 'spe', code: 'GES', name_de: 'Geschicklichkeit', source: 'Initiative', color: '#06b6d4', maxBench: 180 }
  ];

  // --- 12 P&P FERTIGKEITEN (SKILLS) ---
  const PNP_SKILLS = [
    { id: 'athletics', name: 'Athletik', attrKey: 'atk', attrCode: 'STÄ', desc: 'Klettern, Schwimmen, Kraftakte' },
    { id: 'acrobatics', name: 'Akrobatik', attrKey: 'spe', attrCode: 'GES', desc: 'Balancieren, Ausweichen, Stürze abfangen' },
    { id: 'stealth', name: 'Schleichen', attrKey: 'spe', attrCode: 'GES', desc: 'Anschleichen, im Dickicht verbergen' },
    { id: 'sleight', name: 'Fingerfertigkeit', attrKey: 'spe', attrCode: 'GES', desc: 'Beeren pflücken, Items stibitzen' },
    { id: 'endurance', name: 'Zähigkeit', attrKey: 'hp', attrCode: 'KON', desc: 'Gewaltmärsche, Giften trotzen, Wetter' },
    { id: 'investigation', name: 'Nachforschungen', attrKey: 'spd', attrCode: 'INT', desc: 'Spuren analysieren, Ruinen untersuchen' },
    { id: 'nature', name: 'Naturkunde', attrKey: 'spd', attrCode: 'INT', desc: 'Wetter vorhersehen, Beeren/Pflanzen' },
    { id: 'perception', name: 'Wahrnehmung', attrKey: 'def', attrCode: 'WEI', desc: 'Geräusche lauschen, Feinde wittern' },
    { id: 'survival', name: 'Überlebenskunst', attrKey: 'def', attrCode: 'WEI', desc: 'Nahrung finden, Fährten lesen, Rast' },
    { id: 'intimidation', name: 'Einschüchtern', attrKey: 'spa', attrCode: 'CHA', desc: 'Drohgebärden, Brüllen, Flucht' },
    { id: 'deception', name: 'Täuschung', attrKey: 'spa', attrCode: 'CHA', desc: 'Antäuschen, Ablenken, Schwindeln' },
    { id: 'persuasion', name: 'Überzeugen', attrKey: 'spa', attrCode: 'CHA', desc: 'Pokémon besänftigen, Vertrauen aufbauen' }
  ];

  // --- 25 WESEN MIT SKILL-MODS (+3, +2, +1, -1, -2, -3) ---
  const NATURE_SKILL_MODS = {
    'Frech': { acrobatics: 3, athletics: 2, deception: 1, persuasion: -1, perception: -2, investigation: -3 },
    'Hart': { athletics: 3, intimidation: 2, endurance: 1, deception: -1, persuasion: -2, investigation: -3 },
    'Mutig': { intimidation: 3, athletics: 2, endurance: 1, stealth: -1, sleight: -2, acrobatics: -3 },
    'Solo': { survival: 3, athletics: 2, intimidation: 1, endurance: -1, persuasion: -2, perception: -3 },
    'Kühn': { perception: 3, endurance: 2, survival: 1, athletics: -1, intimidation: -2, deception: -3 },
    'Locker': { endurance: 3, persuasion: 2, perception: 1, acrobatics: -1, stealth: -2, sleight: -3 },
    'Pfiffig': { deception: 3, endurance: 2, perception: 1, investigation: -1, persuasion: -2, nature: -3 },
    'Lasch': { endurance: 3, athletics: 2, perception: 1, investigation: -1, stealth: -2, nature: -3 },
    'Mäßig': { investigation: 3, nature: 2, persuasion: 1, athletics: -1, intimidation: -2, acrobatics: -3 },
    'Mild': { persuasion: 3, investigation: 2, nature: 1, endurance: -1, athletics: -2, intimidation: -3 },
    'Ruhig': { investigation: 3, perception: 2, nature: 1, acrobatics: -1, sleight: -2, stealth: -3 },
    'Hitzig': { intimidation: 3, athletics: 2, deception: 1, perception: -1, investigation: -2, persuasion: -3 },
    'Still': { survival: 3, perception: 2, persuasion: 1, athletics: -1, intimidation: -2, deception: -3 },
    'Zart': { persuasion: 3, perception: 2, nature: 1, endurance: -1, athletics: -2, intimidation: -3 },
    'Forsch': { intimidation: 3, deception: 2, survival: 1, acrobatics: -1, stealth: -2, sleight: -3 },
    'Sacht': { perception: 3, stealth: 2, survival: 1, intimidation: -1, deception: -2, persuasion: -3 },
    'Scheu': { stealth: 3, acrobatics: 2, perception: 1, intimidation: -1, athletics: -2, deception: -3 },
    'Hastig': { acrobatics: 3, sleight: 2, stealth: 1, endurance: -1, perception: -2, survival: -3 },
    'Froh': { acrobatics: 3, persuasion: 2, athletics: 1, investigation: -1, intimidation: -2, deception: -3 },
    'Naiv': { acrobatics: 3, deception: 2, stealth: 1, investigation: -1, perception: -2, nature: -3 },
    'Robust': { endurance: 2, athletics: 1, perception: 1, deception: -1, stealth: -1, sleight: -2 },
    'Sanft': { persuasion: 2, perception: 1, nature: 1, intimidation: -1, deception: -1, athletics: -2 },
    'Ernst': { investigation: 2, perception: 1, endurance: 1, deception: -1, acrobatics: -1, persuasion: -2 },
    'Kauzig': { stealth: 2, nature: 1, survival: 1, intimidation: -1, persuasion: -1, deception: -2 },
    'Zaghaft': { deception: 2, sleight: 1, acrobatics: 1, endurance: -1, intimidation: -1, investigation: -2 }
  };

  // --- ATTRIBUTS-WÜRFELBONUS FORMEL (USER-VORGABE) ---
  // Bis Wert 70 in 7er-Schritten (35 = +5, 63 = +9, 70 = +10).
  // Über 70 in 10er-Schritten (100 = +13, 170 = +20, 260 = +29).
  function getAttributeBonus(stat) {
    const val = Math.max(0, Number(stat) || 0);
    if (val <= 70) {
      return Math.floor(val / 7);
    } else {
      return 10 + Math.floor((val - 70) / 10);
    }
  }

  // Power Display Helper
  function getMovePowerDisplay(m) {
    if (!m) return '-';
    const mid = Number(m.id);
    if (mid === 68 || (m.name_de || '').includes('Konter')) return '2× Schaden';
    if (mid === 82 || (m.name_de || '').includes('Drachenwut')) return '40 Fix';
    if (mid === 49 || (m.name_de || '').includes('Ultraschall') || (m.name_de || '').includes('Schallwelle') && (!m.power || m.power === 20) || (m.name_en || '').includes('Sonic')) return '20 Fix';
    if (mid === 69 || mid === 101) return 'Level-Fix';
    if (mid === 162) return '50% KP';
    if (m.fixed_damage) return `${m.fixed_damage} Fix`;
    const debuff = getDebuffFromMove(m);
    if (debuff) return debuff.label;
    const buff = getBuffFromMove(m);
    if (buff) return buff.label;
    return m.power ? String(m.power) : '-';
  }

  // --- STAT-BERECHNUNG FÜR LV. L ---
  function calculateStat(base, statKey, level, iv, ev, natureName) {
    if (statKey === 'hp') {
      if (base === 1) return 1;
      return Math.floor(0.01 * (2 * base + iv + Math.floor(ev / 4)) * level) + level + 10;
    }
    const nature = ALL_NATURES.find(n => n.name_de === natureName);
    let multiplier = 1.0;
    if (nature) {
      if (nature.up === statKey && nature.down !== statKey) multiplier = 1.1;
      else if (nature.down === statKey && nature.up !== statKey) multiplier = 0.9;
    }
    const rawStat = Math.floor(0.01 * (2 * base + iv + Math.floor(ev / 4)) * level) + 5;
    return Math.floor(rawStat * multiplier);
  }

  // --- AUTHENTIC TYPE COLORS & STATUS HELPERS ---
  const TYPE_COLORS = {
    normal: '#A8A878',
    fighting: '#C03028', kampf: '#C03028',
    flying: '#A890F0', flug: '#A890F0',
    poison: '#A040A0', gift: '#A040A0',
    ground: '#E0C068', boden: '#E0C068',
    rock: '#B8A038', gestein: '#B8A038',
    bug: '#A8B820', 'käfer': '#A8B820', kaefer: '#A8B820',
    ghost: '#705898', geist: '#705898',
    steel: '#B8B8D0', stahl: '#B8B8D0',
    fire: '#F08030', feuer: '#F08030',
    water: '#6890F0', wasser: '#6890F0',
    grass: '#78C850', pflanze: '#78C850',
    electric: '#F8D030', elektro: '#F8D030',
    psychic: '#F85888', psycho: '#F85888',
    ice: '#98D8D8', eis: '#98D8D8',
    dragon: '#7038F8', drache: '#7038F8',
    dark: '#705848', unlicht: '#705848',
    fairy: '#EE99AC', fee: '#EE99AC'
  };

  function getTypeColor(typeName) {
    if (!typeName) return '#6b7280';
    const key = String(typeName).toLowerCase();
    return TYPE_COLORS[key] || '#6b7280';
  }

  function getTypeBadgeHtml(typeName, typeDe) {
    const color = getTypeColor(typeName);
    const name = typeDe || typeName || 'Normal';
    const isLight = (['electric', 'elektro', 'ice', 'eis', 'steel', 'stahl', 'fairy', 'fee'].includes(String(typeName).toLowerCase()));
    const textColor = isLight ? '#1e293b' : '#ffffff';
    return `<span class="type-badge type-${typeName}" style="background-color:${color} !important; color:${textColor} !important; padding:0.12rem 0.45rem; font-size:0.65rem;">${name}</span>`;
  }

  function isProtectMove(move) {
    if (!move) return false;
    const mid = Number(move.id);
    if (mid === 182 || mid === 197) return true;
    const name = (move.name_de || '').toLowerCase();
    return name.includes('schutzschild') || name.includes('scanner');
  }

  function isEndureMove(move) {
    if (!move) return false;
    const mid = Number(move.id);
    if (mid === 203) return true;
    const name = (move.name_de || '').toLowerCase();
    return name.includes('ausdauer');
  }

  function isCounterMove(move) {
    if (!move) return false;
    const mid = Number(move.id);
    if (mid === 68) return true;
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

  function getPokemonDefaultAbility(pokemonId) {
    if (!pokemonId || !ALL_POKEMON) return null;
    const pData = ALL_POKEMON.find(p => p.id === pokemonId);
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

    // Fallback:
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

  function getStatusDisplayBadge(entity) {
    if (!entity) return '';
    const badges = [];
    if (entity.isProtected) badges.push('<span class="status-badge" style="background:rgba(16,185,129,0.25); color:#34d399; border:1px solid #10b981;">🛡️ SCHUTZ</span>');
    if (entity.isEnduring) badges.push('<span class="status-badge" style="background:rgba(245,158,11,0.25); color:#fbbf24; border:1px solid #f59e0b;">💪 AUSDAUER</span>');
    if (entity.isCountering) badges.push('<span class="status-badge" style="background:rgba(239,68,68,0.25); color:#fca5a5; border:1px solid #ef4444;">⚔️ KONTER</span>');
    if (entity.status === 'burn') badges.push('<span class="status-badge status-badge-brn">🔥 BRN</span>');
    else if (entity.status === 'poison') badges.push('<span class="status-badge status-badge-psn">🟣 PSN</span>');
    else if (entity.status === 'toxic') badges.push('<span class="status-badge status-badge-psn">☠️ TOX</span>');
    else if (entity.status === 'paralysis') badges.push('<span class="status-badge status-badge-par">⚡ PAR</span>');
    else if (entity.status === 'sleep') badges.push('<span class="status-badge status-badge-slp">💤 SLP</span>');
    else if (entity.status === 'freeze') badges.push('<span class="status-badge status-badge-frz">❄️ FRZ</span>');

    if (entity.isConfused) badges.push('<span class="status-badge status-badge-cnf">🌀 VERWIRRT</span>');

    if (entity.statStages) {
      const statLabels = { atk: 'Ang', def: 'Vert', spa: 'SpA', spd: 'SpV', spe: 'Init', acc: 'Gen' };
      Object.entries(entity.statStages).forEach(([stat, stage]) => {
        if (stage !== 0 && statLabels[stat]) {
          const isDebuff = stage < 0;
          const cls = isDebuff ? 'stat-badge-debuff' : 'stat-badge-buff';
          const sign = stage > 0 ? `+${stage}` : `${stage}`;
          badges.push(`<span class="status-badge ${cls}">${statLabels[stat]} ${sign}</span>`);
        }
      });
    }

    if (badges.length === 0) return '';
    return badges.join(' ');
  }

  function renderTokenStatusIconsHtml(token) {
    if (!token) return '';
    const icons = [];
    if (token.isProtected) icons.push('<span class="token-status-icon" style="background:rgba(16,185,129,0.4); border:1px solid #10b981;" title="Schutzschild aktiv">🛡️</span>');
    if (token.isEnduring) icons.push('<span class="token-status-icon" style="background:rgba(245,158,11,0.4); border:1px solid #f59e0b;" title="Ausdauer aktiv">💪</span>');
    if (token.isCountering) icons.push('<span class="token-status-icon" style="background:rgba(239,68,68,0.4); border:1px solid #ef4444;" title="Konter aktiv">⚔️</span>');
    if (token.status === 'burn') icons.push('<span class="token-status-icon status-badge-brn" title="Verbrennung">🔥</span>');
    else if (token.status === 'poison') icons.push('<span class="token-status-icon status-badge-psn" title="Vergiftung">🟣</span>');
    else if (token.status === 'toxic') icons.push('<span class="token-status-icon status-badge-psn" title="Schwere Vergiftung">☠️</span>');
    else if (token.status === 'paralysis') icons.push('<span class="token-status-icon status-badge-par" title="Paralyse">⚡</span>');
    else if (token.status === 'sleep') icons.push('<span class="token-status-icon status-badge-slp" title="Schlaf">💤</span>');
    else if (token.status === 'freeze') icons.push('<span class="token-status-icon status-badge-frz" title="Frost">❄️</span>');

    if (token.isConfused) icons.push('<span class="token-status-icon status-badge-cnf" title="Verwirrt">🌀</span>');

    if (token.statStages) {
      const statLabels = { atk: 'Ang', def: 'Vert', spa: 'SpA', spd: 'SpV', spe: 'Init', acc: 'Gen' };
      Object.entries(token.statStages).forEach(([stat, stage]) => {
        if (stage !== 0 && statLabels[stat]) {
          const isDebuff = stage < 0;
          const cls = isDebuff ? 'stat-badge-debuff' : 'stat-badge-buff';
          const sign = stage > 0 ? `+${stage}` : `${stage}`;
          icons.push(`<span class="token-status-icon ${cls}" style="font-size:0.58rem; padding:0 3px; font-weight:800; border-radius:3px;" title="${statLabels[stat]} ${sign}">${statLabels[stat]}${sign}</span>`);
        }
      });
    }

    if (icons.length === 0) return '';
    return `<div class="token-status-badges">${icons.join('')}</div>`;
  }

  function renderTypeWeaknessesHtml(pData) {
    if (!pData || !pData.effectiveness) return '';
    const eff = pData.effectiveness || {};
    
    const weaknesses = [];
    const resistances = [];
    const immunities = [];

    const typeEntries = (ALL_TYPES && Object.keys(ALL_TYPES).length > 0) ? ALL_TYPES : {
      normal: { name_de: 'Normal', color: '#A8A878', identifier: 'normal' },
      fighting: { name_de: 'Kampf', color: '#C03028', identifier: 'fighting' },
      flying: { name_de: 'Flug', color: '#A890F0', identifier: 'flying' },
      poison: { name_de: 'Gift', color: '#A040A0', identifier: 'poison' },
      ground: { name_de: 'Boden', color: '#E0C068', identifier: 'ground' },
      rock: { name_de: 'Gestein', color: '#B8A038', identifier: 'rock' },
      bug: { name_de: 'Käfer', color: '#A8B820', identifier: 'bug' },
      ghost: { name_de: 'Geist', color: '#705898', identifier: 'ghost' },
      steel: { name_de: 'Stahl', color: '#B8B8D0', identifier: 'steel' },
      fire: { name_de: 'Feuer', color: '#F08030', identifier: 'fire' },
      water: { name_de: 'Wasser', color: '#6890F0', identifier: 'water' },
      grass: { name_de: 'Pflanze', color: '#78C850', identifier: 'grass' },
      electric: { name_de: 'Elektro', color: '#F8D030', identifier: 'electric' },
      psychic: { name_de: 'Psycho', color: '#F85888', identifier: 'psychic' },
      ice: { name_de: 'Eis', color: '#98D8D8', identifier: 'ice' },
      dragon: { name_de: 'Drache', color: '#7038F8', identifier: 'dragon' },
      dark: { name_de: 'Unlicht', color: '#705848', identifier: 'dark' },
      fairy: { name_de: 'Fee', color: '#EE99AC', identifier: 'fairy' }
    };

    Object.entries(eff).forEach(([typeKey, mult]) => {
      let tObj = typeEntries[typeKey];
      if (!tObj) {
        tObj = Object.values(typeEntries).find(t => t.identifier === typeKey) || { name_de: typeKey, color: getTypeColor(typeKey), identifier: typeKey };
      }
      if (mult > 1) {
        weaknesses.push({ ...tObj, mult });
      } else if (mult === 0) {
        immunities.push({ ...tObj, mult });
      } else if (mult < 1) {
        resistances.push({ ...tObj, mult });
      }
    });

    weaknesses.sort((a, b) => b.mult - a.mult);
    resistances.sort((a, b) => a.mult - b.mult);

    const formatItem = (t, mult) => {
      let multStr = `${mult}×`;
      let badgeClass = 'mult-2x';
      if (mult === 4) { badgeClass = 'mult-4x'; multStr = '4×'; }
      else if (mult === 0.5) { badgeClass = 'mult-half'; multStr = '½×'; }
      else if (mult === 0.25) { badgeClass = 'mult-quarter'; multStr = '¼×'; }
      else if (mult === 0) { badgeClass = 'mult-zero'; multStr = '0×'; }

      return `
        <span class="matchup-item" style="border-left: 3px solid ${t.color}; padding:0.15rem 0.4rem;">
          <span class="type-badge type-${t.identifier}" style="background-color:${t.color} !important; font-size:0.6rem; padding:0.08rem 0.35rem; color:#fff;">${t.name_de}</span>
          <span class="matchup-multiplier ${badgeClass}" style="font-size:0.65rem;">${multStr}</span>
        </span>
      `;
    };

    return `
      <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:6px; padding:0.5rem; margin-top:0.75rem; margin-bottom:0.75rem;">
        <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem; display:flex; justify-content:space-between; align-items:center;">
          <span>🛡️ Typ-Effektivität (Schwächen &amp; Resistenzen):</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.35rem; font-size:0.7rem;">
          ${weaknesses.length > 0 ? `
            <div>
              <span style="font-weight:800; color:#f87171; display:inline-block; min-width:80px;">🔴 Schwächen:</span>
              <div style="display:inline-flex; flex-wrap:wrap; gap:0.25rem; margin-top:0.15rem;">
                ${weaknesses.map(t => formatItem(t, t.mult)).join('')}
              </div>
            </div>
          ` : '<div><span style="font-weight:800; color:#10b981;">🔴 Schwächen:</span> <span style="color:var(--text-muted);">Keine</span></div>'}

          ${resistances.length > 0 ? `
            <div>
              <span style="font-weight:800; color:#34d399; display:inline-block; min-width:80px;">🟢 Resistenzen:</span>
              <div style="display:inline-flex; flex-wrap:wrap; gap:0.25rem; margin-top:0.15rem;">
                ${resistances.map(t => formatItem(t, t.mult)).join('')}
              </div>
            </div>
          ` : ''}

          ${immunities.length > 0 ? `
            <div>
              <span style="font-weight:800; color:#9ca3af; display:inline-block; min-width:80px;">⚫ Immun:</span>
              <div style="display:inline-flex; flex-wrap:wrap; gap:0.25rem; margin-top:0.15rem;">
                ${immunities.map(t => formatItem(t, 0)).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function getMoveEffectivenessAgainstTarget(move, targetToken) {
    if (!move || !targetToken) return { mult: 1, text: '', badgeClass: '' };
    const targetPData = ALL_POKEMON.find(p => p.id === targetToken.pokemonId);
    const eff = targetPData?.effectiveness || {};
    const mult = (eff[move.type_name] !== undefined) ? eff[move.type_name] : 1.0;
    
    if (mult === 0) return { mult: 0, text: '0× Immun', badgeClass: 'mult-zero' };
    if (mult >= 4.0) return { mult: 4, text: '4× Extrem!', badgeClass: 'mult-4x' };
    if (mult >= 2.0) return { mult: 2, text: '2× Sehr effektiv!', badgeClass: 'mult-2x' };
    if (mult <= 0.25) return { mult: 0.25, text: '¼× Kaum Schaden', badgeClass: 'mult-quarter' };
    if (mult <= 0.5) return { mult: 0.5, text: '½× Nicht effektiv', badgeClass: 'mult-half' };
    return { mult: 1, text: '1× Normal', badgeClass: '' };
  }

  function getMoveAp(token, move) {
    if (!token || !move) return 0;
    const basePp = move.pp || 20;
    const currentAp = (token.moveAps && typeof token.moveAps[String(move.id)] === 'number')
      ? token.moveAps[String(move.id)]
      : basePp;
    return Math.max(0, currentAp);
  }

  // --- STATE ---
  const state = {
    activeTab: 'team',
    activeTrainerId: null,
    trainers: [],
    recentRolls: [],
    theme: localStorage.getItem('pnp_theme') || 'dark',
    // Battle Map state
    battleState: { active: true, gridWidth: 20, gridHeight: 14, tokens: [] },
    selectedBattleTokenId: null,
    selectedBattleMoveIndex: null,
    coneDirection: 'N',
    // Item Heal modal state
    activeHealItem: null,
    activeHealCatalogItem: null,
    // Move Learn modal state
    pendingLearnQueue: [], // array of { trainerId, pokemonUid, moveId }
    activeLearnContext: null,
    selectedMoveToForget: null,
    // Manage moves modal state
    activeManagePoke: null
  };

  // --- DOM ELEMENTS ---
  const elements = {
    trainerLivePill: document.getElementById('trainerLivePill'),
    trainerLiveText: document.getElementById('trainerLiveText'),
    trainerSelectDropdown: document.getElementById('trainerSelectDropdown'),
    trainerThemeToggleBtn: document.getElementById('trainerThemeToggleBtn'),
    btnSwitchTrainerModal: document.getElementById('btnSwitchTrainerModal'),
    trainerSelectModal: document.getElementById('trainerSelectModal'),
    trainerSelectModalList: document.getElementById('trainerSelectModalList'),
    trainerSelectModalCloseBtn: document.getElementById('trainerSelectModalCloseBtn'),

    // Views
    trainerTabTeam: document.getElementById('trainerTabTeam'),
    trainerTabBattle: document.getElementById('trainerTabBattle'),
    trainerTabBackpack: document.getElementById('trainerTabBackpack'),
    trainerTabDice: document.getElementById('trainerTabDice'),
    trainerTabPokedex: document.getElementById('trainerTabPokedex'),
    bottomNavItems: document.querySelectorAll('.bottom-nav-item'),

    // Team Tab
    activeTrainerNameDisplay: document.getElementById('activeTrainerNameDisplay'),
    activeTrainerRoleDisplay: document.getElementById('activeTrainerRoleDisplay'),
    teamCountPill: document.getElementById('teamCountPill'),
    trainerPokemonList: document.getElementById('trainerPokemonList'),

    // Battle Map Tab
    trainerRoundNumber: document.getElementById('trainerRoundNumber'),
    btnTrainerEndTurn: document.getElementById('btnTrainerEndTurn'),
    trainerBattleTokensBadge: document.getElementById('trainerBattleTokensBadge'),
    trainerBattleGrid: document.getElementById('trainerBattleGrid'),
    trainerSelectedTokenBox: document.getElementById('trainerSelectedTokenBox'),
    trainerSelectedTokenContent: document.getElementById('trainerSelectedTokenContent'),

    // Backpack Tab
    trainerInventoryGrid: document.getElementById('trainerInventoryGrid'),

    // Heal Target Modal
    healTargetModal: document.getElementById('healTargetModal'),
    healTargetCloseBtn: document.getElementById('healTargetCloseBtn'),
    healItemNameDisplay: document.getElementById('healItemNameDisplay'),
    healTeamMembersList: document.getElementById('healTeamMembersList'),

    // Dice Tab
    playerDiceResult: document.getElementById('playerDiceResult'),
    playerDiceLabel: document.getElementById('playerDiceLabel'),
    playerDiceModifier: document.getElementById('playerDiceModifier'),
    playerDiceButtons: document.querySelectorAll('.player-dice-btn'),
    playerRollsHistory: document.getElementById('playerRollsHistory'),

    // Pokedex Tab
    trainerPokedexSearch: document.getElementById('trainerPokedexSearch'),
    trainerPokedexGrid: document.getElementById('trainerPokedexGrid'),

    // Move Learn Modal
    moveLearnModal: document.getElementById('moveLearnModal'),
    moveLearnCloseBtn: document.getElementById('moveLearnCloseBtn'),
    moveLearnPokeSprite: document.getElementById('moveLearnPokeSprite'),
    moveLearnPokeName: document.getElementById('moveLearnPokeName'),
    moveLearnSubtitle: document.getElementById('moveLearnSubtitle'),
    newMoveName: document.getElementById('newMoveName'),
    newMoveTypeBadge: document.getElementById('newMoveTypeBadge'),
    newMoveStats: document.getElementById('newMoveStats'),
    newMoveDesc: document.getElementById('newMoveDesc'),
    currentMovesToForgetList: document.getElementById('currentMovesToForgetList'),
    btnDeclineLearnMove: document.getElementById('btnDeclineLearnMove'),
    btnConfirmLearnMove: document.getElementById('btnConfirmLearnMove'),

    // Manage Moves Modal
    manageMovesModal: document.getElementById('manageMovesModal'),
    manageMovesCloseBtn: document.getElementById('manageMovesCloseBtn'),
    manageMovesCheckboxList: document.getElementById('manageMovesCheckboxList'),
    manageMovesSelectedCount: document.getElementById('manageMovesSelectedCount'),
    btnSaveManagedMoves: document.getElementById('btnSaveManagedMoves'),

    // Toast
    toastNotice: document.getElementById('toastNotice')
  };

  // --- INITIALIZATION ---
  function init() {
    setupTheme();
    parseUrlParams();
    setupEventListeners();
    setupDataAndStart();
  }

  function setupTheme() {
    if (state.theme === 'light') document.body.classList.add('theme-light');
  }

  function toggleTheme() {
    document.body.classList.toggle('theme-light');
    state.theme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    localStorage.setItem('pnp_theme', state.theme);
  }

  function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tid = urlParams.get('t') || urlParams.get('trainer');
    if (tid) state.activeTrainerId = tid;
  }

  function setupDataAndStart() {
    const data = window.POKEDEX_DATA;
    if (!data || !data.pokemon) {
      fetch('data/pokedex_gen1_5.json')
        .then(r => r.json())
        .then(d => {
          window.POKEDEX_DATA = d;
          bootstrap(d);
        })
        .catch(e => {
          console.error('[Trainer] Data loading error:', e);
          showToast('Fehler beim Laden der Pokédex-Datenbank!');
        });
    } else {
      bootstrap(data);
    }
  }

  function bootstrap(data) {
    ALL_POKEMON = data.pokemon || [];
    ALL_MOVES = data.moves || {};
    ALL_TYPES = data.types || {};
    ALL_NATURES = data.natures || [];
    ALL_EVOLUTIONS = data.evolutions || {};
    ALL_ITEMS = data.items || [];

    // Fetch initial Game State from server
    fetchGameState();

    // Connect to live Server-Sent Events stream
    connectLiveSse();
    setInterval(fetchGameState, 2500);

    // Render pokedex
    renderPokedexGrid();
  }

  // --- SERVER REST API CALL ---
  async function sendAction(type, payload = {}) {
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload })
      });
      return await res.json();
    } catch (e) {
      console.warn('[Trainer] Action send error:', e);
      return { success: false, error: e.message };
    }
  }

  async function fetchGameState() {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        handleStateUpdate(data);
      }
    } catch (e) {
      console.warn('[Trainer] Failed to fetch state:', e);
    }
  }

  function handleStateUpdate(newState) {
    if (!newState) return;

    if (newState.version) {
      try {
        const localCached = localStorage.getItem('pnp_saved_gamestate');
        if (localCached) {
          const cached = JSON.parse(localCached);
          if (cached && cached.version && cached.version > newState.version) {
            console.log('[Trainer] Restoring newer state to server...');
            sendAction('SYNC_STATE', cached);
            return;
          }
        }
        localStorage.setItem('pnp_saved_gamestate', JSON.stringify(newState));
      } catch (e) {}
    }

    if (newState.trainers) state.trainers = newState.trainers;
    if (newState.battleState) state.battleState = newState.battleState;

    // Populate trainer dropdown
    populateTrainerDropdown();

    // Determine active trainer: URL query param -> localStorage -> first trainer
    const urlTrainerId = new URLSearchParams(window.location.search).get('t');
    const storedTrainerId = localStorage.getItem('pokemon_selected_trainer');

    if (!state.activeTrainerId) {
      if (urlTrainerId && state.trainers.some(t => t.id === urlTrainerId)) {
        state.activeTrainerId = urlTrainerId;
        localStorage.setItem('pokemon_selected_trainer', urlTrainerId);
      } else if (storedTrainerId && state.trainers.some(t => t.id === storedTrainerId)) {
        state.activeTrainerId = storedTrainerId;
      } else if (state.trainers.length > 0) {
        state.activeTrainerId = state.trainers[0].id;
        // Prompt player to select if multiple trainers or first visit
        if (!hasPromptedTrainerSelect) {
          hasPromptedTrainerSelect = true;
          setTimeout(() => openTrainerSelectModal(), 200);
        }
      }
    } else if (!state.trainers.some(t => t.id === state.activeTrainerId)) {
      if (state.trainers.length > 0) state.activeTrainerId = state.trainers[0].id;
    }

    elements.trainerSelectDropdown.value = state.activeTrainerId || '';

    // Render views
    renderActiveTrainerHeader();
    renderTrainerTeam();
    renderTrainerBackpack();
    renderTrainerBattleGrid();
  }

  // --- LIVE SSE REAL-TIME SYNC ---
  function connectLiveSse() {
    try {
      const es = new EventSource('/api/events');

      es.onopen = () => {
        elements.trainerLivePill.style.background = 'rgba(16,185,129,0.15)';
        elements.trainerLivePill.style.borderColor = 'rgba(16,185,129,0.4)';
        elements.trainerLivePill.style.color = '#34d399';
        elements.trainerLiveText.textContent = 'Live Sync';
      };

      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data);
          handleLiveEvent(evt);
        } catch (err) {
          console.error('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        elements.trainerLivePill.style.background = 'rgba(239,68,68,0.15)';
        elements.trainerLivePill.style.borderColor = 'rgba(239,68,68,0.4)';
        elements.trainerLivePill.style.color = '#f87171';
        elements.trainerLiveText.textContent = 'Offline';
      };
    } catch (err) {
      console.warn('[SSE] EventSource not available:', err);
    }
  }

  function handleLiveEvent(evt) {
    const { type, payload } = evt;

    switch (type) {
      case 'CONNECTED':
        console.log('[Trainer] SSE connected to server.');
        break;

      case 'STATE_UPDATED':
        handleStateUpdate(payload);
        break;

      case 'BATTLE_TOKEN_SPAWNED':
      case 'BATTLE_TOKEN_MOVED':
      case 'BATTLE_TOKEN_REMOVED':
      case 'BATTLE_TOKENS_CLEARED':
      case 'POKEMON_HEALED':
      case 'AP_RESTORED':
        fetchGameState();
        break;

      case 'BATTLE_DAMAGE_APPLIED':
        if (payload.attackerId && state.selectedBattleTokenId === payload.attackerId) {
          const selToken = state.battleState?.tokens?.find(t => t.id === payload.attackerId);
          if (selToken && payload.remainingMovement !== undefined) {
            selToken.remainingMovement = payload.remainingMovement;
          }
          if (payload.remainingMovement && payload.remainingMovement >= 5) {
            showToast(`⚡ Erstschlag ausgeführt! Volle Bewegung (5 Felder) zurückerhalten – du kannst dich jetzt zurückziehen!`);
          }
        }
        fetchGameState();
        break;

      case 'BATTLE_ROUND_RESET':
        showToast(`🔄 Neue Kampfrunde ${payload.turnNumber || ''} begonnen! Bewegungspunkte zurückgesetzt.`);
        fetchGameState();
        break;

      case 'ACTION_REQUEST_REJECTED':
        if (payload.trainerId === state.activeTrainerId) {
          showToast(`❌ Aktion vom Spielleiter abgelehnt: ${payload.reason || 'Abgelehnt'}`);
          fetchGameState();
        }
        break;

      case 'POKEMON_ASSIGNED':
        if (payload.trainerId === state.activeTrainerId) {
          showToast(`✨ Neues Pokémon erhalten: "${payload.pokemon.nickname}" (${payload.pokemon.name_de})!`);
          fetchGameState();
        }
        break;

      case 'POKEMON_EVOLVED':
        if (payload.trainerId === state.activeTrainerId) {
          showToast(`🌟 Unglaublich! Dein Pokémon hat sich zu ${payload.newName} entwickelt!`);
          fetchGameState();
        }
        break;

      case 'HP_UPDATED':
        if (payload.trainerId === state.activeTrainerId) {
          updatePokemonHpDom(payload.pokemonUid, payload.currentHp);
        }
        break;

      case 'POKEMON_LEVELED_UP':
        if (payload.trainerId === state.activeTrainerId) {
          const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
          const currentPoke = currentTrainer?.pokemon.find(p => p.uid === payload.pokemonUid) || payload.pokemon;
          const pData = ALL_POKEMON.find(p => p.id === currentPoke.pokemonId);

          const hpGain = payload.hpGain || 0;
          const hpMsg = hpGain > 0 ? `, +${hpGain} KP automatisch geheilt` : '';
          showToast(`🎉 Level-Up durch Spielleiter! ${currentPoke.nickname} ist jetzt Level ${payload.level}! (+2 freie Trainingspunkte${hpMsg})`);

          // Check if newly unlocked moves exist at this level!
          if (pData) {
            const newlyLearnedMoveEntries = (pData.moves.level_up || []).filter(([lvl]) => lvl === payload.level);
            if (newlyLearnedMoveEntries.length > 0) {
              newlyLearnedMoveEntries.forEach(([lvl, mid]) => {
                handleMoveLearningOnLevelUp(currentPoke, pData, mid);
              });
            }
          }

          fetchGameState();
        }
        break;

      case 'STAT_ALLOCATED':
        if (payload.trainerId === state.activeTrainerId) {
          fetchGameState();
        }
        break;

      case 'ITEM_RECEIVED':
        if (payload.trainerId === state.activeTrainerId) {
          showToast(`🎒 Neuer Gegenstand im Rucksack: ${payload.count}x ${payload.item.name_de}!`);
          fetchGameState();
        }
        break;

      case 'DICE_ROLLED':
        // If it's this trainer's roll, add to history
        if (payload.trainerId === state.activeTrainerId) {
          addRecentRoll(payload);
        }
        break;
    }
  }

  // --- TRAINER SELECTION & HEADER ---
  let hasPromptedTrainerSelect = false;

  function openTrainerSelectModal() {
    renderTrainerSelectModal();
    if (elements.trainerSelectModal) {
      elements.trainerSelectModal.style.display = 'flex';
    }
  }

  function closeTrainerSelectModal() {
    if (elements.trainerSelectModal) {
      elements.trainerSelectModal.style.display = 'none';
    }
  }

  function renderTrainerSelectModal() {
    if (!elements.trainerSelectModalList) return;
    elements.trainerSelectModalList.innerHTML = '';

    if (!state.trainers || state.trainers.length === 0) {
      elements.trainerSelectModalList.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.85rem;">
          Noch keine Trainer registriert.<br>
          Dein Spielleiter (DM) muss erst einen Trainer im DM Screen anlegen!
        </div>
      `;
      return;
    }

    state.trainers.forEach(trainer => {
      const isSelected = trainer.id === state.activeTrainerId;
      const card = document.createElement('div');
      card.style.cssText = `
        background: ${isSelected ? 'rgba(59,130,246,0.15)' : 'var(--bg-tertiary)'};
        border: 1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border-color)'};
        border-radius: var(--radius-lg);
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      // Preview team sprites
      let previewSprites = '';
      if (trainer.pokemon && trainer.pokemon.length > 0) {
        previewSprites = trainer.pokemon.slice(0, 4).map(p => `
          <img src="${p.sprite}" alt="${p.nickname || p.name_de}" title="${p.nickname || p.name_de}" class="pixelated" style="width:28px; height:28px; object-fit:contain;">
        `).join('');
      } else {
        previewSprites = '<span style="font-size:0.7rem; color:var(--text-muted);">(Keine Pokémon)</span>';
      }

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem; min-width:0;">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">
            🧢
          </div>
          <div style="min-width:0;">
            <div style="font-weight:800; font-size:0.95rem; color:var(--text-highlight); display:flex; align-items:center; gap:0.4rem;">
              <span>${trainer.name}</span>
              ${isSelected ? '<span style="font-size:0.65rem; background:var(--accent-blue); color:#fff; padding:0.1rem 0.4rem; border-radius:9999px;">Aktiv</span>' : ''}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:0.25rem;">
              ${trainer.role || 'Pokémon-Trainer'} • ${trainer.pokemon?.length || 0} Pokémon
            </div>
            <div style="display:flex; align-items:center; gap:0.2rem;">
              ${previewSprites}
            </div>
          </div>
        </div>
        <div>
          <button class="${isSelected ? 'btn-primary' : 'btn-secondary'}" style="font-size:0.75rem; font-weight:700; padding:0.4rem 0.75rem; white-space:nowrap; pointer-events:none;">
            ${isSelected ? 'Ausgewählt ✓' : 'Spielen →'}
          </button>
        </div>
      `;

      card.addEventListener('click', () => {
        selectTrainer(trainer.id);
      });

      elements.trainerSelectModalList.appendChild(card);
    });
  }

  function selectTrainer(trainerId) {
    state.activeTrainerId = trainerId;
    localStorage.setItem('pokemon_selected_trainer', trainerId);

    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('t', trainerId);
    window.history.replaceState({}, '', url);

    if (elements.trainerSelectDropdown) {
      elements.trainerSelectDropdown.value = trainerId;
    }

    renderActiveTrainerHeader();
    renderTrainerTeam();
    renderTrainerBackpack();
    renderTrainerBattleGrid();
    closeTrainerSelectModal();

    const t = state.trainers.find(x => x.id === trainerId);
    showToast(`Charakter gewechselt zu: ${t?.name || 'Trainer'}`);
  }
  function populateTrainerDropdown() {
    elements.trainerSelectDropdown.innerHTML = '';
    state.trainers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      elements.trainerSelectDropdown.appendChild(opt);
    });
  }

  function renderActiveTrainerHeader() {
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    if (!currentTrainer) {
      elements.activeTrainerNameDisplay.textContent = 'Kein Trainer gewählt';
      elements.activeTrainerRoleDisplay.textContent = 'Bitte wähle oben einen Trainer aus oder erstelle einen im DM Screen.';
      elements.teamCountPill.textContent = '0 Pokémon';
      return;
    }

    elements.activeTrainerNameDisplay.textContent = currentTrainer.name;
    elements.activeTrainerRoleDisplay.textContent = `${currentTrainer.role || 'Pokémon-Trainer'} • ${currentTrainer.items?.length || 0} Items im Rucksack`;
    elements.teamCountPill.textContent = `${currentTrainer.pokemon.length} Pokémon`;
  }

  // --- TEAM VIEW RENDERING ---
  function renderTrainerTeam() {
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    elements.trainerPokemonList.innerHTML = '';

    if (!currentTrainer || currentTrainer.pokemon.length === 0) {
      elements.trainerPokemonList.innerHTML = `
        <div class="empty-state" style="background:var(--bg-card); border-radius:var(--radius-lg); padding:2.5rem 1.5rem; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">🧢</div>
          <h3 style="font-size:1.2rem; font-weight:800; margin-bottom:0.5rem;">Noch keine Pokémon im Team</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary); max-width:400px; margin:0 auto;">
            Der Spielleiter (DM) kann dir auf seinem Screen jederzeit dein Starter- oder Fang-Pokémon zuweisen. Sobald er dies tut, erscheint es hier live!
          </p>
        </div>
      `;
      return;
    }

    currentTrainer.pokemon.forEach(poke => {
      const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
      if (!pData) return;

      const card = document.createElement('div');
      card.className = 'tool-card';
      card.style.background = 'var(--bg-card)';
      card.style.border = '1px solid var(--border-color)';
      card.style.borderRadius = 'var(--radius-lg)';
      card.style.padding = '1.25rem';
      card.dataset.puid = poke.uid;

      // Stats calculation for display
      const currentStats = {};
      const attributeBonuses = {};
      ATTR_CONFIG.forEach(attr => {
        const customVal = (poke.customStats && poke.customStats[attr.key]) || 0;
        const calculated = calculateStat(pData.base_stats[attr.key], attr.key, poke.level, 31, 0, poke.nature) + customVal;
        currentStats[attr.key] = calculated;
        attributeBonuses[attr.key] = getAttributeBonus(calculated);
      });

      // Nature skill mods
      const natureMods = NATURE_SKILL_MODS[poke.nature] || {};

      // HP percentage and color
      const hpPercent = Math.max(0, Math.min(100, Math.round((poke.currentHp / poke.maxHp) * 100)));
      let hpColor = '#10b981';
      if (hpPercent <= 20) hpColor = '#ef4444';
      else if (hpPercent <= 50) hpColor = '#f59e0b';

      const mapToken = state.battleState?.tokens?.find(t => t.pokemonUid === poke.uid);

      card.innerHTML = `
        <!-- Top: Sprite, Name, Types, Level & Level-Up Button -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${pData.sprites.front_default}" alt="${pData.name_de}" style="width:68px; height:68px;" class="pixelated" onerror="this.src='${pData.sprites.front_static}'">
            <div>
              <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                <span style="font-weight:900; font-size:1.35rem; color:var(--text-highlight); line-height:1.1;">${poke.nickname}</span>
                ${getStatusDisplayBadge(poke)}
              </div>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">
                #${String(pData.id).padStart(3, '0')} ${pData.name_de} • Wesen: <strong style="color:var(--accent-gold);">${poke.nature}</strong>
              </div>
              <div style="display:flex; gap:0.35rem; margin-top:0.4rem;">
                ${pData.types.map(t => getTypeBadgeHtml(t.identifier, t.name_de)).join('')}
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.35rem;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span class="level-badge-large" style="font-size:0.95rem; padding:0.3rem 0.75rem;">Lv. ${poke.level}</span>
              <button class="btn-primary btn-trainer-lvl-up" data-puid="${poke.uid}" style="padding:0.25rem 0.65rem; font-size:0.75rem; font-weight:800; background:linear-gradient(135deg, #10b981, #059669); border-radius:var(--radius-sm); border:none; cursor:pointer; color:#fff; display:flex; align-items:center; gap:0.25rem; box-shadow:0 2px 6px rgba(16,185,129,0.3);" title="Level um 1 erhöhen (+2 freie Trainingspunkte)">
                ⬆️ Level-Up
              </button>
            </div>
            ${mapToken ? `
              <span class="status-badge" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:0.68rem; margin-top:0.2rem;">
                📍 Auf Karte (${String.fromCharCode(65 + mapToken.x)}${mapToken.y + 1})
              </span>
              <button class="btn-secondary btn-trainer-card-recall" data-puid="${poke.uid}" style="font-size:0.68rem; padding:0.2rem 0.5rem; color:#ef4444; border-color:rgba(239,68,68,0.4); font-weight:700; margin-top:0.15rem;">
                🔴 In Ball zurückrufen
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Free Points Banner (if any) -->
        ${(poke.freePoints > 0) ? `
          <div style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); border-radius:var(--radius-md); padding:0.65rem 0.85rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.4rem; color:var(--accent-gold); font-size:0.85rem; font-weight:800;">
              ✨ Du hast ${poke.freePoints} freie Attributspunkte!
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">
              Klicke unten auf [+] bei einem Attribut.
            </div>
          </div>
        ` : ''}

        <!-- LIVE HP TRACKER -->
        <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:800; margin-bottom:0.35rem;">
            <span style="display:flex; align-items:center; gap:0.3rem;">❤️ KP (Kraftpunkte Live):</span>
            <span style="font-family:var(--font-mono); color:${hpColor}; font-size:0.95rem;" class="poke-hp-text">
              ${poke.currentHp} / ${poke.maxHp}
            </span>
          </div>
          <div class="hp-bar-track" style="height:10px; margin-bottom:0.6rem;">
            <div class="hp-bar-fill poke-hp-fill" style="width:${hpPercent}%; background-color:${hpColor};"></div>
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); text-align:center; padding:0.25rem 0;">
            🛡️ KP-Anpassungen &amp; Heilung werden vom Spielleiter (DM) verwaltet
          </div>
        </div>

        <!-- Type Weaknesses & Resistances -->
        ${renderTypeWeaknessesHtml(pData)}

        <!-- Ability (Fähigkeit) -->
        ${(() => {
          const ab = getPokemonAbility(poke);
          const availableAbs = (pData?.abilities && pData.abilities.length > 0) ? pData.abilities : (ab ? [ab] : []);
          return `
            <div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:var(--radius-md); padding:0.6rem 0.8rem; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.45rem;">
                <span style="font-size:0.75rem; font-weight:800; color:#93c5fd; text-transform:uppercase;">⚡ Fähigkeit:</span>
                ${availableAbs.length > 1 ? `
                  <select class="trainer-ability-select" data-puid="${poke.uid}" style="background:var(--bg-secondary); color:#fff; border:1px solid rgba(59,130,246,0.5); border-radius:4px; padding:0.2rem 0.45rem; font-size:0.8rem; font-weight:700; cursor:pointer;">
                    ${availableAbs.map(a => `
                      <option value="${a.id}" ${ab && ab.id === a.id ? 'selected' : ''}>
                        ${a.name_de || a.name_en}${a.is_hidden ? ' (VF)' : ''}
                      </option>
                    `).join('')}
                  </select>
                ` : `
                  <strong style="font-size:0.85rem; color:#fff;">${ab ? (ab.name_de || ab.name_en) : 'Keine'}</strong>
                `}
              </div>
              ${ab && ab.desc_de ? `
                <div style="font-size:0.72rem; color:var(--text-secondary); max-width:320px; text-align:right;" title="${ab.desc_de}">
                  ${ab.desc_de}
                </div>
              ` : ''}
            </div>
          `;
        })()}

        <!-- 4 ACTIVE MOVES SECTION -->
        <div style="margin-bottom:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <div style="font-size:0.85rem; font-weight:800; color:var(--text-highlight); text-transform:uppercase; letter-spacing:0.5px;">
              ⚔️ Aktive Attacken (${poke.selectedMoves.length}/4)
            </div>
            <button class="btn-secondary btn-open-manage-moves" data-puid="${poke.uid}" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
              🔄 Attacken verwalten
            </button>
          </div>

          <div class="move-card-grid">
            ${poke.selectedMoves.map(mid => {
              const m = ALL_MOVES[String(mid)] || { name_de: `Attacke #${mid}`, type_de: 'Normal', power: '-', accuracy: '-', pp: '-', desc_de: '' };
              const curAp = getMoveAp(poke, m);
              return `
                <div class="move-item-card">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:800; font-size:0.9rem; color:var(--text-highlight);">${m.name_de}</div>
                    ${getTypeBadgeHtml(m.type_name, m.type_de)}
                  </div>
                  <div style="display:flex; gap:0.5rem; font-size:0.72rem; font-family:var(--font-mono); color:var(--text-secondary);">
                    <span>Stärke: <strong>${getMovePowerDisplay(m)}</strong></span>
                    <span>Gen.: <strong>${m.accuracy ? m.accuracy + '%' : '-'}</strong></span>
                    <span>AP: <strong style="color:${curAp === 0 ? '#ef4444' : 'inherit'};">${curAp}/${m.pp || '-'}</strong></span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem;">
                    <div style="font-size:0.7rem; color:var(--text-muted); font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">
                      ${m.desc_de || ''}
                    </div>
                    <span style="font-size:0.68rem; color:var(--text-muted); font-weight:600;">
                      ${m.range_desc || 'Taktikkarte'}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
            ${poke.selectedMoves.length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted); font-style:italic; padding:0.5rem;">Noch keine Attacken gewählt.</div>' : ''}
          </div>
        </div>

        <!-- 6 RPG ATTRIBUTES ACCORDION / GRID -->
        <div style="margin-bottom:1.25rem; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem;">
          <div style="font-size:0.8rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">
            📊 6 Grund-Attribute (P&amp;P Skalierung):
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.5rem;">
            ${ATTR_CONFIG.map(attr => {
              const val = currentStats[attr.key];
              const bonus = attributeBonuses[attr.key];
              const canAdd = (poke.freePoints > 0);
              return `
                <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.4rem 0.6rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:0.7rem; font-weight:700; color:${attr.color};">${attr.code} (${attr.name_de})</div>
                    <div style="font-size:0.9rem; font-weight:900; font-family:var(--font-mono); color:var(--text-highlight);">
                      ${val} <span style="font-size:0.8rem; color:#93c5fd;">(+${bonus})</span>
                    </div>
                  </div>
                  ${canAdd ? `
                    <button class="btn-stat-plus btn-allocate-stat" data-puid="${poke.uid}" data-stat="${attr.key}" title="+1 Punkt investieren">
                      +
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 12 P&P FERTIGKEITEN & INTERAKTIVE WÜRFE -->
        <details style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem;">
          <summary style="font-size:0.85rem; font-weight:800; color:var(--accent-cyan); cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
            <span>🎲 12 Fertigkeits-Proben (Wesen: ${poke.nature})</span>
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">Tippen zum Aufklappen</span>
          </summary>

          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:0.5rem; margin-top:0.75rem;">
            ${PNP_SKILLS.map(skill => {
              const baseAttrBonus = attributeBonuses[skill.attrKey] || 0;
              const natureMod = natureMods[skill.id] || 0;
              const totalBonus = baseAttrBonus + natureMod;

              let modBadge = '';
              if (natureMod > 0) modBadge = `<span style="color:#34d399; font-weight:800;">+${natureMod}</span>`;
              else if (natureMod < 0) modBadge = `<span style="color:#f87171; font-weight:800;">${natureMod}</span>`;

              return `
                <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.45rem 0.6rem; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-size:0.8rem; font-weight:800; color:var(--text-highlight);">
                      ${skill.name} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">(${skill.attrCode})</span>
                    </div>
                    <div style="font-size:0.68rem; color:var(--text-muted);">
                      ${skill.desc} ${modBadge ? `• Wesen: ${modBadge}` : ''}
                    </div>
                  </div>
                  <button class="skill-roll-badge btn-roll-skill" data-skillname="${skill.name}" data-totalbonus="${totalBonus}" data-pname="${poke.nickname}">
                    🎲 W20 +${totalBonus}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </details>
      `;

      // Bind actions inside card
      bindCardActions(card, poke, pData);

      elements.trainerPokemonList.appendChild(card);
    });
  }

  function bindCardActions(card, poke, pData) {
    const puid = poke.uid;

    // Trainer Level Up Button
    const lvlUpBtn = card.querySelector('.btn-trainer-lvl-up');
    if (lvlUpBtn) {
      lvlUpBtn.addEventListener('click', () => {
        triggerLevelUp(poke, pData);
      });
    }

    // Allocate Stat Point
    card.querySelectorAll('.btn-allocate-stat').forEach(btn => {
      btn.addEventListener('click', () => {
        const statKey = btn.dataset.stat;
        if ((poke.freePoints || 0) <= 0) return;

        // Optimistic update
        poke.freePoints = (poke.freePoints || 0) - 1;
        poke.customStats = poke.customStats || {};
        poke.customStats[statKey] = (poke.customStats[statKey] || 0) + 1;
        if (statKey === 'hp') {
          poke.maxHp = (poke.maxHp || 0) + 1;
          poke.currentHp = Math.min(poke.maxHp, (poke.currentHp || 0) + 1);
        }

        const statCfg = ATTR_CONFIG.find(a => a.key === statKey);
        const statName = statCfg ? statCfg.name_de : statKey.toUpperCase();
        showToast(`✨ +1 Punkt in ${statName} investiert! (Noch ${poke.freePoints} freie Punkte)`);

        renderTrainerTeam();

        sendAction('ALLOCATE_STAT_POINT', {
          trainerId: state.activeTrainerId,
          pokemonUid: puid,
          statKey
        });
      });
    });

    // Manage Moves Button
    const manageBtn = card.querySelector('.btn-open-manage-moves');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        openManageMovesModal(poke, pData);
      });
    }

    // Skill Roll Button
    card.querySelectorAll('.btn-roll-skill').forEach(btn => {
      btn.addEventListener('click', () => {
        const sname = btn.dataset.skillname;
        const bonus = parseInt(btn.dataset.totalbonus, 10);
        const pname = btn.dataset.pname;
        executeSkillRoll(pname, sname, bonus);
      });
    });

    // Recall request button on Pokemon Card in Team view
    const recallBtn = card.querySelector('.btn-trainer-card-recall');
    if (recallBtn) {
      recallBtn.addEventListener('click', () => {
        const activeToken = state.battleState?.tokens?.find(t => t.pokemonUid === puid);
        if (activeToken) {
          requestRecallPokemon(activeToken);
        }
      });
    }

    // Ability selection dropdown
    const abilitySelect = card.querySelector('.trainer-ability-select');
    if (abilitySelect) {
      abilitySelect.addEventListener('change', (e) => {
        const abId = parseInt(e.target.value, 10);
        const chosenAb = pData?.abilities?.find(a => a.id === abId);
        if (chosenAb && state.activeTrainerId) {
          sendAction('SET_POKEMON_ABILITY', {
            trainerId: state.activeTrainerId,
            pokemonUid: puid,
            ability: chosenAb
          });
          poke.ability = chosenAb;
          showToast(`⚡ Fähigkeit von "${poke.nickname}" zu "${chosenAb.name_de || chosenAb.name_en}" geändert!`);
          renderTrainerTeam();
        }
      });
    }
  }

  function updatePokemonHpDom(puid, newHp) {
    const card = document.querySelector(`.tool-card[data-puid="${puid}"]`);
    if (!card) return;

    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    const poke = currentTrainer?.pokemon.find(p => p.uid === puid);
    if (!poke) return;

    poke.currentHp = newHp;
    const hpPercent = Math.max(0, Math.min(100, Math.round((newHp / poke.maxHp) * 100)));
    let hpColor = '#10b981';
    if (hpPercent <= 20) hpColor = '#ef4444';
    else if (hpPercent <= 50) hpColor = '#f59e0b';

    const textEl = card.querySelector('.poke-hp-text');
    const fillEl = card.querySelector('.poke-hp-fill');
    if (textEl) {
      textEl.textContent = `${newHp} / ${poke.maxHp}`;
      textEl.style.color = hpColor;
    }
    if (fillEl) {
      fillEl.style.width = `${hpPercent}%`;
      fillEl.style.backgroundColor = hpColor;
    }
  }

  // --- LEVEL-UP & MOVE LEARNING LOGIC ---
  function triggerLevelUp(poke, pData) {
    const oldLevel = poke.level;
    const newLevel = Math.min(100, oldLevel + 1);
    if (newLevel === oldLevel) {
      showToast('Maximale Stufe (Lv. 100) erreicht!');
      return;
    }

    const oldMaxHp = poke.maxHp || 20;
    // Calculate new Max HP
    const newMaxHp = calculateStat(pData.base_stats.hp, 'hp', newLevel, 31, 0, poke.nature) + ((poke.customStats && poke.customStats.hp) || 0);
    const hpGain = Math.max(0, newMaxHp - oldMaxHp);

    // Update locally
    poke.level = newLevel;
    poke.freePoints = (poke.freePoints || 0) + 2;
    poke.maxHp = newMaxHp;
    poke.currentHp = Math.min(newMaxHp, (poke.currentHp || 0) + hpGain);

    // Send action to server
    sendAction('LEVEL_UP_POKEMON', {
      trainerId: state.activeTrainerId,
      pokemonUid: poke.uid,
      delta: 1,
      newMaxHp: newMaxHp
    });

    const hpMsg = hpGain > 0 ? ` (+${hpGain} KP geheilt)` : '';
    showToast(`🎉 Level-Up! ${poke.nickname} ist jetzt Level ${newLevel}! (+2 freie Trainingspunkte${hpMsg})`);

    // Check if new moves are unlocked at newLevel!
    const newlyLearnedMoveEntries = (pData.moves.level_up || []).filter(([lvl, mid]) => lvl === newLevel);

    if (newlyLearnedMoveEntries.length > 0) {
      // Process each move
      newlyLearnedMoveEntries.forEach(([lvl, mid]) => {
        handleMoveLearningOnLevelUp(poke, pData, mid);
      });
    }

    renderTrainerTeam();
  }

  function handleMoveLearningOnLevelUp(poke, pData, moveId) {
    const moveData = ALL_MOVES[String(moveId)];
    if (!moveData) return;

    // Check if already known
    if (poke.selectedMoves.includes(moveId)) return;

    // If less than 4 moves, learn automatically!
    if (poke.selectedMoves.length < 4) {
      poke.selectedMoves.push(moveId);
      sendAction('UPDATE_POKEMON_MOVES', {
        trainerId: state.activeTrainerId,
        pokemonUid: poke.uid,
        moves: poke.selectedMoves
      });
      showToast(`✨ ${poke.nickname} hat automatisch "${moveData.name_de}" erlernt!`);
      return;
    }

    // If ALREADY HAS 4 MOVES: Add to learn queue and prompt modal!
    state.pendingLearnQueue.push({
      trainerId: state.activeTrainerId,
      pokemonUid: poke.uid,
      moveId: moveId,
      moveData: moveData,
      poke: poke,
      pData: pData
    });

    processNextPendingMove();
  }

  function processNextPendingMove() {
    if (state.pendingLearnQueue.length === 0) return;
    if (elements.moveLearnModal.classList.contains('open')) return; // Already showing one

    const ctx = state.pendingLearnQueue.shift();
    state.activeLearnContext = ctx;
    state.selectedMoveToForget = null;

    const { poke, pData, moveData } = ctx;

    elements.moveLearnPokeSprite.src = pData.sprites.front_default;
    elements.moveLearnPokeName.textContent = poke.nickname;
    elements.moveLearnSubtitle.textContent = `Erreichtes Level ${poke.level} • Spezies: ${pData.name_de}`;

    elements.newMoveName.textContent = moveData.name_de;
    elements.newMoveTypeBadge.textContent = moveData.type_de;
    elements.newMoveTypeBadge.className = `type-badge type-${moveData.type_name || 'normal'}`;
    elements.newMoveStats.textContent = `Kategorie: ${moveData.category_de || 'Physisch'} | Stärke: ${getMovePowerDisplay(moveData)} | Genauigkeit: ${moveData.accuracy ? moveData.accuracy + '%' : '-'} | AP: ${moveData.pp || '-'}`;
    elements.newMoveDesc.textContent = moveData.desc_de ? `"${moveData.desc_de}"` : '';

    // Render current 4 moves to choose from
    elements.currentMovesToForgetList.innerHTML = '';
    poke.selectedMoves.forEach((mid, idx) => {
      const m = ALL_MOVES[String(mid)] || { name_de: `Attacke #${mid}`, type_de: 'Normal', power: '-', accuracy: '-', pp: '-' };
      const item = document.createElement('div');
      item.className = 'selectable-move-option';
      item.dataset.mid = mid;

      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <input type="radio" name="forgetMoveRadio" id="radioMove_${mid}" value="${mid}">
            <label for="radioMove_${mid}" style="font-weight:800; font-size:0.95rem; cursor:pointer;">${m.name_de}</label>
          </div>
          <span class="type-badge type-${m.type_name || 'normal'}" style="font-size:0.65rem; padding:0.1rem 0.4rem;">${m.type_de}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary); font-family:var(--font-mono); margin-left:1.5rem; margin-top:0.2rem;">
          Stärke: ${getMovePowerDisplay(m)} | Gen.: ${m.accuracy ? m.accuracy + '%' : '-'} | AP: ${m.pp || '-'}
        </div>
      `;

      item.addEventListener('click', () => {
        elements.currentMovesToForgetList.querySelectorAll('.selectable-move-option').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        const radio = item.querySelector('input[type="radio"]');
        radio.checked = true;
        state.selectedMoveToForget = mid;
        elements.btnConfirmLearnMove.disabled = false;
      });

      elements.currentMovesToForgetList.appendChild(item);
    });

    elements.btnConfirmLearnMove.disabled = true;
    elements.moveLearnModal.classList.add('open');
  }

  function executeMoveLearnReplacement() {
    if (!state.activeLearnContext || state.selectedMoveToForget === null) return;
    const { trainerId, pokemonUid, moveId, moveData, poke } = state.activeLearnContext;

    // Replace selected move with the new move
    const forgetIdx = poke.selectedMoves.indexOf(state.selectedMoveToForget);
    const oldMoveData = ALL_MOVES[String(state.selectedMoveToForget)];
    const oldMoveName = oldMoveData ? oldMoveData.name_de : 'Alte Attacke';

    if (forgetIdx !== -1) {
      poke.selectedMoves[forgetIdx] = moveId;
    } else {
      poke.selectedMoves[0] = moveId;
    }

    sendAction('UPDATE_POKEMON_MOVES', {
      trainerId: trainerId,
      pokemonUid: pokemonUid,
      moves: poke.selectedMoves
    });

    elements.moveLearnModal.classList.remove('open');
    showToast(`✨ "${poke.nickname}" hat ${oldMoveName} vergessen und "${moveData.name_de}" erlernt!`);

    state.activeLearnContext = null;
    renderTrainerTeam();

    // Check next queued move if any
    setTimeout(processNextPendingMove, 200);
  }

  function declineMoveLearn() {
    if (!state.activeLearnContext) return;
    const { moveData, poke } = state.activeLearnContext;

    elements.moveLearnModal.classList.remove('open');
    showToast(`"${moveData.name_de}" wurde von ${poke.nickname} nicht erlernt.`);

    state.activeLearnContext = null;

    // Check next queued move if any
    setTimeout(processNextPendingMove, 200);
  }

  // --- MANAGE MOVES (SWAP UNLOCKED MOVES) ---
  function openManageMovesModal(poke, pData) {
    state.activeManagePoke = poke;
    elements.manageMovesCheckboxList.innerHTML = '';

    // Find all level-up moves learned up to current level
    const availableEntries = (pData.moves.level_up || []).filter(([lvl]) => lvl <= poke.level);
    const uniqueMoveIds = Array.from(new Set(availableEntries.map(([lvl, mid]) => mid)));

    uniqueMoveIds.forEach(mid => {
      const m = ALL_MOVES[String(mid)] || { name_de: `Attacke #${mid}`, type_de: 'Normal', power: '-', accuracy: '-', pp: '-', desc_de: '' };
      const isSelected = poke.selectedMoves.includes(mid);

      const item = document.createElement('label');
      item.className = 'selectable-move-option';
      item.style.display = 'flex';
      item.style.alignItems = 'flex-start';
      item.style.gap = '0.75rem';
      item.style.cursor = 'pointer';

      item.innerHTML = `
        <input type="checkbox" value="${mid}" ${isSelected ? 'checked' : ''} style="margin-top:0.25rem; width:18px; height:18px;">
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-weight:800; font-size:0.95rem; color:var(--text-highlight);">${m.name_de}</div>
            <span class="type-badge type-${m.type_name || 'normal'}" style="font-size:0.65rem; padding:0.1rem 0.4rem;">${m.type_de}</span>
          </div>
          <div style="font-size:0.75rem; font-family:var(--font-mono); color:var(--text-secondary); margin-top:0.2rem;">
            Stärke: ${getMovePowerDisplay(m)} | Genauigkeit: ${m.accuracy ? m.accuracy + '%' : '-'} | AP: ${m.pp || '-'}
          </div>
          <div style="font-size:0.7rem; color:var(--text-muted); font-style:italic; margin-top:0.2rem;">
            ${m.desc_de || ''}
          </div>
        </div>
      `;

      elements.manageMovesCheckboxList.appendChild(item);
    });

    updateManageMovesCount();

    elements.manageMovesCheckboxList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = elements.manageMovesCheckboxList.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > 4) {
          cb.checked = false;
          showToast('Maximal 4 Attacken erlaubt!');
        }
        updateManageMovesCount();
      });
    });

    elements.manageMovesModal.classList.add('open');
  }

  function updateManageMovesCount() {
    const checked = elements.manageMovesCheckboxList.querySelectorAll('input[type="checkbox"]:checked');
    elements.manageMovesSelectedCount.textContent = `${checked.length} / 4 ausgewählt`;
  }

  function saveManagedMoves() {
    if (!state.activeManagePoke) return;
    const checked = elements.manageMovesCheckboxList.querySelectorAll('input[type="checkbox"]:checked');
    const newMoves = Array.from(checked).map(cb => parseInt(cb.value, 10));

    state.activeManagePoke.selectedMoves = newMoves;
    sendAction('UPDATE_POKEMON_MOVES', {
      trainerId: state.activeTrainerId,
      pokemonUid: state.activeManagePoke.uid,
      moves: newMoves
    });

    elements.manageMovesModal.classList.remove('open');
    showToast('Attacken erfolgreich gespeichert!');
    renderTrainerTeam();
  }

  // --- RUCKSACK (ITEMS) RENDERING ---
  function renderTrainerBackpack() {
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    elements.trainerInventoryGrid.innerHTML = '';

    if (!currentTrainer || !currentTrainer.items || currentTrainer.items.length === 0) {
      elements.trainerInventoryGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; background:var(--bg-card); border-radius:var(--radius-lg); padding:2rem; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">🎒</div>
          <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:0.5rem;">Rucksack ist leer</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary); max-width:400px; margin:0 auto;">
            Der Spielleiter kann dir im DM Screen unter "Item-Vergabe" Bälle, Tränke, Entwicklungssteine oder Ausrüstung ins Inventar legen.
          </p>
        </div>
      `;
      return;
    }

    currentTrainer.items.forEach(item => {
      const catalogItem = ALL_ITEMS.find(i => i.id === item.id) || {};
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.style.background = 'var(--bg-card)';
      card.style.border = '1px solid var(--border-color)';
      card.style.borderRadius = 'var(--radius-md)';
      card.style.padding = '0.85rem';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';

      const isHeal = (
        catalogItem.category === 'heal' ||
        item.category === 'heal' ||
        item.id.includes('potion') ||
        item.id.includes('revive') ||
        (item.name_de && (item.name_de.includes('Trank') || item.name_de.includes('Beleber') || item.name_de.includes('Heiler')))
      );

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;">
          <img src="${item.icon || catalogItem.icon || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}" alt="" style="width:36px; height:36px;" class="pixelated">
          <div style="flex:1;">
            <div style="font-weight:900; font-size:0.95rem; color:var(--text-highlight);">${item.name_de || catalogItem.name_de}</div>
            <div style="font-size:0.75rem; color:var(--accent-gold); font-weight:800;">Anzahl: ${item.count}x</div>
          </div>
        </div>

        <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic; margin-bottom:0.75rem; line-height:1.35;">
          ${catalogItem.desc || catalogItem.desc_de || 'Nützlicher Gegenstand auf deiner Reise.'}
        </div>

        <button class="btn-secondary btn-use-item" data-itemid="${item.id}" data-itemname="${item.name_de || catalogItem.name_de}" style="padding:0.35rem; font-size:0.78rem;">
          ${isHeal ? '❤️ Teammitglied heilen' : '✨ Item einsetzen (-1)'}
        </button>
      `;

      card.querySelector('.btn-use-item').addEventListener('click', () => {
        handleBackpackItemClick(item, catalogItem);
      });

      elements.trainerInventoryGrid.appendChild(card);
    });
  }

  function handleBackpackItemClick(item, catalogItem) {
    const itemName = item.name_de || catalogItem.name_de || '';
    const itemId = item.id || '';
    const isHealingItem = (
      catalogItem.category === 'heal' ||
      item.category === 'heal' ||
      itemId.includes('potion') ||
      itemId.includes('revive') ||
      itemId.includes('ether') ||
      itemName.includes('Trank') ||
      itemName.includes('Beleber') ||
      itemName.includes('Heiler') ||
      itemName.includes('Beere')
    );

    if (isHealingItem) {
      openHealTargetModal(item, catalogItem);
    } else {
      handleUseGenericItem(itemId, itemName, catalogItem);
    }
  }

  function handleUseGenericItem(itemId, itemName, catalogItem) {
    if (!confirm(`Möchtest du 1x "${itemName}" einsetzen?`)) return;

    sendAction('USE_ITEM', {
      trainerId: state.activeTrainerId,
      itemId: itemId
    });

    const trainerObj = state.trainers.find(t => t.id === state.activeTrainerId);
    sendAction('DICE_ROLL', {
      trainerId: state.activeTrainerId,
      trainerName: trainerObj ? trainerObj.name : 'Trainer',
      text: `setzt 1x ${itemName} ein`,
      result: 'Item genutzt',
      timestamp: Date.now()
    });

    showToast(`🎒 1x ${itemName} eingesetzt!`);
    fetchGameState();
  }

  function openHealTargetModal(item, catalogItem) {
    state.activeHealItem = item;
    state.activeHealCatalogItem = catalogItem;
    const itemName = item.name_de || catalogItem.name_de || 'Item';
    if (elements.healItemNameDisplay) {
      elements.healItemNameDisplay.textContent = itemName;
    }

    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    if (!currentTrainer || !currentTrainer.pokemon || currentTrainer.pokemon.length === 0) {
      showToast('Keine Pokémon im Team vorhanden!');
      return;
    }

    if (!elements.healTeamMembersList) return;
    elements.healTeamMembersList.innerHTML = '';

    currentTrainer.pokemon.forEach(poke => {
      const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
      const sprite = poke.sprites?.front_default || (pData ? pData.sprites.front_default : '');
      const maxHp = calculateStat(pData ? pData.base_stats.hp : 50, 'hp', poke.level, 31, 0, poke.nature) + (poke.customStats?.hp || 0);
      const curHp = (typeof poke.currentHp === 'number') ? poke.currentHp : maxHp;
      const hpPercent = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
      let hpColor = '#10b981';
      if (hpPercent <= 20) hpColor = '#ef4444';
      else if (hpPercent <= 50) hpColor = '#f59e0b';

      const isFainted = (curHp <= 0);
      const isFullHp = (curHp >= maxHp);
      const isRevive = item.id.includes('revive') || itemName.includes('Beleber');

      let canUse = true;
      let reason = '';
      if (isRevive && !isFainted) {
        canUse = false;
        reason = 'Nicht besiegt';
      } else if (!isRevive && isFainted) {
        canUse = false;
        reason = 'Besiegt (braucht Beleber)';
      } else if (!isRevive && isFullHp) {
        canUse = false;
        reason = 'Bereits volle KP';
      }

      const itemCard = document.createElement('div');
      itemCard.style.background = 'var(--bg-tertiary)';
      itemCard.style.border = '1px solid var(--border-color)';
      itemCard.style.borderRadius = 'var(--radius-md)';
      itemCard.style.padding = '0.65rem 0.85rem';
      itemCard.style.display = 'flex';
      itemCard.style.justifyContent = 'space-between';
      itemCard.style.alignItems = 'center';

      itemCard.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <img src="${sprite}" alt="" style="width:40px; height:40px;" class="pixelated">
          <div>
            <div style="font-weight:900; font-size:0.95rem; color:var(--text-highlight);">${poke.nickname}</div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:0.25rem;">
              Lv. ${poke.level} (${poke.name_de || ''})
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <div class="hp-bar-track" style="width:80px; height:6px;">
                <div class="hp-bar-fill" style="width:${hpPercent}%; background:${hpColor};"></div>
              </div>
              <span style="font-size:0.7rem; font-family:var(--font-mono); color:${hpColor}; font-weight:800;">
                ${curHp}/${maxHp} KP
              </span>
            </div>
          </div>
        </div>

        <div>
          ${canUse ? `
            <button class="btn-primary btn-apply-heal-item" style="padding:0.35rem 0.75rem; font-size:0.78rem;">
              ❤️ Heilen
            </button>
          ` : `
            <span style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">${reason}</span>
          `}
        </div>
      `;

      if (canUse) {
        itemCard.querySelector('.btn-apply-heal-item').addEventListener('click', () => {
          executeHealItemOnPokemon(poke, maxHp, item);
        });
      }

      elements.healTeamMembersList.appendChild(itemCard);
    });

    elements.healTargetModal.classList.add('open');
  }

  function executeHealItemOnPokemon(poke, maxHp, item) {
    let healAmount = 20;
    let isFull = false;

    if (item.id === 'potion') healAmount = 20;
    else if (item.id === 'super_potion') healAmount = 50;
    else if (item.id === 'hyper_potion') healAmount = 200;
    else if (item.id === 'max_potion') isFull = true;
    else if (item.id === 'revive') healAmount = Math.max(1, Math.floor(maxHp / 2));
    else if (item.id === 'max_revive') isFull = true;

    // Send HEAL_POKEMON to server
    sendAction('HEAL_POKEMON', {
      trainerId: state.activeTrainerId,
      pokemonUid: poke.uid,
      amount: healAmount,
      isFull: isFull
    });

    // Send USE_ITEM (-1)
    sendAction('USE_ITEM', {
      trainerId: state.activeTrainerId,
      itemId: item.id
    });

    // Send live dice roll log to DM
    const curTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    sendAction('DICE_ROLL', {
      trainerId: state.activeTrainerId,
      trainerName: curTrainer ? curTrainer.name : 'Trainer',
      text: `verwendet 1x ${item.name_de} auf ${poke.nickname} (+${isFull ? 'Voll' : healAmount} KP)`,
      timestamp: Date.now()
    });

    elements.healTargetModal.classList.remove('open');
    showToast(`❤️ ${poke.nickname} wurde mit 1x ${item.name_de} geheilt!`);
    fetchGameState();
  }

  // --- DICE ROLLER & P&P PROBEN ---
  function executeSkillRoll(pokemonNickname, skillName, totalBonus) {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + totalBonus;

    let critBadge = '';
    if (d20 === 20) critBadge = ' (KRITISCHER ERFOLG! 🌟)';
    else if (d20 === 1) critBadge = ' (PATZER! 💀)';

    const resultText = `D20 (${d20}) + ${totalBonus} = ${total}${critBadge}`;
    const trainerObj = state.trainers.find(t => t.id === state.activeTrainerId);

    const rollData = {
      trainerId: state.activeTrainerId,
      trainerName: trainerObj ? trainerObj.name : 'Trainer',
      source: `${pokemonNickname} (${skillName})`,
      d20: d20,
      bonus: totalBonus,
      total: total,
      text: `${pokemonNickname} würfelt ${skillName}: ${resultText}`,
      timestamp: Date.now()
    };

    // Send to server (broadcasts live to DM screen!)
    sendAction('DICE_ROLL', rollData);

    // Update player dice tab preview
    elements.playerDiceResult.textContent = String(total);
    elements.playerDiceLabel.textContent = `${skillName}: D20 (${d20}) + ${totalBonus}`;

    showToast(`🎲 ${skillName}: Wurf ${d20} + ${totalBonus} = ${total}!`);
  }

  function executeMoveRoll(pokemonNickname, moveName, power, accuracy) {
    const d100 = Math.floor(Math.random() * 100) + 1;
    const accNumber = parseInt(accuracy, 10) || 100;
    const isHit = d100 <= accNumber;

    const trainerObj = state.trainers.find(t => t.id === state.activeTrainerId);
    const hitText = isHit ? `✅ TREFFER! (W100: ${d100} <= ${accNumber}%)` : `❌ VERFEHLT! (W100: ${d100} > ${accNumber}%)`;

    const rollData = {
      trainerId: state.activeTrainerId,
      trainerName: trainerObj ? trainerObj.name : 'Trainer',
      source: `${pokemonNickname} setzt ${moveName} ein`,
      text: `${pokemonNickname} setzt ${moveName} ein: ${hitText} (Stärke: ${power})`,
      timestamp: Date.now()
    };

    sendAction('DICE_ROLL', rollData);
    showToast(`⚔️ ${pokemonNickname} setzt ${moveName} ein: ${hitText}!`);
  }

  function rollCustomDice(sides) {
    const mod = parseInt(elements.playerDiceModifier.value, 10) || 0;
    const raw = Math.floor(Math.random() * sides) + 1;
    const total = raw + mod;

    elements.playerDiceResult.textContent = String(total);
    elements.playerDiceLabel.textContent = `D${sides} (${raw}) ${mod >= 0 ? '+' : ''}${mod}`;

    const trainerObj = state.trainers.find(t => t.id === state.activeTrainerId);
    const rollData = {
      trainerId: state.activeTrainerId,
      trainerName: trainerObj ? trainerObj.name : 'Trainer',
      text: `würfelt D${sides}: ${raw} ${mod >= 0 ? '+' : ''}${mod} = ${total}`,
      timestamp: Date.now()
    };

    sendAction('DICE_ROLL', rollData);
  }

  function addRecentRoll(roll) {
    state.recentRolls.unshift(roll);
    if (state.recentRolls.length > 20) state.recentRolls.pop();
    renderRecentRolls();
  }

  function renderRecentRolls() {
    if (state.recentRolls.length === 0) {
      elements.playerRollsHistory.innerHTML = '<div class="history-item">Noch keine Würfe durchgeführt.</div>';
      return;
    }

    elements.playerRollsHistory.innerHTML = state.recentRolls.map(r => `
      <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div>
          <strong style="color:var(--text-highlight); font-size:0.8rem;">${r.text}</strong>
        </div>
        <div style="font-size:0.68rem; color:var(--text-muted); font-family:var(--font-mono);">
          ${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    `).join('');
  }

  // --- POKEDEX TAB ---
  function renderPokedexGrid() {
    const query = (elements.trainerPokedexSearch.value || '').toLowerCase().trim();
    const filtered = ALL_POKEMON.filter(p => {
      if (!query) return true;
      return p.name_de.toLowerCase().includes(query) ||
             p.name_en.toLowerCase().includes(query) ||
             String(p.id).includes(query);
    }).slice(0, 48);

    elements.trainerPokedexGrid.innerHTML = filtered.map(p => `
      <div class="pokemon-card" style="padding:0.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; font-family:var(--font-mono); color:var(--text-muted);">#${String(p.id).padStart(3, '0')}</span>
          <div style="display:flex; gap:0.25rem;">
            ${p.types.map(t => `<span class="type-badge type-${t.identifier}" style="font-size:0.6rem; padding:0.1rem 0.35rem;">${t.name_de}</span>`).join('')}
          </div>
        </div>
        <div style="text-align:center; margin:0.5rem 0;">
          <img src="${p.sprites.front_default}" alt="${p.name_de}" style="width:60px; height:60px;" class="pixelated" onerror="this.src='${p.sprites.front_static}'">
        </div>
        <div style="font-weight:800; font-size:0.95rem; text-align:center; color:var(--text-highlight);">${p.name_de}</div>
        <div style="font-size:0.72rem; color:var(--text-secondary); text-align:center; margin-top:0.25rem;">
          KP: ${p.base_stats.hp} | ANG: ${p.base_stats.atk} | VER: ${p.base_stats.def}
        </div>
      </div>
    `).join('');
  }

  // --- TAKTISCHE KAMPFKARTE (BATTLE GRID & D&D REICHWEITEN) ---
  const GRID_COLS = 20;
  const GRID_ROWS = 14;
  const COL_LABELS = 'ABCDEFGHIJKLMNOPQRST'.split('');

  function renderTrainerBattleGrid() {
    if (!elements.trainerBattleGrid) return;
    const tokens = (state.battleState && state.battleState.tokens) || [];

    if (elements.trainerRoundNumber) {
      elements.trainerRoundNumber.textContent = String(state.battleState?.turnNumber || 1);
    }

    if (elements.trainerBattleTokensBadge) {
      elements.trainerBattleTokensBadge.textContent = `${tokens.length} Einheiten`;
    }

    // Grid Zellen einmalig erzeugen (20x14)
    if (elements.trainerBattleGrid.children.length === 0) {
      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          cell.dataset.x = x;
          cell.dataset.y = y;

          const coord = document.createElement('span');
          coord.className = 'cell-coord';
          coord.textContent = `${COL_LABELS[x]}${y + 1}`;
          cell.appendChild(coord);

          cell.addEventListener('click', () => handleTrainerCellClick(x, y));
          elements.trainerBattleGrid.appendChild(cell);
        }
      }
    }

    // Alte Token-Elemente und Highlights entfernen
    elements.trainerBattleGrid.querySelectorAll('.map-token').forEach(el => el.remove());
    clearTrainerGridHighlights();

    // Alle Tokens auf dem Spielfeld platzieren
    tokens.forEach(token => {
      const cell = elements.trainerBattleGrid.querySelector(`.grid-cell[data-x="${token.x}"][data-y="${token.y}"]`);
      if (!cell) return;

      const pData = ALL_POKEMON.find(p => p.id === token.pokemonId);
      const spriteUrl = token.sprite || (pData ? pData.sprites.front_default : '');

      const tokenEl = document.createElement('div');
      tokenEl.className = `map-token ${token.isEnemy ? 'is-enemy' : 'is-player'} ${token.id === state.selectedBattleTokenId ? 'selected' : ''} ${token.isProtected ? 'is-protected' : ''} ${token.isEnduring ? 'is-enduring' : ''} ${token.isCountering ? 'is-countering' : ''}`;
      tokenEl.dataset.tokenId = token.id;

      const hpPercent = Math.max(0, Math.min(100, Math.round((token.currentHp / token.maxHp) * 100)));
      let hpColor = '#10b981';
      if (hpPercent <= 20) hpColor = '#ef4444';
      else if (hpPercent <= 50) hpColor = '#f59e0b';

      tokenEl.innerHTML = `
        <div class="token-hp-bar"><div class="token-hp-fill" style="width:${hpPercent}%; background:${hpColor};"></div></div>
        ${renderTokenStatusIconsHtml(token)}
        <img src="${spriteUrl}" alt="" class="token-sprite pixelated" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'">
        <div class="token-label">${token.nickname || (pData ? pData.name_de : 'Token')}</div>
      `;

      tokenEl.addEventListener('click', (e) => {
        e.stopPropagation();
        handleTrainerTokenSelect(token.id);
      });

      cell.appendChild(tokenEl);
    });

    // Update Token-Detail-Box & Reichweiten-Highlights
    renderTrainerSelectedTokenBox();
    applyTrainerGridHighlights();
  }

  function handleTrainerCellClick(x, y) {
    if (!state.selectedBattleTokenId) return;
    const token = state.battleState?.tokens?.find(t => t.id === state.selectedBattleTokenId);
    if (!token) return;

    // Nur eigene Spieler-Pokémon dürfen Anfragen stellen
    const isOwner = (!token.isEnemy && token.trainerId === state.activeTrainerId);
    if (!isOwner) return;

    // Falls gerade eine Attacke ausgewählt ist und auf einen Gegner getippt wird
    if (state.selectedBattleMoveIndex !== null && token.moves && token.moves[state.selectedBattleMoveIndex]) {
      const move = token.moves[state.selectedBattleMoveIndex];
      if (!isProtectMove(move) && !isEndureMove(move) && !isCounterMove(move)) {
        const targetEnemy = state.battleState?.tokens?.find(t => t.x === x && t.y === y && t.isEnemy);
        if (targetEnemy) {
          requestAttackOnTarget(token, targetEnemy, move);
          return;
        }
      }
    }

    // Feld besetzt?
    const isOccupied = state.battleState.tokens.some(t => t.x === x && t.y === y);
    if (isOccupied) return;

    // Bewegungsreichweite prüfen (Echter runder Kreis!)
    const effectiveMaxMove = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
    const currentRem = token.remainingMovement !== undefined ? token.remainingMovement : effectiveMaxMove;
    const rawDist = Math.hypot(x - token.x, y - token.y);
    const dist = Math.round(rawDist);

    if (dist <= 0) return;

    if (rawDist > (currentRem + 0.3)) {
      showToast(`Außerhalb deiner Reichweite! (${dist} Felder benötigt, ${currentRem} übrig)`);
      return;
    }

    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    sendAction('SUBMIT_ACTION_REQUEST', {
      type: 'MOVE',
      tokenId: token.id,
      pokemonName: token.nickname,
      trainerId: state.activeTrainerId,
      trainerName: currentTrainer?.name || 'Trainer',
      fromX: token.x,
      fromY: token.y,
      toX: x,
      toY: y,
      dist: dist
    });

    const cell = elements.trainerBattleGrid?.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) cell.classList.add('pending-move-cell');

    showToast(`🏃 Bewegung nach [${x + 1},${y + 1}] (${dist} Felder) an DM gesendet!`);
  }

  function handleTrainerTokenSelect(tokenId) {
    const clickedToken = state.battleState?.tokens?.find(t => t.id === tokenId);
    const selectedToken = state.battleState?.tokens?.find(t => t.id === state.selectedBattleTokenId);

    // Wenn Attacke aktiv und gegnerisches Pokémon angetippt wird
    if (selectedToken && state.selectedBattleMoveIndex !== null && clickedToken && clickedToken.isEnemy && !selectedToken.isEnemy && selectedToken.trainerId === state.activeTrainerId) {
      const move = selectedToken.moves[state.selectedBattleMoveIndex];
      if (move && !isProtectMove(move) && !isEndureMove(move) && !isCounterMove(move)) {
        requestAttackOnTarget(selectedToken, clickedToken, move);
        return;
      }
    }

    if (state.selectedBattleTokenId === tokenId) {
      state.selectedBattleTokenId = null;
      state.selectedBattleMoveIndex = null;
    } else {
      state.selectedBattleTokenId = tokenId;
      state.selectedBattleMoveIndex = null;
    }
    renderTrainerBattleGrid();
  }

  function requestAttackOnTarget(attacker, targetToken, move) {
    if (getMoveAp(attacker, move) <= 0) {
      showToast(`⚠️ Keine AP mehr für ${move.name_de}!`);
      return;
    }
    const targetCells = getAttackCells(attacker.x, attacker.y, move, state.coneDirection);
    const isInRange = targetCells.some(c => c.x === targetToken.x && c.y === targetToken.y);
    if (!isInRange) {
      showToast(`Ziel "${targetToken.nickname}" ist nicht in Angriffsreichweite!`);
      return;
    }

    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    sendAction('SUBMIT_ACTION_REQUEST', {
      type: 'ATTACK',
      attackerId: attacker.id,
      attackerName: attacker.nickname,
      targetTokenId: targetToken.id,
      targetName: targetToken.nickname,
      trainerId: state.activeTrainerId,
      trainerName: currentTrainer?.name || 'Trainer',
      moveId: move.id,
      moveName: move.name_de,
      move: move
    });

    const cell = elements.trainerBattleGrid?.querySelector(`.grid-cell[data-x="${targetToken.x}"][data-y="${targetToken.y}"]`);
    if (cell) cell.classList.add('pending-target-cell');

    showToast(`⚔️ Angriff mit ${move.name_de} auf ${targetToken.nickname} angefragt! (Warte auf DM-Bestätigung)`);
    state.selectedBattleMoveIndex = null;
    renderTrainerBattleGrid();
  }

  function requestAoEAttack(attacker, move, targetTokens) {
    if (getMoveAp(attacker, move) <= 0) {
      showToast(`⚠️ Keine AP mehr für ${move.name_de}!`);
      return;
    }
    if (!targetTokens || targetTokens.length === 0) {
      showToast('Keine gegnerischen Ziele im Wirkungsbereich!');
      return;
    }
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    sendAction('SUBMIT_ACTION_REQUEST', {
      type: 'ATTACK',
      attackerId: attacker.id,
      attackerName: attacker.nickname,
      targetTokenIds: targetTokens.map(t => t.id),
      targetNames: targetTokens.map(t => t.nickname),
      trainerId: state.activeTrainerId,
      trainerName: currentTrainer?.name || 'Trainer',
      moveId: move.id,
      moveName: move.name_de,
      move: move
    });

    targetTokens.forEach(t => {
      const cell = elements.trainerBattleGrid?.querySelector(`.grid-cell[data-x="${t.x}"][data-y="${t.y}"]`);
      if (cell) cell.classList.add('pending-target-cell');
    });

    showToast(`⚔️ Flächenangriff mit ${move.name_de} (${targetTokens.length} Ziele) angefragt! (Warte auf DM-Bestätigung)`);
    state.selectedBattleMoveIndex = null;
    renderTrainerBattleGrid();
  }

  function requestSelfBuff(token, move, buffType) {
    if (getMoveAp(token, move) <= 0) {
      showToast(`⚠️ Keine AP mehr für ${move.name_de}!`);
      return;
    }
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    sendAction('SUBMIT_ACTION_REQUEST', {
      type: 'ATTACK',
      isSelfBuff: true,
      buffType: buffType,
      attackerId: token.id,
      attackerName: token.nickname,
      targetTokenId: token.id,
      targetName: token.nickname,
      trainerId: state.activeTrainerId,
      trainerName: currentTrainer?.name || 'Trainer',
      moveId: move.id,
      moveName: move.name_de,
      move: move
    });
    const buffName = buffType === 'protect' ? '🛡️ Schutzschild' : (buffType === 'counter' ? '⚔️ Konter' : '💪 Ausdauer');
    showToast(`${buffName} für ${token.nickname} an DM angefragt!`);
    state.selectedBattleMoveIndex = null;
    renderTrainerBattleGrid();
  }

  function renderTrainerSelectedTokenBox() {
    if (!elements.trainerSelectedTokenContent) return;
    const token = state.battleState?.tokens?.find(t => t.id === state.selectedBattleTokenId);

    if (!token) {
      elements.trainerSelectedTokenContent.innerHTML = `
        <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">
          Tippe auf ein Pokémon auf der Karte, um Werte und Attacken-Reichweiten anzuzeigen.
        </div>
      `;
      return;
    }

    const pData = ALL_POKEMON.find(p => p.id === token.pokemonId);
    const spriteUrl = token.sprite || (pData ? pData.sprites.front_default : '');
    const hpPercent = Math.max(0, Math.min(100, Math.round((token.currentHp / token.maxHp) * 100)));
    let hpColor = '#10b981';
    if (hpPercent <= 20) hpColor = '#ef4444';
    else if (hpPercent <= 50) hpColor = '#f59e0b';

    const isMine = (!token.isEnemy && token.trainerId === state.activeTrainerId);
    const effectiveMaxMove = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
    const remMove = token.remainingMovement !== undefined ? token.remainingMovement : effectiveMaxMove;

    elements.trainerSelectedTokenContent.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem;">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <img src="${spriteUrl}" alt="" style="width:44px; height:44px;" class="pixelated" onerror="this.src='https://play.pokemonshowdown.com/sprites/trainers/acetrainer.png'">
          <div>
            <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
              <span style="font-weight:900; font-size:1rem; color:var(--text-highlight);">${token.nickname}</span>
              ${getStatusDisplayBadge(token)}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.15rem;">
              ${(token.isHuman || token.pokemonId === 0 || token.name_de === 'Mensch') ? '👤 Mensch (NPC)' : (token.isEnemy ? '🔴 Gegner' : (isMine ? '🟢 Dein Pokémon' : '🔵 Verbündeter'))} • Lv. ${token.level} (${token.name_de || (pData ? pData.name_de : '')})
            </div>
            <div style="display:flex; gap:0.3rem; margin-top:0.25rem;">
              ${(pData?.types || []).map(t => getTypeBadgeHtml(t.identifier, t.name_de)).join('')}
            </div>
          </div>
        </div>
        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem;">
          <div style="font-size:0.75rem; font-family:var(--font-mono); font-weight:800; color:${hpColor};">
            ${token.currentHp} / ${token.maxHp} KP
          </div>
          <div class="hp-bar-track" style="width:75px; height:6px;">
            <div class="hp-bar-fill" style="width:${hpPercent}%; background:${hpColor};"></div>
          </div>
          ${isMine ? `
            <button class="btn-secondary btn-trainer-recall-pokemon" style="font-size:0.65rem; padding:0.2rem 0.45rem; color:#ef4444; border-color:rgba(239,68,68,0.4); font-weight:700; margin-top:0.15rem;">
              🔴 Zurückrufen
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Type Weaknesses & Resistances -->
      ${renderTypeWeaknessesHtml(pData)}

      ${(token.isHuman || token.pokemonId === 0 || token.name_de === 'Mensch') ? `
        <div style="background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:6px; padding:0.35rem 0.5rem; margin-top:0.45rem; font-size:0.72rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#93c5fd; font-weight:800;">👤 Standard-Mensch:</span>
          <span style="color:#fff; font-weight:700;">50 KP • Basiswerte 70 überall</span>
        </div>
      ` : ''}

      <!-- Ability Info -->
      ${(() => {
        const ab = getPokemonAbility(token);
        if (!ab) return '';
        return `
          <div style="background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:6px; padding:0.4rem 0.6rem; margin-top:0.45rem; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:0.35rem;">
              <span style="font-size:0.7rem; font-weight:800; color:#93c5fd; text-transform:uppercase;">⚡ Fähigkeit:</span>
              <strong style="font-size:0.8rem; color:#fff;">${ab.name_de || ab.name_en}</strong>
            </div>
            ${ab.desc_de ? `<span style="font-size:0.68rem; color:var(--text-secondary); max-width:220px; text-align:right;" title="${ab.desc_de}">${ab.desc_de}</span>` : ''}
          </div>
        `;
      })()}

      <!-- Stat Stages Overview -->
      <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:6px; padding:0.4rem 0.5rem; margin-top:0.45rem;">
        <div style="font-size:0.68rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">
          STATUSWERTE-STUFEN (-6 bis +6):
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.25rem;">
          ${[
            { key: 'atk', label: 'Angr' },
            { key: 'def', label: 'Vert' },
            { key: 'spa', label: 'Sp-Ang' },
            { key: 'spd', label: 'Sp-Ver' },
            { key: 'spe', label: 'Init' },
            { key: 'acc', label: 'Gen' }
          ].map(({ key, label }) => {
            const stage = (token.statStages && token.statStages[key]) || 0;
            const sign = stage > 0 ? `+${stage}` : `${stage}`;
            const color = stage < 0 ? '#f87171' : (stage > 0 ? '#34d399' : 'var(--text-secondary)');
            return `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:0.2rem 0.3rem; display:flex; justify-content:space-between; align-items:center; font-size:0.65rem;">
                <span style="font-weight:700;">${label}:</span>
                <span style="font-weight:900; font-family:var(--font-mono); color:${color};">${sign}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Movement Points Bar -->
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:800; color:#93c5fd; background:rgba(59,130,246,0.12); padding:0.3rem 0.5rem; border-radius:4px; margin-top:0.45rem; margin-bottom:0.35rem;">
        <span>🏃 Verbleibende Bewegung:</span>
        <span style="font-family:var(--font-mono); font-weight:900; color:${remMove > 0 ? '#60a5fa' : '#ef4444'};">${remMove} / ${effectiveMaxMove} Felder ${token.statStages?.spe ? `(Init: ${token.statStages.spe > 0 ? '+' : ''}${token.statStages.spe})` : ''}</span>
      </div>
      ${isMine ? `
        <div style="margin-bottom:0.6rem;">
          <button class="btn-primary btn-trainer-end-turn-token" style="width:100%; font-size:0.75rem; padding:0.35rem 0.5rem; background:#2563eb; border-color:#1d4ed8; font-weight:800; display:flex; justify-content:center; align-items:center; gap:0.35rem; box-shadow:0 2px 8px rgba(37,99,235,0.3);">
            🏁 Runde beenden (Bewegung zurückbekommen)
          </button>
        </div>
      ` : ''}

      <!-- Attacken & Reichweiten -->
      <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem;">
        ATTACKEN &amp; TAKTISCHE REICHWEITEN:
      </div>

      <div style="display:flex; flex-direction:column; gap:0.4rem;">
        ${(token.moves || []).map((m, idx) => {
          const curAp = getMoveAp(token, m);
          const isMoveActive = (state.selectedBattleMoveIndex === idx);
          const isCone = (m.range_type === 'cone');
          const isCircle = (m.range_type === 'circle');
          const isPriority = (m.range_type === 'priority' || m.priority > 0);

          let actionControlsHtml = '';

          if (isMoveActive && isMine) {
            if (curAp <= 0) {
              actionControlsHtml = `
                <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); font-size:0.72rem; color:#ef4444; font-weight:700;">
                  ⚠️ Keine AP mehr für diese Attacke verfügbar!
                </div>
              `;
            } else if (isProtectMove(m)) {
              const currentTurn = state.battleState?.turnNumber || 1;
              const canUseProtect = (token.lastProtectRound === undefined || (currentTurn - token.lastProtectRound >= 2));
              if (token.isProtected) {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); background:rgba(16,185,129,0.15); border-radius:4px; padding:0.4rem; text-align:center; color:#34d399; font-size:0.75rem; font-weight:800;">
                    🛡️ Schutzschild ist in Runde ${currentTurn} AKTIV!
                  </div>
                `;
              } else if (!canUseProtect) {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <button disabled class="btn-secondary" style="width:100%; opacity:0.65; font-size:0.72rem; padding:0.35rem 0.5rem; color:#ef4444; border-color:rgba(239,68,68,0.4);">
                      ⏳ Schutzschild Abklingzeit (nur alle 2 Runden – bereit ab Runde ${(token.lastProtectRound || 1) + 2})
                    </button>
                  </div>
                `;
              } else {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <button class="btn-primary btn-submit-protect-req" data-midx="${idx}" style="width:100%; font-size:0.75rem; background:#10b981; border-color:#059669; font-weight:800; padding:0.4rem; box-shadow:0 2px 8px rgba(16,185,129,0.3); display:flex; justify-content:center; align-items:center; gap:0.35rem;">
                      🛡️ Schutzschild einsetzen (Anfrage an DM)
                    </button>
                  </div>
                `;
              }
            } else if (isEndureMove(m)) {
              if (token.isEnduring) {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); background:rgba(245,158,11,0.15); border-radius:4px; padding:0.4rem; text-align:center; color:#fbbf24; font-size:0.75rem; font-weight:800;">
                    💪 Ausdauer ist AKTIV! (Überlebt mit 1 KP)
                  </div>
                `;
              } else {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <button class="btn-primary btn-submit-endure-req" data-midx="${idx}" style="width:100%; font-size:0.75rem; background:#f59e0b; border-color:#d97706; font-weight:800; padding:0.4rem; box-shadow:0 2px 8px rgba(245,158,11,0.3); display:flex; justify-content:center; align-items:center; gap:0.35rem;">
                      💪 Ausdauer einsetzen (Anfrage an DM)
                    </button>
                  </div>
                `;
              }
            } else if (isCounterMove(m)) {
              if (token.isCountering) {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); background:rgba(239,68,68,0.15); border-radius:4px; padding:0.4rem; text-align:center; color:#fca5a5; font-size:0.75rem; font-weight:800;">
                    ⚔️ Konter ist AKTIV! (Greift nächsten Angreifer automatisch mit 2× Schaden an)
                  </div>
                `;
              } else {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <button class="btn-primary btn-submit-counter-req" data-midx="${idx}" style="width:100%; font-size:0.75rem; background:#dc2626; border-color:#b91c1c; font-weight:800; padding:0.4rem; box-shadow:0 2px 8px rgba(220,38,38,0.3); display:flex; justify-content:center; align-items:center; gap:0.35rem;">
                      ⚔️ Konter aktivieren (Kontert nächsten Angreifer mit 2× Schaden)
                    </button>
                  </div>
                `;
              }
            } else {
              const targetCells = getAttackCells(token.x, token.y, m, state.coneDirection);
              const enemiesInRange = state.battleState.tokens.filter(t => t.isEnemy && targetCells.some(c => c.x === t.x && c.y === t.y));

              if (isCone) {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <div style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.4rem;">
                      <span style="font-size:0.68rem; font-weight:700; color:var(--accent-gold);">Richtung:</span>
                      <button class="hp-btn btn-cone-dir-trainer ${state.coneDirection === 'N' ? 'active' : ''}" data-dir="N">⬆️ N</button>
                      <button class="hp-btn btn-cone-dir-trainer ${state.coneDirection === 'E' ? 'active' : ''}" data-dir="E">➡️ O</button>
                      <button class="hp-btn btn-cone-dir-trainer ${state.coneDirection === 'S' ? 'active' : ''}" data-dir="S">⬇️ S</button>
                      <button class="hp-btn btn-cone-dir-trainer ${state.coneDirection === 'W' ? 'active' : ''}" data-dir="W">⬅️ W</button>
                    </div>
                    <button class="btn-primary btn-submit-cone-req" data-midx="${idx}" ${enemiesInRange.length === 0 ? 'disabled style="opacity:0.6; width:100%; font-size:0.75rem;"' : 'style="width:100%; font-size:0.75rem; background:#ef4444; border-color:#dc2626;"'}>
                      ⚔️ Kegel-Angriff anfragen (${enemiesInRange.length} Ziele im Kegel)
                    </button>
                  </div>
                `;
              } else if (isCircle) {
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <button class="btn-primary btn-submit-circle-req" data-midx="${idx}" ${enemiesInRange.length === 0 ? 'disabled style="opacity:0.6; width:100%; font-size:0.75rem;"' : 'style="width:100%; font-size:0.75rem; background:#ef4444; border-color:#dc2626;"'}>
                      ⚔️ Rundum-Angriff anfragen (${enemiesInRange.length} Ziele)
                    </button>
                  </div>
                `;
              } else {
                // Single target
                actionControlsHtml = `
                  <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                    <div style="font-size:0.68rem; color:var(--text-secondary); margin-bottom:0.25rem;">
                      Ziel wählen (oder direkt auf Token tippen):
                    </div>
                    ${enemiesInRange.length > 0 ? `
                      <div style="display:flex; flex-direction:column; gap:0.25rem;">
                        ${enemiesInRange.map(e => {
                          const eff = getMoveEffectivenessAgainstTarget(m, e);
                          return `
                            <button class="btn-secondary btn-submit-single-req" data-midx="${idx}" data-targetid="${e.id}" style="justify-content:space-between; display:flex; align-items:center; font-size:0.72rem; padding:0.3rem 0.5rem; border-color:#ef4444; color:#fca5a5;">
                              <span>⚔️ <strong>${e.nickname}</strong> (Lv.${e.level})</span>
                              <div style="display:flex; align-items:center; gap:0.35rem;">
                                <span class="matchup-multiplier ${eff.badgeClass}" style="font-size:0.62rem; padding:0.08rem 0.3rem;">${eff.text}</span>
                                <span style="font-family:var(--font-mono); font-size:0.68rem;">${e.currentHp}/${e.maxHp} KP</span>
                              </div>
                            </button>
                          `;
                        }).join('')}
                      </div>
                    ` : `
                      <div style="font-size:0.68rem; color:var(--text-muted); font-style:italic;">Kein Gegner in Reichweite (${m.range_desc || '2 Felder'}).</div>
                    `}
                  </div>
                `;
              }
            }
          }

          return `
            <div style="background:var(--bg-tertiary); border:1px solid ${isMoveActive ? 'var(--accent-blue)' : 'var(--border-color)'}; border-radius:6px; padding:0.45rem;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <strong style="font-size:0.85rem; color:var(--text-highlight);">${m.name_de}</strong>
                  ${getTypeBadgeHtml(m.type_name, m.type_de)}
                  ${isPriority ? '<span class="status-badge" style="background:rgba(245,158,11,0.2); color:#f59e0b; font-size:0.58rem; margin-left:0.25rem;">⚡ Hit &amp; Run</span>' : ''}
                </div>
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <span style="font-size:0.72rem; font-family:var(--font-mono); color:${curAp === 0 ? '#ef4444' : 'var(--text-secondary)'}; font-weight:700;">
                    AP: ${curAp}/${m.pp || 20}
                  </span>
                </div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.3rem;">
                <span style="font-size:0.68rem; color:var(--text-muted);">
                  ${m.range_desc || 'Reichweite: 2 Felder'} • Stärke: <strong style="color:#93c5fd;">${getMovePowerDisplay(m)}</strong>
                </span>
                <button class="btn-primary btn-token-move-range" data-midx="${idx}" style="padding:0.2rem 0.5rem; font-size:0.68rem; background:${curAp === 0 ? '#64748b' : (isMoveActive ? '#f59e0b' : 'var(--accent-blue)')};">
                  ${isMoveActive ? 'Aktiv (Aus)' : (curAp === 0 ? 'Leer' : '🎯 Reichweite / Angriff')}
                </button>
              </div>

              ${actionControlsHtml}
            </div>
          `;
        }).join('')}
      </div>

      ${isMine ? `
        <div style="margin-top:0.75rem; padding-top:0.6rem; border-top:1px solid var(--border-color);">
          <button class="btn-secondary btn-trainer-recall-pokemon" style="width:100%; color:#ef4444; border-color:rgba(239,68,68,0.5); font-weight:800; font-size:0.8rem; padding:0.45rem;">
            🔴 ${token.nickname} in den Pokéball zurückrufen (an DM anfragen)
          </button>
        </div>
      ` : ''}
    `;

    // Event listeners for recall
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-trainer-recall-pokemon').forEach(btn => {
      btn.addEventListener('click', () => {
        requestRecallPokemon(token);
      });
    });

    // Event listeners for move range toggle
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-token-move-range').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const m = token.moves?.[midx];
        if (state.selectedBattleMoveIndex !== midx && m && getMoveAp(token, m) <= 0) {
          showToast(`⚠️ Keine AP mehr für ${m.name_de}!`);
          return;
        }
        state.selectedBattleMoveIndex = (state.selectedBattleMoveIndex === midx) ? null : midx;
        renderTrainerBattleGrid();
      });
    });

    // Event listeners for cone directions
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-cone-dir-trainer').forEach(btn => {
      btn.addEventListener('click', () => {
        state.coneDirection = btn.dataset.dir;
        renderTrainerBattleGrid();
      });
    });

    // Event listeners for self-buff requests (Schutzschild, Ausdauer)
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-submit-protect-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const m = token.moves[midx];
        if (m) requestSelfBuff(token, m, 'protect');
      });
    });

    elements.trainerSelectedTokenContent.querySelectorAll('.btn-submit-endure-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const m = token.moves[midx];
        if (m) requestSelfBuff(token, m, 'endure');
      });
    });

    elements.trainerSelectedTokenContent.querySelectorAll('.btn-submit-counter-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const m = token.moves[midx];
        if (m) requestSelfBuff(token, m, 'counter');
      });
    });

    // Event listeners for single attack requests
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-submit-single-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const targetId = btn.dataset.targetid;
        const targetToken = state.battleState?.tokens?.find(t => t.id === targetId);
        const move = token.moves[midx];
        if (targetToken && move) {
          requestAttackOnTarget(token, targetToken, move);
        }
      });
    });

    // Event listeners for cone attack request
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-submit-cone-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const move = token.moves[midx];
        if (move) {
          const targetCells = getAttackCells(token.x, token.y, move, state.coneDirection);
          const enemiesInCone = state.battleState.tokens.filter(t => t.isEnemy && targetCells.some(c => c.x === t.x && c.y === t.y));
          requestAoEAttack(token, move, enemiesInCone);
        }
      });
    });

    // Event listeners for circle attack request
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-submit-circle-req').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        const move = token.moves[midx];
        if (move) {
          const targetCells = getAttackCells(token.x, token.y, move, state.coneDirection);
          const enemiesInCircle = state.battleState.tokens.filter(t => t.isEnemy && targetCells.some(c => c.x === t.x && c.y === t.y));
          requestAoEAttack(token, move, enemiesInCircle);
        }
      });
    });

    // Event listeners for end turn / round end
    elements.trainerSelectedTokenContent.querySelectorAll('.btn-trainer-end-turn-token').forEach(btn => {
      btn.addEventListener('click', requestEndTurn);
    });
  }

  function requestRecallPokemon(token) {
    if (!token) return;
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    if (!confirm(`Möchtest du "${token.nickname || 'dein Pokémon'}" vom Kampffeld in den Pokéball zurückrufen? (Wird als Anfrage an den Spielleiter gesendet)`)) {
      return;
    }
    sendAction('SUBMIT_ACTION_REQUEST', {
      type: 'RECALL',
      trainerId: state.activeTrainerId,
      trainerName: currentTrainer?.name || 'Trainer',
      sourceTokenId: token.id,
      tokenId: token.id,
      sourcePokemonUid: token.pokemonUid,
      pokemonUid: token.pokemonUid,
      sourceName: token.nickname || 'Pokémon',
      pokemonName: token.nickname || 'Pokémon',
      details: `${token.nickname || 'Pokémon'} wird in den Pokéball zurückgerufen.`
    });
    showToast(`🔴 Rückruf-Anfrage für "${token.nickname}" an den DM gesendet!`);
  }

  function requestEndTurn() {
    if (!state.activeTrainerId) {
      showToast('Kein aktiver Trainer ausgewählt!');
      return;
    }
    const currentTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    if (!confirm('Möchtest du die Runde beenden? (Sendet eine Anfrage an den Spielleiter, um eine neue Runde zu starten und die Bewegungspunkte aller Pokémon wieder aufzufüllen)')) {
      return;
    }
    sendAction('SUBMIT_ACTION_REQUEST', {
      type: 'END_TURN',
      trainerId: state.activeTrainerId,
      trainerName: currentTrainer?.name || 'Trainer',
      details: `${currentTrainer?.name || 'Trainer'} hat den Zug beendet und bittet um eine neue Runde.`
    });
    showToast('🏁 Anfrage "Runde beenden" an den DM gesendet!');
  }

  function getAttackCells(originX, originY, move, coneDir) {
    const cells = [];
    const dist = move.range_distance || (move.range_type === 'single_special' || move.range_type === 'circle' ? 4 : (move.range_type === 'priority' ? 3 : 2));

    if (move.range_type === 'cone') {
      for (let d = 1; d <= dist; d++) {
        if (coneDir === 'N') {
          const ny = originY - d;
          for (let dx = -d; dx <= d; dx++) {
            const nx = originX + dx;
            if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) cells.push({ x: nx, y: ny });
          }
        } else if (coneDir === 'S') {
          const ny = originY + d;
          for (let dx = -d; dx <= d; dx++) {
            const nx = originX + dx;
            if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) cells.push({ x: nx, y: ny });
          }
        } else if (coneDir === 'E') {
          const nx = originX + d;
          for (let dy = -d; dy <= d; dy++) {
            const ny = originY + dy;
            if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) cells.push({ x: nx, y: ny });
          }
        } else if (coneDir === 'W') {
          const nx = originX - d;
          for (let dy = -d; dy <= d; dy++) {
            const ny = originY + dy;
            if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) cells.push({ x: nx, y: ny });
          }
        }
      }
      return cells;
    }

    // Circular or single target distance: GEOMETRISCH RUNDER KREIS (Math.hypot <= dist + 0.3)
    for (let dy = -dist; dy <= dist; dy++) {
      for (let dx = -dist; dx <= dist; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > 0 && d <= dist + 0.3) {
          const nx = originX + dx;
          const ny = originY + dy;
          if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
            cells.push({ x: nx, y: ny });
          }
        }
      }
    }
    return cells;
  }

  function applyTrainerGridHighlights() {
    clearTrainerGridHighlights();
    if (!state.selectedBattleTokenId) return;
    const token = state.battleState?.tokens?.find(t => t.id === state.selectedBattleTokenId);
    if (!token) return;

    // 1. Wenn eine Attacke ausgewählt wurde: Angriffsfeld hervorheben
    if (state.selectedBattleMoveIndex !== null && token.moves && token.moves[state.selectedBattleMoveIndex]) {
      const move = token.moves[state.selectedBattleMoveIndex];
      if (isProtectMove(move) || isEndureMove(move) || isCounterMove(move)) {
        const cell = elements.trainerBattleGrid?.querySelector(`.grid-cell[data-x="${token.x}"][data-y="${token.y}"]`);
        if (cell) cell.classList.add('highlight-range');
        return;
      }
      const targetCells = getAttackCells(token.x, token.y, move, state.coneDirection);

      targetCells.forEach(({ x, y }) => {
        const cell = elements.trainerBattleGrid?.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
          if (move.range_type === 'cone') {
            cell.classList.add('highlight-cone');
          } else if (move.range_type === 'circle') {
            cell.classList.add('highlight-aoe-circle');
          } else if (move.range_type === 'priority') {
            cell.classList.add('highlight-range', 'highlight-priority');
          } else {
            cell.classList.add('highlight-range');
          }
        }
      });
      return;
    }

    // 2. Bewegungsvorschau: RUNDER KREIS MIT VERBLEIBENDER BEWEGUNG
    const effectiveMaxMove = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
    const moveRange = token.remainingMovement !== undefined ? token.remainingMovement : effectiveMaxMove;
    for (let dy = -moveRange; dy <= moveRange; dy++) {
      for (let dx = -moveRange; dx <= moveRange; dx++) {
        const nx = token.x + dx;
        const ny = token.y + dy;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist <= moveRange + 0.3 && nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
          const isOccupied = state.battleState.tokens.some(t => t.x === nx && t.y === ny);
          if (!isOccupied) {
            const cell = elements.trainerBattleGrid?.querySelector(`.grid-cell[data-x="${nx}"][data-y="${ny}"]`);
            if (cell) cell.classList.add('highlight-move');
          }
        }
      }
    }
  }

  function clearTrainerGridHighlights() {
    if (!elements.trainerBattleGrid) return;
    elements.trainerBattleGrid.querySelectorAll('.grid-cell').forEach(cell => {
      cell.classList.remove('highlight-move', 'highlight-range', 'highlight-aoe-circle', 'highlight-cone', 'highlight-priority', 'pending-move-cell', 'pending-target-cell');
    });
  }

  // --- NAVIGATION & EVENT LISTENERS ---
  function setupEventListeners() {
    // Bottom Nav Tabs
    elements.bottomNavItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.trainertab;
        switchTab(tab);
      });
    });

    // Trainer Select Dropdown & Modal
    elements.trainerSelectDropdown.addEventListener('change', (e) => {
      selectTrainer(e.target.value);
    });

    if (elements.btnSwitchTrainerModal) {
      elements.btnSwitchTrainerModal.addEventListener('click', () => {
        openTrainerSelectModal();
      });
    }

    if (elements.trainerSelectModalCloseBtn) {
      elements.trainerSelectModalCloseBtn.addEventListener('click', () => {
        closeTrainerSelectModal();
      });
    }

    // Theme Toggle
    elements.trainerThemeToggleBtn.addEventListener('click', toggleTheme);

    // Dice Buttons
    elements.playerDiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides, 10);
        rollCustomDice(sides);
      });
    });

    // Pokedex Search
    elements.trainerPokedexSearch.addEventListener('input', renderPokedexGrid);

    // Heal Modal Close Button
    elements.healTargetCloseBtn?.addEventListener('click', () => {
      elements.healTargetModal.classList.remove('open');
    });

    // Move Learn Modal Buttons
    elements.moveLearnCloseBtn.addEventListener('click', declineMoveLearn);
    elements.btnDeclineLearnMove.addEventListener('click', declineMoveLearn);
    elements.btnConfirmLearnMove.addEventListener('click', executeMoveLearnReplacement);

    // Manage Moves Modal Buttons
    elements.manageMovesCloseBtn.addEventListener('click', () => {
      elements.manageMovesModal.classList.remove('open');
    });
    elements.btnSaveManagedMoves.addEventListener('click', saveManagedMoves);

    // End Turn / Round End button on Battle map
    elements.btnTrainerEndTurn?.addEventListener('click', requestEndTurn);
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    elements.bottomNavItems.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.trainertab === tabId);
    });

    elements.trainerTabTeam?.classList.toggle('active', tabId === 'team');
    elements.trainerTabBattle?.classList.toggle('active', tabId === 'battle');
    elements.trainerTabBackpack?.classList.toggle('active', tabId === 'backpack');
    elements.trainerTabDice?.classList.toggle('active', tabId === 'dice');
    elements.trainerTabPokedex?.classList.toggle('active', tabId === 'pokedex');

    if (tabId === 'battle') {
      renderTrainerBattleGrid();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- TOAST NOTIFICATION ---
  let toastTimer = null;
  function showToast(message) {
    if (!elements.toastNotice) return;
    elements.toastNotice.textContent = message;
    elements.toastNotice.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toastNotice.classList.remove('visible');
    }, 3800);
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
