import csv
import json
import os
import sys

def main():
    print("Building Pokemon Generation 1-5 database for Pen & Paper...")
    raw_dir = "data_raw"
    os.makedirs("scripts", exist_ok=True)
    os.makedirs("data", exist_ok=True)

    # 1. Type names mapping (type_id -> {id, name_en, name_de, color})
    type_colors = {
        "normal": "#A8A878",
        "fire": "#F08030",
        "water": "#6890F0",
        "grass": "#78C850",
        "electric": "#F8D030",
        "ice": "#98D8D8",
        "fighting": "#C03028",
        "poison": "#A040A0",
        "ground": "#E0C068",
        "flying": "#A890F0",
        "psychic": "#F85888",
        "bug": "#A8B820",
        "rock": "#B8A038",
        "ghost": "#705898",
        "dragon": "#7038F8",
        "dark": "#705848",
        "steel": "#B8B8D0",
        "fairy": "#EE99AC"
    }

    types_dict = {}
    with open(os.path.join(raw_dir, "types.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            tid = int(row["id"])
            if tid <= 18:
                types_dict[tid] = {
                    "id": tid,
                    "identifier": row["identifier"],
                    "name_en": row["identifier"].capitalize(),
                    "name_de": row["identifier"].capitalize(),
                    "color": type_colors.get(row["identifier"], "#888888")
                }

    with open(os.path.join(raw_dir, "type_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            tid = int(row["type_id"])
            lang = int(row["local_language_id"])
            if tid in types_dict:
                if lang == 9:
                    types_dict[tid]["name_en"] = row["name"]
                elif lang == 6:
                    types_dict[tid]["name_de"] = row["name"]

    print(f"Loaded {len(types_dict)} types.")

    # 2. Type effectiveness matrix for Gen 5 (types 1..17, excluding Fairy #18)
    # type_efficacy.csv: damage_type_id, target_type_id, damage_factor (0, 50, 100, 200)
    # Note: In Gen 5, Steel still resisted Dark and Ghost!
    type_chart = {} # {attacker_id: {defender_id: multiplier (0, 0.5, 1, 2)}}
    with open(os.path.join(raw_dir, "type_efficacy.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            atk = int(row["damage_type_id"])
            defn = int(row["target_type_id"])
            factor = int(row["damage_factor"]) / 100.0
            if atk <= 17 and defn <= 17:
                # In Gen 5, Steel (9) resisted Ghost (8) and Dark (17) (factor = 0.5)
                # Let's verify and ensure Gen 5 mechanics:
                if defn == 9 and atk in (8, 17):
                    factor = 0.5
                type_chart.setdefault(atk, {})[defn] = factor

    # 3. Pokemon species names (German and English)
    pokemon_names = {}
    with open(os.path.join(raw_dir, "pokemon_species_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_species_id"])
            if pid <= 649:
                lang = int(row["local_language_id"])
                if pid not in pokemon_names:
                    pokemon_names[pid] = {"name_de": "", "name_en": "", "genus_de": "", "genus_en": ""}
                if lang == 6:
                    pokemon_names[pid]["name_de"] = row["name"]
                    pokemon_names[pid]["genus_de"] = row["genus"]
                elif lang == 9:
                    pokemon_names[pid]["name_en"] = row["name"]
                    pokemon_names[pid]["genus_en"] = row["genus"]

    # 4. Pokemon basic info (height, weight)
    pokemon_basic = {}
    with open(os.path.join(raw_dir, "pokemon.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["id"])
            if pid <= 649:
                # height in decimetres -> /10 for meters
                # weight in hectograms -> /10 for kg
                pokemon_basic[pid] = {
                    "identifier": row["identifier"],
                    "height": round(int(row["height"]) / 10.0, 2),
                    "weight": round(int(row["weight"]) / 10.0, 2),
                }

    # 5. Pokemon Gen 5 types
    # Check pokemon_types_past.csv for generation_id == 5 first (e.g. Clefairy, Togepi, Gardevoir before Fairy)
    past_pokemon_types = {}
    with open(os.path.join(raw_dir, "pokemon_types_past.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_id"])
            gen = int(row["generation_id"])
            if pid <= 649 and gen == 5:
                slot = int(row["slot"])
                tid = int(row["type_id"])
                past_pokemon_types.setdefault(pid, {})[slot] = tid

    pokemon_types = {}
    with open(os.path.join(raw_dir, "pokemon_types.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_id"])
            if pid <= 649:
                slot = int(row["slot"])
                tid = int(row["type_id"])
                if pid in past_pokemon_types:
                    pokemon_types[pid] = past_pokemon_types[pid]
                else:
                    pokemon_types.setdefault(pid, {})[slot] = tid

    # 6. Pokemon base stats in Gen 5
    # stat_id: 1=hp, 2=attack, 3=defense, 4=special-attack, 5=special-defense, 6=speed
    stat_keys = {1: "hp", 2: "atk", 3: "def", 4: "spa", 5: "spd", 6: "spe"}
    pokemon_stats = {}
    with open(os.path.join(raw_dir, "pokemon_stats.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_id"])
            if pid <= 649:
                sid = int(row["stat_id"])
                if sid in stat_keys:
                    pokemon_stats.setdefault(pid, {})[stat_keys[sid]] = int(row["base_stat"])

    # Override stats for Gen 5 if changed in later gens (recorded in pokemon_stats_past)
    # In pokemon_stats_past.csv:
    # rows with generation_id == '5' record stats up to Gen 5!
    # rows with generation_id == '6' record stats up to Gen 6 (so in Gen 5 they had that too)
    # rows with generation_id == '7' record stats up to Gen 7 (so in Gen 5 they had that too)
    past_stat_rows = []
    with open(os.path.join(raw_dir, "pokemon_stats_past.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_id"])
            gen = int(row["generation_id"])
            sid = int(row["stat_id"])
            if pid <= 649 and sid in stat_keys and gen in (5, 6, 7, 8):
                past_stat_rows.append((pid, sid, gen, int(row["base_stat"])))

    # Sort so that generation_id closest to 5 wins (e.g. 5, then 6, etc.)
    past_stat_rows.sort(key=lambda x: x[2])
    for pid, sid, gen, bstat in past_stat_rows:
        # If gen == 5, definitely overrides! If earlier gen stat already set, don't overwrite with gen 6
        pokemon_stats[pid][stat_keys[sid]] = bstat

    # 7. Abilities
    # ability_names.csv: ability_id, local_language_id, name
    ability_names = {}
    with open(os.path.join(raw_dir, "ability_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            aid = int(row["ability_id"])
            lang = int(row["local_language_id"])
            if aid not in ability_names:
                ability_names[aid] = {"name_de": "", "name_en": ""}
            if lang == 6:
                ability_names[aid]["name_de"] = row["name"]
            elif lang == 9:
                ability_names[aid]["name_en"] = row["name"]

    # ability_flavor_text.csv: ability_id, version_group_id, language_id, flavor_text
    ability_desc = {}
    with open(os.path.join(raw_dir, "ability_flavor_text.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            aid = int(row["ability_id"])
            lang = int(row["language_id"])
            text = row["flavor_text"].replace("\n", " ").replace("\f", " ").strip()
            if aid not in ability_desc:
                ability_desc[aid] = {"desc_de": "", "desc_en": ""}
            if lang == 6 and not ability_desc[aid]["desc_de"]:
                ability_desc[aid]["desc_de"] = text
            elif lang == 9 and not ability_desc[aid]["desc_en"] and row["version_group_id"] in ("11", "14"):
                ability_desc[aid]["desc_en"] = text

    pokemon_abilities = {}
    with open(os.path.join(raw_dir, "pokemon_abilities.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_id"])
            if pid <= 649:
                aid = int(row["ability_id"])
                is_hidden = row["is_hidden"] == "1"
                slot = int(row["slot"])
                entry = {
                    "id": aid,
                    "name_de": ability_names.get(aid, {}).get("name_de", f"Fähigkeit {aid}"),
                    "name_en": ability_names.get(aid, {}).get("name_en", f"Ability {aid}"),
                    "desc_de": ability_desc.get(aid, {}).get("desc_de", ""),
                    "desc_en": ability_desc.get(aid, {}).get("desc_en", ""),
                    "is_hidden": is_hidden,
                    "slot": slot
                }
                pokemon_abilities.setdefault(pid, []).append(entry)

    # 8. Moves & Machine mappings
    # machines.csv: machine_number, version_group_id, move_id
    machines_bw = {} # move_id -> machine_name (e.g. TM01, VM02)
    with open(os.path.join(raw_dir, "machines.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["version_group_id"] == "11":
                mnum = int(row["machine_number"])
                mid = int(row["move_id"])
                if mnum >= 101:
                    code = f"VM{mnum - 100:02d}"
                else:
                    code = f"TM{mnum:02d}"
                machines_bw[mid] = code

    # Move changelog for Gen 5:
    move_changes = {} # move_id -> {power, accuracy, pp}
    with open(os.path.join(raw_dir, "move_changelog.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["move_id"])
            vg = int(row["changed_in_version_group_id"])
            if vg >= 15: # Changed in Gen 6 or later, so in Gen 5 had this past value!
                if mid not in move_changes:
                    move_changes[mid] = {}
                if row["power"]:
                    move_changes[mid]["power"] = int(row["power"])
                if row["accuracy"]:
                    move_changes[mid]["accuracy"] = int(row["accuracy"])
                if row["pp"]:
                    move_changes[mid]["pp"] = int(row["pp"])

    damage_classes = {1: "status", 2: "physical", 3: "special"}
    damage_classes_de = {1: "Status", 2: "Physisch", 3: "Spezial"}

    # Move names
    move_names = {}
    with open(os.path.join(raw_dir, "move_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["move_id"])
            lang = int(row["local_language_id"])
            if mid not in move_names:
                move_names[mid] = {"name_de": "", "name_en": ""}
            if lang == 6:
                move_names[mid]["name_de"] = row["name"]
            elif lang == 9:
                move_names[mid]["name_en"] = row["name"]

    # Move flavor texts
    move_desc = {}
    with open(os.path.join(raw_dir, "move_flavor_text.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["move_id"])
            lang = int(row["language_id"])
            text = row["flavor_text"].replace("\n", " ").replace("\f", " ").strip()
            if mid not in move_desc:
                move_desc[mid] = {"desc_de": "", "desc_en": ""}
            if lang == 6 and not move_desc[mid]["desc_de"]:
                move_desc[mid]["desc_de"] = text
            elif lang == 9 and not move_desc[mid]["desc_en"] and row["version_group_id"] in ("11", "14"):
                move_desc[mid]["desc_en"] = text

    # Base moves table
    all_moves = {}
    with open(os.path.join(raw_dir, "moves.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            mid = int(row["id"])
            gen = int(row["generation_id"])
            if gen <= 5:
                tid = int(row["type_id"]) if row["type_id"] else 1
                power = int(row["power"]) if row["power"] else None
                accuracy = int(row["accuracy"]) if row["accuracy"] else None
                pp = int(row["pp"]) if row["pp"] else 0
                dc_id = int(row["damage_class_id"]) if row["damage_class_id"] else 1
                priority = int(row["priority"]) if row.get("priority") else 0
                target_id = int(row["target_id"]) if row.get("target_id") else 10

                # Apply Gen 5 changelog if applicable
                if mid in move_changes:
                    if "power" in move_changes[mid]:
                        power = move_changes[mid]["power"]
                    if "accuracy" in move_changes[mid]:
                        accuracy = move_changes[mid]["accuracy"]
                    if "pp" in move_changes[mid]:
                        pp = move_changes[mid]["pp"]

                cat = damage_classes.get(dc_id, "status")
                cat_de = damage_classes_de.get(dc_id, "Status")

                # Tactical Grid Range & AoE rules (P&P System):
                # 1. Erstschlaggarantie (Priority > 0): Radius 3, Hit & Run (kann nach Angriff noch ziehen!)
                # 2. Physisch Einzelziel: Radius 2, 1 Ziel
                # 3. Spezial Einzelziel: Radius 4, 1 Ziel
                # 4. Physisch Multi-Target: 3-Felder Kreis Radius
                # 5. Spezial Multi-Target: 4-Felder Kreis Radius
                # 6. Kegel-Attacken (z.B. Surfer, Hitzewelle, Lehmsbrühe): Kegel 3 oder 4 Felder
                cone_ids = {57, 75, 196, 257, 314, 330, 510, 555, 51, 129} # Surf, Rasierblatt, Eissturm, Hitzewelle, etc.
                is_multi = target_id in (4, 9, 11)

                if priority > 0:
                    range_type = "priority"
                    range_distance = 3
                    is_hit_and_run = True
                    range_desc = "Reichweite: 3 Felder (Einzelziel) • Hit & Run (Darf danach noch ziehen)"
                elif mid in cone_ids or (target_id == 11 and cat == "special"):
                    range_type = "cone"
                    range_distance = 4 if power and power >= 80 else 3
                    is_hit_and_run = False
                    range_desc = f"Kegel-Angriff: {range_distance} Felder Fächer (trifft alle im Kegel)"
                elif is_multi:
                    if cat == "physical":
                        range_type = "circle"
                        range_distance = 3
                        is_hit_and_run = False
                        range_desc = "Flächen-Angriff: 3 Felder Umkreis (trifft alle im Kreis)"
                    else:
                        range_type = "circle"
                        range_distance = 4
                        is_hit_and_run = False
                        range_desc = "Flächen-Angriff: 4 Felder Umkreis (trifft alle im Kreis)"
                else:
                    if cat == "physical":
                        range_type = "single_physical"
                        range_distance = 2
                        is_hit_and_run = False
                        range_desc = "Reichweite: 2 Felder (Einzelziel)"
                    elif cat == "special":
                        range_type = "single_special"
                        range_distance = 4
                        is_hit_and_run = False
                        range_desc = "Reichweite: 4 Felder (Einzelziel)"
                    else:
                        range_type = "self" if target_id in (7, 8) else "single_status"
                        range_distance = 0 if target_id in (7, 8) else 3
                        is_hit_and_run = False
                        range_desc = "Selbst / Verbündete" if target_id in (7, 8) else "Reichweite: 3 Felder (Status)"

                all_moves[mid] = {
                    "id": mid,
                    "name_de": move_names.get(mid, {}).get("name_de", f"Attacke {mid}"),
                    "name_en": move_names.get(mid, {}).get("name_en", f"Move {mid}"),
                    "type_id": tid,
                    "type_name": types_dict.get(tid, {}).get("identifier", "normal"),
                    "type_de": types_dict.get(tid, {}).get("name_de", "Normal"),
                    "category": cat,
                    "category_de": cat_de,
                    "power": power,
                    "accuracy": accuracy,
                    "pp": pp,
                    "priority": priority,
                    "target_id": target_id,
                    "range_type": range_type,
                    "range_distance": range_distance,
                    "is_hit_and_run": is_hit_and_run,
                    "range_desc": range_desc,
                    "desc_de": move_desc.get(mid, {}).get("desc_de", ""),
                    "desc_en": move_desc.get(mid, {}).get("desc_en", ""),
                    "tm": machines_bw.get(mid, None)
                }

    print(f"Loaded {len(all_moves)} moves.")

    # 9. Pokemon Moves in Gen 5 (Black & White version_group_id 11)
    # methods: 1=level-up, 2=egg, 3=tutor, 4=machine
    pokemon_moves = {}
    with open(os.path.join(raw_dir, "pokemon_moves.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_id"])
            vg = int(row["version_group_id"])
            if pid <= 649 and vg == 11:
                mid = int(row["move_id"])
                method = int(row["pokemon_move_method_id"])
                level = int(row["level"])

                if pid not in pokemon_moves:
                    pokemon_moves[pid] = {
                        "level_up": [], # list of [level, move_id]
                        "machine": [],  # list of move_id
                        "tutor": [],    # list of move_id
                        "egg": []       # list of move_id
                    }

                if method == 1:
                    pokemon_moves[pid]["level_up"].append((level, mid))
                elif method == 4:
                    if mid not in pokemon_moves[pid]["machine"]:
                        pokemon_moves[pid]["machine"].append(mid)
                elif method == 3:
                    if mid not in pokemon_moves[pid]["tutor"]:
                        pokemon_moves[pid]["tutor"].append(mid)
                elif method == 2:
                    if mid not in pokemon_moves[pid]["egg"]:
                        pokemon_moves[pid]["egg"].append(mid)

    # Sort level-up moves by level
    for pid in pokemon_moves:
        # Sort and remove duplicates if any
        sorted_lvl = sorted(list(set(pokemon_moves[pid]["level_up"])), key=lambda x: (x[0], x[1]))
        pokemon_moves[pid]["level_up"] = [[lvl, mid] for lvl, mid in sorted_lvl]
        pokemon_moves[pid]["machine"].sort(key=lambda mid: machines_bw.get(mid, "ZZZ"))
        pokemon_moves[pid]["egg"].sort()
        pokemon_moves[pid]["tutor"].sort()

    # 10. Assemble complete Pokédex array
    pokedex = []
    for pid in range(1, 650):
        # Determine Generation
        if pid <= 151:
            gen = 1
            region = "Kanto"
        elif pid <= 251:
            gen = 2
            region = "Johto"
        elif pid <= 386:
            gen = 3
            region = "Hoenn"
        elif pid <= 493:
            gen = 4
            region = "Sinnoh"
        else:
            gen = 5
            region = "Einall"

        names = pokemon_names.get(pid, {"name_de": f"#{pid}", "name_en": f"#{pid}", "genus_de": "", "genus_en": ""})
        basic = pokemon_basic.get(pid, {"identifier": "", "height": 0, "weight": 0})
        
        # Types
        ptype_slots = pokemon_types.get(pid, {1: 1})
        type_ids = [ptype_slots[1]]
        if 2 in ptype_slots and ptype_slots[2] != ptype_slots[1]:
            type_ids.append(ptype_slots[2])

        type_entries = []
        for tid in type_ids:
            tinfo = types_dict.get(tid, {})
            type_entries.append({
                "id": tid,
                "identifier": tinfo.get("identifier", "normal"),
                "name_de": tinfo.get("name_de", "Normal"),
                "name_en": tinfo.get("name_en", "Normal"),
                "color": tinfo.get("color", "#888888")
            })

        # Base stats
        bstats = pokemon_stats.get(pid, {"hp": 45, "atk": 49, "def": 49, "spa": 65, "spd": 65, "spe": 45})
        total_bstats = sum(bstats.values())
        bstats["total"] = total_bstats

        # Standard Level 50 Stats calculation (Neutral Nature, 31 IV, 0 EV)
        # HP = floor(0.5 * (2 * Base + 31)) + 50 + 10 = Base + 15 + 60 = Base + 75
        # Except Shedinja (#292) where HP is always 1!
        # Other stats = floor(0.5 * (2 * Base + 31)) + 5 = Base + 15 + 5 = Base + 20
        # Wild/P&P average (15 IV, 0 EV):
        # HP = floor(0.5 * (2 * Base + 15)) + 60 = Base + 7 + 60 = Base + 67
        # Other = floor(0.5 * (2 * Base + 15)) + 5 = Base + 7 + 5 = Base + 12
        if pid == 292:
            lv50_hp_max = 1
            lv50_hp_avg = 1
            lv50_hp_base = 1
        else:
            lv50_hp_max = bstats["hp"] + 75
            lv50_hp_avg = bstats["hp"] + 67
            lv50_hp_base = bstats["hp"] + 60

        lv50_stats_standard = {
            "hp": lv50_hp_max,
            "atk": bstats["atk"] + 20,
            "def": bstats["def"] + 20,
            "spa": bstats["spa"] + 20,
            "spd": bstats["spd"] + 20,
            "spe": bstats["spe"] + 20
        }

        # Type effectiveness defense profile in Gen 5
        # Calculate multipliers for all 17 attacking types against this Pokémon
        effectiveness = {}
        for atk_tid in range(1, 18):
            atk_ident = types_dict[atk_tid]["identifier"]
            mult = 1.0
            for dtid in type_ids:
                chart_factor = type_chart.get(atk_tid, {}).get(dtid, 1.0)
                mult *= chart_factor
            if mult != 1.0:
                effectiveness[atk_ident] = mult

        pentry = {
            "id": pid,
            "name_de": names["name_de"],
            "name_en": names["name_en"],
            "genus_de": names["genus_de"],
            "genus_en": names["genus_en"],
            "identifier": basic["identifier"],
            "generation": gen,
            "region": region,
            "types": type_entries,
            "height": basic["height"],
            "weight": basic["weight"],
            "base_stats": bstats,
            "lv50_standard": lv50_stats_standard,
            "effectiveness": effectiveness,
            "abilities": pokemon_abilities.get(pid, []),
            "moves": pokemon_moves.get(pid, {"level_up": [], "machine": [], "tutor": [], "egg": []}),
            "sprites": {
                "front_default": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/{pid}.gif",
                "front_static": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/{pid}.png",
                "back_default": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/{pid}.gif",
                "back_static": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/back/{pid}.png",
                "front_shiny": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/{pid}.gif",
                "front_shiny_static": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/shiny/{pid}.png",
                "back_shiny": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/shiny/{pid}.gif",
                "back_shiny_static": f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/back/shiny/{pid}.png"
            }
        }
        pokedex.append(pentry)

    # 11. Wesen / Natures table for P&P character building
    natures = [
        {"name_de": "Robust", "name_en": "Hardy", "up": None, "down": None},
        {"name_de": "Solo", "name_en": "Lonely", "up": "atk", "down": "def"},
        {"name_de": "Mutig", "name_en": "Brave", "up": "atk", "down": "spe"},
        {"name_de": "Hart", "name_en": "Adamant", "up": "atk", "down": "spa"},
        {"name_de": "Frech", "name_en": "Naughty", "up": "atk", "down": "spd"},
        {"name_de": "Kühn", "name_en": "Bold", "up": "def", "down": "atk"},
        {"name_de": "Sanft", "name_en": "Docile", "up": None, "down": None},
        {"name_de": "Locker", "name_en": "Relaxed", "up": "def", "down": "spe"},
        {"name_de": "Pfiffig", "name_en": "Impish", "up": "def", "down": "spa"},
        {"name_de": "Lasch", "name_en": "Lax", "up": "def", "down": "spd"},
        {"name_de": "Scheu", "name_en": "Timid", "up": "spe", "down": "atk"},
        {"name_de": "Hastig", "name_en": "Hasty", "up": "spe", "down": "def"},
        {"name_de": "Ernst", "name_en": "Serious", "up": None, "down": None},
        {"name_de": "Froh", "name_en": "Jolly", "up": "spe", "down": "spa"},
        {"name_de": "Naiv", "name_en": "Naive", "up": "spe", "down": "spd"},
        {"name_de": "Mäßig", "name_en": "Modest", "up": "spa", "down": "atk"},
        {"name_de": "Mild", "name_en": "Mild", "up": "spa", "down": "def"},
        {"name_de": "Ruhig", "name_en": "Quiet", "up": "spa", "down": "spe"},
        {"name_de": "Kauzig", "name_en": "Bashful", "up": None, "down": None},
        {"name_de": "Hitzig", "name_en": "Rash", "up": "spa", "down": "spd"},
        {"name_de": "Still", "name_en": "Calm", "up": "spd", "down": "atk"},
        {"name_de": "Zart", "name_en": "Gentle", "up": "spd", "down": "def"},
        {"name_de": "Forsch", "name_en": "Sassy", "up": "spd", "down": "spe"},
        {"name_de": "Sacht", "name_en": "Careful", "up": "spd", "down": "spa"},
        {"name_de": "Zaghaft", "name_en": "Quirky", "up": None, "down": None}
    ]

    # 12. Load evolutions
    evolutions_data = {}
    evo_path = "data/evolutions.json"
    if os.path.exists(evo_path):
        with open(evo_path, encoding="utf-8") as f:
            evolutions_data = json.load(f)

    # 13. Load items
    items_data = []
    items_path = "data/items.json"
    if os.path.exists(items_path):
        with open(items_path, encoding="utf-8") as f:
            items_data = json.load(f)

    payload = {
        "pokemon": pokedex,
        "moves": all_moves,
        "types": types_dict,
        "natures": natures,
        "evolutions": evolutions_data,
        "items": items_data
    }

    out_json = "data/pokedex_gen1_5.json"
    out_js = "data/pokedex_data.js"

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    with open(out_js, "w", encoding="utf-8") as f:
        f.write("window.POKEDEX_DATA = ")
        json.dump(payload, f, ensure_ascii=False)
        f.write(";\n")

    fsize = os.path.getsize(out_json)
    fsize_js = os.path.getsize(out_js)
    print(f"Successfully generated {out_json} ({fsize / 1024:.1f} KB)")
    print(f"Successfully generated {out_js} ({fsize_js / 1024:.1f} KB)")
    print(f"Generated {len(pokedex)} Pokemon, {len(all_moves)} moves.")

if __name__ == "__main__":
    main()
