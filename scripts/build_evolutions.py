import csv
import json
import os

def build_evolutions():
    print("Building evolution chains for Gen 1-5...")
    raw_dir = "data_raw"

    item_names = {}
    with open(os.path.join(raw_dir, "item_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["local_language_id"] == "6": # German
                item_names[int(row["item_id"])] = row["name"]

    move_names = {}
    with open(os.path.join(raw_dir, "move_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["local_language_id"] == "6":
                move_names[int(row["move_id"])] = row["name"]

    pokemon_names = {}
    with open(os.path.join(raw_dir, "pokemon_species_names.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = int(row["pokemon_species_id"])
            if pid <= 649 and row["local_language_id"] == "6":
                pokemon_names[pid] = row["name"]

    species_from = {}
    with open(os.path.join(raw_dir, "pokemon_species.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            sid = int(row["id"])
            if sid <= 649:
                from_id = int(row["evolves_from_species_id"]) if row["evolves_from_species_id"] else None
                species_from[sid] = from_id

    evolutions = {} # base_species_id -> list of evolution options
    with open(os.path.join(raw_dir, "pokemon_evolution.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            target_id = int(row["evolved_species_id"])
            if target_id <= 649:
                base_id = species_from.get(target_id)
                if base_id and base_id <= 649:
                    trig = int(row["evolution_trigger_id"])
                    min_lvl = int(row["minimum_level"]) if row["minimum_level"] else None
                    item_id = int(row["trigger_item_id"]) if row["trigger_item_id"] else None
                    held_item_id = int(row["held_item_id"]) if row["held_item_id"] else None
                    move_id = int(row["known_move_id"]) if row["known_move_id"] else None
                    loc_id = int(row["location_id"]) if row["location_id"] else None
                    happiness = int(row["minimum_happiness"]) if row["minimum_happiness"] else None

                    evo_type = "other"
                    desc = ""

                    if item_id:
                        evo_type = "item"
                        i_name = item_names.get(item_id, f"Item {item_id}")
                        desc = f"Item-Entwicklung ({i_name})"
                    elif trig == 2:
                        evo_type = "trade"
                        if held_item_id:
                            h_name = item_names.get(held_item_id, f"Item {held_item_id}")
                            desc = f"Tausch mit getragenem Item ({h_name})"
                        else:
                            desc = "Tausch-Entwicklung"
                    elif move_id:
                        evo_type = "move"
                        m_name = move_names.get(move_id, f"Attacke {move_id}")
                        desc = f"Attacken-basiert (Kennt {m_name})"
                    elif loc_id or row["near_special_rock"] == "1":
                        evo_type = "location"
                        desc = "Orts-basiert (Besonderer Ort wie Moos-/Eisfelsen/Kraterberg)"
                    elif min_lvl:
                        evo_type = "level"
                        desc = f"Level-Entwicklung (Ab Lv. {min_lvl})"
                    elif happiness:
                        evo_type = "happiness"
                        desc = "Freundschafts-Entwicklung (Hohe Zuneigung)"
                    else:
                        evo_type = "special"
                        desc = "Spezielle Entwicklung"

                    target_name = pokemon_names.get(target_id, f"Pokemon {target_id}")

                    # Prevent duplicates
                    existing = evolutions.setdefault(base_id, [])
                    if not any(e["target_id"] == target_id for e in existing):
                        existing.append({
                            "target_id": target_id,
                            "target_name_de": target_name,
                            "type": evo_type,
                            "min_level": min_lvl,
                            "desc": desc
                        })

    out_file = "data/evolutions.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(evolutions, f, ensure_ascii=False, indent=2)

    print(f"Saved {out_file} ({len(evolutions)} Pokemon have evolutions)")

if __name__ == "__main__":
    build_evolutions()
