import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { PrinterIcon, DownloadIcon } from "lucide-react"
import { useRef } from "react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { getHandbookSectionIcon } from '@/lib/handbook-icons-mapping'

export default function HandbookTemplate({ handbookData }) {
  const currentDate = new Date().toLocaleDateString('sv-SE')
  const handbookRef = useRef(null)
  
  const exportToPDF = async () => {
    if (!handbookRef.current) return
    
    const handbookElement = handbookRef.current
    const actionsElement = handbookElement.querySelector('.no-print')
    
    // Temporarily hide the action buttons for the screenshot
    if (actionsElement) actionsElement.style.display = 'none'
    
    try {
      // Show loading state
      const originalText = document.activeElement.innerText
      if (document.activeElement.classList.contains('pdf-export-btn')) {
        document.activeElement.innerText = 'Skapar PDF...'
        document.activeElement.disabled = true
      }
      
      // Scale factor to improve quality
      const scale = 2
      const options = {
        scale: scale,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
      }
      
      // Create canvas from each section
      const contentSections = handbookElement.querySelectorAll('section, .cover-page, .toc-page, footer')
      const canvases = []
      
      for (const section of contentSections) {
        const canvas = await html2canvas(section, options)
        canvases.push(canvas)
      }
      
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      // Add each canvas as a new page
      canvases.forEach((canvas, index) => {
        // Calculate dimensions to fit on A4
        const imgWidth = 210 // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        // Add new page for all pages except the first one
        if (index > 0) pdf.addPage()
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9)
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
      })
      
      // Save the PDF
      pdf.save(`${handbookData.associationName || 'Bostadsrättsförening'}_Handbok_${currentDate}.pdf`)
      
      // Reset button text
      if (document.activeElement.classList.contains('pdf-export-btn')) {
        document.activeElement.innerText = originalText
        document.activeElement.disabled = false
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Ett fel uppstod vid skapande av PDF. Försök igen senare.')
    } finally {
      // Show the action buttons again
      if (actionsElement) actionsElement.style.display = 'flex'
    }
  }

  const renderSectionIcon = (title) => {
    const emoji = getHandbookSectionIcon(title, 'emoji')
    return (
      <span className="text-2xl mr-3" role="img" aria-label={title}>
        {emoji}
      </span>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto bg-white" ref={handbookRef}>
      {/* Print/Download Actions */}
      <div className="no-print sticky top-4 z-10 flex justify-end gap-2 mb-6 px-6">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <PrinterIcon className="h-4 w-4 mr-2" />
          Skriv ut
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToPDF}
          className="pdf-export-btn"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Ladda ner PDF
        </Button>
      </div>

      {/* Cover Page */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-12 text-center mb-12 print:bg-white print:border-2 print:border-gray-300 cover-page">
        <div className="max-w-2xl mx-auto">
          <Badge className="mb-6 bg-blue-100 text-blue-800">
            Digital Handbok
          </Badge>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {handbookData.associationName || "Bostadsrättsföreningen"}
          </h1>
          
          <div className="text-lg text-gray-600 space-y-2 mb-8">
            <p>{handbookData.address || "Adress saknas"}</p>
            <p>Org.nr: {handbookData.orgNumber || "Saknas"}</p>
            <p>Telefon: {handbookData.phone || "Saknas"}</p>
            <p>E-post: {handbookData.email || "Saknas"}</p>
            {handbookData.website && <p>Webb: {handbookData.website}</p>}
          </div>
          
          <div className="text-sm text-gray-500">
            Senast uppdaterad: {currentDate}
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <Card className="mb-12 print:shadow-none print:border toc-page">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            {renderSectionIcon("Innehållsförteckning")}
            Innehållsförteckning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            <a href="#valkommen" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Välkommen")}
                  1. Välkommen till föreningen
                </span>
              </div>
            </a>
            <a href="#kontakt" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Kontaktuppgifter")}
                  2. Kontaktuppgifter och styrelse
                </span>
              </div>
            </a>
            <a href="#ekonomi" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Ekonomi")}
                  3. Ekonomi och avgifter
                </span>
              </div>
            </a>
            <a href="#regler" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Trivselregler")}
                  4. Husets regler och ordningsregler
                </span>
              </div>
            </a>
            <a href="#sakerhet" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Säkerhet")}
                  5. Säkerhet och trygghet
                </span>
              </div>
            </a>
            <a href="#teknisk" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Teknisk")}
                  6. Teknisk information
                </span>
              </div>
            </a>
            <a href="#renovering" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Renovering")}
                  7. Ombyggnader och renoveringar
                </span>
              </div>
            </a>
            <a href="#forsakringar" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Försäkring")}
                  8. Försäkringar
                </span>
              </div>
            </a>
            <a href="#gemensamt" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Gemensamma utrymmen")}
                  9. Gemensamma faciliteter
                </span>
              </div>
            </a>
            <a href="#praktiskt" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center">
                  {renderSectionIcon("Praktisk information")}
                  10. Praktisk vardagsinformation
                </span>
              </div>
            </a>
          </nav>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <div className="px-6 space-y-12">
        
        {/* Section 1: Välkommen */}
        <section id="valkommen" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Välkommen")}
            1. Välkommen till föreningen
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Om föreningen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  {handbookData.aboutAssociation || "Beskriv er förening här - när den bildades, antal lägenheter, karaktär på området, etc."}
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Snabbfakta</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Bildad år: {handbookData.foundedYear || "Ej angivet"}</li>
                    <li>• Antal lägenheter: {handbookData.totalApartments || "Ej angivet"}</li>
                    <li>• Totala andelstal: {handbookData.totalShares || "Ej angivet"}</li>
                    <li>• Fastighetens area: {handbookData.propertyArea || "Ej angivet"}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Syfte och Mål
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {handbookData.purpose || "Föreningens syfte är att främja medlemmarnas ekonomiska intressen genom att tillhandahålla bostäder och lokaler."}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Kontaktuppgifter och styrelse */}
        <section id="kontakt" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Kontaktuppgifter")}
            2. Kontaktuppgifter och styrelse
          </h2>
          
          <Card className="mb-8 print:shadow-none print:border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                Nuvarande Styrelse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {(handbookData.boardMembers || defaultBoardMembers).map((member, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">{member.role}</h4>
                    <p className="text-gray-700">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.contact}</p>
                    <p className="text-xs text-gray-500">Mandatperiod: {member.term}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle>Styrelsemöten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p><strong>Tid:</strong> {handbookData.boardMeetingTime || "Första tisdagen varje månad, 19:00"}</p>
                <p><strong>Plats:</strong> {handbookData.boardMeetingPlace || "Föreningens lokal eller digitalt"}</p>
                <p><strong>Medlemmar välkomna:</strong> {handbookData.membersWelcome || "Ja, efter föranmälan"}</p>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle>Förvaltning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p><strong>Förvaltare:</strong> {handbookData.propertyManager || "Namn på förvaltningsbolag"}</p>
                <p><strong>Kontakt:</strong> {handbookData.managerContact || "Telefon och e-post"}</p>
                <p><strong>Felanmälan:</strong> {handbookData.faultReporting || "Via app/telefon"}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3: Ekonomi och avgifter */}
        <section id="ekonomi" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Ekonomi")}
            3. Ekonomi och avgifter
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Månadsavgifter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Aktuell avgift per kvm:</strong> {handbookData.monthlyFeePerSqm || "XX"} kr/kvm
                  </p>
                </div>
                
                {handbookData.monthlyFeeIncludes && (
                  <div className="space-y-2 text-sm">
                    <p><strong>Inkluderar:</strong></p>
                    <p className="text-gray-700">{handbookData.monthlyFeeIncludes}</p>
                  </div>
                )}
                
                {handbookData.memberPaysOwn && (
                  <div className="space-y-2 text-sm mt-4">
                    <p><strong>Medlem betalar själv:</strong></p>
                    <p className="text-gray-700">{handbookData.memberPaysOwn}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Betalning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p><strong>Förfallodag:</strong> {handbookData.dueDate || "Sista vardagen varje månad"}</p>
                <p><strong>Fakturering:</strong> {handbookData.invoicing || "Månadsvis via e-post"}</p>
                <p><strong>Dröjsmålsränta:</strong> {handbookData.lateInterest || "Enligt lag + 8%"}</p>
                <p><strong>Bankgiro:</strong> {handbookData.bankgiro || "XXXX-XXXX"}</p>
                
                {handbookData.paymentDifficulties && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Betalningssvårigheter:</strong> {handbookData.paymentDifficulties}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="print:shadow-none print:border mb-8">
            <CardHeader>
              <CardTitle>Budgetprocess</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {handbookData.budgetProcess || "Budget fastställs på årsstämman i mars. Preliminär budget presenteras i februari för medlemmarna att granska."}
              </p>
              
              {handbookData.specialFees && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Särskilda avgifter:</strong> {handbookData.specialFees}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Husets regler och ordningsregler */}
        <section id="regler" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Trivselregler")}
            4. Husets regler och ordningsregler
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔇</span>
                  Tysta timmar och störningar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.quietHours && (
                  <div>
                    <p><strong>Tysta timmar:</strong> {handbookData.quietHours}</p>
                  </div>
                )}
                {handbookData.disturbanceRules && (
                  <div>
                    <p><strong>Störningsregler:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.disturbanceRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {renderSectionIcon("Parkering")}
                  Parkering
                </CardTitle>
              </CardHeader>
              <CardContent>
                {handbookData.parkingRules && (
                  <p className="text-gray-700">{handbookData.parkingRules}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🐕</span>
                  Husdjur och rökning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.petRules && (
                  <div>
                    <p><strong>Husdjur:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.petRules}</p>
                  </div>
                )}
                {handbookData.smokingRules && (
                  <div>
                    <p><strong>Rökning:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.smokingRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {renderSectionIcon("Sopsortering")}
                  Sophantering
                </CardTitle>
              </CardHeader>
              <CardContent>
                {handbookData.wasteManagement && (
                  <p className="text-gray-700">{handbookData.wasteManagement}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 5: Säkerhet och trygghet */}
        <section id="sakerhet" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Säkerhet")}
            5. Säkerhet och trygghet
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔑</span>
                  Lås och nycklar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.doorLocks && (
                  <div>
                    <p><strong>Dörrlås:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.doorLocks}</p>
                  </div>
                )}
                {handbookData.keyTags && (
                  <div>
                    <p><strong>Nyckelbrickor:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.keyTags}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  Brandsäkerhet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.fireProtection && (
                  <div>
                    <p><strong>Brandskydd:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.fireProtection}</p>
                  </div>
                )}
                {handbookData.evacuationRoutes && (
                  <div>
                    <p><strong>Utrymning:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.evacuationRoutes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 6: Teknisk information */}
        <section id="teknisk" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Teknisk")}
            6. Teknisk information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🌡️</span>
                  Värme och ventilation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.heating && (
                  <div>
                    <p><strong>Uppvärmning:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.heating}</p>
                  </div>
                )}
                {handbookData.ventilation && (
                  <div>
                    <p><strong>Ventilation:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.ventilation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💧</span>
                  Vatten och el
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.waterSewage && (
                  <div>
                    <p><strong>Vatten:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.waterSewage}</p>
                  </div>
                )}
                {handbookData.electricity && (
                  <div>
                    <p><strong>El:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.electricity}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 7: Renovering */}
        <section id="renovering" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Renovering")}
            7. Ombyggnader och renoveringar
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔨</span>
                  Renoveringsregler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {handbookData.ownRenovations && (
                  <div>
                    <p><strong>Mindre renoveringar:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.ownRenovations}</p>
                  </div>
                )}
                {handbookData.majorRenovations && (
                  <div>
                    <p><strong>Större renoveringar:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.majorRenovations}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Ansvar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {handbookData.responsibility && (
                  <p className="text-gray-700">{handbookData.responsibility}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 8: Försäkringar */}
        <section id="forsakringar" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Försäkring")}
            8. Försäkringar
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Föreningens försäkring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {handbookData.buildingInsurance && (
                  <p className="text-gray-700">{handbookData.buildingInsurance}</p>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Medlemsförsäkring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {handbookData.memberInsurance && (
                  <p className="text-gray-700">{handbookData.memberInsurance}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 9: Gemensamma faciliteter */}
        <section id="gemensamt" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Gemensamma utrymmen")}
            9. Gemensamma faciliteter
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {renderSectionIcon("Tvättstuga")}
                  Tvättstuga
                </CardTitle>
              </CardHeader>
              <CardContent>
                {handbookData.laundryRoom && (
                  <p className="text-gray-700">{handbookData.laundryRoom}</p>
                )}
                {handbookData.laundryRules && (
                  <div className="mt-3">
                    <p><strong>Regler:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.laundryRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏡</span>
                  Övriga utrymmen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {handbookData.storage && (
                  <div>
                    <p><strong>Förråd:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.storage}</p>
                  </div>
                )}
                {handbookData.courtyard && (
                  <div>
                    <p><strong>Gård:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.courtyard}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 10: Praktisk vardagsinformation */}
        <section id="praktiskt" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200 flex items-center">
            {renderSectionIcon("Praktisk information")}
            10. Praktisk vardagsinformation
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {renderSectionIcon("Felanmälan")}
                  Akuta kontakter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2">Akuta problem (24/7)</h4>
                  <p className="text-red-800">📞 {handbookData.emergencyPhone || "XXX-XXX XX XX"}</p>
                  <p className="text-sm text-red-700">Vattenläckor, el-avbrott, värmefel</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Vanliga fel</h4>
                  <p className="text-sm text-gray-700">
                    📧 {handbookData.maintenanceEmail || "felanmalan@forening.se"}<br/>
                    📞 {handbookData.maintenancePhone || "XXX-XXX XX XX"}<br/>
                    🌐 {handbookData.maintenanceApp || "Via app/hemsida"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📮</span>
                  Service och vardagsinfo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {handbookData.mailPackages && (
                  <div>
                    <p><strong>Post och paket:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.mailPackages}</p>
                  </div>
                )}
                {handbookData.movingRules && (
                  <div>
                    <p><strong>Flyttning:</strong></p>
                    <p className="text-gray-700 text-sm">{handbookData.movingRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Närliggande service */}
          {handbookData.nearbyServices && (
            <Card className="mt-8 print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏪</span>
                  Närliggande service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(handbookData.nearbyServices).map(([key, value]) => (
                    <div key={key}>
                      <p className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                      <p className="text-sm text-gray-700">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 px-6 bg-gray-50 print:bg-white print:border-t">
        <div className="text-center text-sm text-gray-600">
          <p>Denna handbok är framtagen via Handbok.org</p>
          <p>Senast uppdaterad: {currentDate}</p>
          <p className="mt-2">© {new Date().getFullYear()} {handbookData.associationName || "Bostadsrättsföreningen"}</p>
        </div>
      </footer>
    </div>
  )
}

// Default data for demo/empty states
const defaultBoardMembers = [
  { role: "Ordförande", name: "Ej tillsatt", contact: "Kontakt saknas", term: "2024-2025" },
  { role: "Vice ordförande", name: "Ej tillsatt", contact: "Kontakt saknas", term: "2024-2025" },
  { role: "Kassör", name: "Ej tillsatt", contact: "Kontakt saknas", term: "2024-2025" },
  { role: "Sekreterare", name: "Ej tillsatt", contact: "Kontakt saknas", term: "2024-2025" },
  { role: "Ledamot", name: "Ej tillsatt", contact: "Kontakt saknas", term: "2024-2025" },
  { role: "Suppleant", name: "Ej tillsatt", contact: "Kontakt saknas", term: "2024-2025" }
] 