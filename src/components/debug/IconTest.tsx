"use client";

import React from 'react';
import { Home, Phone, Car, Users, Settings, FileText } from 'lucide-react';

export function IconTest() {
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Icon Test</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-blue-600" />
          <span>Home</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-green-600" />
          <span>Phone</span>
        </div>
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-red-600" />
          <span>Car</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          <span>Users</span>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <span>Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          <span>FileText</span>
        </div>
      </div>
      
      <div className="mt-4 p-2 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          Om du ser ikoner ovan fungerar Lucide React korrekt.
          Om du bara ser text utan ikoner finns det ett problem med icon-rendering.
        </p>
      </div>
    </div>
  );
} 