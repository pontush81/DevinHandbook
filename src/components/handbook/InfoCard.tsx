import React from 'react';
import { InfoCard as InfoCardType, contentTypes } from '@/lib/templates/handbook-template';

interface InfoCardProps {
  card: InfoCardType;
}

export const InfoCard: React.FC<InfoCardProps> = ({ card }) => {
  const styles = contentTypes[card.type];
  
  return (
    <div className={`
      ${styles.bg} ${styles.border} border rounded-xl p-4 
      hover:shadow-sm transition-shadow duration-200
    `}>
      <div className="flex items-start gap-3">
        <span className={`text-xl ${styles.icon}`}>{card.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{card.content}</p>
        </div>
      </div>
    </div>
  );
}; 