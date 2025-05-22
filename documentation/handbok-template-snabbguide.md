# Digital Handbok - Snabbguide

## Översikt
Denna funktion erbjuder en digital handbok för bostadsrättsföreningar att skapa, redigera och dela professionella handböcker. Implementationen inkluderar:

1. En visningskomponent för handboken med utskrifts- och PDF-exportfunktionalitet
2. En redigerbar formulärkomponent för inmatning och uppdatering av handboksdata
3. Utskriftsoptimerad styling för både PDF och fysisk utskrift
4. Dokumentation och exempelanvändning

## Funktioner
- 🖨️ Utskriftsklar formatering
- 📱 Responsiv design
- 📄 PDF-export
- ✏️ Interaktiv redigering
- 🎨 Professionell styling med färgkodade sektioner
- 📊 Visuell hierarki med ikoner och etiketter
- 📚 Komplett handboksstruktur med alla nödvändiga sektioner

## Snabbstart
För att testa handboksmallen:

1. Navigera till `/handbook-template` i webbläsaren
2. Växla mellan flikarna "Förhandsgranskning" och "Redigera handbok"
3. Gör ändringar i redigeringsläget och förhandsgranska dem
4. Testa utskriftsfunktionen med knappen "Skriv ut"
5. Testa PDF-exporten med knappen "Ladda ner PDF"

## Implementationsdetaljer
- Använder biblioteket `jspdf` för PDF-generering
- Använder `html2canvas` för att fånga handbokens layout
- Implementerar anpassad utskrifts-CSS för korrekta sidbrytningar
- Använder shadcn/ui-komponenter för konsekvent användargränssnitt

## Filer
- `src/components/HandbookTemplate.jsx`: Huvudkomponent för handboksvisning
- `src/components/EditableHandbook.jsx`: Redigerbar formulärkomponent
- `src/app/handbook-template/page.jsx`: Exempelsida
- `documentation/handbok-template-manual.md`: Detaljerad dokumentation (på engelska)

## Framtida förbättringar
- Databasintegration för att spara handböcker
- Användarbehörigheter för redigering
- Ytterligare anpassningsmöjligheter
- Export till andra format (Word, HTML)
- Flerspråkigt stöd

## Beroenden
- jsPDF: Bibliotek för PDF-generering
- html2canvas: HTML till canvas-konvertering för PDF-export

## Dokumentation
För mer detaljerad information, se [Handboksmallens Manual](./handbok-template-manual.md) (på engelska). 