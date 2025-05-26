const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
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
  is_public?: boolean;
  lastUpdated?: string;
  completionStatus?: number; // 0-100%
}

export interface HandbookTemplate {
  sections: Section[];
  metadata: {
    id?: string;
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

export const contentTypes = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600'
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200', 
    icon: 'text-yellow-600'
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'text-green-600'
  },
  urgent: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600'
  }
} as const;

export const completeBRFHandbook: HandbookTemplate = {
  metadata: {
    id: "brf-template",
    title: "Bostadsrättsföreningen",
    subtitle: "",
    version: "3.0",
    lastUpdated: "2024-03-15",
    organization: {
      name: "Bostadsrättsföreningen",
      address: "Adress, Postnummer Ort",
      orgNumber: "123456-7890",
      phone: "08-123 45 67",
      email: "styrelsen@exempel.se"
    }
  },
  sections: [
    // Section 1: Välkommen
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
          content: `Vi är glada att du är en del av vår gemenskap. Denna digitala handbok är din guide till allt som rör ditt boende och vår förening.

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
              actionValue: "https://exempel.se/felanmalan",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Kontakta styrelsen",
              description: "Skicka meddelande till styrelsen",
              icon: "📧",
              actionType: "email", 
              actionValue: "styrelsen@exempel.se",
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
        }
      ]
    },

    // Section 2: Kontaktuppgifter och styrelse
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
          content: `Vår styrelse arbetar ideellt för alla medlemmars bästa. Kontakta oss gärna med frågor, förslag eller synpunkter.

## Styrelsens sammansättning

Styrelsen består av fem ledamöter som väljs på årsstämman för ett år i taget. Alla medlemmar kan kandidera och alla är välkomna att engagera sig.

## Så kontaktar du styrelsen

**Allmänna frågor:** styrelsen@exempel.se  
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
          ]
        }
      ]
    },

    // Section 3: Felanmälan
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
          content: `Vi har gjort det enkelt att rapportera fel och få hjälp snabbt. Följ vår guide nedan för bästa resultat.

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
- Icke-akuta ärenden: 1 200 kr kostnad`,
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
              actionValue: "https://exempel.se/felanmalan",
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
            }
          ]
        }
      ]
    },

    // Section 4: Ekonomi och avgifter
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
          content: `Här hittar du all information om föreningens ekonomi och dina avgifter som medlem.

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
❌ **Parkering** - Hyrs separat om tillgängligt`,
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
            }
          ]
        }
      ]
    },

    // Section 5: Trivselregler
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
          content: `Våra trivselregler skapar förutsättningar för att alla ska kunna trivas och känna sig trygga i vår förening.

## Grundprinciper

🏠 **Respekt** - Vi respekterar varandra och varandras hem  
🤫 **Hänsyn** - Vi tar hänsyn till våra grannar  
🌱 **Gemensamt ansvar** - Vi tar ansvar för våra gemensamma utrymmen  
💬 **Öppen kommunikation** - Vi löser konflikter genom dialog

## Buller och störningar

### Tillåtna tider för högre ljudnivå
- **Vardagar:** 07:00-22:00
- **Lördagar:** 09:00-22:00  
- **Söndagar:** 10:00-21:00`,
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
            }
          ]
        }
      ]
    },

    // Section 6: Stadgar och årsredovisning
    {
      id: generateId(),
      title: "Stadgar och årsredovisning",
      description: "Föreningens stadgar, ekonomiska rapporter och viktiga beslut",
      order: 6,
      isActive: true,
      lastUpdated: "2024-03-01",
      completionStatus: 95,
      pages: [
        {
          id: generateId(),
          title: "Föreningens stadgar",
          content: `Stadgarna är föreningens grundläggande regelverk som styr hur vi fungerar som bostadsrättsförening.

## Vad stadgarna innehåller

📜 **Föreningens ändamål** - Varför föreningen finns  
👥 **Medlemskap** - Regler för medlemskap och rättigheter  
🏠 **Bostadsrätter** - Regler för bostadsrätterna  
💰 **Ekonomi** - Avgifter, skulder och ekonomiska regler  
🗳️ **Stämma** - Årsstämma och beslutfattande  
👔 **Styrelse** - Styrelsens uppgifter och ansvar

## Senaste ändringar

Stadgarna antogs senast på årsstämman 2023 med följande ändringar:
- Uppdaterade regler för uthyrning av bostadsrätt
- Nya bestämmelser om husdjur
- Förtydliganden kring renoveringar

## Viktigt att veta

- Stadgarna är juridiskt bindande för alla medlemmar
- Ändringar kräver beslut på årsstämma med kvalificerad majoritet
- Vid konflikt gäller stadgarna före andra regler`,
          order: 1,
          lastUpdated: "2024-03-01",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Ladda ner stadgar",
              description: "Senaste versionen av föreningens stadgar",
              icon: "📄",
              actionType: "link",
              actionValue: "/dokument/stadgar-2023.pdf",
              isPrimary: true
            }
          ]
        }
      ]
    },

    // Section 7: Renoveringar och underhåll
    {
      id: generateId(),
      title: "Renoveringar och underhåll",
      description: "Regler för renoveringar, underhållsplan och tillståndsprocesser",
      order: 7,
      isActive: true,
      lastUpdated: "2024-02-20",
      completionStatus: 90,
      pages: [
        {
          id: generateId(),
          title: "Renoveringsregler",
          content: `Innan du påbörjar renoveringar i din lägenhet måste du följa våra regler och få nödvändiga tillstånd.

## Vad kräver tillstånd från styrelsen?

### 🚨 Alltid tillstånd krävs för:
- **Badrumsrenoveringar** - Alla våtrumsarbeten
- **Köksrenoveringar** - Byte av köksinredning och vitvaror
- **Golv** - Byte från matta till hårda golv
- **Väggförändringar** - Rivning eller uppförande av väggar
- **El och VVS** - Alla el- och rörmokeriarbeten
- **Balkongförändringar** - Inglasning eller andra förändringar

### ✅ Inget tillstånd krävs för:
- **Målning** - Alla målningsarbeten
- **Tapetsering** - Byte av tapeter
- **Mindre elarbeten** - Byte av lampor och kontakter
- **Inredning** - Möbler och dekoration

## Ansökningsprocess

### 1. Förberedelse
- Fyll i renoveringsansökan (finns på hemsidan)
- Bifoga ritningar och beskrivning
- Ta kontakt med grannarna för information

### 2. Inlämning
- Skicka ansökan till styrelsen minst 4 veckor före start
- Betala handläggningsavgift: 500 kr
- Vänta på skriftligt godkännande`,
          order: 1,
          lastUpdated: "2024-02-20",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Renoveringsansökan",
              description: "Ladda ner ansökningsformulär",
              icon: "📝",
              actionType: "link",
              actionValue: "/dokument/renoveringsansokan.pdf",
              isPrimary: true
            }
          ],
          infoCards: [
            {
              id: generateId(),
              title: "Viktigt!",
              content: "Renovering utan tillstånd kan leda till krav på återställning och ekonomisk ersättning.",
              type: "warning",
              icon: "⚠️"
            }
          ]
        }
      ]
    },

    // Section 8: Bopärmar och regler
    {
      id: generateId(),
      title: "Bopärmar och regler",
      description: "Bopärm för varje lägenhet, installationer och säkerhetsrutiner",
      order: 8,
      isActive: true,
      lastUpdated: "2024-02-10",
      completionStatus: 85,
      pages: [
        {
          id: generateId(),
          title: "Bopärm för din lägenhet",
          content: `Varje lägenhet har en bopärm med viktig information om installationer och system.

## Vad finns i bopärmen?

### 🔧 Teknisk information
- **El-schema** - Säkringar och eluttag
- **VVS-ritningar** - Vattenledningar och avlopp  
- **Värme** - Radiatorer och termostatinställningar
- **Ventilation** - Tillufts- och frånluftsventiler

### 📋 Instruktioner och manualer
- **Vitvaror** - Manualer för spis, kyl, frys
- **Säkerhetssystem** - Brandvarnare och lås
- **Balkong** - Skötsel och underhåll
- **Golv och väggar** - Materialspecifikationer

## Viktiga system i lägenheten

### Ventilation
- **Tilluftsventiler** - Håll alltid öppna
- **Frånluftsventiler** - Rengör filter var 6:e månad
- **Balansering** - Kontrolleras årligen av fastighetsskötare

### Värme och vatten
- **Radiatortermostater** - Ställ inte på max konstant
- **Varmvattenberedare** - Temperatur max 60°C
- **Läckageskydd** - Kontrollera regelbundet`,
          order: 1,
          lastUpdated: "2024-02-10",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Ladda ner bopärm",
              description: "Digital version av bopärmen",
              icon: "📱",
              actionType: "link",
              actionValue: "/dokument/boparm",
              isPrimary: true
            }
          ]
        }
      ]
    },

    // Section 9: Sopsortering och återvinning
    {
      id: generateId(),
      title: "Sopsortering och återvinning",
      description: "Komplett guide för sopsortering, återvinning och miljöregler",
      order: 9,
      isActive: true,
      lastUpdated: "2024-03-05",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Sorteringsguide",
          content: `Korrekt sopsortering är viktigt för miljön och håller nere kostnaderna för föreningen.

## Sopsortering i fastigheten

### 🗑️ Restavfall (grå påse)
**Vad som ska i restavfall:**
- Blöjor och hygienartiklar
- Dammsugarpåsar och damm
- Kattströ och hundbajs
- Cigarettfimpar
- Gamla fotografier
- Trasiga leksaker (ej elektroniska)

### ♻️ Återvinning (färgkodade kärl)

**🟦 Blå - Papper**
- Tidningar och tidskrifter
- Kontorspapper och kuvert
- Kartonger (hopvikta)
- Böcker utan hård pärm

**🟨 Gul - Plast**
- Plastförpackningar med återvinningssymbol
- Plastpåsar och plastfilm
- Yoghurtburkar och livsmedelsförpackningar
- Rengör innan du slänger

**🟩 Grön - Glas**
- Glasburkar och flaskor
- Ta bort lock och korkar
- Färgat och ofärgat glas tillsammans

**🟫 Brun - Kompost**
- Matrester och skalningar
- Kaffefilter och tepåsar
- Äggkartonger
- Blommor och krukväxter`,
          order: 1,
          lastUpdated: "2024-03-05",
          tableOfContents: true,
          statisticCards: [
            {
              title: "Återvinningsgrad",
              value: "87%",
              icon: "♻️",
              description: "Andel sopor som återvinns",
              trend: {
                value: 5.2,
                isPositive: true
              }
            },
            {
              title: "Kostnad per lägenhet",
              value: "145 kr/mån",
              icon: "💰",
              description: "Genomsnittlig sopkostnad"
            }
          ],
          quickActions: [
            {
              id: generateId(),
              title: "Boka grovsopor",
              description: "Ring Stockholms stad",
              icon: "📞",
              actionType: "phone",
              actionValue: "08-508-00-508",
              isPrimary: true
            }
          ]
        }
      ]
    },

    // Section 10: Parkering och garage
    {
      id: generateId(),
      title: "Parkering och garage",
      description: "Information om parkeringsregler, garage och vinterunderhåll",
      order: 10,
      isActive: true,
      lastUpdated: "2024-02-25",
      completionStatus: 90,
      pages: [
        {
          id: generateId(),
          title: "Parkeringsregler",
          content: `Information om parkeringsplatser, regler och tillgänglighet.

## Parkeringsplatser

### Tillgängliga platser
- **Totalt:** 35 parkeringsplatser
- **Garage:** 20 platser (under mark)
- **Utomhus:** 15 platser (gård och gata)
- **Handikapp:** 2 reserverade platser

### Fördelning
- **Medlemmar:** 32 platser
- **Gäster:** 2 platser (max 24h)
- **Handikapp:** 2 platser (endast med tillstånd)

## Hyra av parkeringsplats

### Ansökan
1. **Kö:** Anmäl intresse till styrelsen
2. **Tilldelning:** Enligt kötid och behov
3. **Kontrakt:** Skrivs för 1 år i taget
4. **Uppsägning:** 3 månaders uppsägningstid

### Kostnader 2024
- **Garage:** 850 kr/månad
- **Utomhus:** 450 kr/månad
- **Deposition:** 2 månaders hyra

## Garage

### Tillgång och säkerhet
- **Öppettider:** 24/7 för hyresgäster
- **Nyckel/kod:** Erhålls vid kontraktsteckning
- **Säkerhet:** Övervakningskameror och larm
- **Belysning:** Automatisk, rapportera defekta lampor`,
          order: 1,
          lastUpdated: "2024-02-25",
          tableOfContents: true,
          statisticCards: [
            {
              title: "Lediga platser",
              value: "3",
              icon: "🚗",
              description: "Tillgängliga parkeringsplatser"
            },
            {
              title: "Kötid garage",
              value: "8 månader",
              icon: "⏰",
              description: "Genomsnittlig väntetid"
            }
          ],
          quickActions: [
            {
              id: generateId(),
              title: "Ansök om parkering",
              description: "Anmäl intresse för parkeringsplats",
              icon: "📝",
              actionType: "email",
              actionValue: "styrelsen@exempel.se",
              isPrimary: true
            }
          ]
        }
      ]
    },

    // Section 11: Tvättstuga och bokningssystem
    {
      id: generateId(),
      title: "Tvättstuga och bokningssystem",
      description: "Regler för tvättstuga, bokningssystem och gemensamma utrymmen",
      order: 11,
      isActive: true,
      lastUpdated: "2024-02-28",
      completionStatus: 95,
      pages: [
        {
          id: generateId(),
          title: "Tvättstugeregler",
          content: `Vår tvättstuga är ett gemensamt utrymme som alla medlemmar kan använda enligt våra regler.

## Bokningssystem

### Online-bokning
- **Hemsida:** exempel.se/tvattstuga
- **Inloggning:** Använd ditt lägenhetsnummer och kod
- **Bokningstid:** Max 7 dagar i förväg
- **Tid per bokning:** 3 timmar (tvättning + torkning)

### Bokningsregler
- **Max 2 bokningar per vecka** per lägenhet
- **Avbokning:** Senast 2 timmar före bokad tid
- **Utebliven:** 3 uteblivanden = 1 veckas karantän
- **Öppettider:** 06:00-22:00 alla dagar

## Utrustning och användning

### Tvättmaskiner
- **Antal:** 3 maskiner (7 kg vardera)
- **Program:** Välj lämpligt program för tyg
- **Tvättmedel:** Använd miljövänligt tvättmedel
- **Rengöring:** Rengör filter efter varje tvätt

### Torktumlare
- **Antal:** 2 torktumlare
- **Tid:** Max 60 minuter per omgång
- **Rengöring:** Rensa luddfilter efter varje användning

## Trivselregler

### Under tvättning
- **Punktlighet** - Kom i tid för din bokning
- **Städning** - Städa efter dig
- **Respekt** - Flytta inte andras tvätt
- **Problem** - Rapportera defekter direkt`,
          order: 1,
          lastUpdated: "2024-02-28",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Boka tvättstuga",
              description: "Online-bokning av tvättstuga",
              icon: "📅",
              actionType: "link",
              actionValue: "https://exempel.se/tvattstuga",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Rapportera fel",
              description: "Anmäl problem med tvättstugan",
              icon: "🚨",
              actionType: "email",
              actionValue: "styrelsen@exempel.se",
              isPrimary: false
            }
          ],
          statisticCards: [
            {
              title: "Tillgänglighet",
              value: "94%",
              icon: "✅",
              description: "Andel tid som tvättstugan är tillgänglig"
            }
          ]
        }
      ]
    },

    // Section 12: Gemensamma utrymmen
    {
      id: generateId(),
      title: "Gemensamma utrymmen",
      description: "Information om föreningslokal, gård, lekplats och bokningsrutiner",
      order: 12,
      isActive: true,
      lastUpdated: "2024-03-01",
      completionStatus: 90,
      pages: [
        {
          id: generateId(),
          title: "Föreningslokal och gård",
          content: `Våra gemensamma utrymmen är till för alla medlemmar att njuta av och ta ansvar för.

## Föreningslokal

### Vad finns i lokalen?
- **Yta:** 45 kvm med kök och toalett
- **Kapacitet:** Max 25 personer
- **Utrustning:** Bord, stolar, projektor, ljudanläggning
- **Kök:** Kylskåp, spis, mikro, diskmaskin, kaffebryggare

### Bokning av föreningslokal
- **Kostnad:** 200 kr/tillfälle för medlemmar
- **Deposition:** 500 kr (återbetalas vid godkänd besiktning)
- **Bokning:** Minst 1 vecka i förväg
- **Städning:** Obligatorisk efter användning

## Gård och utomhusområden

### Lekplats
- **Ålder:** Lekredskap för 3-12 år
- **Säkerhet:** Kontrolleras årligen
- **Regler:** Föräldraansvar, lek under tillsyn
- **Öppettider:** 08:00-20:00 (hänsyn till grannar)

### Grill- och sittplatser
- **Grillplats:** Gemensam grill (egen kol)
- **Bord:** 4 picknickbord
- **Bokning:** Ej nödvändig, först till kvarn
- **Städning:** Städa efter dig

### Cykelförvaring
- **Platser:** 60 cykelplatser
- **Säkerhet:** Låst cykelrum
- **Nyckel:** Erhålls från styrelsen
- **Vinterförvaring:** Rensa bort oanvända cyklar`,
          order: 1,
          lastUpdated: "2024-03-01",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Boka föreningslokal",
              description: "Reservera lokalen för event",
              icon: "🎉",
              actionType: "email",
              actionValue: "styrelsen@exempel.se",
              isPrimary: true
            }
          ],
          statisticCards: [
            {
              title: "Bokningar/månad",
              value: "12",
              icon: "📅",
              description: "Genomsnittligt antal bokningar"
            }
          ]
        }
      ]
    },

    // Section 13: Vanliga frågor (FAQ)
    {
      id: generateId(),
      title: "Vanliga frågor (FAQ)",
      description: "Svar på de mest frekventa frågorna från medlemmar",
      order: 13,
      isActive: true,
      lastUpdated: "2024-03-10",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Ofta ställda frågor",
          content: `Här hittar du svar på de vanligaste frågorna som medlemmar ställer.

## Ekonomi och avgifter

### Varför höjs månadsavgiften?
Avgiften justeras årligen baserat på inflation, energikostnader och planerat underhåll. Beslut fattas på årsstämman efter förslag från styrelsen.

### Vad händer om jag betalar för sent?
- **Påminnelse:** Skickas efter 10 dagar
- **Dröjsmålsränta:** 2% per månad
- **Inkasso:** Efter 30 dagar
- **Uppsägning:** Kan ske vid upprepade förseningar

### Kan jag få rabatt på avgiften?
Nej, alla medlemmar betalar samma avgift baserat på lägenhetsstorlek. Undantag kan göras vid ekonomiska svårigheter efter ansökan till styrelsen.

## Renovering och underhåll

### Får jag sätta upp en markis på balkongen?
Ja, men det kräver tillstånd från styrelsen. Markisen måste vara av godkänd typ och färg enligt våra riktlinjer.

### Vem ansvarar för reparationer i lägenheten?
- **Föreningen:** Stamledningar, värme, ventilation
- **Medlem:** Inredning, vitvaror, ytskikt
- **Gråzon:** Kontakta styrelsen vid osäkerhet

### Kan jag byta till parkettgolv?
Ja, men det kräver tillstånd och ljudisolering enligt BBR. Ansökan ska innehålla teknisk beskrivning och grannarnas godkännande.

## Trivsel och regler

### Får jag ha husdjur?
Ja, enligt stadgarna är husdjur tillåtna. Hundägare ansvarar för att hunden inte stör grannar och att gården hålls ren.

### Vad gäller för uthyrning av lägenheten?
- **Andrahandsuthyrning:** Kräver styrelsens tillstånd
- **Maximal tid:** 2 år under 5-årsperiod
- **Ansökan:** Ska innehålla hyreskontrakt och skäl
- **Avgift:** 500 kr i handläggningsavgift

### Får jag röka på balkongen?
Rökning på balkonger är inte förbjuden, men vi uppmanar till hänsyn mot grannar. Vid klagomål kan styrelsen begära att rökningen upphör.`,
          order: 1,
          lastUpdated: "2024-03-10",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Ställ en fråga",
              description: "Kontakta styrelsen med din fråga",
              icon: "💬",
              actionType: "email",
              actionValue: "styrelsen@exempel.se",
              isPrimary: true
            }
          ]
        }
      ]
    },

    // Section 14: Dokumentarkiv
    {
      id: generateId(),
      title: "Dokumentarkiv",
      description: "Viktiga dokument, formulär och historiska beslut",
      order: 14,
      isActive: true,
      lastUpdated: "2024-03-05",
      completionStatus: 85,
      pages: [
        {
          id: generateId(),
          title: "Viktiga dokument",
          content: `Här hittar du alla viktiga dokument och formulär som rör föreningen.

## Grundläggande dokument

### Juridiska dokument
- **Stadgar** (senaste version 2023)
- **Föreningsregistrering** hos Bolagsverket
- **Fastighetsregisterutdrag**
- **Bygglov och ritningar**

### Ekonomiska dokument
- **Årsredovisningar** (senaste 5 åren)
- **Revisionsberättelser**
- **Budgetar och prognoser**
- **Försäkringsbrev**

## Formulär och blanketter

### För medlemmar
- **Renoveringsansökan**
- **Andrahandsuthyrning**
- **Felanmälan**
- **Adressändring**
- **Parkeringsansökan**

### För styrelsen
- **Protokollmallar**
- **Ekonomiska rapporter**
- **Underhållsplaner**
- **Kontraktsmallar**

## Historiska beslut

### Viktiga beslut 2020-2024
- **2024:** Byte av värmesystem till bergvärme
- **2023:** Stadgeändring för husdjur och uthyrning
- **2022:** Installation av laddstolpar för elbilar
- **2021:** Renovering av trapphus och fasad
- **2020:** Digitalisering av föreningens administration

### Protokoll från årsstämmor
Alla protokoll från årsstämmor finns tillgängliga för medlemmar. Kontakta sekreteraren för äldre protokoll.`,
          order: 1,
          lastUpdated: "2024-03-05",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Dokumentbibliotek",
              description: "Tillgång till alla dokument online",
              icon: "📚",
              actionType: "link",
              actionValue: "/dokument",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Begär dokument",
              description: "Begär specifika dokument från styrelsen",
              icon: "📧",
              actionType: "email",
              actionValue: "styrelsen@exempel.se",
              isPrimary: false
            }
          ],
          statisticCards: [
            {
              title: "Tillgängliga dokument",
              value: "127",
              icon: "📄",
              description: "Antal dokument i arkivet"
            }
          ]
        }
      ]
    },

    // Section 15: Säkerhet och trygghet
    {
      id: generateId(),
      title: "Säkerhet och trygghet",
      description: "Brandskydd, säkerhetssystem och nödrutiner",
      order: 15,
      isActive: true,
      lastUpdated: "2024-03-12",
      completionStatus: 100,
      pages: [
        {
          id: generateId(),
          title: "Brandskydd och säkerhet",
          content: `Din säkerhet och trygghet är vår högsta prioritet. Här hittar du viktig säkerhetsinformation.

## Brandskydd

### Brandvarnare
- **Kontroll:** Testa månadsvis genom att trycka på testknappen
- **Batteribyte:** Byt batteri när varningssignal hörs
- **Livslängd:** Byt brandvarnare var 10:e år
- **Placering:** Minst en per rum, undvik kök och badrum

### Brandsläckare
- **Placering:** En på varje våning i trapphuset
- **Typ:** Pulversläckare för allmän användning
- **Kontroll:** Kontrolleras årligen av certifierad tekniker
- **Användning:** PASS-metoden (Peka, Aktivera, Svep, Släck)

### Utrymningsvägar
- **Primär:** Trapphuset - håll alltid fritt från föremål
- **Sekundär:** Balkong med stege (våning 2-5)
- **Samlingspunkt:** Gården framför huvudentrén
- **Belysning:** Nödbelysning i alla utrymningsvägar

## Säkerhetssystem

### Porttelefon och lås
- **Porttelefon:** Ring lägenhetsnummer för att komma in
- **Huvudentré:** Låses automatiskt kl. 22:00
- **Nyckelkort:** Ger tillgång till entré och cykelrum
- **Förlorad nyckel:** Anmäl direkt till styrelsen

### Övervakningskameror
- **Placering:** Entréer och garage
- **Syfte:** Säkerhet och brottsförebyggande
- **Lagring:** 30 dagar enligt GDPR
- **Tillgång:** Endast vid polisanmälan eller incident

## Nödrutiner

### Vid brand
1. **Larma:** Ring 112
2. **Varna:** Varna grannar genom att knacka på dörrar
3. **Utrym:** Lämna byggnaden via närmaste utrymningsväg
4. **Samlas:** Vid samlingspunkten i gården

### Vid inbrott
1. **Säkerhet först:** Lämna området om du känner dig hotad
2. **Ring 112:** Vid pågående brott
3. **Ring 114 14:** För polisanmälan efter brott
4. **Dokumentera:** Ta foton av skador (efter polisens godkännande)

### Vid vattenskada
1. **Stäng av:** Huvudkran för vatten
2. **Elavbrytare:** Stäng av el i drabbat område
3. **Ring:** Fastighetsskötare eller jour
4. **Dokumentera:** Ta foton för försäkringen`,
          order: 1,
          lastUpdated: "2024-03-12",
          tableOfContents: true,
          quickActions: [
            {
              id: generateId(),
              title: "Nödnummer 112",
              description: "Ring vid akut fara",
              icon: "🚨",
              actionType: "phone",
              actionValue: "112",
              isPrimary: true
            },
            {
              id: generateId(),
              title: "Jour",
              description: "Akut jour för fastigheten",
              icon: "📞",
              actionType: "phone",
              actionValue: "08-123-JOUR",
              isPrimary: false
            }
          ],
          infoCards: [
            {
              id: generateId(),
              title: "Viktigt!",
              content: "Vid akut fara - ring alltid 112 först. Kontakta sedan fastighetsskötare eller styrelse.",
              type: "urgent",
              icon: "🚨"
            }
          ],
          statisticCards: [
            {
              title: "Säkerhetsincidenter",
              value: "2",
              icon: "🔒",
              description: "Antal incidenter senaste året"
            },
            {
              title: "Brandkontroller",
              value: "100%",
              icon: "🔥",
              description: "Genomförda säkerhetskontroller"
            }
          ]
        }
      ]
    }
  ]
}; 