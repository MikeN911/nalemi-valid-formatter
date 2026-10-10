# Nalemi Valid Formatter

Rozšíření pro **VS Code** a **Antigravity IDE**, které provádí statickou kontrolu formátování PHP kódu a bílých znaků (whitespaces). 

Rozšíření kód **automaticky nepřepisuje**, ale upozorňuje vývojáře na chyby formátování formou diagnostik (zvýraznění v editoru a zobrazení v panelu *Problems*). K dispozici jsou také volitelné akce **Quick Fix** pro rychlou opravu.

---

## 🌟 Klíčové vlastnosti a pravidla

1. **Otevírací složené závorky na stejném řádku (1TBS / K&R styl)**:
   - Třídy, rozhraní, traity i enumy (`class Foo {`).
   - Metody a funkce (`public function bar() {`).
   - Řídicí struktury a podmínky (`if (...) {`, `elseif (...) {`, `else {`, `while`, `for`, `foreach`, `switch`, `try`, `catch`).

2. **1 prázdný řádek ihned pod otevírací závorkou `{`**:
   - **Třídy**: Ihned pod deklarací třídy (za `{`) musí následovat právě 1 prázdný řádek.
   - **Metody a funkce**: 
     - Pokud tělo metody/funkce obsahuje **více řádků kódu**, je prázdný řádek za `{` povinný.
     - Pokud metoda/funkce obsahuje **pouze 1 řádek kódu v sobě**, prázdný řádek mezi deklarací a tímto řádkem **není povinný** (platný je jak zápis bez prázdného řádku, tak s 1 prázdným řádkem).
     - Čistě jednořádkové metody (`function foo() { return 1; }`) jsou zcela ignorovány.

3. **Přesně 2 prázdné řádky mezi metodami**:
   - Mezi ukončením jedné metody (`}`) a začátkem další metody (nebo jejího DocBlock komentáře `/** ... */`) musí být právě 2 prázdné řádky.

4. **Kontrola bílých znaků a odsazení (Whitespace Linter)**:
   - **Odsazení tabulátory na prázdných řádcích**: prázdné řádky obsahují tabulátory odpovídající úrovni zanoření (tělo třídy = 1 tab, tělo metody = 2 taby, vnořené podmínky/bloky = 3+ taby), aby kurzor a úroveň odsazení zůstaly zachovány.
   - **Odsazení kódu tabulátory**: výchozí kontrola vyžaduje odsazení tabulátory (`\t`) namísto mezer.
   - **Trailing whitespace**: zakazuje nepotřebné prázdné znaky na koncích řádků s kódem a nepovolené mezery na prázdných řádcích.
   - **Mezera před `{`**: vyžaduje právě jednu mezeru před otevírací závorkou na stejném řádku.

5. **Modulární architektura pro budoucí rozšíření**:
   - Jazykově nezávislé jádro `RuleEngine`.
   - V budoucnu umožňuje snadné přidání dalších jazyků (JavaScript, TypeScript, HTML, CSS).

---

## ⚙️ Konfigurace (`settings.json`)

Všechna pravidla lze zapnout, vypnout nebo upravit v nastavení:

```json
{
	"nalemiValidFormatter.enable": true,
	"nalemiValidFormatter.validateOn": "type",
	"nalemiValidFormatter.php.openingBraceSameLine": true,
	"nalemiValidFormatter.php.controlStructureBraceSameLine": true,
	"nalemiValidFormatter.php.blankLineAfterClassBrace": 1,
	"nalemiValidFormatter.php.blankLineAfterMethodBrace": 1,
	"nalemiValidFormatter.php.blankLinesBetweenMethods": 2,
	"nalemiValidFormatter.common.indentType": "tabs",
	"nalemiValidFormatter.common.noTrailingWhitespace": true,
	"nalemiValidFormatter.common.spaceBeforeOpeningBrace": true,
	"nalemiValidFormatter.common.emptyLineIndentation": "tabs"
}
```

### Popis nastavení

| Nastavení | Typ | Výchozí | Popis |
|---|---|---|---|
| `nalemiValidFormatter.enable` | boolean | `true` | Celkové zapnutí/vypnutí kontroly |
| `nalemiValidFormatter.validateOn` | string | `"type"` | Kdy validovat: `"type"` (při psaní) nebo `"save"` (při uložení) |
| `nalemiValidFormatter.php.openingBraceSameLine` | boolean | `true` | Otevírací závorka `{` na stejném řádku u tříd a metod |
| `nalemiValidFormatter.php.controlStructureBraceSameLine` | boolean | `true` | Otevírací závorka `{` na stejném řádku u `if`, `while`, atd. |
| `nalemiValidFormatter.php.blankLineAfterClassBrace` | integer | `1` | Počet prázdných řádků ihned pod `{` třídy |
| `nalemiValidFormatter.php.blankLineAfterMethodBrace` | integer | `1` | Počet prázdných řádků ihned pod `{` metody |
| `nalemiValidFormatter.php.blankLinesBetweenMethods` | integer | `2` | Počet prázdných řádků mezi metodami ve třídě |
| `nalemiValidFormatter.common.indentType` | string | `"tabs"` | Požadované odsazení: `"tabs"`, `"spaces"`, nebo `"off"` |
| `nalemiValidFormatter.common.noTrailingWhitespace` | boolean | `true` | Hlásit prázdné znaky na konci řádků |
| `nalemiValidFormatter.common.spaceBeforeOpeningBrace` | boolean | `true` | Vyžadovat mezeru před `{` na stejném řádku |
| `nalemiValidFormatter.common.emptyLineIndentation` | string | `"tabs"` | Odsazení prázdných řádků: `"tabs"` (dle úrovně zanoření), `"allow-empty-or-tabs"` (prázdné i tabulátory), `"empty"`, `"off"` |

---

## ⌨️ Příkazy

- **`Nalemi Formatter: Zkontrolovat formátování aktuálního souboru`** (`nalemiValidFormatter.validateActiveDocument`)  
  Spustí okamžitou validaci otevřeného PHP souboru.
- **`Nalemi Formatter: Opravit formátování a bílé znaky v aktuálním souboru`** (`nalemiValidFormatter.fixAllWhitespace`)  
  Bezpečně aplikuje všechny navržené opravy mezer a prázdných řádků v otevřeném souboru.

---

## 💡 Rychlé opravy (Quick Fix)

Při najetí myší na podtrženou chybu nebo stisknutí `Ctrl+.` (případně `Cmd+.` na macOS) nabízí rozšíření automatický **Quick Fix**, např.:
- *Přesunout otevírací závorku '{' na konec deklarace*
- *Vložit 1 prázdný řádek za '{'*
- *Doplnit prázdný řádek mezi metodami*
- *Odstranit prázdné znaky na konci řádku*

---

## 🚀 Vývoj, testy a generování VSIX balíčku

```bash
# Instalace závislostí
npm install

# Spuštění sady automatizovaných testů
npm test

# Kompilace produkčního balíčku
npm run build

# Vytvoření nového VSIX balíčku s navýšením verze (patch: 0.1.1 -> 0.1.2):
npm run package
# nebo ve Windows:
.\build-package.ps1
# nebo poklepáním na:
build-package.bat
```

Pro specifické navýšení verze:
```bash
npm run package:minor    # navýší minor verzi (např. 0.1.1 -> 0.2.0)
npm run package:major    # navýší major verzi (např. 0.1.1 -> 1.0.0)
node package-vsix.js 0.5.0 # nastaví konkrétní verzi
```

### Instalace vygenerovaného VSIX
V terminálu:
```bash
code --install-extension "nalemi-valid-formatter-X.Y.Z.vsix"
```
Nebo přímo v VS Code / Antigravity IDE:
1. Přejděte do panelu **Extensions** (`Ctrl+Shift+X`).
2. Klikněte na ikonu tří teček `...` vpravo nahoře.
3. Zvolte **Install from VSIX...** a vyberte vygenerovaný `.vsix` soubor.
