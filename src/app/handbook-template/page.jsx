"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HandbookTemplate from '@/components/HandbookTemplate';
import EditableHandbook from '@/components/EditableHandbook';

// Utökad data med alla essentiella sektioner för bostadsrättsföreningar
const exampleData = {
  // Grundläggande föreningsinformation
  associationName: "Brf Eksemplet",
  address: "Exempelgatan 123, 123 45 Stockholm",
  orgNumber: "769999-1234",
  phone: "08-123 45 67",
  email: "info@brfeksemplet.se",
  website: "www.brfeksemplet.se",
  foundedYear: "1985",
  totalApartments: "45",
  totalShares: "4500",
  propertyArea: "3200 kvm",
  aboutAssociation: "Vår förening bildades 1985 och består av 45 lägenheter fördelade på två huskroppar. Fastigheten är belägen i ett lugnt område med närhet till både natur och stadskärna. Vi har en aktiv styrelse som arbetar för att göra vår förening till en trivsam plats att bo på.",
  purpose: "Föreningens syfte är att främja medlemmarnas ekonomiska intressen genom att tillhandahålla bostäder och lokaler i föreningens hus.",

  // Styrelse
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

  // Förvaltning
  propertyManager: "Fastighetsservice AB",
  managerContact: "08-987 65 43, forvaltare@fastighetsservice.se",
  faultReporting: "Via app eller telefon 08-987 65 43",
  managerPhone: "08-987 65 43",
  managerEmail: "forvaltare@fastighetsservice.se",

  // Ekonomi och avgifter
  monthlyFeePerSqm: "45",
  monthlyFeeIncludes: "Värme, varmvatten, kall- och varmvatten, sophämtning, fastighetsskatt, gemensam el, grundförsäkring, snöröjning och trappstädning",
  memberPaysOwn: "Hushållsel, bredband/telefon, hemförsäkring utöver grundskydd, kabel-TV premium",
  dueDate: "Sista vardagen varje månad",
  invoicing: "Månadsvis via e-post eller autogiro",
  lateInterest: "Enligt lag + 8%",
  bankgiro: "123-4567",
  budgetProcess: "Budget fastställs på årsstämman i mars. Preliminär budget presenteras i februari för medlemmarna att granska.",
  specialFees: "Särskilda avgifter kan tas ut vid större renoveringar eller oförutsedda kostnader. Beslut fattas på föreningsstämma.",
  paymentDifficulties: "Kontakta styrelsen omgående vid betalningssvårigheter. Vi erbjuder alltid dialog innan inkasso.",
  mortgageInfo: "Vid pantsättning av bostadsrätt krävs styrelsens godkännande enligt föreningens stadgar.",

  // Husets regler och ordningsregler
  quietHours: "Vardagar: 22:00-07:00, Helger: 22:00-10:00",
  disturbanceRules: "Undvik högljudda aktiviteter under tysta timmar. Var särskilt försiktig med musik, TV och barnlek.",
  petRules: "Husdjur är tillåtna efter anmälan till styrelsen. Hundar ska hållas kopplade i trapphus och på gården. Ägarens ansvar för städning efter husdjur.",
  smokingRules: "Rökning är förbjuden i alla gemensamma utrymmen inklusive trapphus, källare och på balkonger som vetter mot gården.",
  parkingRules: "Parkeringsplatserna är numrerade och tillhör specifika lägenheter. Gästparkering finns i begränsad omfattning - max 24h.",
  bicycleStorage: "Cyklar förvaras i cykelkällaren. Märk din cykel med lägenhetsnummer. Övergivna cyklar tas bort efter 3 månaders varning.",
  pramStorage: "Barnvagnar och rullstolar får förvaras i bottenvåningen i anvisade utrymmen.",
  commonAreas: "Gemensamma utrymmen som tvättstuga, källargångar och gård ska hållas rena och fria från personliga tillhörigheter.",
  laundryRules: "Bokning sker via app eller bokningslista. Max 4h per bokning. Städa alltid efter dig och töm luddfilter.",
  wasteManagement: "Källsortering är obligatoriskt. Följ instruktionerna vid sopsorteringen. Grovsopor lämnas efter överenskommelse med förvaltaren.",

  // Säkerhet och trygghet
  doorLocks: "Huvudentréer har kodlås som byts regelbundet. Kod meddelas via e-post och anslagstavla.",
  keyTags: "Varje lägenhet har 2 nyckelbrickor till portar och gemensamma utrymmen. Förlorade brickor ersätts mot avgift (200 kr).",
  alarmSystems: "Fastigheten har inbrottslarm på gemensamma utrymmen. Aktiveras automatiskt 23:00-06:00.",
  lighting: "Belysning i trapphus och källare styrs av rörelsesensorer. Defekta lampor anmäls till förvaltaren.",
  fireProtection: "Brandsläckare finns på varje våningsplan. Brandfiltar i tvättstugan. Kontrollera att brandvägar hålls fria.",
  evacuationRoutes: "Utrymning sker via huvudtrapporna. Hiss får EJ användas vid brand. Samlingsplats: Gården framför hus A.",

  // Teknisk information
  ventilation: "Mekanisk frånluftsventilation. Rengör filter i badrumsfläktar regelbundet. Anmäl dålig luftkvalitet till förvaltaren.",
  heating: "Radiatorsystem med individuell temperaturreglering. Termostater får justeras, men täck inte över radiatorer.",
  waterSewage: "Kallvatten och varmvatten är inkluderat i avgiften. Anmäl läckage omedelbart. Stäng aldrig av huvudkranar utan tillstånd.",
  electricity: "Säkringscentral finns i varje lägenhet. Vid strömavbrott, kontrollera först egna säkringar innan felanmälan.",
  internetTV: "Gemensam bredbandsuppkoppling via Com Hem. Individuella abonnemang tecknas direkt med leverantör.",
  elevators: "Hiss finns i hus A. Använd hissen varsamt och rapportera stopp omedelbart. Nödknapp finns för larm.",

  // Ombyggnader och renoveringar
  ownRenovations: "Mindre renoveringar som målning och tapetsering kräver ingen anmälan. Kontakta styrelsen vid osäkerhet.",
  majorRenovations: "Badrumsrenoveringar, köksbyten och förändringar av våtrum kräver styrelsens skriftliga tillstånd innan arbete påbörjas.",
  approvalProcess: "Ansökan med ritningar och beskrivning lämnas till styrelsen minst 4 veckor före planerad start.",
  maintenancePlan: "Föreningen har en 10-årig underhållsplan. Större stamrenoveringar planeras för 2027-2028.",
  responsibility: "Föreningen ansvarar för: stomme, tak, fasad, stammar, gemensamma el. Medlem ansvarar för: invändiga ytor, vitvaror, individuella installationer.",

  // Försäkringar
  buildingInsurance: "Föreningens försäkring täcker: byggnad, fastighetsansvar, styrelseansvar, och grundläggande lösöre i lägenheter.",
  memberInsurance: "Medlem måste själv försäkra: personliga tillhörigheter, hemförsäkring utöver grundskydd, och ansvar för egna handlingar.",
  damageReporting: "Alla skador anmäls omedelbart till förvaltaren och till er egen försäkring. Dokumentera med foton.",

  // Årsstämma och demokrati
  annualMeeting: "Årsstämma hålls i mars månad. Kallelse skickas ut minst 4 veckor i förväg.",
  meetingNotice: "Motioner lämnas senast 2 veckor före stämman. Alla medlemmar kan lämna förslag till styrelsen.",
  votingRights: "Rösträtt enligt andelstal. Fullmakt kan lämnas till annan medlem. Blanketter finns på hemsidan.",
  extraMeeting: "Extra föreningsstämma kan kallas av styrelsen eller på begäran av medlemmar som representerar minst 1/10 av rösterna.",

  // Andrahandsuthyrning och försäljning
  sublettingRules: "Andrahandsuthyrning kräver styrelsens skriftliga tillstånd. Ansökan görs minst 2 veckor före uthyrning.",
  sublettingProcess: "Fyll i ansökningsformulär med information om hyresgäst och hyresperiod. Styrelsen beslutar inom 2 veckor.",
  saleRules: "Vid försäljning ska köpare godkännas av styrelsen. Kreditupplysning och ekonomisk ställning kontrolleras.",
  transferFees: "Överlåtelseavgift: 3% av köpesumman. Pantbrevskostnad: 2% av lånebelopp. Lagfart betalas av köpare.",

  // Gemensamma faciliteter
  laundryRoom: "Tvättstuga med 2 maskiner och torkrum. Öppet 06:00-22:00. Bokning via app eller lista vid dörren.",
  storage: "Källarförråd finns till vissa lägenheter. Lista över tilldelade förråd finns hos förvaltaren.",
  playground: "Lekplats på baksidan för barn 0-12 år. Föräldrar har tillsynsansvar. Lektider 08:00-20:00.",
  courtyard: "Gemensam gård med sittgrupper. Grillning tillåten med förbehåll för grannar och brandsäkerhet.",
  bikeRoom: "Cykelrum i källaren med plats för ca 60 cyklar. Tillgång med nyckelbricka.",
  wasteRoom: "Soprum med sortering: restavfall, plast, papper, glas, metall. Öppet dygnet runt.",

  // Miljö och hållbarhet
  energySaving: "Energisparande åtgärder uppmuntras: LED-lampor, energieffektiva vitvaror, rätt temperatur (20-21°C).",
  wasteHandling: "Källsortera enligt Stockholms Stad riktlinjer. Kompost finns för organiskt avfall. Grovsopor bokas via 1177.",
  greenInitiatives: "Föreningen arbetar med: energieffektivisering, gröna tak-projekt, och miljövänliga material vid renoveringar.",
  composting: "Kompost finns i trädgården för organiskt hushållsavfall. Endast frukt, grönsaker och kaffefilter.",

  // Praktisk vardagsinformation
  mailPackages: "Post till fastighetsbrevlådan. Paket levereras till närliggande PostNord-ombud eller upphämtningsställe.",
  movingRules: "Anmäl flyttning minst 1 vecka i förväg. Hiss reserveras 08:00-18:00vardagar. Skydda väggar och golv.",
  guestsVisitors: "Gäster hälsas välkomna. Informera om huskoden med omdöme. Längre besök (>1 vecka) anmäls till styrelsen.",
  familyConsiderations: "Barnfamiljer: lekplats finns, tänk på ljudnivå, barnvagnar förvaras i markplan.",
  accessibility: "Hiss till våning 1-4 i hus A. Ramp vid huvudentré. Handikapparkeringsplats finns vid ingången.",

  // Kommunikation
  noticeboard: "Anslagstavla i entrén för föreningsinformation. Privata annonser får sättas upp max 2 veckor.",
  digitalComm: "E-postlista för viktiga meddelanden. Hemsida: www.brfeksemplet.se. App: Fastighetsservice-appen.",
  neighborRelations: "Vid problem med grannar, försök först prata direkt. Kontakta styrelsen om detta inte fungerar.",

  // Nödlägen och kriser
  waterDamage: "1. Stäng av vattnet 2. Kontakta förvaltaren 3. Anmäl till försäkringen 4. Dokumentera skadan 5. Informera drabbade grannar",
  powerOutage: "1. Kontrollera egna säkringar 2. Kontakta Ellevio 020-78 20 20 3. Anmäl till förvaltaren om det påverkar gemensamma utrymmen",
  heatingFailure: "Kontakta förvaltaren omedelbart. Vid total uppvärmningsavbrott finns nödvärme i föreningslokalen.",
  burglary: "1. Ring 112 2. Anmäl till polis 3. Kontakta försäkringen 4. Informera styrelse/förvaltare",
  emergencyContact: "Vid akuta problem utanför kontorstid: Jour 08-555 12 34. Vid livshotande situation: ring alltid 112 först.",

  // Historik och framtid
  history: "1985: Föreningen bildades genom ombildning. 1995: Fasadrenovering. 2010: Nya fönster installerade. 2018: Energieffektivisering genomförd.",
  plannedMaintenance: "2025: Balkongrenoveringar. 2027-2028: Stamrenering planerad. 2030: Takbyte hus B.",
  futureProjects: "Solceller på tak, laddstolpar för elbilar, och uppgradering av ventilationssystem utreds för kommande år.",

  // Kontaktinformation
  emergencyPhone: "08-555 12 34",
  maintenanceEmail: "felanmalan@brfeksemplet.se",
  maintenancePhone: "08-987 65 43",
  maintenanceApp: "Fastighetsservice-appen",
  boardEmail: "styrelsen@brfeksemplet.se",

  // Närliggande servicefunktioner
  nearbyServices: {
    pharmacy: "Apoteket Hjärtat, Centrum Galleria, 0,5 km",
    healthcare: "Vårdcentral City, Storgatan 45, 0,8 km",
    grocery: "ICA Maxi, 0,3 km / Coop Konsum, 0,6 km",
    school: "Centralskolan, 0,4 km",
    transport: "Tunnelbana: Centralstation 0,7 km / Buss: Hållplats utanför dörren"
  },

  // Kommunala tjänster
  municipalServices: {
    municipality: "Stockholms Stad, växel: 08-508 00 000",
    waste: "Avfallshantering: 08-508 00 000",
    socialServices: "Socialtjänsten: 08-508 00 000",
    parking: "Parkeringstillstånd: 08-508 00 000"
  },

  // Grannföreningar
  neighborAssociations: "Brf Grannen (Exempelgatan 125), Brf Kompisen (Exempelgatan 121) - gemensamma projekt kring gårdsanordning och snöröjning"
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