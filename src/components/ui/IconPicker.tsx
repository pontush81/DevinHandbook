"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Users, Phone, DollarSign, Wrench, Search, MessageCircle, 
  Heart, Recycle, Car, Home, FileText, Building, Archive, Settings, 
  Book, Calendar, Clock, Mail, MapPin, Shield, Star, Zap, 
  Target, Trophy, Gift, Music, Palette, Camera, Coffee,
  Lightbulb, Key, Lock, Bell, Flag, Globe, Compass, Bookmark
} from 'lucide-react';

interface IconPickerProps {
  selectedIcon?: string;
  onIconSelect: (iconName: string) => void;
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Tillgängliga ikoner med kategorier
const iconCategories = {
  "Vanliga": [
    { name: "BookOpen", icon: BookOpen, label: "Bok" },
    { name: "Users", icon: Users, label: "Personer" },
    { name: "Phone", icon: Phone, label: "Telefon" },
    { name: "Mail", icon: Mail, label: "E-post" },
    { name: "Home", icon: Home, label: "Hem" },
    { name: "Building", icon: Building, label: "Byggnad" },
    { name: "Search", icon: Search, label: "Sök" },
    { name: "Settings", icon: Settings, label: "Inställningar" },
  ],
  "Ekonomi & Business": [
    { name: "DollarSign", icon: DollarSign, label: "Pengar" },
    { name: "Target", icon: Target, label: "Mål" },
    { name: "Trophy", icon: Trophy, label: "Trofé" },
    { name: "Star", icon: Star, label: "Stjärna" },
    { name: "Archive", icon: Archive, label: "Arkiv" },
    { name: "Calendar", icon: Calendar, label: "Kalender" },
    { name: "Clock", icon: Clock, label: "Tid" },
    { name: "Flag", icon: Flag, label: "Flagga" },
  ],
  "Underhåll & Service": [
    { name: "Wrench", icon: Wrench, label: "Verktyg" },
    { name: "Key", icon: Key, label: "Nyckel" },
    { name: "Lock", icon: Lock, label: "Lås" },
    { name: "Shield", icon: Shield, label: "Säkerhet" },
    { name: "Bell", icon: Bell, label: "Klocka" },
    { name: "Lightbulb", icon: Lightbulb, label: "Idé" },
    { name: "Zap", icon: Zap, label: "Elektricitet" },
    { name: "Camera", icon: Camera, label: "Kamera" },
  ],
  "Dokument & Info": [
    { name: "FileText", icon: FileText, label: "Dokument" },
    { name: "Book", icon: Book, label: "Handbok" },
    { name: "Bookmark", icon: Bookmark, label: "Bokmärke" },
    { name: "MessageCircle", icon: MessageCircle, label: "Meddelande" },
    { name: "Globe", icon: Globe, label: "Värld" },
    { name: "Compass", icon: Compass, label: "Kompass" },
    { name: "MapPin", icon: MapPin, label: "Plats" },
  ],
  "Livsstil & Community": [
    { name: "Heart", icon: Heart, label: "Hjärta" },
    { name: "Gift", icon: Gift, label: "Present" },
    { name: "Coffee", icon: Coffee, label: "Kaffe" },
    { name: "Music", icon: Music, label: "Musik" },
    { name: "Palette", icon: Palette, label: "Palett" },
    { name: "Recycle", icon: Recycle, label: "Återvinning" },
    { name: "Car", icon: Car, label: "Bil" },
  ]
};

export const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  onIconSelect,
  className = "",
  compact = false,
  size = 'md'
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | "All">("All");

  // Filtrera ikoner baserat på sökterm
  const filterIcons = (icons: any[]) => {
    if (!searchTerm) return icons;
    return icons.filter(icon => 
      icon.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Hämta alla ikoner för sökning
  const allIcons = Object.values(iconCategories).flat();
  
  // Bestäm vilka ikoner som ska visas
  let filteredIcons: any[];
  if (searchTerm) {
    filteredIcons = filterIcons(allIcons);
  } else if (selectedCategory === "All") {
    filteredIcons = allIcons;
  } else {
    filteredIcons = filterIcons(iconCategories[selectedCategory]);
  }

  // Kategori-alternativ inklusive "Alla"
  const categoryOptions = ["All", ...Object.keys(iconCategories)];
  
  // Få kategorinamn på svenska
  const getCategoryDisplayName = (category: string) => {
    if (category === "All") return "Alla";
    return category;
  };

  // Räkna ikoner per kategori
  const getCategoryCount = (category: string) => {
    if (category === "All") return allIcons.length;
    return iconCategories[category]?.length || 0;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sökfält */}
      {!compact && (
        <div className="space-y-2">
          <Input
            placeholder="Sök ikoner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Kategorier - visa endast om ingen sökning */}
      {!searchTerm && !compact && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Kategorier:</div>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className={`text-xs transition-all duration-200 ${
                  selectedCategory === category 
                    ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                    : "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryDisplayName(category)}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  selectedCategory === category 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {getCategoryCount(category)}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Kategoriindikator när en specifik kategori är vald */}
      {!searchTerm && selectedCategory !== "All" && !compact && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Visar:</span>
          <Badge variant="secondary" className="text-xs">
            {getCategoryDisplayName(selectedCategory)} ({getCategoryCount(selectedCategory)} ikoner)
          </Badge>
        </div>
      )}

      {/* Sökresultat-indikator */}
      {searchTerm && !compact && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Search className="h-4 w-4" />
          <span>
            {filteredIcons.length > 0 
              ? `${filteredIcons.length} ikoner funna för "${searchTerm}"`
              : `Inga ikoner funna för "${searchTerm}"`
            }
          </span>
        </div>
      )}

      {/* Ikonrutnät */}
      <div className={`grid gap-2 ${
        compact 
          ? "grid-cols-6 max-h-32" 
          : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 max-h-64"
      } overflow-y-auto border rounded-lg p-3 bg-gray-50`}>
        {filteredIcons.map((iconItem) => {
          const IconComponent = iconItem.icon;
          const isSelected = selectedIcon === iconItem.name;
          
          return (
            <Button
              key={iconItem.name}
              variant={isSelected ? "default" : "outline"}
              size={size}
              className={`${
                compact ? "h-8 w-8 p-1" : "h-12 w-12 p-2"
              } flex flex-col items-center justify-center bg-white transition-all duration-200 ${
                isSelected 
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105" 
                  : "hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:scale-102"
              }`}
              onClick={() => onIconSelect(iconItem.name)}
              title={iconItem.label}
            >
              <IconComponent className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </Button>
          );
        })}
      </div>

      {/* Tom lista meddelande */}
      {filteredIcons.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          {searchTerm ? (
            <div>
              <p className="font-medium">Inga ikoner matchade "{searchTerm}"</p>
              <p className="text-sm mt-1">Prova att söka med andra ord eller bläddra genom kategorierna</p>
            </div>
          ) : (
            <p>Ingen ikon vald än</p>
          )}
        </div>
      )}

      {/* Vald ikon preview - inte i compact läge */}
      {selectedIcon && !compact && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
            {(() => {
              const selectedIconData = allIcons.find(icon => icon.name === selectedIcon);
              if (selectedIconData) {
                const IconComponent = selectedIconData.icon;
                return <IconComponent className="h-6 w-6 text-white" />;
              }
              return <BookOpen className="h-6 w-6 text-white" />;
            })()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900">
              Vald ikon: {allIcons.find(icon => icon.name === selectedIcon)?.label || selectedIcon}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Klicka på en annan ikon för att ändra
            </div>
          </div>
        </div>
      )}

      {/* Compact preview */}
      {selectedIcon && compact && (
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {(() => {
            const selectedIconData = allIcons.find(icon => icon.name === selectedIcon);
            if (selectedIconData) {
              const IconComponent = selectedIconData.icon;
              return (
                <>
                  <IconComponent className="h-4 w-4 text-blue-600" />
                  <span>{selectedIconData.label}</span>
                </>
              );
            }
            return (
              <>
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>{selectedIcon}</span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}; 