import React from 'react';

export type HandbookSectionCardProps = {
  title: string;
  description: string;
  className?: string;
};

const HandbookSectionCard: React.FC<HandbookSectionCardProps> = ({ title, description, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-md p-5 mb-4 ${className}`} style={{ borderRadius: '16px' }}>
    <h2 className="font-handbook text-lg md:text-xl mb-2">{title}</h2>
    <p className="text-gray-600 text-base">{description}</p>
  </div>
);

export default HandbookSectionCard; 