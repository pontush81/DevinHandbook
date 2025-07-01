# MCP Tools Setup & Usage Guide

## Installerade MCP-verktyg

Följande MCP (Model Context Protocol) verktyg har installerats i projektet:

### 1. 🔍 Perplexity MCP (`server-perplexity-ask`)
**Funktion:** AI-driven websökning och forskningsverktyg
**Paket:** `server-perplexity-ask`

#### Konfiguration:
```bash
# Lägg till i .env
PERPLEXITY_API_KEY=din-api-nyckel-här
```

#### Användning:
```javascript
// Exempel på hur man använder Perplexity för sökning
const searchQuery = "latest trends in boring marketing";
// Perplexity kommer att leverera uppdaterad information från webben
```

### 2. 📊 DataForSEO MCP (`dataforseo-mcp-server`)
**Funktion:** SEO-analys, nyckelordsundersökning och backlink-analys
**Paket:** `dataforseo-mcp-server`

#### Konfiguration:
```bash
# Lägg till i .env
DATAFORSEO_LOGIN=din-login
DATAFORSEO_PASSWORD=ditt-lösenord
```

#### Användning:
```javascript
// Exempel på SEO-analys
const domain = "boringmarketing.se";
// Analyserar nyckelord, ranking, konkurrenter
```

### 3. 🕷️ Firecrawl MCP (`firecrawl-mcp`)
**Funktion:** Intelligent web scraping och innehållsextraktion
**Paket:** `firecrawl-mcp`

#### Konfiguration:
```bash
# Lägg till i .env
FIRECRAWL_API_KEY=din-api-nyckel-här
```

#### Användning:
```javascript
// Exempel på web scraping
const url = "https://example.com";
// Extraherar strukturerat innehåll från webbsidor
```

### 4. 🤖 Replicate MCP (`replicate-mcp`)
**Funktion:** AI-modeller för bildgenerering, textprocessning och mer
**Paket:** `replicate-mcp`

#### Konfiguration:
```bash
# Lägg till i .env
REPLICATE_API_TOKEN=din-api-token-här
```

#### Användning:
```javascript
// Exempel på AI-modell användning
const model = "stable-diffusion";
const prompt = "professional marketing image";
// Genererar bilder eller processrar text med AI
```

## 🚀 Hur man kommer igång

### Steg 1: Miljövariabler
Skapa eller uppdatera din `.env`-fil med API-nycklar för de verktyg du vill använda:

```bash
# Perplexity API
PERPLEXITY_API_KEY=din-perplexity-api-nyckel

# DataForSEO API
DATAFORSEO_LOGIN=din-dataforseo-login
DATAFORSEO_PASSWORD=ditt-dataforseo-lösenord

# Firecrawl API
FIRECRAWL_API_KEY=din-firecrawl-api-nyckel

# Replicate API
REPLICATE_API_TOKEN=din-replicate-api-token
```

### Steg 2: Hämta API-nycklar

1. **Perplexity:** Registrera dig på [Perplexity Developer Portal](https://docs.perplexity.ai/)
2. **DataForSEO:** Skapa konto på [DataForSEO](https://dataforseo.com/)
3. **Firecrawl:** Registrera dig på [Firecrawl](https://firecrawl.dev/)
4. **Replicate:** Skapa konto på [Replicate](https://replicate.com/)

### Steg 3: Testa verktygen
Du kan nu använda dessa verktyg i ditt projekt för:
- 🔍 **Marknadsundersökning** med Perplexity
- 📊 **SEO-optimering** med DataForSEO
- 🕷️ **Innehållsextraktion** med Firecrawl
- 🤖 **AI-genererat innehåll** med Replicate

## 💡 Användningsfall för Boring Marketing

### 1. Marknadsundersökning
```javascript
// Recherchera trender och konkurrenter
await perplexity.search("boring marketing trends 2024");
```

### 2. SEO-optimering
```javascript
// Analysera nyckelord för "boring marketing"
await dataforseo.keywordResearch("boring marketing", "sv");
```

### 3. Innehållsinsamling
```javascript
// Scrapa konkurrenternas webbsidor
await firecrawl.scrape("https://competitor-site.com");
```

### 4. Visuellt innehåll
```javascript
// Generera marknadsföringsbilder
await replicate.generateImage("minimalist boring marketing design");
```

## 🔧 Troubleshooting

### Vanliga problem:
1. **API-nycklar:** Kontrollera att alla miljövariabler är korrekt inställda
2. **Rate limits:** Var medveten om API-begränsningar
3. **Kostnader:** Övervaka användning för kostnadskontroll

### Support:
- Kontrollera respektive verktygs dokumentation
- Använd staging-miljö för testning
- Övervaka logs för felsökning

## 📚 Ytterligare resurser

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Setup](https://docs.anthropic.com/en/docs/build-with-claude/mcp)
- [Cursor MCP Integration](https://docs.cursor.com/features/mcp) 