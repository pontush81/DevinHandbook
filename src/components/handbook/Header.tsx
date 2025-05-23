import React from 'react';

interface HeaderProps {
  onToggleSidebar: () => void;
  handbookTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  handbookTitle = "Digital Handbok" 
}) => {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg">
              🏠
            </div>
            <span className="text-xl font-bold text-gray-900">{handbookTitle}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
              onClick={onToggleSidebar}
            >
              ☰ Meny
            </button>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              📞 Kontakt
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}; 