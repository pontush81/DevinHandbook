import React from 'react';
import { getHandbookSectionIcon, type IconType } from '@/lib/handbook-icons-mapping';
import { cn } from '@/lib/utils';

interface HandbookSectionHeaderProps {
  title: string;
  description?: string;
  iconType?: IconType;
  showIcon?: boolean;
  className?: string;
  level?: 1 | 2 | 3; // h1, h2, h3
}

export const HandbookSectionHeader: React.FC<HandbookSectionHeaderProps> = ({
  title,
  description,
  iconType = 'emoji',
  showIcon = true,
  className,
  level = 2
}) => {
  const renderIcon = () => {
    if (!showIcon) return null;
    
    if (iconType === 'emoji') {
      const emoji = getHandbookSectionIcon(title, 'emoji') as string;
      return (
        <span 
          className="text-3xl mr-4 flex-shrink-0" 
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
            "h-8 w-8 mr-4 flex-shrink-0",
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

  const HeaderComponent = level === 1 ? 'h1' : level === 3 ? 'h3' : 'h2';
  const headerClasses = cn(
    "font-semibold scroll-mt-24",
    level === 1 && "text-3xl md:text-4xl",
    level === 2 && "text-2xl md:text-3xl",
    level === 3 && "text-xl md:text-2xl"
  );

  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center mb-4">
        {renderIcon()}
        <HeaderComponent className={headerClasses}>
          {title}
        </HeaderComponent>
      </div>
      {description && (
        <div className="prose max-w-none text-lg text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  );
};

export default HandbookSectionHeader; 