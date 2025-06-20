import React from 'react'
import { Home, Phone, Car, Recycle, FileText, Building, Settings, Users } from 'lucide-react'
import { HomeIcon, PhoneIcon, TruckIcon } from '@heroicons/react/24/outline'
import { MdHome, MdPhone, MdDirectionsCar, MdRecycling, MdDescription } from 'react-icons/md'
import { FaHome, FaPhone, FaCar, FaRecycle, FaFileAlt } from 'react-icons/fa'
import { cn } from '@/lib/utils'

interface HandbookSection {
  id: string
  title: string
  description?: string
}

interface IconProps {
  className?: string
}

// Emoji ikoner (enkla och universella)
export const EmojiIcons = {
  husregler: () => "🏠",
  kontakt: () => "📞", 
  parkering: () => "🚗",
  sophantering: () => "♻️",
  styrelse: () => "📋"
}

// Lucide ikoner (shadcn/ui standard)
export const LucideIcons = {
  husregler: ({ className }: IconProps) => <Home className={cn("h-5 w-5", className)} />,
  kontakt: ({ className }: IconProps) => <Phone className={cn("h-5 w-5", className)} />,
  parkering: ({ className }: IconProps) => <Car className={cn("h-5 w-5", className)} />,
  sophantering: ({ className }: IconProps) => <Recycle className={cn("h-5 w-5", className)} />,
  styrelse: ({ className }: IconProps) => <FileText className={cn("h-5 w-5", className)} />
}

// Heroicons (minimalistiska)
export const HeroIcons = {
  husregler: ({ className }: IconProps) => <HomeIcon className={cn("h-5 w-5", className)} />,
  kontakt: ({ className }: IconProps) => <PhoneIcon className={cn("h-5 w-5", className)} />,
  parkering: ({ className }: IconProps) => <TruckIcon className={cn("h-5 w-5", className)} />
}

// Material Design ikoner
export const MaterialIcons = {
  husregler: ({ className }: IconProps) => <MdHome className={cn("h-5 w-5", className)} />,
  kontakt: ({ className }: IconProps) => <MdPhone className={cn("h-5 w-5", className)} />,
  parkering: ({ className }: IconProps) => <MdDirectionsCar className={cn("h-5 w-5", className)} />,
  sophantering: ({ className }: IconProps) => <MdRecycling className={cn("h-5 w-5", className)} />,
  styrelse: ({ className }: IconProps) => <MdDescription className={cn("h-5 w-5", className)} />
}

// Font Awesome ikoner
export const FontAwesomeIcons = {
  husregler: ({ className }: IconProps) => <FaHome className={cn("h-5 w-5", className)} />,
  kontakt: ({ className }: IconProps) => <FaPhone className={cn("h-5 w-5", className)} />,
  parkering: ({ className }: IconProps) => <FaCar className={cn("h-5 w-5", className)} />,
  sophantering: ({ className }: IconProps) => <FaRecycle className={cn("h-5 w-5", className)} />,
  styrelse: ({ className }: IconProps) => <FaFileAlt className={cn("h-5 w-5", className)} />
}

// Exempel på handboksektioner
export const handbookSections: HandbookSection[] = [
  {
    id: "husregler",
    title: "Husregler & ordningsregler",
    description: "Regler och riktlinjer för boende"
  },
  {
    id: "kontakt", 
    title: "Kontaktuppgifter & felanmälan",
    description: "Viktiga kontakter och hur du anmäler fel"
  },
  {
    id: "parkering",
    title: "Parkering & garage", 
    description: "Information om parkering och garage"
  },
  {
    id: "sophantering",
    title: "Sophantering & återvinning",
    description: "Hur du sorterar och slänger avfall"
  },
  {
    id: "styrelse",
    title: "Styrelseinfo & protokoll",
    description: "Information från styrelsen och protokoll"
  }
]

// Exempel på hur du kan använda ikonerna
export const HandbookSectionCard: React.FC<{
  section: HandbookSection
  iconType?: 'emoji' | 'lucide' | 'hero' | 'material' | 'fontawesome'
}> = ({ section, iconType = 'lucide' }) => {
  const renderIcon = () => {
    switch (iconType) {
      case 'emoji':
        return (
          <span className="text-2xl" role="img" aria-label={section.title}>
            {EmojiIcons[section.id as keyof typeof EmojiIcons]?.()}
          </span>
        )
      case 'hero':
        const HeroIcon = HeroIcons[section.id as keyof typeof HeroIcons]
        return HeroIcon ? <HeroIcon className="text-blue-600" /> : null
      case 'material':
        const MaterialIcon = MaterialIcons[section.id as keyof typeof MaterialIcons]
        return MaterialIcon ? <MaterialIcon className="text-gray-600" /> : null
      case 'fontawesome':
        const FAIcon = FontAwesomeIcons[section.id as keyof typeof FontAwesomeIcons]
        return FAIcon ? <FAIcon className="text-purple-600" /> : null
      default:
        const LucideIcon = LucideIcons[section.id as keyof typeof LucideIcons]
        return LucideIcon ? <LucideIcon className="text-gray-600" /> : null
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      {renderIcon()}
      <div>
        <h3 className="font-semibold">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-muted-foreground">{section.description}</p>
        )}
      </div>
    </div>
  )
}

// Demo komponent som visar alla ikontyper
export const IconDemo: React.FC = () => {
  const iconTypes: Array<'emoji' | 'lucide' | 'hero' | 'material' | 'fontawesome'> = [
    'emoji', 'lucide', 'hero', 'material', 'fontawesome'
  ]

  return (
    <div className="space-y-8">
      {iconTypes.map(iconType => (
        <div key={iconType} className="space-y-4">
          <h2 className="text-xl font-bold capitalize">{iconType} Ikoner</h2>
          <div className="grid gap-3">
            {handbookSections.map(section => (
              <HandbookSectionCard
                key={`${iconType}-${section.id}`}
                section={section}
                iconType={iconType}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
} 