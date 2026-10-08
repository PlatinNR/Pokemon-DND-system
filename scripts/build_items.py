import json

items = [
    # Pokébälle
    {"id": "poke_ball", "name_de": "Pokéball", "category": "ball", "desc": "Ein Ball zum Fangen von wilden Pokémon.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"},
    {"id": "great_ball", "name_de": "Superball", "category": "ball", "desc": "Ein besserer Ball mit höherer Fangchance.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png"},
    {"id": "ultra_ball", "name_de": "Hyperball", "category": "ball", "desc": "Ein erstklassiger Ball mit sehr hoher Fangchance.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png"},
    {"id": "master_ball", "name_de": "Meisterball", "category": "ball", "desc": "Der beste Ball überhaupt. Fängt jedes wilde Pokémon garantiert.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png"},
    {"id": "dusk_ball", "name_de": "Finsterball", "category": "ball", "desc": "Besonders effektiv bei Nacht oder in dunklen Höhlen.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png"},
    {"id": "net_ball", "name_de": "Netzball", "category": "ball", "desc": "Besonders effektiv gegen Wasser- und Käfer-Pokémon.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/net-ball.png"},
    {"id": "quick_ball", "name_de": "Flottball", "category": "ball", "desc": "Höchste Fangchance zu Beginn eines Kampfes.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/quick-ball.png"},
    {"id": "heal_ball", "name_de": "Heilball", "category": "ball", "desc": "Heilt gefangene Pokémon sofort komplett.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heal-ball.png"},

    # Heilung & Medizin
    {"id": "potion", "name_de": "Trank", "category": "heal", "desc": "Stellt 20 KP eines Pokémon wieder her.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png"},
    {"id": "super_potion", "name_de": "Supertrank", "category": "heal", "desc": "Stellt 50 KP eines Pokémon wieder her.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png"},
    {"id": "hyper_potion", "name_de": "Hypertrank", "category": "heal", "desc": "Stellt 200 KP eines Pokémon wieder her.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/hyper-potion.png"},
    {"id": "max_potion", "name_de": "Top-Trank", "category": "heal", "desc": "Füllt alle KP eines Pokémon vollständig auf.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-potion.png"},
    {"id": "revive", "name_de": "Beleber", "category": "heal", "desc": "Belebt ein besiegtes Pokémon mit der Hälfte seiner KP wieder.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/revive.png"},
    {"id": "max_revive", "name_de": "Top-Beleber", "category": "heal", "desc": "Belebt ein besiegtes Pokémon mit vollen KP wieder.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/max-revive.png"},
    {"id": "full_heal", "name_de": "Hyperheiler", "category": "heal", "desc": "Heilt alle Statusprobleme (Brand, Schlaf, Gift etc.).", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/full-heal.png"},
    {"id": "antidote", "name_de": "Gegengift", "category": "heal", "desc": "Heilt Vergiftung.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/antidote.png"},
    {"id": "burn_heal", "name_de": "Feuerheiler", "category": "heal", "desc": "Heilt Verbrennungen.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/burn-heal.png"},

    # Entwicklungssteine
    {"id": "fire_stone", "name_de": "Feuerstein", "category": "stone", "desc": "Ein eigenartiger Stein, der bestimmte Pokémon entwickeln lässt (z.B. Vulpix, Evoli).", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png"},
    {"id": "water_stone", "name_de": "Wasserstein", "category": "stone", "desc": "Lässt bestimmte Wasser-Pokémon entwickeln (z.B. Quaputzi, Evoli, Muschas).", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/water-stone.png"},
    {"id": "thunder_stone", "name_de": "Donnerstein", "category": "stone", "desc": "Lässt Elektro-Pokémon entwickeln (z.B. Pikachu, Evoli, Zapplalek).", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/thunder-stone.png"},
    {"id": "leaf_stone", "name_de": "Blattstein", "category": "stone", "desc": "Lässt Pflanzen-Pokémon entwickeln (z.B. Duflor, Ultrigaria, Folikon).", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/leaf-stone.png"},
    {"id": "moon_stone", "name_de": "Mondstein", "category": "stone", "desc": "Lässt Pokémon entwickeln (z.B. Nidorina, Nidorino, Piepi, Pummeluff).", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/moon-stone.png"},
    {"id": "sun_stone", "name_de": "Sonnenstein", "category": "stone", "desc": "Lässt Pokémon wie Duflor, Sonnkern, Waumboll entwickeln.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sun-stone.png"},
    {"id": "dusk_stone", "name_de": "Finsterstein", "category": "stone", "desc": "Lässt Kramurx, Traunfugil, Skelabra entwickeln.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-stone.png"},
    {"id": "shiny_stone", "name_de": "Leuchtstein", "category": "stone", "desc": "Lässt Roselia, Togetic, Picochilla entwickeln.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/shiny-stone.png"},
    {"id": "dawn_stone", "name_de": "Funkelstein", "category": "stone", "desc": "Lässt Kirlia (männlich) und Schneppke (weiblich) entwickeln.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dawn-stone.png"},

    # Beeren
    {"id": "oran_berry", "name_de": "Sinelbeere", "category": "berry", "desc": "Tragbar. Stellt bei niedrigen KP 10 KP wieder her.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/oran-berry.png"},
    {"id": "sitrus_berry", "name_de": "Tsitrubeere", "category": "berry", "desc": "Tragbar. Stellt bei niedrigen KP 25% der max. KP wieder her.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/sitrus-berry.png"},
    {"id": "cheri_berry", "name_de": "Amrenabeere", "category": "berry", "desc": "Heilt Paralyse sofort automatisch.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png"},
    {"id": "pecha_berry", "name_de": "Pirsifbeere", "category": "berry", "desc": "Heilt Vergiftung sofort automatisch.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pecha-berry.png"},

    # P&P Abenteuerausrüstung
    {"id": "backpack", "name_de": "Expeditions-Rucksack", "category": "adventure", "desc": "Ermöglicht das Tragen von mehr Proviant und Ausrüstung.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/town-map.png"},
    {"id": "camping_kit", "name_de": "Camping- & Zeltset", "category": "adventure", "desc": "Schutz für Rast im Freien, verhindert Unterkühlung.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/camping-gear.png"},
    {"id": "climbing_rope", "name_de": "Kletterseil & Haken", "category": "adventure", "desc": "Gibt +2 Vorteil auf Geschicklichkeits- & Athletikproben beim Klettern.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/escape-rope.png"},
    {"id": "pokedex_device", "name_de": "Elektronischer Pokédex", "category": "adventure", "desc": "Analysiert wilde Pokémon, gibt +2 auf Naturkunde-Proben.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pokedex.png"},
    {"id": "badge_case", "name_de": "Ordensbox", "category": "adventure", "desc": "Darin werden stolz die gewonnenen Arenaorden aufbewahrt.", "icon": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/badge-case.png"}
]

with open("data/items.json", "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print(f"Saved data/items.json with {len(items)} items.")
