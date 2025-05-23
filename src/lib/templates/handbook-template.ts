// Simple UUID generator function to replace uuid library
const generateId = (): string => {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

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
- **Ansvar:** Ekonomisk förvaltning, försäkringar`,
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
- ✅ Historik över tidigare fel`,
          order: 1,
        }
      ]
    }
  ]
};
