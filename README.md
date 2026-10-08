# 🎮 Pokémon Pen & Paper – Gen 1–5 Live-System (Schwarz & Weiß Edition)

Eine vollständige, moderne Rollenspiel-Plattform für dein **Pokémon Pen & Paper**.  
Mit zwei separaten Live-Anwendungen für **Spielleiter (DM)** und **Spieler (Trainer)**, Echtzeit-Synchronisation im Netzwerk/WLAN, Attacken-Management beim Level-Up, Entwicklungs-Zentrum und PWA/APK-Unterstützung für Android-Smartphones.

---

## 📱 Zwei Anwendungen & Download-Hub

Das System besteht aus zwei eigenständigen Oberflächen:

1. [**`download.html`**](file:///c:/Users/nicla/Desktop/Zentraler%20Ordner/Opencode%20Projekts/Pokemon%20Pen%20and%20paper/download.html) **– Das zentrale App- & Download-Portal:**
   * Zeigt die lokale Netzwerk-IP (`http://192.168.x.x:3000`).
   * Bietet dynamische **QR-Codes**, damit Spieler die Trainer-App direkt mit der Handykamera im WLAN öffnen können.
   * Anleitung für die **Android-APK / PWA-Installation**.

2. [**`trainer.html`**](file:///c:/Users/nicla/Desktop/Zentraler%20Ordner/Opencode%20Projekts/Pokemon%20Pen%20and%20paper/trainer.html) **– Die Trainer-App (Für Spieler / Smartphone):**
   * **Mein Team:** Übersicht aller zugewiesenen Pokémon mit B&W Sprites, KP-Tracker mit Schnell-Buttons (`-10`, `-5`, `-1`, `+1`, `+5`, `+10`).
   * **Level-Up & Attacken-Management:**
     * Steigt ein Pokémon im Level auf, wird geprüft, ob es eine neue Attacke lernt.
     * Beherrscht das Pokémon bereits **4 Attacken**, öffnet sich automatisch das **Attacken-Vergessen-Menü**! Der Spieler entscheidet, welche Attacke verlernt wird oder ob das Erlernen abgelehnt wird.
     * Erhält **+2 freie Trainingspunkte** pro Level-Up, die frei auf KON, STÄ, WEI, CHA, INT, GES verteilt werden können.
   * **12 P&P Fertigkeitsproben:** Interaktive `[🎲 W20 + Bonus]` Würfe inklusive Wesen-Modifikatoren (+3 bis -3), die live an den DM übertragen werden!
   * **Mein Rucksack:** Übersicht aller Items (Pokébälle, Tränke, Steine), die der DM vergeben hat, mit Funktion zum Einsetzen.
   * **Würfel-Tab:** Schneller Würfelbecher für W20, W100, W6, W8, W10, W12.

3. [**`dm.html`**](file:///c:/Users/nicla/Desktop/Zentraler%20Ordner/Opencode%20Projekts/Pokemon%20Pen%20and%20paper/dm.html) **– Der DM Screen (Für den Spielleiter / Laptop):**
   * **Trainer & Team-Übersicht:** Live-Monitoring aller KP, Level und Attacken aller Spieler.
   * **✨ Entwicklungs-Zentrum:**
     * **Level-Entwicklungen:** Werden exakt ab Erreichen des Mindestlevels freigeschaltet.
     * **Item-, Tausch-, Attacken- und Orts-Entwicklungen:** Für den DM jederzeit manuell auslösbar.
     * **Sicherheitsabfrage:** Vor jeder Entwicklung erscheint ein Bestätigungsdialog mit Vorher/Nachher-Sprite und Name!
   * **🎒 Live-Item-Vergabe:** Lege Spielern mit einem Klick Items (Bälle, Tränke, Steine) in den Rucksack.
   * **📜 Live-Würfellog:** Alle Proben, Treffer und Aktionen der Spieler treffen in Echtzeit ein.
   * **📖 Pokédex:** 649 Pokémon mit B&W Sprites, Werten und Movesets.

---

## 🚀 Schnappstart (Starten & Verbinden)

### 1. Server starten
Doppelklicke auf [**`start.bat`**](file:///c:/Users/nicla/Desktop/Zentraler%20Ordner/Opencode%20Projekts/Pokemon%20Pen%20and%20paper/start.bat).  
* Startet den Node.js Live-Server auf Port 3000.  
* Öffnet automatisch das Download- und App-Portal `http://localhost:3000/download.html`.

### 2. Spieler verbinden (Im selben WLAN)
* Öffne auf deinem Laptop `download.html`.
* Spieler scannen den angezeigten QR-Code mit ihrer Handykamera oder rufen die angezeigte Netzwerk-Adresse auf (z.B. `http://192.168.178.175:3000/trainer.html`).
* Beide Geräte sind nun live verbunden!

---

## 🤖 APK & PWA Installation auf Android

### Methode 1: Direkte PWA-Installation (Empfohlen & Schnellste Methode)
1. Der Spieler öffnet den Link in **Google Chrome** auf seinem Android-Handy.
2. Oben rechts auf die drei Punkte **(⋮)** tippen.
3. Auf **"App installieren"** oder **"Zum Startbildschirm hinzufügen"** tippen.
4. Die App verhält sich sofort wie eine native Android APK:
   * Eigenes Pokéball-Icon auf dem Homescreen.
   * Startet im echten Vollbild (ohne Browser-URL-Leiste).
   * Eigener Task in der Android App-Übersicht.

### Methode 2: Standalone .apk kompilieren
Im Projektordner befindet sich [**`build_apk.bat`**](file:///c:/Users/nicla/Desktop/Zentraler%20Ordner/Opencode%20Projekts/Pokemon%20Pen%20and%20paper/build_apk.bat):
* Führe das Skript aus, um ein Capacitor-Android-Projekt zu initialisieren oder Bubblewrap CLI zu starten.
* Kompiliert eine eigenständige `.apk` Datei, die per WhatsApp, Discord oder USB weitergegeben werden kann.

---

## 🏛️ Das Pen & Paper Regelsystem

### 1. Die 6 P&P Grund-Attribute
* **Konstitution (KON)** $\leftarrow$ aus den **KP** (Ausdauer, Zähigkeit, Giften widerstehen)
* **Stärke (STÄ)** $\leftarrow$ aus dem **Angriff** (Felsen stemmen, Bäume umreißen, Athletik)
* **Weisheit (WEI)** $\leftarrow$ aus der **Verteidigung** (Wahrnehmung, Instinkt, Spurenlesen, Willenskraft)
* **Charisma (CHA)** $\leftarrow$ aus dem **Spezial-Angriff** (Einschüchtern, Überzeugen, Täuschung, Ausstrahlung)
* **Intelligenz (INT)** $\leftarrow$ aus der **Spezial-Verteidigung** (Nachforschungen, Naturkunde, Rätsel lösen)
* **Geschicklichkeit (GES)** $\leftarrow$ aus der **Initiative** (Akrobatik, Schleichen, Ausweichen, Schnelligkeit)

### 2. Die Skalierungsformel für den Würfelbonus
* **Bis Wert 70 in 7er-Schritten:** $\lfloor \text{Wert} / 7 \rfloor$
  * Wert 35 $\rightarrow$ **+5**
  * Wert 63 $\rightarrow$ **+9**
  * Wert 70 $\rightarrow$ **+10**
* **Über Wert 70 in 10er-Schritten:** $10 + \lfloor (\text{Wert} - 70) / 10 \rfloor$
  * Wert 100 $\rightarrow$ **+13**
  * Wert 170 $\rightarrow$ **+20**
  * Wert 200 $\rightarrow$ **+23**
  * Wert 260 $\rightarrow$ **+29**

### 3. Die 12 Fertigkeiten (Skills) & Wesens-Pakete
1. **Athletik** [STÄ] • 2. **Akrobatik** [GES] • 3. **Schleichen** [GES] • 4. **Fingerfertigkeit** [GES]
5. **Zähigkeit** [KON] • 6. **Nachforschungen** [INT] • 7. **Naturkunde** [INT]
8. **Wahrnehmung** [WEI] • 9. **Überlebenskunst** [WEI]
10. **Einschüchtern** [CHA] • 11. **Täuschung** [CHA] • 12. **Überzeugen** [CHA]

Jedes der **25 Wesen** verleiht feste Boni (+3, +2, +1) und Abzüge (-1, -2, -3) auf die Fertigkeiten (z.B. Frech: *+3 Akrobatik, +2 Athletik, +1 Täuschung, -1 Überzeugen, -2 Wahrnehmung, -3 Nachforschungen*).
