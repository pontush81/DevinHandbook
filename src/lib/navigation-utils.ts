// Navigation utilities för hantering av "from" query parametrar
export type NavigationSource = 
  | 'settings' 
  | 'members' 
  | 'messages' 
  | 'admin'
  | null;

export interface NavigationContext {
  source: NavigationSource;
  title: string;
  href: string;
}

// Definiera tillgängliga navigationskontexters
const NAVIGATION_CONTEXTS: Record<string, NavigationContext> = {
  settings: {
    source: 'settings',
    title: 'Tillbaka till inställningar',
    href: '/settings'
  },
  members: {
    source: 'members', 
    title: 'Tillbaka till medlemmar',
    href: '/members'
  },
  messages: {
    source: 'messages',
    title: 'Tillbaka till meddelanden', 
    href: '/meddelanden'
  },
  admin: {
    source: 'admin',
    title: 'Tillbaka till admin',
    href: '/admin'
  }
};

/**
 * Hämtar navigationskontexten från query parametrar
 */
export function getNavigationContext(searchParams: URLSearchParams, slug: string): NavigationContext | null {
  const from = searchParams.get('from');
  if (!from || !NAVIGATION_CONTEXTS[from]) {
    return null;
  }
  
  const context = NAVIGATION_CONTEXTS[from];
  return {
    ...context,
    href: `/${slug}${context.href}`
  };
}

/**
 * Bygger URL med "from" parameter
 */
export function buildUrlWithSource(baseUrl: string, source: NavigationSource): string {
  if (!source) return baseUrl;
  
  const url = new URL(baseUrl, 'http://localhost'); // Base domain spelar ingen roll här
  url.searchParams.set('from', source);
  return url.pathname + url.search;
}

/**
 * Kontrollerar om en källa är giltig
 */
export function isValidNavigationSource(source: string | null): source is NavigationSource {
  if (!source) return true; // null är giltigt
  return Object.keys(NAVIGATION_CONTEXTS).includes(source);
}

/**
 * Hämtar standard "tillbaka till handbok" länk
 */
export function getDefaultBackLink(slug: string, handbookTitle: string): NavigationContext {
  return {
    source: null,
    title: `Tillbaka till ${handbookTitle}`,
    href: `/${slug}`
  };
} 