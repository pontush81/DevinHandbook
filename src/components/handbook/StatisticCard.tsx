import React from 'react';
import { StatisticCard as StatisticCardType } from '@/lib/templates/complete-brf-handbook';

interface StatisticCardProps {
  card: StatisticCardType;
}

export const StatisticCard: React.FC<StatisticCardProps> = ({ card }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{card.icon}</span>
            <h3 className="font-semibold text-gray-900">{card.title}</h3>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-1">{card.value}</div>
          <p className="text-sm text-gray-600">{card.description}</p>
        </div>
        
        {card.trend && (
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${card.trend.isPositive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
            }
          `}>
            <span className={card.trend.isPositive ? '↗️' : '↘️'}>
              {card.trend.isPositive ? '↗️' : '↘️'}
            </span>
            {Math.abs(card.trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
}; 