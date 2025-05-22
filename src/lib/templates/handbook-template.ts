import { v4 as uuidv4 } from 'uuid';

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

export const defaultHandbookTemplate: HandbookTemplate = {
  sections: [
    {
      id: uuidv4(),
      title: "Välkommen",
      description: "Välkommen till föreningens digitala handbok! Här hittar du all viktig information om ditt boende och föreningen.",
      order: 1,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Om föreningen",
          content: "# Om vår förening\n\nHär finner du grundläggande information om vår bostadsrättsförening, inklusive historia, vision och kontaktuppgifter.\n\n## Fakta om föreningen\n\n- **Bildad år:** [Årtal]\n- **Antal lägenheter:** [Antal]\n- **Adress:** [Föreningens adress]\n- **Organisationsnummer:** [Org.nr]\n\nVår förening strävar efter att skapa en trivsam boendemiljö med god gemenskap och ekonomisk stabilitet. Vi uppmuntrar alla medlemmar att engagera sig i föreningens angelägenheter.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "För nya medlemmar",
          content: "# Information för nya medlemmar\n\nDetta avsnitt innehåller praktisk information som är särskilt användbar för dig som är ny medlem i föreningen.\n\n## Viktigt att känna till\n\n- Styrelsen håller möten regelbundet och årsstämma hålls vanligtvis i [månad].\n- Felanmälan görs via [metod för felanmälan].\n- I denna handbok hittar du svar på många vanliga frågor om boendet.\n\n## Första tiden i föreningen\n\nVi rekommenderar att du bekantar dig med föreningens stadgar och trivselregler. Ta gärna kontakt med dina grannar och styrelsen om du har frågor om föreningen eller fastigheten.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Kontaktuppgifter och styrelse",
      description: "Information om styrelsen och viktiga kontaktuppgifter",
      order: 2,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Styrelsen",
          content: "# Styrelsen\n\nHär presenteras föreningens styrelsemedlemmar och deras ansvarsområden.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Viktiga kontakter",
          content: "# Viktiga kontakter\n\nHär hittar du kontaktuppgifter till förvaltare, fastighetsskötare och andra viktiga kontakter.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Stadgar och årsredovisning",
      description: "Föreningens stadgar och ekonomiska dokument",
      order: 3,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Stadgar",
          content: "# Föreningens stadgar\n\nHär hittar du föreningens stadgar som reglerar verksamheten.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Årsredovisningar",
          content: "# Årsredovisningar\n\nHär hittar du föreningens senaste årsredovisningar och ekonomiska rapporter.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Renoveringar och underhåll",
      description: "Information om renoveringar och underhåll av fastigheten",
      order: 4,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Renoveringsregler",
          content: "# Renoveringsregler\n\nHär hittar du information om vad du får och inte får göra vid renovering av din lägenhet.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Underhållsplan",
          content: "# Underhållsplan\n\nHär hittar du information om föreningens planerade underhåll och renoveringar.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Bopärmar och regler",
      description: "Bopärmar och föreningens regler",
      order: 5,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Bopärm",
          content: "# Bopärm\n\nHär hittar du information om din lägenhet och dess installationer.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Föreningens regler",
          content: "# Föreningens regler\n\nHär hittar du information om föreningens regler och riktlinjer.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Sopsortering och återvinning",
      description: "Information om sopsortering och återvinning",
      order: 6,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Sopsortering",
          content: "# Sopsortering\n\nHär hittar du information om hur du sorterar dina sopor och var du lämnar dem.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Återvinning",
          content: "# Återvinning\n\nHär hittar du information om återvinningsstationer och miljörum.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Parkering och garage",
      description: "Information om parkering och garage",
      order: 7,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Parkering",
          content: "# Parkering\n\nHär hittar du information om parkeringsplatser och parkeringsregler.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Garage",
          content: "# Garage\n\nHär hittar du information om garage och garageregler.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Tvättstuga och bokningssystem",
      description: "Information om tvättstuga och bokningssystem",
      order: 8,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Tvättstuga",
          content: "# Tvättstuga\n\nHär hittar du information om tvättstugan och dess utrustning.",
          order: 1,
        },
        {
          id: uuidv4(),
          title: "Bokningssystem",
          content: "# Bokningssystem\n\nHär hittar du information om hur du bokar tvättstugan och andra gemensamma utrymmen.",
          order: 2,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Felanmälan",
      description: "Information om felanmälan",
      order: 9,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Felanmälan",
          content: "# Felanmälan\n\nHär hittar du information om hur du gör en felanmälan och vem du kontaktar vid olika typer av fel.",
          order: 1,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Trivselregler",
      description: "Föreningens trivselregler",
      order: 10,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Trivselregler",
          content: "# Trivselregler\n\nHär hittar du föreningens trivselregler för att alla ska trivas i föreningen.",
          order: 1,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Gemensamma utrymmen",
      description: "Information om föreningens gemensamma utrymmen",
      order: 11,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Gemensamma utrymmen",
          content: "# Gemensamma utrymmen\n\nHär hittar du information om föreningens gemensamma utrymmen och hur du använder dem.",
          order: 1,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Vanliga frågor (FAQ)",
      description: "Svar på vanliga frågor",
      order: 12,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Vanliga frågor",
          content: "# Vanliga frågor\n\nHär hittar du svar på vanliga frågor om föreningen och boendet.",
          order: 1,
        }
      ]
    },
    {
      id: uuidv4(),
      title: "Dokumentarkiv",
      description: "Arkiv med viktiga dokument",
      order: 13,
      isActive: true,
      pages: [
        {
          id: uuidv4(),
          title: "Dokumentarkiv",
          content: "# Dokumentarkiv\n\nHär hittar du viktiga dokument som rör föreningen och ditt boende.",
          order: 1,
        }
      ]
    }
  ]
};
