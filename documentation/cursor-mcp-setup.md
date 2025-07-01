# 🎯 Cursor MCP Setup Guide

## ✅ MCP-verktyg konfigurerade för Cursor

MCP-verktygen är nu konfigurerade och redo att användas i Cursor!

### 📁 Konfigurationsfiler som skapats:

1. **`.cursor/mcp.json`** - Cursor MCP-konfiguration
2. **`env.local.template`** - Uppdaterad med MCP-miljövariabler

## 🚀 Så här kommer du åt MCP-verktygen i Cursor:

### Steg 1: Konfigurera miljövariabler
```bash
# Kopiera mall-filen till .env.local
cp env.local.template .env.local

# Redigera .env.local och lägg till dina riktiga API-nycklar
```

### Steg 2: Starta om Cursor
1. Stäng Cursor helt
2. Öppna Cursor igen
3. Öppna ditt projekt

### Steg 3: Kontrollera MCP Tools i Cursor Settings
1. Öppna **Cursor Settings** (Cmd/Ctrl + ,)
2. Navigera till **MCP Tools** i sidomenyn
3. Du bör nu se de fyra nya verktygen:
   - ✅ **perplexity-ask** - Websökning
   - ✅ **dataforseo** - SEO-analys
   - ✅ **firecrawl** - Web scraping
   - ✅ **replicate** - AI-modeller

### Steg 4: Aktivera verktygen
- Slå på toggle-knappen för varje verktyg du vill använda
- Verktyget kommer att visa "X tools enabled" när det är aktiverat

## 🔧 Felsökning

### Om verktygen inte syns:
1. **Kontrollera miljövariabler:** Se till att alla API-nycklar är korrekt inställda i `.env.local`
2. **Starta om Cursor:** Stäng och öppna Cursor igen
3. **Kontrollera konfiguration:** Verifiera att `.cursor/mcp.json` finns och har rätt format
4. **Kontrollera API-nycklar:** Se till att API-nycklarna är giltiga

### Om verktyg visar fel:
1. **Kontrollera API-nycklar:** Testa API-nycklarna med respektive tjänst
2. **Kontrollera internet:** Se till att du har internetanslutning
3. **Kontrollera begränsningar:** Vissa tjänster har rate limits eller kräver betalkonto

## 💡 Användning i Cursor

### Via Composer Agent:
1. Öppna **Composer** (Cmd/Ctrl + L)
2. Välj **Agent** bredvid submit-knappen
3. Skriv dina förfrågningar, t.ex.:
   - "Sök efter trender inom boring marketing"
   - "Analysera SEO för vår konkurrents webbplats"
   - "Scrapa innehåll från denna sida"
   - "Generera en bild för vår marknadsföring"

### Via Chat:
1. Öppna **Chat** (Cmd/Ctrl + K)
2. Skriv dina förfrågningar
3. MCP-verktygen kommer att användas automatiskt när det behövs

## 📊 Tillgängliga verktyg:

### 🔍 Perplexity (perplexity-ask)
- **Funktion:** AI-driven websökning och forskningsverktyg
- **Användning:** Sök efter aktuell information, trender, nyheter
- **Exempel:** "Sök efter senaste trender inom boring marketing"

### 📈 DataForSEO (dataforseo)
- **Funktion:** SEO-analys, nyckelordsundersökning, backlink-analys
- **Användning:** Analysera webbplatsers SEO-prestanda
- **Exempel:** "Analysera SEO för boringmarketing.se"

### 🕷️ Firecrawl (firecrawl)
- **Funktion:** Intelligent web scraping och innehållsextraktion
- **Användning:** Extrahera strukturerat innehåll från webbsidor
- **Exempel:** "Scrapa innehåll från denna konkurrents webbplats"

### 🤖 Replicate (replicate)
- **Funktion:** AI-modeller för bildgenerering, textprocessning
- **Användning:** Generera bilder, processera text med AI
- **Exempel:** "Generera en professionell marknadsföringsbild"

## 🎯 Nästa steg:

1. **Lägg till API-nycklar** i `.env.local`
2. **Starta om Cursor** för att ladda konfigurationen
3. **Aktivera verktygen** i Cursor Settings
4. **Börja använda** verktygen i Composer eller Chat

**Du är nu redo att använda alla MCP-verktyg direkt i Cursor!** 🚀 