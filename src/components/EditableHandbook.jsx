import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import HandbookTemplate from './HandbookTemplate'

export default function EditableHandbook({ initialData, onSave }) {
  const [data, setData] = useState(initialData || {})
  const [previewMode, setPreviewMode] = useState(false)
  
  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  if (previewMode) {
    return (
      <div>
        <div className="mb-6 flex justify-end gap-4">
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            Tillbaka till redigering
          </Button>
          <Button onClick={() => onSave?.(data)}>
            Spara handbok
          </Button>
        </div>
        <HandbookTemplate handbookData={data} />
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Skapa din handbok</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setPreviewMode(true)}>
            Förhandsgranska
          </Button>
          <Button onClick={() => onSave?.(data)}>
            Spara handbok
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grundläggande Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Föreningens namn</label>
            <Input 
              value={data.associationName || ''} 
              onChange={(e) => updateField('associationName', e.target.value)}
              placeholder="t.ex. Brf Eksemplet"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Adress</label>
            <Input 
              value={data.address || ''} 
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Gatuadress, postnummer och ort"
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Organisationsnummer</label>
              <Input 
                value={data.orgNumber || ''} 
                onChange={(e) => updateField('orgNumber', e.target.value)}
                placeholder="XXXXXX-XXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Telefon</label>
              <Input 
                value={data.phone || ''} 
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="08-123 45 67"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">E-post</label>
            <Input 
              type="email"
              value={data.email || ''} 
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="info@forening.se"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Om föreningen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Beskrivning av föreningen</label>
            <Textarea 
              value={data.aboutAssociation || ''} 
              onChange={(e) => updateField('aboutAssociation', e.target.value)}
              placeholder="Beskriv er förening - när den bildades, karaktär, område, etc."
              rows={4}
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Bildad år</label>
              <Input 
                value={data.foundedYear || ''} 
                onChange={(e) => updateField('foundedYear', e.target.value)}
                placeholder="1985"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Antal lägenheter</label>
              <Input 
                value={data.totalApartments || ''} 
                onChange={(e) => updateField('totalApartments', e.target.value)}
                placeholder="45"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Totala andelstal</label>
              <Input 
                value={data.totalShares || ''} 
                onChange={(e) => updateField('totalShares', e.target.value)}
                placeholder="4500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fastighetens area</label>
              <Input 
                value={data.propertyArea || ''} 
                onChange={(e) => updateField('propertyArea', e.target.value)}
                placeholder="3200 kvm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Föreningens syfte</label>
            <Textarea 
              value={data.purpose || ''} 
              onChange={(e) => updateField('purpose', e.target.value)}
              placeholder="Föreningens syfte är att främja medlemmarnas ekonomiska intressen genom att tillhandahålla bostäder och lokaler."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Styrelse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-800 mb-0">
              Du kan ange styrelsens medlemmar manuellt här eller importera från en fil senare.
            </p>
          </div>
          
          {/* Exempel på ett styrelsemedlem-fält, kan utökas till en dynamisk lista */}
          <div className="border p-4 rounded-lg">
            <h4 className="font-medium mb-3">Ordförande</h4>
            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Namn</label>
                <Input 
                  value={data.chairpersonName || ''} 
                  onChange={(e) => updateField('chairpersonName', e.target.value)}
                  placeholder="Förnamn Efternamn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kontakt</label>
                <Input 
                  value={data.chairpersonContact || ''} 
                  onChange={(e) => updateField('chairpersonContact', e.target.value)}
                  placeholder="E-post eller telefon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mandatperiod</label>
                <Input 
                  value={data.chairpersonTerm || ''} 
                  onChange={(e) => updateField('chairpersonTerm', e.target.value)}
                  placeholder="2024-2025"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ekonomi och Avgifter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Månadsavgift per kvm (kr)</label>
              <Input 
                value={data.monthlyFeePerSqm || ''} 
                onChange={(e) => updateField('monthlyFeePerSqm', e.target.value)}
                placeholder="45"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Bankgiro</label>
              <Input 
                value={data.bankgiro || ''} 
                onChange={(e) => updateField('bankgiro', e.target.value)}
                placeholder="123-4567"
              />
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Förfallodag</label>
              <Input 
                value={data.dueDate || ''} 
                onChange={(e) => updateField('dueDate', e.target.value)}
                placeholder="Sista vardagen varje månad"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Fakturering</label>
              <Input 
                value={data.invoicing || ''} 
                onChange={(e) => updateField('invoicing', e.target.value)}
                placeholder="Månadsvis via e-post"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Budgetprocess</label>
            <Textarea 
              value={data.budgetProcess || ''} 
              onChange={(e) => updateField('budgetProcess', e.target.value)}
              placeholder="Budget fastställs på årsstämman i mars. Preliminär budget presenteras i februari för medlemmarna att granska."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kontakter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Styrelsens e-post</label>
              <Input 
                value={data.boardEmail || ''} 
                onChange={(e) => updateField('boardEmail', e.target.value)}
                placeholder="styrelsen@forening.se"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Akut telefon (24/7)</label>
              <Input 
                value={data.emergencyPhone || ''} 
                onChange={(e) => updateField('emergencyPhone', e.target.value)}
                placeholder="08-555 12 34"
              />
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Förvaltare</label>
              <Input 
                value={data.propertyManager || ''} 
                onChange={(e) => updateField('propertyManager', e.target.value)}
                placeholder="Namn på förvaltningsbolag"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Förvaltarens kontakt</label>
              <Input 
                value={data.managerContact || ''} 
                onChange={(e) => updateField('managerContact', e.target.value)}
                placeholder="Telefon och e-post"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Felanmälan e-post</label>
              <Input 
                value={data.maintenanceEmail || ''} 
                onChange={(e) => updateField('maintenanceEmail', e.target.value)}
                placeholder="felanmalan@forening.se"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Felanmälan telefon</label>
              <Input 
                value={data.maintenancePhone || ''} 
                onChange={(e) => updateField('maintenancePhone', e.target.value)}
                placeholder="08-123 45 67"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-8">
        <Button variant="outline" onClick={() => setPreviewMode(true)} size="lg">
          Förhandsgranska
        </Button>
        <Button onClick={() => onSave?.(data)} size="lg">
          Spara handbok
        </Button>
      </div>
    </div>
  )
} 