// Simple UUID generator function to replace uuid library
const generateId = (): string => {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

export interface ContactPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
  apartment: string;
  responsibilities: string[];
}

export interface StatisticCard {
  title: string;
  value: string;
  icon: string;
  description: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  actionType: 'link' | 'phone' | 'email' | 'form';
  actionValue: string;
  isPrimary: boolean;
}

export interface InfoCard {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  icon: string;
}

export interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
  lastUpdated?: string;
  quickActions?: QuickAction[];
  statisticCards?: StatisticCard[];
  infoCards?: InfoCard[];
  contacts?: ContactPerson[];
  tableOfContents?: boolean;
}

export interface Section {
  id: string;
  title: string;
  description: string;
  order: number;
  pages: Page[];
  isActive: boolean;
  lastUpdated?: string;
  completionStatus?: number; // 0-100%
}

export interface HandbookTemplate {
  sections: Section[];
  metadata: {
    title: string;
    subtitle: string;
    version: string;
    lastUpdated: string;
    organization: {
      name: string;
      address: string;
      orgNumber: string;
      phone: string;
      email: string;
    };
  };
}

// Ikoner för varje sektion (nu med modern design)
export const sectionIcons: { [key: string]: string } = {
  "Välkommen": "🏠",
  "Kontaktuppgifter och styrelse": "👥",
  "Stadgar och årsredovisning": "📋",
  "Renoveringar och underhåll": "🔧",
  "Bopärmar och regler": "📖",
  "Sopsortering och återvinning": "♻️",
  "Parkering och garage": "🚗",
  "Tvättstuga och bokningssystem": "🧺",
  "Felanmälan": "🚨",
  "Trivselregler": "🤝",
  "Gemensamma utrymmen": "🏢",
  "Vanliga frågor (FAQ)": "❓",
  "Dokumentarkiv": "📁",
  "Ekonomi och avgifter": "💰",
  "Säkerhet och trygghet": "🔒"
};

// Modern color palette för olika typer av innehåll
export const contentTypes = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  urgent: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' }
};

export const defaultHandbookTemplate: HandbookTemplate = {
  metadata: {
    title: "Digital Handbok",
    subtitle: "Bostadsrättsföreningen Ekstugan 15",
    version: "2.0",
    lastUpdated: "2024-03-15",
    organization: {
      name: "Bostadsrättsföreningen Ekstugan 15",
      address: "Ekstugan 15, 123 45 Stockholm",
      orgNumber: "769600-1234",
      phone: "08-123 45 67",
      email: "styrelsen@ekstugan15.se"
    }
  },
  sections: [
    {
      id: generateId(),
      title: "Välkommen",
      description: "Välkommen till föreningens digitala handbok! Här hittar du all viktig information om ditt boende och föreningen.",
      order: 1,
      isActive: true,
      lastUpdated: "2024-03-15",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Översikt och snabbfakta",
          content: `# Välkommen till Bostadsrättsföreningen Ekstugan 15! 🏠

Vi är glada att du är en del av vår gemenskap. Denna digitala handbok är din guide till allt som rör ditt boende och vår förening.

## Vad du hittar här

📋 **Komplett information** om föreningen, regler och rutiner
👥 **Kontaktuppgifter** till styrelse och viktiga personer  
🔧 **Felanmälan** och underhållsinformation
💰 **Ekonomisk information** och avgifter
🤝 **Trivselregler** för en bra gemenskap

## Viktigt att veta från start

- Denna handbok uppdateras löpande - alltid aktuell information
- Använd sökfunktionen för att snabbt hitta det du letar efter  
- Kontakta styrelsen om du har frågor som inte besvaras här
- Delta gärna på våra möten och aktiviteter för att stärka gemenskapen`,
          order: 1,
          lastUpdated: "2024-03-15",
          tableOfContents: true,
          statisticCards: [
            {
              title: "Antal lägenheter",
              value: "42",
              icon: "🏠",
              description: "Totalt antal lägenheter i föreningen"
            },
            {
              title: "Byggår", 
              value: "1987",
              icon: "🏗️",
              description: "När fastigheten byggdes"
            },
            {
              title: "Våningar",
              value: "5",
              icon: "📏",
              description: "Totalt antal våningar"
            },
            {
              title: "Parkeringsplatser",
              value: "35",
              icon: "🚗",
              description: "Tillgängliga p-platser"
            }
          ],
          quickActions: [
            {
              id: generateId(),
              title: "Gör felanmälan",
              description: "Snabb anmälan av fel och störningar",
              icon: "🚨",
              actionType: "link",
              actionValue: "/felanmalan",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Kontakta styrelsen",
              description: "Skicka meddelande till styrelsen",
              icon: "📧",
              actionType: "email", 
              actionValue: "styrelsen@ekstugan15.se",
              isPrimary: false
            },
            {
              id: generateId(),
              title: "Ring fastighetsskötare",
              description: "Direkt kontakt för akuta ärenden",
              icon: "📞",
              actionType: "phone",
              actionValue: "070-111-22-33",
              isPrimary: false
            }
          ]
        },
        {
          id: generateId(),
          title: "För nya medlemmar",
          content: `# Guide för nya medlemmar 👋

Välkommen som ny medlem i vår förening! Den här guiden hjälper dig komma igång smidigt.

## Din första månad - checklista

### Vecka 1: Grundläggande
- [ ] **Läs stadgarna** - föreningens grundregler (finns i dokumentarkivet)
- [ ] **Spara viktiga kontakter** - styrelse och fastighetsskötare
- [ ] **Registrera dig** för digitala uppdateringar
- [ ] **Bekanta dig** med fastighetens allmänna utrymmen

### Vecka 2: Praktiska saker  
- [ ] **Ansök om parkeringsplats** (om du behöver)
- [ ] **Boka tid** för genomgång av lägenhet med fastighetsskötare
- [ ] **Lär dig** felanmälningssystemet
- [ ] **Kolla tvättstuga** och bokningssystem

### Vecka 3-4: Gemenskap
- [ ] **Presentera dig** för grannarna
- [ ] **Delta** på nästa styrelsemöte (öppet för alla)
- [ ] **Läs** senaste styrelseprotokoll
- [ ] **Överväg** engagemang i föreningens arbete

## Viktiga datum att komma ihåg

- **Årsstämma:** Mars månad
- **Styrelsemöten:** Första onsdagen varje månad 19:00
- **Ekonomisk redovisning:** Kvartalsvis
- **Fastighetsbesiktning:** Två gånger per år

## Vanliga frågor för nya medlemmar

**Q: Vem ansvarar för vad i lägenheten?**
A: Du ansvarar för allt innanför lägenhetens väggar. Föreningen ansvarar för stammar, yttertak och fasad.

**Q: Kan jag göra renoveringar direkt?**  
A: Större renoveringar kräver anmälan till styrelsen. Läs reglerna först!

**Q: Hur fungerar avgifterna?**
A: Månadsavgiften dras automatiskt den 1:a varje månad. Kontakta kassören vid frågor.`,
          order: 2,
          lastUpdated: "2024-03-10",
          tableOfContents: true,
          infoCards: [
            {
              id: generateId(),
              title: "Ny medlem?",
              content: "Kom till vårt välkomstmöte första tisdagen varje månad kl. 18:00 i föreningslokalen.",
              type: "info",
              icon: "ℹ️"
            },
            {
              id: generateId(),
              title: "Viktigt att veta",
              content: "Större renoveringar måste anmälas och godkännas av styrelsen innan arbetet påbörjas.",
              type: "warning", 
              icon: "⚠️"
            }
          ]
        }
      ]
    },
    {
      id: generateId(),
      title: "Kontaktuppgifter och styrelse",
      description: "Information om styrelsen och viktiga kontaktuppgifter",
      order: 2,
      isActive: true,
      lastUpdated: "2024-03-01",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Styrelsen 2024",
          content: `# Styrelsen 2024 👥

Vår styrelse arbetar ideellt för alla medlemmars bästa. Kontakta oss gärna med frågor, förslag eller synpunkter.

## Styrelsens sammansättning

Styrelsen består av fem ledamöter som väljs på årsstämman för ett år i taget. Alla medlemmar kan kandidera och alla är välkomna att engagera sig.

## Så kontaktar du styrelsen

**Allmänna frågor:** styrelsen@ekstugan15.se  
**Akuta ärenden:** Ring ordföranden direkt  
**Styrelsemöten:** Första onsdagen varje månad kl. 19:00

*Medlemmar är välkomna att närvara på styrelsemöten efter föranmälan till ordföranden.*`,
          order: 1,
          lastUpdated: "2024-01-15",
          tableOfContents: true,
          contacts: [
            {
              name: "Anna Andersson",
              role: "Ordförande",
              phone: "070-123 45 67",
              email: "anna.andersson@exempel.se",
              apartment: "Lägenhet 15, 3 tr",
              responsibilities: ["Övergripande ledning", "Kontakt med myndigheter", "Representerar föreningen utåt", "Leder styrelsemöten"]
            },
            {
              name: "Erik Eriksson", 
              role: "Kassör",
              phone: "070-234 56 78",
              email: "erik.eriksson@exempel.se",
              apartment: "Lägenhet 8, 2 tr",
              responsibilities: ["Ekonomi och bokföring", "Avgifter och fakturering", "Budgetuppföljning", "Ekonomisk rapportering"]
            },
            {
              name: "Maria Johansson",
              role: "Sekreterare", 
              phone: "070-345 67 89",
              email: "maria.johansson@exempel.se",
              apartment: "Lägenhet 23, 4 tr",
              responsibilities: ["Protokollföring", "Korrespondens", "Dokumenthantering", "Informationsspridning"]
            },
            {
              name: "Lars Svensson",
              role: "Ledamot - Teknik",
              phone: "070-456 78 90", 
              email: "lars.svensson@exempel.se",
              apartment: "Lägenhet 3, 1 tr",
              responsibilities: ["Tekniska frågor", "Underhållsplanering", "Entreprenörskontakter", "Energifrågor"]
            },
            {
              name: "Karin Nilsson",
              role: "Ledamot - Trivsel",
              phone: "070-567 89 01",
              email: "karin.nilsson@exempel.se", 
              apartment: "Lägenhet 31, 5 tr",
              responsibilities: ["Trivselaktiviteter", "Konfliktlösning", "Gemensamma aktiviteter", "Välkomstkommittén"]
            }
          ],
          quickActions: [
            {
              id: generateId(),
              title: "Kontakta styrelsen",
              description: "Allmänna frågor och förslag",
              icon: "📧",
              actionType: "email",
              actionValue: "styrelsen@ekstugan15.se",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Ring ordföranden", 
              description: "För akuta ärenden",
              icon: "📞",
              actionType: "phone",
              actionValue: "070-123-45-67",
              isPrimary: false
            }
          ]
        },
        {
          id: generateId(),
          title: "Viktiga kontakter",
          content: `# Viktiga kontakter 📞

Här hittar du alla kontakter du kan behöva som medlem i föreningen.

## Förvaltning och drift

Vår förening använder extern förvaltning för ekonomiska frågor och fastighetsskötsel för den dagliga driften.

## Service och support

- **Normal arbetstid:** Måndag-fredag 07:00-15:00
- **Akut jour:** 24 timmar, endast verkliga nödsituationer  
- **Kostnad för onödig jour:** 1 200 kr

## Ekonomisk förvaltning

All ekonomisk hantering sköts av vårt förvaltningsbolag som är specialister på bostadsrättsföreningar.`,
          order: 2,
          lastUpdated: "2024-02-20",
          tableOfContents: true,
          contacts: [
            {
              name: "Sven Karlsson",
              role: "Fastighetsskötare",
              phone: "070-111 22 33",
              email: "sven.karlsson@fastighet.se",
              apartment: "Arbetar på plats",
              responsibilities: ["Daglig drift och skötsel", "Mindre reparationer", "Städning av allmänna utrymmen", "Första linjens support"]
            },
            {
              name: "Linda Petersson",
              role: "Förvaltare",
              phone: "08-234 567 89",
              email: "linda.petersson@stockholmforvaltning.se", 
              apartment: "Stockholm Bostadsförvaltning AB",
              responsibilities: ["Ekonomisk förvaltning", "Försäkringsärenden", "Juridisk rådgivning", "Årsbokslut"]
            },
            {
              name: "Jourtelefon",
              role: "Akutärenden",
              phone: "08-123 456 78",
              email: "jour@fastighet.se",
              apartment: "24h service",
              responsibilities: ["Vattenläckor", "Elbortfall", "Inbrott", "Låsning ute"]
            }
          ],
          infoCards: [
            {
              id: generateId(),
              title: "Jour - endast för akuta ärenden!", 
              content: "Jourtelefonen är endast för verkliga nödfall. Icke-akuta ärenden debiteras 1 200 kr.",
              type: "warning",
              icon: "⚠️"
            },
            {
              id: generateId(),
              title: "Boka möte med förvaltare",
              content: "Vill du träffa förvaltaren? Boka tid via telefon eller e-post för personlig genomgång.",
              type: "info", 
              icon: "📅"
            }
          ]
        }
      ]
    },
    {
      id: generateId(),
      title: "Felanmälan",
      description: "Snabb och smidig felanmälan för alla typer av problem",
      order: 3,
      isActive: true,
      lastUpdated: "2024-03-10",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Gör en felanmälan",
          content: `# Felanmälan - Snabbt och enkelt 🚨

Vi har gjort det enkelt att rapportera fel och få hjälp snabbt. Följ vår guide nedan för bästa resultat.

## Tre sätt att anmäla fel

### 1. 🌐 Digital felanmälan (rekommenderas)
- Tillgänglig 24/7 på vår hemsida
- Automatisk bekräftelse och ärendenummer  
- Kan bifoga bilder
- Följ status på reparationen
- Historik över tidigare ärenden

### 2. 📞 Ring fastighetsskötare
- Arbetstider: Måndag-fredag 07:00-15:00
- Direkt kontakt för brådskande ärenden
- Personlig rådgivning

### 3. 🚨 Akut jour (endast nödfall!)
- 24 timmar per dygn
- Endast för verkliga nödsituationer
- Icke-akuta ärenden: 1 200 kr kostnad

## Vad händer efter din anmälan?

1. **Bekräftelse** - Du får ärendenummer inom 1 timme
2. **Bedömning** - Vi kontaktar dig inom 24 timmar  
3. **Åtgärd** - Reparation utförs enligt prioritet
4. **Uppföljning** - Du får besked när arbetet är klart`,
          order: 1,
          lastUpdated: "2024-03-10",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Digital felanmälan",
              description: "Anmäl fel online - rekommenderas",
              icon: "💻", 
              actionType: "link",
              actionValue: "https://ekstugan15.se/felanmalan",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Ring fastighetsskötare",
              description: "Sven Karlsson - vardagar 07:00-15:00",
              icon: "📞",
              actionType: "phone", 
              actionValue: "070-111-22-33",
              isPrimary: false
            },
            {
              id: generateId(),
              title: "Akut jour",
              description: "Endast verkliga nödfall - 24h",
              icon: "🚨",
              actionType: "phone",
              actionValue: "08-123-456-78", 
              isPrimary: false
            }
          ],
          infoCards: [
            {
              id: generateId(),
              title: "Akut - Ring genast!",
              content: "Vattenläckor, elbortfall, inbrott, brand eller om person sitter fast i hiss.",
              type: "urgent",
              icon: "🚨"
            },
            {
              id: generateId(),
              title: "Spara pengar",
              content: "Använd digital felanmälan för icke-akuta ärenden. Jourkostnaden är 1 200 kr för onödiga utryckningar.",
              type: "info",
              icon: "💰"
            },
            {
              id: generateId(),
              title: "Bifoga bilder",
              content: "I den digitala felanmälan kan du bifoga bilder som hjälper oss förstå problemet bättre.",
              type: "success", 
              icon: "📷"
            }
          ]
        }
      ]
    },
    {
      id: generateId(),
      title: "Ekonomi och avgifter",
      description: "Information om föreningens ekonomi, avgifter och betalningsrutiner",
      order: 4,
      isActive: true,
      lastUpdated: "2024-03-01",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Månadsavgifter och kostnader",
          content: `# Ekonomi och avgifter 💰

Här hittar du all information om föreningens ekonomi och dina avgifter som medlem.

## Månadsavgift 2024

Avgiften varierar beroende på lägenhetsstorlek och inkluderar de flesta driftskostnader.

### Vad ingår i månadsavgiften?

✅ **Uppvärmning** - All uppvärmning av lägenheten  
✅ **Varmvatten** - Obegränsat varmvatten  
✅ **Kalvatten** - Grundförbrukning ingår  
✅ **Sophämtning** - All återvinning och sopor  
✅ **Fastighetsskötsel** - Daglig drift och skötsel  
✅ **Försäkringar** - Fastighetsförsäkring  
✅ **Underhåll** - Löpande underhåll av fastigheten  
✅ **Gemensamma utrymmen** - Drift av alla lokaler  
✅ **Administration** - Förvaltning och ekonomi

### Vad ingår INTE?

❌ **Kabel-TV/Bredband** - Beställs individuellt  
❌ **Hemförsäkring** - Egen försäkring krävs  
❌ **Elförbrukning** - Egen elmätare och avtal  
❌ **Parkering** - Hyrs separat om tillgängligt

## Betalningsrutiner

- **Förfallodag:** Den 1:a varje månad
- **Autogiro:** Rekommenderas för smidig betalning  
- **Dröjsmålsränta:** 2% per månad vid försenad betalning
- **Påminnelseavgift:** 150 kr per påminnelse`,
          order: 1,
          lastUpdated: "2024-01-01",
          tableOfContents: true,
          statisticCards: [
            {
              title: "Genomsnittlig månadsavgift",
              value: "4 250 kr",
              icon: "💰",
              description: "Baserat på 3-roks lägenhet",
              trend: {
                value: 2.1,
                isPositive: false
              }
            },
            {
              title: "Ekonomisk buffert", 
              value: "2.1 månader",
              icon: "🏦",
              description: "Antal månaders avgifter i kassa",
              trend: {
                value: 5.2,
                isPositive: true
              }
            },
            {
              title: "Omsättning 2023",
              value: "2.1 Mkr",
              icon: "📊",
              description: "Total omsättning förra året"
            },
            {
              title: "Skuldsättningsgrad",
              value: "28%",
              icon: "📈", 
              description: "Andel lån av fastighetsvärdet"
            }
          ],
          quickActions: [
            {
              id: generateId(),
              title: "Ställ in autogiro",
              description: "Enkelt och säkert sätt att betala avgiften",
              icon: "🏦",
              actionType: "email",
              actionValue: "ekonomi@ekstugan15.se",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Ladda ner årsredovisning",
              description: "Senaste ekonomiska rapporten",
              icon: "📄",
              actionType: "link", 
              actionValue: "/dokument/arsredovisning",
              isPrimary: false
            }
          ]
        }
      ]
    },
    {
      id: generateId(),
      title: "Trivselregler",
      description: "Regler för en trivsam samvaro och gemenskap",
      order: 5,
      isActive: true,
      lastUpdated: "2024-02-15",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Regler för gemenskap",
          content: `# Trivselregler för en bra gemenskap 🤝

Våra trivselregler skapar förutsättningar för att alla ska kunna trivas och känna sig trygga i vår förening.

## Grundprinciper

🏠 **Respekt** - Vi respekterar varandra och varandras hem  
🤫 **Hänsyn** - Vi tar hänsyn till våra grannar  
🌱 **Gemensamt ansvar** - Vi tar ansvar för våra gemensamma utrymmen  
💬 **Öppen kommunikation** - Vi löser konflikter genom dialog

## Buller och störningar

### Tillåtna tider för högre ljudnivå
- **Vardagar:** 07:00-22:00
- **Lördagar:** 09:00-22:00  
- **Söndagar:** 10:00-21:00

### Musikövning och fester
- Akustiska instrument tillåts vardagar 09:00-20:00
- Fester ska anmälas till grannarna i förväg
- Vid klagomål - sänk volymen omedelbart
- Musik i gemensamma utrymmen endast efter överenskommelse

## Renlighet och ordning

### I trapphusen
- Håll trapphus, korridorer och entréer rena
- Inga privata föremål i allmänna utrymmen  
- Hjälp till med att hålla dörrarna till gården stängda
- Rapportera skador och nedskräpning

### Balkong och uteplats
- Balkongmöbler ska vara prydliga och väderbeständiga
- Blommor och krukväxter är välkomna
- Ingen förvaring av skrymmande föremål
- Inget hängande av tvätt synligt från gatan

## Husdjur - regler och ansvar

### Hundar
- Alltid kopplad på föreningens mark
- Hundägaren ansvarar för att städa efter hunden
- Skällande hundar - ägaren ska omedelbart vidta åtgärder
- Anmälan till styrelsen vid konflikt

### Katter  
- Katter tillåts men på ägarens ansvar
- Inomhuskatter rekommenderas för djurets säkerhet
- Kattägaren ansvarar för eventuella skador`,
          order: 1,
          lastUpdated: "2024-02-15",
          tableOfContents: true,
          infoCards: [
            {
              id: generateId(),
              title: "Konflikter?",
              content: "Prata först med din granne. Om det inte hjälper, kontakta Karin Nilsson i styrelsen som ansvarar för trivselfrågort.",
              type: "info",
              icon: "💬"
            },
            {
              id: generateId(),
              title: "Renovering?", 
              content: "Större renoveringar som påverkar grannar ska anmälas till styrelsen och grannarna informeras i förväg.",
              type: "warning",
              icon: "🔨"
            },
            {
              id: generateId(),
              title: "Bra grannskap",
              content: "Ett litet hej i trappan, hjälp med dörrarna och hänsyn till varandra skapar trivsel för alla!",
              type: "success",
              icon: "😊"
            }
          ]
        }
      ]
    }
  ]
};
