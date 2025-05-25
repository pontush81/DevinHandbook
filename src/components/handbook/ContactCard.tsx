import React from 'react';
import { ContactPerson } from '@/lib/templates/complete-brf-handbook';

interface ContactCardProps {
  contact: ContactPerson;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact }) => {
  const handlePhoneClick = () => {
    window.location.href = `tel:${contact.phone}`;
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:${contact.email}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-lg">
            {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{contact.name}</h3>
          <p className="text-blue-600 font-medium">{contact.role}</p>
          <p className="text-gray-600 text-sm">{contact.apartment}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={handlePhoneClick}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors w-full text-left"
        >
          <span className="text-lg">📞</span>
          <span className="text-sm">{contact.phone}</span>
        </button>
        <button
          onClick={handleEmailClick}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors w-full text-left"
        >
          <span className="text-lg">📧</span>
          <span className="text-sm break-all">{contact.email}</span>
        </button>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-2">Ansvarsområden</h4>
        <div className="space-y-1">
          {contact.responsibilities.map((responsibility, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              <span className="text-sm text-gray-600">{responsibility}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 