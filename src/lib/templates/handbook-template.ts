// Simple UUID generator function to replace uuid library
const generateId = (): string => {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// Alla handböcker och deras innehåll ska använda 'Instrument Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif som font-family för rubriker, brödtext och UI-element.

export interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  pages: Page[];
  isActive: boolean;
}

export interface HandbookTemplate {
  sections: Section[];
}

// Ikoner för varje sektion
export const sectionIcons: { [key: string]: string } = {
  "Välkommen": "👋",
  "Kontaktuppgifter och styrelse": "👥",
  "Stadgar och årsredovisning": "📋",
  "Renoveringar och underhåll": "🔨",
  "Bopärmar och regler": "📖",
  "Sopsortering och återvinning": "♻️",
  "Parkering och garage": "🚗",
  "Tvättstuga och bokningssystem": "👕",
  "Felanmälan": "🔧",
  "Trivselregler": "🤝",
  "Gemensamma utrymmen": "🏢",
  "Vanliga frågor (FAQ)": "❓",
  "Dokumentarkiv": "📁"
};

export const defaultHandbookTemplate: HandbookTemplate = {
  sections: [
    {
      id: generateId(),
      title: "Välkommen",
      description: "Välkommen till föreningens digitala handbok! Här hittar du all viktig information om ditt boende och föreningen.",
      order: 1,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Om föreningen",
          content: `# Om vår förening

Här finner du grundläggande information om vår bostadsrättsförening, inklusive historia, vision och kontaktuppgifter.

## Fakta om föreningen

- **Bildad år:** 1987
- **Antal lägenheter:** 42
- **Adress:** Ekstugan 15, 123 45 Stockholm
- **Organisationsnummer:** 123456-7890
- **Byggår:** 1987
- **Antal våningar:** 5
- **Elevator:** Ja
- **Parkering:** 35 platser

## Vår vision

Vår förening strävar efter att skapa en trivsam boendemiljö med god gemenskap och ekonomisk stabilitet. Vi uppmuntrar alla medlemmar att engagera sig i föreningens angelägenheter.

## Ekonomi och avgifter

Månadsavgiften varierar beroende på lägenhetsstorlek och inkluderar:
- Uppvärmning
- Varmvatten  
- Sophämtning
- Fastighetsskötsel
- Försäkringar
- Underhåll av gemensamma utrymmen`,
          order: 1,
        },
        {
          id: generateId(),
          title: "För nya medlemmar",
          content: `# Information för nya medlemmar

Detta avsnitt innehåller praktisk information som är särskilt användbar för dig som är ny medlem i föreningen.

## Välkommen som ny medlem!

Vi är glada att du har valt att bo i vår förening. Här hittar du allt du behöver veta för att komma igång.

## Viktigt att känna till

- **Årsstämma:** Hålls vanligtvis i mars månad
- **Styrelsemöten:** Första onsdagen varje månad kl. 19:00
- **Felanmälan:** Görs via vår digitala plattform eller genom att kontakta fastighetsskötaren
- **Nycklar:** Extrakopior kan beställas hos styrelsen
- **Parkeringsplats:** Kan hyras separat, väntelista finns

## Första tiden i föreningen

Vi rekommenderar att du:
1. Läser igenom stadgarna och trivselreglerna
2. Presenterar dig för grannarna
3. Sparar kontaktuppgifter till styrelse och fastighetsskötare
4. Anmäler dig till våra digitala kanaler för information
5. Kontaktar styrelsen om du har frågor

## Förtroendevalda och engagemang

Som medlem välkomnar vi ditt engagemang! Du kan:
- Delta i styrelsens arbete
- Engagera dig i olika arbetsgrupper
- Komma med förslag på förbättringar
- Delta aktivt på årsstämman`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Kontaktuppgifter och styrelse",
      description: "Information om styrelsen och viktiga kontaktuppgifter",
      order: 2,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Styrelsen",
          content: `# Styrelsen

Här presenteras föreningens styrelsemedlemmar och deras ansvarsområden.

## Styrelsemedlemmar 2024

### Anna Andersson - Ordförande
- **Telefon:** 070-123 45 67
- **E-post:** anna.andersson@exempel.se
- **Ansvar:** Övergripande ledning, kontakt med myndigheter
- **Bor i:** Lägenhet 15, 3 tr

### Erik Eriksson - Kassör  
- **Telefon:** 070-234 56 78
- **E-post:** erik.eriksson@exempel.se
- **Ansvar:** Ekonomi, bokföring, avgifter
- **Bor i:** Lägenhet 8, 2 tr

### Maria Johansson - Sekreterare
- **Telefon:** 070-345 67 89
- **E-post:** maria.johansson@exempel.se
- **Ansvar:** Protokoll, korrespondens
- **Bor i:** Lägenhet 23, 4 tr

### Lars Svensson - Ledamot
- **Telefon:** 070-456 78 90
- **E-post:** lars.svensson@exempel.se
- **Ansvar:** Tekniska frågor, underhåll
- **Bor i:** Lägenhet 3, 1 tr

### Karin Nilsson - Ledamot
- **Telefon:** 070-567 89 01
- **E-post:** karin.nilsson@exempel.se
- **Ansvar:** Trivsel, gemensamma aktiviteter
- **Bor i:** Lägenhet 31, 5 tr

## Styrelsemöten

- **När:** Första onsdagen varje månad kl. 19:00
- **Plats:** Föreningslokalen (källarplan)
- **Medlemmar välkomna:** Efter anmälan till ordföranden

## Kontakta styrelsen

- **Allmänna frågor:** styrelsen@ekstugan15.se
- **Akuta ärenden:** Ring ordföranden direkt`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Viktiga kontakter",
          content: `# Viktiga kontakter

Här hittar du kontaktuppgifter till förvaltare, fastighetsskötare och andra viktiga kontakter.

## Fastighetsskötsel

### Sven Karlsson - Fastighetsskötare
- **Telefon:** 070-111 22 33
- **E-post:** sven.karlsson@fastighet.se
- **Arbetstider:** Måndag-fredag 07:00-15:00
- **Ansvar:** Daglig drift, mindre reparationer, städning

### Jourfunktion (kvällar/helger)
- **Telefon:** 08-123 456 78
- **Endast för akuta ärenden:** Vattenläckor, el-fel, inbrott
- **Kostnad:** 1200 kr för icke-akuta ärenden

## Förvaltning

### Stockholm Bostadsförvaltning AB
- **Adress:** Förvaltargatan 10, 111 22 Stockholm  
- **Telefon:** 08-234 567 89
- **E-post:** info@stockholmforvaltning.se
- **Handläggare:** Linda Petersson
- **Ansvar:** Ekonomisk förvaltning, försäkringar

## Entreprenörer

### El-företag
- **Företag:** Stockholm El Service AB
- **Telefon:** 08-345 678 90
- **Jour:** 070-123 123 12

### VVS-företag  
- **Företag:** Rörexperten Stockholm AB
- **Telefon:** 08-456 789 01
- **Jour:** 070-234 234 23

### Hiss-service
- **Företag:** LiftTech Sverige AB
- **Telefon:** 08-567 890 12
- **Jour:** 070-345 345 34

## Myndigheter

### Stockholm Stad - Miljöförvaltningen
- **Telefon:** 08-508 285 00
- **Ärenden:** Miljötillsyn, bullerklagomål

### Polisen - Lokalpolisområde Södermalm  
- **Telefon:** 114 14 (icke-akut)
- **Nödnummer:** 112`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Stadgar och årsredovisning",
      description: "Föreningens stadgar och ekonomiska dokument",
      order: 3,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Stadgar",
          content: `# Föreningens stadgar

Här hittar du föreningens stadgar som reglerar verksamheten.

## Aktuella stadgar

Stadgarna antogs på årsstämman 2023 och gäller från 1 april 2023.

### Viktigaste punkterna

**§ 3 Föreningens ändamål**
Föreningen har till ändamål att främja medlemmarnas ekonomiska intressen genom att i föreningens hus upplåta bostadslägenheter och lokaler.

**§ 7 Medlemskap**
- Medlemskap erhålls genom förvärv av bostadsrätt
- Vid överlåtelse ska köparen godkännas av styrelsen
- Styrelsen kan endast vägra godkännande om det finns särskilda skäl

**§ 12 Månadsavgift**
- Avgiften fastställs av årsstämman
- Betalas senast den 25:e varje månad
- Vid försenad betalning utgår dröjsmålsränta

**§ 15 Disposition av lägenhet**
- Uthyrning i andra hand kräver styrelsens tillstånd
- Tillstånd gäller normalt max 2 år
- Korttidsuthyrning via digitala plattformar är inte tillåtet

## Dokumentarkiv

- [Stadgar 2023 (PDF)](#)
- [Protokoll årsstämma 2024 (PDF)](#)
- [Föreningens ordningsregler (PDF)](#)`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Årsredovisningar",
          content: `# Årsredovisningar

Här hittar du föreningens senaste årsredovisningar och ekonomiska rapporter.

## Årsredovisning 2023

### Sammanfattning
- **Totala intäkter:** 2 450 000 kr
- **Totala kostnader:** 2 380 000 kr  
- **Årets resultat:** +70 000 kr
- **Soliditet:** 45%
- **Skuldsättningsgrad:** 1,2

### Större underhållsinsatser 2023
- Byte av fönster (våning 3-5): 450 000 kr
- Stamrenovering (WC/Bad): 280 000 kr
- Fasadmålning:** 180 000 kr

## Månadsavgifter 2024

| Lägenhetsstorlek | Avgift/månad |
|------------------|--------------|
| 1 ROK (35-45 kvm) | 3 200 kr |
| 2 ROK (50-65 kvm) | 4 100 kr |
| 3 ROK (70-85 kvm) | 5 200 kr |
| 4 ROK (90-105 kvm) | 6 400 kr |

## Planerat underhåll 2024-2026

### 2024 (Budget: 380 000 kr)
- Byte av ytterdörr och portlås
- Renovering av tvättstuga
- Asfaltering av innergård

### 2025 (Budget: 520 000 kr)  
- Byte av fönster (våning 1-2)
- Upprustning av hiss
- Energieffektivisering

### 2026 (Budget: 680 000 kr)
- Takrenovering
- Uppgradering av el-centraler

## Dokumentarkiv

- [Årsredovisning 2023 (PDF)](#)
- [Budget 2024 (PDF)](#) 
- [Revisionsberättelse 2023 (PDF)](#)
- [Underhållsplan 2024-2029 (PDF)](#)`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Renoveringar och underhåll",
      description: "Information om renoveringar och underhåll av fastigheten",
      order: 4,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Renoveringsregler",
          content: `# Renoveringsregler

Här hittar du information om vad du får och inte får göra vid renovering av din lägenhet.

## Tillståndspliktiga renoveringar

Följande arbeten kräver **skriftligt tillstånd** från styrelsen:
- Ändring av våtrummen (badrum, kök, tvättstuga)
- Flyttning eller borttagning av väggar
- Ändring av el- eller VVS-installationer
- Installation av luftvärmepump eller AC
- Ändring av golv till hårdare material (parkett→kakel)
- Inglasning av balkong

## Tillståndsfria renoveringar

Dessa arbeten kan du göra **utan tillstånd**:
- Målning av väggar och tak
- Byte av tapeter
- Byte av köksluckor (samma storlek)
- Installation av inredning och hyllor
- Byte av belysning (samma typ av uttag)
- Mindre reparationer

## Ansökningsprocess

1. **Lämna ansökan** minst 4 veckor innan planerad start
2. **Bifoga ritningar** och beskrivning av arbetet
3. **Vänta på godkännande** innan arbetet påbörjas
4. **Anmäl när arbetet är klart** för eventuell besiktning

## Arbetstider

**Tillåtna arbetstider för renovering:**
- Måndag-fredag: 08:00-17:00
- Lördag: 09:00-15:00  
- Söndagar och helger: **Ej tillåtet**

## Krav på hantverkare

- Hantverkare ska vara försäkrade och auktoriserade
- Skador som uppstår ska täckas av hantverkarens försäkring
- Gemensamma utrymmen ska skyddas och städas

## Viktigt att tänka på

⚠️ **Ansvar:** Du ansvarar för alla skador som uppstår i samband med renovering
⚠️ **Grannar:** Informera grannarna om planerade arbeten
⚠️ **Avfall:** Byggavfall får inte lämnas i föreningens soprum`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Underhållsplan",
          content: `# Underhållsplan

Här hittar du information om föreningens planerade underhåll och renoveringar.

## Pågående projekt 2024

### Renovering av tvättstuga (Mars-April)
- **Budget:** 180 000 kr
- **Omfattning:** Nya maskiner, kakelsättning, målning
- **Påverkan:** Tvättstuga stängd 3 veckor

### Asfaltering av innergård (Maj)
- **Budget:** 85 000 kr  
- **Omfattning:** Ny asfalt och parkeringsmarkering
- **Påverkan:** Parkeringen stängd 1 vecka

## Planerat underhåll 2024-2026

### 2024 (Återstående budget: 115 000 kr)
- **Juni:** Målning av trapphus (våning 4-5)
- **Augusti:** Byte av ytterdörr och portlås
- **September:** Installation av ny belysning i källare

### 2025 (Budget: 520 000 kr)
- **Våren:** Byte av fönster (våning 1-2) - 380 000 kr
- **Sommaren:** Upprustning av hiss - 140 000 kr

### 2026 (Budget: 680 000 kr)
- **Våren:** Takrenovering - 450 000 kr
- **Hösten:** Uppgradering av el-centraler - 230 000 kr

## Långsiktig underhållsplan (2027-2030)

| År | Projekt | Uppskattat belopp |
|----|---------|-------------------|
| 2027 | Fasadrenovering | 850 000 kr |
| 2028 | Stamrenovering (resterande lägenheter) | 720 000 kr |
| 2029 | Byte av balkonger | 950 000 kr |
| 2030 | Energieffektivisering | 400 000 kr |

## Finansiering

Större underhållsprojekt finansieras genom:
- **Underhållsfond** (avsättning från månadsavgifter)
- **Eventuella lån** (för större projekt)
- **Extra insatser** (i undantagsfall)

## Information till boende

- Alla projekt meddelas minst 4 veckor i förväg
- Information delas ut via mail och anslagstavla
- Vid större projekt hålls informationsmöten`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Bopärmar och regler",
      description: "Bopärmar och föreningens regler",
      order: 5,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Bopärm",
          content: `# Bopärm

Här hittar du information om din lägenhet och dess installationer.

## Vad ingår i bopärmen

Varje lägenhet har en bopärm som innehåller:
- **Originalritningar** från byggnadstillståndet
- **El-schema** med säkringar och kretsar
- **VVS-ritningar** med stängningsventiler
- **Garantihandlingar** för installationer
- **Instruktioner** för vitvaror och system
- **Viktiga telefonnummer** för service

## Var finns bopärmen

Bopärmen förvaras i:
- **Första alternativet:** Köksskåp (oftast överst till höger)
- **Andra alternativet:** Hall (garderobshylla)
- **Tredje alternativet:** Förråd/klädkammare

*Om du inte hittar din bopärm, kontakta styrelsen*

## Viktiga dokument att känna till

### El-installation
- **Huvudsäkring:** 20A (lägenhet 1-20) / 25A (lägenhet 21-42)
- **Säkringsskåp:** Placerat i hall eller kök
- **Jordfelsbrytare:** Installerad 2019 (RCD-skydd)

### VVS-system  
- **Vattenstängning:** Huvudkran under diskbänk
- **Värmesystem:** Fjärrvärme med termostatventiler
- **Varmvatten:** Centralt system (ej egen varmvattenberedare)

### Ventilation
- **System:** Självdrag med tilluftsdon i sovrum/vardagsrum
- **Frånluft:** Kök, badrum, WC
- **Filter:** Ska bytas av boende (köps i vanlig butik)

## Kontrollera regelbundet

**Månatliga kontroller:**
- Kontrollera att alla värmelement får värme
- Testa jordfelsbrytare (tryck TEST-knapp)
- Kontrollera ventilationsfilter

**Årliga kontroller:**
- Rengör element och värmerör
- Kontrollera tätningar i badrum
- Testa brandvarnare

## Garanti och service

| Installation | Garantitid | Serviceansvarig |
|-------------|------------|-----------------|
| Vitvaror | 5 år | Tillverkare |
| El-installation | 10 år | Elektriker |
| VVS | 10 år | VVS-firma |
| Ventilation | 2 år | Ventilationsfirma |`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Föreningens regler",
          content: `# Föreningens regler

Här hittar du information om föreningens regler och riktlinjer.

## Trivselregler

### Nattvila
- **Tid:** 22:00-07:00 vardagar, 22:00-09:00 helger
- **Gäller:** All störande verksamhet
- **Särskilt:** Musik, TV, tvättmaskin, dammsugare

### Gemensamma utrymmen
- **Renlighet:** Lämna alltid rent efter dig
- **Bokning:** Vissa utrymmen kräver bokning
- **Användningstid:** Respektera bokade tider

### Sophantering
- **Sortering:** Följ sorteringsanvisningarna noga
- **Tider:** Kasta sopor mellan 07:00-22:00
- **Grovsopor:** Anmäls till fastighetsskötare

## Husdjursregler

### Hundar
- **Koppel:** Obligatoriskt i trapphus och på gården
- **Luftning:** På hundens egen tomt eller hundrastgård
- **Skall:** Få inte störa grannarna
- **Registrering:** Anmäl till styrelsen

### Katter
- **Innekatt:** Rekommenderas (säkrare för katten)
- **Balkong:** Ska säkras så katten inte kan falla

### Övriga djur
- **Mindre djur:** Hamster, fåglar, akvariefisk tillåtet
- **Exotiska djur:** Kräver styrelsens tillstånd

## Parkeringsregler

### Parkeringsplatser
- **Numrerade platser:** Endast för den som hyr platsen  
- **Gästparkering:** Max 3 dygn, anmäl till styrelsen
- **Besöksparkering:** 2 platser för korttidsbesök (2 tim)

### Garage
- **Endast för bil:** Ej förråd eller verkstad
- **Förbud:** Förvaring av farligt gods
- **Rengöring:** Håll rent och organiserat

## Balkong och uteplats

### Tillåtet
- Möbler och växter
- Markiser och parasoller
- Mindre uppvärmning (elradiatorer)

### Ej tillåtet  
- **Grillning:** Endast elektriska grillar
- **Förvaring:** Ej skräp eller stora föremål
- **Hängning:** Tvätt på räcke eller utanför balkong
- **Ändring:** Inglasning utan tillstånd

## Påföljder vid regelbrott

**Första gången:** Muntlig tillsägelse
**Andra gången:** Skriftlig varning  
**Tredje gången:** Avgift 500-2000 kr
**Upprepade brott:** Anmälan till kronofogden`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Sopsortering och återvinning",
      description: "Information om sopsortering och återvinning",
      order: 6,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Sopsortering",
          content: `# Sopsortering

Här hittar du information om hur du sorterar dina sopor och var du lämnar dem.

## Soprum och öppettider

**Plats:** Källarplan, ingång från innergården
**Öppettider:** 07:00-22:00 (respektera grannarnas vila)
**Kod:** 1234 (ändras årligen)

## Sorteringsguide

### 🗑️ Restavfall (svart/grå kärl)
**Vad:** Rester som inte kan återvinnas
- Blöjor och bindor
- Kattgrus och hundnäss
- Dammsugarpåsar
- Smutsigt papper
- Kakelrester och sand

### ♻️ Matavfall (grön/brun kärl)
**Vad:** All organisk mat
- Matrester (råa och tillagade)
- Skalrester från frukt och grönt
- Kaffefilter och tepåsar
- Äggskal
- **OBS:** Endast komposterbara påsar!

### 📦 Pappersförpackningar (blå container)
**Vad:** Förpackningar av papp och kartong
- Mjölkkartonger (skölja ur)
- Cornflakespaket
- Pizzakartonger (utan matfett)
- Papperskassar
- **OBS:** Ta bort tejp och häftklammer

### 🗞️ Tidningar och papper (blå container)
**Vad:** Rent papper
- Dagstidningar och reklam
- Kontorspapper
- Kuvert (även med fönster)
- Böcker utan spiraler

### 🥤 Plastförpackningar (genomskinlig container)
**Vad:** Rena plastförpackningar
- Mjölkflaskor och yoghurtburkar
- Soppåsar och fryspåsar
- Plastflaskor (ta bort kork)
- **OBS:** Skölj ur innan du slänger

### 🫙 Metallförpackningar (grå container)
**Vad:** Förpackningar av metall
- Konservburkar
- Aluminiumfolie
- Läskburkar
- Kronkapsyler
- **OBS:** Skölj ur innan du slänger

### 🍾 Glas (grön container)
**Vad:** Glasförpackningar
- Glasburkar och flaskor
- **Färgat glas:** I separat fack
- **OBS:** Ta bort lock och kapsyler

## Återvinningscentral

**Adress:** Årstabron Återvinningscentral, Årstahåkan 2A
**Öppet:** Mån-Fre 10-19, Lör-Sön 10-17
**Transport:** Buss 4 eller 154 till Årstabron

### Vad lämnas på återvinningscentralen:
- **Elektronik:** Datorer, TV, mobiler, vitvaror
- **Möbler:** Större möbler som inte får plats i containrar
- **Textilier:** Kläder, skor, hemtextilier
- **Farligt avfall:** Färg, batterier, lysrör
- **Trädgårdsavfall:** Grenar, löv, gräs

## Grovsopor

**Anmälan:** Ring Sven (fastighetsskötare) 070-111 22 33
**Kostnad:** 200 kr per kubikmeter
**Hämtning:** Varje måndag (anmäl senast fredag innan)

### Exempel på grovsopor:
- Mindre möbler (stolar, småbord)
- Madrasser
- Mattan
- Större emballage
- Cykeldelar

## Viktigt att komma ihåg

⚠️ **Sopor utanför soprum:** Förbjudet och medför avgift (500 kr)
⚠️ **Felsortering:** Kan leda till extra kostnader för föreningen
⚠️ **Privata sopor:** Bara för boende i föreningen
⚠️ **Städning:** Städa upp efter dig i soprum`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Återvinning",
          content: `# Återvinning

Här hittar du information om återvinningsstationer och miljörum.

## Återvinningsstation (Närområdet)

### ICA Maxi Flemingsberg
**Adress:** Flemingsberg Centrum
**Avstånd:** 800 meter (10 min promenad)
**Öppet:** Samma tider som butiken

**Vad som tas emot:**
- Pantburkar och plastflaskor
- Småbatterier
- Glödlampor och lågenergilampor
- Kapslar för kaffemaskiner

### Circle K Hudsonos
**Adress:** Huddinge Centrum  
**Avstånd:** 1,2 km (15 min promenad)
**Öppet:** 24/7

**Vad som tas emot:**
- Pantburkar och plastflaskor
- Småbatterier
- Glödlampor

## Miljöstation - Årstabron

**Adress:** Årstahåkan 2A, 117 43 Stockholm
**Öppet:** Mån-Fre 10-19, Lör-Sön 10-17
**Parkering:** Gratis under besöket
**Transport:** Buss 4, 154, 179 till Årstabron

### Vad som tas emot (gratis):
- **Elektronik:** Allt med sladd eller batteri
- **Vitvaror:** Kyl, frys, disk, tvättmaskin
- **Batterier:** Alla typer
- **Bildäck:** Upp till 4 st per besök
- **Textilier:** Kläder, skor, hemtextilier
- **Möbler:** I gott skick (för återbruk)
- **Böcker:** För återbruk
- **Metall:** Skrot och metallföremål

### Farligt avfall:
- **Färg och lösningsmedel:** Rester i burkar
- **Lysrör:** Raka och sparformade
- **Säckringar:** Gamla typer med kvicksilver
- **Kemikalier:** Rengöringsmedel, insektsmedel
- **Mediciner:** Gamla mediciner (även till apoteket)

## Tips för miljövänligt boende

### Minska avfall:
- **Återanvänd:** Glasburkar som förvaringskärl
- **Reparera:** Istället för att slänga
- **Handla smart:** Köp bara det du behöver
- **Digital:** Välj e-fakturor och digitala kvitton

### Energibesparing:
- **LED-lampor:** Energisnål belysning
- **Vädra snabbt:** Korta men kraftiga drag
- **Duscha kortare:** Spara varmvatten
- **Släck:** Släck lampor när du lämnar rummet

### Återbruk inom föreningen:
- **Anslagstavla:** Annonsera saker du vill ge bort
- **Bytesdag:** Arrangeras vårterminen
- **Bibliotek:** Gemensamt bokbyte i föreningslokalen

## Kompostering

**Plats:** Bakom huset (kompost för villaägare)
**Använding:** Endast för matavfall från föreningen
**Ansvarig:** Lars Svensson (styrelseledamot)

**Vad som får komposteras:**
- Grönsaksrester
- Fruktskalar
- Kaffefilter
- Löv och gräs från gården

**Färdig kompost:** Får användas till föreningens planteringar`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Parkering och garage",
      description: "Information om parkering och garage",
      order: 7,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Parkering",
          content: `# Parkering

Här hittar du information om parkeringsplatser och parkeringsregler.

## Parkeringsplatser

**Totalt antal platser:** 35 st
**Tillgängliga för uthyrning:** 32 st  
**Handikapparkering:** 2 st
**Gästparkering:** 1 st

## Hyra parkeringsplats

### Aktuell kostnad (2024)
- **Markparkering:** 450 kr/månad
- **Garage:** 850 kr/månad
- **Handikapparkering:** 350 kr/månad

### Så här ansöker du:
1. **Kontakta styrelsen** via mail eller telefon
2. **Lämna in ansökan** med kontaktuppgifter
3. **Vänta på svar** - kötid ca 6-12 månader
4. **Skriv avtal** när plats blir ledig
5. **Betala första månaden** i förskott

### Köregler:
- **Uppsägningstid:** 3 månader
- **Byte av plats:** Möjligt efter 12 månader
- **Överlåtelse:** Inte tillåtet
- **Andrahandsuthyrning:** Inte tillåtet

## Parkeringsregler

### Allmänna regler:
- **Hastighet:** Max 5 km/h på gården
- **Motorvärmare:** Tillåtet november-mars
- **Biltvättning:** Endast på särskilt anvisad plats
- **Reparationer:** Mindre reparationer tillåtet

### Förbjudet:
❌ **Parkering utan hyresavtal** (böter 500 kr)
❌ **Långtidsparkering** (>7 dagar utan anmälan)
❌ **Husbil/släpvagn** (inte tillåtet överhuvudtaget)
❌ **Oljeläckage** (städningskostnad debiteras)
❌ **Skrotbilar** (forslingsavgift 3000 kr)

## Gästparkering

**Antal platser:** 1 st (vid huvudentrén)
**Tid:** Max 48 timmar
**Kostnad:** Gratis
**Anmälan:** Till styrelsen eller fastighetsskötare

### Besöksparkering:
- **Korttidsbesök:** 2 timmar (ingen anmälan)
- **Längre besök:** Anmäl till Sven (070-111 22 33)
- **Helger:** Mer flexibla regler

## Vinterunderhåll

### Snöröjning:
- **Vem:** Föreningen ansvarar för röjning  
- **När:** Startar när snötäcket överstiger 5 cm
- **Bilar:** Ska flyttas vid röjning (anslag sätts upp)

### Sandning/halkbekämpning:
- **Tidpunkt:** Utförs mellan 06:00-08:00
- **Material:** Miljövänlig sand användes
- **Varselsystem:** Information via mail

## Cykelparkering

**Cykelställ:** 50 platser
**Plats:** Källarplan och utomhus
**Kostnad:** Gratis
**Säkerhet:** Cykla på egen risk

### Regler för cyklar:
- **Vinterförvaring:** I källargarage (anmäl till Sven)
- **Övernattning:** Endast i cykelställ
- **Underhåll:** Håll cykel i gott skick
- **Skrotcyklar:** Tas bort utan varning efter 3 månader`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Garage",
          content: `# Garage

Här hittar du information om garage och garageregler.

## Garageplatser

**Totalt antal:** 12 st
**Storlek:** 3x6 meter standard
**Höjd:** 2,1 meter (passar de flesta bilar)
**Tillgång:** 24/7 med egen fjärrkontroll

## Hyra garage

### Kostnad 2024:
- **Månadshyra:** 850 kr/månad
- **Depositionsavgift:** 2000 kr (återbetalas vid flytt)
- **Installation eluttag:** 500 kr (engångsavgift)

### Vad som ingår:
✅ **Eluttag** för motorvärmare
✅ **Belysning** (LED-armaturer)
✅ **Låsbart utrymme** med persondörr
✅ **Automatisk port** med fjärrkontroll
✅ **Ventilation** för avgaser

## Regler för garage

### Tillåtet:
- **Personbil** (max 2,0m höjd)
- **Motorcykel/moped**
- **Cykel** (som tillägg till bil)
- **Bildäck** (max 1 uppsättning)
- **Biltillbehör** (organiserat)

### Förbjudet:
❌ **Förvaring av annat än fordon**
❌ **Verkstadsarbete** (oljebyte osv)
❌ **Brandfarliga ämnen** (bensin, lösningsmedel)
❌ **Skräp och spill**
❌ **Andrahandsuthyrning**

## Säkerhet och trygghet

### Säkerhetsåtgärder:
- **Kamerabevakning:** I garage och infart
- **Automatisk belysning:** Rörelsesensor
- **Lås:** Säkerhetslås på persondörrar
- **Nödutgång:** Finns via källaren

### Vid problem:
- **Trasig port:** Ring Sven (070-111 22 33)
- **Tappat fjärrkontroll:** Ny kostar 250 kr
- **Elfel:** Akuttelefon 08-123 456 78
- **Inbrott:** Ring 112 och anmäl till styrelsen

## Garageregler

### Öppet/stängt:
- **Porten:** Håll stängd (säkerhet)
- **Ventilation:** Körs automatiskt
- **Belysning:** Släcks automatiskt efter 10 min
- **Rengöring:** Städ upp efter dig

### Underhåll:
- **Garageporten:** Service 1 gång/år (föreningen betalar)
- **Fjärrkontroll:** Batteribyten på egen bekostnad
- **Golv:** Rapportera sprickor till Sven
- **Tak/väggar:** Rapportera skador omedelbart

## Vinteranvändning

### Motorvärmare:
- **Eluttag:** I varje garage
- **Timer:** Rekommenderas (3-4 timmar räcker)
- **Säkerhet:** Kontrollera sladd regelbundet
- **Kostnad:** Ingår i garagehyran

### Snö och is:
- **Rengör bilen** från snö innan in i garage
- **Halkbekämpning:** På garageinfarten
- **Problem:** Anmäl isbildning i garage`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Tvättstuga och bokningssystem",
      description: "Information om tvättstuga och bokningssystem",
      order: 8,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Tvättstuga",
          content: `# Tvättstuga

Här hittar du information om tvättstugan och dess utrustning.

## Utrustning och kapacitet

### Tvättmaskiner:
- **Antal:** 3 st Electrolux 8 kg
- **Program:** Normal, Fin, Smutsig, Eco
- **Temperatur:** 30°, 40°, 60°, 90°C
- **Tid per tvätt:** 45-90 minuter

### Torktumlare:
- **Antal:** 2 st Electrolux 8 kg  
- **Program:** Skåptorr, strykfuktigt, extra torr
- **Tid per torkning:** 60-120 minuter
- **Lufttorkning:** Torkställningar finns

### Övrig utrustning:
- **Strykbräda:** 2 st med strykjärn
- **Tvättmedelsautomat:** Köp tvättmedel på plats
- **Kärl:** För blötläggning
- **Stege:** För att nå höga ställningar

## Öppettider och bokning

**Öppettider:** 06:00-22:00 dagligen  
**Bokningssystem:** Digitalt via webb eller app
**Minsta bokning:** 3 timmar
**Längsta bokning:** 6 timmar per tillfälle

### Bokningsregler:
- **Förbokning:** Max 14 dagar i förväg
- **Avbokning:** Senast 2 timmar innan
- **Framflyttning:** Möjligt om ledig tid finns
- **Max per vecka:** 1 bokning per hushåll

## Användningsinstruktioner

### Före tvätt:
1. **Kontrollera fickor** (inga föremål kvar)
2. **Sortera tvätt** efter färg och material
3. **Kontrollvikt** (max 8 kg per maskin)
4. **Välj program** enligt fabrikens anvisning

### Efter tvätt:
1. **Ta ur tvätten** direkt när programmet är klart
2. **Rengör filter** i tvättmaskin
3. **Torka av dörr** och gummilister
4. **Lämna dörr öppen** för ventilation

### Torktumlare:
1. **Rengör luddfångare** före varje användning
2. **Kontrollera program** för textiltyp
3. **Ta ut direkt** när programmet är klart
4. **Vik ihop** kläder omedelbart

## Tvättmedel och kemikalier

### Tvättmedelsautomat:
- **Pris:** 10 kr per portion
- **Typ:** Miljömärkt tvättmedel
- **Dosering:** Automatisk rätt mängd
- **Betalning:** Swish eller kort

### Egna tvättmedel:
✅ **Tillåtet:** Miljömärkta produkter
✅ **Dosering:** Enligt anvisning på förpackning
❌ **Förbjudet:** Blekmedel och starka kemikalier
❌ **Förbjudet:** Eget sköljmedel (skadar maskiner)

## Trivselregler

### Renlighet:
- **Städa efter dig** - torka upp spill
- **Rengör maskiner** efter användning
- **Tömning luddfångare** obligatoriskt
- **Rapportera fel** direkt till Sven

### Respekt för andra:
- **Kom i tid** till din bokning
- **Håll tiderna** - flytta inte på andras tvätt
- **Var tyst** - respektera grannarnas vila
- **Hjälp andra** om de behöver tips

## Vad som inte får tvättas

❌ **Brandfarliga kläder** (oljiga arbetskläder)
❌ **Djurhår i stora mängder** (borsta av först)
❌ **Kemiskt behandlade tyger**
❌ **Skor och läderprodukter**
❌ **Mattan och större textilier** (specialtvätt)`,
          order: 1,
        },
        {
          id: generateId(),
          title: "Bokningssystem",
          content: `# Bokningssystem

Här hittar du information om hur du bokar tvättstugan och andra gemensamma utrymmen.

## Digital bokning

### Webb och app:
**Adress:** www.ekstugan15.se/bokning
**App:** "MyBooking" (ladda ner gratis)
**Inloggning:** Lägenhetsnummer + PIN-kod
**Support:** bokning@ekstugan15.se

### Första gången:
1. **Registrera dig** med lägenhetsnummer
2. **Skapa PIN-kod** (4 siffror)
3. **Verifiera** via SMS till registrerat nummer
4. **Börja boka** direkt efter verifiering

## Bokningsregler

### Tvättstuga:
- **Bokningslängd:** 3-6 timmar
- **Förbokning:** Max 14 dagar framåt
- **Per vecka:** Max 1 bokning per hushåll
- **Avbokning:** Senast 2 timmar innan

### Föreningslokal:
- **Bokningslängd:** 4-8 timmar  
- **Förbokning:** Max 30 dagar framåt
- **Kostnad:** 200 kr (städavgift)
- **Kapacitet:** Max 25 personer

### Gästparkering:
- **Bokningslängd:** Max 48 timmar
- **Förbokning:** Max 7 dagar framåt
- **Kostnad:** Gratis
- **Anmälan:** Registrering + registreringsnummer

## Betalning

### Betalningsmetoder:
- **Swish:** Automatisk betalning
- **Bankkort:** Via säker anslutning
- **Autogiro:** För återkommande avgifter
- **Faktura:** Skickas per e-post

### Avgifter:
| Utrymme | Kostnad | Depositionsavgift |
|---------|---------|-------------------|
| Tvättstuga | Gratis | - |
| Föreningslokal | 200 kr | 500 kr |
| Gästparkering | Gratis | - |
| Bastu | 50 kr | - |

## Avbokning och ändring

### Kostnadsfri avbokning:
- **Tvättstuga:** Senast 2 timmar innan
- **Föreningslokal:** Senast 24 timmar innan
- **Gästparkering:** Senast 1 timme innan

### Försenad avbokning:
- **Avgift:** 100 kr för föreningslokal
- **Tvättstuga:** Missar nästa möjlighet att boka
- **Upprepade förseningar:** Kan leda till bokningsförbud

### Ändra bokning:
1. **Logga in** i bokningssystemet
2. **Välj "Mina bokningar"**
3. **Klicka på bokningen** du vill ändra
4. **Välj ny tid** från tillgängliga alternativ
5. **Bekräfta** ändringen

## Teknisk support

### Vanliga problem:

**Glömt PIN-kod:**
- Klicka "Glömt PIN" på inloggningssidan
- Ny kod skickas via SMS

**Kan inte logga in:**
- Kontrollera lägenhetsnummer (skriv som "15A", inte "15 A")
- Rensa webbläsarens cache

**Betalning fungerar inte:**
- Kontrollera att kort inte är spärrat
- Prova med Swish istället

### Kontakt:
- **E-post:** bokning@ekstugan15.se
- **Telefon:** 08-234 567 89 (vardagar 9-17)
- **Chatt:** Finns i appen måndag-fredag

## Regler och påföljder

### Utebliven från bokning:
**Första gången:** Varning
**Andra gången:** Bokningsförbud 2 veckor  
**Tredje gången:** Bokningsförbud 2 månader

### Misssköt utrymme:
- **Särskild städning:** Kostnad debiteras
- **Skador:** Ersättningsskyldighet
- **Upprepade problem:** Permanent bokningsförbud`,
          order: 2,
        }
      ]
    },
    {
      id: generateId(),
      title: "Felanmälan",
      description: "Information om felanmälan",
      order: 9,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Felanmälan",
          content: `# Felanmälan

Här hittar du information om hur du gör en felanmälan och vem du kontaktar vid olika typer av fel.

## Akuta fel - Ring genast! 🚨

**Jour:** 08-123 456 78 (24 timmar)

### Akuta ärenden:
- **Vattenläckor** (från tak, väggar, rör)
- **Totalavbrott el** (hela lägenheten utan ström)
- **Ingen värme** (under vintertid)
- **Låsning ute** (när fastighetsskötare inte finns)
- **Inbrott eller skadegörelse**
- **Hissstopp** (om person sitter fast)

⚠️ **Kostnad för icke-akuta ärenden:** 1200 kr

## Vanliga fel - Kontakta fastighetsskötare

**Sven Karlsson:** 070-111 22 33
**E-post:** sven.karlsson@fastighet.se
**Arbetstider:** Måndag-fredag 07:00-15:00

### Vad Sven hjälper med:
- **Mindre VVS-problem:** Droppande kranar, täppta avlopp
- **El-problem:** Utslagna säkringar, defekta uttag  
- **Värme:** Elementen blir inte varma
- **Dörrar och lås:** Klämmer, går trögt
- **Allmänna utrymmen:** Belysning, städning
- **Lås och nycklar:** Extrakopior, byten

## Digital felanmälan

**Webbsida:** www.ekstugan15.se/felanmalan
**Inloggning:** Lägenhetsnummer + PIN-kod

### Fördelar med digital anmälan:
- ✅ Fungerar 24/7
- ✅ Du får automatisk bekräftelse
- ✅ Kan bifoga bilder
- ✅ Följ status på reparationen
- ✅ Historik över tidigare fel

### Så här gör du:
1. **Logga in** på webbsidan
2. **Välj typ** av fel från menyn
3. **Beskriv problemet** utförligt
4. **Bifoga bild** om möjligt
5. **Skicka** anmälan

## Vem ansvarar för vad?

### Föreningen ansvarar för:
- **Stammar:** Vatten, avlopp, el, värme
- **Ytterdörr och fönster**
- **Fasad och tak**
- **Gemensamma utrymmen**
- **Hiss och trapphus**

### Du ansvarar för:
- **Inuti lägenheten:** Kranar, belysning, brytare
- **Vitvaror:** Som du själv äger
- **Skador du orsakat**
- **Underhåll:** Målning, tapetsering

## Fel på vitvaror

### Hyresinkluderade vitvaror:
**Spis, kyl, frys:** Ring Sven först
**Garanti:** 5 år från installation

### Dina egna vitvaror:
**Ansvar:** Du kontaktar serviceföretag själv
**Kostnad:** Du betalar själv

## Uppföljning

**Återkoppling:** Inom 24 timmar på vardagar
**Reparation:** Genomförs snarast möjligt
**Akut:** Åtgärdas inom 4 timmar
**Mindre brådskande:** Inom 1-2 veckor

## Särskilda situationer

### Skadegörelse
- **Anmäl:** Till polisen och styrelsen
- **Foto:** Ta bilder före städning
- **Försäkring:** Kontakta hemförsäkringen

### Störningar från grannar
- **Först:** Prata med grannen
- **Sedan:** Kontakta styrelsen
- **Sist:** Miljöförvaltningen (bullerklagomål)

### Problem med leveranser
- **Post:** PostNord 0771-33 33 10
- **Paket:** Se leverantörens instruktioner
- **Storlek:** Ska få plats i din brevlåda

## Förebyggande underhåll

**Du kan förebygga fel genom att:**
- **Kontrollera** regelbundet (se Bopärm)
- **Rapportera** små problem innan de blir stora
- **Hålla rent** i avlopp och ventilation
- **Vara försiktig** med installationer`,
          order: 1,
        }
      ]
    },
    {
      id: generateId(),
      title: "Trivselregler",
      description: "Föreningens trivselregler",
      order: 10,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Trivselregler",
          content: `# Trivselregler

Här hittar du föreningens trivselregler för att alla ska trivas i föreningen.

## Allmänna trivselregler

För att alla ska trivas i vår förening följer vi dessa grundläggande regler:

### Respekt och hänsyn
- **Visa hänsyn** mot grannar och deras behov
- **Hälsa** på varandra i trapphus och på gården
- **Hjälp till** när det behövs (flyttning, tunga saker)
- **Lös konflikter** i dialog, inte genom klagomål

### Gemensamma utrymmen
- **Städa efter dig** i alla gemensamma lokaler
- **Lämna som du själv vill finna det**
- **Rapportera skador** till styrelsen eller Sven
- **Respektera bokade tider** för andra

## Buller och störningar

### Nattvila: 22:00-07:00 (vardagar) / 22:00-09:00 (helger)

Under nattvilotid är följande **förbjudet:**
❌ Högljudd musik eller TV
❌ Dammsugning och tvättmaskin  
❌ Duscha (kortare dusch OK)
❌ Skrammel i trapphus
❌ Byggarbete och borrning
❌ Fester och höga röster

### Övriga tider - visa hänsyn:
- **Musik:** Måttlig volym som inte hörs utanför lägenheten
- **TV:** Normal volym, stäng fönster vid högre volym
- **Dammsugning:** Vardagar 08:00-20:00, helger 10:00-18:00
- **Aktiviteter på balkong:** Tänk på grannar nedanför

## Fester och tillställningar

### Mindre sammankomster (upp till 10 personer):
- **Anmälan:** Informera grannarna 1-2 dagar innan
- **Tid:** Avsluta senast 24:00 på vardagar, 01:00 på helger
- **Buller:** Stäng fönster vid högre volym
- **Parkering:** Använd inte grannars parkeringsplatser

### Större fester (över 10 personer):
- **Anmälan:** Till styrelsen minst 1 vecka innan
- **Bokning:** Överväg att hyra föreningslokalen istället
- **Ansvar:** Du ansvarar för alla skador och städning
- **Grannar:** Informera alla grannar i huset

## Balkong och uteplats

### Tillåtet:
✅ **Möbler:** Balkonginredning och växter
✅ **Markiser:** Efter anmälan till styrelsen
✅ **Grillning:** Endast elektriska grillar
✅ **Tvätt:** Diskret upphängning innanför balkongräcket

### Förbjudet:
❌ **Kol/gasgrillning:** Brandrisk och rökutveckling
❌ **Rökning:** Om det besvärar grannar
❌ **Skaking av mattor:** Använd särskild plats i källaren
❌ **Förvaring:** Skräp, trasiga möbler, cyklar

## Husdjur

### Hundar:
- **Koppel:** Obligatoriskt i trapphus och på gården
- **Skall:** Får inte vara störande för grannar
- **Luftning:** Inte på gräsytorna (använd hundrastgård)
- **Bajs:** Plocka alltid upp efter hunden

### Katter:
- **Balkong:** Ska säkras för kattens säkerhet
- **Kattlåda:** Rengör regelbundet (luktstörningar)
- **Utegang:** Innekatt rekommenderas

### Alla husdjur:
- **Anmälan:** Till styrelsen inom 1 månad
- **Försäkring:** Kontrollera att hemförsäkringen täcker husdjur
- **Allergi:** Visa hänsyn mot grannar med allergier

## Barn och lek

### Inomhus:
- **Springa:** Undvik tunga steg, särskilt mot golv
- **Lek:** Inte bollsport i lägenheten
- **Instrument:** Respektera nattvilotid
- **Gråt:** Små barn får naturligtvis gråta

### Utomhus:
- **Gården:** Barnen får leka, men tänk på blommor
- **Cyklar/sparkcyklar:** Går bra, men försiktigt
- **Bollsport:** Inte mot väggar eller fönster
- **Sandlådan:** Städa upp efter leken

## Rökning

### Regler:
- **Balkonger:** Tillåtet om det inte besvärar grannar
- **Trapphus:** Absolut förbjudet
- **Gemensamma utrymmen:** Förbjudet överallt
- **Besök:** Rökområde finns vid entrén

### Om rökning stör:
1. **Prata med grannen** först
2. **Kontakta styrelsen** om problemet kvarstår
3. **Dokumentera** när störningarna sker

## Påföljder

### Första överträdelsen:
- **Muntlig påminnelse** från grannar eller styrelse
- **Information** om gällande regler

### Andra överträdelsen:
- **Skriftlig varning** från styrelsen
- **Krav på förbättring** inom bestämd tid

### Tredje överträdelsen:
- **Vite:** 1000-5000 kr beroende på överträdelse
- **Anmälan** till kronofogden vid upprepade störningar

### Allvarliga överträdelser:
- **Polisanmälan:** Vid våld, hot eller skadegörelse
- **Vräkning:** I extremfall kan hyresrätt sägas upp`,
          order: 1,
        }
      ]
    },
    {
      id: generateId(),
      title: "Gemensamma utrymmen",
      description: "Information om föreningens gemensamma utrymmen",
      order: 11,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Gemensamma utrymmen",
          content: `# Gemensamma utrymmen

Här hittar du information om föreningens gemensamma utrymmen och hur du använder dem.

## Föreningslokal

**Plats:** Källarplan, vid huvudentrén
**Storlek:** 45 kvm (max 25 personer)
**Öppettider:** Efter bokning via app/webb

### Utrustning:
- **Kök:** Kylskåp, mikro, kaffebryggare, diskmaskin
- **Möbler:** 6 bord, 24 stolar (hopfällbara för dansgolv)
- **Ljud:** Högtalare med Bluetooth-anslutning
- **Projektor:** För presentationer och filmer
- **WiFi:** Snabbt internet med kod "Ekstugan2024"

### Bokning och kostnad:
- **Pris:** 200 kr + depositionsavgift 500 kr
- **Bokning:** Via digital plattform, max 30 dagar framåt
- **Städning:** Ingår i priset (men städa upp efter dig)
- **Nyckel:** Hämtas hos Sven mellan 07:00-15:00

### Regler:
✅ **Tillåtet:** Familjecelebrationher, möten, kurser
❌ **Förbjudet:** Högljudda fester efter 24:00, rökning
❌ **Förbjudet:** Alkoholservering till minderåriga

## Bastu

**Plats:** Källarplan, bredvid tvättstugan
**Kapacitet:** 6-8 personer
**Temperatur:** 70-80°C

### Öppettider och bokning:
- **Vardagar:** 17:00-22:00
- **Helger:** 10:00-22:00  
- **Bokning:** 2 timmar per gång, 50 kr/tillfälle
- **Förbokning:** Max 7 dagar framåt

### Utrustning och säkerhet:
- **Handdukar:** Ta med egna
- **Löv:** Finns att köpa (björklöv)
- **Säkerhet:** Automatisk avstängning efter 3 timmar
- **Nödstopp:** Finns bredvid dörren

### Regler:
- **Städning:** Skölj av bänkar efter användning
- **Alkohol:** Absolut förbjudet i bastun
- **Barn:** Under 12 år alltid med vuxen
- **Hälsa:** Använd inte vid feber eller hjärtproblem

## Gräsytor och trädgård

**Yta:** 1200 kvm gemensam trädgård
**Underhåll:** Trädgårdsfirma + frivilliga insatser

### Användning:
✅ **Solbadning:** På gräsmattorna (inte i planteringarna)
✅ **Lek:** Försiktig lek, inte bollsport
✅ **Piknik:** Små sammankokter på filtar
✅ **Grillning:** Endast på anvisad plats

### Gemensam trädgård:
- **Blomsterrabatter:** Sköts av trädgårdsfirma
- **Kompost:** För matavfall från föreningen
- **Fruktträd:** Äpplen och päron - plocka gärna!
- **Kryddträdgård:** Fri användning för alla boende

### Hjälp till:
- **Vårstädning:** Gemensam dag i april
- **Plantering:** Välkommen att hjälpa till
- **Ogräsrensning:** Extra hjälp uppskattas
- **Vattning:** Under torka perioder

## Barnens utrymmen

### Lekplats:
- **Ålder:** 3-12 år
- **Utrustning:** Gungor, klätterställning, sandlåda
- **Tillsyn:** Föräldrars ansvar
- **Säkerhet:** Rapportera skador omedelbart

### Sandlåda:
- **Sand:** Byts varje vår
- **Täckning:** Täcks på vintern
- **Städning:** Plocka bort leksaker efter lek
- **Katter:** Täck sanden när ni är klara

## Cykelförråd

**Plats:** Källarplan + utomhusställ
**Platser:** 50 st totalt
**Kostnad:** Gratis

### Regler:
- **Märkning:** Märk cykeln med lägenhetsnummer
- **Vinterförvaring:** Anmäl till Sven om du lämnar vintern över
- **Skador:** Föreningen ansvarar inte för stölder/skador
- **Skrotcyklar:** Tas bort efter 3 månader utan användning

## Sophantering

**Plats:** Källarplan
**Öppettider:** 07:00-22:00
**Kod:** 1234 (uppdateras årligen)

### Utrustning:
- **Containers:** För alla typer av återvinning
- **Komposter:** För matavfall
- **Grovsopsrum:** För större föremål
- **Kartongpress:** För stora kartomger

## Entré och trapphus

### Ansvar:
- **Städning:** Städfirma 2 gånger/vecka
- **Belysning:** LED-belysning med rörelsesensor
- **Värme:** Grundvärme vintertid
- **Målning:** Enligt underhållsplan

### Regler:
- **Förvaring:** Inget får förvaras i trapphus
- **Cykel:** Inte tillåtet (använd cykelförråd)  
- **Barnvagnar:** I avsedda utrymmen på bottenvåning
- **Reklam:** "Ingen reklam tack"-skylt respekteras

## Tekniska utrymmen

**Tillträde:** Endast för behörig personal
**Innehåller:** El-centraler, värme, ventilation

### Vid problem:
- **Akut:** Ring jour 08-123 456 78
- **Vardagar:** Kontakta Sven (070-111 22 33)
- **Ej akut:** Anmäl via digital felanmälan`,
          order: 1,
        }
      ]
    },
    {
      id: generateId(),
      title: "Vanliga frågor (FAQ)",
      description: "Svar på vanliga frågor",
      order: 12,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Vanliga frågor",
          content: `# Vanliga frågor

Här hittar du svar på vanliga frågor om föreningen och boendet.

## Ekonomi och avgifter

### F: Varför höjs månadsavgiften?
**S:** Avgiften höjs för att täcka ökade kostnader för underhåll, energi, försäkringar och löner. Styrelsen arbetar kontinuerligt för att hålla kostnaderna nere samtidigt som vi ska underhålla fastigheten på rätt sätt.

### F: Vad ingår i månadsavgiften?
**S:** Uppvärmning, varmvatten, sophämtning, fastighetsskötsel, försäkringar, underhåll av gemensamma utrymmen, och amortering av föreningens lån.

### F: Kan jag betala månadsavgiften kvartalsvis?
**S:** Nej, avgiften ska betalas månadsvis senast den 25:e varje månad. Vid försenad betalning tillkommer dröjsmålsränta.

### F: Vad händer om jag inte kan betala månadsavgiften?
**S:** Kontakta styrelsen omedelbart om du får betalningssvårigheter. Vi kan diskutera betalningsplan i undantagsfall. Långvarig utebliven betalning kan leda till vräkning.

## Renoveringar och förändringar

### F: Får jag renovera min lägenhet?
**S:** Ja, men vissa renoveringar kräver styrelsens tillstånd. Se sektionen "Renoveringsregler" för detaljerad information. Ansök alltid innan du börjar!

### F: Får jag inglasa min balkong?
**S:** Inglasning kräver styrelsens tillstånd och bygglov från kommunen. Kontakta styrelsen för ansökningsformulär och krav.

### F: Vem betalar för reparationer i lägenheten?
**S:** Föreningen ansvarar för stammar (vatten, avlopp, el, värme) och ytterdörr/fönster. Du ansvarar för allt inuti lägenheten som kranar, belysning och inredning.

### F: Får jag sätta upp en värmepump?
**S:** Installation av luftvärmepump kräver tillstånd från styrelsen. Placering på fasad är oftast inte tillåten av estetiska skäl.

## Parkering och fordon

### F: Hur lång är kötiden för parkeringsplats?
**S:** Cirka 6-12 månader beroende på typ av plats. Garage har längre kötid än markparkering. Anmäl ditt intresse så fort som möjligt.

### F: Får jag låna ut min parkeringsplats?
**S:** Nej, andrahandsuthyrning av parkeringsplats är inte tillåten. Platsen är knuten till ditt kontrakt och får endast användas av dig.

### F: Vad kostar det att hyra en parkeringsplats?
**S:** Markparkering: 450 kr/månad, Garage: 850 kr/månad, Handikapparkering: 350 kr/månad (priser 2024).

### F: Var ska gäster parkera?
**S:** Vi har 1 gästparkeringsplats som kan användas max 48 timmar. Anmäl till fastighetsskötaren. För kortare besök (2 tim) finns besöksparkering.

## Husdjur

### F: Får jag ha husdjur?
**S:** Ja, men hundar och katter ska anmälas till styrelsen. Exotiska djur kan kräva särskilt tillstånd. Se "Trivselregler" för detaljerade husdjursregler.

### F: Får min hund springa lösa på gården?
**S:** Nej, hundar ska alltid hållas i koppel i trapphus och på gården. Använd hundrastgården för fri spring.

### F: Vad gäller för katter på balkonger?
**S:** Balkonger ska säkras så att katten inte kan falla ner. Detta kan göras med näting eller plexiglas.

## Tekniska frågor

### F: Vem kontaktar jag vid fel?
**S:** Akuta fel (vattenläckor, elbortfall): Jour 08-123 456 78. Mindre fel: Sven (070-111 22 33). Du kan också använda digital felanmälan.

### F: Varför blir inte elementen varma?
**S:** Kontrollera först att termostatventilen är öppen. Om problemet kvarstår, kontakta Sven. Det kan vara luft i systemet eller problem med värmefördelningen.

### F: Vem ansvarar för vitvaror?
**S:** Spis, kyl och frys som var installerade när du flyttade in: Föreningen ansvarar. Egna vitvaror: Du ansvarar själv för service och reparationer.

### F: Vad gör jag om hissen inte fungerar?
**S:** Ring jouren 08-123 456 78 omedelbart. Om någon sitter fast, ring 112. Rapportera mindre problem till Sven.

## Tvättstuga och bokning

### F: Hur bokar jag tvättstuga?
**S:** Via webben www.ekstugan15.se/bokning eller appen "MyBooking". Logga in med lägenhetsnummer och PIN-kod.

### F: Kan jag boka mer än en gång per vecka?
**S:** Nej, max 1 bokning per hushåll och vecka för att alla ska få chans. Bokningslängden är 3-6 timmar.

### F: Vad händer om jag kommer försent till min bokning?
**S:** Du förlorar din bokade tid och nästa person får använda tvättstugan. Vid upprepade förseningar kan du få bokningsförbud.

### F: Får jag använda egna tvättmedel?
**S:** Ja, men endast miljömärkta produkter. Blekmedel och starka kemikalier är förbjudna då de kan skada maskinerna.

## Störningar och trivsel

### F: Vad gör jag om grannarna är högljudda?
**S:** Prata först direkt med grannen - ofta löser det problemet. Om störningarna fortsätter, kontakta styrelsen. För allvarliga fall kan miljöförvaltningen kontaktas.

### F: Får jag ha fest i lägenheten?
**S:** Ja, men informera grannarna i förväg och avsluta senast 24:00 vardagar, 01:00 helger. Större fester bör anmälas till styrelsen.

### F: Får jag röka på balkongen?
**S:** Ja, men visa hänsyn mot grannar. Om rökningen stör grannarna kan du bli ombedd att sluta eller använda rökområdet vid entrén.

## Styrning och påverkan

### F: Hur kan jag påverka beslut i föreningen?
**S:** Delta på årsstämman där viktiga beslut fattas. Du kan också kontakta styrelsen med förslag eller kandidera till styrelsen själv.

### F: När är årsstämman?
**S:** Vanligtvis i mars månad. Kallelse skickas ut 3 veckor innan. Alla medlemmar har rätt att delta och rösträtt.

### F: Kan jag begära extra insats istället för lån?
**S:** Större frågor om finansiering beslutas på årsstämman. Du kan föreslå detta som motion till nästa årsstämma.

## Säkerhet

### F: Vad gör jag vid inbrott?
**S:** Ring 112 omedelbart, anmäl sedan till styrelsen och din hemförsäkring. Ta bilder innan du städar upp.

### F: Är det kamerabevakning?
**S:** Ja, i garage, entrér och vissa gemensamma utrymmen. Inga kameror övervakar privata balkonger eller lägenheter.

### F: Vem har nyckel till min lägenhet?
**S:** Endast du och eventuellt fastighetsskötaren i nödsituationer. Styrelsen har inte tillgång till lägenhetsnyckar.`,
          order: 1,
        }
      ]
    },
    {
      id: generateId(),
      title: "Dokumentarkiv",
      description: "Arkiv med viktiga dokument",
      order: 13,
      isActive: true,
      pages: [
        {
          id: generateId(),
          title: "Dokumentarkiv",
          content: `# Dokumentarkiv

Här hittar du viktiga dokument som rör föreningen och ditt boende.

## Styrdokument

### Stadgar och protokoll
- **[Stadgar 2023 (PDF)](#)** - Gällande från 1 april 2023
- **[Protokoll årsstämma 2024 (PDF)](#)** - Beslut från senaste årsstämman
- **[Protokoll styrelsemöten 2024 (ZIP)](#)** - Alla styrelsemöten hittills
- **[Föreningens ordningsregler (PDF)](#)** - Trivselregler och ordningsföreskrifter

### Ekonomi och redovisning
- **[Årsredovisning 2023 (PDF)](#)** - Fullständig årsredovisning
- **[Budget 2024 (PDF)](#)** - Antagen budget för innevarande år  
- **[Revisionsberättelse 2023 (PDF)](#)** - Revisorernas bedömning
- **[Ekonomisk månadsrapport (PDF)](#)** - Uppdateras månadsvis

## Teknisk dokumentation

### Fastighetsunderhåll
- **[Underhållsplan 2024-2029 (PDF)](#)** - Långsiktig planering
- **[Besiktningsrapport 2023 (PDF)](#)** - Senaste tekniska besiktning
- **[Energideklaration (PDF)](#)** - Uppdaterad 2023
- **[OVK-rapport (PDF)](#)** - Obligatorisk ventilationskontroll

### Installationer och system
- **[El-schema fastighet (PDF)](#)** - Huvudfördelning och gruppcentraler
- **[VVS-ritningar (PDF)](#)** - Vatten- och avloppssystem
- **[Värmefördelning (PDF)](#)** - Fjärrvärmesystem och distribution
- **[Brandlarmssystem (PDF)](#)** - Installation och underhåll

## Försäkringar och avtal

### Försäkringsdokument
- **[Fastighetsförsäkring (PDF)](#)** - Gällande från 2024-01-01
- **[Ansvarsförsäkring (PDF)](#)** - Styrelse och föreningsansvar
- **[Miljöförsäkring (PDF)](#)** - Täcker miljöskador
- **[Försäkringsinformation för medlemmar (PDF)](#)** - Vad som täcks och inte

### Avtal och tjänster
- **[Förvaltningsavtal (PDF)](#)** - Stockholm Bostadsförvaltning AB
- **[Fastighetsskötselavtal (PDF)](#)** - Sven Karlssons tjänster
- **[Städavtal (PDF)](#)** - Trapphus och gemensamma utrymmen
- **[Hissserviceavtal (PDF)](#)** - LiftTech Sverige AB

## Tillstånd och godkännanden

### Myndighetshandlingar
- **[Bygglov originalbyggnad (PDF)](#)** - Från 1987
- **[Slutbesked byggnation (PDF)](#)** - Slutgodkännande från kommun
- **[Ändringsbygglov fönster (PDF)](#)** - Fönsterbyte 2020-2023
- **[Miljötillstånd värmepump (PDF)](#)** - Bergvärmepump källare

### Certifikat och godkännanden
- **[Hisscertifikat (PDF)](#)** - Gällande till 2025-03-15
- **[Brandskyddscertifikat (PDF)](#)** - Senaste brandsynen
- **[Besiktningsintyg el (PDF)](#)** - Elsäkerhetsverket
- **[Vattenprovresultat (PDF)](#)** - Senaste vattenanalysen

## Rutiner och instruktioner

### Beredskapsplaner
- **[Brandplan (PDF)](#)** - Utrymning och brandskydd
- **[Krishantering (PDF)](#)** - Handlingsplan vid krissituationer
- **[Vattenskadeplan (PDF)](#)** - Åtgärder vid vattenläckor
- **[Vinterberedskap (PDF)](#)** - Förberedelser inför vintern

### Bruksanvisningar
- **[Tvättmaskinsinstruktioner (PDF)](#)** - Electrolux Professional
- **[Torktumlare manual (PDF)](#)** - Drift och underhåll
- **[Hissbruksanvisning (PDF)](#)** - För boende och besökare
- **[Basturegler och säkerhet (PDF)](#)** - Säker användning

## Historik och arkiv

### Föreningens historia
- **[Föreningens bildande 1987 (PDF)](#)** - Ursprungliga handlingar
- **[Byggnadshistorik (PDF)](#)** - Från planering till färdigställande
- **[Stadgeändringar genom åren (PDF)](#)** - Kronologisk översikt
- **[Tidigare styrelser (PDF)](#)** - Förtroendevalda 1987-2023

### Större renoveringar
- **[Stamrenovering 2015-2017 (PDF)](#)** - Komplett dokumentation
- **[Fönsterbyte 2020-2023 (PDF)](#)** - Projektgenomförande
- **[Fasadrenovering 2010 (PDF)](#)** - Historisk dokumentation
- **[Hissbyte 2018 (PDF)](#)** - Från gammal till ny hiss

## Mallar och blanketter

### Ansökningar
- **[Ansökan renovering (PDF)](#)** - Ifyll och skicka till styrelsen
- **[Ansökan parkeringsplats (PDF)](#)** - Kö för parkeringsplats
- **[Ansökan andrahandsuthyrning (PDF)](#)** - Vid uthyrning av lägenhet
- **[Ansökan husdjur (PDF)](#)** - Anmälan av husdjur

### Rapporter och anmälningar
- **[Felanmälan (PDF)](#)** - Alternativ till digital anmälan
- **[Skadeanmälan (PDF)](#)** - För försäkringsärenden
- **[Förslag till styrelsen (PDF)](#)** - Lämna förslag på förbättringar
- **[Motion till årsstämman (PDF)](#)** - För medlemsförslag

## Kontaktlistor

### Viktiga telefonnummer
- **[Nödkontakter (PDF)](#)** - Jour, polis, ambulans, brandkår
- **[Leverantörer och entreprenörer (PDF)](#)** - Auktoriserade firmor
- **[Myndigheter (PDF)](#)** - Kommun, länsstyrelse, skatteverket
- **[Grannskapshjälp (PDF)](#)** - Frivilliga kontaktpersoner

## Digital åtkomst

### Inloggningsuppgifter
- **Bokningssystem:** www.ekstugan15.se/bokning (Lägenhetsnr + PIN)
- **Ekonomirapporter:** www.ekstugan15.se/ekonomi (Samma inloggning)
- **Felanmälan:** www.ekstugan15.se/felanmalan (Samma inloggning)
- **Styrelsecontakt:** styrelsen@ekstugan15.se

### Uppdateringar
Denna digitala handbok uppdateras kontinuerligt. Senaste uppdatering: **December 2024**

**Kontakta styrelsen** om du saknar något dokument eller har förslag på förbättringar av dokumentarkivet.`,
          order: 1,
        }
      ]
    }
  ]
};
