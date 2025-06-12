export interface HandbookPage {
  title: string;
  content: string;
  order: number;
  slug: string;
}

export interface HandbookSection {
  title: string;
  description: string;
  order: number;
  isActive: boolean;
  pages: HandbookPage[];
}

export const DEFAULT_HANDBOOK_TEMPLATE: HandbookSection[] = [
  {
    title: "Välkommen",
    description: "Introduktion och översikt",
    order: 1,
    isActive: true,
    pages: [
      {
        title: "Översikt",
        content: "Välkommen till din digitala handbok! Här hittar du all viktig information om din bostadsrättsförening.",
        order: 1,
        slug: "oversikt"
      }
    ]
  },
  {
    title: "Kontaktuppgifter",
    description: "Viktiga kontakter och information",
    order: 2,
    isActive: true,
    pages: [
      {
        title: "Förvaltning",
        content: "Kontaktuppgifter till förvaltningsbolaget.",
        order: 1,
        slug: "forvaltning"
      },
      {
        title: "Styrelse",
        content: "Här hittar du kontaktuppgifter till styrelsen.",
        order: 2,
        slug: "styrelse"
      }
    ]
  },
  {
    title: "Regler och ordningsföreskrifter",
    description: "Föreningens regler och bestämmelser",
    order: 3,
    isActive: true,
    pages: [
      {
        title: "Ordningsföreskrifter",
        content: "Föreningens ordningsföreskrifter och regler för boende.",
        order: 1,
        slug: "ordningsforeskrifter"
      }
    ]
  },
  {
    title: "Ekonomi",
    description: "Ekonomisk information och avgifter",
    order: 4,
    isActive: true,
    pages: [
      {
        title: "Avgifter",
        content: "Information om månadsavgifter och andra kostnader.",
        order: 1,
        slug: "avgifter"
      }
    ]
  },
  {
    title: "Underhåll och reparationer",
    description: "Information om underhåll och felanmälan",
    order: 5,
    isActive: true,
    pages: [
      {
        title: "Felanmälan",
        content: "Så här anmäler du fel och skador.",
        order: 1,
        slug: "felanmalan"
      }
    ]
  },
  {
    title: "Gemensamma utrymmen",
    description: "Tvättstuga, förråd och andra faciliteter",
    order: 6,
    isActive: true,
    pages: [
      {
        title: "Tvättstuga",
        content: "Regler och bokning av tvättstuga.",
        order: 1,
        slug: "tvattstuga"
      }
    ]
  }
];

// Funktion för att skapa template från importerade sektioner
export function createTemplateFromImportedSections(importedSections: any[]): HandbookSection[] {
  return importedSections.map((section, index) => ({
    title: section.title,
    description: section.content.substring(0, 200) + '...',
    order: index + 1,
    isActive: true,
    pages: [{
      title: section.title,
      content: section.content,
      order: 1,
      slug: section.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
    }]
  }));
}

// Funktion för att få standardmallen
export function getDefaultTemplate(): HandbookSection[] {
  return DEFAULT_HANDBOOK_TEMPLATE;
} 