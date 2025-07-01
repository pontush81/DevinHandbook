# 🚀 Cursor MCP Quick Start

## ⚡ För att se MCP-verktygen i Cursor (3 steg):

### 1. 📝 Konfigurera miljövariabler
```bash
# Kopiera mall-filen
cp env.local.template .env.local

# Redigera .env.local och lägg till dina API-nycklar:
# PERPLEXITY_API_KEY=din-nyckel
# DATAFORSEO_LOGIN=din-login
# DATAFORSEO_PASSWORD=ditt-lösenord
# FIRECRAWL_API_KEY=din-nyckel
# REPLICATE_API_TOKEN=din-token
```

### 2. 🔄 Starta om Cursor
- **Stäng Cursor helt** (Cmd/Ctrl + Q)
- **Öppna Cursor igen**
- Öppna ditt projekt

### 3. ✅ Aktivera verktygen
1. Öppna **Cursor Settings** (Cmd/Ctrl + ,)
2. Klicka på **MCP Tools** i vänster sidomenyn
3. Du bör nu se:
   - **perplexity-ask** (Websökning)
   - **dataforseo** (SEO-analys)
   - **firecrawl** (Web scraping)
   - **replicate** (AI-modeller)
4. **Aktivera** genom att slå på toggle-knappen för varje verktyg

---

## 🎯 Snabbanvändning:

### Via Composer Agent:
- Tryck **Cmd/Ctrl + L**
- Välj **"Agent"** bredvid submit-knappen
- Skriv: *"Sök efter trender inom boring marketing"*

### Via Chat:
- Tryck **Cmd/Ctrl + K**
- Skriv: *"Analysera SEO för denna webbplats"*

---

## ❌ Om verktygen inte syns:

1. **Kontrollera att `.cursor/mcp.json` finns i projektet**
2. **Kontrollera att `.env.local` har API-nycklar**
3. **Starta om Cursor helt** (stäng och öppna igen)
4. **Vänta några sekunder** efter omstart innan du kollar inställningarna

---

## 🔑 Hämta API-nycklar:

- **Perplexity:** https://docs.perplexity.ai/
- **DataForSEO:** https://dataforseo.com/
- **Firecrawl:** https://firecrawl.dev/
- **Replicate:** https://replicate.com/

**Det är allt! Nu bör MCP-verktygen synas i Cursor Settings.** ⭐ 