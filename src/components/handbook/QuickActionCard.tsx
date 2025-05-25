import React from 'react';
import { QuickAction } from '@/lib/templates/complete-brf-handbook';

interface QuickActionCardProps {
  action: QuickAction;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({ action }) => {
  const handleActionClick = () => {
    switch (action.actionType) {
      case 'phone':
        window.location.href = `tel:${action.actionValue}`;
        break;
      case 'email':
        window.location.href = `mailto:${action.actionValue}`;
        break;
      case 'link':
        window.open(action.actionValue, '_blank');
        break;
      case 'form':
        // Future implementation for forms
        console.log('Form action:', action.actionValue);
        break;
    }
  };

  return (
    <button
      onClick={handleActionClick}
      className={`
        w-full p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md
        ${action.isPrimary 
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
          : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${action.isPrimary ? 'opacity-90' : ''}`}>
          {action.icon}
        </span>
        <div className="flex-1">
          <h3 className={`font-semibold mb-1 ${action.isPrimary ? 'text-white' : 'text-gray-900'}`}>
            {action.title}
          </h3>
          <p className={`text-sm ${action.isPrimary ? 'text-blue-100' : 'text-gray-600'}`}>
            {action.description}
          </p>
        </div>
        <span className={`text-lg ${action.isPrimary ? 'text-blue-200' : 'text-gray-400'}`}>
          →
        </span>
      </div>
    </button>
  );
}; 