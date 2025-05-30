import { 
  BookOpen, Users, Phone, DollarSign, Wrench, Search, MessageCircle, 
  Heart, Recycle, Car, Home, FileText, Building, Archive, Settings, 
  Book, Calendar, Clock, Mail, MapPin, Shield, Star, Zap, 
  Target, Trophy, Gift, Music, Palette, Camera, Coffee,
  Lightbulb, Key, Lock, Bell, Flag, Globe, Compass, Bookmark,
  type LucideIcon
} from 'lucide-react';

// Mapping från string till ikon-komponent
export const iconMap: Record<string, LucideIcon> = {
  // Vanliga
  BookOpen,
  Users,
  Phone,
  Mail,
  Home,
  Building,
  Search,
  Settings,
  
  // Ekonomi & Business
  DollarSign,
  Target,
  Trophy,
  Star,
  Archive,
  Calendar,
  Clock,
  Flag,
  
  // Underhåll & Service
  Wrench,
  Key,
  Lock,
  Shield,
  Bell,
  Lightbulb,
  Zap,
  Camera,
  
  // Dokument & Info
  FileText,
  Book,
  Bookmark,
  MessageCircle,
  Globe,
  Compass,
  MapPin,
  
  // Livsstil & Community
  Heart,
  Gift,
  Coffee,
  Music,
  Palette,
  Recycle,
  Car,
};

/**
 * Hämtar en ikon-komponent baserat på namn
 * @param iconName Namnet på ikonen (t.ex. "Users", "Phone")
 * @returns Lucide ikon-komponent eller BookOpen som fallback
 */
export const getIconComponent = (iconName?: string): LucideIcon => {
  if (!iconName) return BookOpen;
  return iconMap[iconName] || BookOpen;
};

/**
 * Kontrollerar om ett ikonnamn är giltigt
 * @param iconName Namnet på ikonen
 * @returns true om ikonen finns, false annars
 */
export const isValidIcon = (iconName?: string): boolean => {
  if (!iconName) return false;
  return iconName in iconMap;
};

/**
 * Hämtar alla tillgängliga ikonnamn
 * @returns Array med alla ikonnamn
 */
export const getAvailableIcons = (): string[] => {
  return Object.keys(iconMap);
}; 