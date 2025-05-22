"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { startDiagnosticPolling, getDiagnosticEvents, clearDiagnosticEvents, exportDiagnosticData, snapshotCookies, snapshotSession, getDiagnosticLogs, clearDiagnosticLogs, logStorageAccess } from '@/lib/auth-diagnostics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/lib/supabase";

// Filter-funktioner för diagnostikevents
const filterEvents = (events: any[], type?: string) => {
  if (!type || type === 'all') return events;
  return events.filter(event => event.type === type);
};

export default function AuthDiagnosticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [events, setEvents] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { session } = useAuth();

  // Starta diagnostik och uppdatera events
  useEffect(() => {
    const cleanup = startDiagnosticPolling();
    
    // Manuellt ta snapshot av sessionen när komponenten monteras
    if (session) {
      snapshotSession(session);
    }
    
    // Manuellt ta snapshot av cookies
    snapshotCookies();
    
    // Uppdatera events regelbundet
    const interval = setInterval(() => {
      if (autoRefresh) {
        setEvents(getDiagnosticEvents());
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, [session, autoRefresh]);

  // Formattera tid
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
  };

  // Exportera diagnostikdata
  const handleExport = () => {
    const data = exportDiagnosticData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-diagnostics-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Om panelen är stängd, visa bara en enkel knapp för att öppna den
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsOpen(true)}
          className="bg-amber-100 hover:bg-amber-200 text-amber-900"
        >
          Visa Auth Diagnostik
        </Button>
      </div>
    );
  }

  // Filtrera events baserat på aktiv tab
  const filteredEvents = filterEvents(events, activeTab === 'all' ? undefined : activeTab);

  return (
    <div className="fixed bottom-0 right-0 w-full sm:w-[600px] max-h-[70vh] z-50 p-2">
      <Card className="border-2 border-amber-400 shadow-lg">
        <CardHeader className="pb-2 pt-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Auth Diagnostik</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Minimera
            </Button>
          </div>
          <CardDescription>
            Spårar autentisering, sessioner och cookies för att diagnostisera problem
          </CardDescription>
        </CardHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pb-2">
            <TabsList className="w-full">
              <TabsTrigger value="all">Alla ({events.length})</TabsTrigger>
              <TabsTrigger value="auth">Auth ({filterEvents(events, 'auth').length})</TabsTrigger>
              <TabsTrigger value="session">Session ({filterEvents(events, 'session').length})</TabsTrigger>
              <TabsTrigger value="cookie">Cookies ({filterEvents(events, 'cookie').length})</TabsTrigger>
              <TabsTrigger value="network">Nätverk ({filterEvents(events, 'network').length})</TabsTrigger>
              <TabsTrigger value="error">Fel ({filterEvents(events, 'error').length})</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-0 pb-2 px-4">
            <ScrollArea className="h-[300px] overflow-y-auto border rounded-md bg-muted/20 p-2">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Inga händelser att visa
                </div>
              ) : (
                filteredEvents.map((event, index) => (
                  <div key={index} className="mb-2 p-2 border-b text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant={event.type === 'error' ? "destructive" : "outline"} className="mb-1">
                        {event.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTime(event.timestamp)}</span>
                    </div>
                    <div className="font-medium">{event.message}</div>
                    {event.data && (
                      <pre className="mt-1 text-xs overflow-x-auto p-1 bg-muted/30 rounded">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Tabs>

        <CardFooter className="pt-2 flex justify-between">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={() => {
              setEvents(getDiagnosticEvents());
              if (session) snapshotSession(session);
              snapshotCookies();
            }}>
              Uppdatera
            </Button>
            <Button variant="outline" size="sm" onClick={() => clearDiagnosticEvents()}>
              Rensa
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              Exportera
            </Button>
            <Button variant="outline" size="sm" onClick={() => snapshotCookies()}>
              Kontrollera Cookies
            </Button>
            <Button variant="outline" size="sm" onClick={() => logStorageAccess()}>
              Kontrollera Lagring
            </Button>
          </div>
          <div className="flex items-center">
            <label className="mr-2 text-sm">Auto-uppdatera:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              className="mr-2"
            />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 