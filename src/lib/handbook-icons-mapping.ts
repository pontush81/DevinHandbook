import { Home, Phone, Car, Recycle, FileText, Users, Settings, Wrench, Book, AlertCircle, Heart, HelpCircle, Archive, Waves } from 'lucide-react'
import { HomeIcon, PhoneIcon, TruckIcon, DocumentTextIcon, UserGroupIcon, CogIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { MdHome, MdPhone, MdDirectionsCar, MdRecycling, MdDescription, MdPeople, MdSettings, MdBuild, MdBook, MdError, MdFavorite, MdHelp, MdArchive, MdLocalLaundryService } from 'react-icons/md'
import { FaHome, FaPhone, FaCar, FaRecycle, FaFileAlt, FaUsers, FaCog, FaTools, FaBook, FaExclamationTriangle, FaHeart, FaQuestion, FaArchive, FaTshirt } from 'react-icons/fa'

export type IconType = 'emoji' | 'lucide' | 'hero' | 'material' | 'fontawesome'

interface IconMapping {
  emoji: string
  lucide: any
  hero?: any
  material: any
  fontawesome: any
}

// Mapping från svenska handbok-sektioner till ikoner
export const handbookIconMapping: Record<string, IconMapping> = {
  // Välkommen-sektionen
  'välkommen': {
    emoji: '👋',
    lucide: Home,
    hero: HomeIcon,
    material: MdHome,
    fontawesome: FaHome
  },
  
  // Kontakt och styrelse
  'kontaktuppgifter': {
    emoji: '📞',
    lucide: Phone,
    hero: PhoneIcon,
    material: MdPhone,
    fontawesome: FaPhone
  },
  'kontakt': {
    emoji: '📞',
    lucide: Phone,
    hero: PhoneIcon,
    material: MdPhone,
    fontawesome: FaPhone
  },
  'styrelse': {
    emoji: '👥',
    lucide: Users,
    hero: UserGroupIcon,
    material: MdPeople,
    fontawesome: FaUsers
  },
  
  // Dokument och regler
  'stadgar': {
    emoji: '📋',
    lucide: FileText,
    hero: DocumentTextIcon,
    material: MdDescription,
    fontawesome: FaFileAlt
  },
  'årsredovisning': {
    emoji: '📊',
    lucide: FileText,
    hero: DocumentTextIcon,
    material: MdDescription,
    fontawesome: FaFileAlt
  },
  'dokument': {
    emoji: '📄',
    lucide: FileText,
    hero: DocumentTextIcon,
    material: MdDescription,
    fontawesome: FaFileAlt
  },
  'dokumentarkiv': {
    emoji: '🗃️',
    lucide: Archive,
    material: MdArchive,
    fontawesome: FaArchive
  },
  
  // Renovering och underhåll
  'renovering': {
    emoji: '🔨',
    lucide: Wrench,
    hero: WrenchScrewdriverIcon,
    material: MdBuild,
    fontawesome: FaTools
  },
  'underhåll': {
    emoji: '🛠️',
    lucide: Settings,
    hero: CogIcon,
    material: MdSettings,
    fontawesome: FaCog
  },
  
  // Bopärmar och regler
  'bopärm': {
    emoji: '📖',
    lucide: Book,
    material: MdBook,
    fontawesome: FaBook
  },
  'regler': {
    emoji: '📝',
    lucide: FileText,
    hero: DocumentTextIcon,
    material: MdDescription,
    fontawesome: FaFileAlt
  },
  'trivselregler': {
    emoji: '💝',
    lucide: Heart,
    material: MdFavorite,
    fontawesome: FaHeart
  },
  
  // Sopsortering
  'sopsortering': {
    emoji: '♻️',
    lucide: Recycle,
    material: MdRecycling,
    fontawesome: FaRecycle
  },
  'återvinning': {
    emoji: '🌱',
    lucide: Recycle,
    material: MdRecycling,
    fontawesome: FaRecycle
  },
  
  // Parkering
  'parkering': {
    emoji: '🚗',
    lucide: Car,
    hero: TruckIcon,
    material: MdDirectionsCar,
    fontawesome: FaCar
  },
  'garage': {
    emoji: '🏠',
    lucide: Home,
    hero: HomeIcon,
    material: MdHome,
    fontawesome: FaHome
  },
  
  // Tvättstuga
  'tvättstuga': {
    emoji: '👕',
    lucide: Waves,
    material: MdLocalLaundryService,
    fontawesome: FaTshirt
  },
  'bokning': {
    emoji: '📅',
    lucide: Settings,
    hero: CogIcon,
    material: MdSettings,
    fontawesome: FaCog
  },
  
  // Felanmälan
  'felanmälan': {
    emoji: '⚠️',
    lucide: AlertCircle,
    material: MdError,
    fontawesome: FaExclamationTriangle
  },
  'fel': {
    emoji: '🔧',
    lucide: Wrench,
    hero: WrenchScrewdriverIcon,
    material: MdBuild,
    fontawesome: FaTools
  },
  
  // Gemensamma utrymmen
  'gemensamma': {
    emoji: '🏢',
    lucide: Home,
    hero: HomeIcon,
    material: MdHome,
    fontawesome: FaHome
  },
  'utrymmen': {
    emoji: '🏠',
    lucide: Home,
    hero: HomeIcon,
    material: MdHome,
    fontawesome: FaHome
  },
  
  // FAQ
  'faq': {
    emoji: '❓',
    lucide: HelpCircle,
    material: MdHelp,
    fontawesome: FaQuestion
  },
  'vanliga frågor': {
    emoji: '❓',
    lucide: HelpCircle,
    material: MdHelp,
    fontawesome: FaQuestion
  },
  'frågor': {
    emoji: '❓',
    lucide: HelpCircle,
    material: MdHelp,
    fontawesome: FaQuestion
  }
}

/**
 * Hitta lämplig ikon för en handbok-sektion baserat på titeln
 * @param title - Sektionens titel
 * @param iconType - Typ av ikon som ska returneras
 * @returns Ikon-komponent eller emoji-sträng
 */
export function getHandbookSectionIcon(title: string, iconType: IconType = 'emoji') {
  const normalizedTitle = title.toLowerCase().trim()
  
  // Försök hitta exakt match först
  let iconMapping = handbookIconMapping[normalizedTitle]
  
  // Om ingen exakt match, försök hitta partial match
  if (!iconMapping) {
    const matchingKey = Object.keys(handbookIconMapping).find(key => 
      normalizedTitle.includes(key) || key.includes(normalizedTitle)
    )
    
    if (matchingKey) {
      iconMapping = handbookIconMapping[matchingKey]
    }
  }
  
  // Om fortfarande ingen match, använd standardikon
  if (!iconMapping) {
    iconMapping = {
      emoji: '📄',
      lucide: FileText,
      hero: DocumentTextIcon,
      material: MdDescription,
      fontawesome: FaFileAlt
    }
  }
  
  switch (iconType) {
    case 'emoji':
      return iconMapping.emoji
    case 'lucide':
      return iconMapping.lucide
    case 'hero':
      return iconMapping.hero || iconMapping.lucide
    case 'material':
      return iconMapping.material
    case 'fontawesome':
      return iconMapping.fontawesome
    default:
      return iconMapping.emoji
  }
}

/**
 * Kontrollera om en ikon finns för given titel
 */
export function hasIconForTitle(title: string): boolean {
  const normalizedTitle = title.toLowerCase().trim()
  return Object.keys(handbookIconMapping).some(key => 
    normalizedTitle.includes(key) || key.includes(normalizedTitle)
  )
} 