import { getHandbookSectionIcon, hasIconForTitle, handbookIconMapping } from '@/lib/handbook-icons-mapping';

describe('Handbook Icons Mapping', () => {
  describe('getHandbookSectionIcon', () => {
    it('should return correct emoji for exact match', () => {
      expect(getHandbookSectionIcon('välkommen', 'emoji')).toBe('👋');
      expect(getHandbookSectionIcon('kontakt', 'emoji')).toBe('📞');
      expect(getHandbookSectionIcon('sopsortering', 'emoji')).toBe('♻️');
      expect(getHandbookSectionIcon('parkering', 'emoji')).toBe('🚗');
    });

    it('should return correct emoji for partial match', () => {
      expect(getHandbookSectionIcon('Kontaktuppgifter och styrelse', 'emoji')).toBe('📞');
      expect(getHandbookSectionIcon('Sopsortering och återvinning', 'emoji')).toBe('♻️');
      expect(getHandbookSectionIcon('Parkering & garage', 'emoji')).toBe('🚗');
    });

    it('should be case insensitive', () => {
      expect(getHandbookSectionIcon('KONTAKT', 'emoji')).toBe('📞');
      expect(getHandbookSectionIcon('Sopsortering', 'emoji')).toBe('♻️');
      expect(getHandbookSectionIcon('VÄLKOMMEN', 'emoji')).toBe('👋');
    });

    it('should return default icon for unknown titles', () => {
      const unknownIcon = getHandbookSectionIcon('Okänd sektion', 'emoji');
      expect(unknownIcon).toBe('📄'); // Default emoji
    });

    it('should handle whitespace and trimming', () => {
      expect(getHandbookSectionIcon('  kontakt  ', 'emoji')).toBe('📞');
      expect(getHandbookSectionIcon(' välkommen ', 'emoji')).toBe('👋');
    });

    it('should return lucide components for lucide iconType', () => {
      const icon = getHandbookSectionIcon('kontakt', 'lucide');
      expect(icon).toBeDefined();
      expect(typeof icon).toBe('object'); // React component
      expect(icon.displayName || icon.name).toBeTruthy(); // Has a component name
    });

    it('should return material components for material iconType', () => {
      const icon = getHandbookSectionIcon('kontakt', 'material');
      expect(icon).toBeDefined();
      expect(typeof icon).toBe('function'); // React component
    });

    it('should return fontawesome components for fontawesome iconType', () => {
      const icon = getHandbookSectionIcon('kontakt', 'fontawesome');
      expect(icon).toBeDefined();
      expect(typeof icon).toBe('function'); // React component
    });

    it('should fallback to lucide for hero when hero icon is not available', () => {
      const iconWithHero = getHandbookSectionIcon('kontakt', 'hero');
      const iconWithLucide = getHandbookSectionIcon('kontakt', 'lucide');
      
      expect(iconWithHero).toBeDefined();
      expect(typeof iconWithHero).toBe('object'); // React component
    });
  });

  describe('hasIconForTitle', () => {
    it('should return true for known titles', () => {
      expect(hasIconForTitle('kontakt')).toBe(true);
      expect(hasIconForTitle('välkommen')).toBe(true);
      expect(hasIconForTitle('sopsortering')).toBe(true);
      expect(hasIconForTitle('parkering')).toBe(true);
    });

    it('should return true for partial matches', () => {
      expect(hasIconForTitle('Kontaktuppgifter och styrelse')).toBe(true);
      expect(hasIconForTitle('Sopsortering och återvinning')).toBe(true);
      expect(hasIconForTitle('Parkering & garage')).toBe(true);
    });

    it('should return false for unknown titles', () => {
      expect(hasIconForTitle('Okänd sektion')).toBe(false);
      expect(hasIconForTitle('Något helt annat')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasIconForTitle('KONTAKT')).toBe(true);
      expect(hasIconForTitle('Sopsortering')).toBe(true);
      expect(hasIconForTitle('OKÄND')).toBe(false);
    });
  });

  describe('handbookIconMapping', () => {
    it('should contain all expected section types', () => {
      const expectedSections = [
        'välkommen',
        'kontakt',
        'kontaktuppgifter',
        'styrelse',
        'stadgar',
        'sopsortering',
        'återvinning',
        'parkering',
        'garage',
        'felanmälan',
        'trivselregler',
        'vanliga frågor'
      ];

      expectedSections.forEach(section => {
        expect(handbookIconMapping[section]).toBeDefined();
      });
    });

    it('should have all required icon types for each mapping', () => {
      Object.values(handbookIconMapping).forEach(mapping => {
        expect(mapping.emoji).toBeDefined();
        expect(typeof mapping.emoji).toBe('string');
        expect(mapping.lucide).toBeDefined();
        expect(mapping.material).toBeDefined();
        expect(mapping.fontawesome).toBeDefined();
        // hero is optional
      });
    });

    it('should have unique emojis for different concepts', () => {
      const emojis = Object.values(handbookIconMapping).map(mapping => mapping.emoji);
      const contactEmoji = handbookIconMapping.kontakt.emoji;
      const welcomeEmoji = handbookIconMapping.välkommen.emoji;
      const recyclingEmoji = handbookIconMapping.sopsortering.emoji;
      
      expect(contactEmoji).not.toBe(welcomeEmoji);
      expect(contactEmoji).not.toBe(recyclingEmoji);
      expect(welcomeEmoji).not.toBe(recyclingEmoji);
    });
  });

  describe('Real handbook section examples', () => {
    // Test med verkliga sektionsnamn från complete-brf-handbook.ts
    const realSectionTitles = [
      'Välkommen',
      'Kontaktuppgifter och styrelse',
      'Stadgar och årsredovisning',
      'Renoveringar och underhåll',
      'Bopärmar och regler',
      'Sopsortering och återvinning',
      'Parkering och garage',
      'Tvättstuga och bokningssystem',
      'Felanmälan',
      'Trivselregler',
      'Gemensamma utrymmen',
      'Vanliga frågor (FAQ)',
      'Dokumentarkiv'
    ];

    it('should find appropriate icons for all real section titles', () => {
      realSectionTitles.forEach(title => {
        const icon = getHandbookSectionIcon(title, 'emoji');
        expect(icon).toBeDefined();
        expect(typeof icon).toBe('string');
        expect(icon.length).toBeGreaterThan(0);
        
        // Ska inte returnera standard-ikonen för kända sektioner
        const hasIcon = hasIconForTitle(title);
        if (hasIcon) {
          expect(icon).not.toBe('📄'); // Standardikon
        }
      });
    });

    it('should return meaningful icons for common sections', () => {
      expect(getHandbookSectionIcon('Kontaktuppgifter och styrelse', 'emoji')).toBe('📞');
      expect(getHandbookSectionIcon('Sopsortering och återvinning', 'emoji')).toBe('♻️');
      expect(getHandbookSectionIcon('Parkering och garage', 'emoji')).toBe('🚗');
      expect(getHandbookSectionIcon('Välkommen', 'emoji')).toBe('👋');
    });
  });
}); 