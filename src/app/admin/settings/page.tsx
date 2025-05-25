"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Database, Mail } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inställningar</h1>
          <p className="text-gray-500 mt-1">Systemkonfiguration och inställningar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Säkerhet</span>
            </CardTitle>
            <CardDescription>
              Hantera säkerhetsinställningar och behörigheter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Kommer i framtida uppdatering</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Databas</span>
            </CardTitle>
            <CardDescription>
              Databasunderhåll och backup-inställningar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Kommer i framtida uppdatering</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>E-post</span>
            </CardTitle>
            <CardDescription>
              E-postinställningar och notifikationer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Kommer i framtida uppdatering</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Allmänt</span>
            </CardTitle>
            <CardDescription>
              Allmänna systeminställningar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>Kommer i framtida uppdatering</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Systeminställningar</CardTitle>
          <CardDescription>
            Avancerade inställningar kommer att implementeras i senare faser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Inställningar kommer snart</p>
            <p>Denna funktionalitet kommer att implementeras med:</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>• Systemkonfiguration</li>
              <li>• Säkerhetsinställningar</li>
              <li>• E-postnotifikationer</li>
              <li>• Backup och underhåll</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 