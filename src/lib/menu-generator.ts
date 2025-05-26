import React from 'react';

// Menu Generator - Truly dynamic based on sections only
export interface MenuItemConfig {
  id: string;
  title: string;
  icon: string;
  section: string;
  priority: 'primary' | 'secondary' | 'neutral' | 'accent-orange' | 'accent-green';
  order: number;
  description?: string;
  isActive?: boolean;
}

// Icon mapping for common section types
const SECTION_ICON_MAP: Record<string, string> = {
  'välkommen': '👋',
  'welcome': '👋',
  'kontakt': '👥',
  'contact': '👥',
  'kontaktuppgifter': '👥',
  'styrelse': '👥',
  'felanmälan': '🔧',
  'report': '🔧',
  'fel': '🔧',
  'regler': '📋',
  'rules': '📋',
  'bopärmar': '📋',
  'sopsortering': '♻️',
  'recycling': '♻️',
  'återvinning': '♻️',
  'tvättstuga': '🧺',
  'laundry': '🧺',
  'tvätt': '🧺',
  'parkering': '🚗',
  'parking': '🚗',
  'garage': '🚗',
  'ekonomi': '💰',
  'economy': '💰',
  'avgifter': '💰',
  'stadgar': '🏛️',
  'board': '🏛️',
  'årsredovisning': '🏛️',
  'renovering': '🔨',
  'renovation': '🔨',
  'underhåll': '🔨',
  'gemensamma': '🤝',
  'community': '🤝',
  'utrymmen': '🤝',
  'dokument': '📁',
  'documents': '📁',
  'arkiv': '📁',
  'säkerhet': '🔒',
  'security': '🔒',
  'trygghet': '🔒',
  'faq': '❓',
  'frågor': '❓',
  'vanliga': '❓',
};

// Priority mapping based on section importance
const SECTION_PRIORITY_MAP: Record<string, MenuItemConfig['priority']> = {
  'välkommen': 'neutral',
  'welcome': 'neutral',
  'kontakt': 'neutral',
  'contact': 'neutral',
  'felanmälan': 'neutral',
  'report': 'neutral',
  'regler': 'neutral',
  'rules': 'neutral',
  'sopsortering': 'neutral',
  'tvättstuga': 'neutral',
  'parkering': 'neutral',
  'ekonomi': 'neutral',
  'stadgar': 'neutral',
  'renovering': 'neutral',
  'gemensamma': 'neutral',
  'dokument': 'neutral',
  'säkerhet': 'neutral',
  'faq': 'neutral',
};

export class MenuGenerator {
  private sections: any[];

  constructor(sections: any[] = []) {
    this.sections = sections;
  }

  // Auto-generate icon from section title
  private getIconForSection(title: string): string {
    const normalizedTitle = title.toLowerCase()
      .replace(/[^a-zåäö\s]/g, '')
      .trim();
    
    // Try exact match first
    if (SECTION_ICON_MAP[normalizedTitle]) {
      return SECTION_ICON_MAP[normalizedTitle];
    }
    
    // Try partial matches
    for (const [key, icon] of Object.entries(SECTION_ICON_MAP)) {
      if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
        return icon;
      }
    }
    
    return '📄'; // Default icon
  }

  // Auto-generate priority from section title
  private getPriorityForSection(title: string): MenuItemConfig['priority'] {
    const normalizedTitle = title.toLowerCase()
      .replace(/[^a-zåäö\s]/g, '')
      .trim();
    
    // Try exact match first
    if (SECTION_PRIORITY_MAP[normalizedTitle]) {
      return SECTION_PRIORITY_MAP[normalizedTitle];
    }
    
    // Try partial matches
    for (const [key, priority] of Object.entries(SECTION_PRIORITY_MAP)) {
      if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
        return priority;
      }
    }
    
    return 'neutral'; // Default priority
  }

  // Generate menu items from sections - simple flat list
  generateMenuItems(): MenuItemConfig[] {
    return this.sections
      .filter(section => section.title) // Only sections with titles
      .map((section, index) => ({
        id: section.id || `section-${index}`,
        title: section.title,
        icon: this.getIconForSection(section.title),
        section: section.id || `section-${index}`,
        priority: this.getPriorityForSection(section.title),
        order: section.order_index || index,
        description: section.description,
        isActive: section.is_active !== false,
      }))
      .sort((a, b) => a.order - b.order);
  }

  // Get all menu items (flat structure)
  getAllMenuItems(): MenuItemConfig[] {
    return this.generateMenuItems();
  }

  // Find menu item by section ID
  findMenuItemBySection(sectionId: string): MenuItemConfig | undefined {
    return this.getAllMenuItems().find(item => item.section === sectionId);
  }

  // Update sections and regenerate menu
  updateSections(sections: any[]): void {
    this.sections = sections;
  }
}

// Factory function for easy usage
export function createMenuFromSections(sections: any[]): MenuGenerator {
  return new MenuGenerator(sections);
}

// Hook for React components (if needed)
export function useMenuGenerator(sections: any[]) {
  const [menuGenerator, setMenuGenerator] = React.useState<MenuGenerator | null>(null);

  React.useEffect(() => {
    const generator = new MenuGenerator(sections);
    setMenuGenerator(generator);
  }, [sections]);

  return menuGenerator;
} 