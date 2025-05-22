import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { PrinterIcon, DownloadIcon } from "lucide-react"
import { useRef } from "react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

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
          </div>
          
          <div className="text-sm text-gray-500">
            Senast uppdaterad: {currentDate}
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <Card className="mb-12 print:shadow-none print:border toc-page">
        <CardHeader>
          <CardTitle className="text-2xl">Innehållsförteckning</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            <a href="#allmant" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">1. Allmän Information</span>
                <span className="text-gray-500">3</span>
              </div>
            </a>
            <a href="#styrelse" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">2. Styrelse och Administration</span>
                <span className="text-gray-500">5</span>
              </div>
            </a>
            <a href="#ekonomi" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">3. Ekonomi och Avgifter</span>
                <span className="text-gray-500">8</span>
              </div>
            </a>
            <a href="#fastighet" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">4. Fastighet och Underhåll</span>
                <span className="text-gray-500">12</span>
              </div>
            </a>
            <a href="#regler" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">5. Regler och Ordningsföreskrifter</span>
                <span className="text-gray-500">16</span>
              </div>
            </a>
            <a href="#lagenheter" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">6. Lägenheter och Ändamål</span>
                <span className="text-gray-500">20</span>
              </div>
            </a>
            <a href="#gemensamt" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">7. Gemensamma Utrymmen</span>
                <span className="text-gray-500">24</span>
              </div>
            </a>
            <a href="#sakerhet" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">8. Säkerhet och Beredskap</span>
                <span className="text-gray-500">28</span>
              </div>
            </a>
            <a href="#praktiskt" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">9. Praktisk Information</span>
                <span className="text-gray-500">32</span>
              </div>
            </a>
            <a href="#kontakt" className="block py-2 px-4 rounded hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all">
              <div className="flex justify-between">
                <span className="font-medium">10. Kontaktinformation</span>
                <span className="text-gray-500">36</span>
              </div>
            </a>
          </nav>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <div className="px-6 space-y-12">
        
        {/* Section 1: Allmän Information */}
        <section id="allmant" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200">
            1. Allmän Information
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

        {/* Section 2: Styrelse */}
        <section id="styrelse" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200">
            2. Styrelse och Administration
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

        {/* Section 3: Ekonomi */}
        <section id="ekonomi" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200">
            3. Ekonomi och Avgifter
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
                    <strong>Aktuell avgift per kvm:</strong> {handbookData.monthlyFeePerSqm || "XX kr/kvm"} kr/kvm
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Inkluderar:</strong></p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Uppvärmning</li>
                    <li>Varmvatten</li>
                    <li>Fastighetsskötsel</li>
                    <li>Kapitalavgift</li>
                    <li>Underhållsfond</li>
                  </ul>
                </div>
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
              </CardContent>
            </Card>
          </div>

          <Card className="print:shadow-none print:border">
            <CardHeader>
              <CardTitle>Budgetprocess</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {handbookData.budgetProcess || "Budget fastställs på årsstämman i mars. Preliminär budget presenteras i februari för medlemmarna att granska."}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Viktigt:</strong> Medlemmar har rätt att få insyn i föreningens ekonomi och kan begära att få se årsredovisning och budget.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Fastighet och Underhåll */}
        <section id="fastighet" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200">
            4. Fastighet och Underhåll
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔧</span>
                  Felanmälan
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
                  <span className="text-2xl">📋</span>
                  Ansvar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-700 mb-2">Föreningen ansvarar för:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Stamledningar</li>
                      <li>• Värme och ventilation</li>
                      <li>• Yttre underhåll</li>
                      <li>• Trapphus och gemensamma utrymmen</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Medlemmen ansvarar för:</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Inredning och vitvaror</li>
                      <li>• Kranar och WC-stol</li>
                      <li>• Målning och tapetsering</li>
                      <li>• Golvbeläggning</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 10: Kontaktinformation */}
        <section id="kontakt" className="print:break-before-page">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 pb-2 border-b-2 border-blue-200">
            10. Kontaktinformation
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📞</span>
                  Viktiga Kontakter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Styrelsen</h4>
                  <p className="text-sm">📧 {handbookData.boardEmail || "styrelsen@forening.se"}</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Förvaltare</h4>
                  <p className="text-sm">
                    📞 {handbookData.managerPhone || "XXX-XXX XX XX"}<br/>
                    📧 {handbookData.managerEmail || "forvaltare@bolag.se"}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Akuta problem</h4>
                  <p className="text-sm">📞 {handbookData.emergencyPhone || "XXX-XXX XX XX"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🏛️</span>
                  Myndigheter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="font-semibold">Byggnadsnämnden</h4>
                  <p className="text-sm">För bygglov och tekniska frågor</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Miljönämnden</h4>
                  <p className="text-sm">Miljö- och hälsoskyddsfrågor</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Hyresnämnden</h4>
                  <p className="text-sm">Tvister och rådgivning</p>
                </div>
              </CardContent>
            </Card>
          </div>
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