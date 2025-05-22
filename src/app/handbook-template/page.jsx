"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HandbookTemplate from '@/components/HandbookTemplate';
import EditableHandbook from '@/components/EditableHandbook';

// Exempel på data som används för att visa handboksmallen
const exampleData = {
  associationName: "Brf Eksemplet",
  address: "Exempelgatan 123, 123 45 Stockholm",
  orgNumber: "769999-1234",
  phone: "08-123 45 67",
  email: "info@brfeksemplet.se",
  foundedYear: "1985",
  totalApartments: "45",
  totalShares: "4500",
  propertyArea: "3200 kvm",
  aboutAssociation: "Vår förening bildades 1985 och består av 45 lägenheter fördelade på två huskroppar. Fastigheten är belägen i ett lugnt område med närhet till både natur och stadskärna. Vi har en aktiv styrelse som arbetar för att göra vår förening till en trivsam plats att bo på.",
  purpose: "Föreningens syfte är att främja medlemmarnas ekonomiska intressen genom att tillhandahålla bostäder och lokaler i föreningens hus.",
  boardMembers: [
    { role: "Ordförande", name: "Anna Andersson", contact: "ordforande@brfeksemplet.se", term: "2024-2025" },
    { role: "Vice ordförande", name: "Erik Eriksson", contact: "vice@brfeksemplet.se", term: "2024-2025" },
    { role: "Kassör", name: "Maria Nilsson", contact: "kassor@brfeksemplet.se", term: "2024-2025" },
    { role: "Sekreterare", name: "Johan Johansson", contact: "sekreterare@brfeksemplet.se", term: "2024-2025" },
    { role: "Ledamot", name: "Sofia Svensson", contact: "ledamot@brfeksemplet.se", term: "2024-2025" },
    { role: "Suppleant", name: "Peter Pettersson", contact: "suppleant@brfeksemplet.se", term: "2024-2025" }
  ],
  boardMeetingTime: "Första tisdagen varje månad, 19:00",
  boardMeetingPlace: "Föreningens lokal, Exempelgatan 123",
  membersWelcome: "Ja, efter föranmälan senast en vecka i förväg",
  propertyManager: "Fastighetsservice AB",
  managerContact: "08-987 65 43, forvaltare@fastighetsservice.se",
  faultReporting: "Via app eller telefon 08-987 65 43",
  monthlyFeePerSqm: "45",
  dueDate: "Sista vardagen varje månad",
  invoicing: "Månadsvis via e-post eller autogiro",
  lateInterest: "Enligt lag + 8%",
  bankgiro: "123-4567",
  budgetProcess: "Budget fastställs på årsstämman i mars. Preliminär budget presenteras i februari för medlemmarna att granska.",
  emergencyPhone: "08-555 12 34",
  maintenanceEmail: "felanmalan@brfeksemplet.se",
  maintenancePhone: "08-987 65 43",
  maintenanceApp: "Fastighetsservice-appen",
  boardEmail: "styrelsen@brfeksemplet.se",
  managerPhone: "08-987 65 43",
  managerEmail: "forvaltare@fastighetsservice.se"
};

export default function HandbookTemplatePage() {
  const [handbookData, setHandbookData] = useState(exampleData);
  const [activeTab, setActiveTab] = useState("preview");

  const handleSave = (data) => {
    setHandbookData(data);
    setActiveTab("preview");
    alert("Handbok sparad! (I en riktig implementation skulle detta sparas till databasen)");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">Handbok.org Mall</h1>
          <p className="text-xl text-gray-600 text-center mb-8">
            Skapa professionella digitala handböcker för bostadsrättsföreningar
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="preview">Förhandsgranskning</TabsTrigger>
              <TabsTrigger value="edit">Redigera handbok</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="border rounded-lg bg-white p-6">
              <HandbookTemplate handbookData={handbookData} />
            </TabsContent>
            
            <TabsContent value="edit">
              <EditableHandbook 
                initialData={handbookData} 
                onSave={handleSave} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 