import { supabase } from '@/lib/supabase';

export interface WelcomeContentData {
  heroTitle: string;
  heroSubtitle: string;
  showInfoCards: boolean;
  showImportantInfo: boolean;
  infoCards: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }>;
  importantInfo: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  }>;
}

export interface WelcomeContent {
  id: string;
  handbook_id: string;
  hero_title: string;
  hero_subtitle: string;
  info_cards: any[];
  important_info: any[];
  created_at: string;
  updated_at: string;
}

/**
 * Hämtar välkomstinnehåll för en handbok
 */
export async function getWelcomeContent(handbookId: string): Promise<WelcomeContentData | null> {
  try {
    const { data, error } = await supabase
      .from('welcome_content')
      .select('*')
      .eq('handbook_id', handbookId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching welcome content:', error);
      return null;
    }

    if (!data) {
      // Ingen data hittades
      return null;
    }

    return {
      heroTitle: data.hero_title,
      heroSubtitle: data.hero_subtitle,
      showInfoCards: data.show_info_cards ?? true,
      showImportantInfo: data.show_important_info ?? true,
      infoCards: data.info_cards || [],
      importantInfo: data.important_info || []
    };
  } catch (error) {
    console.error('Error fetching welcome content:', error);
    return null;
  }
}

/**
 * Skapar eller uppdaterar välkomstinnehåll för en handbok
 */
export async function upsertWelcomeContent(
  handbookId: string, 
  content: WelcomeContentData
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('welcome_content')
      .upsert({
        handbook_id: handbookId,
        hero_title: content.heroTitle,
        hero_subtitle: content.heroSubtitle,
        show_info_cards: content.showInfoCards,
        show_important_info: content.showImportantInfo,
        info_cards: content.infoCards,
        important_info: content.importantInfo
      }, {
        onConflict: 'handbook_id'
      });

    if (error) {
      console.error('Error upserting welcome content:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error upserting welcome content:', error);
    return false;
  }
}

/**
 * Tar bort välkomstinnehåll för en handbok
 */
export async function deleteWelcomeContent(handbookId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('welcome_content')
      .delete()
      .eq('handbook_id', handbookId);

    if (error) {
      console.error('Error deleting welcome content:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting welcome content:', error);
    return false;
  }
}

/**
 * Standardinnehåll för nya handböcker
 */
export function getDefaultWelcomeContent(): WelcomeContentData {
  return {
    heroTitle: "Välkommen till din handbok! 🏡",
    heroSubtitle: "Vi är glada att du är en del av vår gemenskap. Denna digitala handbok är din guide till allt som rör ditt boende och vår förening.",
    showInfoCards: true,
    showImportantInfo: true,
    infoCards: [
      {
        id: "info-1",
        title: "Komplett information",
        description: "Allt om föreningen, regler och rutiner på ett ställe",
        icon: "BookOpen",
        color: "blue"
      },
      {
        id: "info-2", 
        title: "Snabb kontakt",
        description: "Kontaktuppgifter till styrelse och viktiga personer",
        icon: "Phone",
        color: "green"
      },
      {
        id: "info-3",
        title: "Felanmälan", 
        description: "Rapportera problem snabbt och enkelt",
        icon: "Wrench",
        color: "orange"
      },
      {
        id: "info-4",
        title: "Ekonomi & avgifter",
        description: "Transparent information om föreningens ekonomi", 
        icon: "DollarSign",
        color: "purple"
      }
    ],
    importantInfo: [
      {
        id: "important-1",
        title: "Löpande uppdateringar",
        description: "Handboken uppdateras kontinuerligt med aktuell information",
        icon: "Clock",
        color: "blue"
      },
      {
        id: "important-2",
        title: "Sökfunktion", 
        description: "Använd sökfunktionen för att snabbt hitta det du letar efter",
        icon: "Search",
        color: "green"
      },
      {
        id: "important-3",
        title: "Kontakta styrelsen",
        description: "Har du frågor som inte besvaras här? Kontakta oss direkt",
        icon: "MessageCircle", 
        color: "purple"
      },
      {
        id: "important-4",
        title: "Delta aktivt",
        description: "Gå gärna på våra möten och aktiviteter för att stärka gemenskapen",
        icon: "Users",
        color: "orange"
      }
    ]
  };
} 