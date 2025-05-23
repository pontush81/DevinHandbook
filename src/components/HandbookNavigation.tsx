import React from 'react';
import { getHandbookSectionIcon, type IconType } from '@/lib/handbook-icons-mapping';
import { cn } from '@/lib/utils';

interface Section {
  id: string;
  title: string;
  description?: string;
}

interface HandbookNavigationProps {
  sections: Section[];
  activeSection?: string;
  iconType?: IconType;
  showIcons?: boolean;
  className?: string;
  onSectionClick?: (sectionId: string) => void;
}

export const HandbookNavigation: React.FC<HandbookNavigationProps> = ({
  sections,
  activeSection,
  iconType = 'emoji',
  showIcons = true,
  className,
  onSectionClick
}) => {
  const renderIcon = (title: string) => {
    if (!showIcons) return null;
    
    if (iconType === 'emoji') {
      const emoji = getHandbookSectionIcon(title, 'emoji') as string;
      return (
        <span 
          className="text-lg mr-3 flex-shrink-0" 
          role="img" 
          aria-label={title}
        >
          {emoji}
        </span>
      );
    } else {
      // För SVG-ikoner (lucide, hero, material, fontawesome)
      const IconComponent = getHandbookSectionIcon(title, iconType) as React.ComponentType<any>;
      return IconComponent ? (
        <IconComponent 
          className={cn(
            "h-5 w-5 mr-3 flex-shrink-0",
            iconType === 'lucide' && "text-blue-600",
            iconType === 'hero' && "text-green-600", 
            iconType === 'material' && "text-purple-600",
            iconType === 'fontawesome' && "text-orange-600"
          )}
          aria-hidden="true"
        />
      ) : null;
    }
  };

  return (
    <nav className={cn("space-y-1", className)}>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#section-${section.id}`}
          onClick={(e) => {
            if (onSectionClick) {
              e.preventDefault();
              onSectionClick(section.id);
            }
          }}
          className={cn(
            "flex items-center py-2 px-3 text-base transition-colors rounded-md",
            activeSection === section.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-foreground hover:bg-muted"
          )}
        >
          {renderIcon(section.title)}
          <span className="truncate">{section.title}</span>
        </a>
      ))}
    </nav>
  );
};

export default HandbookNavigation; 