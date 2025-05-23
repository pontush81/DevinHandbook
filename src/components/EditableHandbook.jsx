import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import HandbookTemplate from './HandbookTemplate'
import { getHandbookSectionIcon } from '@/lib/handbook-icons-mapping'

export default function EditableHandbook({ initialData, onSave }) {
  const [data, setData] = useState(initialData || {})
  const [previewMode, setPreviewMode] = useState(false)
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  
  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateNestedField = (parentField, key, value) => {
    setData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [key]: value
      }
    }))
  }

  const updateArrayField = (parentField, index, key, value) => {
    setData(prev => ({
      ...prev,
      [parentField]: prev[parentField]?.map((item, i) => 
        i === index ? { ...item, [key]: value } : item
      ) || []
    }))
  }

  const addArrayItem = (parentField, newItem) => {
    setData(prev => ({
      ...prev,
      [parentField]: [...(prev[parentField] || []), newItem]
    }))
  }

  const removeArrayItem = (parentField, index) => {
    setData(prev => ({
      ...prev,
      [parentField]: prev[parentField]?.filter((_, i) => i !== index) || []
    }))
  }

  const addCustomSection = () => {
    if (!newSectionTitle.trim()) return
    
    const newSection = {
      title: newSectionTitle,
      content: `# ${newSectionTitle}\n\nBeskrivning av ${newSectionTitle.toLowerCase()}.`
    }
    
    addArrayItem('customSections', newSection)
    setNewSectionTitle('')
    setShowAddSectionModal(false)
  }

  const renderSectionIcon = (title) => {
    const emoji = getHandbookSectionIcon(title, 'emoji')
    return (
      <span className="text-lg mr-2" role="img" aria-label={title}>
        {emoji}
      </span>
    )
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
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

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Grundläggande</TabsTrigger>
          <TabsTrigger value="board">Styrelse</TabsTrigger>
          <TabsTrigger value="economics">Ekonomi</TabsTrigger>
          <TabsTrigger value="rules">Regler</TabsTrigger>
          <TabsTrigger value="practical">Praktiskt</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {renderSectionIcon("Välkommen")}
                Grundläggande Information
              </CardTitle>
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
              
              <div className="grid md:grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium mb-2">Webbplats</label>
                  <Input 
                    value={data.website || ''} 
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="www.forening.se"
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
        </TabsContent>

        <TabsContent value="board" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {renderSectionIcon("Kontaktuppgifter")}
                Styrelse och förvaltning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  Ange styrelsens mötesinfo och förvaltarens kontaktuppgifter
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Styrelsemötestid</label>
                  <Input 
                    value={data.boardMeetingTime || ''} 
                    onChange={(e) => updateField('boardMeetingTime', e.target.value)}
                    placeholder="Första tisdagen varje månad, 19:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Styrelsemötesplats</label>
                  <Input 
                    value={data.boardMeetingPlace || ''} 
                    onChange={(e) => updateField('boardMeetingPlace', e.target.value)}
                    placeholder="Föreningens lokal eller digitalt"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Medlemmar välkomna?</label>
                <Input 
                  value={data.membersWelcome || ''} 
                  onChange={(e) => updateField('membersWelcome', e.target.value)}
                  placeholder="Ja, efter föranmälan senast en vecka i förväg"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Förvaltare</label>
                  <Input 
                    value={data.propertyManager || ''} 
                    onChange={(e) => updateField('propertyManager', e.target.value)}
                    placeholder="Fastighetsservice AB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Förvaltarens kontakt</label>
                  <Input 
                    value={data.managerContact || ''} 
                    onChange={(e) => updateField('managerContact', e.target.value)}
                    placeholder="08-987 65 43, forvaltare@fastighetsservice.se"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Förvaltarens telefon</label>
                  <Input 
                    value={data.managerPhone || ''} 
                    onChange={(e) => updateField('managerPhone', e.target.value)}
                    placeholder="08-987 65 43"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Förvaltarens e-post</label>
                  <Input 
                    value={data.managerEmail || ''} 
                    onChange={(e) => updateField('managerEmail', e.target.value)}
                    placeholder="forvaltare@fastighetsservice.se"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Felanmälan</label>
                <Input 
                  value={data.faultReporting || ''} 
                  onChange={(e) => updateField('faultReporting', e.target.value)}
                  placeholder="Via app eller telefon 08-987 65 43"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {renderSectionIcon("Ekonomi")}
                Ekonomi och avgifter
              </CardTitle>
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

              <div>
                <label className="block text-sm font-medium mb-2">Månadsavgiften inkluderar</label>
                <Textarea 
                  value={data.monthlyFeeIncludes || ''} 
                  onChange={(e) => updateField('monthlyFeeIncludes', e.target.value)}
                  placeholder="Värme, varmvatten, kall- och varmvatten, sophämtning, fastighetsskatt, gemensam el, grundförsäkring, snöröjning och trappstädning"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Medlem betalar själv</label>
                <Textarea 
                  value={data.memberPaysOwn || ''} 
                  onChange={(e) => updateField('memberPaysOwn', e.target.value)}
                  placeholder="Hushållsel, bredband/telefon, hemförsäkring utöver grundskydd, kabel-TV premium"
                  rows={3}
                />
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
                    placeholder="Månadsvis via e-post eller autogiro"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Dröjsmålsränta</label>
                  <Input 
                    value={data.lateInterest || ''} 
                    onChange={(e) => updateField('lateInterest', e.target.value)}
                    placeholder="Enligt lag + 8%"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Styrelsens e-post</label>
                  <Input 
                    value={data.boardEmail || ''} 
                    onChange={(e) => updateField('boardEmail', e.target.value)}
                    placeholder="styrelsen@brfeksemplet.se"
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

              <div>
                <label className="block text-sm font-medium mb-2">Särskilda avgifter</label>
                <Textarea 
                  value={data.specialFees || ''} 
                  onChange={(e) => updateField('specialFees', e.target.value)}
                  placeholder="Särskilda avgifter kan tas ut vid större renoveringar eller oförutsedda kostnader. Beslut fattas på föreningsstämma."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Vid betalningssvårigheter</label>
                <Textarea 
                  value={data.paymentDifficulties || ''} 
                  onChange={(e) => updateField('paymentDifficulties', e.target.value)}
                  placeholder="Kontakta styrelsen omgående vid betalningssvårigheter. Vi erbjuder alltid dialog innan inkasso."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {renderSectionIcon("Trivselregler")}
                Regler och ordningsföreskrifter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tysta timmar</label>
                <Input 
                  value={data.quietHours || ''} 
                  onChange={(e) => updateField('quietHours', e.target.value)}
                  placeholder="Vardagar: 22:00-07:00, Helger: 22:00-10:00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Störningsregler</label>
                <Textarea 
                  value={data.disturbanceRules || ''} 
                  onChange={(e) => updateField('disturbanceRules', e.target.value)}
                  placeholder="Undvik högljudda aktiviteter under tysta timmar. Var särskilt försiktig med musik, TV och barnlek."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Husdjursregler</label>
                <Textarea 
                  value={data.petRules || ''} 
                  onChange={(e) => updateField('petRules', e.target.value)}
                  placeholder="Husdjur är tillåtna efter anmälan till styrelsen. Hundar ska hållas kopplade i trapphus och på gården. Ägarens ansvar för städning efter husdjur."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rökningsregler</label>
                <Textarea 
                  value={data.smokingRules || ''} 
                  onChange={(e) => updateField('smokingRules', e.target.value)}
                  placeholder="Rökning är förbjuden i alla gemensamma utrymmen inklusive trapphus, källare och på balkonger som vetter mot gården."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Parkeringsregler</label>
                <Textarea 
                  value={data.parkingRules || ''} 
                  onChange={(e) => updateField('parkingRules', e.target.value)}
                  placeholder="Parkeringsplatserna är numrerade och tillhör specifika lägenheter. Gästparkering finns i begränsad omfattning - max 24h."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cykelförvaring</label>
                <Textarea 
                  value={data.bicycleStorage || ''} 
                  onChange={(e) => updateField('bicycleStorage', e.target.value)}
                  placeholder="Cyklar förvaras i cykelkällaren. Märk din cykel med lägenhetsnummer. Övergivna cyklar tas bort efter 3 månaders varning."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sophantering</label>
                <Textarea 
                  value={data.wasteManagement || ''} 
                  onChange={(e) => updateField('wasteManagement', e.target.value)}
                  placeholder="Källsortering är obligatoriskt. Följ instruktionerna vid sopsorteringen. Grovsopor lämnas efter överenskommelse med förvaltaren."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tvättstu(ge)regler</label>
                <Textarea 
                  value={data.laundryRules || ''} 
                  onChange={(e) => updateField('laundryRules', e.target.value)}
                  placeholder="Bokning sker via app eller bokningslista. Max 4h per bokning. Städa alltid efter dig och töm luddfilter."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {renderSectionIcon('Praktisk information')}
                Praktisk information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vardagspraktiska saker</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Post och paket</label>
                    <Textarea 
                      placeholder="Information om post- och pakethantering"
                      value={data.praktiskInformation?.postOchPaket || ''}
                      onChange={(e) => updateNestedField('praktiskInformation', 'postOchPaket', e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Flyttregler</label>
                    <Textarea 
                      placeholder="Regler för in- och utflyttning"
                      value={data.praktiskInformation?.flyttregler || ''}
                      onChange={(e) => updateNestedField('praktiskInformation', 'flyttregler', e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Gäster och övernattning</label>
                    <Textarea 
                      placeholder="Regler för gäster"
                      value={data.praktiskInformation?.gaster || ''}
                      onChange={(e) => updateNestedField('praktiskInformation', 'gaster', e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Tillgänglighet</label>
                    <Textarea 
                      placeholder="Information om tillgänglighetsanpassningar"
                      value={data.praktiskInformation?.tillganglighet || ''}
                      onChange={(e) => updateNestedField('praktiskInformation', 'tillganglighet', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Egna sektioner</h3>
                  <Button
                    onClick={() => setShowAddSectionModal(true)}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    + Lägg till sektion
                  </Button>
                </div>
                
                {data.customSections?.map((section, index) => (
                  <Card key={index} className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <Input
                          value={section.title}
                          onChange={(e) => updateArrayField('customSections', index, 'title', e.target.value)}
                          className="text-lg font-semibold border-none p-0 focus:ring-0"
                          placeholder="Sektionens titel"
                        />
                        <Button
                          onClick={() => removeArrayItem('customSections', index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                        >
                          🗑️
                        </Button>
                      </div>
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateArrayField('customSections', index, 'content', e.target.value)}
                        placeholder="Innehåll för denna sektion (markdown-formatering tillåts)"
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}
                
                {(!data.customSections || data.customSections.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-2">Inga egna sektioner än</p>
                    <p className="text-sm text-gray-400">Klicka på "Lägg till sektion" för att skapa en egen sektion</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal for adding custom section */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Lägg till ny sektion</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sektionsnamn
                </label>
                <Input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="T.ex. Husdjur, Wifi-information, etc."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSection()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddSectionModal(false);
                  setNewSectionTitle('');
                }}
              >
                Avbryt
              </Button>
              <Button
                onClick={addCustomSection}
                disabled={!newSectionTitle.trim()}
              >
                Lägg till
              </Button>
            </div>
          </div>
        </div>
      )}

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