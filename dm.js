/**
 * Pokémon Pen & Paper - DM Screen (Spielleiter-App)
 * Echtzeit-Synchronisation, Entwicklungs-Manager mit Sicherheitsabfrage,
 * Item-Vergabe, Live-Würfellog und Pokédex.
 */

(function () {
  'use strict';

  let ALL_POKEMON = [];
  let ALL_MOVES = {};
  let ALL_TYPES = {};
  let ALL_NATURES = [];
  let ALL_EVOLUTIONS = {};
  let ALL_ITEMS = [];

  const ATTR_CONFIG = [
    { key: 'hp', code: 'KON', name_de: 'Konstitution', source: 'KP', color: '#10b981', maxBench: 255 },
    { key: 'atk', code: 'STÄ', name_de: 'Stärke', source: 'Angriff', color: '#ef4444', maxBench: 190 },
    { key: 'def', code: 'WEI', name_de: 'Weisheit', source: 'Verteidigung', color: '#f59e0b', maxBench: 230 },
    { key: 'spa', code: 'CHA', name_de: 'Charisma', source: 'Sp.-Angriff', color: '#3b82f6', maxBench: 194 },
    { key: 'spd', code: 'INT', name_de: 'Intelligenz', source: 'Sp.-Vert.', color: '#8b5cf6', maxBench: 230 },
    { key: 'spe', code: 'GES', name_de: 'Geschicklichkeit', source: 'Initiative', color: '#06b6d4', maxBench: 180 }
  ];

  function getAttributeBonus(stat) {
    const val = Math.max(0, Number(stat) || 0);
    if (val <= 70) return Math.floor(val / 7);
    else return 10 + Math.floor((val - 70) / 10);
  }

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

    if (badges.length === 0) return '<span style="color:#10b981; font-size:0.68rem; font-weight:700;">💚 Gesund</span>';
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
      <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:6px; padding:0.5rem; margin-top:0.5rem;">
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
    if (mult >= 4.0) return { mult: 4, text: '4× Extrem effektiv!', badgeClass: 'mult-4x' };
    if (mult >= 2.0) return { mult: 2, text: '2× Sehr effektiv!', badgeClass: 'mult-2x' };
    if (mult <= 0.25) return { mult: 0.25, text: '¼× Kaum Schaden', badgeClass: 'mult-quarter' };
    if (mult <= 0.5) return { mult: 0.5, text: '½× Nicht effektiv', badgeClass: 'mult-half' };
    return { mult: 1, text: '1× Normal', badgeClass: '' };
  }

  function getStatusFromMove(move) {
    if (!move) return null;
    const name = (move.name_de || '').toLowerCase();
    const desc = (move.desc_de || '').toLowerCase();

    if (name.includes('konfus') || name.includes('superschall') || name.includes('taumeltanz') || name.includes('verwirr') || desc.includes('verwirrt')) {
      return { type: 'confusion', isConfused: true, confusionTurns: Math.floor(Math.random() * 3) + 2, label: '🌀 Verwirrung' };
    }
    if (name.includes('hypnose') || name.includes('schlafpuder') || name.includes('gesang') || name.includes('gähner') || desc.includes('schlaf')) {
      return { type: 'sleep', status: 'sleep', sleepTurns: Math.floor(Math.random() * 3) + 1, label: '💤 Schlaf' };
    }
    if (name.includes('toxin') || desc.includes('schwer vergiftet')) {
      return { type: 'toxic', status: 'toxic', statusTurns: 1, label: '☠️ Schwere Vergiftung' };
    }
    if (name.includes('giftpuder') || name.includes('giftwolke') || name.includes('gifthauch') || (move.damage_class === 'status' && desc.includes('vergiftet'))) {
      return { type: 'poison', status: 'poison', label: '🟣 Vergiftung' };
    }
    if (name.includes('donnerwelle') || name.includes('stachelspore') || name.includes('schlingen') || (move.damage_class === 'status' && desc.includes('paralysiert'))) {
      return { type: 'paralysis', status: 'paralysis', label: '⚡ Paralyse' };
    }
    if (name.includes('irrlicht') || (move.damage_class === 'status' && desc.includes('verbrennt'))) {
      return { type: 'burn', status: 'burn', label: '🔥 Verbrennung' };
    }
    return null;
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

  // --- DM STATE ---
  const state = {
    activeTab: 'trainers',
    trainers: [],
    network: { localIp: 'localhost', port: 3000 },
    pendingEvolution: null,
    diceHistory: [],
    theme: localStorage.getItem('pnp_theme') || 'dark',
    battleState: { active: true, gridWidth: 20, gridHeight: 14, turnNumber: 1, tokens: [] },
    pendingRequests: [],
    enemyPresets: [],
    selectedTokenId: null,
    selectedMoveIndex: null,
    coneDirection: 'E'
  };

  // --- DOM ELEMENTS ---
  const elements = {
    dmLogoBtn: document.getElementById('dmLogoBtn'),
    navTabs: document.querySelectorAll('.nav-tab-btn'),
    dmTrainersCount: document.getElementById('dmTrainersCount'),
    dmEnemiesCount: document.getElementById('dmEnemiesCount'),
    dmLiveStatusBadge: document.getElementById('dmLiveStatusBadge'),
    dmLiveStatusText: document.getElementById('dmLiveStatusText'),
    btnSharePlayerLink: document.getElementById('btnSharePlayerLink'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),

    // Views
    dmTabTrainers: document.getElementById('dmTabTrainers'),
    dmTabBattle: document.getElementById('dmTabBattle'),
    dmTabEnemies: document.getElementById('dmTabEnemies'),
    dmTabEvolutions: document.getElementById('dmTabEvolutions'),
    dmTabItems: document.getElementById('dmTabItems'),
    dmTabPokedex: document.getElementById('dmTabPokedex'),
    dmTabTools: document.getElementById('dmTabTools'),

    // Battle View & Turns
    dmTurnBar: document.getElementById('dmTurnBar'),
    dmRoundNumber: document.getElementById('dmRoundNumber'),
    btnDmResetRound: document.getElementById('btnDmResetRound'),
    dmRequestsPanel: document.getElementById('dmRequestsPanel'),
    dmRequestsBadge: document.getElementById('dmRequestsBadge'),
    dmRequestsList: document.getElementById('dmRequestsList'),
    dmBattleGrid: document.getElementById('dmBattleGrid'),
    btnDmClearBattleMap: document.getElementById('btnDmClearBattleMap'),
    btnDmOpenAddEnemyModal: document.getElementById('btnDmOpenAddEnemyModal'),
    battleTokensCountBadge: document.getElementById('battleTokensCountBadge'),
    dmSelectedTokenBox: document.getElementById('dmSelectedTokenBox'),
    dmSelectedTokenContent: document.getElementById('dmSelectedTokenContent'),
    dmQuickEnemySpawnsList: document.getElementById('dmQuickEnemySpawnsList'),
    dmQuickPlayerSpawnsList: document.getElementById('dmQuickPlayerSpawnsList'),
    linkToEnemiesTab: document.getElementById('linkToEnemiesTab'),

    // Enemies View
    btnDmCreateNewEnemy: document.getElementById('btnDmCreateNewEnemy'),
    dmEnemiesPresetsGrid: document.getElementById('dmEnemiesPresetsGrid'),

    // Create Enemy Modal
    createEnemyModal: document.getElementById('createEnemyModal'),
    createEnemyCloseBtn: document.getElementById('createEnemyCloseBtn'),
    createEnemyCancelBtn: document.getElementById('createEnemyCancelBtn'),
    createEnemySaveBtn: document.getElementById('createEnemySaveBtn'),
    enemyNewNicknameInput: document.getElementById('enemyNewNicknameInput'),
    enemyNewSpeciesSelect: document.getElementById('enemyNewSpeciesSelect'),
    enemyNewLevelInput: document.getElementById('enemyNewLevelInput'),
    enemyNewNatureSelect: document.getElementById('enemyNewNatureSelect'),
    enemyNewCategorySelect: document.getElementById('enemyNewCategorySelect'),

    // Trainers Tab
    btnDmNewTrainer: document.getElementById('btnDmNewTrainer'),
    btnDmAssignPokemon: document.getElementById('btnDmAssignPokemon'),
    dmTrainersListContainer: document.getElementById('dmTrainersListContainer'),

    // Evolutions Tab
    dmEvolutionsGrid: document.getElementById('dmEvolutionsGrid'),

    // Items Tab
    dmItemTargetTrainerSelect: document.getElementById('dmItemTargetTrainerSelect'),
    dmItemCatalogSelect: document.getElementById('dmItemCatalogSelect'),
    dmItemCountInput: document.getElementById('dmItemCountInput'),
    btnDmSendItem: document.getElementById('btnDmSendItem'),
    dmItemsCatalogGrid: document.getElementById('dmItemsCatalogGrid'),

    // Pokedex Tab
    dmPokedexSearch: document.getElementById('dmPokedexSearch'),
    dmPokedexSort: document.getElementById('dmPokedexSort'),
    dmPokedexGrid: document.getElementById('dmPokedexGrid'),

    // Tools Tab
    dmLiveRollsList: document.getElementById('dmLiveRollsList'),
    dmDiceMainResult: document.getElementById('dmDiceMainResult'),
    dmDiceResultLabel: document.getElementById('dmDiceResultLabel'),

    // Evolution Modal
    evolutionConfirmModal: document.getElementById('evolutionConfirmModal'),
    evoConfirmCloseBtn: document.getElementById('evoConfirmCloseBtn'),
    evoConfirmCancelBtn: document.getElementById('evoConfirmCancelBtn'),
    evoConfirmExecuteBtn: document.getElementById('evoConfirmExecuteBtn'),
    evoSourceSprite: document.getElementById('evoSourceSprite'),
    evoSourceName: document.getElementById('evoSourceName'),
    evoTargetSprite: document.getElementById('evoTargetSprite'),
    evoTargetName: document.getElementById('evoTargetName'),
    evoConfirmMessage: document.getElementById('evoConfirmMessage'),

    // Share Link Modal
    shareLinkModal: document.getElementById('shareLinkModal'),
    shareLinkCloseBtn: document.getElementById('shareLinkCloseBtn'),
    shareTrainerUrlInput: document.getElementById('shareTrainerUrlInput'),
    btnCopyTrainerUrl: document.getElementById('btnCopyTrainerUrl'),
    shareDownloadHubLink: document.getElementById('shareDownloadHubLink'),

    // Toast
    toastNotice: document.getElementById('toastNotice')
  };

  // --- INITIALIZATION ---
  function init() {
    setupTheme();
    loadNetworkInfo();
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

  function setupDataAndStart() {
    const data = window.POKEDEX_DATA;
    if (!data || !data.pokemon) {
      fetch('data/pokedex_gen1_5.json')
        .then(r => r.json())
        .then(d => {
          window.POKEDEX_DATA = d;
          bootstrap(d);
        })
        .catch(e => console.error('Data error:', e));
    } else {
      bootstrap(data);
    }
  }

  function bootstrap(data) {
    ALL_POKEMON = data.pokemon;
    ALL_MOVES = data.moves;
    ALL_TYPES = data.types;
    ALL_NATURES = data.natures;
    ALL_EVOLUTIONS = data.evolutions || {};
    ALL_ITEMS = data.items || [];

    bindEvents();
    populateItemsCatalog();
    renderPokedexGrid();
    checkDmAuth();
    connectSseStream();
    fetchGameState();
    setInterval(fetchGameState, 2500);
  }

  // --- DM AUTHENTICATION (PASSWORD GATE) ---
  const DM_PASSWORD = 'Ni00JeLuna';

  function checkDmAuth() {
    const isAuth = sessionStorage.getItem('dm_authenticated') === 'true';
    const overlay = document.getElementById('dmAuthOverlay');
    if (overlay) {
      if (isAuth) {
        overlay.style.display = 'none';
      } else {
        overlay.style.display = 'flex';
        setTimeout(() => document.getElementById('dmPasswordInput')?.focus(), 150);
      }
    }
  }

  function submitDmLogin() {
    const pwdInput = document.getElementById('dmPasswordInput');
    const errEl = document.getElementById('dmLoginError');
    if (pwdInput && pwdInput.value.trim() === DM_PASSWORD) {
      sessionStorage.setItem('dm_authenticated', 'true');
      const overlay = document.getElementById('dmAuthOverlay');
      if (overlay) overlay.style.display = 'none';
      if (errEl) errEl.style.display = 'none';
      showToast('Willkommen, Spielleiter!');
    } else {
      if (errEl) errEl.style.display = 'block';
      if (pwdInput) {
        pwdInput.value = '';
        pwdInput.focus();
      }
    }
  }
  window.submitDmLogin = submitDmLogin;

  // --- LIVE SYNC & SSE ---
  function connectSseStream() {
    try {
      const evtSource = new EventSource('/api?endpoint=events');
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleLiveServerEvent(data);
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      evtSource.onopen = () => {
        elements.dmLiveStatusBadge.style.color = '#34d399';
        elements.dmLiveStatusBadge.style.borderColor = 'rgba(16,185,129,0.4)';
        elements.dmLiveStatusText.textContent = 'Live Server Verbunden';
      };

      evtSource.onerror = () => {
        elements.dmLiveStatusBadge.style.color = '#f59e0b';
        elements.dmLiveStatusBadge.style.borderColor = 'rgba(245,158,11,0.4)';
        elements.dmLiveStatusText.textContent = 'Verbindung trennt (Reconnecting...)';
      };
    } catch (e) {
      console.warn('SSE nicht verfügbar, nutze lokales Polling.');
    }
  }

  function handleLiveServerEvent(evt) {
    const { type, payload } = evt;
    console.log('[DM SSE]', type);

    switch (type) {
      case 'STATE_UPDATED':
        if (payload.trainers) state.trainers = payload.trainers;
        if (payload.battleState) state.battleState = payload.battleState;
        if (payload.enemyPresets) state.enemyPresets = payload.enemyPresets;
        if (payload.pendingRequests) state.pendingRequests = payload.pendingRequests;
        renderTrainersView();
        renderEvolutionsView();
        updateItemTrainerSelect();
        renderBattleMapView();
        renderEnemiesView();
        renderRequestsPanel();
        break;

      case 'ACTION_REQUEST_SUBMITTED':
        state.pendingRequests = state.pendingRequests || [];
        state.pendingRequests.push(payload);
        renderRequestsPanel();
        showToast(`🔔 Neue Spieler-Anfrage von ${payload.trainerName}: ${payload.type === 'MOVE' ? 'Bewegung' : 'Angriff'}!`);
        break;

      case 'ACTION_REQUEST_REJECTED':
      case 'BATTLE_ROUND_RESET':
      case 'BATTLE_TOKEN_MOVED':
      case 'BATTLE_TOKEN_SPAWNED':
      case 'BATTLE_TOKEN_REMOVED':
      case 'BATTLE_DAMAGE_APPLIED':
      case 'POKEMON_HEALED':
      case 'AP_RESTORED':
        fetchGameState();
        break;

      case 'DICE_ROLLED':
        addLiveRollLog(payload);
        break;

      case 'POKEMON_EVOLVED':
        showToast(`✨ ${payload.oldName} hat sich zu ${payload.newName} entwickelt!`);
        break;

      case 'ITEM_RECEIVED':
        showToast(`🎒 Item "${payload.item.name_de}" vergeben.`);
        break;

      case 'ITEM_USED':
        showToast(`🎒 Ein Spieler hat ein Item verwendet.`);
        break;

      case 'HP_UPDATED':
        updateTrainerHpDom(payload.trainerId, payload.pokemonUid, payload.currentHp);
        break;
    }
  }

  function fetchGameState() {
    fetch('/api?endpoint=state')
      .then(r => r.json())
      .then(gameState => {
        if (gameState.version) {
          try {
            const localCached = localStorage.getItem('pnp_saved_gamestate');
            if (localCached) {
              const cached = JSON.parse(localCached);
              if (cached && cached.version && cached.version > gameState.version) {
                console.log('[DM] Restoring newer state to server...');
                sendAction('SYNC_STATE', cached);
                return;
              }
            }
            localStorage.setItem('pnp_saved_gamestate', JSON.stringify(gameState));
          } catch (e) {}
        }
        state.trainers = gameState.trainers || [];
        state.diceHistory = gameState.diceHistory || [];
        state.battleState = gameState.battleState || { active: true, gridWidth: 20, gridHeight: 14, turnNumber: 1, tokens: [] };
        state.pendingRequests = gameState.pendingRequests || [];
        state.enemyPresets = gameState.enemyPresets || [];
        renderTrainersView();
        renderEvolutionsView();
        updateItemTrainerSelect();
        renderLiveRollsList();
        renderBattleMapView();
        renderEnemiesView();
        renderRequestsPanel();
      })
      .catch(() => {
        state.trainers = JSON.parse(localStorage.getItem('pnp_trainers') || '[]');
        renderTrainersView();
        renderEvolutionsView();
        updateItemTrainerSelect();
      });
  }

  function sendAction(actionType, payload) {
    fetch('/api?endpoint=action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: actionType, payload })
    }).catch(e => console.error('Action error:', e));
  }

  function loadNetworkInfo() {
    fetch('/api?endpoint=network')
      .then(r => r.json())
      .then(net => {
        state.network = net;
        elements.shareTrainerUrlInput.value = net.trainerUrl;
      })
      .catch(() => {
        elements.shareTrainerUrlInput.value = window.location.origin + '/trainer.html';
      });
  }

  // --- NAVIGATION ---
  function switchTab(tabName) {
    state.activeTab = tabName;
    elements.navTabs.forEach(t => t.classList.toggle('active', t.dataset.dmtab === tabName));

    elements.dmTabTrainers.classList.toggle('active', tabName === 'trainers');
    elements.dmTabBattle.classList.toggle('active', tabName === 'battle');
    elements.dmTabEnemies.classList.toggle('active', tabName === 'enemies');
    elements.dmTabEvolutions.classList.toggle('active', tabName === 'evolutions');
    elements.dmTabItems.classList.toggle('active', tabName === 'items');
    elements.dmTabPokedex.classList.toggle('active', tabName === 'pokedex');
    elements.dmTabTools.classList.toggle('active', tabName === 'tools');

    if (tabName === 'battle') renderBattleMapView();
    if (tabName === 'enemies') renderEnemiesView();
    if (tabName === 'evolutions') renderEvolutionsView();
    if (tabName === 'trainers') renderTrainersView();
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    elements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.dmtab));
    });

    elements.dmLogoBtn.addEventListener('click', () => switchTab('trainers'));
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Battle map actions
    if (elements.btnDmResetRound) {
      elements.btnDmResetRound.addEventListener('click', () => {
        sendAction('BATTLE_RESET_ROUND', {});
        showToast('🔄 Neue Runde gestartet! Alle Bewegungspunkte zurückgesetzt.');
      });
    }

    if (elements.btnDmClearBattleMap) {
      elements.btnDmClearBattleMap.addEventListener('click', () => {
        if (confirm('Wirklich alle Einheiten vom Kampffeld entfernen?')) {
          sendAction('BATTLE_CLEAR_TOKENS', {});
          state.battleState.tokens = [];
          state.selectedTokenId = null;
          renderBattleMapView();
        }
      });
    }

    if (elements.btnDmOpenAddEnemyModal) {
      elements.btnDmOpenAddEnemyModal.addEventListener('click', openCreateEnemyModal);
    }
    if (elements.btnDmCreateNewEnemy) {
      elements.btnDmCreateNewEnemy.addEventListener('click', openCreateEnemyModal);
    }
    if (elements.createEnemyCloseBtn) {
      elements.createEnemyCloseBtn.addEventListener('click', closeCreateEnemyModal);
    }
    if (elements.createEnemyCancelBtn) {
      elements.createEnemyCancelBtn.addEventListener('click', closeCreateEnemyModal);
    }
    if (elements.createEnemySaveBtn) {
      elements.createEnemySaveBtn.addEventListener('click', saveNewEnemyPreset);
    }
    if (elements.linkToEnemiesTab) {
      elements.linkToEnemiesTab.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('enemies');
      });
    }

    // Share link modal
    elements.btnSharePlayerLink.addEventListener('click', () => elements.shareLinkModal.classList.add('open'));
    elements.shareLinkCloseBtn.addEventListener('click', () => elements.shareLinkModal.classList.remove('open'));
    elements.btnCopyTrainerUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(elements.shareTrainerUrlInput.value);
      showToast('Spieler-Link in die Zwischenablage kopiert!');
    });

    // Evolution Confirm Modal
    elements.evoConfirmCloseBtn.addEventListener('click', () => elements.evolutionConfirmModal.classList.remove('open'));
    elements.evoConfirmCancelBtn.addEventListener('click', () => elements.evolutionConfirmModal.classList.remove('open'));
    elements.evoConfirmExecuteBtn.addEventListener('click', executeConfirmedEvolution);

    // Trainer actions
    elements.btnDmNewTrainer.addEventListener('click', promptCreateTrainer);
    elements.btnDmAssignPokemon.addEventListener('click', promptAssignPokemon);

    // Item Send
    elements.btnDmSendItem.addEventListener('click', handleSendItemToPlayer);

    // DM Dice
    document.querySelectorAll('.dm-dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides, 10);
        rollDmDice(sides);
      });
    });

    // Pokedex Search
    elements.dmPokedexSearch.addEventListener('input', () => renderPokedexGrid());
    elements.dmPokedexSort.addEventListener('change', () => renderPokedexGrid());

    // DM Logout
    const btnLogout = document.getElementById('btnDmLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('dm_authenticated');
        checkDmAuth();
        showToast('Spielleiter abgemeldet.');
      });
    }
  }

  // --- TRAINERS VIEW (LIVE TEAM MONITORING) ---
  function renderTrainersView() {
    elements.dmTrainersCount.textContent = state.trainers.length;
    elements.dmTrainersListContainer.innerHTML = '';

    if (state.trainers.length === 0) {
      elements.dmTrainersListContainer.innerHTML = `
        <div class="empty-state">
          <h3>Keine Trainer vorhanden</h3>
          <p>Klicke oben auf <strong>"+ Neuer Trainer"</strong>, um Spielercharaktere anzulegen.</p>
        </div>
      `;
      return;
    }

    state.trainers.forEach((trainer) => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.style.background = 'var(--bg-secondary)';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div style="width:44px; height:44px; background:var(--bg-tertiary); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
              🧢
            </div>
            <div>
              <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-highlight);">${trainer.name}</h3>
              <div style="font-size:0.75rem; color:var(--text-muted);">${trainer.role} • ${trainer.pokemon.length} Pokémon • ${trainer.items?.length || 0} Items</div>
            </div>
          </div>

          <div style="display:flex; gap:0.4rem;">
            <button class="btn-primary btn-quick-assign-to-trainer" data-tid="${trainer.id}" style="padding:0.35rem 0.75rem; font-size:0.75rem;">
              + Pokémon geben
            </button>
            <button class="icon-btn btn-delete-trainer-dm" data-tid="${trainer.id}" style="color:#ef4444; width:32px; height:32px;" title="Trainer löschen">
              ✕
            </button>
          </div>
        </div>

        <!-- Pokemon Cards Grid for this Trainer -->
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1rem;">
          ${trainer.pokemon.map(p => renderTrainerPokemonCardHtml(trainer.id, p)).join('')}
          ${trainer.pokemon.length === 0 ? '<div style="font-size:0.8rem; color:var(--text-muted); padding:1rem; font-style:italic;">Noch keine Pokémon im Team.</div>' : ''}
        </div>
      `;

      card.querySelector('.btn-quick-assign-to-trainer').addEventListener('click', () => {
        promptAssignPokemon(trainer.id);
      });

      card.querySelector('.btn-delete-trainer-dm').addEventListener('click', () => {
        if (confirm(`Trainer "${trainer.name}" wirklich löschen?`)) {
          sendAction('DELETE_TRAINER', { trainerId: trainer.id });
        }
      });

      // Bind HP and action buttons inside cards
      bindTrainerCardActions(card, trainer.id);

      elements.dmTrainersListContainer.appendChild(card);
    });
  }

  function renderTrainerPokemonCardHtml(trainerId, poke) {
    const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
    if (!pData) return '';

    const hpPercent = Math.max(0, Math.min(100, Math.round((poke.currentHp / poke.maxHp) * 100)));
    let hpColor = '#10b981';
    if (hpPercent <= 20) hpColor = '#ef4444';
    else if (hpPercent <= 50) hpColor = '#f59e0b';

    return `
      <div class="team-pokemon-card" style="padding:1rem; background:var(--bg-tertiary);" data-puid="${poke.uid}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <img src="${pData.sprites.front_default}" alt="" style="width:52px; height:52px;" class="pixelated" onerror="this.src='${pData.sprites.front_static}'">
            <div>
              <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                <span style="font-weight:900; font-size:1.05rem; color:var(--text-highlight);">${poke.nickname}</span>
                ${getStatusDisplayBadge(poke)}
              </div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.15rem;">#${String(pData.id).padStart(3, '0')} ${pData.name_de} • Wesen: <strong style="color:var(--accent-gold);">${poke.nature}</strong></div>
              <div style="display:flex; gap:0.3rem; margin-top:0.3rem;">
                ${(pData.types || []).map(t => getTypeBadgeHtml(t.identifier, t.name_de)).join('')}
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <button class="btn-secondary dm-btn-lvl-down" data-tid="${trainerId}" data-puid="${poke.uid}" style="padding:0.2rem 0.45rem; font-size:0.72rem; font-weight:800;" title="-1 Level verringern">-1</button>
            <span class="level-badge-large" style="font-size:0.78rem; padding:0.2rem 0.5rem;">Lv. ${poke.level}</span>
            <button class="btn-primary dm-btn-lvl-up" data-tid="${trainerId}" data-puid="${poke.uid}" style="padding:0.2rem 0.55rem; font-size:0.72rem; font-weight:800; background:linear-gradient(135deg, #10b981, #059669);" title="+1 Level erhöhen">+ Lv. Up</button>
          </div>
        </div>

        <!-- Live HP Tracker & Status Buttons -->
        <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:0.5rem; margin-bottom:0.6rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; margin-bottom:0.25rem;">
            <span>KP (Live):</span>
            <span style="font-family:var(--font-mono); color:${hpColor};" class="poke-hp-text">${poke.currentHp} / ${poke.maxHp}</span>
          </div>
          <div class="hp-bar-track" style="height:8px; margin-bottom:0.4rem;">
            <div class="hp-bar-fill poke-hp-fill" style="width:${hpPercent}%; background-color:${hpColor};"></div>
          </div>
          <div style="display:flex; gap:0.25rem;">
            <button class="hp-btn dm-hp-delta" data-delta="-10">-10</button>
            <button class="hp-btn dm-hp-delta" data-delta="-5">-5</button>
            <button class="hp-btn dm-hp-delta" data-delta="-1">-1</button>
            <div style="flex:1;"></div>
            <button class="hp-btn dm-hp-delta" data-delta="1">+1</button>
            <button class="hp-btn dm-hp-delta" data-delta="5">+5</button>
            <button class="hp-btn dm-hp-delta" data-delta="10">+10</button>
          </div>

          <!-- Quick DM Status Setter -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.45rem; padding-top:0.4rem; border-top:1px solid rgba(255,255,255,0.06); font-size:0.7rem;">
            <span style="color:var(--text-muted); font-weight:700;">STATUS:</span>
            <div style="display:flex; gap:0.2rem; flex-wrap:wrap;">
              <button class="hp-btn dm-status-set ${(!poke.status || poke.status === 'none') ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" data-status="none" title="Normal / Gesund">💚</button>
              <button class="hp-btn dm-status-set ${poke.status === 'burn' ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" data-status="burn" title="Verbrennung">🔥</button>
              <button class="hp-btn dm-status-set ${poke.status === 'poison' ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" data-status="poison" title="Gift">🟣</button>
              <button class="hp-btn dm-status-set ${poke.status === 'paralysis' ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" data-status="paralysis" title="Paralyse">⚡</button>
              <button class="hp-btn dm-status-set ${poke.status === 'sleep' ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" data-status="sleep" title="Schlaf">💤</button>
              <button class="hp-btn dm-status-set ${poke.status === 'freeze' ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" data-status="freeze" title="Frost">❄️</button>
              <button class="hp-btn dm-confusion-toggle ${poke.isConfused ? 'active' : ''}" data-tid="${trainerId}" data-puid="${poke.uid}" title="Verwirrung">🌀</button>
            </div>
          </div>
        </div>

        <!-- 4 Moves Preview -->
        <div style="font-size:0.7rem; color:var(--text-muted); font-weight:700; margin-bottom:0.25rem;">ATTACKEN:</div>
        <div style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.72rem; margin-bottom:0.5rem;">
          ${poke.selectedMoves.map(mid => {
            const m = ALL_MOVES[String(mid)];
            return `<div style="background:rgba(255,255,255,0.04); padding:0.25rem 0.45rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
              <strong>${m ? m.name_de : 'Attacke'}</strong>
              <div style="display:flex; align-items:center; gap:0.35rem;">
                <span style="font-family:var(--font-mono); color:var(--text-secondary); font-size:0.68rem;">Stärke: ${m ? getMovePowerDisplay(m) : '-'}</span>
                ${m ? getTypeBadgeHtml(m.type_name, m.type_de) : ''}
              </div>
            </div>`;
          }).join('')}
        </div>

        <!-- Type Weaknesses & Resistances -->
        ${renderTypeWeaknessesHtml(pData)}

        <!-- Field Status & Spawn / Recall Toggle Button -->
        <div style="margin-top:0.6rem; padding-top:0.5rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:0.75rem;">
            ${(() => {
              const mapToken = state.battleState?.tokens?.find(t => t.pokemonUid === poke.uid);
              if (mapToken) {
                return `<span style="color:#10b981; font-weight:800;">📍 Auf Kampfkarte (${String.fromCharCode(65 + mapToken.x)}${mapToken.y + 1})</span>`;
              }
              return `<span style="color:var(--text-muted); font-style:italic;">⚪ Nicht auf der Karte (im Ball)</span>`;
            })()}
          </div>
          ${(() => {
            const mapToken = state.battleState?.tokens?.find(t => t.pokemonUid === poke.uid);
            if (mapToken) {
              return `
                <button class="btn-secondary dm-btn-toggle-field" data-tid="${trainerId}" data-puid="${poke.uid}" data-action="recall" style="padding:0.25rem 0.65rem; font-size:0.75rem; color:#ef4444; border-color:rgba(239,68,68,0.5); font-weight:800; background:rgba(239,68,68,0.1);">
                  🔴 Vom Feld nehmen
                </button>
              `;
            }
            return `
              <button class="btn-primary dm-btn-toggle-field" data-tid="${trainerId}" data-puid="${poke.uid}" data-action="spawn" style="padding:0.25rem 0.65rem; font-size:0.75rem; font-weight:800;">
                ⚔️ Aufs Feld setzen
              </button>
            `;
          })()}
        </div>
      </div>
    `;
  }

  function bindTrainerCardActions(container, trainerId) {
    container.querySelectorAll('.team-pokemon-card').forEach(card => {
      const puid = card.dataset.puid;
      const trainer = state.trainers.find(t => t.id === trainerId);
      const poke = trainer?.pokemon.find(p => p.uid === puid);

      // Field toggle button (Aufs Feld / Vom Feld nehmen)
      card.querySelectorAll('.dm-btn-toggle-field').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action === 'recall') {
            const mapToken = state.battleState?.tokens?.find(t => t.pokemonUid === puid);
            if (mapToken) {
              sendAction('BATTLE_REMOVE_TOKEN', { tokenId: mapToken.id, pokemonUid: puid });
              state.battleState.tokens = state.battleState.tokens.filter(t => t.id !== mapToken.id);
              if (state.selectedTokenId === mapToken.id) state.selectedTokenId = null;
              renderTrainersView();
              renderBattleMapView();
              fetchGameState();
              showToast(`"${poke.nickname}" vom Feld genommen.`);
            }
          } else {
            spawnPlayerPokemon(trainerId, puid);
            switchTab('battle');
          }
        });
      });

      // DM Level Up button
      const lvlBtn = card.querySelector('.dm-btn-lvl-up');
      if (lvlBtn) {
        lvlBtn.addEventListener('click', () => {
          if (!poke) return;
          const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
          if (!pData) return;
          const newLevel = Math.min(100, poke.level + 1);
          const customHp = (poke.customStats && poke.customStats.hp) || 0;
          const newMaxHp = calculateStat(pData.base_stats.hp, 'hp', newLevel, 31, 0, poke.nature) + customHp;
          const hpGain = Math.max(0, newMaxHp - poke.maxHp);
          sendAction('LEVEL_UP_POKEMON', {
            trainerId,
            pokemonUid: puid,
            delta: 1,
            newMaxHp: newMaxHp
          });
          const healMsg = hpGain > 0 ? ` (+${hpGain} KP automatisch geheilt)` : '';
          showToast(`🎉 "${poke.nickname}" auf Level ${newLevel} erhöht!${healMsg}`);
          fetchGameState();
        });
      }

      // DM Level Down button
      const lvlDownBtn = card.querySelector('.dm-btn-lvl-down');
      if (lvlDownBtn) {
        lvlDownBtn.addEventListener('click', () => {
          if (!poke || poke.level <= 1) return;
          const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
          if (!pData) return;
          const newLevel = Math.max(1, poke.level - 1);
          const customHp = (poke.customStats && poke.customStats.hp) || 0;
          const newMaxHp = calculateStat(pData.base_stats.hp, 'hp', newLevel, 31, 0, poke.nature) + customHp;
          sendAction('LEVEL_UP_POKEMON', {
            trainerId,
            pokemonUid: puid,
            delta: -1,
            newMaxHp: newMaxHp
          });
          showToast(`"${poke.nickname}" auf Level ${newLevel} verringert.`);
          fetchGameState();
        });
      }

      card.querySelectorAll('.dm-hp-delta').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!poke) return;
          const delta = parseInt(btn.dataset.delta, 10);
          const newHp = Math.max(0, Math.min(poke.maxHp, poke.currentHp + delta));
          poke.currentHp = newHp;
          sendAction('UPDATE_POKEMON_HP', { trainerId, pokemonUid: puid, currentHp: newHp });
          updateTrainerHpDom(trainerId, puid, newHp);
        });
      });

      // DM Status Setter
      card.querySelectorAll('.dm-status-set').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!poke) return;
          const newStatus = btn.dataset.status;
          sendAction('SET_POKEMON_STATUS', { trainerId, pokemonUid: puid, status: newStatus });
          showToast(`Status von "${poke.nickname}" geändert!`);
          fetchGameState();
        });
      });

      // DM Confusion Toggle
      const confBtn = card.querySelector('.dm-confusion-toggle');
      if (confBtn) {
        confBtn.addEventListener('click', () => {
          if (!poke) return;
          const nextConf = !poke.isConfused;
          sendAction('SET_POKEMON_STATUS', { trainerId, pokemonUid: puid, isConfused: nextConf });
          showToast(`Verwirrung von "${poke.nickname}" ${nextConf ? 'aktiviert' : 'aufgehoben'}!`);
          fetchGameState();
        });
      }
    });
  }

  function updateTrainerHpDom(trainerId, puid, newHp) {
    const card = document.querySelector(`.team-pokemon-card[data-puid="${puid}"]`);
    if (!card) return;
    const trainer = state.trainers.find(t => t.id === trainerId);
    const poke = trainer?.pokemon.find(p => p.uid === puid);
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

  // --- EVOLUTIONS CENTER (DM DECIDES ALL EVOLUTIONS) ---
  function renderEvolutionsView() {
    elements.dmEvolutionsGrid.innerHTML = '';
    let foundEvoCandidates = 0;

    state.trainers.forEach(trainer => {
      trainer.pokemon.forEach(poke => {
        const evos = ALL_EVOLUTIONS[String(poke.pokemonId)] || [];
        if (evos.length === 0) return;

        foundEvoCandidates++;
        const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);

        const card = document.createElement('div');
        card.className = 'tool-card';
        card.style.background = 'var(--bg-secondary)';

        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem; margin-bottom:0.75rem;">
            <img src="${pData.sprites.front_default}" alt="" style="width:56px; height:56px;" class="pixelated">
            <div>
              <div style="font-weight:900; font-size:1.15rem; color:var(--text-highlight);">${poke.nickname}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">
                Trainer: <strong>${trainer.name}</strong> • Aktuell: Lv. ${poke.level} (${pData.name_de})
              </div>
            </div>
          </div>

          <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">
            Mögliche Entwicklungen:
          </div>

          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${evos.map(evo => {
              const targetData = ALL_POKEMON.find(p => p.id === evo.target_id);
              const isLevelEvo = evo.type === 'level';
              const canLevelEvolve = !isLevelEvo || (poke.level >= (evo.min_level || 0));

              let badgeColor = '#3b82f6';
              if (evo.type === 'item') badgeColor = '#f59e0b';
              else if (evo.type === 'trade') badgeColor = '#8b5cf6';
              else if (evo.type === 'location') badgeColor = '#10b981';

              let btnLabel = `✨ Zu ${evo.target_name_de} entwickeln`;
              let btnClass = 'btn-primary';
              let btnDisabled = '';

              if (isLevelEvo && !canLevelEvolve) {
                btnLabel = `Benötigt Lv. ${evo.min_level} (Aktuell Lv. ${poke.level})`;
                btnClass = 'btn-secondary';
                btnDisabled = 'disabled style="opacity:0.5; cursor:not-allowed;"';
              }

              return `
                <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:0.65rem; display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
                  <div style="display:flex; align-items:center; gap:0.5rem;">
                    <img src="${targetData ? targetData.sprites.front_default : ''}" alt="" style="width:40px; height:40px;" class="pixelated">
                    <div>
                      <div style="font-weight:800; font-size:0.88rem; color:#93c5fd;">${evo.target_name_de}</div>
                      <div style="font-size:0.7rem; color:${badgeColor}; font-weight:700;">${evo.desc}</div>
                    </div>
                  </div>
                  <button class="${btnClass} btn-trigger-evo" data-tid="${trainer.id}" data-puid="${poke.uid}" data-targetid="${evo.target_id}" ${btnDisabled}>
                    ${btnLabel}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `;

        card.querySelectorAll('.btn-trigger-evo:not([disabled])').forEach(btn => {
          btn.addEventListener('click', () => {
            const tid = btn.dataset.tid;
            const puid = btn.dataset.puid;
            const targetId = parseInt(btn.dataset.targetid, 10);
            promptEvolutionConfirmation(tid, puid, targetId);
          });
        });

        elements.dmEvolutionsGrid.appendChild(card);
      });
    });

    if (foundEvoCandidates === 0) {
      elements.dmEvolutionsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>Keine entwickelbaren Pokémon im Spiel</h3>
          <p>Sobald Trainer Pokémon besitzen, die sich per Level, Item, Tausch oder Ort entwickeln können, erscheinen sie hier.</p>
        </div>
      `;
    }
  }

  // --- CONFIRMATION MODAL BEFORE EVOLVING (USER REQUIREMENT) ---
  function promptEvolutionConfirmation(trainerId, puid, targetId) {
    const trainer = state.trainers.find(t => t.id === trainerId);
    const poke = trainer?.pokemon.find(p => p.uid === puid);
    const sourceData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
    const targetData = ALL_POKEMON.find(p => p.id === targetId);

    if (!trainer || !poke || !sourceData || !targetData) return;

    state.pendingEvolution = {
      trainerId,
      pokemonUid: puid,
      targetId,
      targetNameDe: targetData.name_de,
      sourceData,
      targetData,
      poke
    };

    elements.evoSourceSprite.src = sourceData.sprites.front_default;
    elements.evoSourceName.textContent = `${poke.nickname} (${sourceData.name_de})`;
    elements.evoTargetSprite.src = targetData.sprites.front_default;
    elements.evoTargetName.textContent = targetData.name_de;

    elements.evoConfirmMessage.innerHTML = `
      Möchtest du <strong>"${poke.nickname}"</strong> von Trainer <strong>"${trainer.name}"</strong> wirklich zu <strong>${targetData.name_de}</strong> entwickeln?
    `;

    elements.evolutionConfirmModal.classList.add('open');
  }

  function executeConfirmedEvolution() {
    if (!state.pendingEvolution) return;
    const { trainerId, pokemonUid, targetId, targetNameDe, poke, targetData } = state.pendingEvolution;

    // Calculate new max HP based on target Pokémon base stats
    const newMaxHp = calculateStat(targetData.base_stats.hp, 'hp', poke.level, 31, 0, poke.nature);

    sendAction('EVOLVE_POKEMON', {
      trainerId,
      pokemonUid,
      targetId,
      targetNameDe,
      newMaxHp
    });

    elements.evolutionConfirmModal.classList.remove('open');
    showToast(`✨ "${poke.nickname}" entwickelt sich zu ${targetNameDe}!`);
    state.pendingEvolution = null;

    // Refresh view
    fetchGameState();
  }

  // --- ITEM DISTRIBUTION ---
  function populateItemsCatalog() {
    elements.dmItemCatalogSelect.innerHTML = '';
    elements.dmItemsCatalogGrid.innerHTML = '';

    ALL_ITEMS.forEach(item => {
      // Option
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `[${item.category.toUpperCase()}] ${item.name_de}`;
      elements.dmItemCatalogSelect.appendChild(opt);

      // Card in Preview
      const card = document.createElement('div');
      card.style.background = 'var(--bg-tertiary)';
      card.style.border = '1px solid var(--border-color)';
      card.style.borderRadius = '8px';
      card.style.padding = '0.65rem';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '0.6rem';

      card.innerHTML = `
        <img src="${item.icon}" alt="" style="width:36px; height:36px;" class="pixelated">
        <div>
          <div style="font-weight:800; font-size:0.82rem; color:var(--text-highlight);">${item.name_de}</div>
          <div style="font-size:0.68rem; color:var(--text-muted); line-height:1.2;">${item.desc}</div>
        </div>
      `;
      elements.dmItemsCatalogGrid.appendChild(card);
    });
  }

  function updateItemTrainerSelect() {
    elements.dmItemTargetTrainerSelect.innerHTML = '';
    state.trainers.forEach(trainer => {
      const opt = document.createElement('option');
      opt.value = trainer.id;
      opt.textContent = `${trainer.name} (${trainer.role})`;
      elements.dmItemTargetTrainerSelect.appendChild(opt);
    });
  }

  function handleSendItemToPlayer() {
    const trainerId = elements.dmItemTargetTrainerSelect.value;
    const itemId = elements.dmItemCatalogSelect.value;
    const count = parseInt(elements.dmItemCountInput.value, 10) || 1;

    const trainer = state.trainers.find(t => t.id === trainerId);
    const item = ALL_ITEMS.find(i => i.id === itemId);

    if (!trainer || !item) {
      alert('Bitte wähle einen Trainer und ein Item aus.');
      return;
    }

    sendAction('GIVE_ITEM', { trainerId, item, count });
    showToast(`🎁 ${count}x "${item.name_de}" an ${trainer.name} gesendet!`);
  }

  // --- TRAINER & POKEMON CREATION DIALOGS ---
  function promptCreateTrainer() {
    const name = prompt('Name des neuen Trainers / Spielers:');
    if (!name || !name.trim()) return;
    const role = prompt('Rolle / Klasse (z.B. Pokémon-Trainer, Ass-Trainer, Forscher):', 'Pokémon-Trainer') || 'Pokémon-Trainer';
    sendAction('CREATE_TRAINER', { name: name.trim(), role: role.trim() });
    showToast(`Trainer "${name}" erstellt.`);
  }

  function promptAssignPokemon(preferredTrainerId = null) {
    if (state.trainers.length === 0) {
      alert('Erstelle zuerst mindestens einen Trainer!');
      return;
    }
    const tid = preferredTrainerId || state.trainers[0].id;
    const targetTrainer = state.trainers.find(t => t.id === tid);

    const pidStr = prompt('Welches Pokémon vergeben? (Pokédex-Nummer 1 bis 649 eingeben, z.B. 1 für Bisasam, 4 für Glumanda, 25 für Pikachu):', '4');
    const pid = parseInt(pidStr, 10);
    const p = ALL_POKEMON.find(item => item.id === pid);
    if (!p) {
      alert('Ungültige Pokédex-Nummer!');
      return;
    }

    const nickname = prompt(`Spitzname für ${p.name_de} (Pflichtfeld):`, p.name_de);
    if (!nickname || !nickname.trim()) {
      alert('Ein Spitzname ist erforderlich!');
      return;
    }

    const lvlStr = prompt(`Start-Level für ${nickname}:`, '5');
    const level = Math.max(1, Math.min(100, parseInt(lvlStr, 10) || 5));

    // Roll random nature
    const randomNature = ALL_NATURES[Math.floor(Math.random() * ALL_NATURES.length)].name_de;

    const maxHp = calculateStat(p.base_stats.hp, 'hp', level, 31, 0, randomNature);
    const initialMoves = p.moves.level_up.filter(([lvl]) => lvl <= level).slice(-4).map(([lvl, mid]) => mid);

    const newPoke = {
      uid: 'tpoke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      pokemonId: p.id,
      name_de: p.name_de,
      nickname: nickname.trim(),
      level: level,
      nature: randomNature,
      freePoints: 0,
      customStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      currentHp: maxHp,
      maxHp: maxHp,
      selectedMoves: initialMoves,
      status: []
    };

    sendAction('ASSIGN_POKEMON', { trainerId: tid, pokemon: newPoke });
    showToast(`✨ ${p.name_de} ("${nickname}", Wesen: ${randomNature}) an ${targetTrainer.name} übergeben!`);
  }

  // --- LIVE ROLLS LOG ---
  function addLiveRollLog(rollData) {
    state.diceHistory.unshift(rollData);
    if (state.diceHistory.length > 50) state.diceHistory.pop();
    renderLiveRollsList();
  }

  function renderLiveRollsList() {
    if (state.diceHistory.length === 0) {
      elements.dmLiveRollsList.innerHTML = '<div class="history-item">Noch keine Würfe im aktuellen Spiel.</div>';
      return;
    }

    elements.dmLiveRollsList.innerHTML = state.diceHistory.map(h => `
      <div class="history-item" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span style="color:var(--text-muted); font-size:0.7rem;">[${h.time || ''}]</span>
          <strong style="color:var(--text-highlight);">${h.character || 'Spieler'}:</strong>
          <span style="color:#93c5fd;">${h.sides || 'Wurf'}</span>
        </div>
        <strong style="font-family:var(--font-mono); font-size:1.05rem; color:var(--accent-gold);">${h.roll}</strong>
      </div>
    `).join('');
  }

  function rollDmDice(sides) {
    const roll = Math.floor(Math.random() * sides) + 1;
    elements.dmDiceMainResult.textContent = roll;
    elements.dmDiceResultLabel.textContent = `DM Wurf D${sides}`;

    const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const rollData = { time: now, character: 'DM', sides: `D${sides}`, roll: roll };
    sendAction('DICE_ROLL', rollData);
    addLiveRollLog(rollData);
  }

  // ==========================================================================
  // TAKTISCHE D&D KAMPFKARTE, TOKENS, REICHWEITEN & AOE
  // ==========================================================================

  const GRID_COLS = 20;
  const GRID_ROWS = 14;

  function renderBattleMapView() {
    if (!elements.dmBattleGrid) return;
    if (elements.dmRoundNumber) {
      elements.dmRoundNumber.textContent = String(state.battleState.turnNumber || 1);
    }
    if (elements.battleTokensCountBadge) {
      elements.battleTokensCountBadge.textContent = `${state.battleState.tokens.length} Einheiten auf dem Feld`;
    }
    if (elements.dmEnemiesCount) {
      elements.dmEnemiesCount.textContent = String(state.enemyPresets.length);
    }
    renderRequestsPanel();

    elements.dmBattleGrid.innerHTML = '';
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        const colLetter = String.fromCharCode(65 + x);
        cell.title = `Feld ${colLetter}${y + 1}`;

        // Drag & drop dropzone
        cell.addEventListener('dragover', (e) => e.preventDefault());
        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          const tokenId = e.dataTransfer.getData('text/token-id');
          if (tokenId) {
            moveToken(tokenId, x, y);
          }
        });

        // Click handler on cell
        cell.addEventListener('click', () => {
          if (cell.classList.contains('highlight-move') && state.selectedTokenId) {
            moveToken(state.selectedTokenId, x, y);
            return;
          }

          if (cell.classList.contains('highlight-range') || cell.classList.contains('highlight-aoe-circle') || cell.classList.contains('highlight-cone')) {
            const targetToken = state.battleState.tokens.find(t => t.x === x && t.y === y && t.id !== state.selectedTokenId);
            if (targetToken) {
              handleAttackTargetClick(targetToken);
            }
          }
        });

        elements.dmBattleGrid.appendChild(cell);
      }
    }

    // Place tokens onto their cells
    state.battleState.tokens.forEach(token => {
      const cell = elements.dmBattleGrid.querySelector(`.grid-cell[data-x="${token.x}"][data-y="${token.y}"]`);
      if (!cell) return;

      const pData = ALL_POKEMON.find(p => p.id === token.pokemonId);
      const spriteUrl = token.sprite || (pData ? pData.sprites.front_default : '');

      const hpPercent = Math.max(0, Math.min(100, Math.round((token.currentHp / token.maxHp) * 100)));
      let hpColor = '#10b981';
      if (hpPercent <= 20) hpColor = '#ef4444';
      else if (hpPercent <= 50) hpColor = '#f59e0b';

      const tokenEl = document.createElement('div');
      tokenEl.className = `map-token ${token.isEnemy ? 'is-enemy' : 'is-player'} ${token.id === state.selectedTokenId ? 'selected' : ''} ${token.isProtected ? 'is-protected' : ''} ${token.isEnduring ? 'is-enduring' : ''} ${token.isCountering ? 'is-countering' : ''}`;
      tokenEl.dataset.tid = token.id;
      tokenEl.draggable = true;

      tokenEl.innerHTML = `
        <div class="token-hp-bar">
          <div class="token-hp-fill" style="width:${hpPercent}%; background-color:${hpColor};"></div>
        </div>
        ${renderTokenStatusIconsHtml(token)}
        <img src="${spriteUrl}" alt="" class="pixelated">
        <div class="token-label">${token.nickname} (Lv.${token.level})</div>
      `;

      tokenEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/token-id', token.id);
      });

      tokenEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.selectedTokenId && state.selectedTokenId !== token.id && state.selectedMoveIndex !== null) {
          handleAttackTargetClick(token);
          return;
        }
        selectToken(token.id);
      });

      cell.appendChild(tokenEl);
    });

    if (state.selectedTokenId) {
      applyHighlights();
    }

    renderSelectedTokenBox();
    renderQuickSpawners();
  }

  function selectToken(tokenId) {
    state.selectedTokenId = tokenId;
    state.selectedMoveIndex = null;
    renderBattleMapView();
  }

  function applyHighlights() {
    clearGridHighlights();
    const token = state.battleState.tokens.find(t => t.id === state.selectedTokenId);
    if (!token) return;

    // Attack Range / AoE Highlight
    if (state.selectedMoveIndex !== null && token.moves && token.moves[state.selectedMoveIndex]) {
      const move = token.moves[state.selectedMoveIndex];
      if (isProtectMove(move) || isEndureMove(move) || isCounterMove(move)) {
        const cell = elements.dmBattleGrid?.querySelector(`.grid-cell[data-x="${token.x}"][data-y="${token.y}"]`);
        if (cell) cell.classList.add('highlight-range');
        return;
      }
      const targetCells = getAttackCells(token.x, token.y, move, state.coneDirection);

      targetCells.forEach(({ x, y }) => {
        const cell = elements.dmBattleGrid?.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
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

    // Movement Range Highlight (Runder Kreis mit Radius verbleibende Bewegung)
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
            const cell = elements.dmBattleGrid?.querySelector(`.grid-cell[data-x="${nx}"][data-y="${ny}"]`);
            if (cell) cell.classList.add('highlight-move');
          }
        }
      }
    }
  }

  function clearGridHighlights() {
    if (!elements.dmBattleGrid) return;
    elements.dmBattleGrid.querySelectorAll('.grid-cell').forEach(cell => {
      cell.classList.remove('highlight-move', 'highlight-range', 'highlight-aoe-circle', 'highlight-cone', 'highlight-priority');
    });
  }

  function getAttackCells(originX, originY, move, coneDir) {
    const cells = [];
    const dist = move.range_distance || 3;

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

  function moveToken(tokenId, targetX, targetY) {
    const token = state.battleState.tokens.find(t => t.id === tokenId);
    if (!token) return;

    const dist = Math.round(Math.hypot(targetX - token.x, targetY - token.y));
    token.x = targetX;
    token.y = targetY;
    if (token.remainingMovement !== undefined) {
      token.remainingMovement = Math.max(0, token.remainingMovement - dist);
    }

    sendAction('BATTLE_MOVE_TOKEN', { tokenId, x: targetX, y: targetY, dist });
    renderBattleMapView();
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

  // Authentic Pokémon Gen 5 Damage Calculation
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

    const attackerPData = ALL_POKEMON.find(p => p.id === attacker.pokemonId);
    const defenderPData = ALL_POKEMON.find(p => p.id === defender.pokemonId);

    const atkAbility = getPokemonAbilityName(attacker);
    const defAbility = getPokemonAbilityName(defender);

    // Type effectiveness
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

    // Reine Status-Attacken ohne direkten Schaden
    const debuff = getDebuffFromMove(move);
    const buff = getBuffFromMove(move);
    if (!move.power || move.damage_class === 'status' || move.damage_class_id === 1) {
      const statusEff = getStatusFromMove(move);
      let descTxt = ' (Status-Attacke)';
      if (statusEff) descTxt = ` (${statusEff.label})`;
      else if (debuff) descTxt = ` (${debuff.label})`;
      else if (buff) descTxt = ` (${buff.label})`;
      return {
        damage: 0,
        text: descTxt,
        effectiveness: 1,
        isImmune: false,
        isStatusMove: true,
        statusEffect: statusEff,
        debuff,
        buff
      };
    }

    const level = attacker.level || 50;
    let power = move.power || 40;
    const isPhysical = (move.damage_class === 'physical' || move.damage_class_id === 2);

    // Techniker (Technician)
    if (atkAbility === 'techniker' && power <= 60) {
      power = Math.floor(power * 1.5);
    }

    // Notdünger, Großbrand, Sturzbach, Hexenplage
    const atkMaxHp = attacker.maxHp || 100;
    const atkCurHp = (attacker.currentHp !== undefined) ? attacker.currentHp : atkMaxHp;
    if (atkCurHp <= Math.floor(atkMaxHp / 3)) {
      if (atkAbility === 'großbrand' && move.type_name === 'fire') power = Math.floor(power * 1.5);
      else if (atkAbility === 'notdünger' && move.type_name === 'grass') power = Math.floor(power * 1.5);
      else if (atkAbility === 'sturzbach' && move.type_name === 'water') power = Math.floor(power * 1.5);
      else if (atkAbility === 'hexenplage' && move.type_name === 'bug') power = Math.floor(power * 1.5);
    }

    function calcStat(base, key, lvl, nat, custom) {
      if (key === 'hp') {
        if (base === 1) return 1;
        return Math.floor(0.01 * (2 * base + 31) * lvl) + lvl + 10 + (custom || 0);
      }
      const natureObj = ALL_NATURES.find(n => n.name_de === nat);
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

    let A = isAttackerHuman ? 70 : 50;
    let D = isDefenderHuman ? 70 : 50;

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

    // Stat Stages
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

    // Official Gen 5 formula
    const levelPart = Math.floor((2 * level) / 5) + 2;
    const baseDmg = Math.floor((levelPart * power * (A / D)) / 50) + 2;

    // STAB
    let stab = 1.0;
    const attackerTypes = attackerPData?.types?.map(t => t.identifier) || [];
    if (attackerTypes.includes(move.type_name)) {
      stab = 1.5;
    }

    if (typeMult === 0) {
      return { damage: 0, text: ' (Hat keine Wirkung! 0×)', effectiveness: 0, isImmune: true, stab, typeMult, debuff, buff };
    }

    // Verbrennung (BRN): Physische Attacken richten nur 50% Schaden an!
    let burnPenalty = 1.0;
    let burnText = '';
    if (attacker.status === 'burn' && isPhysical) {
      burnPenalty = 0.5;
      burnText = ' (🔥 Verbrennung: physischer Schaden halbiert)';
    }

    const randomFactor = 0.85 + (Math.random() * 0.15);
    let finalDamage = Math.max(1, Math.floor(baseDmg * stab * typeMult * randomFactor * burnPenalty));

    let effectText = '';
    if (typeMult >= 2.0) effectText = ` (Sehr effektiv! ${typeMult}× 💥)`;
    else if (typeMult <= 0.5) effectText = ` (Nicht sehr effektiv... ${typeMult}× 🛡️)`;
    if (burnText) effectText += burnText;

    // Robustheit
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

  function handleAttackTargetClick(targetToken) {
    const attacker = state.battleState.tokens.find(t => t.id === state.selectedTokenId);
    if (!attacker || state.selectedMoveIndex === null) return;
    const move = attacker.moves[state.selectedMoveIndex];
    if (!move) return;

    // Check Attacker Status
    if (attacker.status === 'sleep') {
      showToast(`💤 ${attacker.nickname} schläft tief und fest und kann nicht angreifen!`);
      const rollData = {
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        character: attacker.nickname,
        sides: move.name_de,
        roll: `💤 ${attacker.nickname} schläft tief und fest und kann nicht angreifen!`
      };
      sendAction('DICE_ROLL', rollData);
      state.selectedMoveIndex = null;
      renderBattleMapView();
      return;
    }

    if (attacker.status === 'freeze') {
      showToast(`❄️ ${attacker.nickname} ist eingefroren und kann nicht angreifen!`);
      const rollData = {
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        character: attacker.nickname,
        sides: move.name_de,
        roll: `❄️ ${attacker.nickname} ist tiefgefroren und kann nicht angreifen!`
      };
      sendAction('DICE_ROLL', rollData);
      state.selectedMoveIndex = null;
      renderBattleMapView();
      return;
    }

    if (attacker.status === 'paralysis' && Math.random() < 0.25) {
      showToast(`⚡ ${attacker.nickname} ist vollkommen paralysiert!`);
      const rollData = {
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        character: attacker.nickname,
        sides: move.name_de,
        roll: `⚡ ${attacker.nickname} ist vollkommen paralysiert und kann sich nicht rühren!`
      };
      sendAction('DICE_ROLL', rollData);
      attacker.hasAttacked = true;
      state.selectedMoveIndex = null;
      renderBattleMapView();
      return;
    }

    if (attacker.isConfused && Math.random() < 0.33) {
      const lvl = attacker.level || 50;
      const atk = attacker.atk || 50;
      const def = attacker.def || 50;
      const selfDmg = Math.max(1, Math.floor(((Math.floor((2 * lvl) / 5) + 2) * 40 * (atk / def)) / 50) + 2);
      attacker.currentHp = Math.max(0, attacker.currentHp - selfDmg);
      sendAction('BATTLE_APPLY_DAMAGE', { hits: [{ tokenId: attacker.id, damage: selfDmg }] });
      const rollData = {
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        character: attacker.nickname,
        sides: move.name_de,
        roll: `🌀 ${attacker.nickname} ist verwirrt und verletzt sich selbst vor Verwirrung! (-${selfDmg} KP)`
      };
      sendAction('DICE_ROLL', rollData);
      showToast(`🌀 ${attacker.nickname} verletzt sich vor Verwirrung selbst (-${selfDmg} KP)!`);
      attacker.hasAttacked = true;
      state.selectedMoveIndex = null;
      fetchGameState();
      return;
    }

    // Check AP
    const curAp = getMoveAp(attacker, move);
    if (curAp <= 0) {
      showToast(`Keine AP mehr für ${move.name_de}!`);
      return;
    }

    // Deduct 1 AP
    attacker.moveAps = attacker.moveAps || {};
    attacker.moveAps[String(move.id)] = curAp - 1;
    sendAction('RESTORE_AP', { tokenId: attacker.id, trainerId: attacker.trainerId, pokemonUid: attacker.pokemonUid, moveId: move.id, amount: -1 });

    const isAoE = (move.range_type === 'circle' || move.range_type === 'cone');
    const hits = [];

    const applyDamageToTarget = (target) => {
      const calc = calculatePokemonDamage(attacker, target, move);
      const hitObj = { tokenId: target.id, damage: calc.damage, text: calc.text };
      const statusEff = calc.statusEffect || getStatusFromMove(move);
      let statusNotice = '';
      if (statusEff) {
        if (statusEff.isConfused) {
          hitObj.isConfused = true;
          hitObj.confusionTurns = statusEff.confusionTurns || 3;
          statusNotice = ' [🌀 Verwirrt!]';
        } else if (statusEff.status && (!target.status || target.status === 'none')) {
          hitObj.status = statusEff.status;
          if (statusEff.sleepTurns) hitObj.sleepTurns = statusEff.sleepTurns;
          if (statusEff.statusTurns) hitObj.statusTurns = statusEff.statusTurns;
          statusNotice = ` [${statusEff.label || 'Status'}!]`;
        }
      }
      if (target.status === 'freeze' && move.type_name === 'fire' && calc.damage > 0) {
        hitObj.status = 'none';
        statusNotice += ' [🔥 Aufgetaut!]';
      }
      const debuff = calc.debuff || getDebuffFromMove(move);
      if (debuff) {
        hitObj.debuff = debuff;
        statusNotice += ` [${debuff.label}]`;
      }
      const buff = calc.buff || getBuffFromMove(move);
      if (buff && buff.isSelf) {
        hitObj.buff = buff;
        statusNotice += ` [${buff.label}]`;
      }
      hitObj.extraText = statusNotice;
      return hitObj;
    };

    if (isAoE) {
      // Find all target tokens inside the AoE
      const targetCells = getAttackCells(attacker.x, attacker.y, move, state.coneDirection);
      const affectedTokens = state.battleState.tokens.filter(t => {
        if (t.id === attacker.id) return false;
        if (t.isEnemy === attacker.isEnemy) return false; // only hit opposing side
        return targetCells.some(c => c.x === t.x && c.y === t.y);
      });

      if (affectedTokens.length === 0) {
        affectedTokens.push(targetToken);
      }

      affectedTokens.forEach(t => {
        hits.push(applyDamageToTarget(t));
      });
    } else {
      hits.push(applyDamageToTarget(targetToken));
    }

    attacker.hasAttacked = true;

    // Ruckzuckhieb und Erstschlag-Attacken geben die Bewegung zurück!
    const isPriority = isPriorityMove(move);
    let prioMsg = '';
    if (isPriority) {
      attacker.remainingMovement = Math.max(1, (attacker.maxMovement || 5) + (attacker.statStages?.spe || 0));
      prioMsg = ' ⚡ Erstschlag! Volle Bewegung zurückerhalten (Hit & Run)!';
    }

    sendAction('BATTLE_APPLY_DAMAGE', {
      hits,
      moveName: move.name_de,
      attackerName: attacker.nickname,
      attackerId: attacker.id,
      remainingMovement: attacker.remainingMovement
    });

    const hitLog = hits.map(h => {
      const t = state.battleState.tokens.find(tok => tok.id === h.tokenId);
      return `${t ? t.nickname : 'Ziel'} (-${h.damage} KP${h.text || ''}${h.extraText || ''})`;
    }).join(', ');

    const rollData = {
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      character: attacker.nickname,
      sides: move.name_de,
      roll: `⚔️ Trifft: ${hitLog}${prioMsg}`
    };
    sendAction('DICE_ROLL', rollData);
    addLiveRollLog(rollData);

    showToast(`⚔️ ${attacker.nickname} setzt ${move.name_de} ein! ${hitLog}${prioMsg}`);

    state.selectedMoveIndex = null;
    state.selectedTokenId = attacker.id;
    renderBattleMapView();
    applyHighlights();
    fetchGameState();
  }

  function getMoveAp(token, move) {
    if (!token || !move) return 0;
    const basePp = move.pp || 20;
    const currentAp = (token.moveAps && typeof token.moveAps[String(move.id)] === 'number')
      ? token.moveAps[String(move.id)]
      : basePp;
    return Math.max(0, currentAp);
  }

  function renderSelectedTokenBox() {
    if (!elements.dmSelectedTokenContent) return;
    const token = state.battleState.tokens.find(t => t.id === state.selectedTokenId);

    if (!token) {
      elements.dmSelectedTokenContent.innerHTML = `
        <div style="font-size:0.82rem; color:var(--text-muted); font-style:italic; padding:1rem 0; text-align:center;">
          Kein Pokémon auf der Karte ausgewählt.<br>Klicke auf ein Token auf dem Feld.
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

    elements.dmSelectedTokenContent.innerHTML = `
      <!-- Token Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem;">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <img src="${spriteUrl}" alt="" style="width:48px; height:48px;" class="pixelated" onerror="this.src='https://play.pokemonshowdown.com/sprites/trainers/acetrainer.png'">
          <div>
            <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
              <span style="font-weight:900; font-size:1.05rem; color:var(--text-highlight);">${token.nickname}</span>
              ${getStatusDisplayBadge(token)}
            </div>
            <div style="font-size:0.72rem; color:var(--text-muted); margin-top:0.15rem;">
              ${(token.isHuman || token.pokemonId === 0 || token.name_de === 'Mensch') ? '👤 Mensch (Pen & Paper NPC)' : (token.isEnemy ? '🔴 Gegner' : '🔵 Spieler')} • Lv. ${token.level} (${token.name_de || (pData ? pData.name_de : '')})
            </div>
            <div style="display:flex; gap:0.3rem; margin-top:0.3rem;">
              ${(pData?.types || []).map(t => getTypeBadgeHtml(t.identifier, t.name_de)).join('')}
            </div>
          </div>
        </div>
        <button class="btn-secondary btn-remove-token" style="color:#ef4444; border-color:rgba(239,68,68,0.5); font-size:0.75rem; padding:0.3rem 0.65rem; font-weight:700;" title="Dieses Token vom Feld nehmen / zurückrufen">
          🔴 Vom Feld nehmen
        </button>
      </div>

      ${(token.isHuman || token.pokemonId === 0 || token.name_de === 'Mensch') ? `
        <div style="background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:6px; padding:0.35rem 0.55rem; margin-bottom:0.5rem; font-size:0.72rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#93c5fd; font-weight:800;">👤 Pen &amp; Paper Mensch:</span>
          <span style="color:#fff; font-weight:700;">50 KP • Basiswerte: 70 überall</span>
        </div>
      ` : ''}

      <!-- Type Weaknesses & Resistances Card -->
      ${renderTypeWeaknessesHtml(pData)}

      <!-- Ability Info -->
      ${(() => {
        const ab = getPokemonAbility(token);
        if (!ab) return '';
        return `
          <div style="background:rgba(59,130,246,0.12); border:1px solid rgba(59,130,246,0.3); border-radius:6px; padding:0.45rem 0.6rem; margin-top:0.5rem; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span style="font-size:0.7rem; font-weight:800; color:#93c5fd; text-transform:uppercase;">⚡ Fähigkeit:</span>
              <strong style="font-size:0.82rem; color:#fff;">${ab.name_de || ab.name_en}</strong>
            </div>
            ${ab.desc_de ? `<span style="font-size:0.68rem; color:var(--text-secondary); max-width:240px; text-align:right;" title="${ab.desc_de}">${ab.desc_de}</span>` : ''}
          </div>
        `;
      })()}

      <!-- Stat Stages Management (DM) -->
      <div style="background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:6px; padding:0.5rem; margin-top:0.5rem;">
        <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem; display:flex; justify-content:space-between; align-items:center;">
          <span>STATUSWERTE-STUFEN (-6 bis +6):</span>
          <button class="btn-token-reset-stages" style="background:transparent; border:none; color:#f87171; font-size:0.68rem; cursor:pointer; font-weight:700;">🔄 Reset (Alle 0)</button>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.3rem;">
          ${[
            { key: 'atk', label: 'Angriff' },
            { key: 'def', label: 'Verteidigung' },
            { key: 'spa', label: 'Sp.-Angriff' },
            { key: 'spd', label: 'Sp.-Vert.' },
            { key: 'spe', label: 'Initiative' },
            { key: 'acc', label: 'Genauigkeit' }
          ].map(({ key, label }) => {
            const stage = (token.statStages && token.statStages[key]) || 0;
            const sign = stage > 0 ? `+${stage}` : `${stage}`;
            const color = stage < 0 ? '#f87171' : (stage > 0 ? '#34d399' : 'var(--text-secondary)');
            return `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:0.25rem 0.35rem; display:flex; justify-content:space-between; align-items:center; font-size:0.68rem;">
                <span style="font-weight:700;">${label}:</span>
                <div style="display:flex; align-items:center; gap:0.2rem;">
                  <button class="btn-stat-stage-mod" data-stat="${key}" data-delta="-1" style="background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; border-radius:3px; padding:0 4px; font-weight:900; cursor:pointer;">-</button>
                  <span style="font-weight:900; min-width:18px; text-align:center; font-family:var(--font-mono); color:${color};">${sign}</span>
                  <button class="btn-stat-stage-mod" data-stat="${key}" data-delta="1" style="background:rgba(16,185,129,0.2); border:1px solid rgba(16,185,129,0.4); color:#86efac; border-radius:3px; padding:0 4px; font-weight:900; cursor:pointer;">+</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Status Controls for DM -->
      <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:0.5rem; margin:0.6rem 0;">
        <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.3rem; display:flex; justify-content:space-between; align-items:center;">
          <span>STATUS-VERWALTUNG (DM):</span>
          <span>${getStatusDisplayBadge(token)}</span>
        </div>
        <div style="display:flex; gap:0.25rem; flex-wrap:wrap; margin-bottom:0.35rem;">
          <button class="hp-btn btn-token-status-set ${(!token.status || token.status === 'none') ? 'active' : ''}" data-status="none" style="padding:0.2rem 0.45rem; font-size:0.68rem;">💚 Normal</button>
          <button class="hp-btn btn-token-status-set ${token.status === 'burn' ? 'active' : ''}" data-status="burn" style="padding:0.2rem 0.45rem; font-size:0.68rem; background:#ef4444; color:#fff;">🔥 BRN</button>
          <button class="hp-btn btn-token-status-set ${token.status === 'poison' ? 'active' : ''}" data-status="poison" style="padding:0.2rem 0.45rem; font-size:0.68rem; background:#a855f7; color:#fff;">🟣 PSN</button>
          <button class="hp-btn btn-token-status-set ${token.status === 'toxic' ? 'active' : ''}" data-status="toxic" style="padding:0.2rem 0.45rem; font-size:0.68rem; background:#7e22ce; color:#fff;">☠️ TOX</button>
          <button class="hp-btn btn-token-status-set ${token.status === 'paralysis' ? 'active' : ''}" data-status="paralysis" style="padding:0.2rem 0.45rem; font-size:0.68rem; background:#eab308; color:#000;">⚡ PAR</button>
          <button class="hp-btn btn-token-status-set ${token.status === 'sleep' ? 'active' : ''}" data-status="sleep" style="padding:0.2rem 0.45rem; font-size:0.68rem; background:#64748b; color:#fff;">💤 SLP</button>
          <button class="hp-btn btn-token-status-set ${token.status === 'freeze' ? 'active' : ''}" data-status="freeze" style="padding:0.2rem 0.45rem; font-size:0.68rem; background:#38bdf8; color:#000;">❄️ FRZ</button>
        </div>
        <button class="btn-token-confusion-toggle" style="width:100%; padding:0.25rem 0.5rem; font-size:0.72rem; font-weight:800; border-radius:4px; ${token.isConfused ? 'background:#ec4899; color:#fff; border:1px solid #f472b6;' : 'background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-color);'}">
          🌀 Verwirrung: ${token.isConfused ? 'AKTIV (Klick zum Beenden)' : 'Inaktiv (Klick zum Verwirren)'}
        </button>
      </div>

      <!-- Live HP Bar & Movement -->
      <div style="background:rgba(0,0,0,0.3); border-radius:6px; padding:0.5rem; margin-bottom:0.75rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:800; margin-bottom:0.25rem;">
          <span>KP:</span>
          <span style="font-family:var(--font-mono); color:${hpColor};">${token.currentHp} / ${token.maxHp}</span>
        </div>
        <div class="hp-bar-track" style="height:8px; margin-bottom:0.4rem;">
          <div class="hp-bar-fill" style="width:${hpPercent}%; background-color:${hpColor};"></div>
        </div>
        ${(() => {
          const effMov = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
          const curMov = token.remainingMovement !== undefined ? token.remainingMovement : effMov;
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; font-weight:800; color:#93c5fd; margin-bottom:0.35rem; background:rgba(59,130,246,0.12); padding:0.25rem 0.5rem; border-radius:4px;">
              <span>🏃 Bewegung:</span>
              <span style="font-family:var(--font-mono); font-weight:900;">${curMov} / ${effMov} Felder ${token.statStages?.spe ? `(Init: ${token.statStages.spe > 0 ? '+' : ''}${token.statStages.spe})` : ''}</span>
            </div>
          `;
        })()}
        <div style="display:flex; gap:0.35rem; margin-bottom:0.6rem;">
          <button class="btn-secondary btn-token-reset-movement" style="flex:1; font-size:0.68rem; padding:0.25rem 0.4rem; color:#60a5fa; border-color:rgba(59,130,246,0.4); font-weight:700;">
            🏃 Bewegung auffüllen (+5)
          </button>
          <button class="btn-primary btn-round-reset-quick" style="flex:1; font-size:0.68rem; padding:0.25rem 0.4rem; background:#2563eb; font-weight:700;">
            🔄 Runde beenden (Alle)
          </button>
        </div>

        <!-- DM Quick Healing Buttons (USER REQUIREMENT: +20, +50, +100 HP, Voll) -->
        <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.25rem;">
          DM SCHNELLHEILUNG:
        </div>
        <div style="display:flex; gap:0.3rem; flex-wrap:wrap;">
          <button class="btn-heal btn-heal-amount" data-amt="20">+20 KP</button>
          <button class="btn-heal btn-heal-amount" data-amt="50">+50 KP</button>
          <button class="btn-heal btn-heal-amount" data-amt="100">+100 KP</button>
          <button class="btn-heal btn-heal-full" style="background:linear-gradient(135deg, #047857, #10b981);">Voll (Max)</button>
        </div>
      </div>

      <!-- Attacks & AP Restore (USER REQUIREMENT: +10 AP, Alle AP wiederherstellen) -->
      <div style="margin-bottom:0.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
          <div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">
            ATTACKEN &amp; REICHWEITEN:
          </div>
          <button class="btn-secondary btn-restore-all-ap" style="padding:0.2rem 0.45rem; font-size:0.68rem; font-weight:700;">
            ✨ Alle AP voll
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.35rem;">
          ${(token.moves || []).map((m, idx) => {
            const curAp = getMoveAp(token, m);
            const isMoveActive = (state.selectedMoveIndex === idx);
            const isCone = (m.range_type === 'cone');

            return `
              <div style="background:var(--bg-tertiary); border:1px solid ${isMoveActive ? 'var(--accent-blue)' : 'var(--border-color)'}; border-radius:6px; padding:0.45rem; display:flex; flex-direction:column; gap:0.25rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; align-items:center; gap:0.35rem;">
                    <strong style="font-size:0.85rem; color:var(--text-highlight);">${m.name_de}</strong>
                    ${getTypeBadgeHtml(m.type_name, m.type_de)}
                  </div>
                  <div style="display:flex; align-items:center; gap:0.3rem;">
                    <span style="font-size:0.72rem; font-family:var(--font-mono); color:${curAp === 0 ? '#ef4444' : 'var(--text-secondary)'}; font-weight:700;">
                      AP: ${curAp}/${m.pp || 20}
                    </span>
                    <button class="btn-ap-restore btn-restore-10-ap" data-mid="${m.id}" title="+10 AP wiederherstellen" style="padding:0.15rem 0.35rem; font-size:0.65rem;">
                      +10 AP
                    </button>
                  </div>
                </div>

                <div style="font-size:0.7rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                  <span>${m.range_desc || 'Reichweite: 2 Felder'} • Stärke: <strong style="color:#93c5fd;">${getMovePowerDisplay(m)}</strong></span>
                  <button class="btn-primary btn-select-move-range" data-midx="${idx}" style="padding:0.2rem 0.5rem; font-size:0.7rem; background:${isMoveActive ? '#f59e0b' : 'var(--accent-blue)'};">
                    ${isMoveActive ? 'Aktiv (Abbrechen)' : '🎯 Reichweite'}
                  </button>
                </div>

                ${isMoveActive ? (() => {
                  const isProtect = isProtectMove(m);
                  const isEndure = isEndureMove(m);
                  const isCounter = isCounterMove(m);
                  const currentTurn = state.battleState?.turnNumber || 1;
                  const canUseProtect = (token.lastProtectRound === undefined || (currentTurn - token.lastProtectRound >= 2));

                  if (isProtect) {
                    if (token.isProtected) {
                      return `
                        <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); background:rgba(16,185,129,0.2); border-radius:4px; padding:0.4rem; text-align:center; color:#34d399; font-size:0.75rem; font-weight:800;">
                          🛡️ Schutzschild ist in Runde ${currentTurn} AKTIV! (Wehrt alle Treffer ab)
                        </div>
                      `;
                    } else {
                      return `
                        <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                          <button class="btn-primary btn-dm-activate-buff" data-mid="${m.id}" data-buff="protect" style="width:100%; font-size:0.75rem; background:#10b981; border-color:#059669; font-weight:800; padding:0.4rem; display:flex; justify-content:center; align-items:center; gap:0.35rem;">
                            🛡️ Schutzschild aktivieren${!canUseProtect ? ` (⏳ Abklingzeit: Runde ${token.lastProtectRound})` : ''}
                          </button>
                          ${!canUseProtect ? `<div style="font-size:0.65rem; color:#f87171; text-align:center; margin-top:0.2rem;">⚠️ Abklingzeit: Normal nur alle 2 Runden einsetzbar (DM kann trotzdem freigeben).</div>` : ''}
                        </div>
                      `;
                    }
                  }

                  if (isEndure) {
                    if (token.isEnduring) {
                      return `
                        <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); background:rgba(245,158,11,0.2); border-radius:4px; padding:0.4rem; text-align:center; color:#fbbf24; font-size:0.75rem; font-weight:800;">
                          💪 Ausdauer ist AKTIV! (Überlebt fatale Treffer mit mindestens 1 KP)
                        </div>
                      `;
                    } else {
                      return `
                        <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                          <button class="btn-primary btn-dm-activate-buff" data-mid="${m.id}" data-buff="endure" style="width:100%; font-size:0.75rem; background:#f59e0b; border-color:#d97706; font-weight:800; padding:0.4rem; display:flex; justify-content:center; align-items:center; gap:0.35rem;">
                            💪 Ausdauer aktivieren (Überlebt mit 1 KP)
                          </button>
                        </div>
                      `;
                    }
                  }

                  if (isCounter) {
                    if (token.isCountering) {
                      return `
                        <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08); background:rgba(239,68,68,0.2); border-radius:4px; padding:0.4rem; text-align:center; color:#fca5a5; font-size:0.75rem; font-weight:800;">
                          ⚔️ Konter ist AKTIV! (Greift nächsten Angreifer automatisch mit 2× Schaden an)
                        </div>
                      `;
                    } else {
                      return `
                        <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                          <button class="btn-primary btn-dm-activate-buff" data-mid="${m.id}" data-buff="counter" style="width:100%; font-size:0.75rem; background:#dc2626; border-color:#b91c1c; font-weight:800; padding:0.4rem; display:flex; justify-content:center; align-items:center; gap:0.35rem;">
                            ⚔️ Konter aktivieren (Kontert nächsten Angreifer mit 2× Schaden)
                          </button>
                        </div>
                      `;
                    }
                  }

                  const targetCells = getAttackCells(token.x, token.y, m, state.coneDirection);
                  const validTargets = state.battleState.tokens.filter(t => t.id !== token.id && targetCells.some(c => c.x === t.x && c.y === t.y));
                  const isCone = (m.range_type === 'cone');

                  return `
                    <div style="margin-top:0.35rem; padding-top:0.35rem; border-top:1px solid rgba(255,255,255,0.08);">
                      ${isCone ? `
                        <div style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.4rem;">
                          <span style="font-size:0.68rem; font-weight:700; color:var(--accent-gold);">Kegel-Richtung:</span>
                          <button class="hp-btn btn-cone-dir ${state.coneDirection === 'N' ? 'active' : ''}" data-dir="N">⬆️ N</button>
                          <button class="hp-btn btn-cone-dir ${state.coneDirection === 'E' ? 'active' : ''}" data-dir="E">➡️ O</button>
                          <button class="hp-btn btn-cone-dir ${state.coneDirection === 'S' ? 'active' : ''}" data-dir="S">⬇️ S</button>
                          <button class="hp-btn btn-cone-dir ${state.coneDirection === 'W' ? 'active' : ''}" data-dir="W">⬅️ W</button>
                        </div>
                      ` : ''}
                      <div style="font-size:0.68rem; color:var(--text-secondary); margin-bottom:0.25rem; font-weight:700;">
                        ⚔️ Ziel wählen (oder direkt auf Token der Karte tippen):
                      </div>
                      ${validTargets.length > 0 ? `
                        <div style="display:flex; flex-direction:column; gap:0.25rem;">
                          ${validTargets.map(tgt => {
                            const eff = getMoveEffectivenessAgainstTarget(m, tgt);
                            return `
                              <button class="btn-primary btn-dm-direct-attack" data-targetid="${tgt.id}" style="justify-content:space-between; display:flex; align-items:center; font-size:0.75rem; padding:0.35rem 0.55rem; background:#dc2626; border-color:#b91c1c;">
                                <span>⚔️ <strong>${tgt.nickname}</strong> (${tgt.isEnemy ? 'Gegner' : 'Spieler'})</span>
                                <div style="display:flex; align-items:center; gap:0.35rem;">
                                  <span class="matchup-multiplier ${eff.badgeClass}" style="font-size:0.62rem; padding:0.08rem 0.3rem;">${eff.text}</span>
                                  <span style="font-family:var(--font-mono); font-size:0.68rem;">${tgt.currentHp}/${tgt.maxHp} KP</span>
                                </div>
                              </button>
                            `;
                          }).join('')}
                        </div>
                      ` : `
                        <div style="font-size:0.68rem; color:var(--text-muted); font-style:italic;">Kein Ziel in Reichweite (${m.range_desc || '2 Felder'}).</div>
                      `}
                    </div>
                  `;
                })() : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Big Remove / Recall Button at Bottom -->
        <div style="margin-top:0.75rem; padding-top:0.6rem; border-top:1px solid rgba(255,255,255,0.08);">
          <button class="btn-secondary btn-remove-token" style="width:100%; color:#ef4444; border-color:rgba(239,68,68,0.5); font-size:0.78rem; padding:0.45rem 0.8rem; font-weight:800; display:flex; justify-content:center; align-items:center; gap:0.4rem; background:rgba(239,68,68,0.08);">
            🔴 ${token.nickname} vom Feld nehmen / zurückrufen
          </button>
        </div>
      </div>
    `;

    // Bind Status buttons for DM
    elements.dmSelectedTokenContent.querySelectorAll('.btn-token-status-set').forEach(btn => {
      btn.addEventListener('click', () => {
        const newStatus = btn.dataset.status;
        token.status = newStatus;
        sendAction('SET_POKEMON_STATUS', { tokenId: token.id, status: newStatus });
        showToast(`Status von "${token.nickname}" auf "${newStatus}" gesetzt.`);
        renderBattleMapView();
      });
    });

    elements.dmSelectedTokenContent.querySelector('.btn-token-confusion-toggle')?.addEventListener('click', () => {
      token.isConfused = !token.isConfused;
      sendAction('SET_POKEMON_STATUS', { tokenId: token.id, isConfused: token.isConfused });
      showToast(`Verwirrung von "${token.nickname}" ${token.isConfused ? 'aktiviert' : 'aufgehoben'}!`);
      renderBattleMapView();
    });

    // Bind Stat Stage Modifiers
    elements.dmSelectedTokenContent.querySelectorAll('.btn-stat-stage-mod').forEach(btn => {
      btn.addEventListener('click', () => {
        const stat = btn.dataset.stat;
        const delta = parseInt(btn.dataset.delta, 10);
        token.statStages = token.statStages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
        token.statStages[stat] = Math.max(-6, Math.min(6, (token.statStages[stat] || 0) + delta));
        sendAction('SET_TOKEN_STAT_STAGE', { tokenId: token.id, stat, delta });
        renderSelectedTokenBox();
        renderBattleMapView();
      });
    });

    elements.dmSelectedTokenContent.querySelector('.btn-token-reset-stages')?.addEventListener('click', () => {
      token.statStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 };
      sendAction('RESET_TOKEN_STAT_STAGES', { tokenId: token.id });
      renderSelectedTokenBox();
      renderBattleMapView();
      showToast(`Statuswerte-Stufen von "${token.nickname}" auf 0 zurückgesetzt.`);
    });

    // Bind Healing buttons
    elements.dmSelectedTokenContent.querySelectorAll('.btn-heal-amount').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseInt(btn.dataset.amt, 10);
        sendAction('HEAL_POKEMON', {
          tokenId: token.id,
          trainerId: token.trainerId,
          pokemonUid: token.pokemonUid,
          amount: amt
        });
        showToast(`❤️ ${token.nickname} um +${amt} KP geheilt!`);
        token.currentHp = Math.min(token.maxHp, token.currentHp + amt);
        renderBattleMapView();
      });
    });

    elements.dmSelectedTokenContent.querySelector('.btn-heal-full')?.addEventListener('click', () => {
      sendAction('HEAL_POKEMON', {
        tokenId: token.id,
        trainerId: token.trainerId,
        pokemonUid: token.pokemonUid,
        isFull: true
      });
      showToast(`✨ ${token.nickname} vollständig geheilt!`);
      token.currentHp = token.maxHp;
      renderBattleMapView();
    });

    // Bind Movement reset buttons
    elements.dmSelectedTokenContent.querySelector('.btn-token-reset-movement')?.addEventListener('click', () => {
      sendAction('BATTLE_RESET_TOKEN_MOVEMENT', { tokenId: token.id });
      token.remainingMovement = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
      showToast(`🏃 Bewegung für "${token.nickname}" wieder voll aufgefüllt!`);
      renderBattleMapView();
    });

    elements.dmSelectedTokenContent.querySelector('.btn-round-reset-quick')?.addEventListener('click', () => {
      sendAction('BATTLE_RESET_ROUND', {});
      showToast('🔄 Runde beendet! Bewegung aller Einheiten zurückgesetzt.');
    });

    // Bind AP buttons
    elements.dmSelectedTokenContent.querySelectorAll('.btn-restore-10-ap').forEach(btn => {
      btn.addEventListener('click', () => {
        const mid = btn.dataset.mid;
        sendAction('RESTORE_AP', {
          tokenId: token.id,
          trainerId: token.trainerId,
          pokemonUid: token.pokemonUid,
          moveId: mid,
          amount: 10
        });
        showToast(`✨ +10 AP wiederhergestellt!`);
        token.moveAps = token.moveAps || {};
        token.moveAps[String(mid)] = (token.moveAps[String(mid)] || 20) + 10;
        renderBattleMapView();
      });
    });

    elements.dmSelectedTokenContent.querySelector('.btn-restore-all-ap')?.addEventListener('click', () => {
      sendAction('RESTORE_AP', {
        tokenId: token.id,
        trainerId: token.trainerId,
        pokemonUid: token.pokemonUid,
        all: true
      });
      showToast(`✨ Alle AP für ${token.nickname} voll aufgefüllt!`);
      token.moveAps = {};
      renderBattleMapView();
    });

    // Bind Move Range select buttons
    elements.dmSelectedTokenContent.querySelectorAll('.btn-select-move-range').forEach(btn => {
      btn.addEventListener('click', () => {
        const midx = parseInt(btn.dataset.midx, 10);
        if (state.selectedMoveIndex === midx) {
          state.selectedMoveIndex = null;
        } else {
          state.selectedMoveIndex = midx;
        }
        renderBattleMapView();
      });
    });

    // Bind Cone Direction buttons
    elements.dmSelectedTokenContent.querySelectorAll('.btn-cone-dir').forEach(btn => {
      btn.addEventListener('click', () => {
        state.coneDirection = btn.dataset.dir;
        renderBattleMapView();
      });
    });

    // Bind DM Self-Buff activation buttons (Schutzschild, Ausdauer, Konter)
    elements.dmSelectedTokenContent.querySelectorAll('.btn-dm-activate-buff').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mid = btn.dataset.mid;
        const buff = btn.dataset.buff;
        sendAction('BATTLE_ACTIVATE_SELF_BUFF', { tokenId: token.id, moveId: mid, buffType: buff });
        token.hasAttacked = true;
        if (buff === 'protect') {
          token.isProtected = true;
          token.lastProtectRound = state.battleState?.turnNumber || 1;
          token.remainingMovement = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
          showToast(`🛡️ ${token.nickname} hat Schutzschild aktiviert! Volle Bewegung zurückerhalten!`);
        } else if (buff === 'endure') {
          token.isEnduring = true;
          token.remainingMovement = Math.max(1, (token.maxMovement || 5) + (token.statStages?.spe || 0));
          showToast(`💪 ${token.nickname} hat Ausdauer aktiviert! Volle Bewegung zurückerhalten!`);
        } else if (buff === 'counter') {
          token.isCountering = true;
          showToast(`⚔️ ${token.nickname} hat Konter aktiviert! Greift nächsten Angreifer automatisch mit 2× Schaden an.`);
        }
        state.selectedMoveIndex = null;
        renderBattleMapView();
        fetchGameState();
      });
    });

    // Bind direct attack buttons in DM token box
    elements.dmSelectedTokenContent.querySelectorAll('.btn-dm-direct-attack').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.dataset.targetid;
        const targetToken = state.battleState.tokens.find(t => t.id === targetId);
        if (targetToken) {
          handleAttackTargetClick(targetToken);
        }
      });
    });

    // Remove Token buttons (top & bottom)
    elements.dmSelectedTokenContent.querySelectorAll('.btn-remove-token').forEach(btn => {
      btn.addEventListener('click', () => {
        sendAction('BATTLE_REMOVE_TOKEN', { tokenId: token.id });
        state.battleState.tokens = state.battleState.tokens.filter(t => t.id !== token.id);
        state.selectedTokenId = null;
        renderBattleMapView();
        fetchGameState();
        showToast(`Token "${token.nickname}" vom Feld genommen.`);
      });
    });
  }

  function renderRequestsPanel() {
    if (!elements.dmRequestsPanel || !elements.dmRequestsList) return;
    const reqs = state.pendingRequests || [];
    if (elements.dmRequestsBadge) {
      elements.dmRequestsBadge.textContent = String(reqs.length);
    }
    if (reqs.length === 0) {
      elements.dmRequestsPanel.style.display = 'none';
      elements.dmRequestsList.innerHTML = '';
      return;
    }

    elements.dmRequestsPanel.style.display = 'block';
    elements.dmRequestsList.innerHTML = reqs.map(req => {
      if (req.type === 'MOVE') {
        return `
          <div class="dm-request-card" data-rid="${req.id}">
            <div>
              <span class="level-badge" style="background:#10b981; color:#fff; font-size:0.7rem; margin-right:0.4rem;">BEWEGUNG</span>
              <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
              <span>${req.pokemonName || 'Pokémon'} möchte nach Feld <strong>${String.fromCharCode(65 + req.toX)}${req.toY + 1}</strong> ziehen (${req.dist || 1} Felder)</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#10b981; border-color:#059669; font-size:0.75rem; padding:0.35rem 0.75rem;">
                ✅ Bestätigen
              </button>
              <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                ❌ Ablehnen
              </button>
            </div>
          </div>
        `;
      } else if (req.type === 'ATTACK') {
        const move = req.move || {};
        const isProtect = req.buffType === 'protect' || (move && isProtectMove(move)) || String(req.moveId) === '182';
        const isEndure = req.buffType === 'endure' || (move && isEndureMove(move)) || String(req.moveId) === '203';
        const isCounter = req.buffType === 'counter' || (move && isCounterMove(move)) || String(req.moveId) === '68' || req.isCounterStance;
        const isSelfBuff = req.isSelfBuff || isProtect || isEndure || isCounter;

        if (isProtect) {
          return `
            <div class="dm-request-card" data-rid="${req.id}">
              <div>
                <span class="level-badge" style="background:#10b981; color:#fff; font-size:0.7rem; margin-right:0.4rem;">SCHUTZSCHILD</span>
                <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
                <span><strong>${req.attackerName || 'Pokémon'}</strong> möchte <strong>Schutzschild</strong> aktivieren (Selbstschutz für diese Runde)!</span>
              </div>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#10b981; border-color:#059669; font-size:0.75rem; padding:0.35rem 0.75rem;">
                  🛡️ Bestätigen (Schutz an)
                </button>
                <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                  ❌ Ablehnen
                </button>
              </div>
            </div>
          `;
        }

        if (isEndure) {
          return `
            <div class="dm-request-card" data-rid="${req.id}">
              <div>
                <span class="level-badge" style="background:#f59e0b; color:#fff; font-size:0.7rem; margin-right:0.4rem;">AUSDAUER</span>
                <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
                <span><strong>${req.attackerName || 'Pokémon'}</strong> möchte <strong>Ausdauer</strong> aktivieren (Überlebt fatale Treffer mit 1 KP)!</span>
              </div>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#f59e0b; border-color:#d97706; font-size:0.75rem; padding:0.35rem 0.75rem;">
                  💪 Bestätigen (Ausdauer an)
                </button>
                <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                  ❌ Ablehnen
                </button>
              </div>
            </div>
          `;
        }

        if (isCounter) {
          return `
            <div class="dm-request-card" data-rid="${req.id}">
              <div>
                <span class="level-badge" style="background:#ef4444; color:#fff; font-size:0.7rem; margin-right:0.4rem;">KONTER</span>
                <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
                <span><strong>${req.attackerName || 'Pokémon'}</strong> möchte <strong>Konter</strong> aktivieren (Greift nächsten Angreifer automatisch mit 2× Schaden an)!</span>
              </div>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#ef4444; border-color:#dc2626; font-size:0.75rem; padding:0.35rem 0.75rem;">
                  ⚔️ Bestätigen (Konter an)
                </button>
                <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                  ❌ Ablehnen
                </button>
              </div>
            </div>
          `;
        }

        const targetDesc = req.targetNames ? req.targetNames.join(', ') : (req.targetName || 'Ziel');
        const debuff = getDebuffFromMove(move);
        const buff = getBuffFromMove(move);
        const debuffTag = debuff ? `<span class="stat-badge-debuff" style="font-size:0.65rem; margin-left:0.3rem; padding:0.1rem 0.35rem;">${debuff.label}</span>` : '';
        const buffTag = buff ? `<span class="stat-badge-buff" style="font-size:0.65rem; margin-left:0.3rem; padding:0.1rem 0.35rem;">${buff.label}</span>` : '';
        return `
          <div class="dm-request-card" data-rid="${req.id}">
            <div>
              <span class="level-badge" style="background:${debuff ? '#8b5cf6' : '#ef4444'}; color:#fff; font-size:0.7rem; margin-right:0.4rem;">${debuff ? 'DEBUFF' : 'ANGRIFF'}</span>
              <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
              <span><strong>${req.attackerName || 'Pokémon'}</strong> greift <strong>${targetDesc}</strong> mit <strong>${move.name_de || req.moveName || 'Attacke'}</strong> an!${debuffTag}${buffTag}</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#ef4444; border-color:#dc2626; font-size:0.75rem; padding:0.35rem 0.75rem;">
                ⚔️ Bestätigen &amp; Berechnen
              </button>
              <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                ❌ Ablehnen
              </button>
            </div>
          </div>
        `;
      } else if (req.type === 'RECALL') {
        return `
          <div class="dm-request-card" data-rid="${req.id}">
            <div>
              <span class="level-badge" style="background:#f59e0b; color:#fff; font-size:0.7rem; margin-right:0.4rem;">ZURÜCKRUFEN</span>
              <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
              <span>möchte <strong>${req.pokemonName || 'Pokémon'}</strong> in den Pokéball zurückrufen!</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#ef4444; border-color:#dc2626; font-size:0.75rem; padding:0.35rem 0.75rem;">
                🔴 Bestätigen &amp; Entfernen
              </button>
              <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                ❌ Ablehnen
              </button>
            </div>
          </div>
        `;
      } else if (req.type === 'END_TURN' || req.type === 'RESET_ROUND') {
        return `
          <div class="dm-request-card" data-rid="${req.id}">
            <div>
              <span class="level-badge" style="background:#2563eb; color:#fff; font-size:0.7rem; margin-right:0.4rem;">RUNDE BEENDEN</span>
              <strong style="color:#60a5fa;">${req.trainerName || 'Trainer'}</strong>:
              <span>möchte die <strong>Runde beenden</strong> (Bewegungspunkte auffüllen).</span>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="btn-primary btn-approve-request" data-rid="${req.id}" style="background:#2563eb; border-color:#1d4ed8; font-size:0.75rem; padding:0.35rem 0.75rem;">
                🔄 Bestätigen (Neue Runde)
              </button>
              <button class="btn-secondary btn-reject-request" data-rid="${req.id}" style="color:#ef4444; border-color:rgba(239,68,68,0.4); font-size:0.75rem; padding:0.35rem 0.75rem;">
                ❌ Ablehnen
              </button>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');

    elements.dmRequestsList.querySelectorAll('.btn-approve-request').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = btn.dataset.rid;
        sendAction('RESOLVE_ACTION_REQUEST', { requestId: rid, approved: true });
        state.pendingRequests = state.pendingRequests.filter(r => r.id !== rid);
        renderRequestsPanel();
        fetchGameState();
      });
    });

    elements.dmRequestsList.querySelectorAll('.btn-reject-request').forEach(btn => {
      btn.addEventListener('click', () => {
        const rid = btn.dataset.rid;
        sendAction('RESOLVE_ACTION_REQUEST', { requestId: rid, approved: false, reason: 'Spielleiter hat die Aktion abgelehnt.' });
        state.pendingRequests = state.pendingRequests.filter(r => r.id !== rid);
        renderRequestsPanel();
        fetchGameState();
      });
    });
  }

  function renderQuickSpawners() {
    // 1. Gegner Spawns
    if (elements.dmQuickEnemySpawnsList) {
      elements.dmQuickEnemySpawnsList.innerHTML = state.enemyPresets.map(preset => {
        const pData = ALL_POKEMON.find(p => p.id === preset.pokemonId);
        const sprite = (pData ? pData.sprites.front_default : '');
        const mapToken = state.battleState?.tokens?.find(t => t.presetId === preset.id);
        const isOnField = !!mapToken;

        return `
          <div style="background:var(--bg-tertiary); border:1px solid ${isOnField ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}; border-radius:6px; padding:0.35rem 0.5rem; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <img src="${sprite}" alt="" style="width:28px; height:28px;" class="pixelated">
              <div>
                <strong style="font-size:0.8rem; color:#fca5a5;">${preset.nickname}</strong>
                <span style="font-size:0.68rem; color:var(--text-muted);">Lv.${preset.level} ${isOnField ? `<strong style="color:#ef4444;">(${String.fromCharCode(65 + mapToken.x)}${mapToken.y + 1})</strong>` : ''}</span>
              </div>
            </div>
            ${isOnField ? `
              <button class="btn-secondary btn-quick-remove-enemy" data-tid="${mapToken.id}" style="padding:0.2rem 0.5rem; font-size:0.7rem; font-weight:700; color:#ef4444; border-color:rgba(239,68,68,0.5); background:rgba(239,68,68,0.1);">
                🔴 Vom Feld
              </button>
            ` : `
              <button class="btn-secondary btn-quick-spawn-enemy" data-pid="${preset.id}" style="padding:0.2rem 0.5rem; font-size:0.7rem; font-weight:700;">
                + Aufs Feld
              </button>
            `}
          </div>
        `;
      }).join('');

      elements.dmQuickEnemySpawnsList.querySelectorAll('.btn-quick-spawn-enemy').forEach(btn => {
        btn.addEventListener('click', () => {
          spawnEnemyPreset(btn.dataset.pid);
        });
      });

      elements.dmQuickEnemySpawnsList.querySelectorAll('.btn-quick-remove-enemy').forEach(btn => {
        btn.addEventListener('click', () => {
          const tokenId = btn.dataset.tid;
          sendAction('BATTLE_REMOVE_TOKEN', { tokenId });
          state.battleState.tokens = state.battleState.tokens.filter(t => t.id !== tokenId);
          if (state.selectedTokenId === tokenId) state.selectedTokenId = null;
          renderBattleMapView();
          fetchGameState();
          showToast('Gegner vom Feld genommen.');
        });
      });
    }

    // 2. Spieler Spawns
    if (elements.dmQuickPlayerSpawnsList) {
      const playerListHtml = [];
      state.trainers.forEach(trainer => {
        (trainer.pokemon || []).forEach(poke => {
          const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
          const sprite = (pData ? pData.sprites.front_default : '');
          const mapToken = state.battleState?.tokens?.find(t => t.pokemonUid === poke.uid);
          const isOnField = !!mapToken;

          playerListHtml.push(`
            <div style="background:var(--bg-tertiary); border:1px solid ${isOnField ? 'rgba(59,130,246,0.4)' : 'var(--border-color)'}; border-radius:6px; padding:0.35rem 0.5rem; display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <img src="${sprite}" alt="" style="width:28px; height:28px;" class="pixelated">
                <div>
                  <strong style="font-size:0.8rem; color:#93c5fd;">${poke.nickname}</strong>
                  <span style="font-size:0.68rem; color:var(--text-muted);">(${trainer.name}) Lv.${poke.level} ${isOnField ? `<strong style="color:#60a5fa;">(${String.fromCharCode(65 + mapToken.x)}${mapToken.y + 1})</strong>` : ''}</span>
                </div>
              </div>
              ${isOnField ? `
                <button class="btn-secondary btn-quick-remove-player" data-tid="${mapToken.id}" data-name="${poke.nickname}" style="padding:0.2rem 0.5rem; font-size:0.7rem; font-weight:700; color:#ef4444; border-color:rgba(239,68,68,0.5); background:rgba(239,68,68,0.1);">
                  🔴 Vom Feld
                </button>
              ` : `
                <button class="btn-secondary btn-quick-spawn-player" data-tid="${trainer.id}" data-puid="${poke.uid}" style="padding:0.2rem 0.5rem; font-size:0.7rem; font-weight:700;">
                  + Aufs Feld
                </button>
              `}
            </div>
          `);
        });
      });

      elements.dmQuickPlayerSpawnsList.innerHTML = playerListHtml.join('');

      elements.dmQuickPlayerSpawnsList.querySelectorAll('.btn-quick-spawn-player').forEach(btn => {
        btn.addEventListener('click', () => {
          spawnPlayerPokemon(btn.dataset.tid, btn.dataset.puid);
        });
      });

      elements.dmQuickPlayerSpawnsList.querySelectorAll('.btn-quick-remove-player').forEach(btn => {
        btn.addEventListener('click', () => {
          const tokenId = btn.dataset.tid;
          const pName = btn.dataset.name || 'Pokémon';
          sendAction('BATTLE_REMOVE_TOKEN', { tokenId });
          state.battleState.tokens = state.battleState.tokens.filter(t => t.id !== tokenId);
          if (state.selectedTokenId === tokenId) state.selectedTokenId = null;
          renderBattleMapView();
          fetchGameState();
          showToast(`"${pName}" vom Feld genommen.`);
        });
      });
    }
  }

  function spawnEnemyPreset(presetId) {
    const preset = state.enemyPresets.find(p => p.id === presetId);
    if (!preset) return;
    const pData = ALL_POKEMON.find(p => p.id === preset.pokemonId);
    if (!pData) return;

    // Find unoccupied cell on right half of field
    let targetX = 16, targetY = 4;
    for (let x = 18; x >= 12; x--) {
      for (let y = 2; y <= 12; y++) {
        if (!state.battleState.tokens.some(t => t.x === x && t.y === y)) {
          targetX = x;
          targetY = y;
          break;
        }
      }
    }

    const moveObjects = (preset.selectedMoves || []).map(mid => ALL_MOVES[String(mid)]).filter(Boolean);

    const isHumanPreset = (preset.pokemonId === 0 || preset.name_de === 'Mensch' || pData.id === 0);
    const token = {
      id: 'token_enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      pokemonId: preset.pokemonId,
      nickname: preset.nickname,
      name_de: pData.name_de,
      level: preset.level,
      isEnemy: true,
      x: targetX,
      y: targetY,
      currentHp: isHumanPreset ? 50 : preset.currentHp,
      maxHp: isHumanPreset ? 50 : preset.maxHp,
      sprite: preset.sprite || pData.sprites.front_default,
      moves: moveObjects,
      moveAps: {},
      ability: preset.ability || getPokemonDefaultAbility(preset.pokemonId),
      statStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
      isHuman: isHumanPreset
    };

    sendAction('BATTLE_SPAWN_TOKEN', { token });
    state.battleState.tokens.push(token);
    state.selectedTokenId = token.id;
    renderBattleMapView();
    showToast(`👾 "${preset.nickname}" auf Feld ${String.fromCharCode(65 + targetX)}${targetY + 1} gesetzt!`);
  }

  function spawnPlayerPokemon(trainerId, pokemonUid) {
    const trainer = state.trainers.find(t => t.id === trainerId);
    const poke = trainer?.pokemon.find(p => p.uid === pokemonUid);
    if (!trainer || !poke) return;
    const pData = ALL_POKEMON.find(p => p.id === poke.pokemonId);
    if (!pData) return;

    // Find unoccupied cell on left half of field
    let targetX = 2, targetY = 4;
    for (let x = 1; x <= 8; x++) {
      for (let y = 2; y <= 12; y++) {
        if (!state.battleState.tokens.some(t => t.x === x && t.y === y)) {
          targetX = x;
          targetY = y;
          break;
        }
      }
    }

    const moveObjects = (poke.selectedMoves || []).map(mid => ALL_MOVES[String(mid)]).filter(Boolean);

    const token = {
      id: 'token_player_' + poke.uid,
      trainerId: trainerId,
      pokemonUid: poke.uid,
      pokemonId: poke.pokemonId,
      nickname: poke.nickname,
      name_de: pData.name_de,
      level: poke.level,
      isEnemy: false,
      x: targetX,
      y: targetY,
      currentHp: poke.currentHp,
      maxHp: poke.maxHp,
      sprite: pData.sprites.front_default,
      moves: moveObjects,
      moveAps: poke.moveAps || {},
      ability: poke.ability || getPokemonDefaultAbility(poke.pokemonId),
      statStages: poke.statStages || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 },
      customStats: poke.customStats || {},
      nature: poke.nature || 'Neutral'
    };

    sendAction('BATTLE_SPAWN_TOKEN', { token });
    state.battleState.tokens = state.battleState.tokens.filter(t => t.id !== token.id);
    state.battleState.tokens.push(token);
    state.selectedTokenId = token.id;
    renderBattleMapView();
    showToast(`🧢 "${poke.nickname}" von ${trainer.name} aufs Feld gerufen!`);
  }

  // ==========================================================================
  // GEGNER-POKÉMON ORDNER (ENCOUNTER-VORRAT)
  // ==========================================================================

  function renderEnemiesView() {
    if (!elements.dmEnemiesPresetsGrid) return;
    if (elements.dmEnemiesCount) {
      elements.dmEnemiesCount.textContent = String(state.enemyPresets.length);
    }

    if (state.enemyPresets.length === 0) {
      elements.dmEnemiesPresetsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding:2rem; text-align:center;">
          <h3>Noch keine Gegner-Pokémon im Ordner</h3>
          <p>Klicke oben auf "+ Neues Gegner-Pokémon erstellen", um wilde Pokémon oder Bosse vorzubereiten.</p>
        </div>
      `;
      return;
    }

    elements.dmEnemiesPresetsGrid.innerHTML = state.enemyPresets.map(preset => {
      const pData = ALL_POKEMON.find(p => p.id === preset.pokemonId);
      const sprite = pData ? pData.sprites.front_default : '';

      return `
        <div class="tool-card" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.6rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <img src="${sprite}" alt="" style="width:48px; height:48px;" class="pixelated">
              <div>
                <strong style="font-size:1.05rem; color:var(--text-highlight);">${preset.nickname}</strong>
                <div style="font-size:0.72rem; color:var(--text-muted);">
                  #${String(preset.pokemonId).padStart(3, '0')} ${pData ? pData.name_de : ''} • ${preset.category || 'Gegner'}
                </div>
              </div>
            </div>
            <span class="level-badge-large" style="font-size:0.78rem; padding:0.2rem 0.5rem;">Lv. ${preset.level}</span>
          </div>

          <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">
            KP: <strong>${preset.currentHp} / ${preset.maxHp}</strong> • Wesen: <strong>${preset.nature}</strong>
          </div>

          <!-- Attacken Preview -->
          <div style="display:flex; flex-direction:column; gap:0.2rem; font-size:0.72rem; margin-bottom:0.75rem;">
            ${(preset.selectedMoves || []).map(mid => {
              const m = ALL_MOVES[String(mid)];
              return m ? `
                <div style="background:rgba(255,255,255,0.04); padding:0.2rem 0.4rem; border-radius:4px; display:flex; justify-content:space-between;">
                  <span>${m.name_de}</span>
                  <span style="color:var(--text-muted); font-size:0.68rem;">${m.type_de} | Stärke: ${getMovePowerDisplay(m)}</span>
                </div>
              ` : '';
            }).join('')}
          </div>

          <!-- Action buttons -->
          <div style="display:flex; gap:0.4rem;">
            ${(() => {
              const mapToken = state.battleState?.tokens?.find(t => t.presetId === preset.id);
              if (mapToken) {
                return `
                  <button class="btn-secondary btn-remove-enemy-grid" data-pid="${preset.id}" data-tid="${mapToken.id}" style="flex:1; font-size:0.78rem; padding:0.35rem; color:#ef4444; border-color:rgba(239,68,68,0.5); font-weight:800; background:rgba(239,68,68,0.1);">
                    🔴 Vom Feld nehmen
                  </button>
                `;
              }
              return `
                <button class="btn-primary btn-spawn-enemy-grid" data-pid="${preset.id}" style="flex:1; font-size:0.78rem; padding:0.35rem;">
                  ⚔️ Aufs Feld setzen
                </button>
              `;
            })()}
            <button class="icon-btn btn-delete-enemy-preset" data-pid="${preset.id}" style="color:#ef4444;" title="Aus Ordner löschen">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    elements.dmEnemiesPresetsGrid.querySelectorAll('.btn-spawn-enemy-grid').forEach(btn => {
      btn.addEventListener('click', () => {
        spawnEnemyPreset(btn.dataset.pid);
        switchTab('battle');
      });
    });

    elements.dmEnemiesPresetsGrid.querySelectorAll('.btn-remove-enemy-grid').forEach(btn => {
      btn.addEventListener('click', () => {
        const tokenId = btn.dataset.tid;
        sendAction('BATTLE_REMOVE_TOKEN', { tokenId });
        state.battleState.tokens = state.battleState.tokens.filter(t => t.id !== tokenId);
        if (state.selectedTokenId === tokenId) state.selectedTokenId = null;
        renderEnemiesView();
        renderQuickSpawners();
        renderBattleMapView();
        fetchGameState();
        showToast('Gegner vom Feld genommen.');
      });
    });

    elements.dmEnemiesPresetsGrid.querySelectorAll('.btn-delete-enemy-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Dieses Gegner-Pokémon wirklich aus dem Ordner löschen?')) {
          sendAction('DELETE_ENEMY_PRESET', { presetId: btn.dataset.pid });
          state.enemyPresets = state.enemyPresets.filter(p => p.id !== btn.dataset.pid);
          renderEnemiesView();
          renderQuickSpawners();
        }
      });
    });
  }

  function openCreateEnemyModal() {
    if (!elements.createEnemyModal) return;

    // Populate species select if empty
    if (elements.enemyNewSpeciesSelect && elements.enemyNewSpeciesSelect.children.length === 0) {
      ALL_POKEMON.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `#${String(p.id).padStart(3, '0')} ${p.name_de}`;
        elements.enemyNewSpeciesSelect.appendChild(opt);
      });
    }

    // Populate nature select if empty
    if (elements.enemyNewNatureSelect && elements.enemyNewNatureSelect.children.length === 0) {
      ALL_NATURES.forEach(n => {
        const opt = document.createElement('option');
        opt.value = n.name_de;
        opt.textContent = n.name_de;
        elements.enemyNewNatureSelect.appendChild(opt);
      });
    }

    elements.enemyNewNicknameInput.value = '';
    elements.createEnemyModal.classList.add('open');
  }

  function closeCreateEnemyModal() {
    if (elements.createEnemyModal) {
      elements.createEnemyModal.classList.remove('open');
    }
  }

  function saveNewEnemyPreset() {
    const rawSpecies = parseInt(elements.enemyNewSpeciesSelect.value, 10);
    const speciesId = isNaN(rawSpecies) ? 1 : rawSpecies;
    const pData = ALL_POKEMON.find(p => p.id === speciesId);
    if (!pData) return;

    const level = parseInt(elements.enemyNewLevelInput.value, 10) || 15;
    const nature = elements.enemyNewNatureSelect.value || 'Mutig';
    const nickname = (elements.enemyNewNicknameInput.value || '').trim() || (speciesId === 0 ? 'Mensch' : `Wildes ${pData.name_de}`);
    const category = elements.enemyNewCategorySelect.value || (speciesId === 0 ? 'Menschen & NPCs' : 'Wildes Pokémon');

    const maxHp = (speciesId === 0 || pData.identifier === 'human') ? 50 : calculateStat(pData.base_stats.hp, 'hp', level, 31, 0, nature);
    let moves = (pData.moves?.level_up || []).filter(([lvl]) => lvl <= level).slice(-4).map(([lvl, mid]) => mid);
    if (moves.length === 0 && pData.moves?.level_up?.length > 0) {
      moves = pData.moves.level_up.slice(0, 4).map(([lvl, mid]) => mid);
    }

    const preset = {
      id: 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      pokemonId: speciesId,
      name_de: pData.name_de,
      nickname: nickname,
      level: level,
      nature: nature,
      category: category,
      currentHp: maxHp,
      maxHp: maxHp,
      selectedMoves: moves
    };

    sendAction('CREATE_ENEMY_PRESET', { preset });
    state.enemyPresets.push(preset);
    closeCreateEnemyModal();
    showToast(`👾 "${nickname}" im Gegner-Ordner gespeichert!`);
    renderEnemiesView();
    renderQuickSpawners();
  }
  function renderPokedexGrid() {
    let list = ALL_POKEMON;
    const q = (elements.dmPokedexSearch?.value || '').trim().toLowerCase();
    if (q) {
      list = list.filter(p => p.name_de.toLowerCase().includes(q) || String(p.id) === q);
    }
    elements.dmPokedexGrid.innerHTML = '';
    list.slice(0, 40).forEach(p => {
      const card = document.createElement('div');
      card.className = 'pokemon-card';
      card.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">#${String(p.id).padStart(3, '0')}</div>
        <div style="text-align:center; margin:0.5rem 0;">
          <img src="${p.sprites.front_default}" alt="" style="width:72px; height:72px;" class="pixelated">
        </div>
        <div style="font-weight:800; text-align:center; font-size:0.95rem;">${p.name_de}</div>
        <div style="text-align:center; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">${p.types.map(t=>t.name_de).join('/')}</div>
        <button class="btn-card-details btn-pokedex-give" data-pid="${p.id}" style="width:100%; font-size:0.75rem;">+ An Trainer vergeben</button>
      `;
      card.querySelector('.btn-pokedex-give').addEventListener('click', () => promptAssignPokemon());
      elements.dmPokedexGrid.appendChild(card);
    });
  }

  function showToast(msg) {
    elements.toastNotice.textContent = msg;
    elements.toastNotice.classList.add('show');
    setTimeout(() => elements.toastNotice.classList.remove('show'), 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
