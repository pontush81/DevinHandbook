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
    <div className="max-w-5xl mx-auto bg-white" ref={handbookRef}>
      {/* Print/Download Actions */}
      <div className="no-print sticky top-4 z-10 flex justify-end gap-3 mb-8 px-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.print()}
          className="bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200"
        >
          <PrinterIcon className="h-4 w-4 mr-2" />
          Skriv ut
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={exportToPDF}
          className="pdf-export-btn bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-200"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Ladda ner PDF
        </Button>
      </div>

      {/* Cover Page */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-12 text-center mb-16 print:bg-white print:border-2 print:border-gray-300 cover-page rounded-lg shadow-sm">
        <div className="max-w-2xl mx-auto">
          <Badge className="mb-6 bg-blue-100 text-blue-800 border-0 text-sm font-medium px-4 py-2">
            📚 Digital Handbok
          </Badge>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {handbookData.associationName || "Bostadsrättsföreningen"}
          </h1>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 text-lg text-gray-600 space-y-2 mb-8 shadow-sm">
            <p className="flex items-center justify-center gap-2">
              <span className="text-blue-600">📍</span>
              {handbookData.address || "Adress saknas"}
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-blue-600">🏢</span>
              Org.nr: {handbookData.orgNumber || "Saknas"}
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-blue-600">📞</span>
              {handbookData.phone || "Telefon saknas"}
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-blue-600">✉️</span>
              {handbookData.email || "E-post saknas"}
            </p>
            {handbookData.website && (
              <p className="flex items-center justify-center gap-2">
                <span className="text-blue-600">🌐</span>
                {handbookData.website}
              </p>
            )}
          </div>
          
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-2 inline-block">
            📅 Senast uppdaterad: {currentDate}
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <Card className="mb-16 print:shadow-none print:border shadow-lg border-0 toc-page">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="text-2xl flex items-center text-gray-900">
            {renderSectionIcon("Innehållsförteckning")}
            Innehållsförteckning
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <nav className="space-y-2">
            {[
              { id: "valkommen", title: "Välkommen till föreningen", section: "Välkommen", number: 1 },
              { id: "kontakt", title: "Kontaktuppgifter och styrelse", section: "Kontaktuppgifter", number: 2 },
              { id: "ekonomi", title: "Ekonomi och avgifter", section: "Ekonomi", number: 3 },
              { id: "regler", title: "Husets regler och ordningsregler", section: "Trivselregler", number: 4 },
              { id: "sakerhet", title: "Säkerhet och trygghet", section: "Säkerhet", number: 5 },
              { id: "teknisk", title: "Teknisk information", section: "Teknisk", number: 6 },
              { id: "renovering", title: "Ombyggnader och renoveringar", section: "Renovering", number: 7 },
              { id: "forsakringar", title: "Försäkringar", section: "Försäkring", number: 8 },
              { id: "gemensamt", title: "Gemensamma faciliteter", section: "Gemensamma utrymmen", number: 9 },
              { id: "praktiskt", title: "Praktisk vardagsinformation", section: "Praktisk information", number: 10 },
            ].map((item) => (
              <a 
                key={item.id}
                href={`#${item.id}`} 
                className="block py-3 px-4 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all duration-200 group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium flex items-center text-gray-700 group-hover:text-blue-700">
                    {renderSectionIcon(item.section)}
                    {item.number}. {item.title}
                  </span>
                  <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </div>
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <div className="px-6 space-y-16">
        
        {/* Section 1: Välkommen */}
        <section id="valkommen" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Välkommen")}
              1. Välkommen till föreningen
            </h2>
            <p className="text-gray-600">Grundläggande information om vår förening</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Om föreningen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <p className="text-gray-700 leading-relaxed">
                  {handbookData.aboutAssociation || "Beskriv er förening här - när den bildades, antal lägenheter, karaktär på området, etc."}
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span>📊</span> Snabbfakta
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">📅</span>
                      Bildad år: {handbookData.foundedYear || "Ej angivet"}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">🏠</span>
                      Antal lägenheter: {handbookData.totalApartments || "Ej angivet"}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">📈</span>
                      Totala andelstal: {handbookData.totalShares || "Ej angivet"}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">📐</span>
                      Fastighetens area: {handbookData.propertyArea || "Ej angivet"}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  Syfte och Mål
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 leading-relaxed">
                  {handbookData.purpose || "Föreningens syfte är att främja medlemmarnas ekonomiska intressen genom att tillhandahålla bostäder och lokaler."}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: Kontaktuppgifter och styrelse */}
        <section id="kontakt" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Kontaktuppgifter")}
              2. Kontaktuppgifter och styrelse
            </h2>
            <p className="text-gray-600">Information om styrelsen och viktiga kontakter</p>
          </div>
          
          <Card className="mb-8 print:shadow-none print:border shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                Nuvarande Styrelse
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {(handbookData.boardMembers || defaultBoardMembers).map((member, index) => (
                  <div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200">
                    <h4 className="font-semibold text-gray-900 mb-1">{member.role}</h4>
                    <p className="text-gray-700 font-medium">{member.name}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <span>✉️</span>
                      {member.contact}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <span>📅</span>
                      Mandatperiod: {member.term}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🗓️</span>
                  Styrelsemöten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">🕐</span>
                  <span><strong>Tid:</strong> {handbookData.boardMeetingTime || "Första tisdagen varje månad, 19:00"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">📍</span>
                  <span><strong>Plats:</strong> {handbookData.boardMeetingPlace || "Föreningens lokal eller digitalt"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">👥</span>
                  <span><strong>Medlemmar välkomna:</strong> {handbookData.membersWelcome || "Ja, efter föranmälan"}</span>
                </p>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Förvaltning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">🏢</span>
                  <span><strong>Förvaltare:</strong> {handbookData.propertyManager || "Namn på förvaltningsbolag"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">📞</span>
                  <span><strong>Kontakt:</strong> {handbookData.managerContact || "Telefon och e-post"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">🔧</span>
                  <span><strong>Felanmälan:</strong> {handbookData.faultReporting || "Via app/telefon"}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3: Ekonomi och avgifter */}
        <section id="ekonomi" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Ekonomi")}
              3. Ekonomi och avgifter
            </h2>
            <p className="text-gray-600">Information om avgifter och ekonomisk förvaltning</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Månadsavgifter
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800 flex items-center gap-2">
                    <span className="text-green-600">💵</span>
                    <strong>Aktuell avgift per kvm:</strong> {handbookData.monthlyFeePerSqm || "XX"} kr/kvm
                  </p>
                </div>
                
                {handbookData.monthlyFeeIncludes && (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      Inkluderar:
                    </p>
                    <p className="text-gray-700 pl-6">{handbookData.monthlyFeeIncludes}</p>
                  </div>
                )}
                
                {handbookData.memberPaysOwn && (
                  <div className="space-y-2 text-sm mt-4">
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-orange-600">💳</span>
                      Medlem betalar själv:
                    </p>
                    <p className="text-gray-700 pl-6">{handbookData.memberPaysOwn}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  Betalning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">📅</span>
                  <span><strong>Förfallodag:</strong> {handbookData.dueDate || "Sista vardagen varje månad"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">📧</span>
                  <span><strong>Fakturering:</strong> {handbookData.invoicing || "Månadsvis via e-post"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">⚠️</span>
                  <span><strong>Dröjsmålsränta:</strong> {handbookData.lateInterest || "Enligt lag + 8%"}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">🏦</span>
                  <span><strong>Bankgiro:</strong> {handbookData.bankgiro || "XXXX-XXXX"}</span>
                </p>
                
                {handbookData.paymentDifficulties && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-800 flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">💬</span>
                      <span><strong>Betalningssvårigheter:</strong> {handbookData.paymentDifficulties}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="print:shadow-none print:border shadow-lg border-0 mb-8">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                Budgetprocess
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 mb-4 leading-relaxed">
                {handbookData.budgetProcess || "Budget fastställs på årsstämman i mars. Preliminär budget presenteras i februari för medlemmarna att granska."}
              </p>
              
              {handbookData.specialFees && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">💡</span>
                    <span><strong>Särskilda avgifter:</strong> {handbookData.specialFees}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Husets regler och ordningsregler */}
        <section id="regler" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Trivselregler")}
              4. Husets regler och ordningsregler
            </h2>
            <p className="text-gray-600">Regler för trivsel och gott grannskap</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔇</span>
                  Tysta timmar och störningar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.quietHours && (
                  <div>
                    <p className="flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5">🕐</span>
                      <span><strong>Tysta timmar:</strong> {handbookData.quietHours}</span>
                    </p>
                  </div>
                )}
                {handbookData.disturbanceRules && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-orange-600">⚠️</span>
                      Störningsregler:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.disturbanceRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚗</span>
                  Parkering
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {handbookData.parkingRules && (
                  <p className="text-gray-700 leading-relaxed">{handbookData.parkingRules}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🐕</span>
                  Husdjur och rökning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.petRules && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-green-600">🐾</span>
                      Husdjur:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.petRules}</p>
                  </div>
                )}
                {handbookData.smokingRules && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-red-600">🚫</span>
                      Rökning:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.smokingRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">♻️</span>
                  Sophantering
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {handbookData.wasteManagement && (
                  <p className="text-gray-700 leading-relaxed">{handbookData.wasteManagement}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 5: Säkerhet och trygghet */}
        <section id="sakerhet" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Säkerhet")}
              5. Säkerhet och trygghet
            </h2>
            <p className="text-gray-600">Information om säkerhet och skydd</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔑</span>
                  Lås och nycklar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.doorLocks && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-yellow-600">🚪</span>
                      Dörrlås:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.doorLocks}</p>
                  </div>
                )}
                {handbookData.keyTags && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-yellow-600">🏷️</span>
                      Nyckelbrickor:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.keyTags}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  Brandsäkerhet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.fireProtection && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-red-600">🔥</span>
                      Brandskydd:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.fireProtection}</p>
                  </div>
                )}
                {handbookData.evacuationRoutes && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-red-600">🚪</span>
                      Utrymning:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.evacuationRoutes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 6: Teknisk information */}
        <section id="teknisk" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Teknisk")}
              6. Teknisk information
            </h2>
            <p className="text-gray-600">Tekniska system och installationer</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🌡️</span>
                  Värme och ventilation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.heating && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-orange-600">🔥</span>
                      Uppvärmning:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.heating}</p>
                  </div>
                )}
                {handbookData.ventilation && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-orange-600">💨</span>
                      Ventilation:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.ventilation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💧</span>
                  Vatten och el
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.waterSewage && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-blue-600">💧</span>
                      Vatten:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.waterSewage}</p>
                  </div>
                )}
                {handbookData.electricity && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-blue-600">🔌</span>
                      El:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.electricity}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 7: Renovering */}
        <section id="renovering" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Renovering")}
              7. Ombyggnader och renoveringar
            </h2>
            <p className="text-gray-600">Regler och tillstånd för renoveringar</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔨</span>
                  Renoveringsregler
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {handbookData.ownRenovations && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-orange-600">🔧</span>
                      Mindre renoveringar:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.ownRenovations}</p>
                  </div>
                )}
                {handbookData.majorRenovations && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-orange-600">🏗️</span>
                      Större renoveringar:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.majorRenovations}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  Ansvar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {handbookData.responsibility && (
                  <p className="text-gray-700 leading-relaxed">{handbookData.responsibility}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 8: Försäkringar */}
        <section id="forsakringar" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Försäkring")}
              8. Försäkringar
            </h2>
            <p className="text-gray-600">Information om försäkringsskydd</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  Föreningens försäkring
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {handbookData.buildingInsurance && (
                  <p className="text-gray-700 leading-relaxed">{handbookData.buildingInsurance}</p>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Medlemsförsäkring
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {handbookData.memberInsurance && (
                  <p className="text-gray-700 leading-relaxed">{handbookData.memberInsurance}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 9: Gemensamma faciliteter */}
        <section id="gemensamt" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Gemensamma utrymmen")}
              9. Gemensamma faciliteter
            </h2>
            <p className="text-gray-600">Gemensamma utrymmen och faciliteter</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🧺</span>
                  Tvättstuga
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {handbookData.laundryRoom && (
                  <p className="text-gray-700 leading-relaxed mb-3">{handbookData.laundryRoom}</p>
                )}
                {handbookData.laundryRules && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                    <p className="font-semibold flex items-center gap-2 text-cyan-900 mb-2">
                      <span className="text-cyan-600">📝</span>
                      Regler:
                    </p>
                    <p className="text-cyan-800 text-sm">{handbookData.laundryRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏡</span>
                  Övriga utrymmen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {handbookData.storage && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-indigo-600">📦</span>
                      Förråd:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.storage}</p>
                  </div>
                )}
                {handbookData.courtyard && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-indigo-600">🌳</span>
                      Gård:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.courtyard}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 10: Praktisk vardagsinformation */}
        <section id="praktiskt" className="print:break-before-page">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {renderSectionIcon("Praktisk information")}
              10. Praktisk vardagsinformation
            </h2>
            <p className="text-gray-600">Vardagsinformation och praktiska tips</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  Akuta kontakter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <span className="text-red-600">🚨</span>
                    Akuta problem (24/7)
                  </h4>
                  <p className="text-red-800 flex items-center gap-2">
                    <span>📞</span>
                    {handbookData.emergencyPhone || "XXX-XXX XX XX"}
                  </p>
                  <p className="text-sm text-red-700">Vattenläckor, el-avbrott, värmefel</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-gray-600">🔧</span>
                    Vanliga fel
                  </h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="flex items-center gap-2">
                      <span>📧</span>
                      {handbookData.maintenanceEmail || "felanmalan@forening.se"}
                    </p>
                    <p className="flex items-center gap-2">
                      <span>📞</span>
                      {handbookData.maintenancePhone || "XXX-XXX XX XX"}
                    </p>
                    <p className="flex items-center gap-2">
                      <span>🌐</span>
                      {handbookData.maintenanceApp || "Via app/hemsida"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border shadow-lg border-0 hover:shadow-xl transition-all duration-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📮</span>
                  Service och vardagsinfo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {handbookData.mailPackages && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-blue-600">📦</span>
                      Post och paket:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.mailPackages}</p>
                  </div>
                )}
                {handbookData.movingRules && (
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <span className="text-blue-600">🚚</span>
                      Flyttning:
                    </p>
                    <p className="text-gray-700 text-sm pl-6">{handbookData.movingRules}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-16 py-12 px-6 bg-gradient-to-r from-gray-50 to-gray-100 print:bg-white print:border-t rounded-lg mx-6 mb-6 shadow-sm">
        <div className="text-center">
          <div className="flex justify-center items-center mb-4">
            <span className="text-2xl mr-2">📚</span>
            <h3 className="text-lg font-semibold text-gray-900">Digital Handbok</h3>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2 mb-6">
            <p className="flex items-center justify-center gap-2">
              <span className="text-blue-600">🌐</span>
              Denna handbok är framtagen via Handbok.org
            </p>
            <p className="flex items-center justify-center gap-2">
              <span className="text-blue-600">📅</span>
              Senast uppdaterad: {currentDate}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm inline-block">
            <p className="text-sm font-medium text-gray-900">
              © {new Date().getFullYear()} {handbookData.associationName || "Bostadsrättsföreningen"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Alla rättigheter förbehållna
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Default data for demo/empty states
const defaultBoardMembers = [
  { role: "Ordförande", name: "Anna Andersson", contact: "ordforande@exempel.se", term: "2024-2025" },
  { role: "Vice ordförande", name: "Erik Eriksson", contact: "vice@exempel.se", term: "2024-2025" },
  { role: "Kassör", name: "Maria Nilsson", contact: "kassor@exempel.se", term: "2024-2025" },
  { role: "Sekreterare", name: "Johan Johansson", contact: "sekreterare@exempel.se", term: "2024-2025" },
] 