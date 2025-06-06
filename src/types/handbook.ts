export interface HandbookPage {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  order_index: number;
  section_id: string;
  is_published?: boolean;
  lastUpdated?: string;
  estimatedReadTime?: number;
  quickActions?: QuickAction[];
  statisticCards?: StatisticCard[];
  infoCards?: InfoCard[];
  contacts?: Contact[];
}

export interface HandbookSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  handbook_id: string;
  is_public?: boolean;
  is_published?: boolean;
  icon?: string;
  pages: HandbookPage[];
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href?: string;
  onClick?: () => void;
}

export interface StatisticCard {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface InfoCard {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  icon?: string;
}

export interface Contact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  avatar?: string;
} 