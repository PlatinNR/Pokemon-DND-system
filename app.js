/**
 * Pokémon Pen & Paper - Schwarz & Weiß Kompendium (Gen 1-5)
 * Vollständige Logik:
 * - 649 Pokémon Pokédex & Gen 5 Movesets
 * - P&P Attribute (KON, STÄ, WEI, CHA, INT, GES) mit Skalierungsformel (bis 70 in 7er, ab 70 in 10er Schritten)
 * - 12 P&P Fertigkeiten (Skills) mit thematischen Wesens-Boni (+3, +2, +1, -1, -2, -3)
 * - Trainer-Manager: Pokémon vergeben mit Pflicht-Spitzname & Zufalls-Wesen
 * - Level-Up System mit freier Punktevergabe auf die 6 Werte
 * - Würfelbecher & Schadensrechner
 */

(function () {
  'use strict';

  let ALL_POKEMON = [];
  let ALL_MOVES = {};
  let ALL_TYPES = {};
  let ALL_NATURES = [];

  // --- 6 P&P GRUND-ATTRIBUTE KONFIGURATION ---
  const ATTR_CONFIG = [
    { key: 'hp', code: 'KON', name_de: 'Konstitution', source: 'KP', color: '#10b981', maxBench: 255 },
    { key: 'atk', code: 'STÄ', name_de: 'Stärke', source: 'Angriff', color: '#ef4444', maxBench: 190 },
    { key: 'def', code: 'WEI', name_de: 'Weisheit', source: 'Verteidigung', color: '#f59e0b', maxBench: 230 },
    { key: 'spa', code: 'CHA', name_de: 'Charisma', source: 'Sp.-Angriff', color: '#3b82f6', maxBench: 194 },
    { key: 'spd', code: 'INT', name_de: 'Intelligenz', source: 'Sp.-Vert.', color: '#8b5cf6', maxBench: 230 },
    { key: 'spe', code: 'GES', name_de: 'Geschicklichkeit', source: 'Initiative', color: '#06b6d4', maxBench: 180 }
  ];

  // --- DIE 12 P&P FERTIGKEITEN (SKILLS) ---
  const PNP_SKILLS = [
    { id: 'athletics', name: 'Athletik (Athletics)', attrKey: 'atk', attrCode: 'STÄ', desc: 'Klettern, Schwimmen, Felsen bewegen, physische Kraftakte' },
    { id: 'acrobatics', name: 'Akrobatik (Acrobatics)', attrKey: 'spe', attrCode: 'GES', desc: 'Balancieren, Ausweichen, Stürze abfangen, Kunststücke' },
    { id: 'stealth', name: 'Schleichen (Stealth)', attrKey: 'spe', attrCode: 'GES', desc: 'Anschleichen, lautloses Bewegen, im Dickicht verbergen' },
    { id: 'sleight', name: 'Fingerfertigkeit (Sleight)', attrKey: 'spe', attrCode: 'GES', desc: 'Beeren pflücken, Gegenstände stibitzen, Fesseln lösen' },
    { id: 'endurance', name: 'Zähigkeit (Endurance)', attrKey: 'hp', attrCode: 'KON', desc: 'Gewaltmärsche, Giften trotzen, Extremwetter aushalten' },
    { id: 'investigation', name: 'Nachforschungen (Investigation)', attrKey: 'spd', attrCode: 'INT', desc: 'Spuren analysieren, Ruinen untersuchen, Hinweise kombinieren' },
    { id: 'nature', name: 'Naturkunde (Nature)', attrKey: 'spd', attrCode: 'INT', desc: 'Wetter vorhersehen, Beeren/Pflanzen kennen, Habitate verstehen' },
    { id: 'perception', name: 'Wahrnehmung (Perception)', attrKey: 'def', attrCode: 'WEI', desc: 'Geräusche lauschen, Feinde wittern, Verstecktes bemerken' },
    { id: 'survival', name: 'Überlebenskunst (Survival)', attrKey: 'def', attrCode: 'WEI', desc: 'Nahrung finden, Fährten lesen, Lagerplätze finden' },
    { id: 'intimidation', name: 'Einschüchtern (Intimidation)', attrKey: 'spa', attrCode: 'CHA', desc: 'Drohgebärden, Brüllen, Feinde in die Flucht schlagen' },
    { id: 'deception', name: 'Täuschung (Deception)', attrKey: 'spa', attrCode: 'CHA', desc: 'Antäuschen, falsche Fährten legen, Schwindeln' },
    { id: 'persuasion', name: 'Überzeugen (Persuasion)', attrKey: 'spa', attrCode: 'CHA', desc: 'Pokémon besänftigen, Vertrauen aufbauen, Bittgesuche' }
  ];

  // --- DIE 25 WESEN MIT BALANCIERTEN FERTIGKEITS-MODIFIKATOREN (+3, +2, +1, -1, -2, -3) ---
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

  // --- DIE USER-FORMEL FÜR DEN P&P ATTRIBUTS-WÜRFELBONUS ---
  // Bis Wert 70 in 7er-Schritten (35 = +5, 63 = +9, 70 = +10).
  // Über Wert 70 in 10er-Schritten (100 = +13, 170 = +20, 260 = +29).
  function getAttributeBonus(stat) {
    const val = Math.max(0, Number(stat) || 0);
    if (val <= 70) {
      return Math.floor(val / 7);
    } else {
      return 10 + Math.floor((val - 70) / 10);
    }
  }

  // --- INITIAL APPLICATION STATE ---
  const state = {
    activeTab: 'pokedex',
    searchQuery: '',
    selectedGen: 'all',
    selectedType: 'all',
    currentSort: 'id-asc',
    spriteMode: 'animated',
    renderedLimit: 60,
    filteredPokemon: [],

    // Modal State
    modalPokemonId: 1,
    modalSide: 'front',
    modalFormat: 'animated',
    modalShiny: false,
    calcLevel: 50,
    calcNature: 'Robust',
    calcPreset: 'standard31',
    activeSubTab: 'attributes', // 'attributes' | 'moves'
    activeMoveTab: 'level_up',
    filterOnlyLearnedMoves: true,

    // Trainers State (Persistent in localStorage)
    trainers: JSON.parse(localStorage.getItem('pnp_trainers') || '[]'),
    activeTrainerId: localStorage.getItem('pnp_active_trainer_id') || '',

    // Quick Team State
    quickTeam: JSON.parse(localStorage.getItem('pnp_pokemon_team') || '[]'),

    // Tools State
    diceHistory: [],
    theme: localStorage.getItem('pnp_theme') || 'dark'
  };

  // If no trainers exist, initialize default trainer
  if (!state.trainers || state.trainers.length === 0) {
    const defaultTrainer = {
      id: 'trainer_' + Date.now(),
      name: 'Rot (Trainer)',
      role: 'Pokémon-Trainer',
      pokemon: []
    };
    state.trainers = [defaultTrainer];
    state.activeTrainerId = defaultTrainer.id;
  } else if (!state.activeTrainerId || !state.trainers.some(t => t.id === state.activeTrainerId)) {
    state.activeTrainerId = state.trainers[0].id;
  }

  // --- DOM ELEMENTS ---
  const elements = {
    // Nav
    logoBtn: document.getElementById('logoBtn'),
    navTabs: document.querySelectorAll('.nav-tab-btn'),
    viewPokedex: document.getElementById('viewPokedex'),
    viewTrainers: document.getElementById('viewTrainers'),
    viewTeam: document.getElementById('viewTeam'),
    viewTools: document.getElementById('viewTools'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    printBtn: document.getElementById('printBtn'),
    trainersBadgeCount: document.getElementById('trainersBadgeCount'),
    teamBadgeCount: document.getElementById('teamBadgeCount'),

    // Pokedex Filter
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    sortSelect: document.getElementById('sortSelect'),
    genPillsContainer: document.getElementById('genPillsContainer'),
    typeChipsContainer: document.getElementById('typeChipsContainer'),
    resultsCount: document.getElementById('resultsCount'),
    activeFilterBadge: document.getElementById('activeFilterBadge'),
    pokemonGrid: document.getElementById('pokemonGrid'),
    btnSpriteAnimated: document.getElementById('btnSpriteAnimated'),
    btnSpriteStatic: document.getElementById('btnSpriteStatic'),
    btnSpriteShiny: document.getElementById('btnSpriteShiny'),

    // Pokemon Detail Modal
    pokemonModal: document.getElementById('pokemonModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalPrevBtn: document.getElementById('modalPrevBtn'),
    modalNextBtn: document.getElementById('modalNextBtn'),
    modalAddTeamBtn: document.getElementById('modalAddTeamBtn'),
    modalQuickAssignTrainerBtn: document.getElementById('modalQuickAssignTrainerBtn'),
    modalDexNr: document.getElementById('modalDexNr'),
    modalNameDe: document.getElementById('modalNameDe'),
    modalNameEn: document.getElementById('modalNameEn'),
    modalSpriteImg: document.getElementById('modalSpriteImg'),
    modalBtnFront: document.getElementById('modalBtnFront'),
    modalBtnBack: document.getElementById('modalBtnBack'),
    modalBtnAnim: document.getElementById('modalBtnAnim'),
    modalBtnStatic: document.getElementById('modalBtnStatic'),
    modalBtnShiny: document.getElementById('modalBtnShiny'),
    modalTypesRow: document.getElementById('modalTypesRow'),
    modalFactCategory: document.getElementById('modalFactCategory'),
    modalFactGen: document.getElementById('modalFactGen'),
    modalFactHeight: document.getElementById('modalFactHeight'),
    modalFactWeight: document.getElementById('modalFactWeight'),
    modalFactBST: document.getElementById('modalFactBST'),
    modalAbilitiesList: document.getElementById('modalAbilitiesList'),
    modalMatchupsGrid: document.getElementById('modalMatchupsGrid'),

    // Modal Calculator
    levelRangeInput: document.getElementById('levelRangeInput'),
    levelValueDisplay: document.getElementById('levelValueDisplay'),
    natureSelect: document.getElementById('natureSelect'),
    presetButtons: document.querySelectorAll('.preset-chip-btn'),
    modalStatsTable: document.getElementById('modalStatsTable'),
    modalStatTotalVal: document.getElementById('modalStatTotalVal'),

    // Subtabs in Modal
    subtabButtons: document.querySelectorAll('.subtab-btn'),
    modalSubpanelAttributes: document.getElementById('modalSubpanelAttributes'),
    modalSubpanelMoves: document.getElementById('modalSubpanelMoves'),
    modalPnpAttributesGrid: document.getElementById('modalPnpAttributesGrid'),
    modalSkillsGrid: document.getElementById('modalSkillsGrid'),
    modalNatureSkillsTitle: document.getElementById('modalNatureSkillsTitle'),

    // Moveset in Modal
    movesetTabs: document.getElementById('movesetTabs'),
    moveCountLevelUp: document.getElementById('moveCountLevelUp'),
    moveCountTM: document.getElementById('moveCountTM'),
    moveCountEgg: document.getElementById('moveCountEgg'),
    moveCountTutor: document.getElementById('moveCountTutor'),
    filterOnlyLearnedMoves: document.getElementById('filterOnlyLearnedMoves'),
    filterCurrentLevelSpan: document.getElementById('filterCurrentLevelSpan'),
    movesFoundCountLabel: document.getElementById('movesFoundCountLabel'),
    modalMovesTbody: document.getElementById('modalMovesTbody'),

    // Trainers View Elements
    trainerSelect: document.getElementById('trainerSelect'),
    btnNewTrainerModal: document.getElementById('btnNewTrainerModal'),
    btnAssignPokemonModal: document.getElementById('btnAssignPokemonModal'),
    btnDeleteTrainer: document.getElementById('btnDeleteTrainer'),
    trainerBannerName: document.getElementById('trainerBannerName'),
    trainerBannerSub: document.getElementById('trainerBannerSub'),
    trainerPokemonGrid: document.getElementById('trainerPokemonGrid'),

    // Assign Pokemon Modal Elements
    assignPokemonModal: document.getElementById('assignPokemonModal'),
    assignModalCloseBtn: document.getElementById('assignModalCloseBtn'),
    assignCancelBtn: document.getElementById('assignCancelBtn'),
    assignConfirmBtn: document.getElementById('assignConfirmBtn'),
    assignTargetTrainerSelect: document.getElementById('assignTargetTrainerSelect'),
    assignPokemonSelect: document.getElementById('assignPokemonSelect'),
    assignNicknameInput: document.getElementById('assignNicknameInput'),
    assignLevelInput: document.getElementById('assignLevelInput'),
    assignNatureSelect: document.getElementById('assignNatureSelect'),
    btnRollRandomNature: document.getElementById('btnRollRandomNature'),
    assignNatureNameTitle: document.getElementById('assignNatureNameTitle'),
    assignNatureSkillsText: document.getElementById('assignNatureSkillsText'),

    // New Trainer Modal Elements
    newTrainerModal: document.getElementById('newTrainerModal'),
    newTrainerCloseBtn: document.getElementById('newTrainerCloseBtn'),
    newTrainerCancelBtn: document.getElementById('newTrainerCancelBtn'),
    newTrainerCreateBtn: document.getElementById('newTrainerCreateBtn'),
    newTrainerNameInput: document.getElementById('newTrainerNameInput'),
    newTrainerClassInput: document.getElementById('newTrainerClassInput'),

    // Quick Team Elements
    teamCardsContainer: document.getElementById('teamCardsContainer'),
    btnClearTeam: document.getElementById('btnClearTeam'),
    btnPrintTeam: document.getElementById('btnPrintTeam'),

    // Tools Elements
    diceMainResult: document.getElementById('diceMainResult'),
    diceResultLabel: document.getElementById('diceResultLabel'),
    diceHistoryList: document.getElementById('diceHistoryList'),
    calcAttackerSelect: document.getElementById('calcAttackerSelect'),
    calcMoveSelect: document.getElementById('calcMoveSelect'),
    calcDefenderSelect: document.getElementById('calcDefenderSelect'),
    btnCalculateDamage: document.getElementById('btnCalculateDamage'),
    damageOutputBox: document.getElementById('damageOutputBox'),
    damageEffectivenessLabel: document.getElementById('damageEffectivenessLabel'),
    damageNumberRange: document.getElementById('damageNumberRange'),
    damagePercentLabel: document.getElementById('damagePercentLabel'),

    // Toast
    toastNotice: document.getElementById('toastNotice')
  };

  // --- INITIALIZATION ---
  let isInitialized = false;

  function init() {
    const data = window.POKEDEX_DATA;
    if (!data || !data.pokemon || data.pokemon.length === 0) {
      console.warn("window.POKEDEX_DATA noch nicht verfügbar, lade über fetch...");
      fetch('data/pokedex_gen1_5.json')
        .then(res => res.json())
        .then(jsonData => {
          window.POKEDEX_DATA = jsonData;
          init();
        })
        .catch(err => {
          console.error("Fehler beim Laden der Pokédex-Daten:", err);
          const grid = document.getElementById('pokemonGrid');
          if (grid) {
            grid.innerHTML = `
              <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem; text-align: center;">
                <h3 style="color:#ef4444; font-size:1.3rem; margin-bottom:1rem;">⚠️ Pokédex-Daten konnten nicht geladen werden</h3>
                <p style="color:var(--text-secondary); max-width:500px; margin:0 auto 1.5rem;">
                  Bitte starte die Anwendung über <strong>start.bat</strong> oder lade die Seite mit <strong>Strg + F5</strong> neu.
                </p>
                <button class="btn-primary" onclick="location.reload(true)">Seite neu laden</button>
              </div>
            `;
          }
        });
      return;
    }

    ALL_POKEMON = data.pokemon;
    ALL_MOVES = data.moves;
    ALL_TYPES = data.types;
    ALL_NATURES = data.natures;
    state.filteredPokemon = [...ALL_POKEMON];

    setupTheme();
    renderTypeFilterChips();
    populateNatureSelects();
    populateAssignPokemonSelect();
    populateCalculatorPokemonDropdowns();
    refreshTrainersUI();
    updateBadges();

    if (!isInitialized) {
      isInitialized = true;
      bindEvents();
    }

    filterAndSortPokemon();
    renderPokemonGrid();
  }

  function setupTheme() {
    if (state.theme === 'light') document.body.classList.add('theme-light');
  }

  function toggleTheme() {
    document.body.classList.toggle('theme-light');
    state.theme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
    localStorage.setItem('pnp_theme', state.theme);
  }

  function updateBadges() {
    if (!elements || !elements.trainersBadgeCount) return;
    const activeTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    elements.trainersBadgeCount.textContent = activeTrainer ? activeTrainer.pokemon.length : 0;
    if (elements.teamBadgeCount) elements.teamBadgeCount.textContent = state.quickTeam.length;
  }

  function saveTrainers() {
    localStorage.setItem('pnp_trainers', JSON.stringify(state.trainers));
    localStorage.setItem('pnp_active_trainer_id', state.activeTrainerId);
    updateBadges();
  }

  function saveQuickTeam() {
    localStorage.setItem('pnp_pokemon_team', JSON.stringify(state.quickTeam));
    updateBadges();
  }

  // --- POPULATE DROPDOWNS ---
  function renderTypeFilterChips() {
    const typeEntries = Object.values(ALL_TYPES).filter(t => t.id <= 17);
    typeEntries.forEach(type => {
      const chip = document.createElement('button');
      chip.className = 'type-chip';
      chip.dataset.type = type.identifier;
      chip.style.backgroundColor = type.color;
      chip.textContent = type.name_de;
      chip.addEventListener('click', () => {
        document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
        if (state.selectedType === type.identifier) {
          state.selectedType = 'all';
          document.querySelector('.type-chip-all').classList.add('active');
        } else {
          state.selectedType = type.identifier;
          chip.classList.add('active');
        }
        filterAndSortPokemon();
        renderPokemonGrid();
      });
      elements.typeChipsContainer.appendChild(chip);
    });
  }

  function populateNatureSelects() {
    elements.natureSelect.innerHTML = '';
    elements.assignNatureSelect.innerHTML = '';

    ALL_NATURES.forEach(nature => {
      const opt = document.createElement('option');
      opt.value = nature.name_de;
      let extra = ' (Neutral)';
      if (nature.up && nature.down) {
        const upStat = ATTR_CONFIG.find(s => s.key === nature.up)?.code || nature.up;
        const downStat = ATTR_CONFIG.find(s => s.key === nature.down)?.code || nature.down;
        extra = ` (+${upStat}, -${downStat})`;
      }
      opt.textContent = `${nature.name_de}${extra}`;
      if (nature.name_de === 'Robust') opt.selected = true;

      elements.natureSelect.appendChild(opt);
      elements.assignNatureSelect.appendChild(opt.cloneNode(true));
    });

    updateAssignNaturePreview();
  }

  function populateAssignPokemonSelect() {
    elements.assignPokemonSelect.innerHTML = '';
    ALL_POKEMON.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `#${String(p.id).padStart(3, '0')} ${p.name_de} (${p.name_en})`;
      elements.assignPokemonSelect.appendChild(opt);
    });
  }

  function populateCalculatorPokemonDropdowns() {
    const createOptions = (select) => {
      select.innerHTML = '';
      ALL_POKEMON.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `#${String(p.id).padStart(3, '0')} ${p.name_de} (${p.name_en})`;
        select.appendChild(opt);
      });
    };

    createOptions(elements.calcAttackerSelect);
    createOptions(elements.calcDefenderSelect);
    elements.calcAttackerSelect.value = 6; // Charizard
    elements.calcDefenderSelect.value = 3; // Venusaur
    updateCalculatorMoveOptions();
  }

  function updateCalculatorMoveOptions() {
    const attackerId = parseInt(elements.calcAttackerSelect.value, 10);
    const attacker = ALL_POKEMON.find(p => p.id === attackerId);
    if (!attacker) return;

    elements.calcMoveSelect.innerHTML = '';
    const moveIds = new Set();
    attacker.moves.level_up.forEach(([lvl, mid]) => moveIds.add(mid));
    attacker.moves.machine.forEach(mid => moveIds.add(mid));

    Array.from(moveIds).forEach(mid => {
      const move = ALL_MOVES[String(mid)];
      if (move && move.power) {
        const opt = document.createElement('option');
        opt.value = mid;
        opt.textContent = `${move.name_de} (${move.type_de}, ${move.power} Stärke, ${move.category_de})`;
        elements.calcMoveSelect.appendChild(opt);
      }
    });

    if (elements.calcMoveSelect.options.length === 0) {
      const opt = document.createElement('option');
      opt.value = 33;
      opt.textContent = 'Tackle (Normal, 50 Stärke)';
      elements.calcMoveSelect.appendChild(opt);
    }
  }

  // --- TRAINERS UI REFRESH ---
  function refreshTrainersUI() {
    elements.trainerSelect.innerHTML = '';
    elements.assignTargetTrainerSelect.innerHTML = '';

    state.trainers.forEach(trainer => {
      const opt = document.createElement('option');
      opt.value = trainer.id;
      opt.textContent = `${trainer.name} (${trainer.role}) [${trainer.pokemon.length} Pokémon]`;
      if (trainer.id === state.activeTrainerId) opt.selected = true;
      elements.trainerSelect.appendChild(opt);

      const optAssign = opt.cloneNode(true);
      elements.assignTargetTrainerSelect.appendChild(optAssign);
    });

    const activeTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
    if (activeTrainer) {
      elements.trainerBannerName.textContent = activeTrainer.name;
      elements.trainerBannerSub.textContent = `Klasse: ${activeTrainer.role} • ${activeTrainer.pokemon.length} Pokémon im Team`;
    }

    renderTrainerPokemonGrid();
    updateBadges();
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    // Navigation
    elements.navTabs.forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    elements.logoBtn.addEventListener('click', () => switchTab('pokedex'));
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.printBtn.addEventListener('click', () => window.print());

    // Pokedex Search & Sort
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      elements.searchClearBtn.classList.toggle('visible', state.searchQuery.length > 0);
      filterAndSortPokemon();
      renderPokemonGrid();
    });

    elements.searchClearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.searchClearBtn.classList.remove('visible');
      filterAndSortPokemon();
      renderPokemonGrid();
      elements.searchInput.focus();
    });

    elements.sortSelect.addEventListener('change', (e) => {
      state.currentSort = e.target.value;
      filterAndSortPokemon();
      renderPokemonGrid();
    });

    elements.genPillsContainer.querySelectorAll('.gen-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        elements.genPillsContainer.querySelectorAll('.gen-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedGen = pill.dataset.gen;
        filterAndSortPokemon();
        renderPokemonGrid();
      });
    });

    document.querySelector('.type-chip-all').addEventListener('click', () => {
      document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
      document.querySelector('.type-chip-all').classList.add('active');
      state.selectedType = 'all';
      filterAndSortPokemon();
      renderPokemonGrid();
    });

    elements.btnSpriteAnimated.addEventListener('click', () => setSpriteDisplayMode('animated'));
    elements.btnSpriteStatic.addEventListener('click', () => setSpriteDisplayMode('static'));
    elements.btnSpriteShiny.addEventListener('click', () => setSpriteDisplayMode('shiny'));

    // Modal Events
    elements.modalCloseBtn.addEventListener('click', closeModal);
    elements.pokemonModal.addEventListener('click', (e) => {
      if (e.target === elements.pokemonModal) closeModal();
    });

    elements.modalPrevBtn.addEventListener('click', () => navigateModalPokemon(-1));
    elements.modalNextBtn.addEventListener('click', () => navigateModalPokemon(1));

    document.addEventListener('keydown', (e) => {
      if (!elements.pokemonModal.classList.contains('open')) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft') navigateModalPokemon(-1);
      else if (e.key === 'ArrowRight') navigateModalPokemon(1);
    });

    elements.modalBtnFront.addEventListener('click', () => setModalSpriteParam('side', 'front'));
    elements.modalBtnBack.addEventListener('click', () => setModalSpriteParam('side', 'back'));
    elements.modalBtnAnim.addEventListener('click', () => setModalSpriteParam('format', 'animated'));
    elements.modalBtnStatic.addEventListener('click', () => setModalSpriteParam('format', 'static'));
    elements.modalBtnShiny.addEventListener('click', () => setModalSpriteParam('shiny', !state.modalShiny));

    // Modal Calculator
    elements.levelRangeInput.addEventListener('input', (e) => {
      state.calcLevel = parseInt(e.target.value, 10);
      elements.levelValueDisplay.textContent = `Lv. ${state.calcLevel}`;
      elements.filterCurrentLevelSpan.textContent = state.calcLevel;
      updateModalStats();
      renderModalPnpSheet();
      renderModalMoves();
    });

    elements.natureSelect.addEventListener('change', (e) => {
      state.calcNature = e.target.value;
      updateModalStats();
      renderModalPnpSheet();
    });

    elements.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.calcPreset = btn.dataset.preset;
        updateModalStats();
        renderModalPnpSheet();
      });
    });

    // Subtabs in Modal
    elements.subtabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.subtabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeSubTab = btn.dataset.subtab;
        elements.modalSubpanelAttributes.classList.toggle('active', state.activeSubTab === 'attributes');
        elements.modalSubpanelMoves.classList.toggle('active', state.activeSubTab === 'moves');
      });
    });

    // Moveset Tabs
    elements.movesetTabs.querySelectorAll('.move-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        elements.movesetTabs.querySelectorAll('.move-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeMoveTab = btn.dataset.movetab;
        renderModalMoves();
      });
    });

    elements.filterOnlyLearnedMoves.addEventListener('change', (e) => {
      state.filterOnlyLearnedMoves = e.target.checked;
      renderModalMoves();
    });

    elements.modalAddTeamBtn.addEventListener('click', () => {
      addPokemonToQuickTeam(state.modalPokemonId);
    });

    elements.modalQuickAssignTrainerBtn.addEventListener('click', () => {
      openAssignPokemonModal(state.modalPokemonId);
    });

    // Trainer View Events
    elements.trainerSelect.addEventListener('change', (e) => {
      state.activeTrainerId = e.target.value;
      localStorage.setItem('pnp_active_trainer_id', state.activeTrainerId);
      refreshTrainersUI();
    });

    elements.btnNewTrainerModal.addEventListener('click', openNewTrainerModal);
    elements.btnAssignPokemonModal.addEventListener('click', () => openAssignPokemonModal());

    elements.btnDeleteTrainer.addEventListener('click', () => {
      if (state.trainers.length <= 1) {
        alert('Es muss mindestens ein Trainer vorhanden sein!');
        return;
      }
      const activeTrainer = state.trainers.find(t => t.id === state.activeTrainerId);
      if (confirm(`Möchtest du Trainer "${activeTrainer.name}" und all seine Pokémon wirklich löschen?`)) {
        state.trainers = state.trainers.filter(t => t.id !== state.activeTrainerId);
        state.activeTrainerId = state.trainers[0].id;
        saveTrainers();
        refreshTrainersUI();
        showToast('Trainer gelöscht.');
      }
    });

    // Assign Pokemon Modal Events
    elements.assignModalCloseBtn.addEventListener('click', closeAssignPokemonModal);
    elements.assignCancelBtn.addEventListener('click', closeAssignPokemonModal);
    elements.assignConfirmBtn.addEventListener('click', handleAssignPokemonSubmit);
    elements.btnRollRandomNature.addEventListener('click', rollRandomNatureForAssign);
    elements.assignNatureSelect.addEventListener('change', updateAssignNaturePreview);

    // New Trainer Modal Events
    elements.newTrainerCloseBtn.addEventListener('click', closeNewTrainerModal);
    elements.newTrainerCancelBtn.addEventListener('click', closeNewTrainerModal);
    elements.newTrainerCreateBtn.addEventListener('click', handleCreateTrainerSubmit);

    // Quick Team Events
    elements.btnClearTeam.addEventListener('click', () => {
      if (confirm('Möchtest du das gesamte Schnell-Team leeren?')) {
        state.quickTeam = [];
        saveQuickTeam();
        renderQuickTeamView();
        showToast('Schnell-Team geleert.');
      }
    });

    elements.btnPrintTeam.addEventListener('click', () => window.print());

    // Tools Events
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sides = parseInt(btn.dataset.sides, 10);
        rollDice(sides);
      });
    });

    elements.calcAttackerSelect.addEventListener('change', updateCalculatorMoveOptions);
    elements.btnCalculateDamage.addEventListener('click', calculateDamage);

    // Infinite scroll
    window.addEventListener('scroll', () => {
      if (state.activeTab !== 'pokedex') return;
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        if (state.renderedLimit < state.filteredPokemon.length) {
          state.renderedLimit += 40;
          renderPokemonGrid(true);
        }
      }
    });
  }

  // --- NAVIGATION ---
  function switchTab(tabName) {
    state.activeTab = tabName;
    elements.navTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));

    elements.viewPokedex.classList.toggle('active', tabName === 'pokedex');
    elements.viewTrainers.classList.toggle('active', tabName === 'trainers');
    elements.viewTeam.classList.toggle('active', tabName === 'team');
    elements.viewTools.classList.toggle('active', tabName === 'tools');

    if (tabName === 'trainers') refreshTrainersUI();
    if (tabName === 'team') renderQuickTeamView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- FILTER & SORT POKEDEX ---
  function filterAndSortPokemon() {
    let list = ALL_POKEMON;

    if (state.selectedGen !== 'all') {
      const g = parseInt(state.selectedGen, 10);
      list = list.filter(p => p.generation === g);
    }

    if (state.selectedType !== 'all') {
      list = list.filter(p => p.types.some(t => t.identifier === state.selectedType));
    }

    if (state.searchQuery) {
      const q = state.searchQuery;
      list = list.filter(p => (
        p.name_de.toLowerCase().includes(q) ||
        p.name_en.toLowerCase().includes(q) ||
        String(p.id) === q ||
        String(p.id).padStart(3, '0') === q ||
        p.types.some(t => t.name_de.toLowerCase().includes(q) || t.name_en.toLowerCase().includes(q))
      ));
    }

    list = [...list].sort((a, b) => {
      switch (state.currentSort) {
        case 'id-desc': return b.id - a.id;
        case 'name-asc': return a.name_de.localeCompare(b.name_de, 'de');
        case 'name-desc': return b.name_de.localeCompare(a.name_de, 'de');
        case 'bst-desc': return b.base_stats.total - a.base_stats.total;
        case 'bst-asc': return a.base_stats.total - b.base_stats.total;
        case 'hp-desc': return b.lv50_standard.hp - a.lv50_standard.hp;
        case 'atk-desc': return b.lv50_standard.atk - a.lv50_standard.atk;
        case 'def-desc': return b.lv50_standard.def - a.lv50_standard.def;
        case 'spa-desc': return b.lv50_standard.spa - a.lv50_standard.spa;
        case 'spd-desc': return b.lv50_standard.spd - a.lv50_standard.spd;
        case 'spe-desc': return b.lv50_standard.spe - a.lv50_standard.spe;
        default: return a.id - b.id;
      }
    });

    state.filteredPokemon = list;
    state.renderedLimit = 60;
    elements.resultsCount.textContent = list.length;

    let badgeText = '';
    if (state.selectedGen !== 'all') badgeText += ` • Gen ${state.selectedGen}`;
    if (state.selectedType !== 'all') badgeText += ` • Typ: ${state.selectedType.toUpperCase()}`;
    elements.activeFilterBadge.textContent = badgeText;
  }

  function setSpriteDisplayMode(mode) {
    state.spriteMode = mode;
    elements.btnSpriteAnimated.classList.toggle('active', mode === 'animated');
    elements.btnSpriteStatic.classList.toggle('active', mode === 'static');
    elements.btnSpriteShiny.classList.toggle('active', mode === 'shiny');
    renderPokemonGrid();
  }

  function getSpriteUrl(pokemon, options = {}) {
    const side = options.side || 'front';
    const format = options.format || (state.spriteMode === 'static' ? 'static' : 'animated');
    const isShiny = options.shiny !== undefined ? options.shiny : (state.spriteMode === 'shiny');

    if (side === 'front') {
      if (isShiny) return format === 'animated' ? pokemon.sprites.front_shiny : pokemon.sprites.front_shiny_static;
      else return format === 'animated' ? pokemon.sprites.front_default : pokemon.sprites.front_static;
    } else {
      if (isShiny) return format === 'animated' ? pokemon.sprites.back_shiny : pokemon.sprites.back_shiny_static;
      else return format === 'animated' ? pokemon.sprites.back_default : pokemon.sprites.back_static;
    }
  }

  // --- RENDER POKEDEX GRID ---
  function renderPokemonGrid(appendOnly = false) {
    if (!appendOnly) elements.pokemonGrid.innerHTML = '';

    if (state.filteredPokemon.length === 0) {
      elements.pokemonGrid.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Kein Pokémon gefunden</h3>
          <p>Passe deinen Suchbegriff oder deine Filter an.</p>
        </div>
      `;
      return;
    }

    const startIndex = appendOnly ? elements.pokemonGrid.children.length : 0;
    const itemsToRender = state.filteredPokemon.slice(startIndex, state.renderedLimit);
    const fragment = document.createDocumentFragment();

    itemsToRender.forEach(p => {
      const card = document.createElement('div');
      card.className = 'pokemon-card';
      const primaryTypeColor = p.types[0]?.color || '#3b82f6';
      card.style.setProperty('--card-accent', primaryTypeColor);

      const spriteUrl = getSpriteUrl(p);
      const fallbackUrl = p.sprites.front_static;

      // Calculate the 6 P&P Attribute dice bonuses from Lv. 50 Standard stats
      const pnpBonuses = {
        KON: getAttributeBonus(p.lv50_standard.hp),
        STÄ: getAttributeBonus(p.lv50_standard.atk),
        WEI: getAttributeBonus(p.lv50_standard.def),
        CHA: getAttributeBonus(p.lv50_standard.spa),
        INT: getAttributeBonus(p.lv50_standard.spd),
        GES: getAttributeBonus(p.lv50_standard.spe)
      };

      card.innerHTML = `
        <div class="card-top">
          <span class="card-number">#${String(p.id).padStart(3, '0')}</span>
          <span class="card-gen">Gen ${p.generation} • ${p.region}</span>
        </div>

        <div class="card-sprite-area">
          <img src="${spriteUrl}" alt="${p.name_de}" class="pokemon-sprite-img pixelated" loading="lazy" onerror="this.src='${fallbackUrl}'">
        </div>

        <div class="card-info">
          <div class="pokemon-name-de">${p.name_de}</div>
          <div class="pokemon-name-en">${p.name_en}</div>
          <div class="type-badges-group">
            ${p.types.map(t => `<span class="type-badge" style="background-color:${t.color}">${t.name_de}</span>`).join('')}
          </div>
        </div>

        <!-- P&P Attributes Preview Grid -->
        <div class="card-stats-preview">
          <div class="stat-preview-header">
            <span>P&amp;P Würfel-Boni (Lv. 50)</span>
            <span style="color:var(--accent-gold); font-family:var(--font-mono);">BST ${p.base_stats.total}</span>
          </div>
          <div class="stat-preview-grid">
            <div class="stat-mini-item" title="Konstitution (KP: ${p.lv50_standard.hp})">
              <span class="stat-mini-label">KON</span>
              <span class="stat-mini-val" style="color:#10b981;">+${pnpBonuses.KON}</span>
            </div>
            <div class="stat-mini-item" title="Stärke (Angriff: ${p.lv50_standard.atk})">
              <span class="stat-mini-label">STÄ</span>
              <span class="stat-mini-val" style="color:#ef4444;">+${pnpBonuses.STÄ}</span>
            </div>
            <div class="stat-mini-item" title="Weisheit (Verteidigung: ${p.lv50_standard.def})">
              <span class="stat-mini-label">WEI</span>
              <span class="stat-mini-val" style="color:#f59e0b;">+${pnpBonuses.WEI}</span>
            </div>
            <div class="stat-mini-item" title="Charisma (Sp.-Angriff: ${p.lv50_standard.spa})">
              <span class="stat-mini-label">CHA</span>
              <span class="stat-mini-val" style="color:#3b82f6;">+${pnpBonuses.CHA}</span>
            </div>
            <div class="stat-mini-item" title="Intelligenz (Sp.-Vert.: ${p.lv50_standard.spd})">
              <span class="stat-mini-label">INT</span>
              <span class="stat-mini-val" style="color:#8b5cf6;">+${pnpBonuses.INT}</span>
            </div>
            <div class="stat-mini-item" title="Geschicklichkeit (Initiative: ${p.lv50_standard.spe})">
              <span class="stat-mini-label">GES</span>
              <span class="stat-mini-val" style="color:#06b6d4;">+${pnpBonuses.GES}</span>
            </div>
          </div>
        </div>

        <div class="card-actions-row">
          <button class="btn-card-details" data-id="${p.id}">Charakter-Sheet &amp; Moves</button>
          <button class="btn-card-add-team" data-id="${p.id}" title="An Trainer vergeben">👤</button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-add-team')) {
          e.stopPropagation();
          openAssignPokemonModal(p.id);
        } else {
          openModal(p.id);
        }
      });

      fragment.appendChild(card);
    });

    elements.pokemonGrid.appendChild(fragment);
  }

  // --- STAT CALCULATOR FORMULA (GEN 5) ---
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

  // --- DETAIL MODAL LOGIC ---
  function openModal(pokemonId) {
    state.modalPokemonId = pokemonId;
    state.modalSide = 'front';
    state.modalFormat = 'animated';
    state.modalShiny = false;
    state.calcLevel = 50;
    state.calcNature = 'Robust';
    state.calcPreset = 'standard31';
    state.activeSubTab = 'attributes';
    state.activeMoveTab = 'level_up';
    state.filterOnlyLearnedMoves = true;

    elements.levelRangeInput.value = 50;
    elements.levelValueDisplay.textContent = 'Lv. 50';
    elements.filterCurrentLevelSpan.textContent = '50';
    elements.natureSelect.value = 'Robust';
    elements.filterOnlyLearnedMoves.checked = true;

    elements.presetButtons.forEach(b => b.classList.toggle('active', b.dataset.preset === 'standard31'));
    elements.subtabButtons.forEach(b => b.classList.toggle('active', b.dataset.subtab === 'attributes'));
    elements.modalSubpanelAttributes.classList.add('active');
    elements.modalSubpanelMoves.classList.remove('active');

    updateModalData();
    elements.pokemonModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    elements.pokemonModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function navigateModalPokemon(delta) {
    let nextId = state.modalPokemonId + delta;
    if (nextId < 1) nextId = 649;
    if (nextId > 649) nextId = 1;
    openModal(nextId);
  }

  function setModalSpriteParam(key, value) {
    if (key === 'side') state.modalSide = value;
    if (key === 'format') state.modalFormat = value;
    if (key === 'shiny') state.modalShiny = value;

    elements.modalBtnFront.classList.toggle('active', state.modalSide === 'front');
    elements.modalBtnBack.classList.toggle('active', state.modalSide === 'back');
    elements.modalBtnAnim.classList.toggle('active', state.modalFormat === 'animated');
    elements.modalBtnStatic.classList.toggle('active', state.modalFormat === 'static');
    elements.modalBtnShiny.classList.toggle('active', state.modalShiny);

    const pokemon = ALL_POKEMON.find(p => p.id === state.modalPokemonId);
    if (pokemon) {
      elements.modalSpriteImg.src = getSpriteUrl(pokemon, {
        side: state.modalSide,
        format: state.modalFormat,
        shiny: state.modalShiny
      });
    }
  }

  function updateModalData() {
    const pokemon = ALL_POKEMON.find(p => p.id === state.modalPokemonId);
    if (!pokemon) return;

    elements.modalDexNr.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
    elements.modalNameDe.innerHTML = `${pokemon.name_de} <span class="modal-pokemon-en">${pokemon.name_en}</span>`;

    setModalSpriteParam('side', 'front');
    setModalSpriteParam('format', 'animated');
    setModalSpriteParam('shiny', false);

    elements.modalTypesRow.innerHTML = pokemon.types.map(t => `
      <span class="type-badge" style="background-color:${t.color}; padding:0.3rem 0.85rem; font-size:0.82rem;">${t.name_de}</span>
    `).join('');

    elements.modalFactCategory.textContent = pokemon.genus_de || 'Pokémon';
    elements.modalFactGen.textContent = `Gen ${pokemon.generation} (${pokemon.region})`;
    elements.modalFactHeight.textContent = `${pokemon.height} m`;
    elements.modalFactWeight.textContent = `${pokemon.weight} kg`;
    elements.modalFactBST.textContent = pokemon.base_stats.total;

    elements.modalAbilitiesList.innerHTML = pokemon.abilities.map(ab => `
      <div class="ability-box">
        <div class="ability-header">
          <span class="ability-name">${ab.name_de} <small style="color:var(--text-muted); font-size:0.75rem;">(${ab.name_en})</small></span>
          ${ab.is_hidden ? '<span class="ability-badge">Versteckte Fähigkeit</span>' : ''}
        </div>
        <div class="ability-desc">${ab.desc_de || ab.desc_en || 'Keine Beschreibung verfügbar.'}</div>
      </div>
    `).join('');

    renderTypeMatchups(pokemon);
    updateModalStats();
    renderModalPnpSheet();

    elements.moveCountLevelUp.textContent = pokemon.moves.level_up.length;
    elements.moveCountTM.textContent = pokemon.moves.machine.length;
    elements.moveCountEgg.textContent = pokemon.moves.egg.length;
    elements.moveCountTutor.textContent = pokemon.moves.tutor.length;
    renderModalMoves();
  }

  function renderTypeMatchups(pokemon) {
    elements.modalMatchupsGrid.innerHTML = '';
    const eff = pokemon.effectiveness || {};
    const atkTypes = Object.values(ALL_TYPES).filter(t => t.id <= 17);

    atkTypes.forEach(t => {
      const mult = eff[t.identifier] !== undefined ? eff[t.identifier] : 1.0;
      if (mult !== 1.0) {
        const item = document.createElement('div');
        item.className = 'matchup-item';

        let multClass = 'mult-2x';
        let multText = `${mult}x`;
        if (mult === 4.0) multClass = 'mult-4x';
        else if (mult === 2.0) multClass = 'mult-2x';
        else if (mult === 0.5) { multClass = 'mult-half'; multText = '½x'; }
        else if (mult === 0.25) { multClass = 'mult-quarter'; multText = '¼x'; }
        else if (mult === 0) { multClass = 'mult-zero'; multText = '0x'; }

        item.innerHTML = `
          <span style="color:${t.color}; font-weight:700;">${t.name_de}</span>
          <span class="matchup-multiplier ${multClass}">${multText}</span>
        `;
        elements.modalMatchupsGrid.appendChild(item);
      }
    });

    if (elements.modalMatchupsGrid.children.length === 0) {
      elements.modalMatchupsGrid.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">Ausgeglichen: erleidet von allen Typen normalen Schaden (1x).</span>';
    }
  }

  function updateModalStats() {
    const pokemon = ALL_POKEMON.find(p => p.id === state.modalPokemonId);
    if (!pokemon) return;

    let iv = 31;
    let ev = 0;
    if (state.calcPreset === 'standard31') { iv = 31; ev = 0; }
    else if (state.calcPreset === 'wild15') { iv = 15; ev = 0; }
    else if (state.calcPreset === 'base0') { iv = 0; ev = 0; }
    else if (state.calcPreset === 'trained') { iv = 31; ev = 252; }

    const nature = ALL_NATURES.find(n => n.name_de === state.calcNature);
    elements.modalStatsTable.innerHTML = '';
    let totalCalculated = 0;

    ATTR_CONFIG.forEach(stat => {
      const base = pokemon.base_stats[stat.key];
      let currentEv = ev;
      if (state.calcPreset === 'trained' && stat.key !== 'hp' && stat.key !== 'spe') {
        currentEv = (stat.key === 'atk' || stat.key === 'spa') ? 252 : 0;
      }

      const calculated = calculateStat(base, stat.key, state.calcLevel, iv, currentEv, state.calcNature);
      totalCalculated += calculated;

      let natureClass = '';
      if (nature && nature.up === stat.key && nature.down !== stat.key) natureClass = 'nature-up';
      else if (nature && nature.down === stat.key && nature.up !== stat.key) natureClass = 'nature-down';

      const barPercentage = Math.min(100, Math.round((base / stat.maxBench) * 100));

      const row = document.createElement('div');
      row.className = 'stat-row-item';
      row.innerHTML = `
        <span class="stat-name-label ${natureClass}">${stat.source}</span>
        <span class="stat-base-val" title="Basiswert">${base}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${barPercentage}%; background-color:${stat.color};"></div>
        </div>
        <span class="stat-calc-val" title="Werte auf Level ${state.calcLevel}">${calculated}</span>
      `;
      elements.modalStatsTable.appendChild(row);
    });

    elements.modalStatTotalVal.textContent = totalCalculated;
  }

  // --- RENDER MODAL P&P ATTRIBUTE SHEET & SKILLS ---
  function renderModalPnpSheet() {
    const pokemon = ALL_POKEMON.find(p => p.id === state.modalPokemonId);
    if (!pokemon) return;

    // Calculate current effective stats
    let iv = 31;
    let ev = 0;
    if (state.calcPreset === 'wild15') iv = 15;
    else if (state.calcPreset === 'base0') iv = 0;
    else if (state.calcPreset === 'trained') { iv = 31; ev = 252; }

    const calculatedStats = {};
    const attributeBonuses = {};

    ATTR_CONFIG.forEach(stat => {
      let currentEv = ev;
      if (state.calcPreset === 'trained' && stat.key !== 'hp' && stat.key !== 'spe') {
        currentEv = (stat.key === 'atk' || stat.key === 'spa') ? 252 : 0;
      }
      const val = calculateStat(pokemon.base_stats[stat.key], stat.key, state.calcLevel, iv, currentEv, state.calcNature);
      calculatedStats[stat.key] = val;
      attributeBonuses[stat.key] = getAttributeBonus(val);
    });

    // 1. Render 6 Core Attributes Grid
    elements.modalPnpAttributesGrid.innerHTML = '';
    ATTR_CONFIG.forEach(attr => {
      const bonus = attributeBonuses[attr.key];
      const rawVal = calculatedStats[attr.key];

      const card = document.createElement('div');
      card.className = 'pnp-attr-card';
      card.innerHTML = `
        <div class="pnp-attr-label">${attr.code}</div>
        <div class="pnp-attr-name">${attr.name_de}</div>
        <div class="pnp-attr-bonus">+${bonus}</div>
        <div class="pnp-attr-stat-source">${attr.source}: ${rawVal}</div>
      `;
      elements.modalPnpAttributesGrid.appendChild(card);
    });

    // 2. Render Skills List with Nature Modifiers
    elements.modalNatureSkillsTitle.textContent = `Aktives Wesen: ${state.calcNature}`;
    elements.modalSkillsGrid.innerHTML = '';

    const natureMods = NATURE_SKILL_MODS[state.calcNature] || {};

    PNP_SKILLS.forEach(skill => {
      const baseAttrBonus = attributeBonuses[skill.attrKey] || 0;
      const natureMod = natureMods[skill.id] || 0;
      const totalBonus = baseAttrBonus + natureMod;

      let modBadgeClass = 'skill-mod-zero';
      let modSign = '';
      if (natureMod > 0) {
        modBadgeClass = `skill-mod-pos-${natureMod}`;
        modSign = `+${natureMod}`;
      } else if (natureMod < 0) {
        modBadgeClass = `skill-mod-neg-${Math.abs(natureMod)}`;
        modSign = `${natureMod}`;
      }

      const item = document.createElement('div');
      item.className = 'skill-card-item';
      item.innerHTML = `
        <div class="skill-info-left">
          <span class="skill-title">${skill.name}</span>
          <span class="skill-attr-tag">${skill.attrCode} (${skill.desc})</span>
        </div>
        <div class="skill-values-right">
          ${natureMod !== 0 ? `<span class="skill-mod-badge ${modBadgeClass}" title="Wesens-Bonus">${modSign}</span>` : ''}
          <span class="skill-total-badge" title="Gesamt-Bonus">+${totalBonus}</span>
          <button class="skill-roll-btn" data-skill="${skill.name}" data-bonus="${totalBonus}">
            🎲 Wurf
          </button>
        </div>
      `;

      item.querySelector('.skill-roll-btn').addEventListener('click', () => {
        rollSkillCheck(pokemon.name_de, skill.name, totalBonus);
      });

      elements.modalSkillsGrid.appendChild(item);
    });
  }

  // --- MOVESET RENDERING IN MODAL ---
  function renderModalMoves() {
    const pokemon = ALL_POKEMON.find(p => p.id === state.modalPokemonId);
    if (!pokemon) return;

    elements.modalMovesTbody.innerHTML = '';
    let moveList = [];
    const tab = state.activeMoveTab;

    if (tab === 'level_up') {
      moveList = pokemon.moves.level_up.map(([level, mid]) => ({
        learnLabel: `Lv. ${level}`,
        numericLevel: level,
        mid: mid
      }));
      if (state.filterOnlyLearnedMoves) {
        moveList = moveList.filter(m => m.numericLevel <= state.calcLevel);
      }
    } else if (tab === 'machine') {
      moveList = pokemon.moves.machine.map(mid => {
        const move = ALL_MOVES[String(mid)];
        return { learnLabel: move?.tm || 'TM', numericLevel: 999, mid: mid };
      });
    } else if (tab === 'egg') {
      moveList = pokemon.moves.egg.map(mid => ({ learnLabel: 'Ei-Zucht', numericLevel: 999, mid: mid }));
    } else if (tab === 'tutor') {
      moveList = pokemon.moves.tutor.map(mid => ({ learnLabel: 'Tutor', numericLevel: 999, mid: mid }));
    }

    elements.movesFoundCountLabel.textContent = `${moveList.length} Attacken verfügbar`;

    if (moveList.length === 0) {
      elements.modalMovesTbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-muted);">
            Keine Attacken in dieser Kategorie für die gewählten Kriterien gefunden.
          </td>
        </tr>
      `;
      return;
    }

    moveList.forEach(m => {
      const move = ALL_MOVES[String(m.mid)];
      if (!move) return;

      const isLearned = tab === 'level_up' && m.numericLevel <= state.calcLevel;
      const typeInfo = ALL_TYPES[move.type_id] || { color: '#888888', name_de: 'Normal' };

      const tr = document.createElement('tr');
      if (isLearned) tr.classList.add('move-learned');

      let catBadgeClass = 'cat-status';
      if (move.category === 'physical') catBadgeClass = 'cat-physical';
      else if (move.category === 'special') catBadgeClass = 'cat-special';

      tr.innerHTML = `
        <td><span class="move-level-tag">${m.learnLabel}</span></td>
        <td class="move-name-cell">
          ${move.name_de}
          <span class="move-en-name">${move.name_en}</span>
        </td>
        <td>
          <span class="type-badge" style="background-color:${typeInfo.color}">${move.type_de}</span>
        </td>
        <td>
          <span class="move-cat-badge ${catBadgeClass}">${move.category_de}</span>
        </td>
        <td style="text-align: right;" class="move-num-val">${move.power ? move.power : '—'}</td>
        <td style="text-align: right;" class="move-num-val">${move.accuracy ? `${move.accuracy}%` : '—'}</td>
        <td style="text-align: right;" class="move-num-val">${move.pp}</td>
        <td><div class="move-desc-text">${move.desc_de || move.desc_en || 'Kein Zusatzeffekt.'}</div></td>
        <td style="text-align: center;">
          <button class="btn-select-move" data-mid="${move.id}">+ Auswählen</button>
        </td>
      `;

      tr.querySelector('.btn-select-move').addEventListener('click', () => {
        addMoveToQuickTeam(state.modalPokemonId, move.id);
      });

      elements.modalMovesTbody.appendChild(tr);
    });
  }

  // --- TRAINER MANAGEMENT LOGIC ---
  function openNewTrainerModal() {
    elements.newTrainerNameInput.value = '';
    elements.newTrainerClassInput.value = 'Pokémon-Trainer';
    elements.newTrainerModal.classList.add('open');
    elements.newTrainerNameInput.focus();
  }

  function closeNewTrainerModal() {
    elements.newTrainerModal.classList.remove('open');
  }

  function handleCreateTrainerSubmit() {
    const name = elements.newTrainerNameInput.value.trim();
    const role = elements.newTrainerClassInput.value.trim() || 'Pokémon-Trainer';
    if (!name) {
      alert('Bitte gib einen Trainernamen ein!');
      return;
    }

    const newTrainer = {
      id: 'trainer_' + Date.now(),
      name: name,
      role: role,
      pokemon: []
    };

    state.trainers.push(newTrainer);
    state.activeTrainerId = newTrainer.id;
    saveTrainers();
    refreshTrainersUI();
    closeNewTrainerModal();
    showToast(`Trainer "${name}" erfolgreich erstellt!`);
  }

  function openAssignPokemonModal(preselectedPokemonId = null) {
    if (state.trainers.length === 0) {
      alert('Erstelle zuerst einen Trainer!');
      openNewTrainerModal();
      return;
    }

    elements.assignTargetTrainerSelect.value = state.activeTrainerId;
    if (preselectedPokemonId) {
      elements.assignPokemonSelect.value = preselectedPokemonId;
    }

    const p = ALL_POKEMON.find(item => item.id === parseInt(elements.assignPokemonSelect.value, 10));
    elements.assignNicknameInput.value = p ? p.name_de : '';
    elements.assignLevelInput.value = 5;

    // Roll random nature on modal open
    rollRandomNatureForAssign();
    elements.assignPokemonModal.classList.add('open');
    elements.assignNicknameInput.focus();
  }

  function closeAssignPokemonModal() {
    elements.assignPokemonModal.classList.remove('open');
  }

  function rollRandomNatureForAssign() {
    const randomNature = ALL_NATURES[Math.floor(Math.random() * ALL_NATURES.length)];
    elements.assignNatureSelect.value = randomNature.name_de;
    updateAssignNaturePreview();
  }

  function updateAssignNaturePreview() {
    const natureName = elements.assignNatureSelect.value;
    const mods = NATURE_SKILL_MODS[natureName] || {};

    const bonuses = [];
    const penalties = [];

    Object.entries(mods).forEach(([skillId, mod]) => {
      const skill = PNP_SKILLS.find(s => s.id === skillId);
      const name = skill ? skill.name : skillId;
      if (mod > 0) bonuses.push(`+${mod} ${name}`);
      else if (mod < 0) penalties.push(`${mod} ${name}`);
    });

    elements.assignNatureNameTitle.textContent = `Wesen "${natureName}":`;
    elements.assignNatureSkillsText.innerHTML = `
      <div style="color:#34d399; margin-bottom:0.25rem;"><strong>Vorteile:</strong> ${bonuses.length ? bonuses.join(', ') : 'Keine'}</div>
      <div style="color:#f87171;"><strong>Nachteile:</strong> ${penalties.length ? penalties.join(', ') : 'Keine'}</div>
    `;
  }

  function handleAssignPokemonSubmit() {
    const trainerId = elements.assignTargetTrainerSelect.value;
    const pokemonId = parseInt(elements.assignPokemonSelect.value, 10);
    const nickname = elements.assignNicknameInput.value.trim();
    const level = Math.max(1, Math.min(100, parseInt(elements.assignLevelInput.value, 10) || 5));
    const nature = elements.assignNatureSelect.value;

    if (!nickname) {
      alert('Bitte gib einen Spitznamen für das Pokémon ein!');
      elements.assignNicknameInput.focus();
      return;
    }

    const targetTrainer = state.trainers.find(t => t.id === trainerId);
    const p = ALL_POKEMON.find(item => item.id === pokemonId);
    if (!targetTrainer || !p) return;

    // Calculate initial max HP at chosen level
    const maxHp = calculateStat(p.base_stats.hp, 'hp', level, 31, 0, nature);

    // Initial 4 learned moves
    const initialMoves = p.moves.level_up
      .filter(([lvl]) => lvl <= level)
      .slice(-4)
      .map(([lvl, mid]) => mid);

    const newPokemon = {
      uid: 'tpoke_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      pokemonId: p.id,
      nickname: nickname,
      level: level,
      nature: nature,
      freePoints: 0,
      customStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      currentHp: maxHp,
      maxHp: maxHp,
      selectedMoves: initialMoves,
      status: []
    };

    targetTrainer.pokemon.push(newPokemon);
    state.activeTrainerId = trainerId;
    saveTrainers();
    refreshTrainersUI();
    closeAssignPokemonModal();

    showToast(`✨ ${p.name_de} ("${nickname}") wurde Trainer "${targetTrainer.name}" übergeben!`);
    switchTab('trainers');
  }

  // --- RENDER TRAINER POKÉMON GRID (WITH LEVEL-UP & ATTRIBUTES) ---
  function renderTrainerPokemonGrid() {
    elements.trainerPokemonGrid.innerHTML = '';
    const activeTrainer = state.trainers.find(t => t.id === state.activeTrainerId);

    if (!activeTrainer || activeTrainer.pokemon.length === 0) {
      elements.trainerPokemonGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Dieser Trainer besitzt noch keine Pokémon</h3>
          <p>Klicke oben auf <strong>"+ Pokémon an Trainer vergeben"</strong>, um ein Pokémon mit Spitznamen und Wesen zuzuweisen.</p>
        </div>
      `;
      return;
    }

    activeTrainer.pokemon.forEach((member, pIndex) => {
      const p = ALL_POKEMON.find(item => item.id === member.pokemonId);
      if (!p) return;

      // Recalculate stats including player's custom points
      const currentStats = {};
      const currentBonuses = {};

      ATTR_CONFIG.forEach(stat => {
        const baseCalculated = calculateStat(p.base_stats[stat.key], stat.key, member.level, 31, 0, member.nature);
        const playerAllocated = member.customStats[stat.key] || 0;
        const totalStat = baseCalculated + playerAllocated;
        currentStats[stat.key] = totalStat;
        currentBonuses[stat.key] = getAttributeBonus(totalStat);
      });

      member.maxHp = currentStats.hp;
      if (member.currentHp === undefined || member.currentHp > member.maxHp) member.currentHp = member.maxHp;

      const hpPercent = Math.max(0, Math.min(100, Math.round((member.currentHp / member.maxHp) * 100)));
      let hpBarColor = '#10b981';
      if (hpPercent <= 20) hpBarColor = '#ef4444';
      else if (hpPercent <= 50) hpBarColor = '#f59e0b';

      const card = document.createElement('div');
      card.className = 'trainer-poke-card';
      card.style.setProperty('--card-accent', p.types[0]?.color || '#3b82f6');

      const natureMods = NATURE_SKILL_MODS[member.nature] || {};

      card.innerHTML = `
        <div class="trainer-card-top">
          <div class="trainer-poke-header-info">
            <img src="${p.sprites.front_default}" alt="${p.name_de}" class="trainer-poke-sprite-img pixelated" onerror="this.src='${p.sprites.front_static}'">
            <div class="trainer-poke-title">
              <input type="text" class="trainer-rename-input" value="${member.nickname}" style="background:transparent; border:none; font-size:1.2rem; font-weight:900; color:var(--text-highlight); outline:none; border-bottom:1px dashed var(--border-color); width:180px;">
              <div class="trainer-poke-sub">
                #${String(p.id).padStart(3, '0')} ${p.name_de} • Wesen: <strong style="color:#93c5fd;">${member.nature}</strong>
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.35rem;">
            <span class="level-badge-large">Lv. ${member.level}</span>
            <button class="icon-btn btn-remove-trainer-poke" title="Freilassen / Entfernen" style="width:28px; height:28px; color:#ef4444;">✕</button>
          </div>
        </div>

        <!-- HP Bar & Tracker -->
        <div class="team-hp-box" style="margin-bottom:0.25rem;">
          <div class="team-hp-header">
            <span>KP (Lebenspunkte):</span>
            <span style="font-family:var(--font-mono); font-weight:800;">${member.currentHp} / ${member.maxHp}</span>
          </div>
          <div class="hp-bar-track">
            <div class="hp-bar-fill" style="width:${hpPercent}%; background-color:${hpBarColor};"></div>
          </div>
          <div class="hp-controls-row">
            <button class="hp-btn hp-sub10">-10</button>
            <button class="hp-btn hp-sub5">-5</button>
            <button class="hp-btn hp-sub1">-1</button>
            <div style="flex:1;"></div>
            <button class="hp-btn hp-add1">+1</button>
            <button class="hp-btn hp-add5">+5</button>
            <button class="hp-btn hp-add10">+10</button>
          </div>
        </div>

        <!-- LEVEL-UP & STAT ALLOCATION BOX -->
        <div class="lvl-up-action-box">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button class="btn-level-up" title="Level um 1 erhöhen">+ Level Up (+1)</button>
            ${member.freePoints > 0 ? `<span class="free-points-badge">✨ ${member.freePoints} freie Punkte zum Verteilen!</span>` : ''}
          </div>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Klicke auf [+] bei den Werten</span>
        </div>

        <!-- 6 ATTRIBUTES WITH CUSTOM LEVELING CONTROLS -->
        <div class="stat-adjust-grid">
          ${ATTR_CONFIG.map(attr => {
            const bonus = currentBonuses[attr.key];
            const statVal = currentStats[attr.key];
            const playerBonus = member.customStats[attr.key] || 0;
            return `
              <div class="stat-adjust-item" title="${attr.name_de} (Basis: ${statVal})">
                <div>
                  <div class="stat-adjust-label">${attr.code}: <span style="color:${attr.color}; font-size:0.85rem; font-weight:800;">+${bonus}</span></div>
                  <div style="font-size:0.65rem; color:var(--text-muted);">${statVal} ${playerBonus > 0 ? `(+${playerBonus})` : ''}</div>
                </div>
                ${member.freePoints > 0 ? `<button class="btn-stat-plus" data-stat="${attr.key}" title="${attr.name_de} um 1 erhöhen">+</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- 12 P&P SKILLS WITH NATURE MODS & 1-CLICK DICE ROLLER -->
        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:0.6rem;">
          <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.4rem;">
            P&amp;P Fertigkeiten (Skills):
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; max-height:160px; overflow-y:auto; padding-right:0.25rem;">
            ${PNP_SKILLS.map(skill => {
              const baseBonus = currentBonuses[skill.attrKey] || 0;
              const nMod = natureMods[skill.id] || 0;
              const total = baseBonus + nMod;

              let modBadge = '';
              if (nMod > 0) modBadge = `<span style="color:#34d399; font-weight:800; font-size:0.7rem;">+${nMod}</span>`;
              else if (nMod < 0) modBadge = `<span style="color:#f87171; font-weight:800; font-size:0.7rem;">${nMod}</span>`;

              return `
                <div style="background:rgba(0,0,0,0.2); padding:0.25rem 0.45rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center; font-size:0.74rem;">
                  <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;" title="${skill.name}">${skill.name.split(' ')[0]}</span>
                  <div style="display:flex; align-items:center; gap:0.3rem;">
                    ${modBadge}
                    <strong style="color:var(--text-highlight); font-family:var(--font-mono);">+${total}</strong>
                    <button class="btn-dice-roll-skill" data-nick="${member.nickname}" data-skill="${skill.name}" data-bonus="${total}" style="background:transparent; border:none; color:var(--accent-blue); cursor:pointer; padding:0 2px;" title="W20 würfeln">🎲</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 4 ACTIVE MOVES -->
        <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:0.6rem;">
          <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.35rem;">
            Attacken (Max 4):
          </div>
          <div class="team-moves-list" style="margin-bottom:0;">
            ${member.selectedMoves.map(mid => {
              const m = ALL_MOVES[String(mid)] || { name_de: `Attacke ${mid}`, power: '—', type_de: 'Normal', pp: 20 };
              return `
                <div class="team-move-item" style="padding:0.25rem 0.5rem;">
                  <span style="font-weight:700;">${m.name_de}</span>
                  <span style="color:var(--text-muted); font-size:0.7rem;">${m.type_de} | ${m.power ? `${m.power} Stärke` : 'Status'} | ${m.pp} AP</span>
                </div>
              `;
            }).join('')}
            ${member.selectedMoves.length === 0 ? '<div style="font-size:0.72rem; color:var(--text-muted); font-style:italic;">Noch keine Attacken gewählt.</div>' : ''}
          </div>
        </div>
      `;

      // Event Listeners for this card
      card.querySelector('.trainer-rename-input').addEventListener('change', (e) => {
        member.nickname = e.target.value.trim() || p.name_de;
        saveTrainers();
      });

      card.querySelector('.btn-remove-trainer-poke').addEventListener('click', () => {
        if (confirm(`Möchtest du "${member.nickname}" wirklich aus dem Team von ${activeTrainer.name} entfernen?`)) {
          activeTrainer.pokemon.splice(pIndex, 1);
          saveTrainers();
          refreshTrainersUI();
          showToast(`"${member.nickname}" freigelassen.`);
        }
      });

      // Level Up Button
      card.querySelector('.btn-level-up').addEventListener('click', () => {
        member.level = Math.min(100, member.level + 1);
        member.freePoints = (member.freePoints || 0) + 2; // +2 freie Trainingspunkte pro Level
        saveTrainers();
        renderTrainerPokemonGrid();
        showToast(`🎉 ${member.nickname} ist jetzt Level ${member.level}! +2 Punkte verfügbar!`);
      });

      // Free Points Allocation (+)
      card.querySelectorAll('.btn-stat-plus').forEach(btn => {
        btn.addEventListener('click', () => {
          if (member.freePoints <= 0) return;
          const statKey = btn.dataset.stat;
          member.customStats[statKey] = (member.customStats[statKey] || 0) + 1;
          member.freePoints -= 1;
          saveTrainers();
          renderTrainerPokemonGrid();
          const attr = ATTR_CONFIG.find(a => a.key === statKey);
          showToast(`+1 Punkt auf ${attr.name_de} vergeben! (Verbleibend: ${member.freePoints})`);
        });
      });

      // HP Adjustments
      const adjustHp = (delta) => {
        member.currentHp = Math.max(0, Math.min(member.maxHp, member.currentHp + delta));
        saveTrainers();
        renderTrainerPokemonGrid();
      };

      card.querySelector('.hp-sub10').addEventListener('click', () => adjustHp(-10));
      card.querySelector('.hp-sub5').addEventListener('click', () => adjustHp(-5));
      card.querySelector('.hp-sub1').addEventListener('click', () => adjustHp(-1));
      card.querySelector('.hp-add1').addEventListener('click', () => adjustHp(1));
      card.querySelector('.hp-add5').addEventListener('click', () => adjustHp(5));
      card.querySelector('.hp-add10').addEventListener('click', () => adjustHp(10));

      // Skill Roll Dice Buttons
      card.querySelectorAll('.btn-dice-roll-skill').forEach(btn => {
        btn.addEventListener('click', () => {
          const nick = btn.dataset.nick;
          const skill = btn.dataset.skill;
          const bonus = parseInt(btn.dataset.bonus, 10);
          rollSkillCheck(nick, skill, bonus);
        });
      });

      elements.trainerPokemonGrid.appendChild(card);
    });
  }

  // --- SKILL CHECK ROLLER INTEGRATION ---
  function rollSkillCheck(characterName, skillName, bonus) {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + bonus;

    let critText = '';
    if (d20 === 20) critText = ' 🎉 (Nat 20! Kritischer Erfolg!)';
    else if (d20 === 1) critText = ' 💀 (Nat 1! Kritischer Patzer!)';

    elements.diceMainResult.textContent = total;
    elements.diceResultLabel.textContent = `${characterName}: ${skillName} (W20: ${d20} + Bonus: ${bonus})${critText}`;

    const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.diceHistory.unshift({
      time: now,
      sides: `Probe: ${skillName}`,
      roll: `${total} (W20: ${d20} + ${bonus})`
    });
    if (state.diceHistory.length > 20) state.diceHistory.pop();
    renderDiceHistory();

    showToast(`🎲 ${characterName} - ${skillName.split(' ')[0]}: ${total} (Wurf: ${d20} + ${bonus})`);
  }

  function rollDice(sides) {
    const roll = Math.floor(Math.random() * sides) + 1;
    elements.diceMainResult.textContent = roll;
    elements.diceResultLabel.textContent = `Ergebnis für D${sides}`;

    if (sides === 20) {
      if (roll === 20) elements.diceResultLabel.textContent = '🎉 KRITISCHER ERFOLG! (Nat 20)';
      else if (roll === 1) elements.diceResultLabel.textContent = '💀 KRITISCHER PATZER! (Nat 1)';
    }

    const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.diceHistory.unshift({ time: now, sides: `D${sides}`, roll: roll });
    if (state.diceHistory.length > 20) state.diceHistory.pop();
    renderDiceHistory();
  }

  function renderDiceHistory() {
    elements.diceHistoryList.innerHTML = state.diceHistory.map(h => `
      <div class="history-item">
        <span>[${h.time}]</span> <strong>${h.sides}:</strong> <span style="color:var(--accent-gold); font-weight:700;">${h.roll}</span>
      </div>
    `).join('');
  }

  // --- QUICK TEAM LOGIC (TEMPORARY BATTLE BENCH) ---
  function addPokemonToQuickTeam(pokemonId) {
    const p = ALL_POKEMON.find(item => item.id === pokemonId);
    if (!p) return;

    const maxHp = calculateStat(p.base_stats.hp, 'hp', state.calcLevel, 31, 0, state.calcNature);
    const initialMoves = p.moves.level_up.filter(([lvl]) => lvl <= state.calcLevel).slice(-4).map(([lvl, mid]) => mid);

    const teamMember = {
      uid: 'quick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      id: p.id,
      name_de: p.name_de,
      nickname: p.name_de,
      level: state.calcLevel,
      nature: state.calcNature,
      maxHp: maxHp,
      currentHp: maxHp,
      selectedMoves: initialMoves,
      status: []
    };

    state.quickTeam.push(teamMember);
    saveQuickTeam();
    showToast(`${p.name_de} zum Schnell-Team hinzugefügt!`);
  }

  function addMoveToQuickTeam(pokemonId, moveId) {
    let member = state.quickTeam.find(m => m.id === pokemonId);
    if (!member) {
      addPokemonToQuickTeam(pokemonId);
      member = state.quickTeam[state.quickTeam.length - 1];
    }
    if (member && !member.selectedMoves.includes(moveId)) {
      if (member.selectedMoves.length >= 4) member.selectedMoves.shift();
      member.selectedMoves.push(moveId);
      saveQuickTeam();
      const m = ALL_MOVES[String(moveId)];
      showToast(`Attacke "${m ? m.name_de : moveId}" zu ${member.nickname} hinzugefügt!`);
    }
  }

  function renderQuickTeamView() {
    elements.teamCardsContainer.innerHTML = '';
    if (state.quickTeam.length === 0) {
      elements.teamCardsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h3 style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Das Schnell-Team ist aktuell leer</h3>
          <p>Füge Pokémon aus dem Pokédex mit <strong>"+ Zu Schnell-Team"</strong> hinzu.</p>
        </div>
      `;
      return;
    }

    state.quickTeam.forEach((member, index) => {
      const p = ALL_POKEMON.find(item => item.id === member.id);
      if (!p) return;

      const hpPercent = Math.max(0, Math.min(100, Math.round((member.currentHp / member.maxHp) * 100)));
      const card = document.createElement('div');
      card.className = 'team-pokemon-card';
      card.style.setProperty('--card-accent', p.types[0]?.color || '#3b82f6');

      card.innerHTML = `
        <div class="team-card-header">
          <div class="team-poke-profile">
            <img src="${p.sprites.front_default}" alt="${p.name_de}" class="team-poke-sprite pixelated" onerror="this.src='${p.sprites.front_static}'">
            <div class="team-poke-names">
              <input type="text" class="quick-nickname-input" value="${member.nickname}" style="background:transparent; border:none; font-size:1.1rem; font-weight:800; color:var(--text-primary); outline:none; border-bottom:1px dashed var(--border-color); width:150px;">
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">
                #${String(p.id).padStart(3, '0')} ${p.name_de} • Lv. ${member.level}
              </div>
            </div>
          </div>
          <button class="icon-btn btn-remove-quick-member" style="width:28px; height:28px; color:#ef4444;">✕</button>
        </div>

        <div class="team-hp-box">
          <div class="team-hp-header">
            <span>KP:</span>
            <span style="font-family:var(--font-mono);">${member.currentHp} / ${member.maxHp}</span>
          </div>
          <div class="hp-bar-track">
            <div class="hp-bar-fill" style="width:${hpPercent}%;"></div>
          </div>
          <div class="hp-controls-row">
            <button class="hp-btn q-sub5">-5</button>
            <button class="hp-btn q-sub1">-1</button>
            <div style="flex:1;"></div>
            <button class="hp-btn q-add1">+1</button>
            <button class="hp-btn q-add5">+5</button>
          </div>
        </div>

        <div class="team-moves-list">
          ${member.selectedMoves.map(mid => {
            const m = ALL_MOVES[String(mid)] || { name_de: `Attacke ${mid}`, type_de: 'Normal' };
            return `<div class="team-move-item"><span>${m.name_de}</span><span style="color:var(--text-muted); font-size:0.7rem;">${m.type_de}</span></div>`;
          }).join('')}
        </div>
      `;

      card.querySelector('.btn-remove-quick-member').addEventListener('click', () => {
        state.quickTeam.splice(index, 1);
        saveQuickTeam();
        renderQuickTeamView();
      });

      const adjustHp = (d) => {
        member.currentHp = Math.max(0, Math.min(member.maxHp, member.currentHp + d));
        saveQuickTeam();
        renderQuickTeamView();
      };
      card.querySelector('.q-sub5').addEventListener('click', () => adjustHp(-5));
      card.querySelector('.q-sub1').addEventListener('click', () => adjustHp(-1));
      card.querySelector('.q-add1').addEventListener('click', () => adjustHp(1));
      card.querySelector('.q-add5').addEventListener('click', () => adjustHp(5));

      elements.teamCardsContainer.appendChild(card);
    });
  }

  // --- GEN 5 DAMAGE CALCULATOR ---
  function calculateDamage() {
    const attackerId = parseInt(elements.calcAttackerSelect.value, 10);
    const moveId = parseInt(elements.calcMoveSelect.value, 10);
    const defenderId = parseInt(elements.calcDefenderSelect.value, 10);

    const attacker = ALL_POKEMON.find(p => p.id === attackerId);
    const defender = ALL_POKEMON.find(p => p.id === defenderId);
    const move = ALL_MOVES[String(moveId)];
    if (!attacker || !defender || !move) return;

    const level = 50;
    const power = move.power || 50;
    let aStat = move.category === 'physical' ? attacker.lv50_standard.atk : attacker.lv50_standard.spa;
    let dStat = move.category === 'physical' ? defender.lv50_standard.def : defender.lv50_standard.spd;

    const stab = attacker.types.some(t => t.id === move.type_id) ? 1.5 : 1.0;
    let typeEffectiveness = 1.0;
    if (defender.effectiveness && defender.effectiveness[move.type_name] !== undefined) {
      typeEffectiveness = defender.effectiveness[move.type_name];
    }

    const baseDamage = Math.floor(Math.floor(Math.floor((2 * level / 5 + 2) * power * aStat / dStat) / 50) + 2);
    const minRoll = Math.floor(baseDamage * 0.85 * stab * typeEffectiveness);
    const maxRoll = Math.floor(baseDamage * 1.00 * stab * typeEffectiveness);

    const defenderMaxHp = defender.lv50_standard.hp;
    const minPercent = Math.round((minRoll / defenderMaxHp) * 100);
    const maxPercent = Math.round((maxRoll / defenderMaxHp) * 100);

    elements.damageOutputBox.style.display = 'block';

    let effLabel = `Effektivität: ${typeEffectiveness}x`;
    if (typeEffectiveness >= 2.0) effLabel += ' (Sehr effektiv!)';
    else if (typeEffectiveness === 0) effLabel += ' (Keine Wirkung / Immun!)';
    else if (typeEffectiveness < 1.0) effLabel += ' (Nicht sehr effektiv)';
    if (stab > 1.0) effLabel += ' • STAB-Bonus aktiv (+50%)';

    elements.damageEffectivenessLabel.textContent = effLabel;
    elements.damageNumberRange.textContent = `${minRoll} – ${maxRoll} KP Schaden`;
    elements.damagePercentLabel.textContent = `entspricht ca. ${minPercent}% – ${maxPercent}% der Gesamt-KP (${defenderMaxHp} KP) von ${defender.name_de}`;
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message) {
    elements.toastNotice.textContent = message;
    elements.toastNotice.classList.add('show');
    setTimeout(() => elements.toastNotice.classList.remove('show'), 2800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
