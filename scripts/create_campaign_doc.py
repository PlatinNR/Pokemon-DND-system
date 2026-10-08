import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = docx.Document()

    # Page setup - 2.5cm margins (approx 1 inch)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Palette
    COLOR_PRIMARY = RGBColor(26, 54, 93)     # Deep Slate Blue #1a365d
    COLOR_SECONDARY = RGBColor(180, 83, 9)   # Amber / Solarpunk Gold #b45309
    COLOR_DARK = RGBColor(31, 41, 55)        # Charcoal #1f2937
    COLOR_MUTED = RGBColor(107, 114, 128)    # Gray #6b7280

    # Normal Style settings
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Calibri'
    font.size = Pt(11)
    font.color.rgb = COLOR_DARK

    def set_cell_background(cell, fill_hex):
        shading_xml = f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'
        cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def add_callout(text, title=None, border_color="b45309", bg_color="fffbeb"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=200)

        # Left border only
        borders_xml = f'''
        <w:tcBorders {nsdecls("w")}>
            <w:top w:val="none"/>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
        '''
        cell._tc.get_or_add_tcPr().append(parse_xml(borders_xml))

        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2)
        if title:
            r_title = p.add_run(f"{title}\n")
            r_title.bold = True
            r_title.font.color.rgb = COLOR_SECONDARY
            r_title.font.size = Pt(11)
        r_text = p.add_run(text)
        r_text.font.size = Pt(10.5)
        r_text.font.italic = True
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # -------------------------------------------------------------
    # TITEL-SEITE / HEADER
    # -------------------------------------------------------------
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("POKÉMON PEN & PAPER")
    run_title.font.size = Pt(26)
    run_title.bold = True
    run_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(8)
    run_sub = p_sub.add_run("KAMPAGNEN-KOMPENDIUM & SPIELLEITER-LEITFADEN")
    run_sub.font.size = Pt(13)
    run_sub.bold = True
    run_sub.font.color.rgb = COLOR_SECONDARY

    p_badge = doc.add_paragraph()
    p_badge.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_badge.paragraph_format.space_after = Pt(24)
    run_badge = p_badge.add_run("Staffel 1 / Akt 1: Der Weg nach oben • Version 1.0 (Bearbeitbar)")
    run_badge.font.size = Pt(10)
    run_badge.font.italic = True
    run_badge.font.color.rgb = COLOR_MUTED

    doc.add_heading("1. Das Kampagnen-Fundament: Die Welt", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Willkommen in einer dystopischen Pokémon-Welt, in der Glanz und Elend strikt voneinander getrennt sind. Kein traditioneller Kampf um Arenenorden – hier geht es um Infiltration, Tyrannei, moralische Konflikte und das nackte Überleben.")

    # Schauplätze Tabelle
    tbl_loc = doc.add_table(rows=5, cols=2)
    tbl_loc.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_loc.autofit = False

    loc_data = [
        ("Schauplatz", "Beschreibung & Atmosphäre"),
        ("Die Himmelsinsel 'Eden'", "Ein schwebendes Paradies weit über der Wolkendecke. Kristallklare Flüsse, ewiger Sonnenschein und eine aristokratische Oberschicht. Nur hier existieren gesunde, prachtvolle Pokémon in Hülle und Fülle. Regiert von Kanzler Malakor und seiner gefürchteten Himmels-Garde."),
        ("Die Smog-Niederung (Der Schlund)", "Die finstere, verseuchte Unterwelt. Ewig wälzen sich giftige Industrie-Gase und Ruß durch die Schrottschluchten. Menschen tragen Atemmasken. Wilde Pokémon sind am Boden fast ausgestorben – nur zähe Aasfresser und Müll-Pokémon überleben."),
        ("Mount Sol (Der Sonnen-Kamm)", "Ein riesiger Berg, dessen Felsspitze als einziger Ort des Festlands die dicke Smogdecke durchbricht. Solarpunk-Zuflucht des Widerstands: Hängende Hydrokulturen, Solarsegel, Windturbinen und die Wiege der Rebellion."),
        ("Der Koloss-Aufzug", "Die einzige vertikale Verkehrsader zwischen Erde und Himmel. Gewaltige, meilenlange Ketten und gewaltige Dampfturbinen heben die Plattformen nach Eden. Bewacht von eiskalten Gardisten; Vorplatz voll von verzweifelten Bittstellern.")
    ]

    for r_idx, row in enumerate(loc_data):
        for c_idx, val in enumerate(row):
            cell = tbl_loc.cell(r_idx, c_idx)
            cell.text = val
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            if r_idx == 0:
                set_cell_background(cell, "1a365d")
                cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
                cell.paragraphs[0].runs[0].font.bold = True
            else:
                set_cell_background(cell, "f9fafb" if r_idx % 2 == 1 else "ffffff")
                if c_idx == 0:
                    cell.paragraphs[0].runs[0].font.bold = True
                    cell.paragraphs[0].runs[0].font.color.rgb = COLOR_SECONDARY

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # TEIL 2: REGELWERK
    # -------------------------------------------------------------
    doc.add_heading("2. Das Regelwerk (Nuzlocke, Kerne & DM-Leveling)", level=1)

    p_rules = doc.add_paragraph()
    p_rules.add_run("Dieses Pen & Paper nutzt ein hartes, narrativ spannendes Regelsystem. Jeder Treffer zählt, jede Entscheidung wiegt schwer.")

    doc.add_heading("A. Start-Bedingungen & Nuzlocke-Tod", level=2)
    p_nuz = doc.add_paragraph()
    p_nuz.add_run("• Start auf Level 10: ").bold = True
    p_nuz.add_run("Jeder Spieler beginnt mit genau einem treuen Starter-Pokémon auf Level 10 (ca. 25–35 KP).\n")
    p_nuz.add_run("• Kein Pokémon-Center & Keine Beleber: ").bold = True
    p_nuz.add_run("Fällt ein Pokémon auf 0 KP, ist es tot (Nuzlocke-Regel). Es gibt keine Wiederbelebung.\n")
    p_nuz.add_run("• Heilung durch Feldmedizin: ").bold = True
    p_nuz.add_run("KP regenerieren sich nur über natürliche Rast am Lagerfeuer, seltene Kräuter, Beeren-Salben oder gestohlene Tränke.\n")
    p_nuz.add_run("• Ball-Knappheit: ").bold = True
    p_nuz.add_run("Pokébälle existieren im Untergrund nicht frei verkäuflich. Die Gruppe besitzt handgefertigte 'Schrott-Bälle'. Auf Eden ist der Besitz von Bällen ohne Adelslizenz Hochverrat!")

    doc.add_heading("B. Das DM-Leveling & Trainer-Extrapunkte", level=2)
    add_callout(
        "Wichtigste Grundregel: Nur der Spielleiter (DM) entscheidet, wann ein Pokémon ein Level aufsteigt! "
        "Es gibt keine automatischen Erfahrungspunkte-Tabellen am Tisch. Dadurch behält der DM die volle Kontrolle über die Spielbalance.",
        title="Regel-Prinzip: DM-Gesteuertes Pacing"
    )

    p_ext = doc.add_paragraph()
    p_ext.add_run("Sobald der DM ein Level-Up gewährt (z.B. von Level 10 auf Level 11):\n")
    p_ext.add_run("1. Basiswerte steigen: ").bold = True
    p_ext.add_run("Die Werte steigen normal im System (z.B. über die Web-App per Schieberegler).\n")
    p_ext.add_run("2. Trainer-Extrapunkte: ").bold = True
    p_ext.add_run("Der Spieler erhält 2 Extrapunkte (vom Trainer frei verteilbar auf KP, Angriff, Verteidigung, Sp.Angriff, Sp.Verteidigung oder Initiative). So kann jeder sein Pokémon nach eigenem Spielstil spezialisieren.")

    doc.add_heading("C. Die zwei Kern-Klassen (Kerne brechen)", level=2)
    p_cores = doc.add_paragraph()
    p_cores.add_run("Besiegte Pokémon können 'zerfleischt' werden, um ihren Lebenskern zu rauben. Dies verleiht dem eigenen Pokémon gewaltige Macht, ist in der Welt jedoch ein grausamer Tabubruch:\n")
    p_cores.add_run("• Kleine Kerne (Level 1–24): ").bold = True
    p_cores.add_run("Stammen von Basis-Pokémon und regulären Gegnern. Reichen aus, um Pokémon bis Stufe 24 aufzuleveln.\n")
    p_cores.add_run("• Große Kerne (Ab Level 25+): ").bold = True
    p_cores.add_run("Ab Stufe 25 genügen Kleine Kerne nicht mehr! Um weiter aufzusteigen, müssen Große Kerne von mächtigen, entwickelten Pokémon oder Bossen erbeutet werden.\n")
    p_cores.add_run("• Die Verlockung der Gier: ").bold = True
    p_cores.add_run("Spieler können sich entscheiden, Gegner zu verschonen (Gnade) oder sie kaltblütig für Kerne abzuschlachten (Machtgier).")

    doc.add_heading("D. Das Geheimnis der Natürlichen Perlen (Sonderbonbons)", level=2)
    p_pearls = doc.add_paragraph()
    p_pearls.add_run("In dieser Welt gibt es keine fabrikmäßigen Bonbons. Stattdessen existieren mysteriöse, irisierende Perlen, die von der Natur selbst hervorgebracht werden. Wird eine Perle einem Pokémon berührt, löst sie sich in sanftes Licht auf und gewährt +1 Level – vollkommen rein, ohne dass ein anderes Lebewesen sterben musste. Woher diese Perlen stammen, ist ein großes Rätsel, das erst in späteren Akten gelüftet wird.")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # -------------------------------------------------------------
    # TEIL 3: AKT 1 KOMPLETT-LEITFADEN
    # -------------------------------------------------------------
    doc.add_heading("3. Akt 1: 'Der Weg nach oben' (One-Shot Leitfaden)", level=1)

    p_akt_intro = doc.add_paragraph()
    p_akt_intro.add_run("• Missions-Ziel: ").bold = True
    p_akt_intro.add_run("Mit Lord Cassians adliger Empfehlung zum Koloss-Aufzug gelangen, die Prüfung des Offiziers bestehen und auf Eden ankommen.\n")
    p_akt_intro.add_run("• Geschätzte Dauer: ").bold = True
    p_akt_intro.add_run("3,5 bis 4 Stunden (ideal für einen vollen Pen & Paper Spielabend).")

    doc.add_heading("Phase 1: Das Rebellen-Camp auf Mount Sol (Der Aufbruch)", level=2)
    p_ph1 = doc.add_paragraph()
    p_ph1.add_run("Die Gruppe versammelt sich im Solarpunk-Camp auf dem Sonnen-Kamm. Lord Cassian, ein niederer Adliger und Spion der Rebellion, übergibt der Gruppe ein versiegeltes Empfehlungsschreiben mit seinem Familienwappen. Ihr sollt euch in die neue Himmels-Garde der Tyrannei einschleusen.")

    # Vorbereitungs-NSCs Tabelle
    tbl_nsc_camp = doc.add_table(rows=3, cols=3)
    tbl_nsc_camp.alignment = WD_TABLE_ALIGNMENT.CENTER
    camp_nscs = [
        ("NSC", "Rolle & Persönlichkeit", "Ausrüstung für die Gruppe"),
        ("Mutter Veda", "Ältere Kräuter-Alchemistin mit Hydrokultur-Garten. Mütterlich, aber ernst.", "2x Beeren-Balsam (heilt 15 KP)\n1x Kohle-Paste (heilt Gift/Brand)"),
        ("Kano", "Junger Schrott-Tüftler mit Schweißerbrille. Hektisch, loyal.", "1x Schrott-Ball pro Spieler\n1x Atemmaske pro Spieler")
    ]
    for r_idx, row in enumerate(camp_nscs):
        for c_idx, val in enumerate(row):
            cell = tbl_nsc_camp.cell(r_idx, c_idx)
            cell.text = val
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            if r_idx == 0:
                set_cell_background(cell, "1a365d")
                cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
                cell.paragraphs[0].runs[0].font.bold = True
            else:
                set_cell_background(cell, "f9fafb" if r_idx % 2 == 1 else "ffffff")
                if c_idx == 0:
                    cell.paragraphs[0].runs[0].font.bold = True

    p_sp1 = doc.add_paragraph()
    p_sp1.paragraph_format.space_before = Pt(8)
    p_sp1.add_run("⚔️ Encounter 1: Das Lehr-Duell im Camp (Tutorial & Moral-Lektion)\n").bold = True
    p_sp1.add_run("Bevor es losgeht, fordert der raubeinige Kämpfer Jarek die Spieler mit seinem Knilz (Lv. 9) heraus. ")
    p_sp1.add_run("Sobald Knilz 0 KP erreicht, hält Jarek die Gruppe sofort auf: ")
    p_sp1.add_run("'Halt! Was habt ihr vor?! Wir sind Widerstandskämpfer, keine Bestien der Himmels-Garde. Ein besiegtes Pokémon lässt man am Leben! Kerne herauszureißen ist grausame Ketzerei der Tyrannei.'\n").italic = True
    p_sp1.add_run("-> Spieler begreifen den fundamentalen Unterschied zwischen Kampfunfähigkeit und Hinrichtung für Kerne.")

    doc.add_heading("Phase 2: Der Marsch durch den Schlund", level=2)
    p_ph2 = doc.add_paragraph()
    p_ph2.add_run("Der Abstieg durch verrostete Förderbänder führt in das finstere Meer aus Ruß und Schwefel. Hustende Bergleute und stampfende Pumpen vermitteln die Verzweiflung der Unterwelt.\n")
    p_ph2.add_run("⚔️ Encounter 2: Die Aasfresser im Smog\n").bold = True
    p_ph2.add_run("In einem engen Industrie-Kanal lauern ein Smogon (Lv. 9) und ein Sleima / Alola-Rattfratz (Lv. 8). Die Sicht ist durch Rauch behindert. Erste echte Feuerprobe: Fangen mit dem Schrott-Ball, vorsichtiger Sieg – oder die erste heimliche Kern-Ernte?")

    doc.add_heading("Phase 3: Der Außenposten am Himmels-Aufzug", level=2)
    p_ph3 = doc.add_paragraph()
    p_ph3.add_run("Die Basis des Himmels-Aufzugs ragt meilenweit nach oben. Hunderte bettelnde Menschen drängen gegen die Stahltore.\n")
    p_ph3.add_run("⚔️ Encounter 3: Die Machtdemonstration des Ritters\n").bold = True
    p_ph3.add_run("Sir Vaelen, ein gefürchteter Ritter der Himmels-Garde in polierter schwarzer Rüstung, tritt hervor. Sein imposantes Pokémon (Gladiantri Lv. 16 oder Panzaeron Lv. 18) zerschlägt die Menge mit einem Klingensturm gnadenlos. Die Menge flieht panisch. Sir Vaelen fährt wortlos nach oben. Eine klare Warnung, welche Härte oben herrscht.")

    # 4 Außenposten-NSCs & 4 Wachen Tabelle
    doc.add_heading("Dynamische NSCs im Außenposten & am Aufzug", level=3)
    p_dyn = doc.add_paragraph()
    p_dyn.add_run("Nutze diese vorbereiteten Charaktere flexibel für Gespräche und Konfrontationen:")

    tbl_nsc_dyn = doc.add_table(rows=5, cols=2)
    tbl_nsc_dyn.alignment = WD_TABLE_ALIGNMENT.CENTER
    dyn_data = [
        ("4 Charaktere im Außenposten (Begegnungen)", "4 Wachen am Aufzug (Vom DM einsetzbar)"),
        ("1. Rook (Zynischer Schrottsammler):\nTrinkt an einer Kiste. Kennt den Oststollen und warnt vor den Banditen.",
         "1. Wachsoldat Grimm (Dienst nach Vorschrift):\nBürokratisch, stur, prüft Cassians Siegel dreifach mit Lupe."),
        ("2. Kira (Verletzte Ex-Rekrutin):\nIhre Hände sind bandagiert. Ihr Pokémon wurde fast getötet; fleht zur Vorsicht.",
         "2. Korporal Brann (Der Sadist):\nLiebt Wetten auf Blutkämpfe. Verhöhnt Rekruten aus dem Pöbel."),
        ("3. Pater Silas (Blinder Prediger):\nMurmelt Prophezeiungen über das 'Reinigende Licht des Himmels'.",
         "3. Sergeant Kael (Der Bestechliche):\nNimmt Schrott-Teile, rations oder Gefallen, um wegzusehen."),
        ("4. Moritz (Zwielichtiger Schmuggler):\nBietet an, Pokébälle in doppelten Böden zu verstecken – gegen Gegenleistung.",
         "4. Wächterin Lyra (Die Misstrauische):\nHat Adleraugen für verbotene Schrott-Pokébälle und Diebesgut.")
    ]
    for r_idx, row in enumerate(dyn_data):
        for c_idx, val in enumerate(row):
            cell = tbl_nsc_dyn.cell(r_idx, c_idx)
            cell.text = val
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            if r_idx == 0:
                set_cell_background(cell, "1a365d")
                cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
                cell.paragraphs[0].runs[0].font.bold = True
            else:
                set_cell_background(cell, "f9fafb" if r_idx % 2 == 1 else "ffffff")

    doc.add_heading("Phase 4: Die Prüfung des Offiziers – Die Banditen-Mine", level=2)
    p_ph4 = doc.add_paragraph()
    p_ph4.add_run("Der kommandierende Garde-Offizier akzeptiert den Brief eines niederen Adligen nicht ohne Tatbeweis: ")
    p_ph4.add_run("'Räumt die Mine im Oststollen von den Banditen – dann stempel ich eure Rekruten-Bürgschaft!'\n").italic = True
    p_ph4.add_run("Die Mine ist ein verwinkeltes System aus alten Holzstegen, Loren und Wasserrohren an der Decke.")

    # 3 Lösungswege
    tbl_mine = doc.add_table(rows=4, cols=2)
    tbl_mine.alignment = WD_TABLE_ALIGNMENT.CENTER
    mine_ways = [
        ("Lösungsweg", "Herausforderung & Belohnung / Risiko"),
        ("Weg 1: Gewalt (Frontaler Kampf)", "Bis zu 3 Banditen-Kämpfe (Gegner: Praktibalk, Ganovil, Zubat Lv. 9–10).\nGefahr von KP-Verlust / Nuzlocke-Tod. Chance auf bis zu 3 Kleine Kerne!"),
        ("Weg 2: Umgebung (Die Mine fluten)", "Geschicklichkeits-Parkour über morsche Rohre zur Haupt-Druckschleuse. Ein Wasser- oder Elektro-Pokémon knackt das Ventil. Grubenwasser bricht herein – die Banditen fliehen panisch!"),
        ("Weg 3: Heimlichkeit & Täuschung", "Schleichen durch Nebenschächte zum Banditen-Anführer. Nutzung von Cassians Siegel, um vorzutäuschen, eine reguläre Strafexpedition stünde hinter der Gruppe.")
    ]
    for r_idx, row in enumerate(mine_ways):
        for c_idx, val in enumerate(row):
            cell = tbl_mine.cell(r_idx, c_idx)
            cell.text = val
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            if r_idx == 0:
                set_cell_background(cell, "1a365d")
                cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
                cell.paragraphs[0].runs[0].font.bold = True
            else:
                set_cell_background(cell, "f9fafb" if r_idx % 2 == 1 else "ffffff")
                if c_idx == 0:
                    cell.paragraphs[0].runs[0].font.bold = True
                    cell.paragraphs[0].runs[0].font.color.rgb = COLOR_SECONDARY

    doc.add_heading("Phase 5: Das Finale von Akt 1 – Zwei Wege nach oben", level=2)
    p_end = doc.add_paragraph()
    p_end.add_run("Am Ende erreichen die Charaktere in jedem Fall die Himmelsinsel Eden, aber unter völlig anderen Vorzeichen:\n")
    p_end.add_run("🟢 Ausgang A: Triumph als Rekruten (Erfolg)\n").bold = True
    p_end.add_run("Die Mine ist geräumt, Pokébälle blieben unentdeckt. Der Offizier stempelt die Rekruten-Bürgschaft. Der DM gewährt das Level-Up auf Level 11 (+ 2 Extrapunkte). Die Gruppe betritt als gefeierte Rekruten den Aufzug. Oben beginnt die Undercover-Spionage!\n\n")
    p_end.add_run("🔴 Ausgang B: In Ketten nach Eden (Gefängnistransport)\n").bold = True
    p_end.add_run("Die Gruppe scheitert in der Mine ODER Wächterin Lyra entdeckt die nicht autorisierten Schrott-Bälle. Cassians Adels-Siegel rettet sie vor sofortiger Hinrichtung, führt aber zur Überstellung nach oben in Ketten. Sie erreichen Eden in einem Frachtkäfig und landen im Hochsicherheits-Gefängnis der ersten Ebene. Perfekter Start für Akt 2: Der Ausbruch!")

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # -------------------------------------------------------------
    # TEIL 4: NOTIZEN & SPIELLEITER-TAGEBUCH
    # -------------------------------------------------------------
    doc.add_heading("4. Spielleiter-Notizen & Kampagnen-Tagebuch", level=1)
    p_notes_intro = doc.add_paragraph()
    p_notes_intro.add_run("Diesen Bereich kannst du in Word nach Belieben bearbeiten, deine Spieler-Daten eintragen und für nachfolgende Akte fortschreiben.")

    tbl_chars = doc.add_table(rows=5, cols=4)
    tbl_chars.alignment = WD_TABLE_ALIGNMENT.CENTER
    char_headers = ["Spieler / Charakter", "Starter-Pokémon", "Aktuelles Level & KP", "Verteilte Extrapunkte"]
    for c_idx, h in enumerate(char_headers):
        cell = tbl_chars.cell(0, c_idx)
        cell.text = h
        set_cell_background(cell, "1a365d")
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_margins(cell, top=70, bottom=70, left=90, right=90)

    for r_idx in range(1, 5):
        for c_idx in range(4):
            cell = tbl_chars.cell(r_idx, c_idx)
            cell.text = "—"
            set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
            set_cell_background(cell, "f9fafb" if r_idx % 2 == 1 else "ffffff")

    doc.add_paragraph().paragraph_format.space_before = Pt(12)
    doc.add_heading("Eigene Notizen & Ideen für Akt 2:", level=2)
    p_free = doc.add_paragraph()
    p_free.add_run("[Hier kannst du eigene Gedanken, NSC-Ideen für Eden, gefundene Perlen oder Pläne für den Gefängnisausbruch / die Kaserne notieren...]")

    filename = "Pokemon_Pen_and_Paper_Kampagne_Akt1.docx"
    doc.save(filename)
    print(f"Document saved successfully as '{filename}'.")

if __name__ == '__main__':
    create_document()
