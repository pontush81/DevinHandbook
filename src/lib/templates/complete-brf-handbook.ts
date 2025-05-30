export interface HandbookTemplate {
  metadata: {
    subtitle: string;
    version: string;
    organization: {
      name: string;
      address: string;
      orgNumber: string;
      phone: string;
      email: string;
    };
  };
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  order: number;
  pages: Page[];
}

export interface Page {
  id: string;
  title: string;
  content: string;
  order: number;
  slug: string;
}

export interface InfoCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface StatisticCard {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: string;
  color: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  href: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  image?: string;
}

export const contentTypes = {
  text: 'text',
  infoCards: 'infoCards',
  statistics: 'statistics',
  quickActions: 'quickActions',
  contacts: 'contacts'
};

export const completeBRFHandbook: HandbookTemplate = {
  metadata: {
    subtitle: "",
    version: "1.0",
    organization: {
      name: "",
      address: "",
      orgNumber: "",
      phone: "",
      email: ""
    }
  },
  sections: [
    {
      id: "welcome",
      title: "Välkommen",
      description: "Introduktion och översikt",
      isActive: true,
      order: 0,
      pages: [
        {
          id: "overview",
          title: "Översikt",
          content: "Välkommen till din digitala handbok! Här hittar du all viktig information om din bostadsrättsförening.",
          order: 0,
          slug: "overview"
        }
      ]
    },
    {
      id: "contact",
      title: "Kontaktuppgifter",
      description: "Viktiga kontakter och information",
      isActive: true,
      order: 1,
      pages: [
        {
          id: "board",
          title: "Styrelse",
          content: "Här hittar du kontaktuppgifter till styrelsen.",
          order: 0,
          slug: "board"
        },
        {
          id: "management",
          title: "Förvaltning",
          content: "Kontaktuppgifter till förvaltningsbolaget.",
          order: 1,
          slug: "management"
        }
      ]
    },
    {
      id: "rules",
      title: "Regler och ordningsföreskrifter",
      description: "Föreningens regler och bestämmelser",
      isActive: true,
      order: 2,
      pages: [
        {
          id: "house-rules",
          title: "Ordningsföreskrifter",
          content: "Föreningens ordningsföreskrifter och regler för boende.",
          order: 0,
          slug: "house-rules"
        }
      ]
    },
    {
      id: "economy",
      title: "Ekonomi",
      description: "Ekonomisk information och avgifter",
      isActive: true,
      order: 3,
      pages: [
        {
          id: "fees",
          title: "Avgifter",
          content: "Information om månadsavgifter och andra kostnader.",
          order: 0,
          slug: "fees"
        }
      ]
    },
    {
      id: "maintenance",
      title: "Underhåll och reparationer",
      description: "Information om underhåll och felanmälan",
      isActive: true,
      order: 4,
      pages: [
        {
          id: "reporting",
          title: "Felanmälan",
          content: "Så här anmäler du fel och skador.",
          order: 0,
          slug: "reporting"
        }
      ]
    },
    {
      id: "facilities",
      title: "Gemensamma utrymmen",
      description: "Tvättstuga, förråd och andra faciliteter",
      isActive: true,
      order: 5,
      pages: [
        {
          id: "laundry",
          title: "Tvättstuga",
          content: "Regler och bokning av tvättstuga.",
          order: 0,
          slug: "laundry"
        }
      ]
    }
  ]
}; 